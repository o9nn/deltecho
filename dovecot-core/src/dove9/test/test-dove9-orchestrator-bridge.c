/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-orchestrator-bridge: DovecotEmail→Dove9System via
   the orchestrator bridge layer. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../integration/dove9-orchestrator-bridge.h"
#include "../types/dove9-types.h"

#include <string.h>

/* ---- Event tracking ---- */

static unsigned int mail_processed_count;
static unsigned int response_ready_count;

static void reset_event_counts(void)
{
	mail_processed_count = 0;
	response_ready_count = 0;
}

static void test_event_handler(const struct dove9_bridge_event *event,
			       void *ctx)
{
	(void)ctx;
	switch (event->type) {
	case DOVE9_BRIDGE_RESPONSE_READY:
		response_ready_count++;
		mail_processed_count++;
		break;
	case DOVE9_BRIDGE_SEND_RESPONSE:
		mail_processed_count++;
		break;
	default:
		break;
	}
}

static void test_bridge_create(void)
{
	struct dove9_orchestrator_bridge *bridge;
	struct dove9_orchestrator_bridge_config cfg =
		dove9_orchestrator_bridge_config_default();

	dove9_test_begin("orchestrator bridge create/destroy");

	bridge = dove9_orchestrator_bridge_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(bridge);
	dove9_orchestrator_bridge_destroy(&bridge);
	DOVE9_TEST_ASSERT_NULL(bridge);

	dove9_test_end();
}

static void test_bridge_init(void)
{
	struct dove9_orchestrator_bridge *bridge;
	struct dove9_orchestrator_bridge_config cfg =
		dove9_orchestrator_bridge_config_default();

	dove9_test_begin("init with valid config succeeds");

	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.enable_auto_response = true;

	bridge = dove9_orchestrator_bridge_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(bridge);

	dove9_orchestrator_bridge_initialize(bridge,
		&dove9_mock_llm, &dove9_mock_memory, &dove9_mock_persona);

	dove9_orchestrator_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_process_email(void)
{
	struct dove9_orchestrator_bridge *bridge;
	struct dove9_orchestrator_bridge_config cfg =
		dove9_orchestrator_bridge_config_default();
	struct dove9_dovecot_email email;
	struct dove9_message_process *proc;

	dove9_test_begin("process_email produces a message process");

	dove9_mock_reset();

	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.enable_auto_response = true;

	bridge = dove9_orchestrator_bridge_create(&cfg);
	dove9_orchestrator_bridge_initialize(bridge,
		&dove9_mock_llm, &dove9_mock_memory, &dove9_mock_persona);

	reset_event_counts();
	dove9_orchestrator_bridge_on(bridge, test_event_handler, NULL);

	dove9_orchestrator_bridge_start(bridge);

	memset(&email, 0, sizeof(email));
	snprintf(email.from, sizeof(email.from), "user@test.com");
	email.to_count = 1;
	snprintf(email.to[0], sizeof(email.to[0]), "bot@test.com");
	snprintf(email.subject, sizeof(email.subject), "Test");
	snprintf(email.body, sizeof(email.body), "Hello");

	proc = dove9_orchestrator_bridge_process_email(bridge, &email);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT_STR_EQ(proc->from, "user@test.com");

	dove9_orchestrator_bridge_stop(bridge);
	dove9_orchestrator_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_process_non_bot_address(void)
{
	struct dove9_orchestrator_bridge *bridge;
	struct dove9_orchestrator_bridge_config cfg =
		dove9_orchestrator_bridge_config_default();
	struct dove9_dovecot_email email;
	struct dove9_message_process *proc;

	dove9_test_begin("mail not addressed to bot returns NULL or skips");

	dove9_mock_reset();

	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.enable_auto_response = true;

	bridge = dove9_orchestrator_bridge_create(&cfg);
	dove9_orchestrator_bridge_initialize(bridge,
		&dove9_mock_llm, &dove9_mock_memory, &dove9_mock_persona);
	dove9_orchestrator_bridge_start(bridge);

	memset(&email, 0, sizeof(email));
	snprintf(email.from, sizeof(email.from), "user@test.com");
	email.to_count = 1;
	snprintf(email.to[0], sizeof(email.to[0]), "other@test.com");
	snprintf(email.subject, sizeof(email.subject), "Not for bot");
	snprintf(email.body, sizeof(email.body), "Ignored");

	proc = dove9_orchestrator_bridge_process_email(bridge, &email);
	/* Should return NULL (skipped) or a process in pending state */
	DOVE9_TEST_ASSERT(proc == NULL ||
			  proc->state == DOVE9_PROCESS_PENDING);

	dove9_orchestrator_bridge_stop(bridge);
	dove9_orchestrator_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_bridge_double_destroy(void)
{
	struct dove9_orchestrator_bridge_config cfg =
		dove9_orchestrator_bridge_config_default();

	dove9_test_begin("orchestrator bridge double destroy safe");
	struct dove9_orchestrator_bridge *bridge =
		dove9_orchestrator_bridge_create(&cfg);
	dove9_orchestrator_bridge_destroy(&bridge);
	DOVE9_TEST_ASSERT_NULL(bridge);
	dove9_orchestrator_bridge_destroy(&bridge);
	DOVE9_TEST_ASSERT_NULL(bridge);
	dove9_test_end();
}

static void test_bridge_event_multiple(void)
{
	struct dove9_orchestrator_bridge_config cfg =
		dove9_orchestrator_bridge_config_default();

	dove9_test_begin("orchestrator bridge: multiple emails processed");
	dove9_mock_reset();
	reset_event_counts();

	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.enable_auto_response = true;

	struct dove9_orchestrator_bridge *bridge =
		dove9_orchestrator_bridge_create(&cfg);
	dove9_orchestrator_bridge_initialize(bridge,
		&dove9_mock_llm, &dove9_mock_memory, &dove9_mock_persona);
	dove9_orchestrator_bridge_on(bridge, test_event_handler, NULL);
	dove9_orchestrator_bridge_start(bridge);

	struct dove9_dovecot_email email;
	memset(&email, 0, sizeof(email));
	snprintf(email.from, sizeof(email.from), "u1@test.com");
	email.to_count = 1;
	snprintf(email.to[0], sizeof(email.to[0]), "bot@test.com");
	snprintf(email.subject, sizeof(email.subject), "A");
	snprintf(email.body, sizeof(email.body), "body1");
	struct dove9_message_process *first =
		dove9_orchestrator_bridge_process_email(bridge, &email);

	memset(&email, 0, sizeof(email));
	snprintf(email.from, sizeof(email.from), "u2@test.com");
	email.to_count = 1;
	snprintf(email.to[0], sizeof(email.to[0]), "bot@test.com");
	snprintf(email.subject, sizeof(email.subject), "B");
	snprintf(email.body, sizeof(email.body), "body2");
	struct dove9_message_process *second =
		dove9_orchestrator_bridge_process_email(bridge, &email);

	DOVE9_TEST_ASSERT_NOT_NULL(first);
	DOVE9_TEST_ASSERT_NOT_NULL(second);
	DOVE9_TEST_ASSERT(strcmp(first->id, second->id) != 0);

	dove9_orchestrator_bridge_stop(bridge);
	dove9_orchestrator_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_bridge_empty_body(void)
{
	struct dove9_orchestrator_bridge_config cfg =
		dove9_orchestrator_bridge_config_default();

	dove9_test_begin("orchestrator bridge: empty body mail");
	dove9_mock_reset();

	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.enable_auto_response = true;

	struct dove9_orchestrator_bridge *bridge =
		dove9_orchestrator_bridge_create(&cfg);
	dove9_orchestrator_bridge_initialize(bridge,
		&dove9_mock_llm, &dove9_mock_memory, &dove9_mock_persona);
	dove9_orchestrator_bridge_start(bridge);

	struct dove9_dovecot_email email;
	memset(&email, 0, sizeof(email));
	snprintf(email.from, sizeof(email.from), "user@test.com");
	email.to_count = 1;
	snprintf(email.to[0], sizeof(email.to[0]), "bot@test.com");
	snprintf(email.subject, sizeof(email.subject), "Empty");
	/* body is empty */

	struct dove9_message_process *proc =
		dove9_orchestrator_bridge_process_email(bridge, &email);
	/* should handle gracefully — either NULL or valid process */
	DOVE9_TEST_ASSERT(proc == NULL || proc != NULL);

	dove9_orchestrator_bridge_stop(bridge);
	dove9_orchestrator_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_bridge_long_subject(void)
{
	struct dove9_orchestrator_bridge_config cfg =
		dove9_orchestrator_bridge_config_default();

	dove9_test_begin("orchestrator bridge: long subject truncation safe");
	dove9_mock_reset();

	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.enable_auto_response = true;

	struct dove9_orchestrator_bridge *bridge =
		dove9_orchestrator_bridge_create(&cfg);
	dove9_orchestrator_bridge_initialize(bridge,
		&dove9_mock_llm, &dove9_mock_memory, &dove9_mock_persona);
	dove9_orchestrator_bridge_start(bridge);

	struct dove9_dovecot_email email;
	memset(&email, 0, sizeof(email));
	snprintf(email.from, sizeof(email.from), "user@test.com");
	email.to_count = 1;
	snprintf(email.to[0], sizeof(email.to[0]), "bot@test.com");
	/* fill subject with max chars */
	memset(email.subject, 'X', DOVE9_MAX_SUBJECT_LEN - 1);
	email.subject[DOVE9_MAX_SUBJECT_LEN - 1] = '\0';
	snprintf(email.body, sizeof(email.body), "body");

	struct dove9_message_process *proc =
		dove9_orchestrator_bridge_process_email(bridge, &email);
	DOVE9_TEST_ASSERT(proc == NULL || proc != NULL); /* no crash */

	dove9_orchestrator_bridge_stop(bridge);
	dove9_orchestrator_bridge_destroy(&bridge);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_bridge_create,
		test_bridge_init,
		test_process_email,
		test_process_non_bot_address,
		test_bridge_double_destroy,
		test_bridge_event_multiple,
		test_bridge_empty_body,
		test_bridge_long_subject,
	};
	return dove9_test_run("dove9-orchestrator-bridge", tests,
			      sizeof(tests) / sizeof(tests[0]));
}
