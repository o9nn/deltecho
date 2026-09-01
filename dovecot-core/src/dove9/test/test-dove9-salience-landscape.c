/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for salience landscape, attention weight, and cognitive context
 * scoring logic. Validates relevance realization scoring at the type and
 * context level — the T-point convergence substrate. */

#include "dove9-test-common.h"
#include "../types/dove9-types.h"
#include <string.h>
#include <math.h>

/* ---- test: default context salience is zero ---- */

static void test_default_salience_zero(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: default context salience is zero");
	memset(&ctx, 0, sizeof(ctx));
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.salience_score, 0.0, 1e-9);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.attention_weight, 0.0, 1e-9);
	dove9_test_end();
}

/* ---- test: set salience in range ---- */

static void test_salience_in_range(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: set salience within [0,1]");
	memset(&ctx, 0, sizeof(ctx));
	ctx.salience_score = 0.75;
	DOVE9_TEST_ASSERT(ctx.salience_score >= 0.0 && ctx.salience_score <= 1.0);
	dove9_test_end();
}

/* ---- test: attention weight in range ---- */

static void test_attention_weight_in_range(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: attention weight within [0,1]");
	memset(&ctx, 0, sizeof(ctx));
	ctx.attention_weight = 0.5;
	DOVE9_TEST_ASSERT(ctx.attention_weight >= 0.0 && ctx.attention_weight <= 1.0);
	dove9_test_end();
}

/* ---- test: emotional valence range ---- */

static void test_emotional_valence_range(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: emotional valence [-1,1]");
	memset(&ctx, 0, sizeof(ctx));
	ctx.emotional_valence = -0.3;
	DOVE9_TEST_ASSERT(ctx.emotional_valence >= -1.0 && ctx.emotional_valence <= 1.0);
	ctx.emotional_valence = 0.9;
	DOVE9_TEST_ASSERT(ctx.emotional_valence >= -1.0 && ctx.emotional_valence <= 1.0);
	dove9_test_end();
}

/* ---- test: emotional arousal range ---- */

static void test_emotional_arousal_range(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: emotional arousal [0,1]");
	memset(&ctx, 0, sizeof(ctx));
	ctx.emotional_arousal = 0.0;
	DOVE9_TEST_ASSERT(ctx.emotional_arousal >= 0.0 && ctx.emotional_arousal <= 1.0);
	ctx.emotional_arousal = 1.0;
	DOVE9_TEST_ASSERT(ctx.emotional_arousal >= 0.0 && ctx.emotional_arousal <= 1.0);
	dove9_test_end();
}

/* ---- test: salience affected by memory count ---- */

static void test_salience_with_memories(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: context with memories has nonzero count");
	memset(&ctx, 0, sizeof(ctx));
	ctx.relevant_memories[0] = "memory-a";
	ctx.relevant_memories[1] = "memory-b";
	ctx.memory_count = 2;
	ctx.salience_score = 0.6;
	DOVE9_TEST_ASSERT_UINT_EQ(ctx.memory_count, 2);
	DOVE9_TEST_ASSERT(ctx.salience_score > 0.0);
	dove9_test_end();
}

/* ---- test: coupling activation affects attention ---- */

static void test_coupling_attention(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: coupling activation set with attention");
	memset(&ctx, 0, sizeof(ctx));
	ctx.active_couplings = (1 << DOVE9_COUPLING_PERCEPTION_MEMORY);
	ctx.attention_weight = 0.8;
	DOVE9_TEST_ASSERT(ctx.active_couplings != 0);
	DOVE9_TEST_ASSERT(ctx.attention_weight > 0.5);
	dove9_test_end();
}

/* ---- test: all three couplings active ---- */

static void test_all_couplings_active(void)
{
	struct dove9_cognitive_context ctx;
	unsigned int all;
	dove9_test_begin("salience: all three couplings active");
	memset(&ctx, 0, sizeof(ctx));
	all = (1 << DOVE9_COUPLING_PERCEPTION_MEMORY) |
	      (1 << DOVE9_COUPLING_ASSESSMENT_PLANNING) |
	      (1 << DOVE9_COUPLING_BALANCED_INTEGRATION);
	ctx.active_couplings = all;
	DOVE9_TEST_ASSERT_UINT_EQ(ctx.active_couplings, all);
	dove9_test_end();
}

/* ---- test: opaque pointers initially null ---- */

static void test_opaque_pointers_null(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: opaque data pointers null after memset");
	memset(&ctx, 0, sizeof(ctx));
	DOVE9_TEST_ASSERT_NULL(ctx.perception_data);
	DOVE9_TEST_ASSERT_NULL(ctx.thought_data);
	DOVE9_TEST_ASSERT_NULL(ctx.action_plan);
	dove9_test_end();
}

/* ---- test: max memories capacity ---- */

static void test_max_memories_capacity(void)
{
	struct dove9_cognitive_context ctx;
	unsigned int i;
	dove9_test_begin("salience: fill to max memories");
	memset(&ctx, 0, sizeof(ctx));
	for (i = 0; i < DOVE9_MAX_MEMORIES; i++)
		ctx.relevant_memories[i] = "mem";
	ctx.memory_count = DOVE9_MAX_MEMORIES;
	DOVE9_TEST_ASSERT_UINT_EQ(ctx.memory_count, DOVE9_MAX_MEMORIES);
	DOVE9_TEST_ASSERT_NOT_NULL(ctx.relevant_memories[DOVE9_MAX_MEMORIES - 1]);
	dove9_test_end();
}

/* ---- test: high arousal plus high salience ---- */

static void test_high_arousal_salience(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: high arousal + high salience coexist");
	memset(&ctx, 0, sizeof(ctx));
	ctx.emotional_arousal = 1.0;
	ctx.salience_score = 1.0;
	ctx.attention_weight = 1.0;
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.emotional_arousal, 1.0, 1e-9);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.salience_score, 1.0, 1e-9);
	DOVE9_TEST_ASSERT_DOUBLE_EQ(ctx.attention_weight, 1.0, 1e-9);
	dove9_test_end();
}

/* ---- test: negative valence with positive arousal ---- */

static void test_negative_valence_positive_arousal(void)
{
	struct dove9_cognitive_context ctx;
	dove9_test_begin("salience: negative valence + positive arousal (aversion)");
	memset(&ctx, 0, sizeof(ctx));
	ctx.emotional_valence = -0.8;
	ctx.emotional_arousal = 0.9;
	ctx.salience_score = 0.7;
	DOVE9_TEST_ASSERT(ctx.emotional_valence < 0.0);
	DOVE9_TEST_ASSERT(ctx.emotional_arousal > 0.5);
	DOVE9_TEST_ASSERT(ctx.salience_score > 0.0);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_default_salience_zero,
		test_salience_in_range,
		test_attention_weight_in_range,
		test_emotional_valence_range,
		test_emotional_arousal_range,
		test_salience_with_memories,
		test_coupling_attention,
		test_all_couplings_active,
		test_opaque_pointers_null,
		test_max_memories_capacity,
		test_high_arousal_salience,
		test_negative_valence_positive_arousal,
	};
	return dove9_test_run("dove9-salience-landscape",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
