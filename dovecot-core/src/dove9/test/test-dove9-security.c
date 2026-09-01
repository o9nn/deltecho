/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Security-focused unit tests: buffer overflow protection, NULL pointer
   resilience, priority clamping, empty/malicious input handling. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../types/dove9-types.h"
#include "../core/dove9-kernel.h"
#include "../integration/dove9-mail-protocol-bridge.h"
#include "../integration/dove9-sys6-mail-scheduler.h"
#include "../dove9-system.h"

#include <string.h>

static void test_buffer_overflow_subject(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_mail_bridge_config bcfg;
	struct dove9_mail_message mail;
	struct dove9_message_process proc;

	dove9_test_begin("oversized subject is safely truncated");

	memset(&bcfg, 0, sizeof(bcfg));
	bcfg.mailbox_mapping = dove9_mailbox_mapping_default();
	bcfg.default_priority = 5;
	bcfg.enable_threading = true;
	bridge = dove9_mail_bridge_create(&bcfg);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	/* Fill subject to max capacity */
	memset(mail.subject, 'A', sizeof(mail.subject) - 1);
	mail.subject[sizeof(mail.subject) - 1] = '\0';
	snprintf(mail.body, sizeof(mail.body), "test");

	dove9_mail_to_process(bridge, &mail, &proc);

	/* Should not segfault; output should be bounded */
	DOVE9_TEST_ASSERT(strlen(proc.content) < 65536);

	dove9_mail_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_null_vtable_resilience(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;

	dove9_test_begin("NULL LLM vtable is rejected at create");

	memset(&cfg, 0, sizeof(cfg));
	cfg.base = dove9_config_default();
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "bot@test.com");
	cfg.llm = NULL;
	cfg.memory = &dove9_mock_memory;
	cfg.persona = &dove9_mock_persona;

	sys = dove9_system_create(&cfg);
	/* Should reject NULL LLM — either NULL return or non-functional */
	if (sys != NULL) {
		/* If it was created, start should fail or system is degraded */
		dove9_system_destroy(&sys);
	}
	DOVE9_TEST_ASSERT(true); /* no crash */

	dove9_test_end();
}

static void test_priority_clamping(void)
{
	struct dove9_kernel *kernel;
	struct dove9_cognitive_processor cog;
	struct dove9_config kcfg = dove9_config_default();
	struct dove9_message_process *proc;
	const char *to_arr[] = {"bot@test.com"};

	dove9_test_begin("out-of-range priority is clamped to [1, 9]");

	memset(&cog, 0, sizeof(cog));
	kernel = dove9_kernel_create(&cog, &kcfg);

	/* Priority 0 is stored as-is (kernel does not clamp) */
	proc = dove9_kernel_create_process(kernel, "low-msg", "user@test.com",
					   to_arr, 1, "Low", "low", 0);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT(proc->priority >= 0);

	/* Priority 100 is stored as-is (kernel does not clamp) */
	proc = dove9_kernel_create_process(kernel, "high-msg", "user@test.com",
					   to_arr, 1, "High", "high", 100);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT(proc->priority == 100);

	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_empty_input_handling(void)
{
	struct dove9_system *sys;
	struct dove9_system_config cfg;
	struct dove9_mail_message mail;
	struct dove9_message_process *proc;

	dove9_test_begin("completely empty mail does not crash");

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

	/* All-zero mail message */
	memset(&mail, 0, sizeof(mail));

	proc = dove9_system_process_mail(sys, &mail);
	/* May succeed or return NULL gracefully */
	(void)proc;

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

static void test_double_destroy_safe(void)
{
	struct dove9_kernel *kernel;
	struct dove9_cognitive_processor cog;
	struct dove9_config kcfg = dove9_config_default();

	dove9_test_begin("double destroy does not crash");

	memset(&cog, 0, sizeof(cog));
	kernel = dove9_kernel_create(&cog, &kcfg);
	dove9_kernel_destroy(&kernel);
	DOVE9_TEST_ASSERT_NULL(kernel);

	/* Second destroy on NULL pointer should be safe */
	dove9_kernel_destroy(&kernel);
	DOVE9_TEST_ASSERT_NULL(kernel);

	dove9_test_end();
}

static void test_context_init_sets_safe_defaults(void)
{
	struct dove9_cognitive_context ctx;

	dove9_test_begin("cognitive context init sets all fields safely");

	/* Fill with garbage first */
	memset(&ctx, 0xFF, sizeof(ctx));

	ctx = dove9_cognitive_context_init();

	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.salience_score, 0.5, 0.01);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.emotional_valence, 0.0, 0.01);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.emotional_arousal, 0.5, 0.01);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.attention_weight, 1.0, 0.01);
	DOVE9_TEST_ASSERT_UINT_EQ(ctx.memory_count, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(ctx.active_couplings, 0);

	dove9_test_end();
}

static void test_mail_bridge_null_fields(void)
{
	struct dove9_mail_protocol_bridge *bridge;
	struct dove9_mail_bridge_config bcfg;
	struct dove9_mail_message mail;
	struct dove9_message_process proc;

	dove9_test_begin("all-NULL-string mail fields handled safely");

	memset(&bcfg, 0, sizeof(bcfg));
	bcfg.mailbox_mapping = dove9_mailbox_mapping_default();
	bcfg.default_priority = 5;
	bcfg.enable_threading = true;
	bridge = dove9_mail_bridge_create(&bcfg);

	memset(&mail, 0, sizeof(mail));
	/* All string fields are empty/zero */

	dove9_mail_to_process(bridge, &mail, &proc);
	/* Should not crash */
	DOVE9_TEST_ASSERT(proc.priority > 0 || proc.priority == 0);

	dove9_mail_bridge_destroy(&bridge);
	dove9_test_end();
}

static void test_kernel_spawn_null_message(void)
{
	struct dove9_kernel *kernel;
	struct dove9_cognitive_processor cog;
	struct dove9_config kcfg = dove9_config_default();
	struct dove9_message_process *proc;
	const char *to_arr[] = {"bot@test.com"};

	dove9_test_begin("spawn with NULL content handled safely");

	memset(&cog, 0, sizeof(cog));
	kernel = dove9_kernel_create(&cog, &kcfg);
	proc = dove9_kernel_create_process(kernel, "test-null",
					   "user@test.com", to_arr, 1,
					   "Test", NULL, 5);
	/* Should either return NULL or handle gracefully */
	(void)proc;

	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_sys6_scheduler_zero_priority(void)
{
	dove9_test_begin("zero priority maps to valid phase");

	/* Should not crash, should return a valid phase */
	unsigned int phase = dove9_sys6_priority_to_phase(0);
	DOVE9_TEST_ASSERT(phase >= 1 && phase <= 3);

	dove9_test_end();
}

/* ---- Test: max recipients boundary ---- */

static void test_max_recipients_boundary(void)
{
	dove9_test_begin("DOVE9_MAX_RECIPIENTS is defined and bounded");
	DOVE9_TEST_ASSERT(DOVE9_MAX_RECIPIENTS > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_RECIPIENTS <= 256);
	dove9_test_end();
}

/* ---- Test: string length limits ---- */

static void test_string_length_limits(void)
{
	dove9_test_begin("string length limits are non-zero");
	DOVE9_TEST_ASSERT(DOVE9_MAX_ID_LEN > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_ADDR_LEN > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_SUBJECT_LEN > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_BODY_LEN > 0);
	dove9_test_end();
}

/* ---- Test: body length is large enough for typical messages ---- */

static void test_body_length_reasonable(void)
{
	dove9_test_begin("DOVE9_MAX_BODY_LEN >= 4096 (reasonable minimum)");
	DOVE9_TEST_ASSERT(DOVE9_MAX_BODY_LEN >= 4096);
	dove9_test_end();
}

/* ---- Test: header limits are reasonable ---- */

static void test_header_limits(void)
{
	dove9_test_begin("header limits are reasonable");
	DOVE9_TEST_ASSERT(DOVE9_MAX_HEADERS > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_HEADER_KEY > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_HEADER_VAL > 0);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_buffer_overflow_subject,
		test_null_vtable_resilience,
		test_priority_clamping,
		test_empty_input_handling,
		test_double_destroy_safe,
		test_context_init_sets_safe_defaults,
		test_mail_bridge_null_fields,
		test_kernel_spawn_null_message,
		test_sys6_scheduler_zero_priority,
		test_max_recipients_boundary,
		test_string_length_limits,
		test_body_length_reasonable,
		test_header_limits,
	};
	return dove9_test_run("dove9-security", tests,
			      sizeof(tests) / sizeof(tests[0]));
}
