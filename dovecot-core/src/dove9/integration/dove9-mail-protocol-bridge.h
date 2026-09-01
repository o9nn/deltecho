/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_MAIL_PROTOCOL_BRIDGE_H
#define DOVE9_MAIL_PROTOCOL_BRIDGE_H

#include "../types/dove9-types.h"

/*
 * Mail Protocol Bridge
 *
 * Bridges mail messages (IMAP/SMTP/LMTP) to Dove9 MessageProcess abstractions.
 * Implements the core "mail as IPC" paradigm where:
 *   - Email messages → Process threads
 *   - Mailboxes → Process queues
 *   - Message flags → Process states
 */

struct dove9_mail_protocol_bridge;

/* Configuration */
struct dove9_mail_bridge_config {
	struct dove9_mailbox_mapping mailbox_mapping;
	int default_priority;
	bool enable_threading;
};

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_mail_protocol_bridge *
dove9_mail_bridge_create(const struct dove9_mail_bridge_config *config);
void dove9_mail_bridge_destroy(struct dove9_mail_protocol_bridge **bridge);

/* ----------------------------------------------------------------
 * Conversions
 * ---------------------------------------------------------------- */

/* Convert MailMessage → MessageProcess */
void dove9_mail_to_process(const struct dove9_mail_protocol_bridge *bridge,
			   const struct dove9_mail_message *mail,
			   struct dove9_message_process *out);

/* Convert MessageProcess → MailMessage (response) */
void dove9_process_to_mail(const struct dove9_mail_protocol_bridge *bridge,
			   const struct dove9_message_process *process,
			   const char *response_body,
			   struct dove9_mail_message *out);

/* ----------------------------------------------------------------
 * State / flag mapping
 * ---------------------------------------------------------------- */

enum dove9_process_state
dove9_mail_flags_to_state(unsigned int flags,
			  const char *mailbox,
			  const struct dove9_mailbox_mapping *mapping);

unsigned int
dove9_state_to_mail_flags(enum dove9_process_state state);

const char *
dove9_state_to_mailbox(enum dove9_process_state state,
		       const struct dove9_mailbox_mapping *mapping);

/* ----------------------------------------------------------------
 * Priority calculation
 * ---------------------------------------------------------------- */

int dove9_mail_calculate_priority(const struct dove9_mail_message *mail,
				  int default_priority);

/* ----------------------------------------------------------------
 * Context creation
 * ---------------------------------------------------------------- */

void dove9_mail_create_cognitive_context(
	const struct dove9_mail_message *mail,
	struct dove9_cognitive_context *out);

/* ----------------------------------------------------------------
 * Thread relations
 * ---------------------------------------------------------------- */

struct dove9_thread_relations {
	char parent_id[DOVE9_MAX_ID_LEN];
	char sibling_ids[DOVE9_MAX_REFERENCES][DOVE9_MAX_ID_LEN];
	unsigned int sibling_count;
};

void dove9_mail_extract_thread_relations(
	const struct dove9_mail_message *mail,
	struct dove9_thread_relations *out);

/* Accessor */
const struct dove9_mailbox_mapping *
dove9_mail_bridge_get_mapping(const struct dove9_mail_protocol_bridge *bridge);

#endif /* DOVE9_MAIL_PROTOCOL_BRIDGE_H */
