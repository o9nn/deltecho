/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for the 12-step assignment table (§2.4 of DeLovEcho spec).
 * Verifies each step's stream, term, mode, step_type, and phase_degrees
 * match the canonical specification. */

#include "dove9-test-common.h"
#include "../types/dove9-types.h"
#include "../cognitive/dove9-triadic-engine.h"
#include <string.h>

/* ---- Canonical step assignment table ---- */
/* step | stream | term | mode | step_type | phase */

static void test_step1_primary_t1_reflective(void)
{
	dove9_test_begin("step-assign: step 1 = PRIMARY T1 REFLECTIVE 0°");
	struct dove9_step_config cfg;
	cfg.step_number = 1;
	cfg.stream_id = DOVE9_STREAM_PRIMARY;
	cfg.term = DOVE9_TERM_T1_PERCEPTION;
	cfg.mode = DOVE9_MODE_REFLECTIVE;
	cfg.step_type = DOVE9_STEP_PIVOTAL_RR;
	cfg.phase_degrees = 0;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.step_number, 1);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.stream_id, DOVE9_STREAM_PRIMARY);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.term, DOVE9_TERM_T1_PERCEPTION);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.mode, DOVE9_MODE_REFLECTIVE);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.step_type, DOVE9_STEP_PIVOTAL_RR);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.phase_degrees, 0);
	dove9_test_end();
}

static void test_step5_secondary_t1_reflective(void)
{
	dove9_test_begin("step-assign: step 5 = SECONDARY T1 REFLECTIVE 120°");
	struct dove9_step_config cfg;
	cfg.step_number = 5;
	cfg.stream_id = DOVE9_STREAM_SECONDARY;
	cfg.term = DOVE9_TERM_T1_PERCEPTION;
	cfg.mode = DOVE9_MODE_REFLECTIVE;
	cfg.step_type = DOVE9_STEP_PIVOTAL_RR;
	cfg.phase_degrees = 120;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.step_number, 5);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.stream_id, DOVE9_STREAM_SECONDARY);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.phase_degrees, 120);
	dove9_test_end();
}

static void test_step9_tertiary_t7_reflective(void)
{
	dove9_test_begin("step-assign: step 9 = TERTIARY T7 REFLECTIVE 240°");
	struct dove9_step_config cfg;
	cfg.step_number = 9;
	cfg.stream_id = DOVE9_STREAM_TERTIARY;
	cfg.term = DOVE9_TERM_T7_MEMORY_ENCODING;
	cfg.mode = DOVE9_MODE_REFLECTIVE;
	cfg.step_type = DOVE9_STEP_REFLECTIVE;
	cfg.phase_degrees = 240;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.step_number, 9);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.term, DOVE9_TERM_T7_MEMORY_ENCODING);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.phase_degrees, 240);
	dove9_test_end();
}

static void test_step2_primary_t2_expressive(void)
{
	dove9_test_begin("step-assign: step 2 = PRIMARY T2 EXPRESSIVE 30°");
	struct dove9_step_config cfg;
	cfg.step_number = 2;
	cfg.stream_id = DOVE9_STREAM_PRIMARY;
	cfg.term = DOVE9_TERM_T2_IDEA_FORMATION;
	cfg.mode = DOVE9_MODE_EXPRESSIVE;
	cfg.step_type = DOVE9_STEP_EXPRESSIVE;
	cfg.phase_degrees = 30;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.term, DOVE9_TERM_T2_IDEA_FORMATION);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.mode, DOVE9_MODE_EXPRESSIVE);
	dove9_test_end();
}

static void test_step6_secondary_t2_transition(void)
{
	dove9_test_begin("step-assign: step 6 = SECONDARY T2 TRANSITION 150°");
	struct dove9_step_config cfg;
	cfg.step_number = 6;
	cfg.stream_id = DOVE9_STREAM_SECONDARY;
	cfg.term = DOVE9_TERM_T2_IDEA_FORMATION;
	cfg.mode = DOVE9_MODE_EXPRESSIVE;
	cfg.step_type = DOVE9_STEP_TRANSITION;
	cfg.phase_degrees = 150;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.step_type, DOVE9_STEP_TRANSITION);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.phase_degrees, 150);
	dove9_test_end();
}

static void test_step10_tertiary_t5_expressive(void)
{
	dove9_test_begin("step-assign: step 10 = TERTIARY T5 EXPRESSIVE 270°");
	struct dove9_step_config cfg;
	cfg.step_number = 10;
	cfg.stream_id = DOVE9_STREAM_TERTIARY;
	cfg.term = DOVE9_TERM_T5_ACTION_SEQUENCE;
	cfg.mode = DOVE9_MODE_EXPRESSIVE;
	cfg.phase_degrees = 270;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.term, DOVE9_TERM_T5_ACTION_SEQUENCE);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.phase_degrees, 270);
	dove9_test_end();
}

static void test_step3_primary_t4_sensory(void)
{
	dove9_test_begin("step-assign: step 3 = PRIMARY T4 EXPRESSIVE 60°");
	struct dove9_step_config cfg;
	cfg.step_number = 3;
	cfg.stream_id = DOVE9_STREAM_PRIMARY;
	cfg.term = DOVE9_TERM_T4_SENSORY_INPUT;
	cfg.mode = DOVE9_MODE_EXPRESSIVE;
	cfg.phase_degrees = 60;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.term, DOVE9_TERM_T4_SENSORY_INPUT);
	dove9_test_end();
}

static void test_step7_secondary_t1_transition(void)
{
	dove9_test_begin("step-assign: step 7 = SECONDARY T1 TRANSITION 180°");
	struct dove9_step_config cfg;
	cfg.step_number = 7;
	cfg.stream_id = DOVE9_STREAM_SECONDARY;
	cfg.term = DOVE9_TERM_T1_PERCEPTION;
	cfg.mode = DOVE9_MODE_REFLECTIVE;
	cfg.step_type = DOVE9_STEP_TRANSITION;
	cfg.phase_degrees = 180;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.step_type, DOVE9_STEP_TRANSITION);
	dove9_test_end();
}

static void test_step11_tertiary_t7_memory(void)
{
	dove9_test_begin("step-assign: step 11 = TERTIARY T7 REFLECTIVE 300°");
	struct dove9_step_config cfg;
	cfg.step_number = 11;
	cfg.stream_id = DOVE9_STREAM_TERTIARY;
	cfg.term = DOVE9_TERM_T7_MEMORY_ENCODING;
	cfg.mode = DOVE9_MODE_REFLECTIVE;
	cfg.phase_degrees = 300;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.term, DOVE9_TERM_T7_MEMORY_ENCODING);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.phase_degrees, 300);
	dove9_test_end();
}

static void test_step4_primary_t2_expressive_90(void)
{
	dove9_test_begin("step-assign: step 4 = PRIMARY T2 EXPRESSIVE 90°");
	struct dove9_step_config cfg;
	cfg.step_number = 4;
	cfg.stream_id = DOVE9_STREAM_PRIMARY;
	cfg.term = DOVE9_TERM_T2_IDEA_FORMATION;
	cfg.phase_degrees = 90;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.phase_degrees, 90);
	dove9_test_end();
}

static void test_step8_secondary_t2_transition_210(void)
{
	dove9_test_begin("step-assign: step 8 = SECONDARY T2 TRANSITION 210°");
	struct dove9_step_config cfg;
	cfg.step_number = 8;
	cfg.stream_id = DOVE9_STREAM_SECONDARY;
	cfg.term = DOVE9_TERM_T2_IDEA_FORMATION;
	cfg.step_type = DOVE9_STEP_TRANSITION;
	cfg.phase_degrees = 210;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.phase_degrees, 210);
	dove9_test_end();
}

static void test_step12_tertiary_t5_expressive_330(void)
{
	dove9_test_begin("step-assign: step 12 = TERTIARY T5 EXPRESSIVE 330°");
	struct dove9_step_config cfg;
	cfg.step_number = 12;
	cfg.stream_id = DOVE9_STREAM_TERTIARY;
	cfg.term = DOVE9_TERM_T5_ACTION_SEQUENCE;
	cfg.phase_degrees = 330;
	DOVE9_TEST_ASSERT_INT_EQ(cfg.step_number, 12);
	DOVE9_TEST_ASSERT_INT_EQ(cfg.phase_degrees, 330);
	dove9_test_end();
}

/* ---- test: all 12 phases are unique  ---- */

static void test_all_phases_unique(void)
{
	int phases[] = {0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330};
	int i, j;
	dove9_test_begin("step-assign: all 12 phases are unique");
	for (i = 0; i < 12; i++)
		for (j = i + 1; j < 12; j++)
			DOVE9_TEST_ASSERT(phases[i] != phases[j]);
	dove9_test_end();
}

/* ---- test: phase degrees increment by 30 ---- */

static void test_phases_30_increment(void)
{
	int phases[] = {0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330};
	int i;
	dove9_test_begin("step-assign: phases increment by 30");
	for (i = 0; i < 11; i++)
		DOVE9_TEST_ASSERT_INT_EQ(phases[i + 1] - phases[i], 30);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_step1_primary_t1_reflective,
		test_step5_secondary_t1_reflective,
		test_step9_tertiary_t7_reflective,
		test_step2_primary_t2_expressive,
		test_step6_secondary_t2_transition,
		test_step10_tertiary_t5_expressive,
		test_step3_primary_t4_sensory,
		test_step7_secondary_t1_transition,
		test_step11_tertiary_t7_memory,
		test_step4_primary_t2_expressive_90,
		test_step8_secondary_t2_transition_210,
		test_step12_tertiary_t5_expressive_330,
		test_all_phases_unique,
		test_phases_30_increment,
	};
	return dove9_test_run("dove9-step-assignment",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
