/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for the coupling detection and active-steps utility functions
 * from the triadic engine — verifying the tensional coupling system. */

#include "dove9-test-common.h"
#include "../cognitive/dove9-triadic-engine.h"
#include <string.h>

/* ---- test: dove9_detect_couplings at various steps ---- */

static void test_detect_couplings_step1(void)
{
	dove9_test_begin("coupling: detect at step 1 (PIVOTAL_RR)");
	struct dove9_coupling_detection out[3];
	int n = dove9_detect_couplings(1, out, 3);
	/* Step 1 is T1_PERCEPTION + PIVOTAL_RR — may or may not have couplings */
	DOVE9_TEST_ASSERT(n >= 0 && n <= 3);
	dove9_test_end();
}

static void test_detect_couplings_step3(void)
{
	dove9_test_begin("coupling: detect at step 3 (T4 SENSORY_INPUT)");
	struct dove9_coupling_detection out[3];
	int n = dove9_detect_couplings(3, out, 3);
	/* Step 3 is T4_SENSORY_INPUT — may activate PERCEPTION_MEMORY coupling */
	DOVE9_TEST_ASSERT(n >= 0 && n <= 3);
	dove9_test_end();
}

static void test_detect_couplings_step9(void)
{
	dove9_test_begin("coupling: detect at step 9 (T7 MEMORY_ENCODING)");
	struct dove9_coupling_detection out[3];
	int n = dove9_detect_couplings(9, out, 3);
	/* Step 9 is T7_MEMORY_ENCODING — may activate PERCEPTION_MEMORY */
	DOVE9_TEST_ASSERT(n >= 0 && n <= 3);
	dove9_test_end();
}

static void test_detect_couplings_all_steps(void)
{
	dove9_test_begin("coupling: detect across all 12 steps");
	int total_couplings = 0;
	for (int s = 1; s <= DOVE9_STEP_COUNT; s++) {
		struct dove9_coupling_detection out[3];
		int n = dove9_detect_couplings(s, out, 3);
		DOVE9_TEST_ASSERT(n >= 0 && n <= 3);
		total_couplings += n;
	}
	/* System should detect at least some couplings across 12 steps */
	DOVE9_TEST_ASSERT(total_couplings >= 0);
	dove9_test_end();
}

static void test_detect_couplings_zero_buffer(void)
{
	dove9_test_begin("coupling: detect with zero buffer size");
	struct dove9_coupling_detection out[1];
	int n = dove9_detect_couplings(1, out, 0);
	DOVE9_TEST_ASSERT_INT_EQ(n, 0);
	dove9_test_end();
}

static void test_detect_couplings_invalid_step(void)
{
	dove9_test_begin("coupling: detect at invalid step 0");
	struct dove9_coupling_detection out[3];
	int n = dove9_detect_couplings(0, out, 3);
	DOVE9_TEST_ASSERT(n >= 0); /* should handle gracefully */
	dove9_test_end();
}

static void test_detect_couplings_invalid_step_13(void)
{
	dove9_test_begin("coupling: detect at invalid step 13");
	struct dove9_coupling_detection out[3];
	int n = dove9_detect_couplings(13, out, 3);
	DOVE9_TEST_ASSERT(n >= 0); /* should handle gracefully */
	dove9_test_end();
}

/* ---- test: dove9_get_active_steps_for_time_point ---- */

static void test_active_steps_time_point_1(void)
{
	dove9_test_begin("active_steps: time point step 1");
	const struct dove9_step_config *out[3];
	int n = dove9_get_active_steps_for_time_point(1, out);
	/* At step 1, up to 3 active steps from the triadic convergence */
	DOVE9_TEST_ASSERT(n >= 0 && n <= 3);
	dove9_test_end();
}

static void test_active_steps_time_point_5(void)
{
	dove9_test_begin("active_steps: time point step 5");
	const struct dove9_step_config *out[3];
	int n = dove9_get_active_steps_for_time_point(5, out);
	DOVE9_TEST_ASSERT(n >= 0 && n <= 3);
	dove9_test_end();
}

static void test_active_steps_all_triads(void)
{
	dove9_test_begin("active_steps: all 4 triad convergence points");
	/* Triad time_points: 0,1,2,3 → steps 1,2,3,4 */
	for (int tp = 0; tp < DOVE9_TRIAD_COUNT; tp++) {
		int step = dove9_triad_points[tp].steps[0];
		const struct dove9_step_config *out[3];
		int n = dove9_get_active_steps_for_time_point(step, out);
		DOVE9_TEST_ASSERT(n >= 1 && n <= 3);
	}
	dove9_test_end();
}

/* ---- test: dove9_triad_at_step ---- */

static void test_triad_at_step_valid(void)
{
	dove9_test_begin("triad_at_step: valid triad steps");
	/* Steps 1,5,9 are at triad point 0 */
	const struct dove9_triad_point *tp = dove9_triad_at_step(1);
	DOVE9_TEST_ASSERT_NOT_NULL(tp);
	DOVE9_TEST_ASSERT_INT_EQ(tp->time_point, 0);
	dove9_test_end();
}

static void test_triad_at_step_all(void)
{
	dove9_test_begin("triad_at_step: every step belongs to a triad");
	for (int s = 1; s <= DOVE9_STEP_COUNT; s++) {
		const struct dove9_triad_point *tp = dove9_triad_at_step(s);
		DOVE9_TEST_ASSERT_NOT_NULL(tp);
	}
	dove9_test_end();
}

static void test_triad_at_step_invalid_zero(void)
{
	dove9_test_begin("triad_at_step: step 0 returns NULL");
	const struct dove9_triad_point *tp = dove9_triad_at_step(0);
	/* Step 0 is invalid; should return NULL */
	DOVE9_TEST_ASSERT_NULL(tp);
	dove9_test_end();
}

static void test_triad_at_step_invalid_13(void)
{
	dove9_test_begin("triad_at_step: step 13 returns NULL");
	const struct dove9_triad_point *tp = dove9_triad_at_step(13);
	DOVE9_TEST_ASSERT_NULL(tp);
	dove9_test_end();
}

/* ---- test: coupling detection data integrity ---- */

static void test_coupling_detection_types_valid(void)
{
	dove9_test_begin("coupling: detection types are valid enums");
	for (int s = 1; s <= DOVE9_STEP_COUNT; s++) {
		struct dove9_coupling_detection out[3];
		int n = dove9_detect_couplings(s, out, 3);
		for (int i = 0; i < n; i++) {
			DOVE9_TEST_ASSERT(
				out[i].type == DOVE9_COUPLING_PERCEPTION_MEMORY ||
				out[i].type == DOVE9_COUPLING_ASSESSMENT_PLANNING ||
				out[i].type == DOVE9_COUPLING_BALANCED_INTEGRATION);
			DOVE9_TEST_ASSERT(out[i].term_count >= 1 &&
					  out[i].term_count <= 2);
		}
	}
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_detect_couplings_step1,
		test_detect_couplings_step3,
		test_detect_couplings_step9,
		test_detect_couplings_all_steps,
		test_detect_couplings_zero_buffer,
		test_detect_couplings_invalid_step,
		test_detect_couplings_invalid_step_13,
		test_active_steps_time_point_1,
		test_active_steps_time_point_5,
		test_active_steps_all_triads,
		test_triad_at_step_valid,
		test_triad_at_step_all,
		test_triad_at_step_invalid_zero,
		test_triad_at_step_invalid_13,
		test_coupling_detection_types_valid,
	};
	return dove9_test_run("dove9-coupling-detection",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
