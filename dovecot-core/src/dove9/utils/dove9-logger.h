/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_LOGGER_H
#define DOVE9_LOGGER_H

/*
 * Logger utility for Dove9 cognitive operating system.
 * Provides consistent logging for triadic cognitive engine and kernel.
 */

enum dove9_log_level {
	DOVE9_LOG_DEBUG = 0,
	DOVE9_LOG_INFO  = 1,
	DOVE9_LOG_WARN  = 2,
	DOVE9_LOG_ERROR = 3,
};

struct dove9_logger;

/* Create / destroy */
struct dove9_logger *dove9_logger_create(const char *context);
struct dove9_logger *dove9_logger_create_child(const struct dove9_logger *parent,
					       const char *sub_context);
void dove9_logger_destroy(struct dove9_logger **logger);

/* Global minimum level */
void dove9_log_set_level(enum dove9_log_level level);
enum dove9_log_level dove9_log_get_level(void);

/* Logging functions */
void dove9_log_debug(const struct dove9_logger *logger, const char *fmt, ...)
	__attribute__((format(printf, 2, 3)));
void dove9_log_info(const struct dove9_logger *logger, const char *fmt, ...)
	__attribute__((format(printf, 2, 3)));
void dove9_log_warn(const struct dove9_logger *logger, const char *fmt, ...)
	__attribute__((format(printf, 2, 3)));
void dove9_log_error(const struct dove9_logger *logger, const char *fmt, ...)
	__attribute__((format(printf, 2, 3)));

#endif /* DOVE9_LOGGER_H */
