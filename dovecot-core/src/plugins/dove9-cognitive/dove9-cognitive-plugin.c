/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

/*
 * dove9-cognitive-plugin.c
 *
 * Dovecot mail plugin that wires transactional mail events into the
 * Dove9 cognitive pipeline.  Every new mail delivery triggers
 * dove9_system_process_mail(), mapping the message onto a Dove9 kernel
 * process that traverses the triadic cognitive loop (12-step cycle,
 * 3 streams at 120° phase offset).
 *
 * When a process completes, the DOVE9_SYS_RESPONSE_READY event fires
 * and (optionally) queues a reply back through LMTP.
 *
 * Architecture path:  Dovecot's notify plugin framework
 *   → dove9-cognitive plugin (this file)
 *     → dove9_system (dove9/dove9-system.h)
 *       → dove9_kernel + triadic engine + DTE processor
 *
 * This satisfies the Dove9 paradigm: "mail server is the CPU".
 */

#include "lib.h"
#include "array.h"
#include "ioloop.h"
#include "istream.h"
#include "str.h"
#include "strfuncs.h"
#include "message-size.h"
#include "mail-storage.h"
#include "mail-storage-private.h"
#include "mail-user.h"
#include "notify-plugin.h"
#include "settings.h"

#include "dove9-cognitive-plugin.h"

/* ---------------------------------------------------------------
 * Include the Dove9 public API
 * --------------------------------------------------------------- */
#include "dove9-system.h"

/* ---------------------------------------------------------------
 * Plugin constants
 * --------------------------------------------------------------- */

#define DOVE9_COGNITIVE_PLUGIN_NAME "dove9_cognitive"

/* Setting keys expected in dovecot.conf → plugin { … } */
#define DOVE9_SET_ENABLED          "dove9_cognitive_enabled"
#define DOVE9_SET_BOT_EMAIL        "dove9_bot_email"
#define DOVE9_SET_MILTER_SOCKET    "dove9_milter_socket"
#define DOVE9_SET_LMTP_SOCKET      "dove9_lmtp_socket"
#define DOVE9_SET_STEP_DURATION_MS "dove9_step_duration_ms"
#define DOVE9_SET_MAX_PROCESSES    "dove9_max_processes"

/* ---------------------------------------------------------------
 * Per-user context attached via MODULE_CONTEXT
 * --------------------------------------------------------------- */

static MODULE_CONTEXT_DEFINE_INIT(dove9_cognitive_user_module,
				  &mail_user_module_register);

struct dove9_cognitive_user {
	union mail_user_module_context module_ctx;
	struct dove9_system *system;   /* owned, one per user */
	bool enabled;
};

/* ---------------------------------------------------------------
 * Plugin-global state
 * --------------------------------------------------------------- */

static struct module *dove9_module = NULL;
static struct notify_context *dove9_notify_ctx = NULL;

/* Stub cognitive services (real implementations injected at runtime
 * by the orchestrator; stubs ensure the pipeline never crashes) */

static int stub_llm_generate(void *user_data ATTR_UNUSED,
			     const char *prompt ATTR_UNUSED,
			     const char **context_strs ATTR_UNUSED,
			     unsigned int context_count ATTR_UNUSED,
			     char *out_buf, size_t out_buf_size)
{
	i_strocpy(out_buf, "[dove9-cognitive: no LLM configured]", out_buf_size);
	return 0;
}

static int stub_llm_generate_parallel(void *user_data ATTR_UNUSED,
				      const char *prompt ATTR_UNUSED,
				      const char **history ATTR_UNUSED,
				      unsigned int history_count ATTR_UNUSED,
				      char *integrated_out ATTR_UNUSED,
				      char *cognitive_out ATTR_UNUSED,
				      char *affective_out ATTR_UNUSED,
				      char *relevance_out ATTR_UNUSED,
				      size_t buf_size ATTR_UNUSED)
{
	return -1; /* not available */
}

static const struct dove9_llm_service stub_llm = {
	.user_data = NULL,
	.generate_response = stub_llm_generate,
	.generate_parallel_response = stub_llm_generate_parallel,
};

static int stub_mem_store(void *user_data ATTR_UNUSED,
			  int chat_id ATTR_UNUSED,
			  int message_id ATTR_UNUSED,
			  const char *sender ATTR_UNUSED,
			  const char *text ATTR_UNUSED)
{
	return 0;
}

static int stub_mem_recent(void *user_data ATTR_UNUSED,
			   unsigned int count ATTR_UNUSED,
			   const char **out_memories ATTR_UNUSED,
			   unsigned int *out_count)
{
	if (out_count != NULL) *out_count = 0;
	return 0;
}

static int stub_mem_relevant(void *user_data ATTR_UNUSED,
			     const char *query ATTR_UNUSED,
			     unsigned int count ATTR_UNUSED,
			     const char **out_memories ATTR_UNUSED,
			     unsigned int *out_count)
{
	if (out_count != NULL) *out_count = 0;
	return 0;
}

static const struct dove9_memory_store stub_memory = {
	.user_data = NULL,
	.store_memory = stub_mem_store,
	.retrieve_recent = stub_mem_recent,
	.retrieve_relevant = stub_mem_relevant,
};

static const char *stub_persona_personality(void *user_data ATTR_UNUSED)
{
	return "neutral"; /* neutral personality description */
}

static int stub_persona_emotion(void *user_data ATTR_UNUSED,
				char *emotion_out, size_t emotion_size,
				double *intensity_out)
{
	i_strocpy(emotion_out, "neutral", emotion_size);
	if (intensity_out != NULL)
		*intensity_out = 0.5;
	return 0;
}

static int stub_persona_update(void *user_data ATTR_UNUSED,
			       const char **keys ATTR_UNUSED,
			       const double *values ATTR_UNUSED,
			       unsigned int count ATTR_UNUSED)
{
	return 0;
}

static const struct dove9_persona_core stub_persona = {
	.user_data = NULL,
	.get_personality = stub_persona_personality,
	.get_dominant_emotion = stub_persona_emotion,
	.update_emotional_state = stub_persona_update,
};

/* ---------------------------------------------------------------
 * Dove9 system event handler
 * --------------------------------------------------------------- */

static void
dove9_system_event_handler(const struct dove9_system_event *event,
			   void *context ATTR_UNUSED)
{
	switch (event->type) {
	case DOVE9_SYS_RESPONSE_READY:
		/* The cognitive pipeline produced a response.
		 *
		 * In the full Dove9 paradigm this would inject a reply
		 * back through LMTP.  For now we log it — the
		 * orchestrator bridge (TypeScript side) or a future
		 * LMTP injection hook picks this up via the event bus.
		 */
		i_info("dove9-cognitive: response ready for process %s",
		       event->data.response_ready.process_id);
		break;

	case DOVE9_SYS_CYCLE_COMPLETE:
		i_debug("dove9-cognitive: cycle %u complete, "
			"steps=%llu, coherence=%.2f",
			event->data.cycle_complete.cycle,
			(unsigned long long)
			event->data.cycle_complete.metrics.total_steps,
			event->data.cycle_complete.metrics.stream_coherence);
		break;

	case DOVE9_SYS_TRIAD_SYNC:
		i_debug("dove9-cognitive: triadic convergence at t=%u",
			event->data.triad_sync.triad->time_point);
		break;

	default:
		break;
	}
}

/* ---------------------------------------------------------------
 * Convert a Dovecot mail object → dove9_mail_message
 * --------------------------------------------------------------- */

static bool
dovecot_mail_to_dove9(struct mail *mail,
		      struct dove9_mail_message *out)
{
	const char *subject = NULL, *from = NULL, *message_id = NULL;
	const char *const *to_header;

	memset(out, 0, sizeof(*out));

	/* Message-ID */
	if (mail_get_first_header(mail, "Message-ID", &message_id) < 0 ||
	    message_id == NULL)
		return FALSE;
	i_strocpy(out->message_id, message_id, DOVE9_MAX_ID_LEN);

	/* From */
	if (mail_get_first_header(mail, "From", &from) >= 0 && from != NULL)
		i_strocpy(out->from, from, DOVE9_MAX_ADDR_LEN);

	/* To — may be multi-valued */
	if (mail_get_headers(mail, "To", &to_header) >= 0 && to_header != NULL) {
		for (unsigned int i = 0;
		     to_header[i] != NULL &&
		     i < DOVE9_MAX_RECIPIENTS; i++) {
			i_strocpy(out->to[i], to_header[i],
				  DOVE9_MAX_ADDR_LEN);
			out->to_count++;
		}
	}

	/* Subject */
	if (mail_get_first_header(mail, "Subject", &subject) >= 0 &&
	    subject != NULL)
		i_strocpy(out->subject, subject, DOVE9_MAX_SUBJECT_LEN);

	/* Date */
	time_t date;
	int tz;
	if (mail_get_date(mail, &date, &tz) >= 0)
		out->timestamp = date;

	/* Body — attempt a snippet for cognitive processing.
	 * We read up to DOVE9_MAX_BODY_LEN-1 bytes from the
	 * plain text body part if available. */
	struct message_size hdr_size;
	struct istream *input;
	if (mail_get_stream(mail, &hdr_size, NULL, &input) >= 0) {
		/* Skip past headers */
		i_stream_skip(input, hdr_size.physical_size);
		const unsigned char *data;
		size_t sz;
		if (i_stream_read_bytes(input, &data, &sz, 1) > 0 || sz > 0) {
			if (sz > DOVE9_MAX_BODY_LEN - 1)
				sz = DOVE9_MAX_BODY_LEN - 1;
			memcpy(out->body, data, sz);
			out->body[sz] = '\0';
		}
	}

	return TRUE;
}

/* ---------------------------------------------------------------
 * Notify vtable — transactional hooks
 * --------------------------------------------------------------- */

/* Per-transaction context */
struct dove9_txn {
	struct dove9_cognitive_user *duser;
	ARRAY(struct dove9_mail_message) saved_messages;
	pool_t pool;
};

static void *
dove9_txn_begin(struct mailbox_transaction_context *t)
{
	struct mail_user *user = mail_storage_get_user(
		mailbox_get_storage(mailbox_transaction_get_mailbox(t)));
	struct dove9_cognitive_user *duser =
		MODULE_CONTEXT(user, dove9_cognitive_user_module);

	if (duser == NULL || !duser->enabled)
		return NULL;

	pool_t pool = pool_alloconly_create("dove9 txn", 4096);
	struct dove9_txn *txn = p_new(pool, struct dove9_txn, 1);
	txn->duser = duser;
	txn->pool = pool;
	p_array_init(&txn->saved_messages, pool, 4);
	return txn;
}

static void
dove9_mail_save_hook(void *_txn, struct mail *mail)
{
	struct dove9_txn *txn = _txn;
	if (txn == NULL) return;

	struct dove9_mail_message dmsg;
	if (dovecot_mail_to_dove9(mail, &dmsg)) {
		array_push_back(&txn->saved_messages, &dmsg);
	}
}

static void
dove9_mail_copy_hook(void *_txn, struct mail *src ATTR_UNUSED,
		     struct mail *dst)
{
	/* Treat a copy (e.g. IMAP COPY) like a save into the target */
	dove9_mail_save_hook(_txn, dst);
}

static void
dove9_txn_commit(void *_txn,
		 struct mail_transaction_commit_changes *changes ATTR_UNUSED)
{
	struct dove9_txn *txn = _txn;
	if (txn == NULL) return;

	/* Feed every saved message into the Dove9 pipeline */
	const struct dove9_mail_message *msg;
	array_foreach(&txn->saved_messages, msg) {
		dove9_system_process_mail(txn->duser->system, msg);
	}

	pool_unref(&txn->pool);
}

static void
dove9_txn_rollback(void *_txn)
{
	struct dove9_txn *txn = _txn;
	if (txn == NULL) return;
	pool_unref(&txn->pool);
}

static const struct notify_vfuncs dove9_notify_vfuncs = {
	.mail_transaction_begin = dove9_txn_begin,
	.mail_save = dove9_mail_save_hook,
	.mail_copy = dove9_mail_copy_hook,
	.mail_transaction_commit = dove9_txn_commit,
	.mail_transaction_rollback = dove9_txn_rollback,
};

/* ---------------------------------------------------------------
 * Per-user init / deinit
 * --------------------------------------------------------------- */

static void dove9_cognitive_user_deinit(struct mail_user *user)
{
	struct dove9_cognitive_user *duser =
		MODULE_CONTEXT(user, dove9_cognitive_user_module);

	if (duser != NULL && duser->system != NULL)
		dove9_system_destroy(&duser->system);

	duser->module_ctx.super.deinit(user);
}

static void dove9_cognitive_user_created(struct mail_user *user)
{
	const char *enabled_str =
		mail_user_plugin_getenv(user, DOVE9_SET_ENABLED);
	if (enabled_str == NULL || strcasecmp(enabled_str, "yes") != 0)
		return;

	struct mail_user_vfuncs *v = user->vlast;
	struct dove9_cognitive_user *duser =
		p_new(user->pool, struct dove9_cognitive_user, 1);
	duser->module_ctx.super = *v;
	user->vlast = &duser->module_ctx.super;
	v->deinit = dove9_cognitive_user_deinit;
	duser->enabled = TRUE;

	/* Build Dove9 system config from dovecot plugin settings */
	struct dove9_system_config cfg;
	memset(&cfg, 0, sizeof(cfg));

	/* Step duration */
	const char *step_ms =
		mail_user_plugin_getenv(user, DOVE9_SET_STEP_DURATION_MS);
	cfg.base.step_duration_ms = (step_ms != NULL) ?
		(unsigned int)strtoul(step_ms, NULL, 10) : 100;

	/* Max processes */
	const char *max_proc =
		mail_user_plugin_getenv(user, DOVE9_SET_MAX_PROCESSES);
	cfg.base.max_concurrent_processes = (max_proc != NULL) ?
		(unsigned int)strtoul(max_proc, NULL, 10) : 64;
	cfg.base.max_queue_depth = cfg.base.max_concurrent_processes * 4;

	cfg.base.enable_deltachat = true;
	cfg.base.enable_parallel_cognition = true;
	cfg.base.default_salience_threshold = 0.3;

	/* Bot email */
	const char *bot_email =
		mail_user_plugin_getenv(user, DOVE9_SET_BOT_EMAIL);
	if (bot_email != NULL)
		i_strocpy(cfg.bot_email_address, bot_email,
			  DOVE9_MAX_ADDR_LEN);
	else
		i_strocpy(cfg.bot_email_address, "echo@deltecho.local",
			  DOVE9_MAX_ADDR_LEN);

	/* Milter socket */
	const char *milter =
		mail_user_plugin_getenv(user, DOVE9_SET_MILTER_SOCKET);
	if (milter != NULL) {
		i_strocpy(cfg.milter_socket, milter,
			  sizeof(cfg.milter_socket));
		cfg.base.enable_milter = true;
	}

	/* LMTP socket */
	const char *lmtp =
		mail_user_plugin_getenv(user, DOVE9_SET_LMTP_SOCKET);
	if (lmtp != NULL) {
		i_strocpy(cfg.lmtp_socket, lmtp, sizeof(cfg.lmtp_socket));
		cfg.base.enable_lmtp = true;
	}

	/* Wire stub cognitive services */
	cfg.llm = &stub_llm;
	cfg.memory = &stub_memory;
	cfg.persona = &stub_persona;

	/* Create the Dove9 system */
	duser->system = dove9_system_create(&cfg);
	if (duser->system == NULL) {
		i_error("dove9-cognitive: failed to create Dove9 system "
			"for user %s", user->username);
		return;
	}

	/* Subscribe to system events */
	dove9_system_on(duser->system, dove9_system_event_handler, user);

	/* Start the kernel / triadic engine */
	if (dove9_system_start(duser->system) != 0) {
		i_error("dove9-cognitive: failed to start Dove9 system "
			"for user %s", user->username);
		dove9_system_destroy(&duser->system);
		return;
	}

	MODULE_CONTEXT_SET(user, dove9_cognitive_user_module, duser);

	i_info("dove9-cognitive: activated for user %s "
	       "(step=%ums, max_proc=%u, bot=%s)",
	       user->username,
	       cfg.base.step_duration_ms,
	       cfg.base.max_concurrent_processes,
	       cfg.bot_email_address);

}

/* ---------------------------------------------------------------
 * Mail user hooks
 * --------------------------------------------------------------- */

static struct mail_storage_hooks dove9_cognitive_hooks = {
	.mail_user_created = dove9_cognitive_user_created,
};

/* ---------------------------------------------------------------
 * Plugin entry points
 * --------------------------------------------------------------- */

const char *dove9_cognitive_plugin_version = DOVECOT_ABI_VERSION;
const char *dove9_cognitive_plugin_dependencies[] = { "notify", NULL };

void dove9_cognitive_plugin_init(struct module *module)
{
	dove9_module = module;
	dove9_notify_ctx = notify_register(&dove9_notify_vfuncs);
	mail_storage_hooks_add(module, &dove9_cognitive_hooks);
	i_info("dove9-cognitive: plugin loaded");
}

void dove9_cognitive_plugin_deinit(void)
{
	if (dove9_notify_ctx != NULL)
		notify_unregister(&dove9_notify_ctx);
	mail_storage_hooks_remove(&dove9_cognitive_hooks);
	i_info("dove9-cognitive: plugin unloaded");
}
