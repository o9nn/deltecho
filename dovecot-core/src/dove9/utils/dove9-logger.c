/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-logger.h"

#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>
#include <time.h>
#include <stdbool.h>

#define DOVE9_LOGGER_CONTEXT_MAX 256

struct dove9_logger {
	char context[DOVE9_LOGGER_CONTEXT_MAX];
};

static enum dove9_log_level min_level = DOVE9_LOG_INFO;
static bool enable_colors = true;

/* ANSI color codes */
static const char *const color_reset   = "\033[0m";
static const char *const color_debug   = "\033[36m";
static const char *const color_info    = "\033[32m";
static const char *const color_warn    = "\033[33m";
static const char *const color_error   = "\033[31m";
static const char *const color_context = "\033[90m";

void dove9_log_set_level(enum dove9_log_level level)
{
	min_level = level;
}

enum dove9_log_level dove9_log_get_level(void)
{
	return min_level;
}

struct dove9_logger *dove9_logger_create(const char *context)
{
	const char *no_color = getenv("NO_COLOR");
	if (no_color != NULL && strcmp(no_color, "true") == 0)
		enable_colors = false;

	const char *env_level = getenv("LOG_LEVEL");
	if (env_level != NULL) {
		if (strcmp(env_level, "debug") == 0)
			min_level = DOVE9_LOG_DEBUG;
		else if (strcmp(env_level, "warn") == 0)
			min_level = DOVE9_LOG_WARN;
		else if (strcmp(env_level, "error") == 0)
			min_level = DOVE9_LOG_ERROR;
	}

	struct dove9_logger *logger = calloc(1, sizeof(*logger));
	if (logger == NULL)
		return NULL;

	const char *safe_context = context != NULL ? context : "";
	size_t context_len = strlen(safe_context);
	if (context_len >= sizeof(logger->context))
		context_len = sizeof(logger->context) - 1;
	memcpy(logger->context, safe_context, context_len);
	logger->context[context_len] = '\0';
	return logger;
}

struct dove9_logger *dove9_logger_create_child(const struct dove9_logger *parent,
					       const char *sub_context)
{
	struct dove9_logger *logger = calloc(1, sizeof(*logger));
	if (logger == NULL)
		return NULL;

	const char *parent_context = parent != NULL ? parent->context : "";
	const char *child_context = sub_context != NULL ? sub_context : "";
	size_t used = strlen(parent_context);
	if (used >= sizeof(logger->context))
		used = sizeof(logger->context) - 1;
	memcpy(logger->context, parent_context, used);

	if (used < sizeof(logger->context) - 1 && used > 0)
		logger->context[used++] = ':';

	size_t remaining = sizeof(logger->context) - 1 - used;
	size_t child_len = strlen(child_context);
	if (child_len > remaining)
		child_len = remaining;
	memcpy(logger->context + used, child_context, child_len);
	logger->context[used + child_len] = '\0';
	return logger;
}

void dove9_logger_destroy(struct dove9_logger **logger)
{
	if (logger == NULL || *logger == NULL)
		return;
	free(*logger);
	*logger = NULL;
}

static const char *level_str(enum dove9_log_level level)
{
	switch (level) {
	case DOVE9_LOG_DEBUG: return "DEBUG";
	case DOVE9_LOG_INFO:  return "INFO ";
	case DOVE9_LOG_WARN:  return "WARN ";
	case DOVE9_LOG_ERROR: return "ERROR";
	}
	return "?????";
}

static const char *level_color(enum dove9_log_level level)
{
	switch (level) {
	case DOVE9_LOG_DEBUG: return color_debug;
	case DOVE9_LOG_INFO:  return color_info;
	case DOVE9_LOG_WARN:  return color_warn;
	case DOVE9_LOG_ERROR: return color_error;
	}
	return color_reset;
}

static void dove9_log_v(const struct dove9_logger *logger,
			enum dove9_log_level level,
			const char *fmt, va_list ap)
{
	if (level < min_level)
		return;

	char timebuf[32];
	time_t now = time(NULL);
	struct tm tm;
#ifdef _WIN32
	gmtime_s(&tm, &now);
#else
	const struct tm *utc = gmtime(&now);
	if (utc != NULL)
		tm = *utc;
	else
		memset(&tm, 0, sizeof(tm));
#endif
	strftime(timebuf, sizeof(timebuf), "%Y-%m-%dT%H:%M:%SZ", &tm);

	FILE *fp = (level >= DOVE9_LOG_WARN) ? stderr : stdout;

	if (enable_colors) {
		fprintf(fp, "%s%s%s %s%s%s %s[%s]%s ",
			color_context, timebuf, color_reset,
			level_color(level), level_str(level), color_reset,
			color_context,
			logger != NULL ? logger->context : "?",
			color_reset);
	} else {
		fprintf(fp, "%s %s [%s] ",
			timebuf, level_str(level),
			logger != NULL ? logger->context : "?");
	}

	vfprintf(fp, fmt, ap);
	fputc('\n', fp);
}

void dove9_log_debug(const struct dove9_logger *logger, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	dove9_log_v(logger, DOVE9_LOG_DEBUG, fmt, ap);
	va_end(ap);
}

void dove9_log_info(const struct dove9_logger *logger, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	dove9_log_v(logger, DOVE9_LOG_INFO, fmt, ap);
	va_end(ap);
}

void dove9_log_warn(const struct dove9_logger *logger, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	dove9_log_v(logger, DOVE9_LOG_WARN, fmt, ap);
	va_end(ap);
}

void dove9_log_error(const struct dove9_logger *logger, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	dove9_log_v(logger, DOVE9_LOG_ERROR, fmt, ap);
	va_end(ap);
}
