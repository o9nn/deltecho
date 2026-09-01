/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_TEST_COMMON_H
#define DOVE9_TEST_COMMON_H

#include <stdbool.h>

/* ----------------------------------------------------------------
 * Minimal self-contained test framework for Dove9 C layer.
 * Does NOT depend on Dovecot lib/ or lib-test/.
 * Inspired by Dovecot's test_begin/test_assert/test_end pattern.
 * ---------------------------------------------------------------- */

/* Begin a named test case */
void dove9_test_begin(const char *name);

/* End the current test case; prints PASS or FAIL */
void dove9_test_end(void);

/* Assert a boolean condition */
void dove9_test_assert(bool condition, const char *expr,
		       const char *file, int line);

/* Assert two strings are equal */
void dove9_test_assert_str_eq(const char *a, const char *b,
			      const char *file, int line);

/* Assert two integers are equal */
void dove9_test_assert_int_eq(int a, int b,
			      const char *file, int line);

/* Assert unsigned integers are equal */
void dove9_test_assert_uint_eq(unsigned int a, unsigned int b,
			       const char *file, int line);

/* Assert a double is approximately equal (within epsilon) */
void dove9_test_assert_double_eq(double a, double b, double epsilon,
				 const char *file, int line);

/* Assert a pointer is not NULL */
void dove9_test_assert_not_null(const void *ptr, const char *expr,
				const char *file, int line);

/* Assert a pointer is NULL */
void dove9_test_assert_null(const void *ptr, const char *expr,
			    const char *file, int line);

/* Convenience macros */
#define DOVE9_TEST_ASSERT(expr) \
	dove9_test_assert((expr), #expr, __FILE__, __LINE__)

#define DOVE9_TEST_ASSERT_STR_EQ(a, b) \
	dove9_test_assert_str_eq((a), (b), __FILE__, __LINE__)

#define DOVE9_TEST_ASSERT_INT_EQ(a, b) \
	dove9_test_assert_int_eq((a), (b), __FILE__, __LINE__)

#define DOVE9_TEST_ASSERT_UINT_EQ(a, b) \
	dove9_test_assert_uint_eq((a), (b), __FILE__, __LINE__)

#define DOVE9_TEST_ASSERT_DOUBLE_EQ(a, b, eps) \
	dove9_test_assert_double_eq((a), (b), (eps), __FILE__, __LINE__)

#define DOVE9_TEST_ASSERT_NOT_NULL(ptr) \
	dove9_test_assert_not_null((ptr), #ptr, __FILE__, __LINE__)

#define DOVE9_TEST_ASSERT_NULL(ptr) \
	dove9_test_assert_null((ptr), #ptr, __FILE__, __LINE__)

/* Run a suite of test functions. Returns 0 on all-pass, 1 on any failure. */
typedef void (*dove9_test_fn)(void);
int dove9_test_run(const char *suite_name, dove9_test_fn tests[],
		   unsigned int count);

/* Global counters (read-only access for custom reporting) */
unsigned int dove9_test_get_pass_count(void);
unsigned int dove9_test_get_fail_count(void);

#endif /* DOVE9_TEST_COMMON_H */
