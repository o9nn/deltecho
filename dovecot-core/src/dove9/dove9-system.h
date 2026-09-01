/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_SYSTEM_H
#define DOVE9_SYSTEM_H

#include "types/dove9-types.h"
#include "cognitive/dove9-triadic-engine.h"
#include "cognitive/dove9-dte-processor.h"
#include "core/dove9-kernel.h"
#include "integration/dove9-mail-protocol-bridge.h"

/* Forward declarations */
struct dove9_system;

/* ----------------------------------------------------------------
 * System configuration
 * ---------------------------------------------------------------- */

struct dove9_system_config {
	struct dove9_config base;

	/* Cognitive services (borrowed, not owned) */
	const struct dove9_llm_service *llm;
	const struct dove9_memory_store *memory;
	const struct dove9_persona_core *persona;

	/* Mail server integration */
	char milter_socket[256];
	char lmtp_socket[256];

	/* Bot identity */
	char bot_email_address[DOVE9_MAX_ADDR_LEN];
};

/* ----------------------------------------------------------------
 * System event types
 * ---------------------------------------------------------------- */

enum dove9_system_event_type {
	DOVE9_SYS_STARTED,
	DOVE9_SYS_STOPPED,
	DOVE9_SYS_MAIL_RECEIVED,
	DOVE9_SYS_RESPONSE_READY,
	DOVE9_SYS_KERNEL_EVENT,
	DOVE9_SYS_TRIAD_SYNC,
	DOVE9_SYS_CYCLE_COMPLETE,
};

struct dove9_system_event {
	enum dove9_system_event_type type;
	union {
		struct {
			const struct dove9_mail_message *mail;
			const struct dove9_message_process *process;
		} mail_received;
		struct {
			const struct dove9_mail_message *original;
			const struct dove9_mail_message *response;
			const char *process_id;
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
	} data;
};

typedef void (*dove9_system_event_fn)(const struct dove9_system_event *event,
				      void *context);

/* ----------------------------------------------------------------
 * API
 * ---------------------------------------------------------------- */

struct dove9_system *
dove9_system_create(const struct dove9_system_config *config);

void dove9_system_destroy(struct dove9_system **system);

/* Lifecycle */
int dove9_system_start(struct dove9_system *system);
void dove9_system_stop(struct dove9_system *system);
bool dove9_system_is_running(const struct dove9_system *system);

/* Event subscription */
void dove9_system_on(struct dove9_system *system,
		     dove9_system_event_fn handler,
		     void *context);

/* Mail processing */
struct dove9_message_process *
dove9_system_process_mail(struct dove9_system *system,
			  const struct dove9_mail_message *mail);

/* Query */
void dove9_system_get_metrics(const struct dove9_system *system,
			      struct dove9_kernel_metrics *out);

unsigned int
dove9_system_get_active_processes(struct dove9_system *system,
				  struct dove9_message_process **out,
				  unsigned int max_out);

/* Sub-object accessors */
struct dove9_kernel *
dove9_system_get_kernel(struct dove9_system *system);

struct dove9_dte_processor *
dove9_system_get_processor(struct dove9_system *system);

#endif /* DOVE9_SYSTEM_H */
