/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_TYPES_H
#define DOVE9_TYPES_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <time.h>

/*
 * Dove9 Core Types
 *
 * "Everything is a chatbot" — The fundamental types for the Dove9 paradigm
 * where the mail server acts as a cognitive CPU and messages are process threads.
 */

/* ----------------------------------------------------------------
 * Enumerations
 * ---------------------------------------------------------------- */

/* Cognitive modes based on the triadic architecture */
enum dove9_cognitive_mode {
	DOVE9_MODE_EXPRESSIVE = 0,   /* Reactive, action-oriented (feedforward) */
	DOVE9_MODE_REFLECTIVE = 1,   /* Anticipatory, simulation-oriented (feedback) */
};

/* Stream identity in the triadic system */
enum dove9_stream_id {
	DOVE9_STREAM_PRIMARY   = 0,  /* Step 1, 0° phase offset */
	DOVE9_STREAM_SECONDARY = 1,  /* Step 5, +120° phase offset */
	DOVE9_STREAM_TERTIARY  = 2,  /* Step 9, +240° phase offset */
};
#define DOVE9_STREAM_COUNT 3

/* Cognitive function types mapped from System 4 */
enum dove9_cognitive_term {
	DOVE9_TERM_T1_PERCEPTION      = 1, /* Need vs Capacity assessment */
	DOVE9_TERM_T2_IDEA_FORMATION  = 2, /* Thought generation */
	DOVE9_TERM_T4_SENSORY_INPUT   = 4, /* Perception processing */
	DOVE9_TERM_T5_ACTION_SEQUENCE = 5, /* Action execution */
	DOVE9_TERM_T7_MEMORY_ENCODING = 7, /* Memory consolidation */
	DOVE9_TERM_T8_BALANCED_RESPONSE = 8, /* Integrated response */
};

/* Step types from the triadic cognitive loop diagram */
enum dove9_step_type {
	DOVE9_STEP_PIVOTAL_RR  = 0,  /* Pivotal Relevance Realization */
	DOVE9_STEP_EXPRESSIVE  = 1,  /* Expressive processing */
	DOVE9_STEP_TRANSITION  = 2,  /* Transition state */
	DOVE9_STEP_REFLECTIVE  = 3,  /* Reflective processing */
};

/* Process states in the Dove9 kernel */
enum dove9_process_state {
	DOVE9_PROCESS_PENDING    = 0,
	DOVE9_PROCESS_ACTIVE     = 1,
	DOVE9_PROCESS_PROCESSING = 2,
	DOVE9_PROCESS_WAITING    = 3,
	DOVE9_PROCESS_COMPLETED  = 4,
	DOVE9_PROCESS_SUSPENDED  = 5,
	DOVE9_PROCESS_TERMINATED = 6,
};

/* Types of tensional couplings between cognitive functions */
enum dove9_coupling_type {
	DOVE9_COUPLING_PERCEPTION_MEMORY    = 0, /* T4E <-> T7R */
	DOVE9_COUPLING_ASSESSMENT_PLANNING  = 1, /* T1R <-> T2E */
	DOVE9_COUPLING_BALANCED_INTEGRATION = 2, /* T8E */
};
#define DOVE9_COUPLING_COUNT 3

/* ----------------------------------------------------------------
 * Mail types
 * ---------------------------------------------------------------- */

enum dove9_mail_flag {
	DOVE9_MAIL_FLAG_SEEN     = (1 << 0),
	DOVE9_MAIL_FLAG_ANSWERED = (1 << 1),
	DOVE9_MAIL_FLAG_FLAGGED  = (1 << 2),
	DOVE9_MAIL_FLAG_DELETED  = (1 << 3),
	DOVE9_MAIL_FLAG_DRAFT    = (1 << 4),
};

enum dove9_mail_protocol {
	DOVE9_MAIL_PROTO_IMAP = 0,
	DOVE9_MAIL_PROTO_SMTP = 1,
	DOVE9_MAIL_PROTO_LMTP = 2,
};

enum dove9_mail_operation {
	DOVE9_MAIL_OP_FETCH  = 0,
	DOVE9_MAIL_OP_SEND   = 1,
	DOVE9_MAIL_OP_MOVE   = 2,
	DOVE9_MAIL_OP_DELETE = 3,
	DOVE9_MAIL_OP_MARK   = 4,
};

/* ----------------------------------------------------------------
 * Fixed-size limits
 * ---------------------------------------------------------------- */

#define DOVE9_MAX_RECIPIENTS    64
#define DOVE9_MAX_REFERENCES    32
#define DOVE9_MAX_HEADERS       64
#define DOVE9_MAX_MEMORIES      64
#define DOVE9_MAX_COUPLINGS     DOVE9_COUPLING_COUNT
#define DOVE9_MAX_PROCESSES     4096
#define DOVE9_MAX_QUEUE_DEPTH   4096
#define DOVE9_MAX_CHILD_IDS     32
#define DOVE9_MAX_EXEC_HISTORY  128
#define DOVE9_MAX_PENDING_ACTIONS 32
#define DOVE9_MAX_ID_LEN        128
#define DOVE9_MAX_ADDR_LEN      256
#define DOVE9_MAX_SUBJECT_LEN   512
#define DOVE9_MAX_BODY_LEN      65536
#define DOVE9_MAX_HEADER_KEY    128
#define DOVE9_MAX_HEADER_VAL    512
#define DOVE9_MAX_PERSONALITY   2048

/* ----------------------------------------------------------------
 * Structures
 * ---------------------------------------------------------------- */

/* A single step configuration in the 12-step cognitive loop */
struct dove9_step_config {
	int step_number;              /* 1..12 */
	enum dove9_stream_id stream_id;
	enum dove9_cognitive_term term;
	enum dove9_cognitive_mode mode;
	enum dove9_step_type step_type;
	int phase_degrees;            /* 0°..330° in 30° increments */
};
#define DOVE9_STEP_COUNT 12

/* Configuration for a cognitive stream */
struct dove9_stream_config {
	enum dove9_stream_id id;
	const char *name;
	int phase_offset;             /* 0, 120, 240 */
	int start_step;               /* 1, 5, 9 */
};

/* A triadic convergence point where all 3 streams synchronize */
struct dove9_triad_point {
	int time_point;               /* 0, 1, 2, 3 */
	int steps[3];                 /* The three steps that converge */
};
#define DOVE9_TRIAD_COUNT 4

/* State of a single cognitive stream */
struct dove9_stream_state {
	enum dove9_stream_id id;
	enum dove9_cognitive_term current_term;
	enum dove9_cognitive_mode mode;
	int step_in_cycle;
	bool is_active;
	time_t last_processed;        /* 0 if never */
};

/* Cognitive context carried by a message process */
struct dove9_cognitive_context {
	/* Memory references (string pointers, NULL-terminated) */
	const char *relevant_memories[DOVE9_MAX_MEMORIES];
	unsigned int memory_count;

	/* Emotional state */
	double emotional_valence;     /* -1.0 to 1.0 */
	double emotional_arousal;     /* 0.0 to 1.0 */

	/* Salience */
	double salience_score;
	double attention_weight;

	/* Integration state — opaque pointers for flexibility */
	void *perception_data;
	void *thought_data;
	void *action_plan;

	/* Coupling activations (bitfield using enum dove9_coupling_type) */
	unsigned int active_couplings;
};

/* Header key-value pair */
struct dove9_header {
	char key[DOVE9_MAX_HEADER_KEY];
	char val[DOVE9_MAX_HEADER_VAL];
};

/* Mail message structure */
struct dove9_mail_message {
	char message_id[DOVE9_MAX_ID_LEN];
	char thread_id[DOVE9_MAX_ID_LEN];
	char in_reply_to[DOVE9_MAX_ID_LEN];
	char references[DOVE9_MAX_REFERENCES][DOVE9_MAX_ID_LEN];
	unsigned int reference_count;

	char from[DOVE9_MAX_ADDR_LEN];
	char to[DOVE9_MAX_RECIPIENTS][DOVE9_MAX_ADDR_LEN];
	unsigned int to_count;

	char subject[DOVE9_MAX_SUBJECT_LEN];
	char body[DOVE9_MAX_BODY_LEN];

	struct dove9_header headers[DOVE9_MAX_HEADERS];
	unsigned int header_count;

	time_t timestamp;
	time_t received_at;
	unsigned int flags;           /* bitmask of enum dove9_mail_flag */
	char mailbox[DOVE9_MAX_ID_LEN];
	size_t size;
};

/* Record of a process execution step */
struct dove9_execution_record {
	time_t timestamp;
	int step;
	enum dove9_stream_id stream;
	enum dove9_cognitive_term term;
	enum dove9_cognitive_mode mode;
	int64_t duration_ms;
	int result;                   /* 0=success, 1=partial, 2=failed */
};

/* Message as a process thread in the Dove9 paradigm */
struct dove9_message_process {
	char id[DOVE9_MAX_ID_LEN];
	char message_id[DOVE9_MAX_ID_LEN];
	char from[DOVE9_MAX_ADDR_LEN];
	char to[DOVE9_MAX_RECIPIENTS][DOVE9_MAX_ADDR_LEN];
	unsigned int to_count;
	char subject[DOVE9_MAX_SUBJECT_LEN];
	char content[DOVE9_MAX_BODY_LEN];

	/* Process state */
	enum dove9_process_state state;
	int priority;
	time_t created_at;

	/* Cognitive context */
	int current_step;
	enum dove9_stream_id current_stream;
	struct dove9_cognitive_context cognitive_context;

	/* Thread relationships */
	char parent_id[DOVE9_MAX_ID_LEN];  /* empty if none */
	char child_ids[DOVE9_MAX_CHILD_IDS][DOVE9_MAX_ID_LEN];
	unsigned int child_count;

	/* Execution metadata */
	struct dove9_execution_record exec_history[DOVE9_MAX_EXEC_HISTORY];
	unsigned int exec_count;
};

/* Kernel performance metrics */
struct dove9_kernel_metrics {
	unsigned int total_steps;
	unsigned int total_cycles;
	unsigned int processes_completed;
	double average_latency;
	double stream_coherence;
	double cognitive_load;
	unsigned int active_couplings; /* bitmask */
};

/* Mailbox mapping */
struct dove9_mailbox_mapping {
	char inbox[DOVE9_MAX_ID_LEN];
	char processing[DOVE9_MAX_ID_LEN];
	char sent[DOVE9_MAX_ID_LEN];
	char drafts[DOVE9_MAX_ID_LEN];
	char trash[DOVE9_MAX_ID_LEN];
	char archive[DOVE9_MAX_ID_LEN];
};

/* Dove9 kernel configuration */
struct dove9_config {
	/* Timing */
	unsigned int step_duration_ms;

	/* Capacity */
	unsigned int max_concurrent_processes;
	unsigned int max_queue_depth;

	/* Integration flags */
	bool enable_milter;
	bool enable_lmtp;
	bool enable_deltachat;

	/* Cognitive settings */
	bool enable_parallel_cognition;
	double default_salience_threshold;
};

/* ----------------------------------------------------------------
 * Callback types (replace EventEmitter pattern)
 * ---------------------------------------------------------------- */

/* Forward declarations */
struct dove9_kernel;
struct dove9_triadic_engine;

/* Triadic engine event types */
enum dove9_triadic_event_type {
	DOVE9_TRIADIC_STEP_START     = 0,
	DOVE9_TRIADIC_STEP_COMPLETE  = 1,
	DOVE9_TRIADIC_TRIAD_SYNC     = 2,
	DOVE9_TRIADIC_COUPLING_ACTIVE = 3,
	DOVE9_TRIADIC_CYCLE_COMPLETE = 4,
};

struct dove9_triadic_event {
	enum dove9_triadic_event_type type;
	union {
		struct {
			const struct dove9_step_config *step;
		} step_start;
		struct {
			const struct dove9_step_config *step;
			int64_t duration_ms;
		} step_complete;
		struct {
			const struct dove9_triad_point *triad;
		} triad_sync;
		struct {
			enum dove9_coupling_type coupling;
			enum dove9_cognitive_term terms[2];
			int term_count;
		} coupling_active;
		struct {
			unsigned int cycle_number;
		} cycle_complete;
	} data;
};

typedef void (*dove9_triadic_event_fn)(const struct dove9_triadic_event *event,
				       void *context);

/* Kernel event types */
enum dove9_kernel_event_type {
	DOVE9_KERNEL_STEP_ADVANCE       = 0,
	DOVE9_KERNEL_TRIAD_CONVERGENCE  = 1,
	DOVE9_KERNEL_PROCESS_CREATED    = 2,
	DOVE9_KERNEL_PROCESS_COMPLETED  = 3,
	DOVE9_KERNEL_COUPLING_ACTIVATED = 4,
	DOVE9_KERNEL_STREAM_SYNC        = 5,
	DOVE9_KERNEL_CYCLE_COMPLETE     = 6,
	DOVE9_KERNEL_MAIL_MESSAGE_READY = 7,
};

struct dove9_kernel_event {
	enum dove9_kernel_event_type type;
	union {
		struct {
			int step;
			int cycle;
		} step_advance;
		struct {
			const struct dove9_triad_point *triad;
		} triad_convergence;
		struct {
			const struct dove9_message_process *process;
		} process_created;
		struct {
			const char *process_id;
			const struct dove9_cognitive_context *result;
		} process_completed;
		struct {
			enum dove9_coupling_type coupling;
		} coupling_activated;
		struct {
			enum dove9_stream_id streams[DOVE9_STREAM_COUNT];
		} stream_sync;
		struct {
			int cycle;
			struct dove9_kernel_metrics metrics;
		} cycle_complete;
		struct {
			const struct dove9_mail_message *mail;
		} mail_message_ready;
	} data;
};

typedef void (*dove9_kernel_event_fn)(const struct dove9_kernel_event *event,
				      void *context);

/* ----------------------------------------------------------------
 * Defaults
 * ---------------------------------------------------------------- */

static inline struct dove9_config dove9_config_default(void)
{
	struct dove9_config c;
	c.step_duration_ms = 100;
	c.max_concurrent_processes = 100;
	c.max_queue_depth = 1000;
	c.enable_milter = true;
	c.enable_lmtp = true;
	c.enable_deltachat = true;
	c.enable_parallel_cognition = true;
	c.default_salience_threshold = 0.3;
	return c;
}

static inline struct dove9_mailbox_mapping dove9_mailbox_mapping_default(void)
{
	struct dove9_mailbox_mapping m;
	snprintf(m.inbox, sizeof(m.inbox), "INBOX");
	snprintf(m.processing, sizeof(m.processing), "INBOX.Processing");
	snprintf(m.sent, sizeof(m.sent), "Sent");
	snprintf(m.drafts, sizeof(m.drafts), "Drafts");
	snprintf(m.trash, sizeof(m.trash), "Trash");
	snprintf(m.archive, sizeof(m.archive), "Archive");
	return m;
}

static inline struct dove9_cognitive_context dove9_cognitive_context_init(void)
{
	struct dove9_cognitive_context ctx;
	memset(&ctx, 0, sizeof(ctx));
	ctx.emotional_valence = 0.0;
	ctx.emotional_arousal = 0.5;
	ctx.salience_score = 0.5;
	ctx.attention_weight = 1.0;
	return ctx;
}

/* ----------------------------------------------------------------
 * Coupling helpers (bitfield operations)
 * ---------------------------------------------------------------- */

static inline bool
dove9_coupling_is_active(unsigned int couplings,
			 enum dove9_coupling_type type)
{
	return (couplings & (1u << type)) != 0;
}

static inline unsigned int
dove9_coupling_set(unsigned int couplings,
		   enum dove9_coupling_type type)
{
	return couplings | (1u << type);
}

static inline unsigned int
dove9_coupling_clear(unsigned int couplings,
		     enum dove9_coupling_type type)
{
	return couplings & ~(1u << type);
}

#endif /* DOVE9_TYPES_H */
