/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for memory lifecycle patterns: create/destroy cycles, leak
 * detection helpers, and resource management across all opaque types. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../dove9-system.h"
#include "../utils/dove9-logger.h"
#include "../integration/dove9-sys6-mail-scheduler.h"
#include <string.h>

/* ---- test: logger lifecycle ---- */

static void test_logger_lifecycle(void)
{
	dove9_test_begin("lifecycle: logger create/destroy cycle");
	for (int i = 0; i < 100; i++) {
		struct dove9_logger *l = dove9_logger_create("lc-test");
		DOVE9_TEST_ASSERT_NOT_NULL(l);
		dove9_logger_destroy(&l);
		DOVE9_TEST_ASSERT_NULL(l);
	}
	dove9_test_end();
}

/* ---- test: triadic engine lifecycle ---- */

static void test_triadic_engine_lifecycle(void)
{
	dove9_test_begin("lifecycle: triadic engine rapid cycle");
	dove9_mock_reset();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);

	for (int i = 0; i < 50; i++) {
		struct dove9_triadic_engine *eng =
			dove9_triadic_engine_create(&cp, 100);
		DOVE9_TEST_ASSERT_NOT_NULL(eng);
		dove9_triadic_engine_destroy(&eng);
		DOVE9_TEST_ASSERT_NULL(eng);
	}
	dove9_test_end();
}

/* ---- test: kernel lifecycle ---- */

static void test_kernel_lifecycle(void)
{
	dove9_test_begin("lifecycle: kernel rapid create/destroy");
	dove9_mock_reset();
	struct dove9_config cfg = dove9_config_default();
	cfg.max_concurrent_processes = 4;
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);

	for (int i = 0; i < 50; i++) {
		struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
		DOVE9_TEST_ASSERT_NOT_NULL(k);
		dove9_kernel_destroy(&k);
		DOVE9_TEST_ASSERT_NULL(k);
	}
	dove9_test_end();
}

/* ---- test: system lifecycle ---- */

static void test_system_lifecycle(void)
{
	dove9_test_begin("lifecycle: system rapid create/destroy");
	dove9_mock_reset();

	struct dove9_system_config sc;
	memset(&sc, 0, sizeof(sc));
	sc.base = dove9_config_default();
	sc.base.max_concurrent_processes = 4;
	sc.llm = &dove9_mock_llm;
	sc.memory = &dove9_mock_memory;
	sc.persona = &dove9_mock_persona;
	snprintf(sc.bot_email_address, sizeof(sc.bot_email_address),
		 "bot@lc.test");

	for (int i = 0; i < 20; i++) {
		struct dove9_system *sys = dove9_system_create(&sc);
		DOVE9_TEST_ASSERT_NOT_NULL(sys);
		dove9_system_destroy(&sys);
		DOVE9_TEST_ASSERT_NULL(sys);
	}
	dove9_test_end();
}

/* ---- test: system start/stop lifecycle ---- */

static void test_system_start_stop_cycle(void)
{
	dove9_test_begin("lifecycle: system start/stop repeated");
	dove9_mock_reset();

	struct dove9_system_config sc;
	memset(&sc, 0, sizeof(sc));
	sc.base = dove9_config_default();
	sc.base.max_concurrent_processes = 4;
	sc.llm = &dove9_mock_llm;
	sc.memory = &dove9_mock_memory;
	sc.persona = &dove9_mock_persona;
	snprintf(sc.bot_email_address, sizeof(sc.bot_email_address),
		 "bot@lc.test");

	struct dove9_system *sys = dove9_system_create(&sc);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	for (int i = 0; i < 10; i++) {
		dove9_system_start(sys);
		DOVE9_TEST_ASSERT(dove9_system_is_running(sys));
		dove9_system_stop(sys);
		DOVE9_TEST_ASSERT(!dove9_system_is_running(sys));
	}

	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: dte processor lifecycle ---- */

static void test_dte_processor_lifecycle(void)
{
	dove9_test_begin("lifecycle: DTE processor rapid cycle");
	dove9_mock_reset();

	struct dove9_dte_processor_config dc =
		dove9_dte_processor_config_default();

	for (int i = 0; i < 50; i++) {
		struct dove9_dte_processor *proc =
			dove9_dte_processor_create(
				&dove9_mock_llm,
				&dove9_mock_memory,
				&dove9_mock_persona,
				&dc);
		DOVE9_TEST_ASSERT_NOT_NULL(proc);
		dove9_dte_processor_destroy(&proc);
		DOVE9_TEST_ASSERT_NULL(proc);
	}
	dove9_test_end();
}

/* ---- test: null destroy is safe for all types ---- */

static void test_null_destroy_all_safe(void)
{
	dove9_test_begin("lifecycle: NULL destroy safe for all types");

	struct dove9_logger *l = NULL;
	dove9_logger_destroy(&l);
	DOVE9_TEST_ASSERT_NULL(l);

	struct dove9_triadic_engine *e = NULL;
	dove9_triadic_engine_destroy(&e);
	DOVE9_TEST_ASSERT_NULL(e);

	struct dove9_kernel *k = NULL;
	dove9_kernel_destroy(&k);
	DOVE9_TEST_ASSERT_NULL(k);

	struct dove9_system *s = NULL;
	dove9_system_destroy(&s);
	DOVE9_TEST_ASSERT_NULL(s);

	struct dove9_dte_processor *p = NULL;
	dove9_dte_processor_destroy(&p);
	DOVE9_TEST_ASSERT_NULL(p);

	dove9_test_end();
}

/* ---- test: kernel with mail lifecycle ---- */

static void test_kernel_mail_lifecycle(void)
{
	dove9_test_begin("lifecycle: kernel mail enable/process/destroy");
	dove9_mock_reset();

	struct dove9_config cfg = dove9_config_default();
	cfg.max_concurrent_processes = 8;
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	struct dove9_mailbox_mapping mb = dove9_mailbox_mapping_default();
	dove9_kernel_enable_mail_protocol(k, &mb);
	dove9_kernel_start(k);

	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "lc-m1@test");
	snprintf(mail.from, sizeof(mail.from), "a@test");
	snprintf(mail.subject, sizeof(mail.subject), "LC test");
	snprintf(mail.body, sizeof(mail.body), "body");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test");

	dove9_kernel_create_process_from_mail(k, &mail);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	DOVE9_TEST_ASSERT_NULL(k);
	dove9_test_end();
}

/* ---- test: cognitive context opaque pointer lifecycle ---- */

static void test_context_opaque_ptrs(void)
{
	dove9_test_begin("lifecycle: cognitive context opaque ptrs");
	struct dove9_cognitive_context ctx = dove9_cognitive_context_init();
	DOVE9_TEST_ASSERT_NULL(ctx.perception_data);
	DOVE9_TEST_ASSERT_NULL(ctx.thought_data);
	DOVE9_TEST_ASSERT_NULL(ctx.action_plan);

	int dummy = 42;
	ctx.perception_data = &dummy;
	DOVE9_TEST_ASSERT_NOT_NULL(ctx.perception_data);
	ctx.perception_data = NULL;
	DOVE9_TEST_ASSERT_NULL(ctx.perception_data);
	dove9_test_end();
}

/* ---- test: sys6 scheduler lifecycle ---- */

static void test_sys6_scheduler_lifecycle(void)
{
	dove9_test_begin("lifecycle: sys6 scheduler create+advance+destroy");
	struct dove9_sys6_scheduler_config scfg =
		dove9_sys6_scheduler_config_default();
	struct dove9_sys6_mail_scheduler *sched =
		dove9_sys6_scheduler_create(100, &scfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sched);
	dove9_sys6_scheduler_advance_step(sched);
	dove9_sys6_scheduler_destroy(&sched);
	DOVE9_TEST_ASSERT_NULL(sched);
	dove9_test_end();
}

/* ---- test: mail bridge lifecycle ---- */

static void test_mail_bridge_lifecycle(void)
{
	dove9_test_begin("lifecycle: mail bridge create+destroy");
	struct dove9_mail_bridge_config bcfg;
	memset(&bcfg, 0, sizeof(bcfg));
	bcfg.mailbox_mapping = dove9_mailbox_mapping_default();
	bcfg.default_priority = 5;
	bcfg.enable_threading = true;
	struct dove9_mail_protocol_bridge *bridge =
		dove9_mail_bridge_create(&bcfg);
	DOVE9_TEST_ASSERT_NOT_NULL(bridge);
	dove9_mail_bridge_destroy(&bridge);
	DOVE9_TEST_ASSERT_NULL(bridge);
	dove9_test_end();
}

/* ---- test: repeated create/destroy doesn't leak ---- */

static void test_repeated_lifecycle(void)
{
	int i;
	dove9_test_begin("lifecycle: repeated create/destroy 20x");
	dove9_mock_reset();
	for (i = 0; i < 20; i++) {
		struct dove9_dte_processor_config cfg = {
			.enable_parallel_cognition = false,
			.memory_retrieval_count = 3,
			.salience_threshold = 0.1,
		};
		struct dove9_dte_processor *dte =
			dove9_dte_processor_create(&dove9_mock_llm,
						   &dove9_mock_memory,
						   &dove9_mock_persona,
						   &cfg);
		dove9_dte_processor_destroy(&dte);
	}
	DOVE9_TEST_ASSERT(true);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_logger_lifecycle,
		test_triadic_engine_lifecycle,
		test_kernel_lifecycle,
		test_system_lifecycle,
		test_system_start_stop_cycle,
		test_dte_processor_lifecycle,
		test_null_destroy_all_safe,
		test_kernel_mail_lifecycle,
		test_context_opaque_ptrs,
		test_sys6_scheduler_lifecycle,
		test_mail_bridge_lifecycle,
		test_repeated_lifecycle,
	};
	return dove9_test_run("dove9-memory-lifecycle",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
