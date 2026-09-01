/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#include "dove9-test-mocks.h"

#include <stdio.h>
#include <string.h>

/* ---- Call counters ---- */

unsigned int dove9_mock_llm_generate_calls = 0;
unsigned int dove9_mock_llm_parallel_calls = 0;
unsigned int dove9_mock_memory_store_calls = 0;
unsigned int dove9_mock_memory_retrieve_recent_calls = 0;
unsigned int dove9_mock_memory_retrieve_relevant_calls = 0;
unsigned int dove9_mock_persona_personality_calls = 0;
unsigned int dove9_mock_persona_emotion_calls = 0;
unsigned int dove9_mock_persona_update_calls = 0;

/* ---- LLM Service Mock ---- */

static int mock_generate_response(void *user_data, const char *prompt,
				  const char **context_strs,
				  unsigned int context_count,
				  char *out_buf, size_t out_buf_size)
{
	(void)user_data;
	(void)context_strs;
	(void)context_count;
	dove9_mock_llm_generate_calls++;
	snprintf(out_buf, out_buf_size, "Echo: %s", prompt ? prompt : "");
	return 0;
}

static int mock_generate_parallel_response(void *user_data,
					   const char *prompt,
					   const char **history,
					   unsigned int history_count,
					   char *integrated_out,
					   char *cognitive_out,
					   char *affective_out,
					   char *relevance_out,
					   size_t buf_size)
{
	(void)user_data;
	(void)history;
	(void)history_count;
	dove9_mock_llm_parallel_calls++;
	snprintf(integrated_out, buf_size, "Echo-integrated: %s",
		 prompt ? prompt : "");
	snprintf(cognitive_out, buf_size, "Echo-cognitive: %s",
		 prompt ? prompt : "");
	snprintf(affective_out, buf_size, "Echo-affective: %s",
		 prompt ? prompt : "");
	snprintf(relevance_out, buf_size, "Echo-relevance: %s",
		 prompt ? prompt : "");
	return 0;
}

/* ---- Memory Store Mock ---- */

static int mock_store_memory(void *user_data, int chat_id, int message_id,
			     const char *sender, const char *text)
{
	(void)user_data;
	(void)chat_id;
	(void)message_id;
	(void)sender;
	(void)text;
	dove9_mock_memory_store_calls++;
	return 0;
}

static int mock_retrieve_recent(void *user_data, unsigned int count,
				const char **out_memories,
				unsigned int *out_count)
{
	(void)user_data;
	(void)count;
	(void)out_memories;
	dove9_mock_memory_retrieve_recent_calls++;
	if (out_count != NULL)
		*out_count = 0;
	return 0;
}

static int mock_retrieve_relevant(void *user_data, const char *query,
				  unsigned int count,
				  const char **out_memories,
				  unsigned int *out_count)
{
	(void)user_data;
	(void)query;
	(void)count;
	(void)out_memories;
	dove9_mock_memory_retrieve_relevant_calls++;
	if (out_count != NULL)
		*out_count = 0;
	return 0;
}

/* ---- Persona Core Mock ---- */

static const char *mock_get_personality(void *user_data)
{
	(void)user_data;
	dove9_mock_persona_personality_calls++;
	return "curious";
}

static int mock_get_dominant_emotion(void *user_data, char *emotion_out,
				     size_t emotion_size,
				     double *intensity_out)
{
	(void)user_data;
	dove9_mock_persona_emotion_calls++;
	snprintf(emotion_out, emotion_size, "neutral");
	if (intensity_out != NULL)
		*intensity_out = 0.5;
	return 0;
}

static int mock_update_emotional_state(void *user_data, const char **keys,
				       const double *values,
				       unsigned int count)
{
	(void)user_data;
	(void)keys;
	(void)values;
	(void)count;
	dove9_mock_persona_update_calls++;
	return 0;
}

/* ---- Vtable instances ---- */

struct dove9_llm_service dove9_mock_llm = {
	.user_data = NULL,
	.generate_response = mock_generate_response,
	.generate_parallel_response = mock_generate_parallel_response,
};

struct dove9_memory_store dove9_mock_memory = {
	.user_data = NULL,
	.store_memory = mock_store_memory,
	.retrieve_recent = mock_retrieve_recent,
	.retrieve_relevant = mock_retrieve_relevant,
};

struct dove9_persona_core dove9_mock_persona = {
	.user_data = NULL,
	.get_personality = mock_get_personality,
	.get_dominant_emotion = mock_get_dominant_emotion,
	.update_emotional_state = mock_update_emotional_state,
};

/* ---- Reset ---- */

void dove9_mock_reset(void)
{
	dove9_mock_llm_generate_calls = 0;
	dove9_mock_llm_parallel_calls = 0;
	dove9_mock_memory_store_calls = 0;
	dove9_mock_memory_retrieve_recent_calls = 0;
	dove9_mock_memory_retrieve_relevant_calls = 0;
	dove9_mock_persona_personality_calls = 0;
	dove9_mock_persona_emotion_calls = 0;
	dove9_mock_persona_update_calls = 0;
}
