/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Mathematical verification tests for triadic cognitive loop timing,
 * phase offsets, and mode distribution properties. */

#include "dove9-test-common.h"
#include "../cognitive/dove9-triadic-engine.h"
#include <string.h>

/* ---- test: stream phase offsets are 120° apart ---- */

static void test_stream_phase_offsets(void)
{
	dove9_test_begin("math: stream phase offsets 120 apart");
	DOVE9_TEST_ASSERT_INT_EQ(dove9_stream_configs[0].phase_offset, 0);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_stream_configs[1].phase_offset, 120);
	DOVE9_TEST_ASSERT_INT_EQ(dove9_stream_configs[2].phase_offset, 240);
	/* Sum of offsets = 360 (one full circle) */
	int sum = 0;
	for (int i = 0; i < DOVE9_STREAM_COUNT; i++)
		sum += dove9_stream_configs[i].phase_offset;
	DOVE9_TEST_ASSERT_INT_EQ(sum, 360);
	dove9_test_end();
}

/* ---- test: 7 expressive + 5 reflective = 12 steps ---- */

static void test_mode_ratio_7_5(void)
{
	dove9_test_begin("math: 7 expressive + 5 reflective steps");
	int expressive = 0, reflective = 0;
	for (int i = 0; i < DOVE9_STEP_COUNT; i++) {
		if (dove9_step_configs[i].mode == DOVE9_MODE_EXPRESSIVE)
			expressive++;
		else
			reflective++;
	}
	DOVE9_TEST_ASSERT_INT_EQ(expressive, 7);
	DOVE9_TEST_ASSERT_INT_EQ(reflective, 5);
	DOVE9_TEST_ASSERT_INT_EQ(expressive + reflective, DOVE9_STEP_COUNT);
	dove9_test_end();
}

/* ---- test: each stream has exactly 4 steps ---- */

static void test_four_steps_per_stream(void)
{
	dove9_test_begin("math: each stream has 4 steps");
	int counts[DOVE9_STREAM_COUNT] = {0};
	for (int i = 0; i < DOVE9_STEP_COUNT; i++) {
		counts[dove9_step_configs[i].stream_id]++;
	}
	for (int s = 0; s < DOVE9_STREAM_COUNT; s++) {
		DOVE9_TEST_ASSERT_INT_EQ(counts[s], 4);
	}
	dove9_test_end();
}

/* ---- test: 4 triad points, each containing 3 steps ---- */

static void test_four_triads_three_steps_each(void)
{
	dove9_test_begin("math: 4 triads, 3 steps each");
	DOVE9_TEST_ASSERT_INT_EQ(DOVE9_TRIAD_COUNT, 4);
	/* Each triad should reference 3 distinct steps */
	for (int t = 0; t < DOVE9_TRIAD_COUNT; t++) {
		int s0 = dove9_triad_points[t].steps[0];
		int s1 = dove9_triad_points[t].steps[1];
		int s2 = dove9_triad_points[t].steps[2];
		DOVE9_TEST_ASSERT(s0 != s1);
		DOVE9_TEST_ASSERT(s1 != s2);
		DOVE9_TEST_ASSERT(s0 != s2);
	}
	dove9_test_end();
}

/* ---- test: triads cover all 12 steps ---- */

static void test_triads_cover_all_steps(void)
{
	dove9_test_begin("math: triads cover all 12 steps");
	bool seen[DOVE9_STEP_COUNT + 1]; /* 1-indexed */
	memset(seen, 0, sizeof(seen));
	for (int t = 0; t < DOVE9_TRIAD_COUNT; t++) {
		for (int j = 0; j < 3; j++) {
			int s = dove9_triad_points[t].steps[j];
			DOVE9_TEST_ASSERT(s >= 1 && s <= DOVE9_STEP_COUNT);
			seen[s] = true;
		}
	}
	for (int s = 1; s <= DOVE9_STEP_COUNT; s++) {
		DOVE9_TEST_ASSERT(seen[s]);
	}
	dove9_test_end();
}

/* ---- test: phase degrees increment by 30° ---- */

static void test_phase_degrees_30_increment(void)
{
	dove9_test_begin("math: phases increment by 30 degrees");
	/* Steps are numbered 1-12, phase degrees 0-330 in 30° steps */
	for (int i = 0; i < DOVE9_STEP_COUNT; i++) {
		int expected = (dove9_step_configs[i].step_number - 1) * 30;
		DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[i].phase_degrees,
					 expected);
	}
	dove9_test_end();
}

/* ---- test: step numbers are 1 through 12 ---- */

static void test_step_numbers_1_to_12(void)
{
	/* Table is triad-grouped, not sequential */
	const int expected[] = {1, 5, 9, 2, 6, 10, 3, 7, 11, 4, 8, 12};

	dove9_test_begin("math: step numbers 1 through 12");
	for (int i = 0; i < DOVE9_STEP_COUNT; i++) {
		DOVE9_TEST_ASSERT_INT_EQ(dove9_step_configs[i].step_number,
					 expected[i]);
	}
	dove9_test_end();
}

/* ---- test: PIVOTAL_RR steps are exactly 1 and 5 ---- */

static void test_pivotal_rr_steps(void)
{
	dove9_test_begin("math: PIVOTAL_RR on steps 1 and 5");
	int pivotal_count = 0;
	for (int i = 0; i < DOVE9_STEP_COUNT; i++) {
		if (dove9_step_configs[i].step_type == DOVE9_STEP_PIVOTAL_RR) {
			DOVE9_TEST_ASSERT(
				dove9_step_configs[i].step_number == 1 ||
				dove9_step_configs[i].step_number == 5);
			pivotal_count++;
		}
	}
	DOVE9_TEST_ASSERT_INT_EQ(pivotal_count, 2);
	dove9_test_end();
}

/* ---- test: each cognitive term appears at least once ---- */

static void test_all_terms_present(void)
{
	dove9_test_begin("math: 5 cognitive terms in step config table");
	bool found_t1 = false, found_t2 = false, found_t4 = false;
	bool found_t5 = false, found_t7 = false;
	for (int i = 0; i < DOVE9_STEP_COUNT; i++) {
		switch (dove9_step_configs[i].term) {
		case DOVE9_TERM_T1_PERCEPTION:      found_t1 = true; break;
		case DOVE9_TERM_T2_IDEA_FORMATION:  found_t2 = true; break;
		case DOVE9_TERM_T4_SENSORY_INPUT:   found_t4 = true; break;
		case DOVE9_TERM_T5_ACTION_SEQUENCE: found_t5 = true; break;
		case DOVE9_TERM_T7_MEMORY_ENCODING: found_t7 = true; break;
		case DOVE9_TERM_T8_BALANCED_RESPONSE: break; /* T8 used by DTE processor layer, not step table */
		}
	}
	DOVE9_TEST_ASSERT(found_t1);
	DOVE9_TEST_ASSERT(found_t2);
	DOVE9_TEST_ASSERT(found_t4);
	DOVE9_TEST_ASSERT(found_t5);
	DOVE9_TEST_ASSERT(found_t7);
	dove9_test_end();
}

/* ---- test: coupling type enum values are distinct bits ---- */

static void test_coupling_type_bits(void)
{
	dove9_test_begin("math: coupling types are distinct bits");
	unsigned int pm = (1u << DOVE9_COUPLING_PERCEPTION_MEMORY);
	unsigned int ap = (1u << DOVE9_COUPLING_ASSESSMENT_PLANNING);
	unsigned int bi = (1u << DOVE9_COUPLING_BALANCED_INTEGRATION);
	DOVE9_TEST_ASSERT(pm != ap);
	DOVE9_TEST_ASSERT(ap != bi);
	DOVE9_TEST_ASSERT(pm != bi);
	/* No collision in lower bits */
	DOVE9_TEST_ASSERT((pm & ap) == 0);
	DOVE9_TEST_ASSERT((ap & bi) == 0);
	DOVE9_TEST_ASSERT((pm & bi) == 0);
	dove9_test_end();
}

/* ---- test: LCM(12, 30) = 60 ---- */

static unsigned int gcd(unsigned int a, unsigned int b)
{
	while (b) { unsigned int t = b; b = a % b; a = t; }
	return a;
}

static void test_lcm_12_30(void)
{
	dove9_test_begin("math: LCM(12, 30) = 60");
	unsigned int lcm = (12 * 30) / gcd(12, 30);
	DOVE9_TEST_ASSERT_UINT_EQ(lcm, 60);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_stream_phase_offsets,
		test_mode_ratio_7_5,
		test_four_steps_per_stream,
		test_four_triads_three_steps_each,
		test_triads_cover_all_steps,
		test_phase_degrees_30_increment,
		test_step_numbers_1_to_12,
		test_pivotal_rr_steps,
		test_all_terms_present,
		test_coupling_type_bits,
		test_lcm_12_30,
	};
	return dove9_test_run("dove9-triadic-math",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
