/* Copyright (c) 2024-2026 Dovecho authors, see the included COPYING file */

#ifndef DOVE9_TEST_MOCKS_H
#define DOVE9_TEST_MOCKS_H

#include "../cognitive/dove9-dte-processor.h"

/* ----------------------------------------------------------------
 * Shared mock vtable instances for Dove9 tests.
 * Each mock provides deterministic responses and increments
 * a call counter so tests can verify invocation patterns.
 * ---------------------------------------------------------------- */

/* Call counters — named to match test assertions */
extern unsigned int dove9_mock_llm_generate_calls;
extern unsigned int dove9_mock_llm_parallel_calls;
extern unsigned int dove9_mock_memory_store_calls;
extern unsigned int dove9_mock_memory_retrieve_recent_calls;
extern unsigned int dove9_mock_memory_retrieve_relevant_calls;
extern unsigned int dove9_mock_persona_personality_calls;
extern unsigned int dove9_mock_persona_emotion_calls;
extern unsigned int dove9_mock_persona_update_calls;

/* Mock vtable instances */
extern struct dove9_llm_service dove9_mock_llm;
extern struct dove9_memory_store dove9_mock_memory;
extern struct dove9_persona_core dove9_mock_persona;

/* Reset all call counters to zero */
void dove9_mock_reset(void);

#endif /* DOVE9_TEST_MOCKS_H */
