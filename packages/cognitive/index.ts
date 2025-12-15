/**
 * @deltecho/cognitive - Unified Cognitive Framework
 *
 * This package provides the unified interface to all Deep Tree Echo cognitive capabilities:
 * - LLM services (multi-provider cognitive processing)
 * - Memory systems (RAG, hyperdimensional memory)
 * - Personality management (autonomous persona)
 * - Triadic cognitive loops (inspired by hexapod tripod gait)
 * - Dove9 OS integration (everything is a chatbot)
 *
 * Architecture:
 * ```
 *                    ┌─────────────────────────────────────┐
 *                    │       @deltecho/cognitive           │
 *                    │    (Unified Cognitive Interface)    │
 *                    └──────────────┬──────────────────────┘
 *                                   │
 *          ┌────────────────────────┼────────────────────────┐
 *          │                        │                        │
 *          ▼                        ▼                        ▼
 *  ┌───────────────┐      ┌─────────────────┐      ┌────────────────┐
 *  │deep-tree-echo-│      │     dove9       │      │  @deltecho/    │
 *  │     core      │      │ (Triadic Loop)  │      │   reasoning    │
 *  │ (LLM/Memory)  │      │                 │      │ (AGI Kernel)   │
 *  └───────────────┘      └─────────────────┘      └────────────────┘
 * ```
 */

// Re-export all deep-tree-echo-core capabilities
export * from 'deep-tree-echo-core'

// Re-export dove9 triadic cognitive engine
export {
  Dove9Kernel,
  TriadicCognitiveEngine,
  DeepTreeEchoProcessor
} from 'dove9'

// Export unified types
export * from './types/index.js'

// Export integration utilities
export * from './integration/index.js'
