/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-system.h"
#include "utils/dove9-logger.h"

#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_SYSTEM_HANDLERS 16
#define MAX_PENDING_MAIL    256

/* ----------------------------------------------------------------
 * Pending mail tracking
 * ---------------------------------------------------------------- */

struct dove9_pending_mail {
	struct dove9_mail_message mail;
	char process_id[DOVE9_MAX_ID_LEN];
	bool occupied;
};

/* ----------------------------------------------------------------
 * Internal structure
 * ---------------------------------------------------------------- */

struct system_handler_entry {
	dove9_system_event_fn handler;
	void *context;
};

struct dove9_system {
	struct dove9_system_config config;
	struct dove9_kernel *kernel;                   /* owned */
	struct dove9_dte_processor *processor;         /* owned */
	struct dove9_mail_protocol_bridge *mail_bridge; /* owned */
	struct dove9_logger *logger;
	bool running;

	/* Pending mail / process-to-mail mapping */
	struct dove9_pending_mail pending[MAX_PENDING_MAIL];

	/* Event handlers */
	struct system_handler_entry handlers[MAX_SYSTEM_HANDLERS];
	unsigned int handler_count;
};

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

static void emit_system_event(struct dove9_system *sys,
			      const struct dove9_system_event *event)
{
	for (unsigned int i = 0; i < sys->handler_count; i++)
		sys->handlers[i].handler(event, sys->handlers[i].context);
}

static struct dove9_pending_mail *
find_pending_by_process_id(struct dove9_system *sys, const char *process_id)
{
	for (unsigned int i = 0; i < MAX_PENDING_MAIL; i++) {
		if (sys->pending[i].occupied &&
		    strcmp(sys->pending[i].process_id, process_id) == 0)
			return &sys->pending[i];
	}
	return NULL;
}

static struct dove9_pending_mail *
alloc_pending(struct dove9_system *sys)
{
	for (unsigned int i = 0; i < MAX_PENDING_MAIL; i++) {
		if (!sys->pending[i].occupied)
			return &sys->pending[i];
	}
	return NULL;
}

/* ----------------------------------------------------------------
 * Kernel event handler
 * ---------------------------------------------------------------- */

static void system_kernel_handler(const struct dove9_kernel_event *event,
				  void *context)
{
	struct dove9_system *sys = context;

	/* Forward raw kernel event */
	struct dove9_system_event se;
	se.type = DOVE9_SYS_KERNEL_EVENT;
	se.data.kernel_event.event = event;
	emit_system_event(sys, &se);

	switch (event->type) {
	case DOVE9_KERNEL_PROCESS_COMPLETED: {
		const char *proc_id =
			event->data.process_completed.process_id;
		struct dove9_pending_mail *pm =
			find_pending_by_process_id(sys, proc_id);
		if (pm == NULL) break;

		/* Generate response mail */
		struct dove9_message_process *proc =
			dove9_kernel_get_process(sys->kernel, proc_id);
		if (proc == NULL) break;

		/* Build response body from cognitive result */
		char response_body[4096];
		const struct dove9_cognitive_context *ctx =
			&proc->cognitive_context;
		snprintf(response_body, sizeof(response_body),
			 "Subject: %s\nSalience: %.2f\n"
			 "Valence: %.2f\nArousal: %.2f\n"
			 "Processing completed.",
			 proc->subject,
			 ctx->salience_score,
			 ctx->emotional_valence,
			 ctx->emotional_arousal);

		struct dove9_mail_message response;
		dove9_process_to_mail(sys->mail_bridge, proc,
				      response_body, &response);

		/* Emit response ready */
		struct dove9_system_event re;
		re.type = DOVE9_SYS_RESPONSE_READY;
		re.data.response_ready.original = &pm->mail;
		re.data.response_ready.response = &response;
		re.data.response_ready.process_id = proc_id;
		emit_system_event(sys, &re);

		/* Cleanup pending */
		pm->occupied = false;
		break;
	}

	case DOVE9_KERNEL_TRIAD_CONVERGENCE: {
		struct dove9_system_event te;
		te.type = DOVE9_SYS_TRIAD_SYNC;
		te.data.triad_sync.triad =
			event->data.triad_convergence.triad;
		emit_system_event(sys, &te);
		break;
	}

	case DOVE9_KERNEL_CYCLE_COMPLETE: {
		struct dove9_system_event ce;
		ce.type = DOVE9_SYS_CYCLE_COMPLETE;
		ce.data.cycle_complete.cycle =
			event->data.cycle_complete.cycle;
		ce.data.cycle_complete.metrics =
			event->data.cycle_complete.metrics;
		emit_system_event(sys, &ce);
		break;
	}

	default:
		break;
	}
}

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_system *
dove9_system_create(const struct dove9_system_config *config)
{
	if (config == NULL)
		return NULL;

	struct dove9_system *sys = calloc(1, sizeof(*sys));
	if (sys == NULL)
		return NULL;

	sys->config = *config;
	sys->logger = dove9_logger_create("Dove9System");

	/* Create mail protocol bridge */
	struct dove9_mail_bridge_config bridge_cfg;
	bridge_cfg.mailbox_mapping = dove9_mailbox_mapping_default();
	bridge_cfg.default_priority = 5;
	bridge_cfg.enable_threading = true;
	sys->mail_bridge = dove9_mail_bridge_create(&bridge_cfg);
	if (sys->mail_bridge == NULL) {
		dove9_log_error(sys->logger, "Failed to create mail bridge");
		dove9_logger_destroy(&sys->logger);
		free(sys);
		return NULL;
	}

	/* Create DTE processor */
	struct dove9_dte_processor_config proc_cfg;
	proc_cfg.enable_parallel_cognition =
		config->base.enable_parallel_cognition;
	proc_cfg.memory_retrieval_count = 10;
	proc_cfg.salience_threshold =
		config->base.default_salience_threshold;
	sys->processor = dove9_dte_processor_create(
		config->llm, config->memory, config->persona, &proc_cfg);
	if (sys->processor == NULL) {
		dove9_log_error(sys->logger, "Failed to create processor");
		dove9_mail_bridge_destroy(&sys->mail_bridge);
		dove9_logger_destroy(&sys->logger);
		free(sys);
		return NULL;
	}

	/* Get the cognitive processor vtable from DTE */
	struct dove9_cognitive_processor cog_proc =
		dove9_dte_processor_as_cognitive(sys->processor);

	/* Create the kernel */
	sys->kernel = dove9_kernel_create(&cog_proc, &config->base);
	if (sys->kernel == NULL) {
		dove9_log_error(sys->logger, "Failed to create kernel");
		dove9_dte_processor_destroy(&sys->processor);
		dove9_mail_bridge_destroy(&sys->mail_bridge);
		dove9_logger_destroy(&sys->logger);
		free(sys);
		return NULL;
	}

	/* Subscribe to kernel events */
	dove9_kernel_on(sys->kernel, system_kernel_handler, sys);

	dove9_log_info(sys->logger, "Dove9System created");
	return sys;
}

void dove9_system_destroy(struct dove9_system **system)
{
	if (system == NULL || *system == NULL)
		return;

	dove9_system_stop(*system);
	dove9_kernel_destroy(&(*system)->kernel);
	dove9_dte_processor_destroy(&(*system)->processor);
	dove9_mail_bridge_destroy(&(*system)->mail_bridge);
	dove9_logger_destroy(&(*system)->logger);
	free(*system);
	*system = NULL;
}

int dove9_system_start(struct dove9_system *system)
{
	if (system == NULL || system->running)
		return 0;

	int ret = dove9_kernel_start(system->kernel);
	if (ret != 0) return ret;

	system->running = true;

	struct dove9_system_event ev;
	ev.type = DOVE9_SYS_STARTED;
	emit_system_event(system, &ev);

	dove9_log_info(system->logger, "Dove9System started");
	return 0;
}

void dove9_system_stop(struct dove9_system *system)
{
	if (system == NULL || !system->running)
		return;

	dove9_kernel_stop(system->kernel);
	system->running = false;

	struct dove9_system_event ev;
	ev.type = DOVE9_SYS_STOPPED;
	emit_system_event(system, &ev);

	dove9_log_info(system->logger, "Dove9System stopped");
}

bool dove9_system_is_running(const struct dove9_system *system)
{
	return system != NULL && system->running;
}

/* ----------------------------------------------------------------
 * Event subscription
 * ---------------------------------------------------------------- */

void dove9_system_on(struct dove9_system *system,
		     dove9_system_event_fn handler,
		     void *context)
{
	if (system == NULL || handler == NULL)
		return;
	if (system->handler_count >= MAX_SYSTEM_HANDLERS)
		return;
	system->handlers[system->handler_count].handler = handler;
	system->handlers[system->handler_count].context = context;
	system->handler_count++;
}

/* ----------------------------------------------------------------
 * Mail processing
 * ---------------------------------------------------------------- */

struct dove9_message_process *
dove9_system_process_mail(struct dove9_system *system,
			  const struct dove9_mail_message *mail)
{
	if (system == NULL || mail == NULL)
		return NULL;

	/* Store pending mail */
	struct dove9_pending_mail *pm = alloc_pending(system);
	if (pm == NULL) {
		dove9_log_warn(system->logger,
			       "Pending mail table full, dropping message %s",
			       mail->message_id);
		return NULL;
	}
	pm->mail = *mail;
	pm->occupied = true;

	/* Convert mail to process via bridge for priority calculation */
	struct dove9_message_process bridge_proc;
	dove9_mail_to_process(system->mail_bridge, mail, &bridge_proc);

	/* Create kernel process */
	const char *to_ptrs[DOVE9_MAX_RECIPIENTS];
	for (unsigned int i = 0; i < mail->to_count; i++)
		to_ptrs[i] = mail->to[i];

	struct dove9_message_process *proc =
		dove9_kernel_create_process(
			system->kernel,
			mail->message_id,
			mail->from,
			to_ptrs, mail->to_count,
			mail->subject, mail->body,
			bridge_proc.priority);

	if (proc == NULL) {
		pm->occupied = false;
		return NULL;
	}

	/* Link pending mail to process */
	snprintf(pm->process_id, sizeof(pm->process_id), "%s", proc->id);

	/* Emit mail_received */
	struct dove9_system_event ev;
	ev.type = DOVE9_SYS_MAIL_RECEIVED;
	ev.data.mail_received.mail = mail;
	ev.data.mail_received.process = proc;
	emit_system_event(system, &ev);

	return proc;
}

/* ----------------------------------------------------------------
 * Query
 * ---------------------------------------------------------------- */

void dove9_system_get_metrics(const struct dove9_system *system,
			      struct dove9_kernel_metrics *out)
{
	if (system == NULL || system->kernel == NULL || out == NULL)
		return;
	dove9_kernel_get_metrics(system->kernel, out);
}

unsigned int
dove9_system_get_active_processes(struct dove9_system *system,
				  struct dove9_message_process **out,
				  unsigned int max_out)
{
	if (system == NULL || system->kernel == NULL)
		return 0;
	return dove9_kernel_get_active_processes(system->kernel, out, max_out);
}

struct dove9_kernel *
dove9_system_get_kernel(struct dove9_system *system)
{
	return system != NULL ? system->kernel : NULL;
}

struct dove9_dte_processor *
dove9_system_get_processor(struct dove9_system *system)
{
	return system != NULL ? system->processor : NULL;
}
