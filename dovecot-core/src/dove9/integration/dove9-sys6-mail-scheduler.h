/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_SYS6_MAIL_SCHEDULER_H
#define DOVE9_SYS6_MAIL_SCHEDULER_H

#include "../types/dove9-types.h"

struct dove9_sys6_mail_scheduler;

/* ----------------------------------------------------------------
 * Constants
 * ---------------------------------------------------------------- */

#define SYS6_CYCLE_LENGTH  30
#define DOVE9_CYCLE_LENGTH 12
#define GRAND_CYCLE_LENGTH 60   /* LCM(30, 12) */

/* ----------------------------------------------------------------
 * Schedule result
 * ---------------------------------------------------------------- */

struct dove9_mail_schedule_result {
	char process_id[DOVE9_MAX_ID_LEN];
	char message_id[DOVE9_MAX_ID_LEN];
	unsigned int scheduled_step;
	unsigned int scheduled_grand_cycle_step;
	unsigned int sys6_phase;    /* 1-3 */
	unsigned int sys6_stage;    /* 1-5 */
	unsigned int sys6_step;     /* 1-2 */
	unsigned int dove9_stream;  /* 1-3 */
	unsigned int dove9_triad;   /* 0-3 */
	int priority;
	unsigned int estimated_completion_step;
};

/* ----------------------------------------------------------------
 * Scheduler configuration
 * ---------------------------------------------------------------- */

struct dove9_sys6_scheduler_config {
	bool enable_operadic_scheduling;
	unsigned int max_processes_per_grand_cycle;
	int urgent_priority_boost;
	int flagged_priority_boost;
	int reply_priority_boost;
	unsigned int base_processing_steps;
};

static inline struct dove9_sys6_scheduler_config
dove9_sys6_scheduler_config_default(void)
{
	struct dove9_sys6_scheduler_config c;
	c.enable_operadic_scheduling = true;
	c.max_processes_per_grand_cycle = 30;
	c.urgent_priority_boost = 3;
	c.flagged_priority_boost = 2;
	c.reply_priority_boost = 1;
	c.base_processing_steps = 6;
	return c;
}

/* ----------------------------------------------------------------
 * Scheduler state (read-only snapshot)
 * ---------------------------------------------------------------- */

struct dove9_scheduler_state {
	unsigned int current_step;
	unsigned int current_grand_cycle;
	unsigned int sys6_step;
	unsigned int sys6_cycle;
	unsigned int dove9_step;
	unsigned int dove9_cycle;
	unsigned int scheduled_count;
	unsigned int completed_count;
	unsigned int queue_count;
};

/* ----------------------------------------------------------------
 * Cycle positions
 * ---------------------------------------------------------------- */

struct dove9_cycle_positions {
	unsigned int grand_cycle;
	unsigned int grand_step;
	unsigned int sys6_cycle;
	unsigned int sys6_step;
	unsigned int dove9_cycle;
	unsigned int dove9_step;
	double sys6_progress;
	double dove9_progress;
	double grand_progress;
};

/* ----------------------------------------------------------------
 * Next scheduling slot
 * ---------------------------------------------------------------- */

struct dove9_next_slot {
	unsigned int step;
	unsigned int phase;  /* 1-3 */
	unsigned int stage;  /* 1-5 */
	unsigned int stream; /* 1-3 */
};

/* ----------------------------------------------------------------
 * Event types
 * ---------------------------------------------------------------- */

enum dove9_scheduler_event_type {
	DOVE9_SCHED_PROCESS_SCHEDULED,
	DOVE9_SCHED_PROCESS_READY,
	DOVE9_SCHED_PROCESS_COMPLETED,
	DOVE9_SCHED_GRAND_CYCLE_BOUNDARY,
	DOVE9_SCHED_SYS6_CYCLE_BOUNDARY,
	DOVE9_SCHED_DOVE9_CYCLE_BOUNDARY,
	DOVE9_SCHED_CAPACITY_WARNING,
};

struct dove9_scheduler_event {
	enum dove9_scheduler_event_type type;
	union {
		struct {
			struct dove9_mail_schedule_result result;
		} process_scheduled;
		struct {
			char process_id[DOVE9_MAX_ID_LEN];
			unsigned int step;
		} process_ready;
		struct {
			char process_id[DOVE9_MAX_ID_LEN];
			int duration;
		} process_completed;
		struct {
			unsigned int cycle;
		} cycle_boundary;
		struct {
			unsigned int active_count;
			unsigned int max_count;
		} capacity_warning;
	} data;
};

typedef void (*dove9_scheduler_event_fn)(
	const struct dove9_scheduler_event *event, void *context);

/* ----------------------------------------------------------------
 * Utility
 * ---------------------------------------------------------------- */

/* Priority-to-phase mapping: 7-9 → phase 1, 4-6 → phase 2, 1-3 → phase 3 */
static inline unsigned int dove9_sys6_priority_to_phase(int priority)
{
	if (priority >= 7) return 1;
	if (priority >= 4) return 2;
	return 3;
}

/* ----------------------------------------------------------------
 * API
 * ---------------------------------------------------------------- */

struct dove9_sys6_mail_scheduler *
dove9_sys6_scheduler_create(unsigned int step_duration_ms,
			    const struct dove9_sys6_scheduler_config *config);

void dove9_sys6_scheduler_destroy(
	struct dove9_sys6_mail_scheduler **scheduler);

/* Lifecycle */
void dove9_sys6_scheduler_start(struct dove9_sys6_mail_scheduler *s);
void dove9_sys6_scheduler_stop(struct dove9_sys6_mail_scheduler *s);
bool dove9_sys6_scheduler_is_running(
	const struct dove9_sys6_mail_scheduler *s);

/* Event subscription */
void dove9_sys6_scheduler_on(struct dove9_sys6_mail_scheduler *s,
			     dove9_scheduler_event_fn handler,
			     void *context);

/* Scheduling */
struct dove9_mail_schedule_result
dove9_sys6_scheduler_schedule_mail(struct dove9_sys6_mail_scheduler *s,
				   const struct dove9_mail_message *mail,
				   const struct dove9_message_process *process);

void dove9_sys6_scheduler_complete_process(
	struct dove9_sys6_mail_scheduler *s,
	const char *process_id);

/* Advance step (non-timer mode) */
void dove9_sys6_scheduler_advance_step(struct dove9_sys6_mail_scheduler *s);

/* Query */
const struct dove9_mail_schedule_result *
dove9_sys6_scheduler_get_schedule(const struct dove9_sys6_mail_scheduler *s,
				  const char *process_id);

unsigned int
dove9_sys6_scheduler_get_all_schedules(
	const struct dove9_sys6_mail_scheduler *s,
	const struct dove9_mail_schedule_result **out,
	unsigned int max_out);

unsigned int
dove9_sys6_scheduler_get_pending_count(
	const struct dove9_sys6_mail_scheduler *s);

void dove9_sys6_scheduler_get_state(
	const struct dove9_sys6_mail_scheduler *s,
	struct dove9_scheduler_state *out);

void dove9_sys6_scheduler_get_cycle_positions(
	const struct dove9_sys6_mail_scheduler *s,
	struct dove9_cycle_positions *out);

struct dove9_next_slot
dove9_sys6_scheduler_get_next_slot(
	const struct dove9_sys6_mail_scheduler *s,
	int priority);

#endif /* DOVE9_SYS6_MAIL_SCHEDULER_H */
