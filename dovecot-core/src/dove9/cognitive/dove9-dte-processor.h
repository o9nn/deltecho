/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_DTE_PROCESSOR_H
#define DOVE9_DTE_PROCESSOR_H

#include "dove9-triadic-engine.h"

/*
 * Deep Tree Echo Cognitive Processor
 *
 * Implements the CognitiveProcessor vtable for the triadic engine,
 * connecting Deep Tree Echo's cognitive capabilities to the Dove9 kernel.
 *
 * Bridge between:
 *   - Deep Tree Echo's LLM-based cognition
 *   - The triadic 3-phase cognitive loop
 *   - Memory and persona systems
 */

/* ----------------------------------------------------------------
 * External service vtables (dependency injection)
 * ---------------------------------------------------------------- */

/* LLM service interface */
struct dove9_llm_service {
	void *user_data;
	int (*generate_response)(void *user_data,
				 const char *prompt,
				 const char **context_strs,
				 unsigned int context_count,
				 char *out_buf, size_t out_buf_size);
	int (*generate_parallel_response)(void *user_data,
					  const char *prompt,
					  const char **history,
					  unsigned int history_count,
					  char *integrated_out,
					  char *cognitive_out,
					  char *affective_out,
					  char *relevance_out,
					  size_t buf_size);
};

/* Memory store interface */
struct dove9_memory_store {
	void *user_data;
	int (*store_memory)(void *user_data,
			    int chat_id, int message_id,
			    const char *sender, const char *text);
	int (*retrieve_recent)(void *user_data,
			       unsigned int count,
			       const char **out_memories,
			       unsigned int *out_count);
	int (*retrieve_relevant)(void *user_data,
				 const char *query,
				 unsigned int count,
				 const char **out_memories,
				 unsigned int *out_count);
};

/* Persona core interface */
struct dove9_persona_core {
	void *user_data;
	const char *(*get_personality)(void *user_data);
	int (*get_dominant_emotion)(void *user_data,
				    char *emotion_out, size_t emotion_size,
				    double *intensity_out);
	int (*update_emotional_state)(void *user_data,
				      const char **keys,
				      const double *values,
				      unsigned int count);
};

/* ----------------------------------------------------------------
 * Processor configuration
 * ---------------------------------------------------------------- */

struct dove9_dte_processor_config {
	bool enable_parallel_cognition;
	unsigned int memory_retrieval_count;
	double salience_threshold;
};

static inline struct dove9_dte_processor_config
dove9_dte_processor_config_default(void)
{
	struct dove9_dte_processor_config c;
	c.enable_parallel_cognition = true;
	c.memory_retrieval_count = 10;
	c.salience_threshold = 0.3;
	return c;
}

/* ----------------------------------------------------------------
 * Opaque handle
 * ---------------------------------------------------------------- */

struct dove9_dte_processor;

/* ----------------------------------------------------------------
 * Lifecycle
 * ---------------------------------------------------------------- */

struct dove9_dte_processor *
dove9_dte_processor_create(const struct dove9_llm_service *llm,
			   const struct dove9_memory_store *memory,
			   const struct dove9_persona_core *persona,
			   const struct dove9_dte_processor_config *config);
void dove9_dte_processor_destroy(struct dove9_dte_processor **proc);

/* Get a dove9_cognitive_processor vtable backed by this DTE processor.
 * The returned struct is valid for the lifetime of `proc`. */
struct dove9_cognitive_processor
dove9_dte_processor_as_cognitive(struct dove9_dte_processor *proc);

/* ----------------------------------------------------------------
 * State queries
 * ---------------------------------------------------------------- */

void dove9_dte_processor_clear_state(struct dove9_dte_processor *proc);

#endif /* DOVE9_DTE_PROCESSOR_H */
