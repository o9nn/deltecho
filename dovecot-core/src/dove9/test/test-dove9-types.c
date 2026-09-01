/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-types.h: config defaults, context init,
   mailbox mapping, coupling bitfield helpers, enum ranges. */

#include "dove9-test-common.h"
#include "../types/dove9-types.h"

#include <string.h>

/* ---- Test: config defaults ---- */

static void test_config_default(void)
{
	struct dove9_config cfg = dove9_config_default();

	dove9_test_begin("config_default returns sane values");
	DOVE9_TEST_ASSERT(cfg.enable_parallel_cognition == true);
	DOVE9_TEST_ASSERT(cfg.max_concurrent_processes == 100);
	DOVE9_TEST_ASSERT(cfg.max_queue_depth == 1000);
	dove9_test_end();
}

/* ---- Test: cognitive context init ---- */

static void test_cognitive_context_init(void)
{
	struct dove9_cognitive_context ctx = dove9_cognitive_context_init();

	dove9_test_begin("cognitive_context_init sets default fields");
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.salience_score, 0.5, 0.001);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.emotional_valence, 0.0, 0.001);
	DOVE9_TEST_ASSERT(ctx.memory_count == 0);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.emotional_arousal, 0.5, 0.001);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.attention_weight, 1.0, 0.001);
	DOVE9_TEST_ASSERT(ctx.perception_data == NULL);
	dove9_test_end();
}

/* ---- Test: mailbox mapping defaults ---- */

static void test_mailbox_mapping_default(void)
{
	struct dove9_mailbox_mapping m = dove9_mailbox_mapping_default();

	dove9_test_begin("mailbox_mapping_default has standard folders");
	DOVE9_TEST_ASSERT_STR_EQ(m.inbox, "INBOX");
	DOVE9_TEST_ASSERT_STR_EQ(m.drafts, "Drafts");
	DOVE9_TEST_ASSERT_STR_EQ(m.sent, "Sent");
	DOVE9_TEST_ASSERT_STR_EQ(m.trash, "Trash");
	DOVE9_TEST_ASSERT_STR_EQ(m.archive, "Archive");
	DOVE9_TEST_ASSERT_STR_EQ(m.processing, "INBOX.Processing");
	dove9_test_end();
}

/* ---- Test: coupling bitfield ---- */

static void test_coupling_bitfield(void)
{
	unsigned int mask = 0;

	dove9_test_begin("coupling bitfield set/is_active/clear");

	/* Initially empty */
	DOVE9_TEST_ASSERT(!dove9_coupling_is_active(mask, DOVE9_COUPLING_PERCEPTION_MEMORY));
	DOVE9_TEST_ASSERT(!dove9_coupling_is_active(mask, DOVE9_COUPLING_ASSESSMENT_PLANNING));
	DOVE9_TEST_ASSERT(!dove9_coupling_is_active(mask, DOVE9_COUPLING_BALANCED_INTEGRATION));

	/* Set one */
	mask = dove9_coupling_set(mask, DOVE9_COUPLING_PERCEPTION_MEMORY);
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(mask, DOVE9_COUPLING_PERCEPTION_MEMORY));
	DOVE9_TEST_ASSERT(!dove9_coupling_is_active(mask, DOVE9_COUPLING_ASSESSMENT_PLANNING));

	/* Set another */
	mask = dove9_coupling_set(mask, DOVE9_COUPLING_BALANCED_INTEGRATION);
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(mask, DOVE9_COUPLING_BALANCED_INTEGRATION));

	/* Clear first */
	mask = dove9_coupling_clear(mask, DOVE9_COUPLING_PERCEPTION_MEMORY);
	DOVE9_TEST_ASSERT(!dove9_coupling_is_active(mask, DOVE9_COUPLING_PERCEPTION_MEMORY));
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(mask, DOVE9_COUPLING_BALANCED_INTEGRATION));

	dove9_test_end();
}

/* ---- Test: enum value ranges ---- */

static void test_enum_ranges(void)
{
	dove9_test_begin("enum value ranges are correct");

	/* 6 cognitive terms (T1,T2,T4,T5,T7,T8) */
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_TERM_T1_PERCEPTION, 1);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_TERM_T8_BALANCED_RESPONSE, 8);

	/* 7 process states */
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_PROCESS_PENDING, 0);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_PROCESS_TERMINATED, 6);

	/* 3 coupling types */
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_COUPLING_PERCEPTION_MEMORY, 0);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_COUPLING_BALANCED_INTEGRATION, 2);

	/* 2 cognitive modes */
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_MODE_EXPRESSIVE, 0);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_MODE_REFLECTIVE, 1);

	dove9_test_end();
}

/* ---- Test: config limits are valid ---- */

static void test_config_limits_valid(void)
{
	dove9_test_begin("DOVE9_MAX constants are positive and bounded");

	DOVE9_TEST_ASSERT(DOVE9_MAX_PROCESSES > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_PROCESSES <= 65536);
	DOVE9_TEST_ASSERT(DOVE9_MAX_QUEUE_DEPTH > 0);
	DOVE9_TEST_ASSERT(DOVE9_MAX_QUEUE_DEPTH <= 65536);

	dove9_test_end();
}

/* ---- Test: step type enum ---- */

static void test_step_type_enum(void)
{
	dove9_test_begin("step type enum has 4 values");

	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_STEP_PIVOTAL_RR, 0);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_STEP_EXPRESSIVE, 1);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_STEP_TRANSITION, 2);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_STEP_REFLECTIVE, 3);

	dove9_test_end();
}

/* ---- Test: stream enum ---- */

static void test_stream_enum(void)
{
	dove9_test_begin("stream enum has 3 values");

	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_STREAM_PRIMARY, 0);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_STREAM_SECONDARY, 1);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_STREAM_TERTIARY, 2);

	dove9_test_end();
}

/* ---- Test: coupling all-set ---- */

static void test_coupling_all_set(void)
{
	unsigned int mask = 0;

	dove9_test_begin("coupling bitfield supports all 3 simultaneous");

	mask = dove9_coupling_set(mask, DOVE9_COUPLING_PERCEPTION_MEMORY);
	mask = dove9_coupling_set(mask, DOVE9_COUPLING_ASSESSMENT_PLANNING);
	mask = dove9_coupling_set(mask, DOVE9_COUPLING_BALANCED_INTEGRATION);

	DOVE9_TEST_ASSERT(dove9_coupling_is_active(mask, DOVE9_COUPLING_PERCEPTION_MEMORY));
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(mask, DOVE9_COUPLING_ASSESSMENT_PLANNING));
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(mask, DOVE9_COUPLING_BALANCED_INTEGRATION));

	dove9_test_end();
}

/* ---- Test: mail message zeroed correctly ---- */

static void test_mail_message_zeroed(void)
{
	struct dove9_mail_message msg;
	dove9_test_begin("mail_message zeroed after memset");
	memset(&msg, 0, sizeof(msg));
	DOVE9_TEST_ASSERT(msg.message_id[0] == '\0');
	DOVE9_TEST_ASSERT(msg.from[0] == '\0');
	DOVE9_TEST_ASSERT(msg.to_count == 0);
	DOVE9_TEST_ASSERT(msg.reference_count == 0);
	dove9_test_end();
}

/* ---- Test: mail flag combinations ---- */

static void test_mail_flag_combinations(void)
{
	unsigned int flags = 0;
	dove9_test_begin("mail flags can be combined via bitwise OR");
	flags = DOVE9_MAIL_FLAG_SEEN | DOVE9_MAIL_FLAG_FLAGGED;
	DOVE9_TEST_ASSERT(flags & DOVE9_MAIL_FLAG_SEEN);
	DOVE9_TEST_ASSERT(flags & DOVE9_MAIL_FLAG_FLAGGED);
	DOVE9_TEST_ASSERT(!(flags & DOVE9_MAIL_FLAG_DELETED));
	dove9_test_end();
}

/* ---- Test: process state values are distinct ---- */

static void test_process_state_distinct(void)
{
	dove9_test_begin("all 7 process states are distinct values");
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_PENDING != DOVE9_PROCESS_ACTIVE);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_ACTIVE != DOVE9_PROCESS_PROCESSING);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_PROCESSING != DOVE9_PROCESS_WAITING);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_WAITING != DOVE9_PROCESS_COMPLETED);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_COMPLETED != DOVE9_PROCESS_SUSPENDED);
	DOVE9_TEST_ASSERT(DOVE9_PROCESS_SUSPENDED != DOVE9_PROCESS_TERMINATED);
	dove9_test_end();
}

/* ---- Test: cognitive term values skip T3 and T6 ---- */

static void test_term_values_skip_t3_t6(void)
{
	dove9_test_begin("cognitive terms skip T3 and T6 (reserved)");
	/* The enum defines T1=1, T2=2, T4=4, T5=5, T7=7, T8=8 */
	/* T3 (=3) and T6 (=6) are intentionally absent */
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_TERM_T1_PERCEPTION, 1);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_TERM_T2_IDEA_FORMATION, 2);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_TERM_T4_SENSORY_INPUT, 4);
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_TERM_T5_ACTION_SEQUENCE, 5);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	dove9_test_fn tests[] = {
		test_config_default,
		test_cognitive_context_init,
		test_mailbox_mapping_default,
		test_coupling_bitfield,
		test_enum_ranges,
		test_config_limits_valid,
		test_step_type_enum,
		test_stream_enum,
		test_coupling_all_set,
		test_mail_message_zeroed,
		test_mail_flag_combinations,
		test_process_state_distinct,
		test_term_values_skip_t3_t6,
	};
	return dove9_test_run("dove9-types", tests, 13);
}
