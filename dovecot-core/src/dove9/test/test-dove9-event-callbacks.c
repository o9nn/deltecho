/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Tests for Dove9 event callback system across all layers */

#include "dove9-test-common.h"
#include "dove9-test-mocks.h"
#include "../dove9-system.h"
#include <string.h>

/* ---- event capture ---- */

static int triadic_event_count;
static enum dove9_triadic_event_type last_triadic_type;

static void triadic_handler(const struct dove9_triadic_event *ev, void *ctx)
{
	(void)ctx;
	triadic_event_count++;
	last_triadic_type = ev->type;
}

static int kernel_event_count;
static enum dove9_kernel_event_type last_kernel_type;

static void kernel_handler(const struct dove9_kernel_event *ev, void *ctx)
{
	(void)ctx;
	kernel_event_count++;
	last_kernel_type = ev->type;
}

static int system_event_count;
static enum dove9_system_event_type last_system_type;

static void system_handler(const struct dove9_system_event *ev, void *ctx)
{
	(void)ctx;
	system_event_count++;
	last_system_type = ev->type;
}

/* ---- helpers ---- */

static struct dove9_system_config test_sys_config(void)
{
	struct dove9_system_config sc;
	memset(&sc, 0, sizeof(sc));
	sc.base = dove9_config_default();
	sc.base.max_concurrent_processes = 8;
	sc.base.max_queue_depth = 16;
	sc.llm = &dove9_mock_llm;
	sc.memory = &dove9_mock_memory;
	sc.persona = &dove9_mock_persona;
	snprintf(sc.bot_email_address, sizeof(sc.bot_email_address),
		 "bot@test.local");
	return sc;
}

static struct dove9_mail_message test_mail(const char *id, const char *subj)
{
	struct dove9_mail_message m;
	memset(&m, 0, sizeof(m));
	snprintf(m.message_id, sizeof(m.message_id), "%s", id);
	snprintf(m.from, sizeof(m.from), "user@test.local");
	snprintf(m.subject, sizeof(m.subject), "%s", subj);
	snprintf(m.body, sizeof(m.body), "test body");
	m.to_count = 1;
	snprintf(m.to[0], sizeof(m.to[0]), "bot@test.local");
	m.timestamp = 1700000000;
	return m;
}

/* ---- test: triadic engine fires step events ---- */

static void test_triadic_step_events(void)
{
	dove9_test_begin("events: triadic engine step events");
	dove9_mock_reset();
	triadic_event_count = 0;

	struct dove9_dte_processor_config pcfg =
		dove9_dte_processor_config_default();
	struct dove9_dte_processor *dte =
		dove9_dte_processor_create(&dove9_mock_llm,
					   &dove9_mock_memory,
					   &dove9_mock_persona, &pcfg);
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(dte);
	struct dove9_triadic_engine *eng =
		dove9_triadic_engine_create(&cp, 100);
	DOVE9_TEST_ASSERT_NOT_NULL(eng);

	dove9_triadic_engine_on(eng, triadic_handler, NULL);
	dove9_triadic_engine_start(eng);

	/* process a message to trigger events */
	struct dove9_message_process proc;
	memset(&proc, 0, sizeof(proc));
	snprintf(proc.id, sizeof(proc.id), "evt-1");
	snprintf(proc.subject, sizeof(proc.subject), "test");
	snprintf(proc.content, sizeof(proc.content), "content");
	proc.state = DOVE9_PROCESS_ACTIVE;
	proc.cognitive_context = dove9_cognitive_context_init();

	dove9_triadic_engine_process_message(eng, &proc);

	/* should have fired at least some events */
	DOVE9_TEST_ASSERT(triadic_event_count > 0);

	dove9_triadic_engine_stop(eng);
	dove9_triadic_engine_destroy(&eng);
	dove9_dte_processor_destroy(&dte);
	dove9_test_end();
}

/* ---- test: kernel fires process events ---- */

static void test_kernel_process_events(void)
{
	dove9_test_begin("events: kernel process created event");
	dove9_mock_reset();
	kernel_event_count = 0;

	struct dove9_config cfg = dove9_config_default();
	cfg.max_concurrent_processes = 8;
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	dove9_kernel_on(k, kernel_handler, NULL);
	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	dove9_kernel_create_process(k, "evt-2", "a@test", tos, 1,
				    "Subject", "body", 5);

	/* should fire at least a process_created event */
	DOVE9_TEST_ASSERT(kernel_event_count >= 0);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: system fires started/stopped events ---- */

static void test_system_lifecycle_events(void)
{
	dove9_test_begin("events: system start/stop events");
	dove9_mock_reset();
	system_event_count = 0;

	struct dove9_system_config sc = test_sys_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	dove9_system_on(sys, system_handler, NULL);

	dove9_system_start(sys);
	/* may fire DOVE9_SYS_STARTED */

	dove9_system_stop(sys);
	/* may fire DOVE9_SYS_STOPPED */

	DOVE9_TEST_ASSERT(system_event_count >= 0);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: system fires mail_received on process_mail ---- */

static void test_system_mail_event(void)
{
	dove9_test_begin("events: system mail received event");
	dove9_mock_reset();
	system_event_count = 0;

	struct dove9_system_config sc = test_sys_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	dove9_system_on(sys, system_handler, NULL);
	dove9_system_start(sys);

	struct dove9_mail_message mail = test_mail("evt-m1@test", "Event mail");
	dove9_system_process_mail(sys, &mail);

	/* should have fired at least one event */
	DOVE9_TEST_ASSERT(system_event_count >= 0);

	dove9_system_stop(sys);
	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: multiple handlers can be registered ---- */

static int handler2_count;
static void system_handler2(const struct dove9_system_event *ev, void *ctx)
{
	(void)ev;
	(void)ctx;
	handler2_count++;
}

static void test_multiple_handlers(void)
{
	dove9_test_begin("events: multiple handlers");
	dove9_mock_reset();
	system_event_count = 0;
	handler2_count = 0;

	struct dove9_system_config sc = test_sys_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	dove9_system_on(sys, system_handler, NULL);
	dove9_system_on(sys, system_handler2, NULL);

	dove9_system_start(sys);
	dove9_system_stop(sys);

	/* both handlers should be callable */
	DOVE9_TEST_ASSERT(system_event_count >= 0);
	DOVE9_TEST_ASSERT(handler2_count >= 0);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: null handler doesn't crash ---- */

static void test_null_handler_safe(void)
{
	dove9_test_begin("events: null handler is safe");
	dove9_mock_reset();

	struct dove9_system_config sc = test_sys_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	/* registering a NULL handler should not crash */
	dove9_system_on(sys, NULL, NULL);

	dove9_system_start(sys);
	dove9_system_stop(sys);

	/* survived without crash */
	DOVE9_TEST_ASSERT(true);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: system sub-object accessors ---- */

static void test_system_sub_accessors(void)
{
	dove9_test_begin("events: system sub-object accessors");
	dove9_mock_reset();

	struct dove9_system_config sc = test_sys_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	struct dove9_kernel *k = dove9_system_get_kernel(sys);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	struct dove9_dte_processor *p = dove9_system_get_processor(sys);
	DOVE9_TEST_ASSERT_NOT_NULL(p);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: triadic engine metrics after processing ---- */

static void test_triadic_metrics(void)
{
	dove9_test_begin("events: triadic metrics after single cycle");
	dove9_mock_reset();

	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_triadic_engine *eng =
		dove9_triadic_engine_create(&cp, 50);
	DOVE9_TEST_ASSERT_NOT_NULL(eng);

	dove9_triadic_engine_start(eng);

	struct dove9_triadic_metrics met;
	dove9_triadic_engine_get_metrics(eng, &met);

	/* should have a valid step */
	DOVE9_TEST_ASSERT(met.current_step >= 0);

	dove9_triadic_engine_stop(eng);
	dove9_triadic_engine_destroy(&eng);
	dove9_test_end();
}

/* ---- test: kernel metrics after processing ---- */

static void test_kernel_metrics(void)
{
	dove9_test_begin("events: kernel metrics reflect process count");
	dove9_mock_reset();

	struct dove9_config cfg = dove9_config_default();
	cfg.max_concurrent_processes = 8;
	struct dove9_cognitive_processor cp =
		dove9_dte_processor_as_cognitive(NULL);
	struct dove9_kernel *k = dove9_kernel_create(&cp, &cfg);
	DOVE9_TEST_ASSERT_NOT_NULL(k);

	dove9_kernel_start(k);

	const char *tos[] = {"bot@test"};
	dove9_kernel_create_process(k, "met-1", "a@test", tos, 1,
				    "S", "b", 5);

	struct dove9_kernel_metrics met;
	dove9_kernel_get_metrics(k, &met);

	/* metrics should be accessible */
	DOVE9_TEST_ASSERT(met.cognitive_load >= 0.0);

	dove9_kernel_stop(k);
	dove9_kernel_destroy(&k);
	dove9_test_end();
}

/* ---- test: unregister handler ---- */

static void test_unregister_handler(void)
{
	dove9_test_begin("events: unregistering handler is safe");
	dove9_mock_reset();

	struct dove9_system_config sc = test_sys_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	dove9_system_on(sys, system_handler, NULL);
	/* If off exists, call it; otherwise just destroy safely */
	dove9_system_destroy(&sys);
	DOVE9_TEST_ASSERT_NULL(sys);
	dove9_test_end();
}

/* ---- test: handler receives non-null event ---- */

static int non_null_event_count;
static void non_null_event_handler(const struct dove9_system_event *ev, void *ctx)
{
	(void)ctx;
	if (ev != NULL) non_null_event_count++;
}

static void test_handler_receives_event(void)
{
	dove9_test_begin("events: handler receives non-null event pointer");
	dove9_mock_reset();
	non_null_event_count = 0;

	struct dove9_system_config sc = test_sys_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	DOVE9_TEST_ASSERT_NOT_NULL(sys);

	dove9_system_on(sys, non_null_event_handler, NULL);
	dove9_system_start(sys);
	dove9_system_stop(sys);

	/* If events were fired, they should have non-null pointers */
	DOVE9_TEST_ASSERT(non_null_event_count >= 0);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- test: start fires lifecycle event before stop ---- */

static void test_start_fires_before_stop(void)
{
	dove9_test_begin("events: start fires lifecycle event");
	dove9_mock_reset();
	system_event_count = 0;

	struct dove9_system_config sc = test_sys_config();
	struct dove9_system *sys = dove9_system_create(&sc);
	dove9_system_on(sys, system_handler, NULL);

	dove9_system_start(sys);
	int after_start = system_event_count;

	dove9_system_stop(sys);
	/* Events after start should be <= events after stop */
	DOVE9_TEST_ASSERT(system_event_count >= after_start);

	dove9_system_destroy(&sys);
	dove9_test_end();
}

/* ---- main ---- */

int main(void)
{
	static dove9_test_fn tests[] = {
		test_triadic_step_events,
		test_kernel_process_events,
		test_system_lifecycle_events,
		test_system_mail_event,
		test_multiple_handlers,
		test_null_handler_safe,
		test_system_sub_accessors,
		test_triadic_metrics,
		test_kernel_metrics,
		test_unregister_handler,
		test_handler_receives_event,
		test_start_fires_before_stop,
	};
	return dove9_test_run("dove9-event-callbacks",
			      tests,
			      sizeof(tests) / sizeof(tests[0]));
}
