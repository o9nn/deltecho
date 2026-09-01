/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_TRIADIC_ENGINE_H
#define DOVE9_TRIADIC_ENGINE_H

#include "../types/dove9-types.h"

/*
 * Triadic Cognitive Engine
 *
 * Implements the 3-Phase Concurrent Cognitive Loop.
 * Inspired by hexapod tripod gait — three parallel consciousness
 * streams running 4 steps out of phase, creating continuous cognitive flow.
 *
 * Architecture:
 *   - 3 concurrent streams with 120° phase offsets
 *   - 12-step cognitive cycle (3 phases × 4 steps)
 *   - 7 Expressive : 5 Reflective step ratio
 *   - Tensional couplings between cognitive functions
 */

/* ----------------------------------------------------------------
 * Static data accessors (defined in triadic-engine.c)
 * ---------------------------------------------------------------- */

extern const struct dove9_stream_config dove9_stream_configs[DOVE9_STREAM_COUNT];
extern const struct dove9_step_config   dove9_step_configs[DOVE9_STEP_COUNT];
extern const struct dove9_triad_point   dove9_triad_points[DOVE9_TRIAD_COUNT];

/* ----------------------------------------------------------------
 * CognitiveProcessor vtable
 * ---------------------------------------------------------------- */

struct dove9_cognitive_processor {
	void *user_data;

	int (*process_t1_perception)(void *user_data,
				     struct dove9_cognitive_context *ctx,
				     enum dove9_cognitive_mode mode);
	int (*process_t2_idea_formation)(void *user_data,
					 struct dove9_cognitive_context *ctx,
					 enum dove9_cognitive_mode mode);
	int (*process_t4_sensory_input)(void *user_data,
					struct dove9_cognitive_context *ctx,
					enum dove9_cognitive_mode mode);
	int (*process_t5_action_sequence)(void *user_data,
					  struct dove9_cognitive_context *ctx,
					  enum dove9_cognitive_mode mode);
	int (*process_t7_memory_encoding)(void *user_data,
					  struct dove9_cognitive_context *ctx,
					  enum dove9_cognitive_mode mode);
	int (*process_t8_balanced_response)(void *user_data,
					    struct dove9_cognitive_context *ctx,
					    enum dove9_cognitive_mode mode);
};

/* ----------------------------------------------------------------
 * Engine opaque handle
 * ---------------------------------------------------------------- */

struct dove9_triadic_engine;

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_triadic_engine *
dove9_triadic_engine_create(const struct dove9_cognitive_processor *processor,
			    unsigned int step_duration_ms);
void dove9_triadic_engine_destroy(struct dove9_triadic_engine **engine);

void dove9_triadic_engine_start(struct dove9_triadic_engine *engine);
void dove9_triadic_engine_stop(struct dove9_triadic_engine *engine);
bool dove9_triadic_engine_is_running(const struct dove9_triadic_engine *engine);

/* ----------------------------------------------------------------
 * Event subscription
 * ---------------------------------------------------------------- */

void dove9_triadic_engine_on(struct dove9_triadic_engine *engine,
			     dove9_triadic_event_fn handler,
			     void *context);

/* ----------------------------------------------------------------
 * Message processing
 * ---------------------------------------------------------------- */

int dove9_triadic_engine_process_message(
	struct dove9_triadic_engine *engine,
	struct dove9_message_process *process);

/* ----------------------------------------------------------------
 * State queries
 * ---------------------------------------------------------------- */

int dove9_triadic_engine_get_current_step(const struct dove9_triadic_engine *engine);
int dove9_triadic_engine_get_cycle_number(const struct dove9_triadic_engine *engine);

void dove9_triadic_engine_get_stream_state(
	const struct dove9_triadic_engine *engine,
	enum dove9_stream_id stream,
	struct dove9_stream_state *out);

/* Metrics */
struct dove9_triadic_metrics {
	unsigned int total_cycles;
	int current_step;
	struct dove9_stream_state stream_states[DOVE9_STREAM_COUNT];
};

void dove9_triadic_engine_get_metrics(const struct dove9_triadic_engine *engine,
				      struct dove9_triadic_metrics *out);

/* ----------------------------------------------------------------
 * Utility
 * ---------------------------------------------------------------- */

/* Returns the triad point containing `step`, or NULL */
const struct dove9_triad_point *
dove9_triad_at_step(int step);

/* Get active step configurations for a time point (writes up to 3) */
int dove9_get_active_steps_for_time_point(
	int step,
	const struct dove9_step_config *out[3]);

/* Detect coupling activations at a given step */
struct dove9_coupling_detection {
	enum dove9_coupling_type type;
	enum dove9_cognitive_term terms[2];
	int term_count;
};

int dove9_detect_couplings(int step,
			   struct dove9_coupling_detection *out,
			   int max_out);

/* Advance the engine by one cognitive step (used by kernel tick) */
void dove9_triadic_engine_advance_step(struct dove9_triadic_engine *engine);

#endif /* DOVE9_TRIADIC_ENGINE_H */
