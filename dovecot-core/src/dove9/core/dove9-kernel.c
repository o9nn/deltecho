/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-kernel.h"
#include "../utils/dove9-logger.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* ----------------------------------------------------------------
 * Internal structures
 * ---------------------------------------------------------------- */

#define MAX_KERNEL_EVENT_HANDLERS 16

struct dove9_kernel_event_sub {
	dove9_kernel_event_fn handler;
	void *context;
};

/* Bidirectional message-id ↔ process-id map entry */
struct dove9_id_map_entry {
	char message_id[DOVE9_MAX_ID_LEN];
	char process_id[DOVE9_MAX_ID_LEN];
};

struct dove9_kernel {
	struct dove9_config config;
	struct dove9_triadic_engine *engine;
	struct dove9_logger *logger;
	bool running;

	/* Process table */
	struct dove9_message_process processes[DOVE9_MAX_PROCESSES];
	unsigned int process_count;

	/* Process queue (indices into processes[]) */
	unsigned int queue[DOVE9_MAX_QUEUE_DEPTH];
	unsigned int queue_size;

	/* Active process set (indices into processes[]) */
	unsigned int active[DOVE9_MAX_PROCESSES];
	unsigned int active_count;

	/* Metrics */
	struct dove9_kernel_metrics metrics;

	/* Event subscribers */
	struct dove9_kernel_event_sub handlers[MAX_KERNEL_EVENT_HANDLERS];
	unsigned int handler_count;

	/* Mail protocol support */
	struct dove9_mail_protocol_bridge *mail_bridge;
	struct dove9_mailbox_mapping mailbox_mapping;
	bool mail_protocol_enabled;

	/* Message-id ↔ process-id mapping */
	struct dove9_id_map_entry id_map[DOVE9_MAX_PROCESSES];
	unsigned int id_map_count;

	/* Counter for unique process IDs */
	unsigned int next_proc_seq;
};

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

static void emit_kernel_event(struct dove9_kernel *k,
			      const struct dove9_kernel_event *event)
{
	for (unsigned int i = 0; i < k->handler_count; i++)
		k->handlers[i].handler(event, k->handlers[i].context);
}

static void generate_process_id(struct dove9_kernel *k, char *buf, size_t size)
{
	k->next_proc_seq++;
	snprintf(buf, size, "proc_%lu_%u",
		 (unsigned long)time(NULL), k->next_proc_seq);
}

/* Find process by id, returns index or -1 */
static int find_process(struct dove9_kernel *k, const char *id)
{
	for (unsigned int i = 0; i < k->process_count; i++) {
		if (strcmp(k->processes[i].id, id) == 0)
			return (int)i;
	}
	return -1;
}

/* Find id_map entry by message_id */
static int find_by_message_id(struct dove9_kernel *k, const char *message_id)
{
	for (unsigned int i = 0; i < k->id_map_count; i++) {
		if (strcmp(k->id_map[i].message_id, message_id) == 0)
			return (int)i;
	}
	return -1;
}

/* Find id_map entry by process_id */
static int find_by_process_id(struct dove9_kernel *k, const char *process_id)
{
	for (unsigned int i = 0; i < k->id_map_count; i++) {
		if (strcmp(k->id_map[i].process_id, process_id) == 0)
			return (int)i;
	}
	return -1;
}

/* Remove from active set */
static void remove_active(struct dove9_kernel *k, unsigned int proc_idx)
{
	for (unsigned int i = 0; i < k->active_count; i++) {
		if (k->active[i] == proc_idx) {
			k->active[i] = k->active[k->active_count - 1];
			k->active_count--;
			return;
		}
	}
}

/* Enqueue by priority (higher priority = earlier) */
static void enqueue_process(struct dove9_kernel *k, unsigned int proc_idx,
			    int priority)
{
	/* Find insertion point */
	unsigned int insert = k->queue_size;
	for (unsigned int i = 0; i < k->queue_size; i++) {
		if (k->processes[k->queue[i]].priority < priority) {
			insert = i;
			break;
		}
	}

	/* Shift right */
	if (k->queue_size < DOVE9_MAX_QUEUE_DEPTH) {
		for (unsigned int i = k->queue_size; i > insert; i--)
			k->queue[i] = k->queue[i - 1];
		k->queue[insert] = proc_idx;
		k->queue_size++;
	}

	/* Update cognitive load */
	k->metrics.cognitive_load =
		(double)k->active_count /
		(double)k->config.max_concurrent_processes;
}

/* Dequeue front */
static int dequeue_process(struct dove9_kernel *k)
{
	if (k->queue_size == 0)
		return -1;
	int idx = (int)k->queue[0];
	for (unsigned int i = 0; i + 1 < k->queue_size; i++)
		k->queue[i] = k->queue[i + 1];
	k->queue_size--;
	return idx;
}

/* Remove from queue by index */
static void remove_from_queue(struct dove9_kernel *k, unsigned int proc_idx)
{
	for (unsigned int i = 0; i < k->queue_size; i++) {
		if (k->queue[i] == proc_idx) {
			for (unsigned int j = i; j + 1 < k->queue_size; j++)
				k->queue[j] = k->queue[j + 1];
			k->queue_size--;
			return;
		}
	}
}

/* Format process response */
static void format_process_response(const struct dove9_message_process *proc,
				    char *buf, size_t buf_size)
{
	const struct dove9_cognitive_context *ctx = &proc->cognitive_context;
	snprintf(buf, buf_size,
		 "[Cognitive Process Complete]\n"
		 "Subject: %s\nPriority: %d\n"
		 "Salience: %.2f\nEmotional Valence: %.2f\n"
		 "Emotional Arousal: %.2f\n"
		 "Processing completed at step %d of cycle.",
		 proc->subject, proc->priority,
		 ctx->salience_score, ctx->emotional_valence,
		 ctx->emotional_arousal, proc->current_step);
}

/* ----------------------------------------------------------------
 * Engine event handler
 * ---------------------------------------------------------------- */

static void handle_engine_event(const struct dove9_triadic_event *event,
				void *context)
{
	struct dove9_kernel *k = context;

	switch (event->type) {
	case DOVE9_TRIADIC_STEP_COMPLETE:
		k->metrics.total_steps++;
		break;

	case DOVE9_TRIADIC_CYCLE_COMPLETE: {
		k->metrics.total_cycles = event->data.cycle_complete.cycle_number;
		struct dove9_kernel_event ke;
		ke.type = DOVE9_KERNEL_CYCLE_COMPLETE;
		ke.data.cycle_complete.cycle =
			event->data.cycle_complete.cycle_number;
		ke.data.cycle_complete.metrics = k->metrics;
		emit_kernel_event(k, &ke);
		break;
	}

	case DOVE9_TRIADIC_TRIAD_SYNC: {
		struct dove9_kernel_event ke;
		ke.type = DOVE9_KERNEL_TRIAD_CONVERGENCE;
		ke.data.triad_convergence.triad =
			event->data.triad_sync.triad;
		emit_kernel_event(k, &ke);

		/* Synchronize — update coherence */
		k->metrics.stream_coherence = 1.0; /* all 3 active */
		struct dove9_kernel_event se;
		se.type = DOVE9_KERNEL_STREAM_SYNC;
		se.data.stream_sync.streams[0] = DOVE9_STREAM_PRIMARY;
		se.data.stream_sync.streams[1] = DOVE9_STREAM_SECONDARY;
		se.data.stream_sync.streams[2] = DOVE9_STREAM_TERTIARY;
		emit_kernel_event(k, &se);
		break;
	}

	case DOVE9_TRIADIC_COUPLING_ACTIVE: {
		k->metrics.active_couplings = dove9_coupling_set(
			k->metrics.active_couplings,
			event->data.coupling_active.coupling);
		struct dove9_kernel_event ke;
		ke.type = DOVE9_KERNEL_COUPLING_ACTIVATED;
		ke.data.coupling_activated.coupling =
			event->data.coupling_active.coupling;
		emit_kernel_event(k, &ke);
		break;
	}

	default:
		break;
	}
}

/* ----------------------------------------------------------------
 * Process execution
 * ---------------------------------------------------------------- */

static void execute_process(struct dove9_kernel *k, unsigned int proc_idx)
{
	struct dove9_message_process *proc = &k->processes[proc_idx];
	proc->state = DOVE9_PROCESS_PROCESSING;
	time_t start = time(NULL);

	/* Process through the triadic engine */
	int ret = dove9_triadic_engine_process_message(k->engine, proc);

	/* Record execution */
	if (proc->exec_count < DOVE9_MAX_EXEC_HISTORY) {
		struct dove9_execution_record *rec =
			&proc->exec_history[proc->exec_count++];
		rec->timestamp = time(NULL);
		rec->step = dove9_triadic_engine_get_current_step(k->engine);
		rec->stream = proc->current_stream;
		rec->duration_ms = (int64_t)(time(NULL) - start) * 1000;
		rec->result = (ret == 0) ? 0 : 2;
	}

	/* Complete the process */
	proc->state = DOVE9_PROCESS_COMPLETED;
	remove_active(k, proc_idx);
	k->metrics.processes_completed++;

	time_t latency = time(NULL) - proc->created_at;
	unsigned int n = k->metrics.processes_completed;
	k->metrics.average_latency =
		(k->metrics.average_latency * (n - 1) + (double)latency) / n;

	/* Emit completion event */
	struct dove9_kernel_event ke;
	ke.type = DOVE9_KERNEL_PROCESS_COMPLETED;
	ke.data.process_completed.process_id = proc->id;
	ke.data.process_completed.result = &proc->cognitive_context;
	emit_kernel_event(k, &ke);

	/* If mail protocol enabled, emit mail ready */
	if (k->mail_protocol_enabled && k->mail_bridge != NULL) {
		char response_text[4096];
		format_process_response(proc, response_text,
					sizeof(response_text));
		struct dove9_mail_message mail_out;
		dove9_process_to_mail(k->mail_bridge, proc,
				      response_text, &mail_out);
		struct dove9_kernel_event me;
		me.type = DOVE9_KERNEL_MAIL_MESSAGE_READY;
		me.data.mail_message_ready.mail = &mail_out;
		emit_kernel_event(k, &me);
	}
}

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_kernel *
dove9_kernel_create(const struct dove9_cognitive_processor *processor,
		    const struct dove9_config *config)
{
	struct dove9_kernel *k = calloc(1, sizeof(*k));
	if (k == NULL)
		return NULL;

	if (config != NULL)
		k->config = *config;
	else
		k->config = dove9_config_default();

	k->engine = dove9_triadic_engine_create(
		processor, k->config.step_duration_ms);
	if (k->engine == NULL) {
		free(k);
		return NULL;
	}

	k->logger = dove9_logger_create("Dove9Kernel");

	/* Subscribe to engine events */
	dove9_triadic_engine_on(k->engine, handle_engine_event, k);

	/* Initialize metrics */
	k->metrics.stream_coherence = 1.0;

	return k;
}

void dove9_kernel_destroy(struct dove9_kernel **kernel)
{
	if (kernel == NULL || *kernel == NULL)
		return;

	dove9_kernel_stop(*kernel);
	dove9_triadic_engine_destroy(&(*kernel)->engine);
	if ((*kernel)->mail_bridge)
		dove9_mail_bridge_destroy(&(*kernel)->mail_bridge);
	dove9_logger_destroy(&(*kernel)->logger);
	free(*kernel);
	*kernel = NULL;
}

int dove9_kernel_start(struct dove9_kernel *kernel)
{
	if (kernel == NULL || kernel->running)
		return 0;

	kernel->running = true;
	dove9_triadic_engine_start(kernel->engine);

	struct dove9_kernel_event ke;
	ke.type = DOVE9_KERNEL_STEP_ADVANCE;
	ke.data.step_advance.step = 0;
	ke.data.step_advance.cycle = 0;
	emit_kernel_event(kernel, &ke);

	dove9_log_info(kernel->logger, "Dove9 kernel started");
	return 0;
}

void dove9_kernel_stop(struct dove9_kernel *kernel)
{
	if (kernel == NULL || !kernel->running)
		return;

	kernel->running = false;
	dove9_triadic_engine_stop(kernel->engine);

	/* Suspend all active processes */
	for (unsigned int i = 0; i < kernel->active_count; i++) {
		kernel->processes[kernel->active[i]].state =
			DOVE9_PROCESS_SUSPENDED;
	}
	kernel->active_count = 0;

	dove9_log_info(kernel->logger, "Dove9 kernel stopped");
}

bool dove9_kernel_is_running(const struct dove9_kernel *kernel)
{
	return kernel != NULL && kernel->running;
}

/* ----------------------------------------------------------------
 * Event subscription
 * ---------------------------------------------------------------- */

void dove9_kernel_on(struct dove9_kernel *kernel,
		     dove9_kernel_event_fn handler,
		     void *context)
{
	if (kernel == NULL || handler == NULL)
		return;
	if (kernel->handler_count >= MAX_KERNEL_EVENT_HANDLERS)
		return;

	kernel->handlers[kernel->handler_count].handler = handler;
	kernel->handlers[kernel->handler_count].context = context;
	kernel->handler_count++;
}

/* ----------------------------------------------------------------
 * Process management
 * ---------------------------------------------------------------- */

struct dove9_message_process *
dove9_kernel_create_process(struct dove9_kernel *k,
			    const char *message_id,
			    const char *from,
			    const char * const *to,
			    unsigned int to_count,
			    const char *subject,
			    const char *content,
			    int priority)
{
	if (k == NULL || k->process_count >= DOVE9_MAX_PROCESSES)
		return NULL;

	struct dove9_message_process *proc =
		&k->processes[k->process_count];
	memset(proc, 0, sizeof(*proc));

	generate_process_id(k, proc->id, sizeof(proc->id));
	snprintf(proc->message_id, sizeof(proc->message_id), "%s", message_id);
	snprintf(proc->from, sizeof(proc->from), "%s", from);
	for (unsigned int i = 0; i < to_count && i < DOVE9_MAX_RECIPIENTS; i++)
		snprintf(proc->to[i], sizeof(proc->to[i]), "%s", to[i]);
	proc->to_count = to_count < DOVE9_MAX_RECIPIENTS ? to_count : DOVE9_MAX_RECIPIENTS;
	snprintf(proc->subject, sizeof(proc->subject), "%s", subject);
	snprintf(proc->content, sizeof(proc->content), "%s", content);

	proc->state = DOVE9_PROCESS_PENDING;
	proc->priority = priority;
	proc->created_at = time(NULL);
	proc->current_step = 0;
	proc->current_stream = DOVE9_STREAM_PRIMARY;
	proc->cognitive_context = dove9_cognitive_context_init();

	unsigned int idx = k->process_count;
	k->process_count++;
	enqueue_process(k, idx, priority);

	/* Emit event */
	struct dove9_kernel_event ke;
	ke.type = DOVE9_KERNEL_PROCESS_CREATED;
	ke.data.process_created.process = proc;
	emit_kernel_event(k, &ke);

	return proc;
}

struct dove9_message_process *
dove9_kernel_get_process(struct dove9_kernel *k, const char *process_id)
{
	int idx = find_process(k, process_id);
	return idx >= 0 ? &k->processes[idx] : NULL;
}

unsigned int
dove9_kernel_get_all_processes(struct dove9_kernel *k,
			       struct dove9_message_process **out,
			       unsigned int max_out)
{
	unsigned int n = k->process_count < max_out ? k->process_count : max_out;
	for (unsigned int i = 0; i < n; i++)
		out[i] = &k->processes[i];
	return n;
}

unsigned int
dove9_kernel_get_active_processes(struct dove9_kernel *k,
				  struct dove9_message_process **out,
				  unsigned int max_out)
{
	unsigned int n = 0;
	for (unsigned int i = 0; i < k->active_count && n < max_out; i++)
		out[n++] = &k->processes[k->active[i]];
	return n;
}

bool dove9_kernel_terminate_process(struct dove9_kernel *k, const char *process_id)
{
	int idx = find_process(k, process_id);
	if (idx < 0) return false;

	k->processes[idx].state = DOVE9_PROCESS_TERMINATED;
	remove_active(k, (unsigned int)idx);
	remove_from_queue(k, (unsigned int)idx);
	return true;
}

bool dove9_kernel_suspend_process(struct dove9_kernel *k, const char *process_id)
{
	int idx = find_process(k, process_id);
	if (idx < 0 || k->processes[idx].state != DOVE9_PROCESS_ACTIVE)
		return false;

	k->processes[idx].state = DOVE9_PROCESS_SUSPENDED;
	remove_active(k, (unsigned int)idx);
	return true;
}

bool dove9_kernel_resume_process(struct dove9_kernel *k, const char *process_id)
{
	int idx = find_process(k, process_id);
	if (idx < 0 || k->processes[idx].state != DOVE9_PROCESS_SUSPENDED)
		return false;

	k->processes[idx].state = DOVE9_PROCESS_PENDING;
	enqueue_process(k, (unsigned int)idx, k->processes[idx].priority);
	return true;
}

struct dove9_message_process *
dove9_kernel_fork_process(struct dove9_kernel *k,
			  const char *parent_id,
			  const char *content,
			  const char *subject)
{
	int pidx = find_process(k, parent_id);
	if (pidx < 0) return NULL;

	struct dove9_message_process *parent = &k->processes[pidx];

	char fork_msg_id[DOVE9_MAX_ID_LEN];
	snprintf(fork_msg_id, sizeof(fork_msg_id),
		 "%s_fork_%lu", parent->message_id, (unsigned long)time(NULL));

	const char *subj = subject;
	char subj_buf[DOVE9_MAX_SUBJECT_LEN];
	if (subject == NULL) {
		if (strncmp(parent->subject, "Re: ", 4) == 0)
			subj = parent->subject;
		else {
			snprintf(subj_buf, sizeof(subj_buf),
				 "Re: %s", parent->subject);
			subj = subj_buf;
		}
	}

	const char *to_ptrs[DOVE9_MAX_RECIPIENTS];
	for (unsigned int i = 0; i < parent->to_count; i++)
		to_ptrs[i] = parent->to[i];

	struct dove9_message_process *child =
		dove9_kernel_create_process(k, fork_msg_id,
					    parent->from, to_ptrs,
					    parent->to_count,
					    subj, content,
					    parent->priority);
	if (child == NULL) return NULL;

	/* Set parent/child links */
	snprintf(child->parent_id, sizeof(child->parent_id), "%s", parent_id);
	if (parent->child_count < DOVE9_MAX_CHILD_IDS) {
		snprintf(parent->child_ids[parent->child_count],
			 DOVE9_MAX_ID_LEN, "%s", child->id);
		parent->child_count++;
	}

	/* Inherit cognitive context */
	child->cognitive_context = parent->cognitive_context;

	return child;
}

/* ----------------------------------------------------------------
 * Mail protocol integration
 * ---------------------------------------------------------------- */

void dove9_kernel_enable_mail_protocol(
	struct dove9_kernel *k,
	const struct dove9_mailbox_mapping *mailboxes)
{
	if (mailboxes != NULL)
		k->mailbox_mapping = *mailboxes;
	else
		k->mailbox_mapping = dove9_mailbox_mapping_default();

	struct dove9_mail_bridge_config cfg;
	cfg.mailbox_mapping = k->mailbox_mapping;
	cfg.default_priority = 5;
	cfg.enable_threading = true;

	if (k->mail_bridge != NULL)
		dove9_mail_bridge_destroy(&k->mail_bridge);
	k->mail_bridge = dove9_mail_bridge_create(&cfg);
	k->mail_protocol_enabled = true;

	dove9_log_info(k->logger, "Mail protocol enabled");
}

bool dove9_kernel_is_mail_protocol_enabled(const struct dove9_kernel *k)
{
	return k != NULL && k->mail_protocol_enabled;
}

struct dove9_message_process *
dove9_kernel_create_process_from_mail(
	struct dove9_kernel *k,
	const struct dove9_mail_message *mail)
{
	if (k == NULL || !k->mail_protocol_enabled || k->mail_bridge == NULL)
		return NULL;

	/* Convert mail to process via bridge */
	struct dove9_message_process bridge_proc;
	dove9_mail_to_process(k->mail_bridge, mail, &bridge_proc);

	/* Register in kernel process table */
	const char *to_ptrs[DOVE9_MAX_RECIPIENTS];
	unsigned int clamped_to = mail->to_count < DOVE9_MAX_RECIPIENTS
		? mail->to_count : DOVE9_MAX_RECIPIENTS;
	for (unsigned int i = 0; i < clamped_to; i++)
		to_ptrs[i] = mail->to[i];

	struct dove9_message_process *kproc =
		dove9_kernel_create_process(k,
					    mail->message_id,
					    mail->from,
					    to_ptrs, clamped_to,
					    mail->subject, mail->body,
					    bridge_proc.priority);
	if (kproc == NULL) return NULL;

	/* Store bidirectional mapping */
	if (k->id_map_count < DOVE9_MAX_PROCESSES) {
		snprintf(k->id_map[k->id_map_count].message_id,
			 DOVE9_MAX_ID_LEN, "%s", mail->message_id);
		snprintf(k->id_map[k->id_map_count].process_id,
			 DOVE9_MAX_ID_LEN, "%s", kproc->id);
		k->id_map_count++;
	}

	dove9_log_info(k->logger,
		       "Created process from mail: pid=%s mid=%s from=%s",
		       kproc->id, mail->message_id, mail->from);

	return kproc;
}

struct dove9_message_process *
dove9_kernel_get_process_by_message_id(struct dove9_kernel *k,
				       const char *message_id)
{
	int idx = find_by_message_id(k, message_id);
	if (idx < 0) return NULL;
	return dove9_kernel_get_process(k, k->id_map[idx].process_id);
}

const char *
dove9_kernel_get_message_id_for_process(struct dove9_kernel *k,
					const char *process_id)
{
	int idx = find_by_process_id(k, process_id);
	if (idx < 0) return NULL;
	return k->id_map[idx].message_id;
}

unsigned int
dove9_kernel_get_processes_by_mailbox(
	struct dove9_kernel *k,
	const char *mailbox,
	struct dove9_message_process **out,
	unsigned int max_out)
{
	if (!k->mail_protocol_enabled)
		return 0;

	/* Map mailbox → target state */
	enum dove9_process_state target;
	const struct dove9_mailbox_mapping *m = &k->mailbox_mapping;

	if (strcmp(mailbox, m->inbox) == 0)
		target = DOVE9_PROCESS_PENDING;
	else if (strcmp(mailbox, m->processing) == 0)
		target = DOVE9_PROCESS_PROCESSING;
	else if (strcmp(mailbox, m->sent) == 0)
		target = DOVE9_PROCESS_COMPLETED;
	else if (strcmp(mailbox, m->drafts) == 0)
		target = DOVE9_PROCESS_SUSPENDED;
	else if (strcmp(mailbox, m->trash) == 0)
		target = DOVE9_PROCESS_TERMINATED;
	else
		return 0;

	unsigned int n = 0;
	for (unsigned int i = 0; i < k->process_count && n < max_out; i++) {
		if (k->processes[i].state == target)
			out[n++] = &k->processes[i];
	}
	return n;
}

bool dove9_kernel_move_process_to_mailbox(
	struct dove9_kernel *k,
	const char *process_id,
	const char *target_mailbox)
{
	if (!k->mail_protocol_enabled)
		return false;

	int pidx = find_process(k, process_id);
	if (pidx < 0) return false;

	struct dove9_message_process *proc = &k->processes[pidx];
	const struct dove9_mailbox_mapping *m = &k->mailbox_mapping;

	enum dove9_process_state new_state;
	if (strcmp(target_mailbox, m->inbox) == 0)
		new_state = DOVE9_PROCESS_PENDING;
	else if (strcmp(target_mailbox, m->processing) == 0)
		new_state = DOVE9_PROCESS_PROCESSING;
	else if (strcmp(target_mailbox, m->sent) == 0)
		new_state = DOVE9_PROCESS_COMPLETED;
	else if (strcmp(target_mailbox, m->drafts) == 0)
		new_state = DOVE9_PROCESS_SUSPENDED;
	else if (strcmp(target_mailbox, m->trash) == 0)
		new_state = DOVE9_PROCESS_TERMINATED;
	else
		return false;

	enum dove9_process_state old_state = proc->state;
	proc->state = new_state;

	if (old_state == DOVE9_PROCESS_ACTIVE ||
	    old_state == DOVE9_PROCESS_PROCESSING)
		remove_active(k, (unsigned int)pidx);

	if (new_state == DOVE9_PROCESS_PENDING)
		enqueue_process(k, (unsigned int)pidx, proc->priority);

	return true;
}

const char *
dove9_kernel_get_mailbox_for_process(struct dove9_kernel *k,
				     const char *process_id)
{
	if (!k->mail_protocol_enabled || k->mail_bridge == NULL)
		return NULL;

	int pidx = find_process(k, process_id);
	if (pidx < 0) return NULL;

	return dove9_state_to_mailbox(
		k->processes[pidx].state,
		dove9_mail_bridge_get_mapping(k->mail_bridge));
}

bool dove9_kernel_update_process_from_mail_flags(
	struct dove9_kernel *k,
	const char *process_id,
	unsigned int flags)
{
	int pidx = find_process(k, process_id);
	if (pidx < 0) return false;

	struct dove9_message_process *proc = &k->processes[pidx];

	if (flags & DOVE9_MAIL_FLAG_DELETED) {
		proc->state = DOVE9_PROCESS_TERMINATED;
		remove_active(k, (unsigned int)pidx);
	} else if (flags & DOVE9_MAIL_FLAG_DRAFT) {
		proc->state = DOVE9_PROCESS_SUSPENDED;
		remove_active(k, (unsigned int)pidx);
	} else if (flags & DOVE9_MAIL_FLAG_ANSWERED) {
		proc->state = DOVE9_PROCESS_COMPLETED;
		remove_active(k, (unsigned int)pidx);
	} else if (flags & DOVE9_MAIL_FLAG_FLAGGED) {
		proc->priority += 2;
		if (proc->priority > 10) proc->priority = 10;
	}

	return true;
}

struct dove9_mail_protocol_bridge *
dove9_kernel_get_mail_bridge(struct dove9_kernel *k)
{
	return k != NULL ? k->mail_bridge : NULL;
}

/* ----------------------------------------------------------------
 * Metrics / state
 * ---------------------------------------------------------------- */

void dove9_kernel_get_metrics(const struct dove9_kernel *k,
			      struct dove9_kernel_metrics *out)
{
	if (k == NULL || out == NULL) return;
	*out = k->metrics;
}

struct dove9_triadic_engine *
dove9_kernel_get_engine(struct dove9_kernel *k)
{
	return k != NULL ? k->engine : NULL;
}

/* ----------------------------------------------------------------
 * Tick: drive scheduling (non-timer mode)
 * ---------------------------------------------------------------- */

void dove9_kernel_tick(struct dove9_kernel *k)
{
	if (k == NULL || !k->running)
		return;

	/* Activate processes from queue */
	while (k->active_count < k->config.max_concurrent_processes &&
	       k->queue_size > 0) {
		int idx = dequeue_process(k);
		if (idx < 0) break;

		k->processes[idx].state = DOVE9_PROCESS_ACTIVE;
		k->active[k->active_count++] = (unsigned int)idx;
	}

	/* Execute each active process.
	 * execute_process() calls remove_active() which swaps the last
	 * element into position i, so we must NOT increment i after a
	 * removal — the swapped-in element now occupies this slot. */
	for (unsigned int i = 0; i < k->active_count; ) {
		unsigned int pidx = k->active[i];
		if (k->processes[pidx].state == DOVE9_PROCESS_ACTIVE) {
			execute_process(k, pidx);
			/* remove_active swapped last element into slot i,
			 * so do not increment — re-examine same index */
		} else {
			i++;
		}
	}

	/* Advance the triadic engine step */
	dove9_triadic_engine_advance_step(k->engine);
}
