/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/* Unit tests for dove9-logger */

#include "dove9-test-common.h"
#include "../utils/dove9-logger.h"

#include <stdlib.h>
#include <string.h>

static void test_logger_create(void)
{
	struct dove9_logger *l = dove9_logger_create("test");

	dove9_test_begin("logger_create returns non-NULL");
	DOVE9_TEST_ASSERT_NOT_NULL(l);
	dove9_logger_destroy(&l);
	dove9_test_end();
}

static void test_logger_create_child(void)
{
	struct dove9_logger *parent = dove9_logger_create("parent");
	struct dove9_logger *child = dove9_logger_create_child(parent, "child");

	dove9_test_begin("logger_create_child returns non-NULL");
	DOVE9_TEST_ASSERT_NOT_NULL(child);
	dove9_logger_destroy(&child);
	dove9_logger_destroy(&parent);
	dove9_test_end();
}

static void test_logger_destroy_nulls_pointer(void)
{
	struct dove9_logger *l = dove9_logger_create("test");

	dove9_test_begin("logger_destroy NULLs pointer");
	dove9_logger_destroy(&l);
	DOVE9_TEST_ASSERT_NULL(l);
	dove9_test_end();
}

static void test_logger_log_no_crash(void)
{
	struct dove9_logger *l = dove9_logger_create("test");

	dove9_test_begin("log functions do not crash");
	dove9_log_debug(l, "debug message %d", 42);
	dove9_log_info(l, "info message %s", "hello");
	dove9_log_warn(l, "warn message");
	dove9_log_error(l, "error message %f", 3.14);
	DOVE9_TEST_ASSERT(true); /* If we get here, no crash */
	dove9_logger_destroy(&l);
	dove9_test_end();
}

static void test_logger_double_destroy(void)
{
	struct dove9_logger *l = dove9_logger_create("test");

	dove9_test_begin("double destroy is safe");
	dove9_logger_destroy(&l);
	DOVE9_TEST_ASSERT_NULL(l);
	dove9_logger_destroy(&l);
	DOVE9_TEST_ASSERT_NULL(l);
	dove9_test_end();
}

static void test_logger_child_depth(void)
{
	struct dove9_logger *root, *child1, *child2;

	dove9_test_begin("child-of-child creates 3-level hierarchy");
	root = dove9_logger_create("root");
	child1 = dove9_logger_create_child(root, "child1");
	child2 = dove9_logger_create_child(child1, "child2");

	DOVE9_TEST_ASSERT_NOT_NULL(root);
	DOVE9_TEST_ASSERT_NOT_NULL(child1);
	DOVE9_TEST_ASSERT_NOT_NULL(child2);

	dove9_log_info(child2, "deep log");

	dove9_logger_destroy(&child2);
	dove9_logger_destroy(&child1);
	dove9_logger_destroy(&root);
	dove9_test_end();
}

static void test_logger_null_name(void)
{
	dove9_test_begin("logger create with NULL name");
	struct dove9_logger *l = dove9_logger_create(NULL);
	/* should handle gracefully - either NULL return or valid logger */
	if (l != NULL) {
		dove9_logger_destroy(&l);
	}
	DOVE9_TEST_ASSERT(true); /* no crash */
	dove9_test_end();
}

static void test_logger_empty_name(void)
{
	dove9_test_begin("logger create with empty name");
	struct dove9_logger *l = dove9_logger_create("");
	DOVE9_TEST_ASSERT_NOT_NULL(l);
	dove9_log_info(l, "empty name logger works");
	dove9_logger_destroy(&l);
	dove9_test_end();
}

static void test_logger_long_message(void)
{
	dove9_test_begin("logger handles long messages");
	struct dove9_logger *l = dove9_logger_create("longmsg");
	char buf[4096];
	memset(buf, 'A', sizeof(buf) - 1);
	buf[sizeof(buf) - 1] = '\0';
	dove9_log_info(l, "%s", buf);
	DOVE9_TEST_ASSERT(true); /* no crash */
	dove9_logger_destroy(&l);
	dove9_test_end();
}

static void test_logger_child_null_parent(void)
{
	dove9_test_begin("logger child with NULL parent");
	struct dove9_logger *child = dove9_logger_create_child(NULL, "orphan");
	/* should handle gracefully */
	if (child != NULL) {
		dove9_logger_destroy(&child);
	}
	DOVE9_TEST_ASSERT(true); /* no crash */
	dove9_test_end();
}

int main(void)
{
	dove9_test_fn tests[] = {
		test_logger_create,
		test_logger_create_child,
		test_logger_destroy_nulls_pointer,
		test_logger_log_no_crash,
		test_logger_double_destroy,
		test_logger_child_depth,
		test_logger_null_name,
		test_logger_empty_name,
		test_logger_long_message,
		test_logger_child_null_parent,
	};
	return dove9_test_run("dove9-logger", tests,
			      sizeof(tests) / sizeof(tests[0]));
}
