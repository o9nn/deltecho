/**
 * Inferno Kernel - Pure Kernel-Based Distributed AGI Operating System
 * 
 * This module implements OpenCog as a pure Inferno kernel-based distributed
 * AGI operating system. Instead of layering cognitive architectures on top
 * of existing operating systems, this implementation makes cognitive
 * processing a fundamental kernel service where thinking, reasoning, and
 * intelligence emerge from the operating system itself.
 */

// Core kernel
export { InfernoKernel } from './core/InfernoKernel.js'
export type {
  KernelConfig,
  CognitiveProcess,
  KernelStats,
} from './core/InfernoKernel.js'

// AtomSpace - Hypergraph knowledge representation
export { AtomSpace } from './atomspace/AtomSpace.js'
export type {
  Atom,
  AtomType,
  TruthValue,
  AttentionValue,
} from './atomspace/AtomSpace.js'

// Pattern Matcher
export { PatternMatcher } from './atomspace/PatternMatcher.js'
export type { Pattern, MatchResult } from './atomspace/PatternMatcher.js'

// Reasoning engines
export { PLNEngine } from './reasoning/PLNEngine.js'
export type { InferenceRule } from './reasoning/PLNEngine.js'

export { AttentionAllocation } from './reasoning/AttentionAllocation.js'
export type { AttentionConfig } from './reasoning/AttentionAllocation.js'

export { MOSES } from './reasoning/MOSES.js'
export type {
  Program,
  MOSESConfig,
  FitnessFunction,
} from './reasoning/MOSES.js'

export { OpenPsi } from './reasoning/OpenPsi.js'
export type { Goal, Drive, Emotion } from './reasoning/OpenPsi.js'

// Distributed coordination
export { DistributedCoordinator } from './distributed/DistributedCoordinator.js'
export type {
  NodeInfo,
  DistributedTask,
  CoordinatorConfig,
} from './distributed/DistributedCoordinator.js'

import { InfernoKernel } from './core/InfernoKernel.js'

/**
 * Create a fully initialized Inferno AGI kernel
 */
export async function createAGIKernel(config?: {
  maxAtoms?: number
  distributedNodes?: string[]
  reasoningDepth?: number
}) {
  const kernel = new InfernoKernel(config)
  await kernel.boot()
  return kernel
}
