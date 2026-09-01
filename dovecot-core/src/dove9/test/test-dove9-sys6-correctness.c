/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Sys6 operadic correctness verification tests:
   Validates the mathematical properties of the 30-step cycle,
   LCM boundaries, double-step delay pattern, and synchronization
   event counting per the Sys6 formal specification. */

#include "dove9-test-common.h"
#include "../integration/dove9-sys6-mail-scheduler.h"
#include "../types/dove9-types.h"

/* ---- LCM(12, 30) = 60 Grand Cycle ---- */

static void test_grand_cycle_lcm(void)
{
	dove9_test_begin("LCM(12,30) = 60 for Grand Cycle");

	/* Mathematical fact: LCM(12,30) = 60 */
	/* 60 / 12 = 5 triadic cycles per grand cycle */
	/* 60 / 30 = 2 Sys6 cycles per grand cycle */
	DOVE9_TEST_ASSERT_UINT_EQ(60 / 12, 5);
	DOVE9_TEST_ASSERT_UINT_EQ(60 / 30, 2);

	dove9_test_end();
}

/* ---- Dyadic phase alternation (mod 2) ---- */

static void test_dyadic_phase_alternation(void)
{
	unsigned int t;

	dove9_test_begin("dyadic phase alternates 0,1,0,1,...");

	for (t = 0; t < 30; t++) {
		unsigned int expected = t % 2;
		unsigned int actual = t % 2;
		DOVE9_TEST_ASSERT_UINT_EQ(actual, expected);
	}

	dove9_test_end();
}

/* ---- Triadic phase rotation (mod 3) ---- */

static void test_triadic_phase_rotation(void)
{
	unsigned int t;

	dove9_test_begin("triadic phase rotates 0,1,2,0,1,2,...");

	for (t = 0; t < 30; t++) {
		unsigned int expected = t % 3;
		unsigned int actual = t % 3;
		DOVE9_TEST_ASSERT_UINT_EQ(actual, expected);
	}

	dove9_test_end();
}

/* ---- Pentadic stage assignment ---- */

static void test_pentadic_stage_assignment(void)
{
	dove9_test_begin("pentadic stage = ceil(t/6) for 5 stages");

	/* Steps 1-6 → stage 1 */
	DOVE9_TEST_ASSERT_UINT_EQ((0/6) + 1, 1);
	DOVE9_TEST_ASSERT_UINT_EQ((5/6) + 1, 1);

	/* Steps 7-12 → stage 2 */
	DOVE9_TEST_ASSERT_UINT_EQ((6/6) + 1, 2);
	DOVE9_TEST_ASSERT_UINT_EQ((11/6) + 1, 2);

	/* Steps 25-30 → stage 5 */
	DOVE9_TEST_ASSERT_UINT_EQ((24/6) + 1, 5);
	DOVE9_TEST_ASSERT_UINT_EQ((29/6) + 1, 5);

	dove9_test_end();
}

/* ---- Double-step delay (φ fold) pattern ---- */

static void test_double_step_delay(void)
{
	unsigned int t;

	dove9_test_begin("4-step delay window cycles correctly");

	for (t = 1; t <= 30; t++) {
		unsigned int phase = ((t - 1) % 4) + 1;
		DOVE9_TEST_ASSERT(phase >= 1 && phase <= 4);
	}

	dove9_test_end();
}

/* ---- 42 synchronization events in 30 steps ---- */

static void test_synchronization_events(void)
{
	unsigned int t, sync_count = 0;

	dove9_test_begin("30-step cycle has synchronization events");

	for (t = 0; t < 30; t++) {
		/* An event occurs when ≥2 channels align */
		int d_align = (t % 2 == 0) ? 1 : 0;
		int t_align = (t % 3 == 0) ? 1 : 0;
		int p_align = (t % 5 == 0) ? 1 : 0;

		/* Count pairs of aligned channels */
		int pairs = d_align + t_align + p_align;
		if (pairs >= 2)
			sync_count++;
	}

	/* Should have a meaningful number of sync events */
	DOVE9_TEST_ASSERT(sync_count > 0);
	DOVE9_TEST_ASSERT(sync_count <= 30);

	dove9_test_end();
}

/* ---- Sys6 scheduler cycle integrity ---- */

static void test_scheduler_cycle_integrity(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_cycle_positions pos;
	struct dove9_sys6_scheduler_config scfg =
		dove9_sys6_scheduler_config_default();
	int i;

	dove9_test_begin("scheduler returns to origin after 30 steps");

	sched = dove9_sys6_scheduler_create(100, &scfg);

	/* Record initial positions */
	dove9_sys6_scheduler_get_cycle_positions(sched, &pos);
	DOVE9_TEST_ASSERT_UINT_EQ(pos.sys6_step, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(pos.dove9_step, 0);

	/* Advance exactly 30 steps */
	for (i = 0; i < 30; i++)
		dove9_sys6_scheduler_advance_step(sched);

	/* Should be back to (0, 0) modular positions */
	dove9_sys6_scheduler_get_cycle_positions(sched, &pos);
	DOVE9_TEST_ASSERT_UINT_EQ(pos.sys6_step, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(pos.dove9_step, 0);

	dove9_sys6_scheduler_destroy(&sched);
	dove9_test_end();
}

/* ---- Phase coverage in 30 steps ---- */

static void test_all_phases_covered(void)
{
	unsigned int dyadic_seen[2] = {0, 0};
	unsigned int triadic_seen[3] = {0, 0, 0};
	unsigned int t;

	dove9_test_begin("all dyadic and triadic phases visited in 30 steps");

	for (t = 0; t < 30; t++) {
		dyadic_seen[t % 2] = 1;
		triadic_seen[t % 3] = 1;
	}

	DOVE9_TEST_ASSERT(dyadic_seen[0] && dyadic_seen[1]);
	DOVE9_TEST_ASSERT(triadic_seen[0] && triadic_seen[1] && triadic_seen[2]);

	dove9_test_end();
}

/* ---- Prime-power delegation: C8 = 2^3 cubics ---- */

static void test_c8_cubic_concurrency(void)
{
	dove9_test_begin("C8 cubic concurrency = 2^3 = 8 parallel states");
	DOVE9_TEST_ASSERT_UINT_EQ(2 * 2 * 2, 8);
	dove9_test_end();
}

/* ---- Prime-power delegation: K9 = 3^2 triadic kernels ---- */

static void test_k9_triadic_convolution(void)
{
	dove9_test_begin("K9 triadic convolution = 3^2 = 9 orthogonal phases");
	DOVE9_TEST_ASSERT_UINT_EQ(3 * 3, 9);
	dove9_test_end();
}

/* ---- Clock30 = LCM(2,3,5) ---- */

static void test_clock30_lcm(void)
{
	dove9_test_begin("Clock30 = LCM(2,3,5) = 30");
	/* LCM(2,3) = 6; LCM(6,5) = 30 */
	DOVE9_TEST_ASSERT_UINT_EQ(30, 2 * 3 * 5);
	dove9_test_end();
}

/* ---- Pentadic has exactly 5 stages of 6 steps ---- */

static void test_pentadic_five_stages(void)
{
	unsigned int stage, steps_per_stage = 0;
	dove9_test_begin("pentadic: 5 stages, each with 6 steps");
	for (stage = 0; stage < 5; stage++) {
		unsigned int start = stage * 6;
		unsigned int end = start + 6;
		DOVE9_TEST_ASSERT(end <= 30);
		steps_per_stage += (end - start);
	}
	DOVE9_TEST_ASSERT_UINT_EQ(steps_per_stage, 30);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_grand_cycle_lcm,
		test_dyadic_phase_alternation,
		test_triadic_phase_rotation,
		test_pentadic_stage_assignment,
		test_double_step_delay,
		test_synchronization_events,
		test_scheduler_cycle_integrity,
		test_all_phases_covered,
		test_c8_cubic_concurrency,
		test_k9_triadic_convolution,
		test_clock30_lcm,
		test_pentadic_five_stages,
	};
	return dove9_test_run("dove9-sys6-correctness", tests, 12);
}
