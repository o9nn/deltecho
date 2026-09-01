/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-sys6-orchestrator-bridge.h"
#include "../utils/dove9-logger.h"

#include <stdlib.h>
#include <string.h>

#define MAX_SYS6_BRIDGE_HANDLERS 16

struct sys6_bridge_handler_entry {
	dove9_sys6_bridge_event_fn handler;
	void *context;
};

struct dove9_sys6_orchestrator_bridge {
	struct dove9_sys6_bridge_config config;
	struct dove9_orchestrator_bridge *bridge;   /* owned */
	struct dove9_sys6_mail_scheduler *scheduler; /* owned */
	struct dove9_logger *logger;
	bool running;

	/* Statistics */
	struct dove9_sys6_integration_stats stats;

	/* Event handlers */
	struct sys6_bridge_handler_entry handlers[MAX_SYS6_BRIDGE_HANDLERS];
	unsigned int handler_count;
};

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

static void emit_sys6_event(struct dove9_sys6_orchestrator_bridge *b,
			    const struct dove9_sys6_bridge_event *event)
{
	for (unsigned int i = 0; i < b->handler_count; i++)
		b->handlers[i].handler(event, b->handlers[i].context);
}

static void update_average_processing(
	struct dove9_sys6_orchestrator_bridge *b, int duration)
{
	if (b->stats.total_completed == 0)
		return;
	double total =
		b->stats.average_processing_steps *
		(double)(b->stats.total_completed - 1) + (double)duration;
	b->stats.average_processing_steps =
		total / (double)b->stats.total_completed;
}

/* ----------------------------------------------------------------
 * Scheduler event handler (forwarded from Sys6 scheduler)
 * ---------------------------------------------------------------- */

static void sys6_sched_handler(const struct dove9_scheduler_event *event,
			       void *context)
{
	struct dove9_sys6_orchestrator_bridge *b = context;

	switch (event->type) {
	case DOVE9_SCHED_PROCESS_SCHEDULED: {
		b->stats.total_scheduled++;

		/* Phase distribution */
		unsigned int ph = event->data.process_scheduled.result.sys6_phase;
		if (ph == 1) b->stats.phase1_count++;
		else if (ph == 2) b->stats.phase2_count++;
		else b->stats.phase3_count++;

		/* Stream distribution */
		unsigned int st = event->data.process_scheduled.result.dove9_stream;
		if (st == 1) b->stats.stream1_count++;
		else if (st == 2) b->stats.stream2_count++;
		else b->stats.stream3_count++;

		struct dove9_sys6_bridge_event be;
		be.type = DOVE9_SYS6_BRIDGE_PROCESS_SCHEDULED;
		be.data.process_scheduled.result =
			event->data.process_scheduled.result;
		emit_sys6_event(b, &be);
		break;
	}

	case DOVE9_SCHED_PROCESS_COMPLETED:
		b->stats.total_completed++;
		update_average_processing(b,
			event->data.process_completed.duration);
		break;

	case DOVE9_SCHED_GRAND_CYCLE_BOUNDARY: {
		b->stats.grand_cycles = event->data.cycle_boundary.cycle;
		struct dove9_sys6_bridge_event be;
		be.type = DOVE9_SYS6_BRIDGE_GRAND_CYCLE_COMPLETE;
		be.data.grand_cycle_complete.grand_cycle =
			event->data.cycle_boundary.cycle;
		be.data.grand_cycle_complete.stats = b->stats;
		emit_sys6_event(b, &be);
		break;
	}

	case DOVE9_SCHED_SYS6_CYCLE_BOUNDARY:
		b->stats.sys6_cycles = event->data.cycle_boundary.cycle;
		break;

	case DOVE9_SCHED_DOVE9_CYCLE_BOUNDARY:
		b->stats.dove9_cycles = event->data.cycle_boundary.cycle;
		break;

	default:
		break;
	}
}

/* ----------------------------------------------------------------
 * Orchestrator bridge event forwarder
 * ---------------------------------------------------------------- */

static void bridge_event_handler(const struct dove9_bridge_event *event,
				 void *context)
{
	struct dove9_sys6_orchestrator_bridge *b = context;
	(void)b;
	/* Bridge events are forwarded transparently through the
	 * orchestrator bridge's own handler chain. The Sys6 bridge
	 * only intercepts scheduler-specific events. */
	(void)event;
}

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_sys6_orchestrator_bridge *
dove9_sys6_bridge_create(const struct dove9_sys6_bridge_config *config)
{
	struct dove9_sys6_orchestrator_bridge *b = calloc(1, sizeof(*b));
	if (b == NULL)
		return NULL;

	if (config != NULL)
		b->config = *config;
	else
		b->config = dove9_sys6_bridge_config_default();

	b->bridge = dove9_orchestrator_bridge_create(&b->config.base);
	if (b->bridge == NULL) {
		free(b);
		return NULL;
	}

	b->scheduler = dove9_sys6_scheduler_create(
		b->config.grand_cycle_step_duration_ms,
		&b->config.scheduler_config);
	if (b->scheduler == NULL) {
		dove9_orchestrator_bridge_destroy(&b->bridge);
		free(b);
		return NULL;
	}

	b->logger = dove9_logger_create("Sys6Bridge");

	/* Subscribe to scheduler events */
	dove9_sys6_scheduler_on(b->scheduler, sys6_sched_handler, b);

	/* Subscribe to bridge events (for forwarding) */
	dove9_orchestrator_bridge_on(b->bridge, bridge_event_handler, b);

	return b;
}

void dove9_sys6_bridge_destroy(
	struct dove9_sys6_orchestrator_bridge **bridge)
{
	if (bridge == NULL || *bridge == NULL)
		return;

	dove9_sys6_bridge_stop(*bridge);
	dove9_sys6_scheduler_destroy(&(*bridge)->scheduler);
	dove9_orchestrator_bridge_destroy(&(*bridge)->bridge);
	dove9_logger_destroy(&(*bridge)->logger);
	free(*bridge);
	*bridge = NULL;
}

void dove9_sys6_bridge_initialize(
	struct dove9_sys6_orchestrator_bridge *bridge,
	const struct dove9_llm_service *llm,
	const struct dove9_memory_store *memory,
	const struct dove9_persona_core *persona)
{
	if (bridge == NULL)
		return;
	dove9_orchestrator_bridge_initialize(bridge->bridge,
					     llm, memory, persona);
}

int dove9_sys6_bridge_start(struct dove9_sys6_orchestrator_bridge *bridge)
{
	if (bridge == NULL || bridge->running)
		return -1;

	if (bridge->config.enable_sys6_scheduling)
		dove9_sys6_scheduler_start(bridge->scheduler);

	int ret = dove9_orchestrator_bridge_start(bridge->bridge);
	if (ret != 0) {
		dove9_sys6_scheduler_stop(bridge->scheduler);
		return ret;
	}

	bridge->running = true;
	dove9_log_info(bridge->logger, "Sys6 orchestrator bridge started");
	return 0;
}

void dove9_sys6_bridge_stop(struct dove9_sys6_orchestrator_bridge *bridge)
{
	if (bridge == NULL || !bridge->running)
		return;

	dove9_sys6_scheduler_stop(bridge->scheduler);
	dove9_orchestrator_bridge_stop(bridge->bridge);
	bridge->running = false;
	dove9_log_info(bridge->logger, "Sys6 orchestrator bridge stopped");
}

bool dove9_sys6_bridge_is_running(
	const struct dove9_sys6_orchestrator_bridge *bridge)
{
	return bridge != NULL && bridge->running;
}

/* ----------------------------------------------------------------
 * Event subscription
 * ---------------------------------------------------------------- */

void dove9_sys6_bridge_on(
	struct dove9_sys6_orchestrator_bridge *bridge,
	dove9_sys6_bridge_event_fn handler,
	void *context)
{
	if (bridge == NULL || handler == NULL)
		return;
	if (bridge->handler_count >= MAX_SYS6_BRIDGE_HANDLERS)
		return;
	bridge->handlers[bridge->handler_count].handler = handler;
	bridge->handlers[bridge->handler_count].context = context;
	bridge->handler_count++;
}

/* ----------------------------------------------------------------
 * Process email with Sys6 scheduling
 * ---------------------------------------------------------------- */

struct dove9_message_process *
dove9_sys6_bridge_process_email(
	struct dove9_sys6_orchestrator_bridge *bridge,
	const struct dove9_dovecot_email *email)
{
	if (bridge == NULL)
		return NULL;

	/* Process through standard bridge */
	struct dove9_message_process *proc =
		dove9_orchestrator_bridge_process_email(bridge->bridge, email);
	if (proc == NULL)
		return NULL;

	/* Apply Sys6 scheduling if enabled */
	if (bridge->config.enable_sys6_scheduling) {
		struct dove9_mail_message mail;
		memset(&mail, 0, sizeof(mail));
		snprintf(mail.message_id, sizeof(mail.message_id), "%s",
			 email->message_id[0] != '\0'
			 ? email->message_id : "msg_anon");
		snprintf(mail.from, sizeof(mail.from), "%s", email->from);
		for (unsigned int i = 0;
		     i < email->to_count && i < DOVE9_MAX_RECIPIENTS; i++)
			snprintf(mail.to[i], sizeof(mail.to[i]),
				 "%s", email->to[i]);
		mail.to_count = email->to_count;
		snprintf(mail.subject, sizeof(mail.subject),
			 "%s", email->subject);
		snprintf(mail.body, sizeof(mail.body), "%s", email->body);
		mail.timestamp = email->received_at;
		mail.received_at = email->received_at;
		snprintf(mail.mailbox, sizeof(mail.mailbox), "INBOX");

		struct dove9_mail_schedule_result schedule =
			dove9_sys6_scheduler_schedule_mail(
				bridge->scheduler, &mail, proc);

		/* Emit optimal slot event */
		struct dove9_sys6_bridge_event ev;
		ev.type = DOVE9_SYS6_BRIDGE_OPTIMAL_SLOT_USED;
		snprintf(ev.data.optimal_slot_used.process_id,
			 DOVE9_MAX_ID_LEN, "%s", proc->id);
		ev.data.optimal_slot_used.phase = schedule.sys6_phase;
		ev.data.optimal_slot_used.stage = schedule.sys6_stage;
		ev.data.optimal_slot_used.stream = schedule.dove9_stream;
		ev.data.optimal_slot_used.step = schedule.scheduled_step;
		emit_sys6_event(bridge, &ev);
	}

	return proc;
}

/* ----------------------------------------------------------------
 * Scheduling queries
 * ---------------------------------------------------------------- */

struct dove9_next_slot
dove9_sys6_bridge_get_next_optimal_slot(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	int priority)
{
	return dove9_sys6_scheduler_get_next_slot(bridge->scheduler, priority);
}

const struct dove9_mail_schedule_result *
dove9_sys6_bridge_get_process_schedule(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	const char *process_id)
{
	return dove9_sys6_scheduler_get_schedule(
		bridge->scheduler, process_id);
}

unsigned int
dove9_sys6_bridge_get_all_schedules(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	const struct dove9_mail_schedule_result **out,
	unsigned int max_out)
{
	return dove9_sys6_scheduler_get_all_schedules(
		bridge->scheduler, out, max_out);
}

void dove9_sys6_bridge_complete_process(
	struct dove9_sys6_orchestrator_bridge *bridge,
	const char *process_id)
{
	dove9_sys6_scheduler_complete_process(bridge->scheduler, process_id);
}

/* ----------------------------------------------------------------
 * Statistics / metrics
 * ---------------------------------------------------------------- */

void dove9_sys6_bridge_get_stats(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	struct dove9_sys6_integration_stats *out)
{
	if (bridge == NULL || out == NULL) return;
	*out = bridge->stats;
}

void dove9_sys6_bridge_get_cycle_positions(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	struct dove9_cycle_positions *out)
{
	dove9_sys6_scheduler_get_cycle_positions(bridge->scheduler, out);
}

unsigned int
dove9_sys6_bridge_get_pending_count(
	const struct dove9_sys6_orchestrator_bridge *bridge)
{
	return dove9_sys6_scheduler_get_pending_count(bridge->scheduler);
}

void dove9_sys6_bridge_get_metrics(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	struct dove9_kernel_metrics *out)
{
	dove9_orchestrator_bridge_get_metrics(bridge->bridge, out);
}

unsigned int
dove9_sys6_bridge_get_active_processes(
	struct dove9_sys6_orchestrator_bridge *bridge,
	struct dove9_message_process **out,
	unsigned int max_out)
{
	return dove9_orchestrator_bridge_get_active_processes(
		bridge->bridge, out, max_out);
}

bool dove9_sys6_bridge_is_sys6_enabled(
	const struct dove9_sys6_orchestrator_bridge *bridge)
{
	return bridge != NULL && bridge->config.enable_sys6_scheduling;
}

/* ----------------------------------------------------------------
 * Sub-object accessors
 * ---------------------------------------------------------------- */

struct dove9_orchestrator_bridge *
dove9_sys6_bridge_get_orchestrator_bridge(
	struct dove9_sys6_orchestrator_bridge *bridge)
{
	return bridge != NULL ? bridge->bridge : NULL;
}

struct dove9_sys6_mail_scheduler *
dove9_sys6_bridge_get_scheduler(
	struct dove9_sys6_orchestrator_bridge *bridge)
{
	return bridge != NULL ? bridge->scheduler : NULL;
}

struct dove9_system *
dove9_sys6_bridge_get_system(
	struct dove9_sys6_orchestrator_bridge *bridge)
{
	return dove9_orchestrator_bridge_get_system(bridge->bridge);
}
