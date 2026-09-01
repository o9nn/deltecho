/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_ORCHESTRATOR_BRIDGE_H
#define DOVE9_ORCHESTRATOR_BRIDGE_H

#include "../types/dove9-types.h"

/* Forward declarations */
struct dove9_system;
struct dove9_orchestrator_bridge;
struct dove9_llm_service;
struct dove9_memory_store;
struct dove9_persona_core;

/* ----------------------------------------------------------------
 * DovecotEmail — incoming email from Dovecot interface
 * ---------------------------------------------------------------- */

struct dove9_dovecot_email {
	char from[DOVE9_MAX_ADDR_LEN];
	char to[DOVE9_MAX_RECIPIENTS][DOVE9_MAX_ADDR_LEN];
	unsigned int to_count;
	char subject[DOVE9_MAX_SUBJECT_LEN];
	char body[DOVE9_MAX_BODY_LEN];
	char message_id[DOVE9_MAX_ID_LEN];
	time_t received_at;

	/* Headers (simplified: fixed array of key/value pairs) */
	struct {
		char key[128];
		char value[512];
	} headers[32];
	unsigned int header_count;
};

/* ----------------------------------------------------------------
 * EmailResponse — outgoing response
 * ---------------------------------------------------------------- */

struct dove9_email_response {
	char to[DOVE9_MAX_ADDR_LEN];
	char from[DOVE9_MAX_ADDR_LEN];
	char subject[DOVE9_MAX_SUBJECT_LEN];
	char body[DOVE9_MAX_BODY_LEN];
	char in_reply_to[DOVE9_MAX_ID_LEN];
};

/* ----------------------------------------------------------------
 * Bridge configuration
 * ---------------------------------------------------------------- */

struct dove9_orchestrator_bridge_config {
	struct dove9_config dove9_config;

	/* Orchestrator connection */
	char orchestrator_host[256];
	int orchestrator_port;

	/* Bot identity */
	char bot_email_address[DOVE9_MAX_ADDR_LEN];

	/* Processing options */
	bool enable_auto_response;
	int response_delay_ms;
};

/* ----------------------------------------------------------------
 * Bridge event types
 * ---------------------------------------------------------------- */

enum dove9_bridge_event_type {
	DOVE9_BRIDGE_RESPONSE_READY,
	DOVE9_BRIDGE_KERNEL_EVENT,
	DOVE9_BRIDGE_TRIAD_SYNC,
	DOVE9_BRIDGE_CYCLE_COMPLETE,
	DOVE9_BRIDGE_SEND_RESPONSE,
	DOVE9_BRIDGE_STARTED,
	DOVE9_BRIDGE_STOPPED,
};

struct dove9_bridge_event {
	enum dove9_bridge_event_type type;
	union {
		struct {
			const struct dove9_email_response *response;
		} response_ready;
		struct {
			const struct dove9_kernel_event *event;
		} kernel_event;
		struct {
			const struct dove9_triad_point *triad;
		} triad_sync;
		struct {
			unsigned int cycle;
			struct dove9_kernel_metrics metrics;
		} cycle_complete;
		struct {
			const struct dove9_email_response *response;
		} send_response;
	} data;
};

typedef void (*dove9_bridge_event_fn)(const struct dove9_bridge_event *event,
				      void *context);

/* ----------------------------------------------------------------
 * API
 * ---------------------------------------------------------------- */

struct dove9_orchestrator_bridge_config
dove9_orchestrator_bridge_config_default(void);

struct dove9_orchestrator_bridge *
dove9_orchestrator_bridge_create(
	const struct dove9_orchestrator_bridge_config *config);

void dove9_orchestrator_bridge_destroy(
	struct dove9_orchestrator_bridge **bridge);

/* Initialize with cognitive services */
void dove9_orchestrator_bridge_initialize(
	struct dove9_orchestrator_bridge *bridge,
	const struct dove9_llm_service *llm,
	const struct dove9_memory_store *memory,
	const struct dove9_persona_core *persona);

/* Lifecycle */
int dove9_orchestrator_bridge_start(struct dove9_orchestrator_bridge *bridge);
void dove9_orchestrator_bridge_stop(struct dove9_orchestrator_bridge *bridge);
bool dove9_orchestrator_bridge_is_running(
	const struct dove9_orchestrator_bridge *bridge);

/* Event subscription */
void dove9_orchestrator_bridge_on(
	struct dove9_orchestrator_bridge *bridge,
	dove9_bridge_event_fn handler,
	void *context);

/* Process email */
struct dove9_message_process *
dove9_orchestrator_bridge_process_email(
	struct dove9_orchestrator_bridge *bridge,
	const struct dove9_dovecot_email *email);

/* Query */
void dove9_orchestrator_bridge_get_metrics(
	const struct dove9_orchestrator_bridge *bridge,
	struct dove9_kernel_metrics *out);

unsigned int
dove9_orchestrator_bridge_get_active_processes(
	struct dove9_orchestrator_bridge *bridge,
	struct dove9_message_process **out,
	unsigned int max_out);

struct dove9_system *
dove9_orchestrator_bridge_get_system(
	struct dove9_orchestrator_bridge *bridge);

#endif /* DOVE9_ORCHESTRATOR_BRIDGE_H */
