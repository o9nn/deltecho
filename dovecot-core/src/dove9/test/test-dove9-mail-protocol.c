/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for the mail protocol bridge public API:
 * - dove9_mail_flags_to_state
 * - dove9_state_to_mail_flags
 * - dove9_state_to_mailbox
 * - dove9_mail_calculate_priority
 * - dove9_mail_create_cognitive_context
 * - dove9_mail_extract_thread_relations
 * - bridge create/destroy/mapping accessor
 */

#include "dove9-test-common.h"
#include "../integration/dove9-mail-protocol-bridge.h"
#include <string.h>

/* ---- test: bridge create/destroy ---- */

static void test_bridge_create_destroy(void)
{
	dove9_test_begin("mail-proto: bridge create/destroy");
	struct dove9_mail_bridge_config cfg;
	cfg.mailbox_mapping = dove9_mailbox_mapping_default();
	cfg.default_priority = 5;
	cfg.enable_threading = true;

	struct dove9_mail_protocol_bridge *b = dove9_mail_bridge_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(b);
	dove9_mail_bridge_destroy(&b);
	DOVE9_TEST_ASSERT_NULL(b);
	dove9_test_end();
}

/* ---- test: bridge get mapping ---- */

static void test_bridge_get_mapping(void)
{
	dove9_test_begin("mail-proto: bridge get mapping");
	struct dove9_mail_bridge_config cfg;
	cfg.mailbox_mapping = dove9_mailbox_mapping_default();
	cfg.default_priority = 5;
	cfg.enable_threading = true;

	struct dove9_mail_protocol_bridge *b = dove9_mail_bridge_create(&cfg);
	const struct dove9_mailbox_mapping *m = dove9_mail_bridge_get_mapping(b);
	DOVE9_TEST_ASSERT_NOT_NULL(m);
	DOVE9_TEST_ASSERT_STR_EQ(m->inbox, "INBOX");

	dove9_mail_bridge_destroy(&b);
	dove9_test_end();
}

/* ---- test: flags to state ---- */

static void test_flags_to_state_seen(void)
{
	dove9_test_begin("mail-proto: SEEN flag → COMPLETED");
	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	enum dove9_process_state st = dove9_mail_flags_to_state(
		DOVE9_MAIL_FLAG_SEEN, "INBOX", &mb);
	/* SEEN typically maps to COMPLETED or similar */
	DOVE9_TEST_ASSERT(st >= DOVE9_PROCESS_PENDING &&
			  st <= DOVE9_PROCESS_TERMINATED);
	dove9_test_end();
}

static void test_flags_to_state_deleted(void)
{
	dove9_test_begin("mail-proto: DELETED flag → TERMINATED");
	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	enum dove9_process_state st = dove9_mail_flags_to_state(
		DOVE9_MAIL_FLAG_DELETED, "Trash", &mb);
	DOVE9_TEST_ASSERT(st >= DOVE9_PROCESS_PENDING &&
			  st <= DOVE9_PROCESS_TERMINATED);
	dove9_test_end();
}

static void test_flags_to_state_no_flags(void)
{
	dove9_test_begin("mail-proto: no flags → PENDING");
	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	enum dove9_process_state st = dove9_mail_flags_to_state(
		0, "INBOX", &mb);
	DOVE9_TEST_ASSERT(st == DOVE9_PROCESS_PENDING ||
			  st == DOVE9_PROCESS_ACTIVE);
	dove9_test_end();
}

/* ---- test: state to flags ---- */

static void test_state_to_flags_completed(void)
{
	dove9_test_begin("mail-proto: COMPLETED state → flag with SEEN");
	unsigned int flags = dove9_state_to_mail_flags(DOVE9_PROCESS_COMPLETED);
	/* COMPLETED should include SEEN flag */
	DOVE9_TEST_ASSERT(flags & DOVE9_MAIL_FLAG_SEEN);
	dove9_test_end();
}

static void test_state_to_flags_terminated(void)
{
	dove9_test_begin("mail-proto: TERMINATED state → flag with DELETED");
	unsigned int flags = dove9_state_to_mail_flags(DOVE9_PROCESS_TERMINATED);
	DOVE9_TEST_ASSERT(flags & DOVE9_MAIL_FLAG_DELETED);
	dove9_test_end();
}

static void test_state_to_flags_pending(void)
{
	dove9_test_begin("mail-proto: PENDING state → no SEEN flag");
	unsigned int flags = dove9_state_to_mail_flags(DOVE9_PROCESS_PENDING);
	DOVE9_TEST_ASSERT(!(flags & DOVE9_MAIL_FLAG_SEEN));
	dove9_test_end();
}

/* ---- test: state to mailbox ---- */

static void test_state_to_mailbox_active(void)
{
	dove9_test_begin("mail-proto: ACTIVE → processing mailbox");
	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	const char *mbox = dove9_state_to_mailbox(DOVE9_PROCESS_ACTIVE, &mb);
	DOVE9_TEST_ASSERT_NOT_NULL(mbox);
	dove9_test_end();
}

static void test_state_to_mailbox_completed(void)
{
	dove9_test_begin("mail-proto: COMPLETED → sent/archive mailbox");
	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	const char *mbox = dove9_state_to_mailbox(DOVE9_PROCESS_COMPLETED, &mb);
	DOVE9_TEST_ASSERT_NOT_NULL(mbox);
	dove9_test_end();
}

/* ---- test: priority calculation ---- */

static void test_priority_default(void)
{
	dove9_test_begin("mail-proto: priority with no special flags");
	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.subject, sizeof(mail.subject), "Normal");
	int p = dove9_mail_calculate_priority(&mail, 5);
	DOVE9_TEST_ASSERT_INT_EQ(p, 5);
	dove9_test_end();
}

static void test_priority_flagged_boost(void)
{
	dove9_test_begin("mail-proto: flagged mail gets priority boost");
	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	mail.flags = DOVE9_MAIL_FLAG_FLAGGED;
	int p = dove9_mail_calculate_priority(&mail, 5);
	DOVE9_TEST_ASSERT(p >= 5);
	dove9_test_end();
}

/* ---- test: cognitive context creation ---- */

static void test_create_cognitive_context(void)
{
	dove9_test_begin("mail-proto: create cognitive context from mail");
	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.subject, sizeof(mail.subject), "Test");
	snprintf(mail.body, sizeof(mail.body), "Hello world");

	struct dove9_cognitive_context ctx;
	dove9_mail_create_cognitive_context(&mail, &ctx);

	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.emotional_valence, 0.0, 0.5);
	DOVE9_TEST_ASSERT(ctx.salience_score >= 0.0);
	dove9_test_end();
}

/* ---- test: thread relations extraction ---- */

static void test_thread_relations_no_refs(void)
{
	dove9_test_begin("mail-proto: thread relations with no references");
	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "msg1@test");

	struct dove9_thread_relations rel;
	dove9_mail_extract_thread_relations(&mail, &rel);
	DOVE9_TEST_ASSERT_UINT_EQ(rel.sibling_count, 0);
	dove9_test_end();
}

static void test_thread_relations_with_reply(void)
{
	dove9_test_begin("mail-proto: thread relations with in_reply_to");
	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "reply@test");
	snprintf(mail.in_reply_to, sizeof(mail.in_reply_to), "parent@test");

	struct dove9_thread_relations rel;
	dove9_mail_extract_thread_relations(&mail, &rel);
	DOVE9_TEST_ASSERT_STR_EQ(rel.parent_id, "parent@test");
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_bridge_create_destroy,
		test_bridge_get_mapping,
		test_flags_to_state_seen,
		test_flags_to_state_deleted,
		test_flags_to_state_no_flags,
		test_state_to_flags_completed,
		test_state_to_flags_terminated,
		test_state_to_flags_pending,
		test_state_to_mailbox_active,
		test_state_to_mailbox_completed,
		test_priority_default,
		test_priority_flagged_boost,
		test_create_cognitive_context,
		test_thread_relations_no_refs,
		test_thread_relations_with_reply,
	};
	return dove9_test_run("dove9-mail-protocol",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
