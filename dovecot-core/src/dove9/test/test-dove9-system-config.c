/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for dove9_system_config, system lifecycle, accessors, and
 * the full dove9_system integration boundary. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../dove9-system.h"
#include <string.h>

/* ---- test helpers ---- */

static struct dove9_system_config valid_config(void)
{
	struct dove9_system_config sc;
	memset(&sc, 0, sizeof(sc));
	sc.base = dove9_config_default();
	sc.base.max_concurrent_processes = 16;
	sc.base.max_queue_depth = 32;
	sc.llm = &dove9_mock_llm;
	sc.memory = &dove9_mock_memory;
	sc.persona = &dove9_mock_persona;
	snprintf(sc.bot_email_address, sizeof(sc.bot_email_address),
		 "bot@test.local");
	snprintf(sc.milter_socket, sizeof(sc.milter_socket),
		 "/var/run/dovecho/milter.sock");
	snprintf(sc.lmtp_socket, sizeof(sc.lmtp_socket),
		 "/var/run/dovecho/lmtp.sock");
	return sc;
}

/* ---- test: system create with valid config ---- */

static void test_system_create_valid(void)
{
	dove9_test_begin("sysconf: create with valid config");
	dove9_mock_reset();
	struct dove9_system_config sc = valid_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);
	DOVE9_TEST_ASSERT(!dove9_system_is_running(sys));
	dove9_system_destroy(&sys);
	DOVE9_TEST_ASSERT_NULL(sys);
	dove9_test_end();
}

/* ---- test: system start ---- */

static void test_system_start(void)
{
	dove9_test_begin("sysconf: system start");
	dove9_mock_reset();
	struct dove9_system_config sc = valid_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	int rc = dove9_system_start(sys);
	DOVE9_TEST_ASSERT_INT_EQ(rc, 0);
	DOVE9_TEST_ASSERT(dove9_system_is_running(sys));
	dove9_system_stop(sys);
	DOVE9_TEST_ASSERT(!dove9_system_is_running(sys));
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: system metrics after start ---- */

static void test_system_metrics(void)
{
	dove9_test_begin("sysconf: system metrics");
	dove9_mock_reset();
	struct dove9_system_config sc = valid_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	dove9_system_start(sys);

	struct dove9_kernel_metrics met;
	dove9_system_get_metrics(sys, &met);
	DOVE9_TEST_ASSERT(met.cognitive_load >= 0.0);
	DOVE9_TEST_ASSERT(met.stream_coherence >= 0.0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: system get_kernel accessor ---- */

static void test_system_get_kernel(void)
{
	dove9_test_begin("sysconf: get kernel accessor");
	dove9_mock_reset();
	struct dove9_system_config sc = valid_config();
	struct dove9_system *sys = dove9_system_create(&sc);

	struct dove9_kernel *k = dove9_system_get_kernel(sys);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: system get_processor accessor ---- */

static void test_system_get_processor(void)
{
	dove9_test_begin("sysconf: get processor accessor");
	dove9_mock_reset();
	struct dove9_system_config sc = valid_config();
	struct dove9_system *sys = dove9_system_create(&sc);

	struct dove9_dte_processor *p = dove9_system_get_processor(sys);
	DOVE9_TEST_ASSERT_NOT_NULL(p);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: system active processes ---- */

static void test_system_active_processes(void)
{
	dove9_test_begin("sysconf: active processes initially zero");
	dove9_mock_reset();
	struct dove9_system_config sc = valid_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	dove9_system_start(sys);

	struct dove9_message_process *out[16];
	unsigned int n = dove9_system_get_active_processes(sys, out, 16);
	DOVE9_TEST_ASSERT_UINT_EQ(n, 0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: system process_mail creates process ---- */

static void test_system_process_mail(void)
{
	dove9_test_begin("sysconf: process_mail creates process");
	dove9_mock_reset();
	struct dove9_system_config sc = valid_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	dove9_system_start(sys);

	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "sc-m1@test");
	snprintf(mail.from, sizeof(mail.from), "alice@test");
	snprintf(mail.subject, sizeof(mail.subject), "Hello");
	snprintf(mail.body, sizeof(mail.body), "body");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.local");

	struct dove9_message_process *proc =
		dove9_system_process_mail(sys, &mail);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: config max limits ---- */

static void test_config_limits_macros(void)
{
	dove9_test_begin("sysconf: config limit macros are positive");
	DOVE9_TEST_ASSERT(DOVE9_MAX_RECIPIENTS > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_REFERENCES > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_HEADERS > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_MEMORIES > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_PROCESSES > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_QUEUE_DEPTH > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_CHILD_IDS > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_EXEC_HISTORY > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_PENDING_ACTIONS > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_ID_LEN > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_ADDR_LEN > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_SUBJECT_LEN > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_BODY_LEN > 0);
	dove9_test_end();
}

/* ---- test: system double-destroy safe ---- */

static void test_system_double_destroy_safe(void)
{
	dove9_test_begin("sysconf: double destroy safe");
	dove9_mock_reset();
	struct dove9_system_config sc = valid_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	dove9_system_destroy(&sys);
	DOVE9_TEST_ASSERT_NULL(sys);
	/* second destroy should not crash */
	dove9_system_destroy(&sys);
	DOVE9_TEST_ASSERT_NULL(sys);
	dove9_test_end();
}

/* ---- test: config customization ---- */

static void test_config_custom_values(void)
{
	dove9_test_begin("sysconf: custom config values survive");
	struct dove9_config c = dove9_config_default();
	c.step_duration_ms = 50;
	c.max_concurrent_processes = 200;
	c.max_queue_depth = 500;
	c.enable_milter = false;
	c.enable_lmtp = false;
	c.enable_deltachat = false;
	c.enable_parallel_cognition = false;
	c.default_salience_threshold = 0.7;

	DOVE9_TEST_ASSERT_UINT_EQ(c.step_duration_ms, 50);
	DOVE9_TEST_ASSERT_UINT_EQ(c.max_concurrent_processes, 200);
	DOVE9_TEST_ASSERT_UINT_EQ(c.max_queue_depth, 500);
	DOVE9_TEST_ASSERT(!c.enable_milter);
	DOVE9_TEST_ASSERT(!c.enable_lmtp);
	DOVE9_TEST_ASSERT(!c.enable_deltachat);
	DOVE9_TEST_ASSERT(!c.enable_parallel_cognition);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(c.default_salience_threshold, 0.7, 0.001);
	dove9_test_end();
}

/* ---- test: dte processor config defaults ---- */

static void test_dte_processor_config_defaults(void)
{
	dove9_test_begin("sysconf: DTE processor config defaults");
	struct dove9_dte_processor_config dc =
		dove9_dte_processor_config_default();
	DOVE9_TEST_ASSERT(dc.enable_parallel_cognition);
	DOVE9_TEST_ASSERT_UINT_EQ(dc.memory_retrieval_count, 10);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(dc.salience_threshold, 0.3, 0.001);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_system_create_valid,
		test_system_start,
		test_system_metrics,
		test_system_get_kernel,
		test_system_get_processor,
		test_system_active_processes,
		test_system_process_mail,
		test_config_limits_macros,
		test_system_double_destroy_safe,
		test_config_custom_values,
		test_dte_processor_config_defaults,
	};
	return dove9_test_run("dove9-system-config",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
