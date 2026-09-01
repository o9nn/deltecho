/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-mail-protocol-bridge: mail/process conversion,
   flag/state mapping, priority calculation, body truncation. */

#include "dove9-test-common.h"
#include "../integration/dove9-mail-protocol-bridge.h"
#include "../types/dove9-types.h"

#include <string.h>

static struct dove9_mail_bridge_config test_bridge_config(void)
{
	struct dove9_mail_bridge_config cfg;
	memset(&cfg, 0, sizeof(cfg));
	cfg.mailbox_mapping = dove9_mailbox_mapping_default();
	cfg.default_priority = 5;
	cfg.enable_threading = true;
	return cfg;
}

static void test_bridge_create(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_mail_bridge_config cfg = test_bridge_config();

	dove9_test_begin("mail bridge create/destroy");

	bridge = dove9_mail_bridge_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(bridge);
	dove9_mail_bridge_destroy(&bridge);
	DOVE9_TEST_ASSERT_NULL(bridge);

	dove9_test_end();
}

static void test_mail_to_process(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_mail_message mail;
	struct dove9_message_process proc;
	struct dove9_mail_bridge_config cfg = test_bridge_config();

	dove9_test_begin("mail_to_process extracts subject and body");

	bridge = dove9_mail_bridge_create(&cfg);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@example.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@example.com");
	snprintf(mail.subject, sizeof(mail.subject), "Hello Bot");
	snprintf(mail.body, sizeof(mail.body), "Please help me");

	dove9_mail_to_process(bridge, &mail, &proc);

	DOVE9_TEST_ASSERT_STR_EQ(proc.from, "user@example.com");
	DOVE9_TEST_ASSERT(strlen(proc.content) > 0);
	DOVE9_TEST_ASSERT(proc.priority > 0);

	dove9_mail_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_process_to_mail(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_message_process process;
	struct dove9_mail_message reply;
	struct dove9_mail_bridge_config cfg = test_bridge_config();

	dove9_test_begin("process_to_mail has Re: prefix and swapped from/to");

	bridge = dove9_mail_bridge_create(&cfg);

	memset(&process, 0, sizeof(process));
	snprintf(process.from, sizeof(process.from), "user@example.com");
	process.to_count = 1;
	snprintf(process.to[0], sizeof(process.to[0]), "bot@example.com");
	snprintf(process.subject, sizeof(process.subject), "Hello Bot");

	dove9_process_to_mail(bridge, &process, "I can help", &reply);

	DOVE9_TEST_ASSERT_STR_EQ(reply.from, "bot@example.com");
	DOVE9_TEST_ASSERT_STR_EQ(reply.to[0], "user@example.com");
	/* Subject should have Re: prefix */
	DOVE9_TEST_ASSERT(strncmp(reply.subject, "Re: ", 4) == 0);

	dove9_mail_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_flag_state_mapping(void)
{
	struct dove9_mailbox_mapping mapping = dove9_mailbox_mapping_default();

	dove9_test_begin("mail flags map to process states");

	/* SEEN → PENDING (no special flag handling), FLAGGED → ACTIVE, ANSWERED → COMPLETED, default → PENDING */
	DOVE9_TEST_ASSERT_INT_EQ(
		(int)dove9_mail_flags_to_state(DOVE9_MAIL_FLAG_SEEN, "INBOX", &mapping),
		(int)DOVE9_PROCESS_PENDING);
	DOVE9_TEST_ASSERT_INT_EQ(
		(int)dove9_mail_flags_to_state(DOVE9_MAIL_FLAG_FLAGGED, "INBOX", &mapping),
		(int)DOVE9_PROCESS_ACTIVE);
	DOVE9_TEST_ASSERT_INT_EQ(
		(int)dove9_mail_flags_to_state(DOVE9_MAIL_FLAG_ANSWERED, "INBOX", &mapping),
		(int)DOVE9_PROCESS_COMPLETED);
	DOVE9_TEST_ASSERT_INT_EQ(
		(int)dove9_mail_flags_to_state(0, "INBOX", &mapping),
		(int)DOVE9_PROCESS_PENDING);

	dove9_test_end();
}

static void test_priority_calculation(void)
{
	struct dove9_mail_message mail;

	dove9_test_begin("priority from flags: FLAGGED=high, default=base");

	memset(&mail, 0, sizeof(mail));
	mail.flags = DOVE9_MAIL_FLAG_FLAGGED;
	DOVE9_TEST_ASSERT(dove9_mail_calculate_priority(&mail, 5) > 5);

	memset(&mail, 0, sizeof(mail));
	mail.flags = 0;
	DOVE9_TEST_ASSERT(dove9_mail_calculate_priority(&mail, 5) == 5);

	dove9_test_end();
}

static void test_cognitive_context_creation(void)
{
	struct dove9_mail_message mail;
	struct dove9_cognitive_context ctx;

	dove9_test_begin("mail creates cognitive context with salience");

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@example.com");
	snprintf(mail.subject, sizeof(mail.subject), "Urgent");
	snprintf(mail.body, sizeof(mail.body), "Please respond");
	mail.flags = DOVE9_MAIL_FLAG_FLAGGED;

	dove9_mail_create_cognitive_context(&mail, &ctx);

	DOVE9_TEST_ASSERT(ctx.salience_score > 0.0);

	dove9_test_end();
}

static void test_empty_body_handling(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_mail_message mail;
	struct dove9_message_process proc;
	struct dove9_mail_bridge_config cfg = test_bridge_config();

	dove9_test_begin("empty mail body produces valid request");

	bridge = dove9_mail_bridge_create(&cfg);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@example.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@example.com");
	snprintf(mail.subject, sizeof(mail.subject), "Empty");
	mail.body[0] = '\0';

	dove9_mail_to_process(bridge, &mail, &proc);

	DOVE9_TEST_ASSERT(proc.priority > 0);
	DOVE9_TEST_ASSERT_STR_EQ(proc.from, "user@example.com");

	dove9_mail_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_reply_no_double_re(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_message_process process;
	struct dove9_mail_message reply;
	struct dove9_mail_bridge_config cfg = test_bridge_config();

	dove9_test_begin("Re: not doubled on already-Re: subject");

	bridge = dove9_mail_bridge_create(&cfg);

	memset(&process, 0, sizeof(process));
	snprintf(process.from, sizeof(process.from), "user@example.com");
	process.to_count = 1;
	snprintf(process.to[0], sizeof(process.to[0]), "bot@example.com");
	snprintf(process.subject, sizeof(process.subject), "Re: Already replied");

	dove9_process_to_mail(bridge, &process, "response", &reply);

	/* Should not become "Re: Re: ..." */
	DOVE9_TEST_ASSERT(strncmp(reply.subject, "Re: Re:", 7) != 0);

	dove9_mail_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_answered_flag(void)
{
	struct dove9_mailbox_mapping mapping = dove9_mailbox_mapping_default();

	dove9_test_begin("ANSWERED flag → COMPLETED state");

	DOVE9_TEST_ASSERT_INT_EQ(
		(int)dove9_mail_flags_to_state(DOVE9_MAIL_FLAG_ANSWERED, "INBOX", &mapping),
		(int)DOVE9_PROCESS_COMPLETED);

	dove9_test_end();
}

/* ---- Test: FLAGGED flag sets high priority ---- */

static void test_flagged_high_priority(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_mail_message mail;
	struct dove9_message_process proc;
	struct dove9_mail_bridge_config cfg = test_bridge_config();

	dove9_test_begin("FLAGGED mail maps to elevated priority");

	bridge = dove9_mail_bridge_create(&cfg);
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "vip@test.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	snprintf(mail.subject, sizeof(mail.subject), "Urgent!!");
	mail.flags = DOVE9_MAIL_FLAG_FLAGGED;

	dove9_mail_to_process(bridge, &mail, &proc);
	/* Flagged should increase priority */
	DOVE9_TEST_ASSERT(proc.priority > 0);

	dove9_mail_bridge_destroy(&bridge);
	dove9_test_end();
}

/* ---- Test: DELETED flag maps to terminated state ---- */

static void test_deleted_flag_terminated(void)
{
	struct dove9_mailbox_mapping mapping = dove9_mailbox_mapping_default();

	dove9_test_begin("DELETED flag → TERMINATED state");

	DOVE9_TEST_ASSERT_INT_EQ(
		(int)dove9_mail_flags_to_state(DOVE9_MAIL_FLAG_DELETED, "INBOX", &mapping),
		(int)DOVE9_PROCESS_TERMINATED);

	dove9_test_end();
}

/* ---- Test: bridge destroy sets null ---- */

static void test_bridge_destroy_null(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_mail_bridge_config cfg = test_bridge_config();

	dove9_test_begin("bridge destroy sets pointer to NULL");
	bridge = dove9_mail_bridge_create(&cfg);
	dove9_mail_bridge_destroy(&bridge);
	DOVE9_TEST_ASSERT_NULL(bridge);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_bridge_create,
		test_mail_to_process,
		test_process_to_mail,
		test_flag_state_mapping,
		test_priority_calculation,
		test_cognitive_context_creation,
		test_empty_body_handling,
		test_reply_no_double_re,
		test_answered_flag,
		test_flagged_high_priority,
		test_deleted_flag_terminated,
		test_bridge_destroy_null,
	};
	return dove9_test_run("dove9-mail-bridge", tests, 12);
}
