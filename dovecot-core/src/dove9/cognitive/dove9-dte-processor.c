/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-dte-processor.h"
#include "../utils/dove9-logger.h"

#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* ----------------------------------------------------------------
 * Internals
 * ---------------------------------------------------------------- */

struct dove9_dte_processor {
	struct dove9_llm_service llm;
	struct dove9_memory_store memory;
	struct dove9_persona_core persona;
	struct dove9_dte_processor_config config;
	struct dove9_logger *logger;

	/* Processing state */
	bool has_current_perception;
	/* pending_actions is modelled as a simple counter + last-plan pointer */
	unsigned int pending_action_count;
};

/* clamp helper */
static inline double clamp01(double v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
static inline double clamp_neg1_1(double v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

/* ----------------------------------------------------------------
 * T1: Perception Processing
 * ---------------------------------------------------------------- */

static int dte_t1_perception(void *user_data,
			     struct dove9_cognitive_context *ctx,
			     enum dove9_cognitive_mode mode)
{
	struct dove9_dte_processor *p = user_data;

	if (mode == DOVE9_MODE_REFLECTIVE) {
		/* Assess cognitive needs and capacity */
		char emotion[64] = {0};
		double intensity = 0;
		if (p->persona.get_dominant_emotion)
			p->persona.get_dominant_emotion(
				p->persona.user_data,
				emotion, sizeof(emotion), &intensity);

		double cognitive_load =
			ctx->salience_score * ctx->attention_weight;

		/* Update emotional arousal based on load */
		ctx->emotional_arousal =
			clamp01(intensity + cognitive_load * 0.2);
	} else {
		/* Expressive: active perception */
		ctx->salience_score = clamp01(ctx->salience_score + 0.1);
	}

	return 0;
}

/* ----------------------------------------------------------------
 * T2: Idea Formation
 * ---------------------------------------------------------------- */

static int dte_t2_idea_formation(void *user_data,
				 struct dove9_cognitive_context *ctx,
				 enum dove9_cognitive_mode mode)
{
	struct dove9_dte_processor *p = user_data;

	if (mode == DOVE9_MODE_EXPRESSIVE) {
		/* Retrieve recent memories */
		const char *memories[DOVE9_MAX_MEMORIES];
		unsigned int mem_count = 0;
		if (p->memory.retrieve_recent)
			p->memory.retrieve_recent(
				p->memory.user_data,
				p->config.memory_retrieval_count,
				memories, &mem_count);

		/* Generate thought via LLM */
		if (p->config.enable_parallel_cognition &&
		    p->llm.generate_parallel_response) {
			char integrated[4096] = {0};
			char cognitive[4096] = {0};
			char affective[4096] = {0};
			char relevance[4096] = {0};

			p->llm.generate_parallel_response(
				p->llm.user_data,
				"Generate a thoughtful response or insight.",
				memories, mem_count,
				integrated, cognitive, affective, relevance,
				sizeof(integrated));

			/* Store as thought_data (opaque) — caller manages */
		} else if (p->llm.generate_response) {
			char response[4096] = {0};
			p->llm.generate_response(
				p->llm.user_data,
				"Generate a thoughtful response or insight.",
				memories, mem_count,
				response, sizeof(response));
		}

		/* Activate Assessment-Planning coupling */
		ctx->active_couplings = dove9_coupling_set(
			ctx->active_couplings,
			DOVE9_COUPLING_ASSESSMENT_PLANNING);
	}
	/* Reflective mode: simulating — no side effects */

	return 0;
}

/* ----------------------------------------------------------------
 * T4: Sensory Input Processing
 * ---------------------------------------------------------------- */

static int dte_t4_sensory_input(void *user_data,
				struct dove9_cognitive_context *ctx,
				enum dove9_cognitive_mode mode)
{
	struct dove9_dte_processor *p = user_data;

	if (mode == DOVE9_MODE_EXPRESSIVE) {
		p->has_current_perception = true;

		/* Activate Perception-Memory coupling */
		ctx->active_couplings = dove9_coupling_set(
			ctx->active_couplings,
			DOVE9_COUPLING_PERCEPTION_MEMORY);
	}
	/* Reflective: internal sensing — no state change */

	return 0;
}

/* ----------------------------------------------------------------
 * T5: Action Sequence Execution
 * ---------------------------------------------------------------- */

static int dte_t5_action_sequence(void *user_data,
				  struct dove9_cognitive_context *ctx,
				  enum dove9_cognitive_mode mode)
{
	struct dove9_dte_processor *p = user_data;

	if (mode == DOVE9_MODE_EXPRESSIVE) {
		if (ctx->action_plan != NULL) {
			p->pending_action_count++;
		}
	}
	/* Reflective: prepare for action — no side effects */
	(void)ctx;

	return 0;
}

/* ----------------------------------------------------------------
 * T7: Memory Encoding
 * ---------------------------------------------------------------- */

static int dte_t7_memory_encoding(void *user_data,
				  struct dove9_cognitive_context *ctx,
				  enum dove9_cognitive_mode mode)
{
	struct dove9_dte_processor *p = user_data;

	if (mode == DOVE9_MODE_REFLECTIVE) {
		/* Retrieve relevant memories */
		const char *memories[DOVE9_MAX_MEMORIES];
		unsigned int mem_count = 0;

		if (p->memory.retrieve_relevant) {
			p->memory.retrieve_relevant(
				p->memory.user_data,
				"current_state",
				p->config.memory_retrieval_count,
				memories, &mem_count);
		}

		/* Merge deduplicated */
		for (unsigned int i = 0;
		     i < mem_count && ctx->memory_count < DOVE9_MAX_MEMORIES;
		     i++) {
			bool dup = false;
			for (unsigned int k = 0; k < ctx->memory_count; k++) {
				if (ctx->relevant_memories[k] == memories[i]) {
					dup = true;
					break;
				}
			}
			if (!dup)
				ctx->relevant_memories[ctx->memory_count++] =
					memories[i];
		}

		/* Activate Perception-Memory coupling if sensory done */
		if (p->has_current_perception)
			ctx->active_couplings = dove9_coupling_set(
				ctx->active_couplings,
				DOVE9_COUPLING_PERCEPTION_MEMORY);
	} else {
		/* Expressive: encode experience into memory */
		if (p->memory.store_memory) {
			p->memory.store_memory(
				p->memory.user_data,
				0, (int)time(NULL),
				"system", "integrated_response");
		}
	}

	return 0;
}

/* ----------------------------------------------------------------
 * T8: Balanced Response
 * ---------------------------------------------------------------- */

static int dte_t8_balanced_response(void *user_data,
				    struct dove9_cognitive_context *ctx,
				    enum dove9_cognitive_mode mode)
{
	struct dove9_dte_processor *p = user_data;

	if (mode == DOVE9_MODE_EXPRESSIVE) {
		/* Update emotional state */
		const char *keys[3];
		double values[3];
		int nkeys = 0;

		/* Interest increases with salience */
		keys[nkeys] = "interest";
		values[nkeys] = ctx->salience_score * 0.1;
		nkeys++;

		/* Joy/sadness based on valence */
		if (ctx->emotional_valence > 0) {
			keys[nkeys] = "joy";
			values[nkeys] = ctx->emotional_valence * 0.1;
			nkeys++;
		} else if (ctx->emotional_valence < 0) {
			keys[nkeys] = "sadness";
			values[nkeys] = fabs(ctx->emotional_valence) * 0.1;
			nkeys++;
		}

		if (p->persona.update_emotional_state)
			p->persona.update_emotional_state(
				p->persona.user_data,
				keys, values, nkeys);

		/* Activate balanced integration coupling */
		ctx->active_couplings = dove9_coupling_set(
			ctx->active_couplings,
			DOVE9_COUPLING_BALANCED_INTEGRATION);

		/* Clear pending actions */
		p->pending_action_count = 0;

		/* Update attention weight */
		double decay = 0.95;
		double salience_boost = ctx->salience_score * 0.1;
		ctx->attention_weight =
			clamp01(ctx->attention_weight * decay + salience_boost);
	}
	/* Reflective: prepare for balanced response — no side effects */

	return 0;
}

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_dte_processor *
dove9_dte_processor_create(const struct dove9_llm_service *llm,
			   const struct dove9_memory_store *memory,
			   const struct dove9_persona_core *persona,
			   const struct dove9_dte_processor_config *config)
{
	struct dove9_dte_processor *p = calloc(1, sizeof(*p));
	if (p == NULL)
		return NULL;

	if (llm) p->llm = *llm;
	if (memory) p->memory = *memory;
	if (persona) p->persona = *persona;
	if (config)
		p->config = *config;
	else
		p->config = dove9_dte_processor_config_default();

	p->logger = dove9_logger_create("DTEProcessor");
	return p;
}

void dove9_dte_processor_destroy(struct dove9_dte_processor **proc)
{
	if (proc == NULL || *proc == NULL)
		return;
	dove9_logger_destroy(&(*proc)->logger);
	free(*proc);
	*proc = NULL;
}

struct dove9_cognitive_processor
dove9_dte_processor_as_cognitive(struct dove9_dte_processor *proc)
{
	struct dove9_cognitive_processor cp;
	memset(&cp, 0, sizeof(cp));
	cp.user_data = proc;
	cp.process_t1_perception      = dte_t1_perception;
	cp.process_t2_idea_formation  = dte_t2_idea_formation;
	cp.process_t4_sensory_input   = dte_t4_sensory_input;
	cp.process_t5_action_sequence = dte_t5_action_sequence;
	cp.process_t7_memory_encoding = dte_t7_memory_encoding;
	cp.process_t8_balanced_response = dte_t8_balanced_response;
	return cp;
}

void dove9_dte_processor_clear_state(struct dove9_dte_processor *proc)
{
	if (proc == NULL)
		return;
	proc->has_current_perception = false;
	proc->pending_action_count = 0;
}
