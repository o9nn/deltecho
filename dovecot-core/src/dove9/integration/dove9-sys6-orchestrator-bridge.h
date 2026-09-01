/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_SYS6_ORCHESTRATOR_BRIDGE_H
#define DOVE9_SYS6_ORCHESTRATOR_BRIDGE_H

#include "dove9-orchestrator-bridge.h"
#include "dove9-sys6-mail-scheduler.h"

struct dove9_sys6_orchestrator_bridge;

/* ----------------------------------------------------------------
 * Integration statistics
 * ---------------------------------------------------------------- */

struct dove9_sys6_integration_stats {
	unsigned int grand_cycles;
	unsigned int sys6_cycles;
	unsigned int dove9_cycles;
	unsigned int total_scheduled;
	unsigned int total_completed;
	double average_processing_steps;

	/* Phase distribution counters */
	unsigned int phase1_count;
	unsigned int phase2_count;
	unsigned int phase3_count;

	/* Stream distribution counters */
	unsigned int stream1_count;
	unsigned int stream2_count;
	unsigned int stream3_count;
};

/* ----------------------------------------------------------------
 * Configuration
 * ---------------------------------------------------------------- */

struct dove9_sys6_bridge_config {
	struct dove9_orchestrator_bridge_config base;
	bool enable_sys6_scheduling;
	struct dove9_sys6_scheduler_config scheduler_config;
	bool enable_cycle_telemetry;
	unsigned int grand_cycle_step_duration_ms;
};

static inline struct dove9_sys6_bridge_config
dove9_sys6_bridge_config_default(void)
{
	struct dove9_sys6_bridge_config cfg;
	memset(&cfg, 0, sizeof(cfg));
	cfg.base = dove9_orchestrator_bridge_config_default();
	cfg.enable_sys6_scheduling = true;
	cfg.scheduler_config = dove9_sys6_scheduler_config_default();
	cfg.enable_cycle_telemetry = true;
	cfg.grand_cycle_step_duration_ms = 100;
	return cfg;
}

/* ----------------------------------------------------------------
 * Event types
 * ---------------------------------------------------------------- */

enum dove9_sys6_bridge_event_type {
	DOVE9_SYS6_BRIDGE_PROCESS_SCHEDULED,
	DOVE9_SYS6_BRIDGE_GRAND_CYCLE_COMPLETE,
	DOVE9_SYS6_BRIDGE_PHASE_TRANSITION,
	DOVE9_SYS6_BRIDGE_OPTIMAL_SLOT_USED,
	DOVE9_SYS6_BRIDGE_SCHEDULING_DEFERRED,
};

struct dove9_sys6_bridge_event {
	enum dove9_sys6_bridge_event_type type;
	union {
		struct {
			struct dove9_mail_schedule_result result;
		} process_scheduled;
		struct {
			unsigned int grand_cycle;
			struct dove9_sys6_integration_stats stats;
		} grand_cycle_complete;
		struct {
			unsigned int from_phase;
			unsigned int to_phase;
		} phase_transition;
		struct {
			char process_id[DOVE9_MAX_ID_LEN];
			unsigned int phase;
			unsigned int stage;
			unsigned int stream;
			unsigned int step;
		} optimal_slot_used;
		struct {
			char process_id[DOVE9_MAX_ID_LEN];
			char reason[256];
		} scheduling_deferred;
	} data;
};

typedef void (*dove9_sys6_bridge_event_fn)(
	const struct dove9_sys6_bridge_event *event, void *context);

/* ----------------------------------------------------------------
 * API
 * ---------------------------------------------------------------- */

struct dove9_sys6_orchestrator_bridge *
dove9_sys6_bridge_create(const struct dove9_sys6_bridge_config *config);

void dove9_sys6_bridge_destroy(
	struct dove9_sys6_orchestrator_bridge **bridge);

/* Initialize with cognitive services */
void dove9_sys6_bridge_initialize(
	struct dove9_sys6_orchestrator_bridge *bridge,
	const struct dove9_llm_service *llm,
	const struct dove9_memory_store *memory,
	const struct dove9_persona_core *persona);

/* Lifecycle */
int dove9_sys6_bridge_start(struct dove9_sys6_orchestrator_bridge *bridge);
void dove9_sys6_bridge_stop(struct dove9_sys6_orchestrator_bridge *bridge);
bool dove9_sys6_bridge_is_running(
	const struct dove9_sys6_orchestrator_bridge *bridge);

/* Event subscription */
void dove9_sys6_bridge_on(
	struct dove9_sys6_orchestrator_bridge *bridge,
	dove9_sys6_bridge_event_fn handler,
	void *context);

/* Process email with Sys6 scheduling */
struct dove9_message_process *
dove9_sys6_bridge_process_email(
	struct dove9_sys6_orchestrator_bridge *bridge,
	const struct dove9_dovecot_email *email);

/* Scheduling queries */
struct dove9_next_slot
dove9_sys6_bridge_get_next_optimal_slot(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	int priority);

const struct dove9_mail_schedule_result *
dove9_sys6_bridge_get_process_schedule(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	const char *process_id);

unsigned int
dove9_sys6_bridge_get_all_schedules(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	const struct dove9_mail_schedule_result **out,
	unsigned int max_out);

void dove9_sys6_bridge_complete_process(
	struct dove9_sys6_orchestrator_bridge *bridge,
	const char *process_id);

/* Statistics / metrics */
void dove9_sys6_bridge_get_stats(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	struct dove9_sys6_integration_stats *out);

void dove9_sys6_bridge_get_cycle_positions(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	struct dove9_cycle_positions *out);

unsigned int
dove9_sys6_bridge_get_pending_count(
	const struct dove9_sys6_orchestrator_bridge *bridge);

void dove9_sys6_bridge_get_metrics(
	const struct dove9_sys6_orchestrator_bridge *bridge,
	struct dove9_kernel_metrics *out);

unsigned int
dove9_sys6_bridge_get_active_processes(
	struct dove9_sys6_orchestrator_bridge *bridge,
	struct dove9_message_process **out,
	unsigned int max_out);

bool dove9_sys6_bridge_is_sys6_enabled(
	const struct dove9_sys6_orchestrator_bridge *bridge);

/* Sub-object accessors */
struct dove9_orchestrator_bridge *
dove9_sys6_bridge_get_orchestrator_bridge(
	struct dove9_sys6_orchestrator_bridge *bridge);

struct dove9_sys6_mail_scheduler *
dove9_sys6_bridge_get_scheduler(
	struct dove9_sys6_orchestrator_bridge *bridge);

struct dove9_system *
dove9_sys6_bridge_get_system(
	struct dove9_sys6_orchestrator_bridge *bridge);

#endif /* DOVE9_SYS6_ORCHESTRATOR_BRIDGE_H */
