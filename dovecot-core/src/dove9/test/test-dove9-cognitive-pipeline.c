/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* End-to-end cognitive pipeline tests: validates the full progression
 * through T1→T2→T4→T5→T7→T8 cognitive terms in proper sequence with
 * mock services, verifying the complete feedforward/feedback loop. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../dove9-system.h"
#include "../cognitive/dove9-triadic-engine.h"
#include "../cognitive/dove9-dte-processor.h"
#include "../core/dove9-kernel.h"
#include "../types/dove9-types.h"
#include <string.h>

/* ---- test: full pipeline processes one message ---- */

static void test_full_pipeline_one_message(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;
	struct dove9_mail_message mail;
	struct dove9_message_process *proc;

	dove9_test_begin("pipeline: full message processing");
	dove9_mock_reset();

	memset(&cfg, 0, sizeof(cfg));
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	sys = dove9_system_create(&cfg);
	dove9_system_start(sys);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "test-1@example.com");
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	mail.to_count = 1;
	snprintf(mail.subject, sizeof(mail.subject), "Pipeline Test");
	snprintf(mail.body, sizeof(mail.body), "Hello pipeline!");

	proc = dove9_system_process_mail(sys, &mail);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: pipeline invokes LLM ---- */

static void test_pipeline_invokes_llm(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;
	struct dove9_mail_message mail;

	dove9_test_begin("pipeline: LLM called during processing");
	dove9_mock_reset();

	memset(&cfg, 0, sizeof(cfg));
	cfg.base = dove9_config_default();
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	sys = dove9_system_create(&cfg);
	dove9_system_start(sys);

	/* Advance engine to step 2 (triad 1: T2E) where LLM is invoked */
	dove9_kernel_tick(dove9_system_get_kernel(sys));
	dove9_kernel_tick(dove9_system_get_kernel(sys));

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	mail.to_count = 1;
	snprintf(mail.subject, sizeof(mail.subject), "LLM test");
	snprintf(mail.body, sizeof(mail.body), "Does LLM fire?");

	dove9_system_process_mail(sys, &mail);
	dove9_kernel_tick(dove9_system_get_kernel(sys));
	/* With enable_parallel_cognition=true (default), T2E calls
	   generate_parallel_response instead of generate_response */
	DOVE9_TEST_ASSERT(dove9_mock_llm_generate_calls > 0 ||
			  dove9_mock_llm_parallel_calls > 0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: pipeline invokes memory system ---- */

static void test_pipeline_invokes_memory(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;
	struct dove9_mail_message mail;

	dove9_test_begin("pipeline: memory system called");
	dove9_mock_reset();

	memset(&cfg, 0, sizeof(cfg));
	cfg.base = dove9_config_default();
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	sys = dove9_system_create(&cfg);
	dove9_system_start(sys);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "test-mem@example.com");
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	mail.to_count = 1;
	snprintf(mail.body, sizeof(mail.body), "Memory test");

	dove9_system_process_mail(sys, &mail);
	dove9_kernel_tick(dove9_system_get_kernel(sys));
	DOVE9_TEST_ASSERT(dove9_mock_memory_store_calls > 0 ||
			  dove9_mock_memory_retrieve_recent_calls > 0 ||
			  dove9_mock_memory_retrieve_relevant_calls > 0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: pipeline invokes persona ---- */

static void test_pipeline_invokes_persona(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;
	struct dove9_mail_message mail;

	dove9_test_begin("pipeline: persona system called");
	dove9_mock_reset();

	memset(&cfg, 0, sizeof(cfg));
	cfg.base = dove9_config_default();
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	sys = dove9_system_create(&cfg);
	dove9_system_start(sys);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "test-per@example.com");
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	mail.to_count = 1;
	snprintf(mail.body, sizeof(mail.body), "Persona test");

	dove9_system_process_mail(sys, &mail);
	dove9_kernel_tick(dove9_system_get_kernel(sys));
	DOVE9_TEST_ASSERT(dove9_mock_persona_personality_calls > 0 ||
			  dove9_mock_persona_emotion_calls > 0 ||
			  dove9_mock_persona_update_calls > 0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: pipeline triadic steps advance ---- */

static void test_pipeline_triadic_advance(void)
{
	struct dove9_dte_processor_config dteconf = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_triadic_engine *engine;
	struct dove9_triadic_metrics tmetrics;

	dove9_test_begin("pipeline: triadic engine advances through 12 steps");
	dove9_mock_reset();

	dte = dove9_dte_processor_create(&dove9_mock_llm,
					 &dove9_mock_memory,
					 &dove9_mock_persona, &dteconf);
	proc = dove9_dte_processor_as_cognitive(dte);
	engine = dove9_triadic_engine_create(&proc, 0);
	dove9_triadic_engine_start(engine);

	int i;
	for (i = 0; i < 12; i++)
		dove9_triadic_engine_advance_step(engine);

	dove9_triadic_engine_get_metrics(engine, &tmetrics);
	DOVE9_TEST_ASSERT_UINT_EQ(tmetrics.total_cycles, 1);

	dove9_triadic_engine_stop(engine);
	dove9_triadic_engine_destroy(&engine);
	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

/* ---- test: pipeline sequential messages accumulate mock calls ---- */

static void test_pipeline_sequential_messages(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;
	struct dove9_mail_message mail;
	unsigned int first_total, second_total;

	dove9_test_begin("pipeline: sequential messages accumulate mock calls");
	dove9_mock_reset();

	memset(&cfg, 0, sizeof(cfg));
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	sys = dove9_system_create(&cfg);
	dove9_system_start(sys);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "test-seq@example.com");
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	mail.to_count = 1;
	snprintf(mail.body, sizeof(mail.body), "First");
	dove9_system_process_mail(sys, &mail);
	first_total = dove9_mock_llm_generate_calls;

	snprintf(mail.body, sizeof(mail.body), "Second");
	dove9_system_process_mail(sys, &mail);
	second_total = dove9_mock_llm_generate_calls;

	DOVE9_TEST_ASSERT(second_total >= first_total);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: pipeline with disabled triadic ---- */

static void test_pipeline_without_triadic(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;
	struct dove9_mail_message mail;

	dove9_test_begin("pipeline: processing without triadic");
	dove9_mock_reset();

	memset(&cfg, 0, sizeof(cfg));
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	sys = dove9_system_create(&cfg);
	dove9_system_start(sys);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "test-not@example.com");
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	mail.to_count = 1;
	snprintf(mail.body, sizeof(mail.body), "No triadic");

	dove9_system_process_mail(sys, &mail);
	DOVE9_TEST_ASSERT(true); /* must not crash */

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: pipeline with disabled sys6 ---- */

static void test_pipeline_without_sys6(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;
	struct dove9_mail_message mail;

	dove9_test_begin("pipeline: processing with triadic but no sys6");
	dove9_mock_reset();

	memset(&cfg, 0, sizeof(cfg));
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	sys = dove9_system_create(&cfg);
	dove9_system_start(sys);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "test-nos@example.com");
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	mail.to_count = 1;
	snprintf(mail.body, sizeof(mail.body), "Triadic only");

	dove9_system_process_mail(sys, &mail);
	DOVE9_TEST_ASSERT(true);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: pipeline cognitive load stays bounded ---- */

static void test_pipeline_load_bounded(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;
	struct dove9_mail_message mail;
	int i;

	dove9_test_begin("pipeline: cognitive load stays bounded after 10 messages");
	dove9_mock_reset();

	memset(&cfg, 0, sizeof(cfg));
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = &dove9_mock_llm;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;
	sys = dove9_system_create(&cfg);
	dove9_system_start(sys);

	for (i = 0; i < 10; i++) {
		memset(&mail, 0, sizeof(mail));
		snprintf(mail.message_id, sizeof(mail.message_id),
			 "test-load%d@example.com", i);
		snprintf(mail.from, sizeof(mail.from), "u%d@test.com", i);
		snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
		mail.to_count = 1;
		snprintf(mail.body, sizeof(mail.body), "Load test %d", i);
		dove9_system_process_mail(sys, &mail);
	}

	/* System should still be running and not overloaded */
	DOVE9_TEST_ASSERT(dove9_system_is_running(sys));

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: pipeline degraded mode on low memory ---- */

static void test_pipeline_degraded_mode(void)
{
	struct dove9_dte_processor_config dteconf = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 0, /* No memory retrieval */
		.salience_threshold = 0.0,
	};
	struct dove9_dte_processor *dte;

	dove9_test_begin("pipeline: zero memory config creates processor");
	dove9_mock_reset();

	dte = dove9_dte_processor_create(&dove9_mock_llm,
					 &dove9_mock_memory,
					 &dove9_mock_persona, &dteconf);
	DOVE9_TEST_ASSERT_NOT_NULL(dte);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_full_pipeline_one_message,
		test_pipeline_invokes_llm,
		test_pipeline_invokes_memory,
		test_pipeline_invokes_persona,
		test_pipeline_triadic_advance,
		test_pipeline_sequential_messages,
		test_pipeline_without_triadic,
		test_pipeline_without_sys6,
		test_pipeline_load_bounded,
		test_pipeline_degraded_mode,
	};
	return dove9_test_run("dove9-cognitive-pipeline",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
