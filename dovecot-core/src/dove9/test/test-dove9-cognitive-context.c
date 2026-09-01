/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for dove9_cognitive_context helpers, coupling bitfield ops,
 * struct defaults, mail message initialization, and context state. */

#include "dove9-test-common.h"
#include "../types/dove9-types.h"
#include <string.h>
#include <stdio.h>

/* ---- coupling helper tests ---- */

static void test_coupling_set_single(void)
{
	dove9_test_begin("ctx: coupling set single");
	unsigned int c = 0;
	c = dove9_coupling_set(c, DOVE9_COUPLING_PERCEPTION_MEMORY);
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(c, DOVE9_COUPLING_PERCEPTION_MEMORY));
	DOVE9_TEST_ASSERT(!dove9_coupling_is_active(c, DOVE9_COUPLING_ASSESSMENT_PLANNING));
	DOVE9_TEST_ASSERT(!dove9_coupling_is_active(c, DOVE9_COUPLING_BALANCED_INTEGRATION));
	dove9_test_end();
}

static void test_coupling_set_all(void)
{
	dove9_test_begin("ctx: coupling set all three");
	unsigned int c = 0;
	c = dove9_coupling_set(c, DOVE9_COUPLING_PERCEPTION_MEMORY);
	c = dove9_coupling_set(c, DOVE9_COUPLING_ASSESSMENT_PLANNING);
	c = dove9_coupling_set(c, DOVE9_COUPLING_BALANCED_INTEGRATION);
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(c, DOVE9_COUPLING_PERCEPTION_MEMORY));
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(c, DOVE9_COUPLING_ASSESSMENT_PLANNING));
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(c, DOVE9_COUPLING_BALANCED_INTEGRATION));
	dove9_test_end();
}

static void test_coupling_clear(void)
{
	dove9_test_begin("ctx: coupling clear");
	unsigned int c = 0;
	c = dove9_coupling_set(c, DOVE9_COUPLING_PERCEPTION_MEMORY);
	c = dove9_coupling_set(c, DOVE9_COUPLING_ASSESSMENT_PLANNING);
	c = dove9_coupling_clear(c, DOVE9_COUPLING_PERCEPTION_MEMORY);
	DOVE9_TEST_ASSERT(!dove9_coupling_is_active(c, DOVE9_COUPLING_PERCEPTION_MEMORY));
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(c, DOVE9_COUPLING_ASSESSMENT_PLANNING));
	dove9_test_end();
}

static void test_coupling_idempotent_set(void)
{
	dove9_test_begin("ctx: coupling set idempotent");
	unsigned int c = 0;
	c = dove9_coupling_set(c, DOVE9_COUPLING_BALANCED_INTEGRATION);
	unsigned int c2 = dove9_coupling_set(c, DOVE9_COUPLING_BALANCED_INTEGRATION);
	DOVE9_TEST_ASSERT_UINT_EQ(c, c2);
	dove9_test_end();
}

static void test_coupling_clear_inactive(void)
{
	dove9_test_begin("ctx: coupling clear already inactive");
	unsigned int c = 0;
	unsigned int c2 = dove9_coupling_clear(c, DOVE9_COUPLING_PERCEPTION_MEMORY);
	DOVE9_TEST_ASSERT_UINT_EQ(c, c2);
	dove9_test_end();
}

/* ---- cognitive context init ---- */

static void test_context_init_defaults(void)
{
	dove9_test_begin("ctx: init defaults");
	struct dove9_cognitive_context ctx = dove9_cognitive_context_init();
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.emotional_valence, 0.0, 0.001);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.emotional_arousal, 0.5, 0.001);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.salience_score, 0.5, 0.001);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.attention_weight, 1.0, 0.001);
	DOVE9_TEST_ASSERT_UINT_EQ(ctx.memory_count, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(ctx.active_couplings, 0);
	DOVE9_TEST_ASSERT_NULL(ctx.perception_data);
	DOVE9_TEST_ASSERT_NULL(ctx.thought_data);
	DOVE9_TEST_ASSERT_NULL(ctx.action_plan);
	dove9_test_end();
}

static void test_context_coupling_roundtrip(void)
{
	dove9_test_begin("ctx: coupling roundtrip via context");
	struct dove9_cognitive_context ctx = dove9_cognitive_context_init();
	ctx.active_couplings = dove9_coupling_set(ctx.active_couplings,
		DOVE9_COUPLING_ASSESSMENT_PLANNING);
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(ctx.active_couplings,
		DOVE9_COUPLING_ASSESSMENT_PLANNING));
	ctx.active_couplings = dove9_coupling_clear(ctx.active_couplings,
		DOVE9_COUPLING_ASSESSMENT_PLANNING);
	DOVE9_TEST_ASSERT(!dove9_coupling_is_active(ctx.active_couplings,
		DOVE9_COUPLING_ASSESSMENT_PLANNING));
	dove9_test_end();
}

/* ---- mail message struct ---- */

static void test_mail_message_zeroed(void)
{
	dove9_test_begin("ctx: mail message zeroed init");
	struct dove9_mail_message m;
	memset(&m, 0, sizeof(m));
	DOVE9_TEST_ASSERT_UINT_EQ(m.reference_count, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(m.to_count, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(m.header_count, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(m.flags, 0);
	DOVE9_TEST_ASSERT(m.size == 0);
	dove9_test_end();
}

static void test_mail_flag_combinations(void)
{
	dove9_test_begin("ctx: mail flag bitfield combinations");
	unsigned int f = 0;
	f |= DOVE9_MAIL_FLAG_SEEN;
	DOVE9_TEST_ASSERT(f & DOVE9_MAIL_FLAG_SEEN);
	DOVE9_TEST_ASSERT(!(f & DOVE9_MAIL_FLAG_ANSWERED));

	f |= DOVE9_MAIL_FLAG_ANSWERED | DOVE9_MAIL_FLAG_FLAGGED;
	DOVE9_TEST_ASSERT(f & DOVE9_MAIL_FLAG_ANSWERED);
	DOVE9_TEST_ASSERT(f & DOVE9_MAIL_FLAG_FLAGGED);
	DOVE9_TEST_ASSERT(!(f & DOVE9_MAIL_FLAG_DELETED));
	DOVE9_TEST_ASSERT(!(f & DOVE9_MAIL_FLAG_DRAFT));

	f &= ~DOVE9_MAIL_FLAG_SEEN;
	DOVE9_TEST_ASSERT(!(f & DOVE9_MAIL_FLAG_SEEN));
	dove9_test_end();
}

static void test_mail_all_flags(void)
{
	dove9_test_begin("ctx: all mail flags set");
	unsigned int f = DOVE9_MAIL_FLAG_SEEN | DOVE9_MAIL_FLAG_ANSWERED |
			 DOVE9_MAIL_FLAG_FLAGGED | DOVE9_MAIL_FLAG_DELETED |
			 DOVE9_MAIL_FLAG_DRAFT;
	DOVE9_TEST_ASSERT(f & DOVE9_MAIL_FLAG_SEEN);
	DOVE9_TEST_ASSERT(f & DOVE9_MAIL_FLAG_ANSWERED);
	DOVE9_TEST_ASSERT(f & DOVE9_MAIL_FLAG_FLAGGED);
	DOVE9_TEST_ASSERT(f & DOVE9_MAIL_FLAG_DELETED);
	DOVE9_TEST_ASSERT(f & DOVE9_MAIL_FLAG_DRAFT);
	dove9_test_end();
}

/* ---- config defaults ---- */

static void test_config_default_values(void)
{
	dove9_test_begin("ctx: config default values");
	struct dove9_config c = dove9_config_default();
	DOVE9_TEST_ASSERT_UINT_EQ(c.step_duration_ms, 100);
	DOVE9_TEST_ASSERT_UINT_EQ(c.max_concurrent_processes, 100);
	DOVE9_TEST_ASSERT_UINT_EQ(c.max_queue_depth, 1000);
	DOVE9_TEST_ASSERT(c.enable_milter);
	DOVE9_TEST_ASSERT(c.enable_lmtp);
	DOVE9_TEST_ASSERT(c.enable_deltachat);
	DOVE9_TEST_ASSERT(c.enable_parallel_cognition);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(c.default_salience_threshold, 0.3, 0.001);
	dove9_test_end();
}

static void test_mailbox_mapping_default(void)
{
	dove9_test_begin("ctx: mailbox mapping default");
	struct dove9_mailbox_mapping m = dove9_mailbox_mapping_default();
	DOVE9_TEST_ASSERT_STR_EQ(m.inbox, "INBOX");
	DOVE9_TEST_ASSERT_STR_EQ(m.processing, "INBOX.Processing");
	DOVE9_TEST_ASSERT_STR_EQ(m.sent, "Sent");
	DOVE9_TEST_ASSERT_STR_EQ(m.drafts, "Drafts");
	DOVE9_TEST_ASSERT_STR_EQ(m.trash, "Trash");
	DOVE9_TEST_ASSERT_STR_EQ(m.archive, "Archive");
	dove9_test_end();
}

/* ---- execution record ---- */

static void test_execution_record_zeroed(void)
{
	dove9_test_begin("ctx: execution record zeroed init");
	struct dove9_execution_record rec;
	memset(&rec, 0, sizeof(rec));
	DOVE9_TEST_ASSERT_INT_EQ(rec.step, 0);
	DOVE9_TEST_ASSERT_INT_EQ(rec.result, 0);
	DOVE9_TEST_ASSERT(rec.duration_ms == 0);
	dove9_test_end();
}

/* ---- process state enum ---- */

static void test_process_state_values(void)
{
	dove9_test_begin("ctx: process state enum ordering");
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_PENDING < DOVE9_PROCESS_ACTIVE);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_ACTIVE < DOVE9_PROCESS_PROCESSING);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_PROCESSING < DOVE9_PROCESS_WAITING);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_WAITING < DOVE9_PROCESS_COMPLETED);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_COMPLETED < DOVE9_PROCESS_SUSPENDED);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_SUSPENDED < DOVE9_PROCESS_TERMINATED);
	dove9_test_end();
}

/* ---- message_process struct ---- */

static void test_message_process_zeroed(void)
{
	dove9_test_begin("ctx: message_process zeroed init");
	struct dove9_message_process p;
	memset(&p, 0, sizeof(p));
	DOVE9_TEST_ASSERT(p.state == DOVE9_PROCESS_PENDING);
	DOVE9_TEST_ASSERT_INT_EQ(p.priority, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(p.to_count, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(p.child_count, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(p.exec_count, 0);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_coupling_set_single,
		test_coupling_set_all,
		test_coupling_clear,
		test_coupling_idempotent_set,
		test_coupling_clear_inactive,
		test_context_init_defaults,
		test_context_coupling_roundtrip,
		test_mail_message_zeroed,
		test_mail_flag_combinations,
		test_mail_all_flags,
		test_config_default_values,
		test_mailbox_mapping_default,
		test_execution_record_zeroed,
		test_process_state_values,
		test_message_process_zeroed,
	};
	return dove9_test_run("dove9-cognitive-context",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
