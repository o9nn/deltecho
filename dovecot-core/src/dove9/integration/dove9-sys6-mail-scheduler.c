/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-sys6-mail-scheduler.h"
#include "../utils/dove9-logger.h"

#include <stdlib.h>
#include <string.h>
#include <math.h>

/* ----------------------------------------------------------------
 * Internal constants/limits
 * ---------------------------------------------------------------- */

#define MAX_SCHED_ENTRIES     256
#define MAX_COMPLETED         1024
#define MAX_QUEUE_IDS         256
#define MAX_SCHED_HANDLERS    16
#define SYS6_ALIGNMENT_TOL    2
#define DOVE9_STEPS_PER_STREAM 4

/* ----------------------------------------------------------------
 * Internal types
 * ---------------------------------------------------------------- */

struct sched_handler_entry {
	dove9_scheduler_event_fn handler;
	void *context;
};

struct dove9_sys6_mail_scheduler {
	struct dove9_sys6_scheduler_config config;
	struct dove9_logger *logger;
	unsigned int step_duration_ms;
	bool running;

	/* Step counters */
	unsigned int current_step;
	unsigned int current_grand_cycle;
	unsigned int sys6_step;
	unsigned int sys6_cycle;
	unsigned int dove9_step;
	unsigned int dove9_cycle;

	/* Scheduled processes */
	struct dove9_mail_schedule_result scheduled[MAX_SCHED_ENTRIES];
	unsigned int scheduled_count;

	/* Completed set (just IDs) */
	char completed[MAX_COMPLETED][DOVE9_MAX_ID_LEN];
	unsigned int completed_count;

	/* Process queue (IDs) */
	char queue[MAX_QUEUE_IDS][DOVE9_MAX_ID_LEN];
	unsigned int queue_count;

	/* Event handlers */
	struct sched_handler_entry handlers[MAX_SCHED_HANDLERS];
	unsigned int handler_count;
};

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

static void emit_sched_event(struct dove9_sys6_mail_scheduler *s,
			     const struct dove9_scheduler_event *event)
{
	for (unsigned int i = 0; i < s->handler_count; i++)
		s->handlers[i].handler(event, s->handlers[i].context);
}

/* djb2 hash */
static unsigned int hash_string(const char *str)
{
	unsigned int hash = 5381;
	while (*str) {
		hash = (hash * 33) ^ (unsigned char)*str;
		str++;
	}
	return hash;
}

static int find_schedule(const struct dove9_sys6_mail_scheduler *s,
			 const char *process_id)
{
	for (unsigned int i = 0; i < s->scheduled_count; i++) {
		if (strcmp(s->scheduled[i].process_id, process_id) == 0)
			return (int)i;
	}
	return -1;
}

static int find_queue_entry(const struct dove9_sys6_mail_scheduler *s,
			    const char *process_id)
{
	for (unsigned int i = 0; i < s->queue_count; i++) {
		if (strcmp(s->queue[i], process_id) == 0)
			return (int)i;
	}
	return -1;
}

static void remove_queue_at(struct dove9_sys6_mail_scheduler *s,
			    unsigned int idx)
{
	for (unsigned int i = idx; i + 1 < s->queue_count; i++)
		memcpy(s->queue[i], s->queue[i + 1], DOVE9_MAX_ID_LEN);
	s->queue_count--;
}

static unsigned int
calculate_scheduled_step(const struct dove9_sys6_mail_scheduler *s,
			 unsigned int phase, unsigned int stage,
			 unsigned int step, unsigned int stream)
{
	unsigned int current_grand =
		s->current_step % GRAND_CYCLE_LENGTH;

	/* Target in Sys6 (30 steps): Phase 1→[1-10], Phase 2→[11-20], Phase 3→[21-30] */
	unsigned int phase_offset = (phase - 1) * 10;
	unsigned int stage_offset = (stage - 1) * 2;
	unsigned int target_sys6 = phase_offset + stage_offset + step;

	/* Target in Dove9 (12 steps): each stream gets 4 steps */
	unsigned int target_dove9 = (stream - 1) * DOVE9_STEPS_PER_STREAM;

	/* Scan forward through grand cycle to find alignment */
	unsigned int steps_to_target = 0;
	for (unsigned int offset = 1; offset <= GRAND_CYCLE_LENGTH; offset++) {
		unsigned int test_grand =
			(current_grand + offset) % GRAND_CYCLE_LENGTH;
		unsigned int test_sys6 = test_grand % SYS6_CYCLE_LENGTH;
		unsigned int test_dove9 = test_grand % DOVE9_CYCLE_LENGTH;

		/* Sys6 alignment: within tolerance of target */
		int sys6_diff = (int)test_sys6 - (int)target_sys6;
		bool sys6_ok = (sys6_diff >= -(int)SYS6_ALIGNMENT_TOL) ||
			       (test_sys6 >= target_sys6 - SYS6_ALIGNMENT_TOL);

		/* Dove9 stream alignment: in same triadic period or beyond */
		bool dove9_ok =
			(test_dove9 / DOVE9_STEPS_PER_STREAM == stream - 1) ||
			(test_dove9 >= target_dove9);

		if (sys6_ok && dove9_ok) {
			steps_to_target = offset;
			break;
		}
	}

	return steps_to_target > 0 ? steps_to_target : 1;
}

static struct dove9_mail_schedule_result
calculate_operadic_schedule(struct dove9_sys6_mail_scheduler *s,
			    const char *process_id,
			    const char *message_id,
			    int priority)
{
	struct dove9_mail_schedule_result r;
	memset(&r, 0, sizeof(r));
	snprintf(r.process_id, sizeof(r.process_id), "%s", process_id);
	snprintf(r.message_id, sizeof(r.message_id), "%s", message_id);
	r.priority = priority;

	/* Phase: higher priority → earlier phase */
	r.sys6_phase = (priority >= 8) ? 1 : (priority >= 4) ? 2 : 3;

	/* Stage within phase */
	unsigned int p_within = (unsigned int)(((priority - 1) % 3) + 1);
	r.sys6_stage = (unsigned int)ceil((double)p_within * 5.0 / 3.0);
	if (r.sys6_stage > 5) r.sys6_stage = 5;

	/* A/B step from process-id hash */
	r.sys6_step = (hash_string(process_id) % 2) + 1;

	/* Stream from message-id hash (load distribution) */
	r.dove9_stream = (hash_string(message_id) % 3) + 1;

	/* Triad within current Dove9 cycle */
	r.dove9_triad = (s->dove9_step / 3) % 4;

	/* Scheduled step via alignment scan */
	r.scheduled_step = calculate_scheduled_step(
		s, r.sys6_phase, r.sys6_stage, r.sys6_step, r.dove9_stream);

	r.scheduled_grand_cycle_step = s->current_step + r.scheduled_step;

	/* Estimated completion */
	r.estimated_completion_step =
		r.scheduled_step + s->config.base_processing_steps +
		(unsigned int)(10 - priority);

	return r;
}

static struct dove9_mail_schedule_result
create_simple_schedule(struct dove9_sys6_mail_scheduler *s,
		       const char *process_id,
		       const char *message_id,
		       int priority)
{
	struct dove9_mail_schedule_result r;
	memset(&r, 0, sizeof(r));
	snprintf(r.process_id, sizeof(r.process_id), "%s", process_id);
	snprintf(r.message_id, sizeof(r.message_id), "%s", message_id);
	r.priority = priority;

	r.scheduled_step = s->queue_count + 1;
	r.scheduled_grand_cycle_step = s->current_step + r.scheduled_step;
	r.sys6_phase = 1;
	r.sys6_stage = 1;
	r.sys6_step = 1;
	r.dove9_stream = 1;
	r.dove9_triad = 0;
	r.estimated_completion_step =
		r.scheduled_step + s->config.base_processing_steps;
	return r;
}

/* Check if subject contains any of the urgent markers */
static bool subject_has_urgency(const char *subject)
{
	/* lowercase comparison via manual scan */
	static const char *markers[] = {
		"urgent", "important", "asap", "priority", "critical"
	};
	char lower[DOVE9_MAX_SUBJECT_LEN];
	size_t len = strlen(subject);
	if (len >= sizeof(lower)) len = sizeof(lower) - 1;
	for (size_t i = 0; i < len; i++)
		lower[i] = (subject[i] >= 'A' && subject[i] <= 'Z')
			   ? (char)(subject[i] + 32)
			   : subject[i];
	lower[len] = '\0';

	for (unsigned int m = 0; m < 5; m++) {
		if (strstr(lower, markers[m]) != NULL)
			return true;
	}
	return false;
}

static bool subject_is_reply(const char *subject)
{
	return (subject[0] == 'R' || subject[0] == 'r') &&
	       (subject[1] == 'E' || subject[1] == 'e') &&
	       subject[2] == ':';
}

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_sys6_mail_scheduler *
dove9_sys6_scheduler_create(unsigned int step_duration_ms,
			    const struct dove9_sys6_scheduler_config *config)
{
	struct dove9_sys6_mail_scheduler *s = calloc(1, sizeof(*s));
	if (s == NULL)
		return NULL;

	if (config != NULL)
		s->config = *config;
	else
		s->config = dove9_sys6_scheduler_config_default();

	s->step_duration_ms = step_duration_ms;
	s->logger = dove9_logger_create("Sys6Scheduler");
	return s;
}

void dove9_sys6_scheduler_destroy(
	struct dove9_sys6_mail_scheduler **scheduler)
{
	if (scheduler == NULL || *scheduler == NULL)
		return;
	dove9_sys6_scheduler_stop(*scheduler);
	dove9_logger_destroy(&(*scheduler)->logger);
	free(*scheduler);
	*scheduler = NULL;
}

void dove9_sys6_scheduler_start(struct dove9_sys6_mail_scheduler *s)
{
	if (s == NULL || s->running)
		return;

	s->running = true;
	s->current_step = 0;
	s->current_grand_cycle = 0;
	s->sys6_step = 0;
	s->sys6_cycle = 0;
	s->dove9_step = 0;
	s->dove9_cycle = 0;
	s->scheduled_count = 0;
	s->completed_count = 0;
	s->queue_count = 0;
}

void dove9_sys6_scheduler_stop(struct dove9_sys6_mail_scheduler *s)
{
	if (s == NULL || !s->running)
		return;
	s->running = false;
}

bool dove9_sys6_scheduler_is_running(
	const struct dove9_sys6_mail_scheduler *s)
{
	return s != NULL && s->running;
}

/* ----------------------------------------------------------------
 * Event subscription
 * ---------------------------------------------------------------- */

void dove9_sys6_scheduler_on(struct dove9_sys6_mail_scheduler *s,
			     dove9_scheduler_event_fn handler,
			     void *context)
{
	if (s == NULL || handler == NULL)
		return;
	if (s->handler_count >= MAX_SCHED_HANDLERS)
		return;
	s->handlers[s->handler_count].handler = handler;
	s->handlers[s->handler_count].context = context;
	s->handler_count++;
}

/* ----------------------------------------------------------------
 * Advance step
 * ---------------------------------------------------------------- */

void dove9_sys6_scheduler_advance_step(struct dove9_sys6_mail_scheduler *s)
{
	if (s == NULL || !s->running)
		return;

	s->current_step++;

	s->sys6_step = s->current_step % SYS6_CYCLE_LENGTH;
	s->dove9_step = s->current_step % DOVE9_CYCLE_LENGTH;

	/* Cycle boundaries */
	if (s->sys6_step == 0 && s->current_step > 0) {
		s->sys6_cycle++;
		struct dove9_scheduler_event ev;
		ev.type = DOVE9_SCHED_SYS6_CYCLE_BOUNDARY;
		ev.data.cycle_boundary.cycle = s->sys6_cycle;
		emit_sched_event(s, &ev);
	}

	if (s->dove9_step == 0 && s->current_step > 0) {
		s->dove9_cycle++;
		struct dove9_scheduler_event ev;
		ev.type = DOVE9_SCHED_DOVE9_CYCLE_BOUNDARY;
		ev.data.cycle_boundary.cycle = s->dove9_cycle;
		emit_sched_event(s, &ev);
	}

	unsigned int grand_step = s->current_step % GRAND_CYCLE_LENGTH;
	if (grand_step == 0 && s->current_step > 0) {
		s->current_grand_cycle++;
		struct dove9_scheduler_event ev;
		ev.type = DOVE9_SCHED_GRAND_CYCLE_BOUNDARY;
		ev.data.cycle_boundary.cycle = s->current_grand_cycle;
		emit_sched_event(s, &ev);
	}

	/* Check for ready processes */
	for (unsigned int i = 0; i < s->scheduled_count; i++) {
		if (s->scheduled[i].scheduled_grand_cycle_step <=
		    s->current_step) {
			struct dove9_scheduler_event ev;
			ev.type = DOVE9_SCHED_PROCESS_READY;
			snprintf(ev.data.process_ready.process_id,
				 DOVE9_MAX_ID_LEN, "%s",
				 s->scheduled[i].process_id);
			ev.data.process_ready.step = s->current_step;
			emit_sched_event(s, &ev);
		}
	}
}

/* ----------------------------------------------------------------
 * Schedule a mail message
 * ---------------------------------------------------------------- */

struct dove9_mail_schedule_result
dove9_sys6_scheduler_schedule_mail(struct dove9_sys6_mail_scheduler *s,
				   const struct dove9_mail_message *mail,
				   const struct dove9_message_process *process)
{
	/* Capacity check */
	if (s->scheduled_count >= s->config.max_processes_per_grand_cycle) {
		struct dove9_scheduler_event ev;
		ev.type = DOVE9_SCHED_CAPACITY_WARNING;
		ev.data.capacity_warning.active_count = s->scheduled_count;
		ev.data.capacity_warning.max_count =
			s->config.max_processes_per_grand_cycle;
		emit_sched_event(s, &ev);
	}

	/* Calculate effective priority with boosts */
	int priority = process->priority;

	if (subject_has_urgency(mail->subject))
		priority += s->config.urgent_priority_boost;

	if (mail->flags & DOVE9_MAIL_FLAG_FLAGGED)
		priority += s->config.flagged_priority_boost;

	if (mail->in_reply_to[0] != '\0' || subject_is_reply(mail->subject))
		priority += s->config.reply_priority_boost;

	/* Clamp */
	if (priority < 1) priority = 1;
	if (priority > 10) priority = 10;

	/* Build schedule */
	struct dove9_mail_schedule_result result;
	if (s->config.enable_operadic_scheduling)
		result = calculate_operadic_schedule(
			s, process->id, mail->message_id, priority);
	else
		result = create_simple_schedule(
			s, process->id, mail->message_id, priority);

	/* Store */
	if (s->scheduled_count < MAX_SCHED_ENTRIES)
		s->scheduled[s->scheduled_count++] = result;

	if (s->queue_count < MAX_QUEUE_IDS) {
		snprintf(s->queue[s->queue_count], DOVE9_MAX_ID_LEN,
			 "%s", process->id);
		s->queue_count++;
	}

	/* Emit event */
	struct dove9_scheduler_event ev;
	ev.type = DOVE9_SCHED_PROCESS_SCHEDULED;
	ev.data.process_scheduled.result = result;
	emit_sched_event(s, &ev);

	return result;
}

/* ----------------------------------------------------------------
 * Complete a process
 * ---------------------------------------------------------------- */

void dove9_sys6_scheduler_complete_process(
	struct dove9_sys6_mail_scheduler *s,
	const char *process_id)
{
	int idx = find_schedule(s, process_id);
	if (idx < 0) return;

	int duration = (int)s->current_step -
		       (int)s->scheduled[idx].scheduled_grand_cycle_step;

	/* Move to completed */
	if (s->completed_count < MAX_COMPLETED) {
		snprintf(s->completed[s->completed_count], DOVE9_MAX_ID_LEN,
			 "%s", process_id);
		s->completed_count++;
	}

	/* Remove from scheduled (swap with last) */
	s->scheduled[idx] = s->scheduled[s->scheduled_count - 1];
	s->scheduled_count--;

	/* Remove from queue */
	int qi = find_queue_entry(s, process_id);
	if (qi >= 0)
		remove_queue_at(s, (unsigned int)qi);

	/* Emit */
	struct dove9_scheduler_event ev;
	ev.type = DOVE9_SCHED_PROCESS_COMPLETED;
	snprintf(ev.data.process_completed.process_id, DOVE9_MAX_ID_LEN,
		 "%s", process_id);
	ev.data.process_completed.duration = duration;
	emit_sched_event(s, &ev);
}

/* ----------------------------------------------------------------
 * Query
 * ---------------------------------------------------------------- */

const struct dove9_mail_schedule_result *
dove9_sys6_scheduler_get_schedule(const struct dove9_sys6_mail_scheduler *s,
				  const char *process_id)
{
	int idx = find_schedule(s, process_id);
	return idx >= 0 ? &s->scheduled[idx] : NULL;
}

unsigned int
dove9_sys6_scheduler_get_all_schedules(
	const struct dove9_sys6_mail_scheduler *s,
	const struct dove9_mail_schedule_result **out,
	unsigned int max_out)
{
	unsigned int n = s->scheduled_count < max_out
			 ? s->scheduled_count : max_out;
	for (unsigned int i = 0; i < n; i++)
		out[i] = &s->scheduled[i];
	return n;
}

unsigned int
dove9_sys6_scheduler_get_pending_count(
	const struct dove9_sys6_mail_scheduler *s)
{
	return s != NULL ? s->scheduled_count : 0;
}

void dove9_sys6_scheduler_get_state(
	const struct dove9_sys6_mail_scheduler *s,
	struct dove9_scheduler_state *out)
{
	if (s == NULL || out == NULL) return;
	out->current_step = s->current_step;
	out->current_grand_cycle = s->current_grand_cycle;
	out->sys6_step = s->sys6_step;
	out->sys6_cycle = s->sys6_cycle;
	out->dove9_step = s->dove9_step;
	out->dove9_cycle = s->dove9_cycle;
	out->scheduled_count = s->scheduled_count;
	out->completed_count = s->completed_count;
	out->queue_count = s->queue_count;
}

void dove9_sys6_scheduler_get_cycle_positions(
	const struct dove9_sys6_mail_scheduler *s,
	struct dove9_cycle_positions *out)
{
	if (s == NULL || out == NULL) return;
	out->grand_cycle = s->current_grand_cycle;
	out->grand_step = s->current_step % GRAND_CYCLE_LENGTH;
	out->sys6_cycle = s->sys6_cycle;
	out->sys6_step = s->sys6_step;
	out->dove9_cycle = s->dove9_cycle;
	out->dove9_step = s->dove9_step;
	out->sys6_progress =
		(double)s->sys6_step / (double)SYS6_CYCLE_LENGTH;
	out->dove9_progress =
		(double)s->dove9_step / (double)DOVE9_CYCLE_LENGTH;
	out->grand_progress =
		(double)(s->current_step % GRAND_CYCLE_LENGTH) /
		(double)GRAND_CYCLE_LENGTH;
}

struct dove9_next_slot
dove9_sys6_scheduler_get_next_slot(
	const struct dove9_sys6_mail_scheduler *s,
	int priority)
{
	struct dove9_next_slot slot;
	slot.phase = (priority >= 8) ? 1 : (priority >= 4) ? 2 : 3;

	unsigned int p_within = (unsigned int)(((priority - 1) % 3) + 1);
	slot.stage = (unsigned int)ceil((double)p_within * 5.0 / 3.0);
	if (slot.stage > 5) slot.stage = 5;

	slot.stream = (s->current_step % 3) + 1;
	slot.step = calculate_scheduled_step(
		s, slot.phase, slot.stage, 1, slot.stream);
	return slot;
}
