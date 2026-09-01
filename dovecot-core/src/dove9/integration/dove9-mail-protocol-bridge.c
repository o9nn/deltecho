/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-mail-protocol-bridge.h"
#include "../utils/dove9-logger.h"

#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* ----------------------------------------------------------------
 * Internals
 * ---------------------------------------------------------------- */

struct dove9_mail_protocol_bridge {
	struct dove9_mail_bridge_config config;
	struct dove9_logger *logger;
};

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

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_mail_protocol_bridge *
dove9_mail_bridge_create(const struct dove9_mail_bridge_config *config)
{
	struct dove9_mail_protocol_bridge *b = calloc(1, sizeof(*b));
	if (b == NULL)
		return NULL;

	if (config != NULL)
		b->config = *config;
	else {
		b->config.mailbox_mapping = dove9_mailbox_mapping_default();
		b->config.default_priority = 5;
		b->config.enable_threading = true;
	}

	b->logger = dove9_logger_create("MailBridge");
	return b;
}

void dove9_mail_bridge_destroy(struct dove9_mail_protocol_bridge **bridge)
{
	if (bridge == NULL || *bridge == NULL)
		return;
	dove9_logger_destroy(&(*bridge)->logger);
	free(*bridge);
	*bridge = NULL;
}

/* ----------------------------------------------------------------
 * State / flag mapping
 * ---------------------------------------------------------------- */

enum dove9_process_state
dove9_mail_flags_to_state(unsigned int flags,
			  const char *mailbox,
			  const struct dove9_mailbox_mapping *m)
{
	/* Mailbox-based */
	if (mailbox != NULL && m != NULL) {
		if (strcmp(mailbox, m->trash) == 0)
			return DOVE9_PROCESS_TERMINATED;
		if (strcmp(mailbox, m->drafts) == 0)
			return DOVE9_PROCESS_SUSPENDED;
		if (strcmp(mailbox, m->sent) == 0)
			return DOVE9_PROCESS_COMPLETED;
		if (strcmp(mailbox, m->processing) == 0)
			return DOVE9_PROCESS_PROCESSING;
	}

	/* Flag-based */
	if (flags & DOVE9_MAIL_FLAG_DELETED)
		return DOVE9_PROCESS_TERMINATED;
	if (flags & DOVE9_MAIL_FLAG_DRAFT)
		return DOVE9_PROCESS_SUSPENDED;
	if (flags & DOVE9_MAIL_FLAG_ANSWERED)
		return DOVE9_PROCESS_COMPLETED;
	if (flags & DOVE9_MAIL_FLAG_FLAGGED)
		return DOVE9_PROCESS_ACTIVE;

	return DOVE9_PROCESS_PENDING;
}

unsigned int dove9_state_to_mail_flags(enum dove9_process_state state)
{
	switch (state) {
	case DOVE9_PROCESS_COMPLETED:
		return DOVE9_MAIL_FLAG_SEEN | DOVE9_MAIL_FLAG_ANSWERED;
	case DOVE9_PROCESS_ACTIVE:
	case DOVE9_PROCESS_PROCESSING:
		return DOVE9_MAIL_FLAG_FLAGGED;
	case DOVE9_PROCESS_SUSPENDED:
		return DOVE9_MAIL_FLAG_DRAFT;
	case DOVE9_PROCESS_TERMINATED:
		return DOVE9_MAIL_FLAG_DELETED;
	default:
		return 0;
	}
}

const char *
dove9_state_to_mailbox(enum dove9_process_state state,
		       const struct dove9_mailbox_mapping *m)
{
	switch (state) {
	case DOVE9_PROCESS_PENDING:
		return m->inbox;
	case DOVE9_PROCESS_ACTIVE:
	case DOVE9_PROCESS_PROCESSING:
	case DOVE9_PROCESS_WAITING:
		return m->processing;
	case DOVE9_PROCESS_COMPLETED:
		return m->sent;
	case DOVE9_PROCESS_SUSPENDED:
		return m->drafts;
	case DOVE9_PROCESS_TERMINATED:
		return m->trash;
	}
	return m->inbox;
}

/* ----------------------------------------------------------------
 * Priority calculation
 * ---------------------------------------------------------------- */

static bool str_contains_lower(const char *haystack, const char *needle)
{
	/* Case-insensitive substring search */
	size_t hlen = strlen(haystack);
	size_t nlen = strlen(needle);
	if (nlen > hlen) return false;

	for (size_t i = 0; i <= hlen - nlen; i++) {
		bool match = true;
		for (size_t j = 0; j < nlen; j++) {
			if (tolower((unsigned char)haystack[i + j]) !=
			    tolower((unsigned char)needle[j])) {
				match = false;
				break;
			}
		}
		if (match)
			return true;
	}
	return false;
}

int dove9_mail_calculate_priority(const struct dove9_mail_message *mail,
				  int default_priority)
{
	int priority = default_priority;

	/* Higher for direct (single recipient) */
	if (mail->to_count == 1)
		priority += 2;

	/* Flagged */
	if (mail->flags & DOVE9_MAIL_FLAG_FLAGGED)
		priority += 2;

	/* Reply threading */
	if (mail->in_reply_to[0] != '\0' ||
	    str_contains_lower(mail->subject, "re:"))
		priority += 1;

	/* Urgent markers */
	static const char *urgent[] = {
		"urgent", "important", "asap", "priority", "critical"
	};
	for (int i = 0; i < 5; i++) {
		if (str_contains_lower(mail->subject, urgent[i])) {
			priority += 3;
			break;
		}
	}

	/* Large messages get slight penalty */
	if (mail->size > 100000)
		priority -= 1;

	/* Clamp [1, 10] */
	if (priority < 1) priority = 1;
	if (priority > 10) priority = 10;
	return priority;
}

/* ----------------------------------------------------------------
 * Context creation
 * ---------------------------------------------------------------- */

void dove9_mail_create_cognitive_context(
	const struct dove9_mail_message *mail,
	struct dove9_cognitive_context *ctx)
{
	memset(ctx, 0, sizeof(*ctx));
	ctx->emotional_valence = 0.0;
	ctx->emotional_arousal = 0.3;

	double salience = 0.5;
	if (strlen(mail->subject) > 50) salience += 0.1;
	if (strlen(mail->body) > 500) salience += 0.1;
	if (mail->in_reply_to[0] != '\0') salience += 0.1;
	/* TODO: check attachments when supported */
	if (salience > 1.0) salience = 1.0;

	ctx->salience_score = salience;
	ctx->attention_weight = salience;
	ctx->active_couplings = dove9_coupling_set(
		0, DOVE9_COUPLING_PERCEPTION_MEMORY);
}

/* ----------------------------------------------------------------
 * Thread relations
 * ---------------------------------------------------------------- */

void dove9_mail_extract_thread_relations(
	const struct dove9_mail_message *mail,
	struct dove9_thread_relations *out)
{
	memset(out, 0, sizeof(*out));

	if (mail->in_reply_to[0] != '\0')
		snprintf(out->parent_id, sizeof(out->parent_id),
			 "%s", mail->in_reply_to);

	for (unsigned int i = 0;
	     i < mail->reference_count && out->sibling_count < DOVE9_MAX_REFERENCES;
	     i++) {
		if (strcmp(mail->references[i], mail->in_reply_to) != 0) {
			snprintf(out->sibling_ids[out->sibling_count],
				 DOVE9_MAX_ID_LEN, "%s", mail->references[i]);
			out->sibling_count++;
		}
	}
}

/* ----------------------------------------------------------------
 * Mail ↔ Process conversions
 * ---------------------------------------------------------------- */

void dove9_mail_to_process(const struct dove9_mail_protocol_bridge *bridge,
			   const struct dove9_mail_message *mail,
			   struct dove9_message_process *out)
{
	memset(out, 0, sizeof(*out));

	/* ID = message_id */
	snprintf(out->id, sizeof(out->id), "%s", mail->message_id);
	snprintf(out->message_id, sizeof(out->message_id), "%s", mail->message_id);
	snprintf(out->from, sizeof(out->from), "%s", mail->from);
	unsigned int clamped_to = mail->to_count < DOVE9_MAX_RECIPIENTS
		? mail->to_count : DOVE9_MAX_RECIPIENTS;
	for (unsigned int i = 0; i < clamped_to; i++) {
		snprintf(out->to[i], sizeof(out->to[i]), "%s", mail->to[i]);
	}
	out->to_count = clamped_to;
	snprintf(out->subject, sizeof(out->subject), "%s", mail->subject);
	snprintf(out->content, sizeof(out->content), "%s", mail->body);

	out->state = dove9_mail_flags_to_state(
		mail->flags, mail->mailbox,
		&bridge->config.mailbox_mapping);
	out->priority = dove9_mail_calculate_priority(
		mail, bridge->config.default_priority);
	out->created_at = mail->timestamp;
	out->current_step = 1;
	out->current_stream = DOVE9_STREAM_PRIMARY;

	dove9_mail_create_cognitive_context(mail, &out->cognitive_context);

	/* Thread relationships */
	if (mail->in_reply_to[0] != '\0')
		snprintf(out->parent_id, sizeof(out->parent_id),
			 "%s", mail->in_reply_to);
}

void dove9_process_to_mail(const struct dove9_mail_protocol_bridge *bridge,
			   const struct dove9_message_process *process,
			   const char *response_body,
			   struct dove9_mail_message *out)
{
	memset(out, 0, sizeof(*out));

	/* Generate a bounded response Message-ID without truncating the domain. */
	static const char message_id_suffix[] = "@dove9.local>";
	size_t process_id_length = strlen(process->id);
	size_t max_process_id_length = sizeof(out->message_id) -
		1 - 1 - (sizeof(message_id_suffix) - 1);
	if (process_id_length > max_process_id_length)
		process_id_length = max_process_id_length;
	out->message_id[0] = '<';
	memcpy(out->message_id + 1, process->id, process_id_length);
	memcpy(out->message_id + 1 + process_id_length,
	       message_id_suffix, sizeof(message_id_suffix));

	/* Thread linkage */
	if (process->parent_id[0] != '\0') {
		snprintf(out->thread_id, sizeof(out->thread_id),
			 "%s", process->parent_id);
		snprintf(out->in_reply_to, sizeof(out->in_reply_to),
			 "%s", process->parent_id);
		snprintf(out->references[0], DOVE9_MAX_ID_LEN,
			 "%s", process->parent_id);
		out->reference_count = 1;
	}

	/* Swap from/to for response */
	if (process->to_count > 0)
		snprintf(out->from, sizeof(out->from), "%s", process->to[0]);
	snprintf(out->to[0], sizeof(out->to[0]), "%s", process->from);
	out->to_count = 1;

	/* Subject with Re: prefix, preserving NUL termination under truncation. */
	if (strncmp(process->subject, "Re: ", 4) == 0) {
		copy_truncated(out->subject, sizeof(out->subject), process->subject);
	} else {
		static const char reply_prefix[] = "Re: ";
		memcpy(out->subject, reply_prefix, sizeof(reply_prefix) - 1);
		copy_truncated(out->subject + sizeof(reply_prefix) - 1,
			       sizeof(out->subject) - (sizeof(reply_prefix) - 1),
			       process->subject);
	}

	snprintf(out->body, sizeof(out->body), "%s", response_body);

	/* Dove9 metadata headers */
	unsigned int h = 0;
	snprintf(out->headers[h].key, DOVE9_MAX_HEADER_KEY, "X-Dove9-Process-Id");
	snprintf(out->headers[h].val, DOVE9_MAX_HEADER_VAL, "%s", process->id);
	h++;
	snprintf(out->headers[h].key, DOVE9_MAX_HEADER_KEY, "X-Dove9-Priority");
	snprintf(out->headers[h].val, DOVE9_MAX_HEADER_VAL, "%d", process->priority);
	h++;
	snprintf(out->headers[h].key, DOVE9_MAX_HEADER_KEY, "X-Dove9-Step");
	snprintf(out->headers[h].val, DOVE9_MAX_HEADER_VAL, "%d", process->current_step);
	h++;
	out->header_count = h;

	out->timestamp = time(NULL);
	out->received_at = time(NULL);
	out->flags = dove9_state_to_mail_flags(process->state);
	snprintf(out->mailbox, sizeof(out->mailbox), "%s",
		 dove9_state_to_mailbox(process->state,
					&bridge->config.mailbox_mapping));
}

/* ----------------------------------------------------------------
 * Accessor
 * ---------------------------------------------------------------- */

const struct dove9_mailbox_mapping *
dove9_mail_bridge_get_mapping(const struct dove9_mail_protocol_bridge *bridge)
{
	if (bridge == NULL)
		return NULL;
	return &bridge->config.mailbox_mapping;
}
