/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-kernel: process table CRUD, state transitions,
   fork, max capacity, mail protocol round-trip, metrics. */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../core/dove9-kernel.h"
#include "../types/dove9-types.h"

#include <string.h>

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

static struct dove9_kernel *make_test_kernel(void)
{
	struct dove9_config cfg = dove9_config_default();
	struct dove9_dte_processor_config pcfg =
		dove9_dte_processor_config_default();
	struct dove9_dte_processor *dte;
	struct dove9_cognitive_processor cproc;
	struct dove9_kernel *kernel;

	dte = dove9_dte_processor_create(&dove9_mock_llm,
					 &dove9_mock_memory,
					 &dove9_mock_persona,
					 &pcfg);
	cproc = dove9_dte_processor_as_cognitive(dte);
	kernel = dove9_kernel_create(&cproc, &cfg);
	return kernel;
}

static struct dove9_message_process *
spawn_test_process(struct dove9_kernel *kernel, const char *subject, int prio)
{
	const char *to[] = { "test@example.com" };
	return dove9_kernel_create_process(kernel,
					   "msg-1", "sender@test.com",
					   to, 1,
					   subject, "body text", prio);
}

/* ----------------------------------------------------------------
 * Tests
 * ---------------------------------------------------------------- */

static void test_kernel_create(void)
{
	struct dove9_kernel *kernel;

	dove9_test_begin("kernel create/destroy");

	kernel = make_test_kernel();
	DOVE9_TEST_ASSERT_NOT_NULL(kernel);
	dove9_kernel_destroy(&kernel);
	DOVE9_TEST_ASSERT_NULL(kernel);

	dove9_test_end();
}

static void test_process_create(void)
{
	struct dove9_kernel *kernel;
	struct dove9_message_process *proc;

	dove9_test_begin("create_process returns non-NULL with valid id");

	kernel = make_test_kernel();
	proc = spawn_test_process(kernel, "test-message", 5);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT(proc->id[0] != '\0');
	DOVE9_TEST_ASSERT_INT_EQ((int)proc->state, (int)DOVE9_PROCESS_PENDING);
	DOVE9_TEST_ASSERT_INT_EQ(proc->priority, 5);

	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_process_state_transitions(void)
{
	struct dove9_kernel *kernel;
	struct dove9_message_process *proc;

	dove9_test_begin("process state: PENDING -> tick advances state");

	kernel = make_test_kernel();
	proc = spawn_test_process(kernel, "test-msg", 5);

	DOVE9_TEST_ASSERT_INT_EQ((int)proc->state, (int)DOVE9_PROCESS_PENDING);

	dove9_kernel_start(kernel);
	dove9_kernel_tick(kernel);

	proc = dove9_kernel_get_process(kernel, proc->id);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT((int)proc->state != (int)DOVE9_PROCESS_PENDING);

	dove9_kernel_stop(kernel);
	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_process_suspend_resume(void)
{
	struct dove9_kernel *kernel;
	struct dove9_message_process *proc;
	bool ok;

	dove9_test_begin("process suspend and resume");

	kernel = make_test_kernel();
	proc = spawn_test_process(kernel, "test-msg", 5);
	dove9_kernel_start(kernel);

	/* Suspend only works on ACTIVE processes; tick completes them
	   instantly in this synchronous kernel, so set state directly. */
	proc->state = DOVE9_PROCESS_ACTIVE;

	ok = dove9_kernel_suspend_process(kernel, proc->id);
	DOVE9_TEST_ASSERT(ok);
	proc = dove9_kernel_get_process(kernel, proc->id);
	DOVE9_TEST_ASSERT_INT_EQ((int)proc->state, (int)DOVE9_PROCESS_SUSPENDED);

	ok = dove9_kernel_resume_process(kernel, proc->id);
	DOVE9_TEST_ASSERT(ok);
	proc = dove9_kernel_get_process(kernel, proc->id);
	DOVE9_TEST_ASSERT((int)proc->state != (int)DOVE9_PROCESS_SUSPENDED);

	dove9_kernel_stop(kernel);
	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_process_fork(void)
{
	struct dove9_kernel *kernel;
	struct dove9_message_process *parent, *child;

	dove9_test_begin("fork creates child with parent_id set");

	kernel = make_test_kernel();
	parent = spawn_test_process(kernel, "parent-msg", 5);

	child = dove9_kernel_fork_process(kernel, parent->id,
					  "child-body", "child-subject");
	DOVE9_TEST_ASSERT_NOT_NULL(child);
	DOVE9_TEST_ASSERT(strcmp(child->id, parent->id) != 0);
	DOVE9_TEST_ASSERT_STR_EQ(child->parent_id, parent->id);

	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_max_capacity(void)
{
	struct dove9_kernel *kernel;
	struct dove9_message_process *proc;
	unsigned int i;
	char subj[32];
	const char *to[] = { "rcpt@test.com" };
	char msgid[64];

	dove9_test_begin("create_process returns NULL at max capacity");

	kernel = make_test_kernel();

	/* Fill to capacity */
	for (i = 0; i < DOVE9_MAX_PROCESSES; i++) {
		snprintf(subj, sizeof(subj), "bulk-%u", i);
		snprintf(msgid, sizeof(msgid), "msg-%u", i);
		proc = dove9_kernel_create_process(kernel, msgid,
						   "s@t.com", to, 1,
						   subj, "body", 1);
		if (proc == NULL)
			break;
	}

	/* Next spawn should fail */
	proc = dove9_kernel_create_process(kernel, "overflow-id",
					   "s@t.com", to, 1,
					   "overflow", "body", 1);
	DOVE9_TEST_ASSERT_NULL(proc);

	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_kernel_tick(void)
{
	struct dove9_kernel *kernel;
	struct dove9_message_process *proc;

	dove9_test_begin("tick advances kernel state");

	kernel = make_test_kernel();
	spawn_test_process(kernel, "low-prio", 1);
	proc = spawn_test_process(kernel, "high-prio", 9);

	dove9_kernel_start(kernel);
	dove9_kernel_tick(kernel);

	proc = dove9_kernel_get_process(kernel, proc->id);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT((int)proc->state != (int)DOVE9_PROCESS_PENDING);

	dove9_kernel_stop(kernel);
	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_kernel_metrics(void)
{
	struct dove9_kernel *kernel;
	struct dove9_kernel_metrics metrics;

	dove9_test_begin("metrics report non-zero after ticks");

	kernel = make_test_kernel();
	spawn_test_process(kernel, "test1", 5);
	spawn_test_process(kernel, "test2", 3);

	dove9_kernel_start(kernel);
	dove9_kernel_tick(kernel);
	dove9_kernel_tick(kernel);

	dove9_kernel_get_metrics(kernel, &metrics);
	DOVE9_TEST_ASSERT(metrics.total_steps > 0);

	dove9_kernel_stop(kernel);
	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_process_lookup_by_id(void)
{
	struct dove9_kernel *kernel;
	struct dove9_message_process *proc, *found;

	dove9_test_begin("lookup by id returns correct process");

	kernel = make_test_kernel();
	proc = spawn_test_process(kernel, "find-me", 5);

	found = dove9_kernel_get_process(kernel, proc->id);
	DOVE9_TEST_ASSERT_NOT_NULL(found);
	DOVE9_TEST_ASSERT_STR_EQ(found->id, proc->id);

	/* Non-existent id */
	found = dove9_kernel_get_process(kernel, "no-such-process");
	DOVE9_TEST_ASSERT_NULL(found);

	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

static void test_process_terminate(void)
{
	struct dove9_kernel *kernel;
	struct dove9_message_process *proc;
	bool ok;

	dove9_test_begin("terminate sets TERMINATED state");

	kernel = make_test_kernel();
	proc = spawn_test_process(kernel, "die", 5);
	dove9_kernel_start(kernel);
	dove9_kernel_tick(kernel);

	ok = dove9_kernel_terminate_process(kernel, proc->id);
	DOVE9_TEST_ASSERT(ok);
	proc = dove9_kernel_get_process(kernel, proc->id);
	DOVE9_TEST_ASSERT_NOT_NULL(proc);
	DOVE9_TEST_ASSERT_INT_EQ((int)proc->state,
				 (int)DOVE9_PROCESS_TERMINATED);

	dove9_kernel_stop(kernel);
	dove9_kernel_destroy(&kernel);
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_kernel_create,
		test_process_create,
		test_process_state_transitions,
		test_process_suspend_resume,
		test_process_fork,
		test_max_capacity,
		test_kernel_tick,
		test_kernel_metrics,
		test_process_lookup_by_id,
		test_process_terminate,
	};
	return dove9_test_run("dove9-kernel", tests, 10);
}
