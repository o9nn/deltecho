/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-dte-processor: creation, cognitive vtable dispatch,
   T-function routing, mock call counters, destroy semantics. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../cognitive/dove9-dte-processor.h"

static void test_dte_processor_create(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 5,
		.salience_threshold = 0.2,
	};
	struct dove9_dte_processor *dte;

	dove9_test_begin("create returns non-NULL");

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(dte);
	dove9_dte_processor_destroy(&dte);
	DOVE9_TEST_ASSERT_NULL(dte);

	dove9_test_end();
}

static void test_as_cognitive_vtable(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;

	dove9_test_begin("as_cognitive returns 6 non-NULL function pointers");

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);

	DOVE9_TEST_ASSERT_NOT_NULL(proc.process_t1_perception);
	DOVE9_TEST_ASSERT_NOT_NULL(proc.process_t2_idea_formation);
	DOVE9_TEST_ASSERT_NOT_NULL(proc.process_t4_sensory_input);
	DOVE9_TEST_ASSERT_NOT_NULL(proc.process_t5_action_sequence);
	DOVE9_TEST_ASSERT_NOT_NULL(proc.process_t7_memory_encoding);
	DOVE9_TEST_ASSERT_NOT_NULL(proc.process_t8_balanced_response);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

static void test_t1_perception_dispatch(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_cognitive_context ctx;

	dove9_test_begin("T1 reflective calls persona get_dominant_emotion");

	dove9_mock_reset();
	ctx = dove9_cognitive_context_init();
	ctx.salience_score = 0.5;

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	proc.process_t1_perception(proc.user_data, &ctx, DOVE9_MODE_REFLECTIVE);

	DOVE9_TEST_ASSERT(dove9_mock_persona_emotion_calls > 0);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

static void test_t2_idea_formation_dispatch(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_cognitive_context ctx;

	dove9_test_begin("T2 dispatch calls LLM generate_response");

	dove9_mock_reset();
	ctx = dove9_cognitive_context_init();
	ctx.salience_score = 0.5;

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	proc.process_t2_idea_formation(proc.user_data, &ctx, DOVE9_MODE_EXPRESSIVE);

	DOVE9_TEST_ASSERT(dove9_mock_llm_generate_calls > 0);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

static void test_t7_memory_encoding_stores(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_cognitive_context ctx;

	dove9_test_begin("T7 reflective calls memory retrieve_relevant");

	dove9_mock_reset();
	ctx = dove9_cognitive_context_init();
	ctx.salience_score = 0.5;

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	proc.process_t7_memory_encoding(proc.user_data, &ctx, DOVE9_MODE_REFLECTIVE);

	DOVE9_TEST_ASSERT(dove9_mock_memory_retrieve_relevant_calls > 0);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

static void test_low_salience_skips(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.5,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_cognitive_context ctx;

	dove9_test_begin("low salience context still processed (no threshold check in T-points)");

	dove9_mock_reset();
	ctx = dove9_cognitive_context_init();
	ctx.salience_score = 0.01;

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	proc.process_t2_idea_formation(proc.user_data, &ctx, DOVE9_MODE_EXPRESSIVE);

	/* T-point functions do not enforce salience threshold */
	DOVE9_TEST_ASSERT(dove9_mock_llm_generate_calls > 0);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

static void test_t5_action_sequence(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_cognitive_context ctx;

	dove9_test_begin("T5 action sequence dispatches");

	dove9_mock_reset();
	ctx = dove9_cognitive_context_init();
	ctx.salience_score = 0.5;

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	proc.process_t5_action_sequence(proc.user_data, &ctx, DOVE9_MODE_EXPRESSIVE);

	/* T5 expressive with NULL action_plan is a no-op — verify no crash */
	DOVE9_TEST_ASSERT(dove9_mock_llm_generate_calls == 0);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

static void test_t8_balanced_response(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_cognitive_context ctx;

	dove9_test_begin("T8 balanced response updates emotional state");

	dove9_mock_reset();
	ctx = dove9_cognitive_context_init();
	ctx.salience_score = 0.5;

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	proc.process_t8_balanced_response(proc.user_data, &ctx, DOVE9_MODE_EXPRESSIVE);

	/* T8 expressive calls persona.update_emotional_state */
	DOVE9_TEST_ASSERT(dove9_mock_persona_update_calls > 0);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

static void test_t4_sensory_input(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_cognitive_context ctx;

	dove9_test_begin("T4 sensory input sets perception and coupling");

	dove9_mock_reset();
	ctx = dove9_cognitive_context_init();
	ctx.salience_score = 0.5;

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	proc.process_t4_sensory_input(proc.user_data, &ctx, DOVE9_MODE_EXPRESSIVE);

	/* T4 expressive activates PERCEPTION_MEMORY coupling */
	DOVE9_TEST_ASSERT(dove9_coupling_is_active(ctx.active_couplings,
				DOVE9_COUPLING_PERCEPTION_MEMORY));

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

/* ---- Test: parallel cognition config flag ---- */

static void test_parallel_cognition_flag(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = true,
		.memory_retrieval_count = 5,
		.salience_threshold = 0.2,
	};
	struct dove9_dte_processor *dte;

	dove9_test_begin("parallel cognition flag stored");

	dove9_mock_reset();
	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(dte);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

/* ---- Test: zero salience threshold ---- */

static void test_zero_salience_threshold(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 1,
		.salience_threshold = 0.0,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_cognitive_context ctx;

	dove9_test_begin("zero salience threshold processes everything");

	dove9_mock_reset();
	ctx = dove9_cognitive_context_init();
	ctx.salience_score = 0.001;

	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	proc.process_t1_perception(proc.user_data, &ctx, DOVE9_MODE_REFLECTIVE);
	/* T1 reflective calls persona.get_dominant_emotion */
	DOVE9_TEST_ASSERT(dove9_mock_persona_emotion_calls > 0);

	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

/* ---- Test: destroy sets NULL ---- */

static void test_destroy_sets_null(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;

	dove9_test_begin("destroy sets pointer to NULL");

	dove9_mock_reset();
	dte = dove9_dte_processor_create(&dove9_mock_llm, &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	dove9_dte_processor_destroy(&dte);
	DOVE9_TEST_ASSERT_NULL(dte);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_dte_processor_create,
		test_as_cognitive_vtable,
		test_t1_perception_dispatch,
		test_t2_idea_formation_dispatch,
		test_t7_memory_encoding_stores,
		test_low_salience_skips,
		test_t5_action_sequence,
		test_t8_balanced_response,
		test_t4_sensory_input,
		test_parallel_cognition_flag,
		test_zero_salience_threshold,
		test_destroy_sets_null,
	};
	return dove9_test_run("dove9-dte-processor", tests, 12);
}
