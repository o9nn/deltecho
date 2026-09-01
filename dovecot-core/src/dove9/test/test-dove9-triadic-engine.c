/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-triadic-engine: step assignments, T-point
   convergence, coupling detection, engine lifecycle and events. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../cognitive/dove9-triadic-engine.h"

#include <string.h>

/* ---- Event tracking ---- */

static unsigned int triad_converged_count;
static unsigned int cycle_completed_count;
static unsigned int step_completed_count;
static unsigned int coupling_detected_count;

static void reset_event_counts(void)
{
	triad_converged_count = 0;
	cycle_completed_count = 0;
	step_completed_count = 0;
	coupling_detected_count = 0;
}

static void test_event_handler(const struct dove9_triadic_event *event,
			       void *context)
{
	(void)context;
	switch (event->type) {
	case DOVE9_TRIADIC_TRIAD_SYNC:
		triad_converged_count++;
		break;
	case DOVE9_TRIADIC_CYCLE_COMPLETE:
		cycle_completed_count++;
		break;
	case DOVE9_TRIADIC_STEP_COMPLETE:
		step_completed_count++;
		break;
	case DOVE9_TRIADIC_COUPLING_ACTIVE:
		coupling_detected_count++;
		break;
	default:
		break;
	}
}

/* ---- Step Assignment Table verification ---- */

static void test_step_configs_table(void)
{
	dove9_test_begin("step_configs matches Step Assignment Table");

	/* Step 1: PRIMARY, T1_PERCEPTION, REFLECTIVE, PIVOTAL_RR, 0° */
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[0].step_number, 1);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[0].stream_id, DOVE9_STREAM_PRIMARY);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[0].term, DOVE9_TERM_T1_PERCEPTION);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[0].mode, DOVE9_MODE_REFLECTIVE);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[0].step_type, DOVE9_STEP_PIVOTAL_RR);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[0].phase_degrees, 0);

	/* Step 5: index 1, SECONDARY, T1_PERCEPTION, REFLECTIVE, PIVOTAL_RR, 120° */
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[1].step_number, 5);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[1].stream_id, DOVE9_STREAM_SECONDARY);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[1].term, DOVE9_TERM_T1_PERCEPTION);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[1].step_type, DOVE9_STEP_PIVOTAL_RR);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[1].phase_degrees, 120);

	/* Step 9: index 2, TERTIARY, T7_MEMORY_ENCODING, REFLECTIVE, 240° */
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[2].step_number, 9);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[2].stream_id, DOVE9_STREAM_TERTIARY);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[2].term, DOVE9_TERM_T7_MEMORY_ENCODING);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[2].mode, DOVE9_MODE_REFLECTIVE);

	/* Step 12: TERTIARY, T5_ACTION_SEQUENCE, EXPRESSIVE, 330° */
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[11].step_number, 12);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[11].stream_id, DOVE9_STREAM_TERTIARY);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[11].term, DOVE9_TERM_T5_ACTION_SEQUENCE);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[11].mode, DOVE9_MODE_EXPRESSIVE);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[11].phase_degrees, 330);

	dove9_test_end();
}

/* ---- Stream configurations ---- */

static void test_stream_configs(void)
{
	dove9_test_begin("stream_configs have correct phase offsets");
	DOVE9_TEST_ASSERT_INT_EQ(dove9_stream_configs[0].id, DOVE9_STREAM_PRIMARY);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_stream_configs[0].phase_offset, 0);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_stream_configs[1].id, DOVE9_STREAM_SECONDARY);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_stream_configs[1].phase_offset, 120);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_stream_configs[2].id, DOVE9_STREAM_TERTIARY);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_stream_configs[2].phase_offset, 240);
	dove9_test_end();
}

/* ---- Triad points ---- */

static void test_triad_points(void)
{
	dove9_test_begin("triad_points have correct step triples");

	/* T-point 0: steps {1, 5, 9} */
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[0].time_point, 0);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[0].steps[0], 1);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[0].steps[1], 5);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[0].steps[2], 9);

	/* T-point 1: steps {2, 6, 10} */
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[1].steps[0], 2);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[1].steps[1], 6);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[1].steps[2], 10);

	/* T-point 2: steps {3, 7, 11} */
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[2].steps[0], 3);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[2].steps[1], 7);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[2].steps[2], 11);

	/* T-point 3: steps {4, 8, 12} */
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[3].steps[0], 4);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[3].steps[1], 8);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_triad_points[3].steps[2], 12);

	dove9_test_end();
}

/* ---- triad_at_step utility ---- */

static void test_triad_at_step(void)
{
	const struct dove9_triad_point *tp;

	dove9_test_begin("triad_at_step returns correct T-point");

	tp = dove9_triad_at_step(1);
	DOVE9_TEST_ASSERT_NOT_NULL(tp);
	DOVE9_TEST_ASSERT_INT_EQ(tp->time_point, 0);

	tp = dove9_triad_at_step(4);
	DOVE9_TEST_ASSERT_NOT_NULL(tp);
	DOVE9_TEST_ASSERT_INT_EQ(tp->time_point, 3);

	tp = dove9_triad_at_step(7);
	DOVE9_TEST_ASSERT_NOT_NULL(tp);
	DOVE9_TEST_ASSERT_INT_EQ(tp->time_point, 2);

	dove9_test_end();
}

/* ---- Coupling detection ---- */

static void test_coupling_detection(void)
{
	struct dove9_coupling_detection detections[3];
	int count, step, j;
	bool found_pm = false;

	dove9_test_begin("detect_couplings finds PERCEPTION_MEMORY");

	/* Scan all 12 steps for a PERCEPTION_MEMORY coupling activation */
	for (step = 1; step <= DOVE9_STEP_COUNT && !found_pm; step++) {
		count = dove9_detect_couplings(step, detections, 3);
		for (j = 0; j < count; j++) {
			if (detections[j].type ==
			    DOVE9_COUPLING_PERCEPTION_MEMORY) {
				found_pm = true;
				break;
			}
		}
	}
	DOVE9_TEST_ASSERT(found_pm);

	dove9_test_end();
}

/* ---- Engine lifecycle ---- */

static void test_engine_lifecycle(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_triadic_engine *engine;
	int cycle_before, cycle_after;
	int i;

	dove9_test_begin("engine advances 12 steps = 1 cycle");

	dove9_mock_reset();

	dte = dove9_dte_processor_create(&dove9_mock_llm,
					 &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	engine = dove9_triadic_engine_create(&proc, 0);

	reset_event_counts();
	dove9_triadic_engine_on(engine, test_event_handler, NULL);

	dove9_triadic_engine_start(engine);
	DOVE9_TEST_ASSERT(dove9_triadic_engine_is_running(engine));

	cycle_before = dove9_triadic_engine_get_cycle_number(engine);

	/* Advance 12 steps = 1 full cycle */
	for (i = 0; i < 12; i++)
		dove9_triadic_engine_advance_step(engine);

	cycle_after = dove9_triadic_engine_get_cycle_number(engine);
	DOVE9_TEST_ASSERT_INT_EQ(cycle_after, cycle_before + 1);

	dove9_triadic_engine_stop(engine);
	DOVE9_TEST_ASSERT(!dove9_triadic_engine_is_running(engine));

	dove9_triadic_engine_destroy(&engine);
	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

/* ---- Triad convergence events ---- */

static void test_triad_convergence_events(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_triadic_engine *engine;
	int i;

	dove9_test_begin("4 TRIAD_CONVERGED events per cycle");

	dove9_mock_reset();
	dte = dove9_dte_processor_create(&dove9_mock_llm,
					 &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	engine = dove9_triadic_engine_create(&proc, 0);

	reset_event_counts();
	dove9_triadic_engine_on(engine, test_event_handler, NULL);
	dove9_triadic_engine_start(engine);

	for (i = 0; i < 12; i++)
		dove9_triadic_engine_advance_step(engine);

	/* Every step belongs to a triad, so triad_sync fires each step */
	DOVE9_TEST_ASSERT_UINT_EQ(triad_converged_count, 12);
	DOVE9_TEST_ASSERT_UINT_EQ(cycle_completed_count, 1);

	dove9_triadic_engine_stop(engine);
	dove9_triadic_engine_destroy(&engine);
	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

/* ---- Process message through engine ---- */

static void test_engine_process_message(void)
{
	struct dove9_dte_processor_config cfg = {
		.enable_parallel_cognition = false,
		.memory_retrieval_count = 3,
		.salience_threshold = 0.1,
	};
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor proc;
	struct dove9_triadic_engine *engine;
	struct dove9_message_process msg;
	int ret;

	dove9_test_begin("engine_process_message runs full cycle");

	dove9_mock_reset();
	memset(&msg, 0, sizeof(msg));
	snprintf(msg.content, sizeof(msg.content), "Hello world");
	msg.cognitive_context.salience_score = 0.5;

	dte = dove9_dte_processor_create(&dove9_mock_llm,
					 &dove9_mock_memory,
					 &dove9_mock_persona, &cfg);
	proc = dove9_dte_processor_as_cognitive(dte);
	engine = dove9_triadic_engine_create(&proc, 0);
	dove9_triadic_engine_start(engine);

	ret = dove9_triadic_engine_process_message(engine, &msg);

	/* After processing, return 0 = success */
	DOVE9_TEST_ASSERT_INT_EQ(ret, 0);

	dove9_triadic_engine_stop(engine);
	dove9_triadic_engine_destroy(&engine);
	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

/* ---- Mode distribution: 7 expressive, 5 reflective ---- */

static void test_mode_distribution(void)
{
	unsigned int expressive = 0, reflective = 0;
	int i;

	dove9_test_begin("12 steps have 7 expressive, 5 reflective");

	for (i = 0; i < 12; i++) {
		if (dove9_step_configs[i].mode == DOVE9_MODE_EXPRESSIVE)
			expressive++;
		else if (dove9_step_configs[i].mode == DOVE9_MODE_REFLECTIVE)
			reflective++;
	}

	DOVE9_TEST_ASSERT_UINT_EQ(expressive, 7);
	DOVE9_TEST_ASSERT_UINT_EQ(reflective, 5);

	dove9_test_end();
}

/* ---- Each stream has 4 steps ---- */

static void test_stream_step_counts(void)
{
	unsigned int primary = 0, secondary = 0, tertiary = 0;
	int i;

	dove9_test_begin("each stream has exactly 4 steps");

	for (i = 0; i < 12; i++) {
		switch (dove9_step_configs[i].stream_id) {
		case DOVE9_STREAM_PRIMARY: primary++; break;
		case DOVE9_STREAM_SECONDARY: secondary++; break;
		case DOVE9_STREAM_TERTIARY: tertiary++; break;
		}
	}

	DOVE9_TEST_ASSERT_UINT_EQ(primary, 4);
	DOVE9_TEST_ASSERT_UINT_EQ(secondary, 4);
	DOVE9_TEST_ASSERT_UINT_EQ(tertiary, 4);

	dove9_test_end();
}

/* ---- Step numbers are 1..12 ---- */

static void test_step_numbers_sequential(void)
{
	/* Table is triad-grouped, not sequential */
	const int expected[] = {1, 5, 9, 2, 6, 10, 3, 7, 11, 4, 8, 12};
	int i;

	dove9_test_begin("step numbers are 1 through 12");

	for (i = 0; i < 12; i++)
		DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[i].step_number,
					 expected[i]);

	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_step_configs_table,
		test_stream_configs,
		test_triad_points,
		test_triad_at_step,
		test_coupling_detection,
		test_engine_lifecycle,
		test_triad_convergence_events,
		test_engine_process_message,
		test_mode_distribution,
		test_stream_step_counts,
		test_step_numbers_sequential,
	};
	return dove9_test_run("dove9-triadic-engine", tests, 11);
}
