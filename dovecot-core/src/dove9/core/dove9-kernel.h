/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_KERNEL_H
#define DOVE9_KERNEL_H

#include "../types/dove9-types.h"
#include "../cognitive/dove9-triadic-engine.h"
#include "../integration/dove9-mail-protocol-bridge.h"

/*
 * Dove9 Kernel — The cognitive operating system core
 *
 * Integrates:
 *   - Triadic Cognitive Engine (3-phase loop)
 *   - Process table management
 *   - Mail protocol bridge
 *   - Priority-based process scheduling
 */

struct dove9_kernel;

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_kernel *
dove9_kernel_create(const struct dove9_cognitive_processor *processor,
		    const struct dove9_config *config);
void dove9_kernel_destroy(struct dove9_kernel **kernel);

int  dove9_kernel_start(struct dove9_kernel *kernel);
void dove9_kernel_stop(struct dove9_kernel *kernel);
bool dove9_kernel_is_running(const struct dove9_kernel *kernel);

/* ----------------------------------------------------------------
 * Event subscription
 * ---------------------------------------------------------------- */

void dove9_kernel_on(struct dove9_kernel *kernel,
		     dove9_kernel_event_fn handler,
		     void *context);

/* ----------------------------------------------------------------
 * Process management
 * ---------------------------------------------------------------- */

struct dove9_message_process *
dove9_kernel_create_process(struct dove9_kernel *kernel,
			    const char *message_id,
			    const char *from,
			    const char * const *to,
			    unsigned int to_count,
			    const char *subject,
			    const char *content,
			    int priority);

struct dove9_message_process *
dove9_kernel_get_process(struct dove9_kernel *kernel,
			 const char *process_id);

unsigned int
dove9_kernel_get_all_processes(struct dove9_kernel *kernel,
			       struct dove9_message_process **out,
			       unsigned int max_out);

unsigned int
dove9_kernel_get_active_processes(struct dove9_kernel *kernel,
				  struct dove9_message_process **out,
				  unsigned int max_out);

bool dove9_kernel_terminate_process(struct dove9_kernel *kernel,
				    const char *process_id);
bool dove9_kernel_suspend_process(struct dove9_kernel *kernel,
				  const char *process_id);
bool dove9_kernel_resume_process(struct dove9_kernel *kernel,
				 const char *process_id);

struct dove9_message_process *
dove9_kernel_fork_process(struct dove9_kernel *kernel,
			  const char *parent_id,
			  const char *content,
			  const char *subject);

/* ----------------------------------------------------------------
 * Mail protocol integration
 * ---------------------------------------------------------------- */

void dove9_kernel_enable_mail_protocol(
	struct dove9_kernel *kernel,
	const struct dove9_mailbox_mapping *mailboxes);

bool dove9_kernel_is_mail_protocol_enabled(
	const struct dove9_kernel *kernel);

struct dove9_message_process *
dove9_kernel_create_process_from_mail(
	struct dove9_kernel *kernel,
	const struct dove9_mail_message *mail);

struct dove9_message_process *
dove9_kernel_get_process_by_message_id(
	struct dove9_kernel *kernel,
	const char *message_id);

const char *
dove9_kernel_get_message_id_for_process(
	struct dove9_kernel *kernel,
	const char *process_id);

unsigned int
dove9_kernel_get_processes_by_mailbox(
	struct dove9_kernel *kernel,
	const char *mailbox,
	struct dove9_message_process **out,
	unsigned int max_out);

bool dove9_kernel_move_process_to_mailbox(
	struct dove9_kernel *kernel,
	const char *process_id,
	const char *target_mailbox);

const char *
dove9_kernel_get_mailbox_for_process(
	struct dove9_kernel *kernel,
	const char *process_id);

bool dove9_kernel_update_process_from_mail_flags(
	struct dove9_kernel *kernel,
	const char *process_id,
	unsigned int flags);

struct dove9_mail_protocol_bridge *
dove9_kernel_get_mail_bridge(struct dove9_kernel *kernel);

/* ----------------------------------------------------------------
 * State / metrics
 * ---------------------------------------------------------------- */

void dove9_kernel_get_metrics(const struct dove9_kernel *kernel,
			      struct dove9_kernel_metrics *out);

struct dove9_triadic_engine *
dove9_kernel_get_engine(struct dove9_kernel *kernel);

/* Drive one scheduling tick (for non-timer-based operation) */
void dove9_kernel_tick(struct dove9_kernel *kernel);

#endif /* DOVE9_KERNEL_H */
