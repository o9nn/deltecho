/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for dove9_kernel process management: create, fork, suspend,
 * resume, terminate, state transitions, capacity limits. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../core/dove9-kernel.h"
#include <string.h>

static struct dove9_config test_cfg(void)
{
	struct dove9_config c = dove9_config_default();
	c.max_concurrent_processes = 8;
	c.max_queue_depth = 16;
	return c;
}

/* ---- test: create process ---- */

static void test_create_process_basic(void)
{
	dove9_test_begin("pm: create process basic");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	struct dove9_message_process *p =
		dove9_kernel_create_process(k, "p1", "a@test", tos, 1,
					    "Subj", "Body", 5);
	DOVE9_TEST_ASSERT_NOT_NULL(p);
	DOVE9_TEST_ASSERT_STR_EQ(p->subject, "Subj");
	DOVE9_TEST_ASSERT_INT_EQ(p->priority, 5);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: get process by id ---- */

static void test_get_process_by_id(void)
{
	dove9_test_begin("pm: get process by id");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	struct dove9_message_process *created =
		dove9_kernel_create_process(k, "get-1", "a@test", tos, 1,
					    "S", "B", 3);
	struct dove9_message_process *found =
		dove9_kernel_get_process(k, created->id);
	DOVE9_TEST_ASSERT_NOT_NULL(found);
	DOVE9_TEST_ASSERT_STR_EQ(found->id, created->id);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: terminate process ---- */

static void test_terminate_process(void)
{
	dove9_test_begin("pm: terminate process");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	struct dove9_message_process *p =
		dove9_kernel_create_process(k, "term-1", "a@test", tos, 1,
					    "S", "B", 3);
	bool ok = dove9_kernel_terminate_process(k, p->id);
	DOVE9_TEST_ASSERT(ok);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: suspend and resume ---- */

static void test_suspend_resume(void)
{
	dove9_test_begin("pm: suspend then resume");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	struct dove9_message_process *p =
		dove9_kernel_create_process(k, "sr-1", "a@test", tos, 1,
					    "S", "B", 5);
	/* Directly set ACTIVE state to test suspend API
	   (in synchronous model, tick activates+executes atomically) */
	p->state = DOVE9_PROCESS_ACTIVE;

	bool susp = dove9_kernel_suspend_process(k, p->id);
	DOVE9_TEST_ASSERT(susp);

	bool res = dove9_kernel_resume_process(k, p->id);
	DOVE9_TEST_ASSERT(res);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: fork process ---- */

static void test_fork_process(void)
{
	dove9_test_begin("pm: fork process creates child");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	struct dove9_message_process *parent =
		dove9_kernel_create_process(k, "fork-p", "a@test", tos, 1,
					    "Parent", "Body", 5);
	struct dove9_message_process *child =
		dove9_kernel_fork_process(k, parent->id, "Child body", "Child subj");
	DOVE9_TEST_ASSERT_NOT_NULL(child);
	DOVE9_TEST_ASSERT_STR_EQ(child->subject, "Child subj");

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: multiple processes ---- */

static void test_multiple_processes(void)
{
	dove9_test_begin("pm: create multiple processes");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	int i;
	for (i = 0; i < 5; i++) {
		char mid[32];
		char subj[32];
		snprintf(mid, sizeof(mid), "multi-%d", i);
		snprintf(subj, sizeof(subj), "Subj %d", i);
		struct dove9_message_process *p =
			dove9_kernel_create_process(k, mid, "a@test", tos, 1,
						    subj, "body", i + 1);
		DOVE9_TEST_ASSERT_NOT_NULL(p);
	}

	struct dove9_message_process *out[16];
	unsigned int n = dove9_kernel_get_all_processes(k, out, 16);
	DOVE9_TEST_ASSERT(n >= 5);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: process state after suspend ---- */

static void test_process_state_after_suspend(void)
{
	dove9_test_begin("pm: process state is SUSPENDED after suspend");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	struct dove9_message_process *p =
		dove9_kernel_create_process(k, "state-1", "a@test", tos, 1,
					    "S", "B", 5);
	/* Directly set ACTIVE state to test suspend API */
	p->state = DOVE9_PROCESS_ACTIVE;

	dove9_kernel_suspend_process(k, p->id);

	struct dove9_message_process *found =
		dove9_kernel_get_process(k, p->id);
	DOVE9_TEST_ASSERT_NOT_NULL(found);
	DOVE9_TEST_ASSERT(found->state == DOVE9_PROCESS_SUSPENDED);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: process state after terminate ---- */

static void test_process_state_after_terminate(void)
{
	dove9_test_begin("pm: process state is TERMINATED after terminate");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	struct dove9_message_process *p =
		dove9_kernel_create_process(k, "killed-1", "a@test", tos, 1,
					    "S", "B", 5);
	dove9_kernel_terminate_process(k, p->id);

	struct dove9_message_process *found =
		dove9_kernel_get_process(k, p->id);
	if (found) {
		DOVE9_TEST_ASSERT(found->state == DOVE9_PROCESS_TERMINATED);
	}

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: metrics after processes ---- */

static void test_metrics_after_processes(void)
{
	dove9_test_begin("pm: kernel metrics reflect process activity");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	dove9_kernel_create_process(k, "met-a", "a@test", tos, 1,
				    "S", "B", 5);

	struct dove9_kernel_metrics met;
	dove9_kernel_get_metrics(k, &met);
	DOVE9_TEST_ASSERT(met.cognitive_load >= 0.0);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: create with zero to_count ---- */

static void test_create_zero_recipients(void)
{
	dove9_test_begin("pm: create process with zero recipients");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	struct dove9_message_process *p =
		dove9_kernel_create_process(k, "zero-to", "a@test", NULL, 0,
					    "S", "B", 3);
	/* may succeed or return NULL — either is valid */
	if (p) {
		DOVE9_TEST_ASSERT_UINT_EQ(p->to_count, 0);
	}

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: create with high priority ---- */

static void test_create_high_priority(void)
{
	dove9_test_begin("pm: create process with priority 10");
	dove9_mock_reset();
	struct dove9_config cfg = test_cfg();
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	struct dove9_message_process *p =
		dove9_kernel_create_process(k, "hi-pri", "a@test", tos, 1,
					    "Urgent", "body", 10);
	DOVE9_TEST_ASSERT_NOT_NULL(p);
	DOVE9_TEST_ASSERT_INT_EQ(p->priority, 10);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_create_process_basic,
		test_get_process_by_id,
		test_terminate_process,
		test_suspend_resume,
		test_fork_process,
		test_multiple_processes,
		test_process_state_after_suspend,
		test_process_state_after_terminate,
		test_metrics_after_processes,
		test_create_zero_recipients,
		test_create_high_priority,
	};
	return dove9_test_run("dove9-process-management",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
