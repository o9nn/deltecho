/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-orchestrator-bridge.h"
#include "dove9-mail-protocol-bridge.h"
#include "../dove9-system.h"
#include "../core/dove9-kernel.h"
#include "../cognitive/dove9-dte-processor.h"
#include "../cognitive/dove9-triadic-engine.h"
#include "../utils/dove9-logger.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <time.h>

#define MAX_BRIDGE_HANDLERS 16
#define MAX_RESPONSE_QUEUE 64

struct dove9_bridge_handler_entry {
	dove9_bridge_event_fn handler;
	void *context;
};

struct dove9_orchestrator_bridge {
	struct dove9_orchestrator_bridge_config config;
	struct dove9_system *system;      /* owned: we create/destroy it */
	struct dove9_logger *logger;
	bool running;
	bool initialized;

	/* Response queue */
	struct dove9_email_response response_queue[MAX_RESPONSE_QUEUE];
	unsigned int response_queue_size;

	/* Event handlers */
	struct dove9_bridge_handler_entry handlers[MAX_BRIDGE_HANDLERS];
	unsigned int handler_count;

	/* Internal cognitive services (stored for lifetime) */
	const struct dove9_llm_service *llm;
	const struct dove9_memory_store *memory;
	const struct dove9_persona_core *persona;
};

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

static void copy_truncated(char *destination, size_t capacity,
			   const char *source)
{
	if (capacity == 0)
		return;
	if (source == NULL) {
		destination[0] = '\0';
		return;
	}

	size_t length = strlen(source);
	if (length >= capacity)
		length = capacity - 1;
	memcpy(destination, source, length);
	destination[length] = '\0';
}

static void emit_bridge_event(struct dove9_orchestrator_bridge *b,
			      const struct dove9_bridge_event *event)
{
	for (unsigned int i = 0; i < b->handler_count; i++)
		b->handlers[i].handler(event, b->handlers[i].context);
}

static void flush_responses(struct dove9_orchestrator_bridge *b)
{
	while (b->response_queue_size > 0) {
		b->response_queue_size--;
		struct dove9_bridge_event ev;
		ev.type = DOVE9_BRIDGE_SEND_RESPONSE;
		ev.data.send_response.response =
			&b->response_queue[b->response_queue_size];
		emit_bridge_event(b, &ev);
	}
}

static void queue_response(struct dove9_orchestrator_bridge *b,
			   const struct dove9_email_response *resp)
{
	if (b->response_queue_size >= MAX_RESPONSE_QUEUE)
		return;
	b->response_queue[b->response_queue_size++] = *resp;
	flush_responses(b);
}

static bool email_is_for_bot(const struct dove9_orchestrator_bridge *b,
			     const struct dove9_dovecot_email *email)
{
	for (unsigned int i = 0; i < email->to_count; i++) {
		if (strcasecmp(email->to[i], b->config.bot_email_address) == 0)
			return true;
	}
	return false;
}

/* ----------------------------------------------------------------
 * Kernel event forwarding
 *
 * The bridge subscribes to its internal system/kernel events
 * and re-emits them as bridge events.
 * ---------------------------------------------------------------- */

static void bridge_kernel_handler(const struct dove9_kernel_event *event,
				  void *context)
{
	struct dove9_orchestrator_bridge *b = context;

	switch (event->type) {
	case DOVE9_KERNEL_PROCESS_COMPLETED: {
		/* Build response email from completed process */
		const char *proc_id = event->data.process_completed.process_id;
		struct dove9_kernel *kern =
			dove9_system_get_kernel(b->system);
		struct dove9_message_process *proc =
			dove9_kernel_get_process(kern, proc_id);
		if (proc == NULL)
			break;

		struct dove9_email_response resp;
		memset(&resp, 0, sizeof(resp));
		snprintf(resp.to, sizeof(resp.to), "%s", proc->from);
		snprintf(resp.from, sizeof(resp.from), "%s",
			 b->config.bot_email_address);
					if (strncmp(proc->subject, "Re: ", 4) == 0) {
				copy_truncated(resp.subject, sizeof(resp.subject),
					       proc->subject);
			} else {
				static const char reply_prefix[] = "Re: ";
				memcpy(resp.subject, reply_prefix,
				       sizeof(reply_prefix) - 1);
				copy_truncated(
					resp.subject + sizeof(reply_prefix) - 1,
					sizeof(resp.subject) - (sizeof(reply_prefix) - 1),
					proc->subject);
			}

		snprintf(resp.in_reply_to, sizeof(resp.in_reply_to), "%s",
			 proc->message_id);
		snprintf(resp.body, sizeof(resp.body),
			 "[Cognitive Process Complete]\n"
			 "Subject: %s\nSalience: %.2f\n"
			 "Emotional Valence: %.2f\nArousal: %.2f",
			 proc->subject,
			 proc->cognitive_context.salience_score,
			 proc->cognitive_context.emotional_valence,
			 proc->cognitive_context.emotional_arousal);

		struct dove9_bridge_event be;
		be.type = DOVE9_BRIDGE_RESPONSE_READY;
		be.data.response_ready.response = &resp;
		emit_bridge_event(b, &be);

		if (b->config.enable_auto_response)
			queue_response(b, &resp);
		break;
	}

	case DOVE9_KERNEL_TRIAD_CONVERGENCE: {
		struct dove9_bridge_event be;
		be.type = DOVE9_BRIDGE_TRIAD_SYNC;
		be.data.triad_sync.triad = event->data.triad_convergence.triad;
		emit_bridge_event(b, &be);
		break;
	}

	case DOVE9_KERNEL_CYCLE_COMPLETE: {
		struct dove9_bridge_event be;
		be.type = DOVE9_BRIDGE_CYCLE_COMPLETE;
		be.data.cycle_complete.cycle = event->data.cycle_complete.cycle;
		be.data.cycle_complete.metrics = event->data.cycle_complete.metrics;
		emit_bridge_event(b, &be);
		break;
	}

	default: {
		/* Forward generic kernel events */
		struct dove9_bridge_event be;
		be.type = DOVE9_BRIDGE_KERNEL_EVENT;
		be.data.kernel_event.event = event;
		emit_bridge_event(b, &be);
		break;
	}
	}
}

/* ----------------------------------------------------------------
 * Default config
 * ---------------------------------------------------------------- */

struct dove9_orchestrator_bridge_config
dove9_orchestrator_bridge_config_default(void)
{
	struct dove9_orchestrator_bridge_config cfg;
	memset(&cfg, 0, sizeof(cfg));
	cfg.dove9_config = dove9_config_default();
	snprintf(cfg.bot_email_address, sizeof(cfg.bot_email_address),
		 "echo@localhost");
	cfg.enable_auto_response = true;
	cfg.response_delay_ms = 0;
	cfg.orchestrator_port = 0;
	return cfg;
}

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_orchestrator_bridge *
dove9_orchestrator_bridge_create(
	const struct dove9_orchestrator_bridge_config *config)
{
	struct dove9_orchestrator_bridge *b = calloc(1, sizeof(*b));
	if (b == NULL)
		return NULL;

	if (config != NULL)
		b->config = *config;
	else
		b->config = dove9_orchestrator_bridge_config_default();

	b->logger = dove9_logger_create("OrchestratorBridge");
	return b;
}

void dove9_orchestrator_bridge_destroy(
	struct dove9_orchestrator_bridge **bridge)
{
	if (bridge == NULL || *bridge == NULL)
		return;

	dove9_orchestrator_bridge_stop(*bridge);

	if ((*bridge)->system != NULL)
		dove9_system_destroy(&(*bridge)->system);

	dove9_logger_destroy(&(*bridge)->logger);
	free(*bridge);
	*bridge = NULL;
}

void dove9_orchestrator_bridge_initialize(
	struct dove9_orchestrator_bridge *bridge,
	const struct dove9_llm_service *llm,
	const struct dove9_memory_store *memory,
	const struct dove9_persona_core *persona)
{
	if (bridge == NULL)
		return;

	bridge->llm = llm;
	bridge->memory = memory;
	bridge->persona = persona;

	/* Create the Dove9System with these services */
	struct dove9_system_config sys_cfg;
	memset(&sys_cfg, 0, sizeof(sys_cfg));
	sys_cfg.base = bridge->config.dove9_config;
	sys_cfg.llm = llm;
	sys_cfg.memory = memory;
	sys_cfg.persona = persona;
	snprintf(sys_cfg.bot_email_address, sizeof(sys_cfg.bot_email_address),
		 "%s", bridge->config.bot_email_address);

	bridge->system = dove9_system_create(&sys_cfg);
	if (bridge->system == NULL) {
		dove9_log_error(bridge->logger,
				"Failed to create Dove9System");
		return;
	}

	/* Subscribe to kernel events */
	struct dove9_kernel *kern = dove9_system_get_kernel(bridge->system);
	if (kern != NULL)
		dove9_kernel_on(kern, bridge_kernel_handler, bridge);

	bridge->initialized = true;
	dove9_log_info(bridge->logger,
		       "Orchestrator bridge initialized with bot=%s",
		       bridge->config.bot_email_address);
}

int dove9_orchestrator_bridge_start(struct dove9_orchestrator_bridge *bridge)
{
	if (bridge == NULL || !bridge->initialized || bridge->running)
		return -1;

	int ret = dove9_system_start(bridge->system);
	if (ret != 0) return ret;

	bridge->running = true;

	struct dove9_bridge_event ev;
	ev.type = DOVE9_BRIDGE_STARTED;
	emit_bridge_event(bridge, &ev);

	dove9_log_info(bridge->logger, "Orchestrator bridge started");
	return 0;
}

void dove9_orchestrator_bridge_stop(struct dove9_orchestrator_bridge *bridge)
{
	if (bridge == NULL || !bridge->running)
		return;

	dove9_system_stop(bridge->system);
	bridge->running = false;

	struct dove9_bridge_event ev;
	ev.type = DOVE9_BRIDGE_STOPPED;
	emit_bridge_event(bridge, &ev);

	dove9_log_info(bridge->logger, "Orchestrator bridge stopped");
}

bool dove9_orchestrator_bridge_is_running(
	const struct dove9_orchestrator_bridge *bridge)
{
	return bridge != NULL && bridge->running;
}

/* ----------------------------------------------------------------
 * Event subscription
 * ---------------------------------------------------------------- */

void dove9_orchestrator_bridge_on(
	struct dove9_orchestrator_bridge *bridge,
	dove9_bridge_event_fn handler,
	void *context)
{
	if (bridge == NULL || handler == NULL)
		return;
	if (bridge->handler_count >= MAX_BRIDGE_HANDLERS)
		return;
	bridge->handlers[bridge->handler_count].handler = handler;
	bridge->handlers[bridge->handler_count].context = context;
	bridge->handler_count++;
}

/* ----------------------------------------------------------------
 * Process email
 * ---------------------------------------------------------------- */

struct dove9_message_process *
dove9_orchestrator_bridge_process_email(
	struct dove9_orchestrator_bridge *bridge,
	const struct dove9_dovecot_email *email)
{
	if (bridge == NULL || !bridge->initialized)
		return NULL;

	/* Check if email is addressed to the bot */
	if (!email_is_for_bot(bridge, email))
		return NULL;

	/* Convert to MailMessage */
	struct dove9_mail_message mail;
	memset(&mail, 0, sizeof(mail));
	snprintf(mail.message_id, sizeof(mail.message_id), "%s",
		 email->message_id[0] != '\0' ? email->message_id : "msg_anon");
	snprintf(mail.from, sizeof(mail.from), "%s", email->from);
	for (unsigned int i = 0; i < email->to_count && i < DOVE9_MAX_RECIPIENTS; i++)
		snprintf(mail.to[i], sizeof(mail.to[i]), "%s", email->to[i]);
	mail.to_count = email->to_count < DOVE9_MAX_RECIPIENTS
		? email->to_count : DOVE9_MAX_RECIPIENTS;
	snprintf(mail.subject, sizeof(mail.subject), "%s", email->subject);
	snprintf(mail.body, sizeof(mail.body), "%s", email->body);
	mail.timestamp = email->received_at;
	mail.received_at = email->received_at;
	snprintf(mail.mailbox, sizeof(mail.mailbox), "INBOX");

	/* Process through Dove9System */
	return dove9_system_process_mail(bridge->system, &mail);
}

/* ----------------------------------------------------------------
 * Queries
 * ---------------------------------------------------------------- */

void dove9_orchestrator_bridge_get_metrics(
	const struct dove9_orchestrator_bridge *bridge,
	struct dove9_kernel_metrics *out)
{
	if (bridge == NULL || bridge->system == NULL || out == NULL)
		return;
	dove9_system_get_metrics(bridge->system, out);
}

unsigned int
dove9_orchestrator_bridge_get_active_processes(
	struct dove9_orchestrator_bridge *bridge,
	struct dove9_message_process **out,
	unsigned int max_out)
{
	if (bridge == NULL || bridge->system == NULL)
		return 0;
	return dove9_system_get_active_processes(bridge->system, out, max_out);
}

struct dove9_system *
dove9_orchestrator_bridge_get_system(
	struct dove9_orchestrator_bridge *bridge)
{
	return bridge != NULL ? bridge->system : NULL;
}
