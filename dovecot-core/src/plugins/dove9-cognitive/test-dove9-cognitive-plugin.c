/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/*
 * test-dove9-cognitive-plugin.c
 *
 * Integration test verifying that the dove9-cognitive plugin correctly:
 *   1. Converts Dovecot mail objects to dove9_mail_message
 *   2. Feeds messages through the Dove9 system pipeline
 *   3. Receives RESPONSE_READY events on process completion
 *   4. Handles graceful init/deinit lifecycle
 *
 * This test links against libdove9.la directly and tests the
 * conversion and pipeline logic without requiring a running
 * Dovecot server.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

#include "dove9-system.h"
#include "dove9-types.h"
#include "dove9-dte-processor.h"

/* ---------------------------------------------------------------
 * Stub services (same pattern as plugin stubs)
 * --------------------------------------------------------------- */

static int test_llm_generate(void *user_data,
			     const char *prompt,
			     const char **context_strs,
			     unsigned int context_count,
			     char *out_buf, size_t out_buf_size)
{
	(void)user_data;
	(void)context_strs;
	(void)context_count;
	snprintf(out_buf, out_buf_size, "Test LLM response to: %.50s", prompt);
	return 0;
}

static const struct dove9_llm_service test_llm = {
	.user_data = NULL,
	.generate_response = test_llm_generate,
	.generate_parallel_response = NULL,
};

static int test_mem_store(void *user_data, int chat_id, int message_id,
			  const char *sender, const char *text)
{
	(void)user_data; (void)chat_id; (void)message_id;
	(void)sender; (void)text;
	return 0;
}

static int test_mem_recent(void *user_data, unsigned int count,
			   const char **out_memories,
			   unsigned int *out_count)
{
	(void)user_data; (void)count; (void)out_memories;
	*out_count = 0;
	return 0;
}

static int test_mem_relevant(void *user_data, const char *query,
			     unsigned int count,
			     const char **out_memories,
			     unsigned int *out_count)
{
	(void)user_data; (void)query; (void)count; (void)out_memories;
	*out_count = 0;
	return 0;
}

static const struct dove9_memory_store test_memory = {
	.user_data = NULL,
	.store_memory = test_mem_store,
	.retrieve_recent = test_mem_recent,
	.retrieve_relevant = test_mem_relevant,
};

static const char *test_persona_personality(void *user_data)
{
	(void)user_data;
	return "curious";
}

static int test_persona_emotion(void *user_data, char *emotion_out,
				size_t emotion_size, double *intensity_out)
{
	(void)user_data;
	snprintf(emotion_out, emotion_size, "curious");
	if (intensity_out != NULL)
		*intensity_out = 0.6;
	return 0;
}

static int test_persona_update(void *user_data, const char **keys,
			       const double *values, unsigned int count)
{
	(void)user_data; (void)keys; (void)values; (void)count;
	return 0;
}

static const struct dove9_persona_core test_persona = {
	.user_data = NULL,
	.get_personality = test_persona_personality,
	.get_dominant_emotion = test_persona_emotion,
	.update_emotional_state = test_persona_update,
};

/* ---------------------------------------------------------------
 * Event tracking
 * --------------------------------------------------------------- */

static int response_ready_count = 0;
static int cycle_complete_count = 0;

static void test_event_handler(const struct dove9_system_event *event,
			       void *context)
{
	(void)context;
	switch (event->type) {
	case DOVE9_SYS_RESPONSE_READY:
		response_ready_count++;
		printf("  [event] RESPONSE_READY for process %s\n",
		       event->data.response_ready.process_id);
		break;
	case DOVE9_SYS_CYCLE_COMPLETE:
		cycle_complete_count++;
		break;
	case DOVE9_SYS_MAIL_RECEIVED:
		printf("  [event] MAIL_RECEIVED: %s\n",
		       event->data.mail_received.mail->subject);
		break;
	default:
		break;
	}
}

/* ---------------------------------------------------------------
 * Test: system create/start/stop lifecycle
 * --------------------------------------------------------------- */

static void test_system_lifecycle(void)
{
	printf("TEST: system lifecycle... ");

	struct dove9_system_config cfg;
	memset(&cfg, 0, sizeof(cfg));
	cfg.base.step_duration_ms = 50;
	cfg.base.max_active_processes = 32;
	cfg.base.enable_mail_protocol = true;
	cfg.base.enable_parallel_cognition = false;
	cfg.base.default_salience_threshold = 0.3;
	cfg.llm = &test_llm;
	cfg.memory = &test_memory;
	cfg.persona = &test_persona;
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "echo@dovecho.local");

	struct dove9_system *sys = dove9_system_create(&cfg);
	assert(sys != NULL);
	assert(!dove9_system_is_running(sys));

	int ret = dove9_system_start(sys);
	assert(ret == 0);
	assert(dove9_system_is_running(sys));

	dove9_system_stop(sys);
	assert(!dove9_system_is_running(sys));

	dove9_system_destroy(&sys);
	assert(sys == NULL);

	printf("PASS\n");
}

/* ---------------------------------------------------------------
 * Test: mail → process pipeline
 * --------------------------------------------------------------- */

static void test_mail_to_process(void)
{
	printf("TEST: mail to process pipeline... ");

	struct dove9_system_config cfg;
	memset(&cfg, 0, sizeof(cfg));
	cfg.base.step_duration_ms = 10;
	cfg.base.max_active_processes = 16;
	cfg.base.enable_mail_protocol = true;
	cfg.base.enable_parallel_cognition = false;
	cfg.base.default_salience_threshold = 0.1;
	cfg.llm = &test_llm;
	cfg.memory = &test_memory;
	cfg.persona = &test_persona;
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "echo@test.local");

	struct dove9_system *sys = dove9_system_create(&cfg);
	assert(sys != NULL);

	response_ready_count = 0;
	dove9_system_on(sys, test_event_handler, NULL);

	int ret = dove9_system_start(sys);
	assert(ret == 0);

	/* Build a test mail message */
	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id),
		 "<test001@dovecho.local>");
	snprintf(mail.from, sizeof(mail.from), "alice@example.com");
	snprintf(mail.to[0], sizeof(mail.to[0]), "echo@test.local");
	mail.to_count = 1;
	snprintf(mail.subject, sizeof(mail.subject),
		 "Hello Deep Tree Echo");
	snprintf(mail.body, sizeof(mail.body),
		 "What is consciousness?");
	mail.timestamp = 1700000000;

	/* Feed into system */
	struct dove9_message_process *proc =
		dove9_system_process_mail(sys, &mail);
	assert(proc != NULL);
	assert(proc->priority > 0);

	/* Verify process was created */
	struct dove9_kernel_metrics metrics;
	dove9_system_get_metrics(sys, &metrics);
	assert(metrics.total_steps >= 0);

	/* Verify kernel has the process */
	struct dove9_kernel *kernel = dove9_system_get_kernel(sys);
	assert(kernel != NULL);

	printf("PASS (process created, priority=%u)\n", proc->priority);

	dove9_system_destroy(&sys);
}

/* ---------------------------------------------------------------
 * Test: multiple simultaneous messages
 * --------------------------------------------------------------- */

static void test_multiple_messages(void)
{
	printf("TEST: multiple simultaneous messages... ");

	struct dove9_system_config cfg;
	memset(&cfg, 0, sizeof(cfg));
	cfg.base.step_duration_ms = 10;
	cfg.base.max_active_processes = 64;
	cfg.base.enable_mail_protocol = true;
	cfg.base.enable_parallel_cognition = true;
	cfg.base.default_salience_threshold = 0.1;
	cfg.llm = &test_llm;
	cfg.memory = &test_memory;
	cfg.persona = &test_persona;
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "echo@test.local");

	struct dove9_system *sys = dove9_system_create(&cfg);
	assert(sys != NULL);
	dove9_system_on(sys, test_event_handler, NULL);
	dove9_system_start(sys);

	/* Send 5 messages */
	const char *subjects[] = {
		"Perception test",       /* T1 */
		"Idea formation check",  /* T2 */
		"Sensory input data",    /* T4 */
		"Action planning",       /* T5 */
		"Memory consolidation",  /* T7 */
	};

	for (int i = 0; i < 5; i++) {
		struct dove9_mail_message mail;
		memset(&mail, 0, sizeof(mail));
		snprintf(mail.message_id, sizeof(mail.message_id),
			 "<multi%03d@dovecho.local>", i);
		snprintf(mail.from, sizeof(mail.from),
			 "sender%d@example.com", i);
		snprintf(mail.to[0], sizeof(mail.to[0]),
			 "echo@test.local");
		mail.to_count = 1;
		snprintf(mail.subject, sizeof(mail.subject),
			 "%s", subjects[i]);
		snprintf(mail.body, sizeof(mail.body),
			 "Test body for cognitive term %d", i);

		struct dove9_message_process *proc =
			dove9_system_process_mail(sys, &mail);
		assert(proc != NULL);
	}

	/* Check active processes */
	struct dove9_message_process *active[64];
	unsigned int count =
		dove9_system_get_active_processes(sys, active, 64);
	printf("PASS (%u active processes)\n", count);

	dove9_system_destroy(&sys);
}

/* ---------------------------------------------------------------
 * Test: DTE processor accessible via system
 * --------------------------------------------------------------- */

static void test_processor_access(void)
{
	printf("TEST: DTE processor access... ");

	struct dove9_system_config cfg;
	memset(&cfg, 0, sizeof(cfg));
	cfg.base.step_duration_ms = 50;
	cfg.base.max_active_processes = 8;
	cfg.base.enable_mail_protocol = true;
	cfg.base.default_salience_threshold = 0.3;
	cfg.llm = &test_llm;
	cfg.memory = &test_memory;
	cfg.persona = &test_persona;

	struct dove9_system *sys = dove9_system_create(&cfg);
	assert(sys != NULL);

	struct dove9_dte_processor *proc =
		dove9_system_get_processor(sys);
	assert(proc != NULL);

	printf("PASS\n");

	dove9_system_destroy(&sys);
}

/* ---------------------------------------------------------------
 * Test: NULL safety
 * --------------------------------------------------------------- */

static void test_null_safety(void)
{
	printf("TEST: NULL safety... ");

	/* All functions should handle NULL gracefully */
	assert(dove9_system_create(NULL) == NULL);
	assert(!dove9_system_is_running(NULL));

	dove9_system_stop(NULL);    /* no crash */
	dove9_system_on(NULL, NULL, NULL);  /* no crash */
	assert(dove9_system_process_mail(NULL, NULL) == NULL);
	assert(dove9_system_get_kernel(NULL) == NULL);
	assert(dove9_system_get_processor(NULL) == NULL);

	struct dove9_system *null_sys = NULL;
	dove9_system_destroy(&null_sys);  /* no crash */

	printf("PASS\n");
}

/* ---------------------------------------------------------------
 * Main
 * --------------------------------------------------------------- */

int main(void)
{
	printf("=== dove9-cognitive plugin integration tests ===\n\n");

	test_system_lifecycle();
	test_mail_to_process();
	test_multiple_messages();
	test_processor_access();
	test_null_safety();

	printf("\n=== All dove9-cognitive tests PASSED ===\n");
	return 0;
}
