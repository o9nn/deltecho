/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-test-common.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

/* ---- Internal state ---- */

static const char *current_test_name = NULL;
static bool current_test_success = true;
static unsigned int pass_count = 0;
static unsigned int fail_count = 0;

/* Color support */
static bool use_color(void)
{
	const char *nc = getenv("NO_COLOR");
	return (nc == NULL || nc[0] == '\0');
}

static const char *color_green(void) { return use_color() ? "\033[32m" : ""; }
static const char *color_red(void)   { return use_color() ? "\033[31m" : ""; }
static const char *color_reset(void) { return use_color() ? "\033[0m" : ""; }

/* ---- Public API ---- */

void dove9_test_begin(const char *name)
{
	current_test_name = name;
	current_test_success = true;
}

void dove9_test_end(void)
{
	if (current_test_success) {
		pass_count++;
		fprintf(stderr, "  %sPASS%s: %s\n",
			color_green(), color_reset(), current_test_name);
	} else {
		fail_count++;
		fprintf(stderr, "  %sFAIL%s: %s\n",
			color_red(), color_reset(), current_test_name);
	}
	current_test_name = NULL;
}

void dove9_test_assert(bool condition, const char *expr,
		       const char *file, int line)
{
	if (!condition) {
		current_test_success = false;
		fprintf(stderr, "    ASSERT FAILED: %s (%s:%d)\n",
			expr, file, line);
	}
}

void dove9_test_assert_str_eq(const char *a, const char *b,
			      const char *file, int line)
{
	if (a == NULL && b == NULL)
		return;
	if (a == NULL || b == NULL || strcmp(a, b) != 0) {
		current_test_success = false;
		fprintf(stderr,
			"    ASSERT STR_EQ FAILED: \"%s\" != \"%s\" (%s:%d)\n",
			a ? a : "(null)", b ? b : "(null)", file, line);
	}
}

void dove9_test_assert_int_eq(int a, int b,
			      const char *file, int line)
{
	if (a != b) {
		current_test_success = false;
		fprintf(stderr,
			"    ASSERT INT_EQ FAILED: %d != %d (%s:%d)\n",
			a, b, file, line);
	}
}

void dove9_test_assert_uint_eq(unsigned int a, unsigned int b,
			       const char *file, int line)
{
	if (a != b) {
		current_test_success = false;
		fprintf(stderr,
			"    ASSERT UINT_EQ FAILED: %u != %u (%s:%d)\n",
			a, b, file, line);
	}
}

void dove9_test_assert_double_eq(double a, double b, double epsilon,
				 const char *file, int line)
{
	if (fabs(a - b) > epsilon) {
		current_test_success = false;
		fprintf(stderr,
			"    ASSERT DOUBLE_EQ FAILED: %f != %f (eps=%f) (%s:%d)\n",
			a, b, epsilon, file, line);
	}
}

void dove9_test_assert_not_null(const void *ptr, const char *expr,
				const char *file, int line)
{
	if (ptr == NULL) {
		current_test_success = false;
		fprintf(stderr,
			"    ASSERT NOT_NULL FAILED: %s is NULL (%s:%d)\n",
			expr, file, line);
	}
}

void dove9_test_assert_null(const void *ptr, const char *expr,
			    const char *file, int line)
{
	if (ptr != NULL) {
		current_test_success = false;
		fprintf(stderr,
			"    ASSERT NULL FAILED: %s is not NULL (%s:%d)\n",
			expr, file, line);
	}
}

int dove9_test_run(const char *suite_name, dove9_test_fn tests[],
		   unsigned int count)
{
	unsigned int i;

	pass_count = 0;
	fail_count = 0;

	fprintf(stderr, "\n=== %s (%u tests) ===\n", suite_name, count);

	for (i = 0; i < count; i++)
		tests[i]();

	fprintf(stderr, "\n--- Results: %u passed, %u failed ---\n\n",
		pass_count, fail_count);

	return (fail_count > 0) ? 1 : 0;
}

unsigned int dove9_test_get_pass_count(void)
{
	return pass_count;
}

unsigned int dove9_test_get_fail_count(void)
{
	return fail_count;
}
