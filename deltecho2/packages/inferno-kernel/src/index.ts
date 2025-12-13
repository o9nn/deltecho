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
export { InfernoKernel } from './core/InfernoKernel'
export type {
  KernelConfig,
  CognitiveProcess,
  KernelStats,
} from './core/InfernoKernel'

// AtomSpace - Hypergraph knowledge representation
export { AtomSpace } from './atomspace/AtomSpace'
export type {
  Atom,
  AtomType,
  TruthValue,
  AttentionValue,
} from './atomspace/AtomSpace'

// Pattern Matcher
export { PatternMatcher } from './atomspace/PatternMatcher'
export type { Pattern, MatchResult } from './atomspace/PatternMatcher'

// Reasoning engines
export { PLNEngine } from './reasoning/PLNEngine'
export type { InferenceRule } from './reasoning/PLNEngine'

export { AttentionAllocation } from './reasoning/AttentionAllocation'
export type { AttentionConfig } from './reasoning/AttentionAllocation'

export { MOSES } from './reasoning/MOSES'
export type {
  Program,
  MOSESConfig,
  FitnessFunction,
} from './reasoning/MOSES'

export { OpenPsi } from './reasoning/OpenPsi'
export type { Goal, Drive, Emotion } from './reasoning/OpenPsi'

// Distributed coordination
export { DistributedCoordinator } from './distributed/DistributedCoordinator'
export type {
  NodeInfo,
  DistributedTask,
  CoordinatorConfig,
} from './distributed/DistributedCoordinator'

import { InfernoKernel } from './core/InfernoKernel'

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
