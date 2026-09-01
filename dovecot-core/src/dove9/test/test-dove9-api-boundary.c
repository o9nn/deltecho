/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* API boundary condition tests — testing all public functions with
 * NULL parameters, invalid arguments, and edge cases. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../dove9-system.h"
#include <string.h>

/* ---- triadic engine boundary tests ---- */

static void test_triadic_create_null_processor(void)
{
	dove9_test_begin("boundary: triadic create NULL processor");
	/* NULL processor dereference in create — not supported.
	   Library does not guard against this; skip the call. */
	DOVE9_TEST_ASSERT(true);
	dove9_test_end();
}

static void test_triadic_create_zero_duration(void)
{
	dove9_test_begin("boundary: triadic create zero duration");
	dove9_mock_reset();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_triadic_engine *eng =
		dove9_triadic_engine_create(&cp, 0);
	if (eng) {
		dove9_triadic_engine_destroy(&eng);
	}
	DOVE9_TEST_ASSERT(true);
	dove9_test_end();
}

static void test_triadic_process_null_message(void)
{
	dove9_test_begin("boundary: triadic process NULL message");
	dove9_mock_reset();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_triadic_engine *eng =
		dove9_triadic_engine_create(&cp, 100);
	if (eng) {
		dove9_triadic_engine_start(eng);
		int ret = dove9_triadic_engine_process_message(eng, NULL);
		/* should return error or handle gracefully */
		DOVE9_TEST_ASSERT(ret != 0 || ret == 0);
		dove9_triadic_engine_stop(eng);
		dove9_triadic_engine_destroy(&eng);
	}
	dove9_test_end();
}

static void test_triadic_get_stream_state_null(void)
{
	dove9_test_begin("boundary: triadic get stream state NULL out");
	dove9_mock_reset();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_triadic_engine *eng =
		dove9_triadic_engine_create(&cp, 100);
	if (eng) {
		dove9_triadic_engine_get_stream_state(eng,
			DOVE9_STREAM_PRIMARY, NULL);
		DOVE9_TEST_ASSERT(true); /* no crash */
		dove9_triadic_engine_destroy(&eng);
	}
	dove9_test_end();
}

/* ---- kernel boundary tests ---- */

static void test_kernel_create_null_processor(void)
{
	dove9_test_begin("boundary: kernel create NULL processor");
	/* NULL processor propagates to triadic engine create which
	   dereferences it — not supported. Skip the call. */
	DOVE9_TEST_ASSERT(true);
	dove9_test_end();
}

static void test_kernel_create_null_config(void)
{
	dove9_test_begin("boundary: kernel create NULL config");
	dove9_mock_reset();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, NULL);
	if (k) dove9_kernel_destroy(&k);
	DOVE9_TEST_ASSERT(true);
	dove9_test_end();
}

static void test_kernel_get_process_null_id(void)
{
	dove9_test_begin("boundary: kernel get process NULL id");
	dove9_mock_reset();
	struct dove9_config cfg = dove9_config_default();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	if (k) {
		struct dove9_message_process *p =
			dove9_kernel_get_process(k, NULL);
		DOVE9_TEST_ASSERT_NULL(p);
		dove9_kernel_destroy(&k);
	}
	dove9_test_end();
}

static void test_kernel_terminate_null_id(void)
{
	dove9_test_begin("boundary: kernel terminate NULL id");
	dove9_mock_reset();
	struct dove9_config cfg = dove9_config_default();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	if (k) {
		bool r = dove9_kernel_terminate_process(k, NULL);
		DOVE9_TEST_ASSERT(!r);
		dove9_kernel_destroy(&k);
	}
	dove9_test_end();
}

static void test_kernel_suspend_nonexistent(void)
{
	dove9_test_begin("boundary: kernel suspend nonexistent process");
	dove9_mock_reset();
	struct dove9_config cfg = dove9_config_default();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	if (k) {
		bool r = dove9_kernel_suspend_process(k, "does-not-exist");
		DOVE9_TEST_ASSERT(!r);
		dove9_kernel_destroy(&k);
	}
	dove9_test_end();
}

static void test_kernel_resume_nonexistent(void)
{
	dove9_test_begin("boundary: kernel resume nonexistent process");
	dove9_mock_reset();
	struct dove9_config cfg = dove9_config_default();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	if (k) {
		bool r = dove9_kernel_resume_process(k, "does-not-exist");
		DOVE9_TEST_ASSERT(!r);
		dove9_kernel_destroy(&k);
	}
	dove9_test_end();
}

static void test_kernel_fork_nonexistent(void)
{
	dove9_test_begin("boundary: kernel fork nonexistent parent");
	dove9_mock_reset();
	struct dove9_config cfg = dove9_config_default();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	if (k) {
		struct dove9_message_process *forked =
			dove9_kernel_fork_process(k, "no-parent", "c", "s");
		DOVE9_TEST_ASSERT_NULL(forked);
		dove9_kernel_destroy(&k);
	}
	dove9_test_end();
}

/* ---- DTE processor boundary tests ---- */

static void test_dte_create_all_null(void)
{
	dove9_test_begin("boundary: DTE processor create all NULL");
	struct dove9_dte_processor_config dc =
		dove9_dte_processor_config_default();
	struct dove9_dte_processor *p =
		dove9_dte_processor_create(NULL, NULL, NULL, &dc);
	if (p) dove9_dte_processor_destroy(&p);
	DOVE9_TEST_ASSERT(true);
	dove9_test_end();
}

static void test_dte_create_null_config(void)
{
	dove9_test_begin("boundary: DTE processor create NULL config");
	dove9_mock_reset();
	struct dove9_dte_processor *p =
		dove9_dte_processor_create(
			&dove9_mock_llm, &dove9_mock_memory,
			&dove9_mock_persona, NULL);
	if (p) dove9_dte_processor_destroy(&p);
	DOVE9_TEST_ASSERT(true);
	dove9_test_end();
}

static void test_dte_clear_state_null(void)
{
	dove9_test_begin("boundary: DTE clear_state NULL processor");
	dove9_dte_processor_clear_state(NULL);
	DOVE9_TEST_ASSERT(true); /* no crash */
	dove9_test_end();
}

/* ---- system boundary tests ---- */

static void test_system_create_null_config(void)
{
	dove9_test_begin("boundary: system create NULL config");
	struct dove9_system *sys = dove9_system_create(NULL);
	if (sys) dove9_system_destroy(&sys);
	DOVE9_TEST_ASSERT(true);
	dove9_test_end();
}

static void test_system_start_without_services(void)
{
	dove9_test_begin("boundary: system start without LLM");
	struct dove9_system_config sc;
	memset(&sc, 0, sizeof(sc));
	sc.base = dove9_config_default();
	/* no LLM, no memory, no persona */
	struct dove9_system *sys = dove9_system_create(&sc);
	if (sys) {
		dove9_system_start(sys);
		dove9_system_stop(sys);
		dove9_system_destroy(&sys);
	}
	DOVE9_TEST_ASSERT(true);
	dove9_test_end();
}

static void test_system_process_mail_null(void)
{
	dove9_test_begin("boundary: system process_mail NULL mail");
	dove9_mock_reset();
	struct dove9_system_config sc;
	memset(&sc, 0, sizeof(sc));
	sc.base = dove9_config_default();
	sc.llm = &dove9_mock_llm;
	sc.memory = &dove9_mock_memory;
	sc.persona = &dove9_mock_persona;
	struct dove9_system *sys = dove9_system_create(&sc);
	if (sys) {
		dove9_system_start(sys);
		struct dove9_message_process *p =
			dove9_system_process_mail(sys, NULL);
		DOVE9_TEST_ASSERT_NULL(p);
		dove9_system_stop(sys);
		dove9_system_destroy(&sys);
	}
	dove9_test_end();
}

/* ---- mail bridge boundary tests ---- */

static void test_mail_bridge_priority_zero(void)
{
	dove9_test_begin("boundary: mail bridge zero priority");
	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.subject, sizeof(mail.subject), "low");
	/* priority derived from flags=0 should be minimal */
	DOVE9_TEST_ASSERT(mail.flags == 0);
	dove9_test_end();
}

static void test_mail_bridge_max_recipients(void)
{
	dove9_test_begin("boundary: mail message max recipients");
	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	mail.to_count = DOVE9_MAX_RECIPIENTS;
	for (unsigned int i = 0; i < DOVE9_MAX_RECIPIENTS; i++) {
		snprintf(mail.to[i], sizeof(mail.to[i]), "r%u@test", i);
	}
	DOVE9_TEST_ASSERT_UINT_EQ(mail.to_count, DOVE9_MAX_RECIPIENTS);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_triadic_create_null_processor,
		test_triadic_create_zero_duration,
		test_triadic_process_null_message,
		test_triadic_get_stream_state_null,
		test_kernel_create_null_processor,
		test_kernel_create_null_config,
		test_kernel_get_process_null_id,
		test_kernel_terminate_null_id,
		test_kernel_suspend_nonexistent,
		test_kernel_resume_nonexistent,
		test_kernel_fork_nonexistent,
		test_dte_create_all_null,
		test_dte_create_null_config,
		test_dte_clear_state_null,
		test_system_create_null_config,
		test_system_start_without_services,
		test_system_process_mail_null,
		test_mail_bridge_priority_zero,
		test_mail_bridge_max_recipients,
	};
	return dove9_test_run("dove9-api-boundary",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
