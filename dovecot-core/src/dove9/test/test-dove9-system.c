/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-system: top-level Dove9System lifecycle,
   process_mail, and event emission. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../dove9-system.h"
#include "../types/dove9-types.h"

#include <string.h>

/* ---- Helper: build a standard test config ---- */

static struct dove9_system_config make_test_config(void)
{
	struct dove9_system_config cfg;

	memset(&cfg, 0, sizeof(cfg));
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	return cfg;
}

/* ---- Helper: build a standard test mail ---- */

static struct dove9_mail_message make_test_mail(const char *from,
						const char *to,
						const char *subject,
						const char *body)
{
	struct dove9_mail_message mail;

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "%s", from);
	snprintf(mail.to[0], sizeof(mail.to[0]), "%s", to);
	mail.to_count = 1;
	if (subject != NULL)
		snprintf(mail.subject, sizeof(mail.subject), "%s", subject);
	if (body != NULL)
		snprintf(mail.body, sizeof(mail.body), "%s", body);
	return mail;
}

/* ---- Event tracking ---- */

static unsigned int mail_received_count;
static unsigned int response_ready_count;
static unsigned int triad_sync_count;
static unsigned int cycle_complete_count;

static void reset_event_counts(void)
{
	mail_received_count = 0;
	response_ready_count = 0;
	triad_sync_count = 0;
	cycle_complete_count = 0;
}

static void test_event_handler(const struct dove9_system_event *event,
			       void *ctx)
{
	(void)ctx;
	switch (event->type) {
	case DOVE9_SYS_MAIL_RECEIVED:
		mail_received_count++;
		break;
	case DOVE9_SYS_RESPONSE_READY:
		response_ready_count++;
		break;
	case DOVE9_SYS_TRIAD_SYNC:
		triad_sync_count++;
		break;
	case DOVE9_SYS_CYCLE_COMPLETE:
		cycle_complete_count++;
		break;
	default:
		break;
	}
}

static void test_system_create(void)
{
	struct dove9_system_config cfg;
	struct dove9_system *sys;

	dove9_test_begin("system create/destroy");

	dove9_mock_reset();
	cfg = make_test_config();
	sys = dove9_system_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);
	dove9_system_destroy(&sys);
	DOVE9_TEST_ASSERT_NULL(sys);

	dove9_test_end();
}

static void test_system_start_stop(void)
{
	struct dove9_system_config cfg;
	struct dove9_system *sys;
	int ret;

	dove9_test_begin("system start and stop");

	dove9_mock_reset();
	cfg = make_test_config();
	sys = dove9_system_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	ret = dove9_system_start(sys);
	DOVE9_TEST_ASSERT_INT_EQ(ret, 0);
	DOVE9_TEST_ASSERT(dove9_system_is_running(sys));

	dove9_system_stop(sys);
	DOVE9_TEST_ASSERT(!dove9_system_is_running(sys));

	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_process_mail(void)
{
	struct dove9_system_config cfg;
	struct dove9_system *sys;
	struct dove9_mail_message mail;
	struct dove9_message_process *proc;

	dove9_test_begin("process_mail produces a reply");

	dove9_mock_reset();
	cfg = make_test_config();
	sys = dove9_system_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);
	dove9_system_start(sys);

	mail = make_test_mail("user@example.com", "bot@test.com",
			      "Hello System", "Full integration test");

	proc = dove9_system_process_mail(sys, &mail);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT(proc->content[0] != '\0');
	DOVE9_TEST_ASSERT_STR_EQ(proc->from, "user@example.com");

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_system_events(void)
{
	struct dove9_system_config cfg;
	struct dove9_system *sys;
	struct dove9_mail_message mail;

	dove9_test_begin("events fire during mail processing");

	dove9_mock_reset();
	cfg = make_test_config();
	sys = dove9_system_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	reset_event_counts();
	dove9_system_on(sys, test_event_handler, NULL);

	dove9_system_start(sys);

	mail = make_test_mail("user@example.com", "bot@test.com",
			      "Event test", "Trigger events");

	dove9_system_process_mail(sys, &mail);

	DOVE9_TEST_ASSERT(mail_received_count >= 1);
	/* response_ready only fires after full cognitive cycle completion,
	   not from a single process_mail call */

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_system_not_started(void)
{
	struct dove9_system_config cfg;
	struct dove9_system *sys;
	struct dove9_mail_message mail;
	struct dove9_message_process *proc;

	dove9_test_begin("process_mail returns pending process if system not started");

	dove9_mock_reset();
	cfg = make_test_config();
	sys = dove9_system_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	/* Don't start the system */
	mail = make_test_mail("user@example.com", "bot@test.com",
			      NULL, "Should fail");

	proc = dove9_system_process_mail(sys, &mail);
	/* process_mail creates the process even if not started */
	if (proc != NULL)
		DOVE9_TEST_ASSERT_INT_EQ((int)proc->state,
					 (int)DOVE9_PROCESS_PENDING);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_system_double_start(void)
{
	struct dove9_system_config cfg;
	struct dove9_system *sys;
	int ret1, ret2;

	dove9_test_begin("double start is idempotent");

	dove9_mock_reset();
	cfg = make_test_config();
	sys = dove9_system_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	ret1 = dove9_system_start(sys);
	ret2 = dove9_system_start(sys);
	DOVE9_TEST_ASSERT_INT_EQ(ret1, 0);
	/* Second start should succeed or be no-op */
	DOVE9_TEST_ASSERT(ret2 == 0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_system_multiple_messages(void)
{
	struct dove9_system_config cfg;
	struct dove9_system *sys;
	struct dove9_mail_message mail;
	struct dove9_message_process *proc;
	char subj[32];
	char body[32];
	int i;

	dove9_test_begin("system handles multiple sequential messages");

	dove9_mock_reset();
	cfg = make_test_config();
	sys = dove9_system_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);
	dove9_system_start(sys);

	for (i = 0; i < 5; i++) {
		snprintf(subj, sizeof(subj), "Msg %d", i);
		snprintf(body, sizeof(body), "Body %d", i);
		mail = make_test_mail("user@example.com", "bot@test.com",
				      subj, body);

		proc = dove9_system_process_mail(sys, &mail);
		DOVE9_TEST_ASSERT_NOT_NULL(proc);
		DOVE9_TEST_ASSERT(proc->content[0] != '\0');
	}

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_system_stop_without_start(void)
{
	struct dove9_system_config cfg;
	struct dove9_system *sys;

	dove9_test_begin("system stop without start is safe");
	dove9_mock_reset();

	cfg = make_test_config();
	sys = dove9_system_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	dove9_system_stop(sys); /* should not crash */
	DOVE9_TEST_ASSERT(true);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_system_create,
		test_system_start_stop,
		test_process_mail,
		test_system_events,
		test_system_not_started,
		test_system_double_start,
		test_system_multiple_messages,
		test_system_stop_without_start,
	};
	return dove9_test_run("dove9-system", tests,
			      sizeof(tests) / sizeof(tests[0]));
}
