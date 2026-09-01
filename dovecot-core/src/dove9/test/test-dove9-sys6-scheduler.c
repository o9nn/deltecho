/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-sys6-mail-scheduler: priority-to-phase mapping,
   cycle boundaries, scheduling, FIFO fallback, capacity warnings. */

#include "dove9-test-common.h"
#include "../integration/dove9-sys6-mail-scheduler.h"
#include "../types/dove9-types.h"

#include <string.h>

static void test_scheduler_create(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config cfg = dove9_sys6_scheduler_config_default();

	dove9_test_begin("sys6 scheduler create/destroy");

	sched = dove9_sys6_scheduler_create(100, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(sched);
	dove9_sys6_scheduler_destroy(&sched);
	DOVE9_TEST_ASSERT_NULL(sched);

	dove9_test_end();
}

static void test_priority_to_phase(void)
{
	dove9_test_begin("priority maps to correct phase");

	/* High priority (7-9) → phase 1 */
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_priority_to_phase(9), 1);
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_priority_to_phase(8), 1);
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_priority_to_phase(7), 1);

	/* Medium priority (4-6) → phase 2 */
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_priority_to_phase(6), 2);
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_priority_to_phase(5), 2);
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_priority_to_phase(4), 2);

	/* Low priority (1-3) → phase 3 */
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_priority_to_phase(3), 3);
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_priority_to_phase(2), 3);
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_priority_to_phase(1), 3);

	dove9_test_end();
}

static void test_cycle_positions(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config cfg = dove9_sys6_scheduler_config_default();
	struct dove9_cycle_positions pos;
	int i;

	dove9_test_begin("cycle positions computed correctly");

	sched = dove9_sys6_scheduler_create(100, &cfg);

	/* At step 0 all positions should be at initial state */
	dove9_sys6_scheduler_get_cycle_positions(sched, &pos);
	DOVE9_TEST_ASSERT_UINT_EQ(pos.grand_step, 0);
	DOVE9_TEST_ASSERT_UINT_EQ(pos.sys6_step, 0);

	/* Must start before advancing */
	dove9_sys6_scheduler_start(sched);

	/* Advance some steps */
	for (i = 0; i < 7; i++)
		dove9_sys6_scheduler_advance_step(sched);

	dove9_sys6_scheduler_get_cycle_positions(sched, &pos);
	DOVE9_TEST_ASSERT_UINT_EQ(pos.grand_step, 7);
	DOVE9_TEST_ASSERT_UINT_EQ(pos.sys6_step, 7);
	DOVE9_TEST_ASSERT_UINT_EQ(pos.dove9_step, 7);

	dove9_sys6_scheduler_destroy(&sched);
	dove9_test_end();
}

static void test_cycle_boundaries(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config cfg = dove9_sys6_scheduler_config_default();
	struct dove9_scheduler_state state;
	int i;

	dove9_test_begin("Sys6 at 30 steps, Grand at 60 steps");

	sched = dove9_sys6_scheduler_create(100, &cfg);
	dove9_sys6_scheduler_start(sched);

	for (i = 0; i < 60; i++)
		dove9_sys6_scheduler_advance_step(sched);

	dove9_sys6_scheduler_get_state(sched, &state);
	/* 60 steps: 2 Sys6 cycles (at 30, 60) and 1 grand cycle (at 60) */
	DOVE9_TEST_ASSERT_UINT_EQ(state.sys6_cycle, 2);
	DOVE9_TEST_ASSERT_UINT_EQ(state.current_grand_cycle, 1);

	dove9_sys6_scheduler_destroy(&sched);
	dove9_test_end();
}

static void test_schedule_mail(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config cfg = dove9_sys6_scheduler_config_default();
	struct dove9_mail_message mail;
	struct dove9_message_process proc;
	struct dove9_mail_schedule_result result;

	dove9_test_begin("schedule_mail assigns slot");

	sched = dove9_sys6_scheduler_create(100, &cfg);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");
	snprintf(mail.body, sizeof(mail.body), "test");

	memset(&proc, 0, sizeof(proc));
	snprintf(proc.id, sizeof(proc.id), "msg-001");
	snprintf(proc.message_id, sizeof(proc.message_id), "msg-001");
	proc.priority = 8;

	result = dove9_sys6_scheduler_schedule_mail(sched, &mail, &proc);
	DOVE9_TEST_ASSERT_UINT_EQ(result.sys6_phase, 1); /* high priority → phase 1 */

	dove9_sys6_scheduler_destroy(&sched);
	dove9_test_end();
}

static void test_next_slot(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config cfg = dove9_sys6_scheduler_config_default();
	struct dove9_mail_message mail;
	struct dove9_message_process proc;
	struct dove9_next_slot slot;

	dove9_test_begin("get_next_slot returns valid scheduling slot");

	sched = dove9_sys6_scheduler_create(100, &cfg);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");

	memset(&proc, 0, sizeof(proc));
	snprintf(proc.id, sizeof(proc.id), "msg-a");
	snprintf(proc.message_id, sizeof(proc.message_id), "msg-a");
	proc.priority = 5;

	dove9_sys6_scheduler_schedule_mail(sched, &mail, &proc);

	slot = dove9_sys6_scheduler_get_next_slot(sched, 5);
	DOVE9_TEST_ASSERT(slot.phase >= 1 && slot.phase <= 3);

	/* Check pending count */
	DOVE9_TEST_ASSERT(dove9_sys6_scheduler_get_pending_count(sched) >= 1);

	dove9_sys6_scheduler_destroy(&sched);
	dove9_test_end();
}

static void test_fifo_fallback(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config cfg = dove9_sys6_scheduler_config_default();
	struct dove9_mail_message mail;
	struct dove9_message_process proc;
	struct dove9_mail_schedule_result r1, r2, r3;

	dove9_test_begin("same-priority items scheduled in FIFO order");

	sched = dove9_sys6_scheduler_create(100, &cfg);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");

	memset(&proc, 0, sizeof(proc));
	proc.priority = 5;

	snprintf(proc.id, sizeof(proc.id), "first");
	snprintf(proc.message_id, sizeof(proc.message_id), "first");
	r1 = dove9_sys6_scheduler_schedule_mail(sched, &mail, &proc);

	snprintf(proc.id, sizeof(proc.id), "second");
	snprintf(proc.message_id, sizeof(proc.message_id), "second");
	r2 = dove9_sys6_scheduler_schedule_mail(sched, &mail, &proc);

	snprintf(proc.id, sizeof(proc.id), "third");
	snprintf(proc.message_id, sizeof(proc.message_id), "third");
	r3 = dove9_sys6_scheduler_schedule_mail(sched, &mail, &proc);

	/* FIFO: first scheduled should have earliest or equal step */
	DOVE9_TEST_ASSERT(r1.scheduled_step <= r2.scheduled_step);
	DOVE9_TEST_ASSERT(r2.scheduled_step <= r3.scheduled_step);

	dove9_sys6_scheduler_destroy(&sched);
	dove9_test_end();
}

static void test_scheduler_double_destroy(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config cfg = dove9_sys6_scheduler_config_default();

	dove9_test_begin("scheduler double destroy safe");

	sched = dove9_sys6_scheduler_create(100, &cfg);
	dove9_sys6_scheduler_destroy(&sched);
	DOVE9_TEST_ASSERT_NULL(sched);
	dove9_sys6_scheduler_destroy(&sched);
	DOVE9_TEST_ASSERT_NULL(sched);

	dove9_test_end();
}

static void test_scheduler_priority_ordering(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config cfg = dove9_sys6_scheduler_config_default();
	struct dove9_mail_message mail;
	struct dove9_message_process proc;
	struct dove9_mail_schedule_result r_low, r_high;

	dove9_test_begin("higher priority scheduled to earlier phase");

	sched = dove9_sys6_scheduler_create(100, &cfg);

	memset(&mail, 0, sizeof(mail));
	snprintf(mail.from, sizeof(mail.from), "user@test.com");
	mail.to_count = 1;
	snprintf(mail.to[0], sizeof(mail.to[0]), "bot@test.com");

	memset(&proc, 0, sizeof(proc));

	snprintf(proc.id, sizeof(proc.id), "low");
	snprintf(proc.message_id, sizeof(proc.message_id), "low");
	proc.priority = 1;
	r_low = dove9_sys6_scheduler_schedule_mail(sched, &mail, &proc);

	snprintf(proc.id, sizeof(proc.id), "high");
	snprintf(proc.message_id, sizeof(proc.message_id), "high");
	proc.priority = 9;
	r_high = dove9_sys6_scheduler_schedule_mail(sched, &mail, &proc);

	/* High priority → phase 1, low priority → phase 3 */
	DOVE9_TEST_ASSERT_UINT_EQ(r_high.sys6_phase, 1);
	DOVE9_TEST_ASSERT_UINT_EQ(r_low.sys6_phase, 3);

	dove9_sys6_scheduler_destroy(&sched);
	dove9_test_end();
}

static void test_scheduler_empty_next(void)
{
	struct dove9_sys6_mail_scheduler *sched;
	struct dove9_sys6_scheduler_config cfg = dove9_sys6_scheduler_config_default();

	dove9_test_begin("no pending items on empty scheduler");

	sched = dove9_sys6_scheduler_create(100, &cfg);
	DOVE9_TEST_ASSERT_UINT_EQ(dove9_sys6_scheduler_get_pending_count(sched), 0);

	dove9_sys6_scheduler_destroy(&sched);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_scheduler_create,
		test_priority_to_phase,
		test_cycle_positions,
		test_cycle_boundaries,
		test_schedule_mail,
		test_next_slot,
		test_fifo_fallback,
		test_scheduler_double_destroy,
		test_scheduler_priority_ordering,
		test_scheduler_empty_next,
	};
	return dove9_test_run("dove9-sys6-scheduler", tests,
			      sizeof(tests) / sizeof(tests[0]));
}
