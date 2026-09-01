/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-triadic-engine.h"
#include "../utils/dove9-logger.h"

#include <stdlib.h>
#include <string.h>
#include <time.h>

/* ----------------------------------------------------------------
 * Static configuration tables
 * ---------------------------------------------------------------- */

const struct dove9_stream_config dove9_stream_configs[DOVE9_STREAM_COUNT] = {
	{ DOVE9_STREAM_PRIMARY,   "Primary",   0,   1 },
	{ DOVE9_STREAM_SECONDARY, "Secondary", 120, 5 },
	{ DOVE9_STREAM_TERTIARY,  "Tertiary",  240, 9 },
};

const struct dove9_step_config dove9_step_configs[DOVE9_STEP_COUNT] = {
	/* T-point 0: TRIAD 1-5-9 */
	{  1, DOVE9_STREAM_PRIMARY,   DOVE9_TERM_T1_PERCEPTION,      DOVE9_MODE_REFLECTIVE, DOVE9_STEP_PIVOTAL_RR,   0 },
	{  5, DOVE9_STREAM_SECONDARY, DOVE9_TERM_T1_PERCEPTION,      DOVE9_MODE_REFLECTIVE, DOVE9_STEP_PIVOTAL_RR, 120 },
	{  9, DOVE9_STREAM_TERTIARY,  DOVE9_TERM_T7_MEMORY_ENCODING, DOVE9_MODE_REFLECTIVE, DOVE9_STEP_REFLECTIVE, 240 },

	/* T-point 1: TRIAD 2-6-10 */
	{  2, DOVE9_STREAM_PRIMARY,   DOVE9_TERM_T2_IDEA_FORMATION,  DOVE9_MODE_EXPRESSIVE, DOVE9_STEP_EXPRESSIVE,  30 },
	{  6, DOVE9_STREAM_SECONDARY, DOVE9_TERM_T2_IDEA_FORMATION,  DOVE9_MODE_EXPRESSIVE, DOVE9_STEP_TRANSITION, 150 },
	{ 10, DOVE9_STREAM_TERTIARY,  DOVE9_TERM_T5_ACTION_SEQUENCE, DOVE9_MODE_EXPRESSIVE, DOVE9_STEP_REFLECTIVE, 270 },

	/* T-point 2: TRIAD 3-7-11 */
	{  3, DOVE9_STREAM_PRIMARY,   DOVE9_TERM_T4_SENSORY_INPUT,   DOVE9_MODE_EXPRESSIVE, DOVE9_STEP_EXPRESSIVE,  60 },
	{  7, DOVE9_STREAM_SECONDARY, DOVE9_TERM_T1_PERCEPTION,      DOVE9_MODE_REFLECTIVE, DOVE9_STEP_TRANSITION, 180 },
	{ 11, DOVE9_STREAM_TERTIARY,  DOVE9_TERM_T7_MEMORY_ENCODING, DOVE9_MODE_REFLECTIVE, DOVE9_STEP_REFLECTIVE, 300 },

	/* T-point 3: TRIAD 4-8-12 */
	{  4, DOVE9_STREAM_PRIMARY,   DOVE9_TERM_T2_IDEA_FORMATION,  DOVE9_MODE_EXPRESSIVE, DOVE9_STEP_EXPRESSIVE,  90 },
	{  8, DOVE9_STREAM_SECONDARY, DOVE9_TERM_T2_IDEA_FORMATION,  DOVE9_MODE_EXPRESSIVE, DOVE9_STEP_TRANSITION, 210 },
	{ 12, DOVE9_STREAM_TERTIARY,  DOVE9_TERM_T5_ACTION_SEQUENCE, DOVE9_MODE_EXPRESSIVE, DOVE9_STEP_REFLECTIVE, 330 },
};

const struct dove9_triad_point dove9_triad_points[DOVE9_TRIAD_COUNT] = {
	{ 0, {  1,  5,  9 } },
	{ 1, {  2,  6, 10 } },
	{ 2, {  3,  7, 11 } },
	{ 3, {  4,  8, 12 } },
};

/* ----------------------------------------------------------------
 * Event handler list
 * ---------------------------------------------------------------- */

#define MAX_EVENT_HANDLERS 16

struct dove9_event_sub {
	dove9_triadic_event_fn handler;
	void *context;
};

/* ----------------------------------------------------------------
 * Engine internals
 * ---------------------------------------------------------------- */

struct dove9_triadic_engine {
	struct dove9_cognitive_processor processor;
	struct dove9_stream_state streams[DOVE9_STREAM_COUNT];
	int current_step;
	unsigned int cycle_number;
	bool running;
	unsigned int step_duration_ms;
	struct dove9_logger *logger;

	/* Event subscribers */
	struct dove9_event_sub handlers[MAX_EVENT_HANDLERS];
	unsigned int handler_count;
};

/* ----------------------------------------------------------------
 * Internal helpers
 * ---------------------------------------------------------------- */

static void emit_event(struct dove9_triadic_engine *engine,
		       const struct dove9_triadic_event *event)
{
	for (unsigned int i = 0; i < engine->handler_count; i++)
		engine->handlers[i].handler(event, engine->handlers[i].context);
}

/* ----------------------------------------------------------------
 * Utility functions (public)
 * ---------------------------------------------------------------- */

const struct dove9_triad_point *dove9_triad_at_step(int step)
{
	for (int i = 0; i < DOVE9_TRIAD_COUNT; i++) {
		for (int j = 0; j < 3; j++) {
			if (dove9_triad_points[i].steps[j] == step)
				return &dove9_triad_points[i];
		}
	}
	return NULL;
}

int dove9_get_active_steps_for_time_point(
	int step,
	const struct dove9_step_config *out[3])
{
	const struct dove9_triad_point *triad = dove9_triad_at_step(step);
	if (triad == NULL) {
		/* Single step — find it */
		for (int i = 0; i < DOVE9_STEP_COUNT; i++) {
			if (dove9_step_configs[i].step_number == step) {
				out[0] = &dove9_step_configs[i];
				return 1;
			}
		}
		return 0;
	}

	int count = 0;
	for (int t = 0; t < 3; t++) {
		int target = triad->steps[t];
		for (int i = 0; i < DOVE9_STEP_COUNT; i++) {
			if (dove9_step_configs[i].step_number == target) {
				out[count++] = &dove9_step_configs[i];
				break;
			}
		}
	}
	return count;
}

int dove9_detect_couplings(int step,
			   struct dove9_coupling_detection *out,
			   int max_out)
{
	const struct dove9_step_config *active[3];
	int active_count = dove9_get_active_steps_for_time_point(step, active);
	int count = 0;

	/* helper: check if term+mode present in active steps */
	#define HAS_TERM_MODE(t, m)			\
		({					\
			bool _found = false;		\
			for (int _i = 0; _i < active_count; _i++) {	\
				if (active[_i]->term == (t) &&		\
				    active[_i]->mode == (m)) {		\
					_found = true;			\
					break;				\
				}					\
			}						\
			_found;					\
		})

	/* T4E <-> T7R: Perception-Memory Coupling */
	if (count < max_out &&
	    HAS_TERM_MODE(DOVE9_TERM_T4_SENSORY_INPUT, DOVE9_MODE_EXPRESSIVE) &&
	    HAS_TERM_MODE(DOVE9_TERM_T7_MEMORY_ENCODING, DOVE9_MODE_REFLECTIVE)) {
		out[count].type = DOVE9_COUPLING_PERCEPTION_MEMORY;
		out[count].terms[0] = DOVE9_TERM_T4_SENSORY_INPUT;
		out[count].terms[1] = DOVE9_TERM_T7_MEMORY_ENCODING;
		out[count].term_count = 2;
		count++;
	}

	/* T1R <-> T2E: Assessment-Planning Coupling */
	if (count < max_out &&
	    HAS_TERM_MODE(DOVE9_TERM_T1_PERCEPTION, DOVE9_MODE_REFLECTIVE) &&
	    HAS_TERM_MODE(DOVE9_TERM_T2_IDEA_FORMATION, DOVE9_MODE_EXPRESSIVE)) {
		out[count].type = DOVE9_COUPLING_ASSESSMENT_PLANNING;
		out[count].terms[0] = DOVE9_TERM_T1_PERCEPTION;
		out[count].terms[1] = DOVE9_TERM_T2_IDEA_FORMATION;
		out[count].term_count = 2;
		count++;
	}

	/* T8E: Balanced Integration */
	if (count < max_out &&
	    HAS_TERM_MODE(DOVE9_TERM_T8_BALANCED_RESPONSE, DOVE9_MODE_EXPRESSIVE)) {
		out[count].type = DOVE9_COUPLING_BALANCED_INTEGRATION;
		out[count].terms[0] = DOVE9_TERM_T8_BALANCED_RESPONSE;
		out[count].term_count = 1;
		count++;
	}

	#undef HAS_TERM_MODE
	return count;
}

/* ----------------------------------------------------------------
 * Execute a single cognitive step
 * ---------------------------------------------------------------- */

static int execute_step(struct dove9_triadic_engine *engine,
			const struct dove9_step_config *step,
			struct dove9_cognitive_context *ctx)
{
	struct dove9_stream_state *stream = &engine->streams[step->stream_id];
	stream->current_term = step->term;
	stream->mode = step->mode;
	stream->last_processed = time(NULL);

	switch (step->term) {
	case DOVE9_TERM_T1_PERCEPTION:
		if (engine->processor.process_t1_perception)
			return engine->processor.process_t1_perception(
				engine->processor.user_data, ctx, step->mode);
		break;
	case DOVE9_TERM_T2_IDEA_FORMATION:
		if (engine->processor.process_t2_idea_formation)
			return engine->processor.process_t2_idea_formation(
				engine->processor.user_data, ctx, step->mode);
		break;
	case DOVE9_TERM_T4_SENSORY_INPUT:
		if (engine->processor.process_t4_sensory_input)
			return engine->processor.process_t4_sensory_input(
				engine->processor.user_data, ctx, step->mode);
		break;
	case DOVE9_TERM_T5_ACTION_SEQUENCE:
		if (engine->processor.process_t5_action_sequence)
			return engine->processor.process_t5_action_sequence(
				engine->processor.user_data, ctx, step->mode);
		break;
	case DOVE9_TERM_T7_MEMORY_ENCODING:
		if (engine->processor.process_t7_memory_encoding)
			return engine->processor.process_t7_memory_encoding(
				engine->processor.user_data, ctx, step->mode);
		break;
	case DOVE9_TERM_T8_BALANCED_RESPONSE:
		if (engine->processor.process_t8_balanced_response)
			return engine->processor.process_t8_balanced_response(
				engine->processor.user_data, ctx, step->mode);
		break;
	}
	return 0;
}

/* Integrate results from parallel stream processing
 * (in the C synchronous model, we apply each step sequentially and
 *  aggregate after all steps in a triad are processed) */
static void integrate_stream_results(struct dove9_cognitive_context *base,
				     const struct dove9_cognitive_context *results,
				     int result_count)
{
	if (result_count == 0)
		return;

	/* Average emotional values */
	double sum_valence = 0, sum_arousal = 0, sum_attention = 0;
	double max_salience = 0;
	unsigned int merged_couplings = 0;

	for (int i = 0; i < result_count; i++) {
		sum_valence += results[i].emotional_valence;
		sum_arousal += results[i].emotional_arousal;
		sum_attention += results[i].attention_weight;
		if (results[i].salience_score > max_salience)
			max_salience = results[i].salience_score;
		merged_couplings |= results[i].active_couplings;
	}

	base->emotional_valence = sum_valence / result_count;
	base->emotional_arousal = sum_arousal / result_count;
	base->attention_weight = sum_attention / result_count;
	base->salience_score = max_salience;
	base->active_couplings = merged_couplings;

	/* Merge memories: deduplicate by collecting all pointers */
	unsigned int new_count = 0;
	for (int i = 0; i < result_count && new_count < DOVE9_MAX_MEMORIES; i++) {
		for (unsigned int m = 0;
		     m < results[i].memory_count && new_count < DOVE9_MAX_MEMORIES;
		     m++) {
			/* Check for duplicate */
			bool dup = false;
			for (unsigned int k = 0; k < new_count; k++) {
				if (base->relevant_memories[k] ==
				    results[i].relevant_memories[m]) {
					dup = true;
					break;
				}
			}
			if (!dup)
				base->relevant_memories[new_count++] =
					results[i].relevant_memories[m];
		}
	}
	base->memory_count = new_count;
}

/* ----------------------------------------------------------------
 * Internal step advancement (called by timer or manually)
 * ---------------------------------------------------------------- */

static void advance_step(struct dove9_triadic_engine *engine)
{
	engine->current_step = (engine->current_step % 12) + 1;

	/* Cycle completion */
	if (engine->current_step == 1) {
		engine->cycle_number++;
		struct dove9_triadic_event ev;
		ev.type = DOVE9_TRIADIC_CYCLE_COMPLETE;
		ev.data.cycle_complete.cycle_number = engine->cycle_number;
		emit_event(engine, &ev);
	}

	/* Triadic convergence */
	const struct dove9_triad_point *triad =
		dove9_triad_at_step(engine->current_step);
	if (triad != NULL) {
		struct dove9_triadic_event ev;
		ev.type = DOVE9_TRIADIC_TRIAD_SYNC;
		ev.data.triad_sync.triad = triad;
		emit_event(engine, &ev);
	}

	/* Coupling detection */
	struct dove9_coupling_detection couplings[3];
	int ncouplings = dove9_detect_couplings(engine->current_step,
						couplings, 3);
	for (int i = 0; i < ncouplings; i++) {
		struct dove9_triadic_event ev;
		ev.type = DOVE9_TRIADIC_COUPLING_ACTIVE;
		ev.data.coupling_active.coupling = couplings[i].type;
		ev.data.coupling_active.term_count = couplings[i].term_count;
		for (int j = 0; j < couplings[i].term_count; j++)
			ev.data.coupling_active.terms[j] = couplings[i].terms[j];
		emit_event(engine, &ev);
	}
}

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_triadic_engine *
dove9_triadic_engine_create(const struct dove9_cognitive_processor *processor,
			    unsigned int step_duration_ms)
{
	struct dove9_triadic_engine *engine = calloc(1, sizeof(*engine));
	if (engine == NULL)
		return NULL;

	engine->processor = *processor;
	engine->step_duration_ms = step_duration_ms;
	engine->logger = dove9_logger_create("TriadicEngine");

	/* Initialize streams */
	for (int i = 0; i < DOVE9_STREAM_COUNT; i++) {
		engine->streams[i].id = (enum dove9_stream_id)i;
		engine->streams[i].current_term = DOVE9_TERM_T1_PERCEPTION;
		engine->streams[i].mode = DOVE9_MODE_REFLECTIVE;
		engine->streams[i].step_in_cycle = 0;
		engine->streams[i].is_active = false;
		engine->streams[i].last_processed = 0;
	}

	return engine;
}

void dove9_triadic_engine_destroy(struct dove9_triadic_engine **engine)
{
	if (engine == NULL || *engine == NULL)
		return;

	dove9_triadic_engine_stop(*engine);
	dove9_logger_destroy(&(*engine)->logger);
	free(*engine);
	*engine = NULL;
}

void dove9_triadic_engine_start(struct dove9_triadic_engine *engine)
{
	if (engine == NULL || engine->running)
		return;

	engine->running = true;
	for (int i = 0; i < DOVE9_STREAM_COUNT; i++)
		engine->streams[i].is_active = true;

	dove9_log_info(engine->logger, "Triadic engine started");
}

void dove9_triadic_engine_stop(struct dove9_triadic_engine *engine)
{
	if (engine == NULL || !engine->running)
		return;

	engine->running = false;
	for (int i = 0; i < DOVE9_STREAM_COUNT; i++)
		engine->streams[i].is_active = false;

	dove9_log_info(engine->logger, "Triadic engine stopped");
}

bool dove9_triadic_engine_is_running(const struct dove9_triadic_engine *engine)
{
	return engine != NULL && engine->running;
}

/* ----------------------------------------------------------------
 * Event subscription
 * ---------------------------------------------------------------- */

void dove9_triadic_engine_on(struct dove9_triadic_engine *engine,
			     dove9_triadic_event_fn handler,
			     void *context)
{
	if (engine == NULL || handler == NULL)
		return;
	if (engine->handler_count >= MAX_EVENT_HANDLERS)
		return;

	engine->handlers[engine->handler_count].handler = handler;
	engine->handlers[engine->handler_count].context = context;
	engine->handler_count++;
}

/* ----------------------------------------------------------------
 * Message processing
 * ---------------------------------------------------------------- */

int dove9_triadic_engine_process_message(
	struct dove9_triadic_engine *engine,
	struct dove9_message_process *process)
{
	if (engine == NULL || process == NULL)
		return -1;

	struct dove9_cognitive_context *ctx = &process->cognitive_context;

	/* Get active steps for current time point */
	const struct dove9_step_config *active_steps[3];
	int step_count = dove9_get_active_steps_for_time_point(
		engine->current_step, active_steps);

	if (step_count == 0) {
		/* Advance and try again */
		advance_step(engine);
		step_count = dove9_get_active_steps_for_time_point(
			engine->current_step, active_steps);
		if (step_count == 0)
			return -1;
	}

	/* Process each active step, collecting results */
	struct dove9_cognitive_context results[3];
	for (int i = 0; i < step_count; i++) {
		results[i] = *ctx;

		struct dove9_triadic_event ev_start;
		ev_start.type = DOVE9_TRIADIC_STEP_START;
		ev_start.data.step_start.step = active_steps[i];
		emit_event(engine, &ev_start);

		clock_t t0 = clock();
		int ret = execute_step(engine, active_steps[i], &results[i]);
		clock_t t1 = clock();
		int64_t dur_ms = (int64_t)((t1 - t0) * 1000 / CLOCKS_PER_SEC);

		struct dove9_triadic_event ev_done;
		ev_done.type = DOVE9_TRIADIC_STEP_COMPLETE;
		ev_done.data.step_complete.step = active_steps[i];
		ev_done.data.step_complete.duration_ms = dur_ms;
		emit_event(engine, &ev_done);

		if (ret != 0) {
			dove9_log_warn(engine->logger,
				       "Step %d returned error %d (degraded)",
				       active_steps[i]->step_number, ret);
			/* Continue with degraded context */
		}
	}

	/* Integrate results */
	integrate_stream_results(ctx, results, step_count);

	return 0;
}

/* ----------------------------------------------------------------
 * State queries
 * ---------------------------------------------------------------- */

int dove9_triadic_engine_get_current_step(const struct dove9_triadic_engine *engine)
{
	return engine != NULL ? engine->current_step : 0;
}

int dove9_triadic_engine_get_cycle_number(const struct dove9_triadic_engine *engine)
{
	return engine != NULL ? (int)engine->cycle_number : 0;
}

void dove9_triadic_engine_get_stream_state(
	const struct dove9_triadic_engine *engine,
	enum dove9_stream_id stream,
	struct dove9_stream_state *out)
{
	if (engine == NULL || out == NULL)
		return;
	if (stream < 0 || stream >= DOVE9_STREAM_COUNT)
		return;
	*out = engine->streams[stream];
}

void dove9_triadic_engine_get_metrics(const struct dove9_triadic_engine *engine,
				      struct dove9_triadic_metrics *out)
{
	if (engine == NULL || out == NULL)
		return;

	out->total_cycles = engine->cycle_number;
	out->current_step = engine->current_step;
	for (int i = 0; i < DOVE9_STREAM_COUNT; i++)
		out->stream_states[i] = engine->streams[i];
}

/* Expose advance_step for kernel-driven stepping */
void dove9_triadic_engine_advance_step(struct dove9_triadic_engine *engine)
{
	if (engine != NULL && engine->running)
		advance_step(engine);
}
