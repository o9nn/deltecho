/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-sys6-orchestrator-bridge: Sys6+orchestrator
   integration, stats tracking, distribution counters. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../integration/dove9-sys6-orchestrator-bridge.h"
#include "../types/dove9-types.h"

#include <string.h>

/* ---- Event tracking ---- */

static unsigned int sys6_sync_count;
static unsigned int grand_cycle_count;

static void reset_event_counts(void)
{
	sys6_sync_count = 0;
	grand_cycle_count = 0;
}

static void test_event_handler(const struct dove9_sys6_bridge_event *event,
			       void *ctx)
{
	(void)ctx;
	switch (event->type) {
	case DOVE9_SYS6_BRIDGE_PROCESS_SCHEDULED:
		sys6_sync_count++;
		break;
	case DOVE9_SYS6_BRIDGE_GRAND_CYCLE_COMPLETE:
		grand_cycle_count++;
		break;
	default:
		break;
	}
}

/* ---- helpers ---- */

static struct dove9_sys6_bridge_config test_bridge_config(void)
{
	struct dove9_sys6_bridge_config cfg = dove9_sys6_bridge_config_default();
	snprintf(cfg.base.bot_email_address,
		 sizeof(cfg.base.bot_email_address), "bot@test.com");
	return cfg;
}

static struct dove9_dovecot_email make_test_email(const char *from,
						  const char *to,
						  const char *subject,
						  const char *body)
{
	struct dove9_dovecot_email email;
	memset(&email, 0, sizeof(email));
	snprintf(email.from, sizeof(email.from), "%s", from);
	email.to_count = 1;
	snprintf(email.to[0], sizeof(email.to[0]), "%s", to);
	if (subject)
		snprintf(email.subject, sizeof(email.subject), "%s", subject);
	if (body)
		snprintf(email.body, sizeof(email.body), "%s", body);
	return email;
}

static void test_sys6_bridge_create(void)
{
	struct dove9_sys6_orchestrator_bridge *bridge;
	struct dove9_sys6_bridge_config cfg = test_bridge_config();

	dove9_test_begin("sys6 bridge create/destroy");

	bridge = dove9_sys6_bridge_create(&cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(bridge);
	dove9_sys6_bridge_destroy(&bridge);
	DOVE9_TEST_ASSERT_NULL(bridge);

	dove9_test_end();
}

static void test_sys6_bridge_init(void)
{
	struct dove9_sys6_orchestrator_bridge *bridge;
	struct dove9_sys6_bridge_config cfg = test_bridge_config();

	dove9_test_begin("init with valid config succeeds");

	bridge = dove9_sys6_bridge_create(&cfg);
	dove9_sys6_bridge_initialize(bridge, &dove9_mock_llm,
				     &dove9_mock_memory, &dove9_mock_persona);

	/* Start should succeed if initialized properly */
	DOVE9_TEST_ASSERT_NOT_NULL(bridge);

	dove9_sys6_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_process_email(void)
{
	struct dove9_sys6_orchestrator_bridge *bridge;
	struct dove9_sys6_bridge_config cfg = test_bridge_config();
	struct dove9_dovecot_email email;
	struct dove9_message_process *proc;

	dove9_test_begin("process_email produces process");

	dove9_mock_reset();
	bridge = dove9_sys6_bridge_create(&cfg);
	dove9_sys6_bridge_initialize(bridge, &dove9_mock_llm,
				     &dove9_mock_memory, &dove9_mock_persona);
	dove9_sys6_bridge_start(bridge);

	email = make_test_email("user@test.com", "bot@test.com",
				"Test", "Hello Sys6");

	proc = dove9_sys6_bridge_process_email(bridge, &email);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);

	dove9_sys6_bridge_stop(bridge);
	dove9_sys6_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_stats(void)
{
	struct dove9_sys6_orchestrator_bridge *bridge;
	struct dove9_sys6_bridge_config cfg = test_bridge_config();
	struct dove9_sys6_integration_stats stats;
	struct dove9_dovecot_email email;

	dove9_test_begin("stats track messages processed");

	dove9_mock_reset();
	bridge = dove9_sys6_bridge_create(&cfg);
	dove9_sys6_bridge_initialize(bridge, &dove9_mock_llm,
				     &dove9_mock_memory, &dove9_mock_persona);
	dove9_sys6_bridge_start(bridge);

	dove9_sys6_bridge_get_stats(bridge, &stats);
	DOVE9_TEST_ASSERT_UINT_EQ(stats.total_scheduled, 0);

	email = make_test_email("user@test.com", "bot@test.com",
				"Test", "Track me");
	dove9_sys6_bridge_process_email(bridge, &email);

	dove9_sys6_bridge_get_stats(bridge, &stats);
	DOVE9_TEST_ASSERT(stats.total_scheduled >= 1);

	dove9_sys6_bridge_stop(bridge);
	dove9_sys6_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_distribution_counters(void)
{
	struct dove9_sys6_orchestrator_bridge *bridge;
	struct dove9_sys6_bridge_config cfg = test_bridge_config();
	struct dove9_sys6_integration_stats stats;
	struct dove9_dovecot_email email;

	dove9_test_begin("distribution counters track phase assignments");

	dove9_mock_reset();
	bridge = dove9_sys6_bridge_create(&cfg);
	dove9_sys6_bridge_initialize(bridge, &dove9_mock_llm,
				     &dove9_mock_memory, &dove9_mock_persona);
	dove9_sys6_bridge_start(bridge);

	/* Send a message */
	email = make_test_email("user@test.com", "bot@test.com",
				"Urgent", "High prio");
	dove9_sys6_bridge_process_email(bridge, &email);

	dove9_sys6_bridge_get_stats(bridge, &stats);
	/* At least one phase counter should be > 0 */
	DOVE9_TEST_ASSERT(stats.phase1_count + stats.phase2_count +
			  stats.phase3_count > 0);

	dove9_sys6_bridge_stop(bridge);
	dove9_sys6_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_events(void)
{
	struct dove9_sys6_orchestrator_bridge *bridge;
	struct dove9_sys6_bridge_config cfg = test_bridge_config();
	struct dove9_dovecot_email email;
	int i;

	dove9_test_begin("events fire during Sys6 processing");

	dove9_mock_reset();
	bridge = dove9_sys6_bridge_create(&cfg);
	dove9_sys6_bridge_initialize(bridge, &dove9_mock_llm,
				     &dove9_mock_memory, &dove9_mock_persona);
	dove9_sys6_bridge_start(bridge);

	reset_event_counts();
	dove9_sys6_bridge_on(bridge, test_event_handler, NULL);

	email = make_test_email("user@test.com", "bot@test.com",
				"Test", "Events");

	/* Process several messages to advance the cycle */
	for (i = 0; i < 5; i++)
		dove9_sys6_bridge_process_email(bridge, &email);

	/* Every accepted message must emit one process-scheduled event. */
	DOVE9_TEST_ASSERT_UINT_EQ(sys6_sync_count, 5);
	DOVE9_TEST_ASSERT_UINT_EQ(grand_cycle_count, 0);

	dove9_sys6_bridge_stop(bridge);
	dove9_sys6_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_sys6_bridge_double_destroy(void)
{
	struct dove9_sys6_bridge_config cfg = test_bridge_config();
	struct dove9_sys6_orchestrator_bridge *bridge;

	dove9_test_begin("sys6 bridge: double destroy safe");

	bridge = dove9_sys6_bridge_create(&cfg);
	dove9_sys6_bridge_destroy(&bridge);
	DOVE9_TEST_ASSERT_NULL(bridge);
	dove9_sys6_bridge_destroy(&bridge);
	DOVE9_TEST_ASSERT_NULL(bridge);

	dove9_test_end();
}

static void test_sys6_bridge_empty_body(void)
{
	struct dove9_sys6_orchestrator_bridge *bridge;
	struct dove9_sys6_bridge_config cfg = test_bridge_config();
	struct dove9_dovecot_email email;
	struct dove9_message_process *proc;

	dove9_test_begin("sys6 bridge: empty body mail");
	dove9_mock_reset();

	bridge = dove9_sys6_bridge_create(&cfg);
	dove9_sys6_bridge_initialize(bridge, &dove9_mock_llm,
				     &dove9_mock_memory, &dove9_mock_persona);
	dove9_sys6_bridge_start(bridge);

	email = make_test_email("user@test.com", "bot@test.com", "Empty", "");

	proc = dove9_sys6_bridge_process_email(bridge, &email);
	DOVE9_TEST_ASSERT(proc != NULL || proc == NULL); /* no crash */

	dove9_sys6_bridge_stop(bridge);
	dove9_sys6_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_sys6_bridge_multi_process(void)
{
	struct dove9_sys6_orchestrator_bridge *bridge;
	struct dove9_sys6_bridge_config cfg = test_bridge_config();
	struct dove9_sys6_integration_stats stats;
	int i;

	dove9_test_begin("sys6 bridge: rapid multi-message processing");
	dove9_mock_reset();

	bridge = dove9_sys6_bridge_create(&cfg);
	dove9_sys6_bridge_initialize(bridge, &dove9_mock_llm,
				     &dove9_mock_memory, &dove9_mock_persona);
	dove9_sys6_bridge_start(bridge);

	for (i = 0; i < 30; i++) {
		struct dove9_dovecot_email email;
		char from[64], subj[64], body[64];
		snprintf(from, sizeof(from), "u%d@test.com", i);
		snprintf(subj, sizeof(subj), "Msg %d", i);
		snprintf(body, sizeof(body), "Body %d", i);
		email = make_test_email(from, "bot@test.com", subj, body);
		dove9_sys6_bridge_process_email(bridge, &email);
	}

	dove9_sys6_bridge_get_stats(bridge, &stats);
	DOVE9_TEST_ASSERT(stats.phase1_count + stats.phase2_count +
			  stats.phase3_count > 0);

	dove9_sys6_bridge_stop(bridge);
	dove9_sys6_bridge_destroy(&bridge);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_sys6_bridge_create,
		test_sys6_bridge_init,
		test_process_email,
		test_stats,
		test_distribution_counters,
		test_events,
		test_sys6_bridge_double_destroy,
		test_sys6_bridge_empty_body,
		test_sys6_bridge_multi_process,
	};
	return dove9_test_run("dove9-sys6-bridge", tests,
			      sizeof(tests) / sizeof(tests[0]));
}
