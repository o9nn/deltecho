/**
 * @fileoverview Sys6 Operadic Composite
 *
 * Implements the complete Sys6 morphism:
 * Sys6 := σ ∘ (φ ∘ μ ∘ (Δ₂ ⊗ Δ₃ ⊗ id_P))
 */
import {
  DyadicChannel,
  TriadicChannel,
  PentadicStage,
  Sys6OperadicState,
  Sys6Morphism,
} from './types.js';
import { ShapedTensor } from '../tensors/index.js';
/**
 * The complete Sys6 morphism implementation
 */
export declare const sys6Morphism: Sys6Morphism;
/**
 * Execute one complete step of the Sys6 operadic composition
 *
 * @param dyadic - Current dyadic channel state
 * @param triadic - Current triadic channel state
 * @param pentadic - Current pentadic stage state
 * @returns Complete operadic state for this step
 */
export declare function sys6Step(
  dyadic: DyadicChannel,
  triadic: TriadicChannel,
  pentadic: PentadicStage
): Sys6OperadicState;
/**
 * Execute a complete 30-step Sys6 cycle
 *
 * @param initialDyadic - Initial dyadic channel state
 * @param initialTriadic - Initial triadic channel state
 * @param dim - Dimension of state tensors
 * @returns Array of all 30 operadic states
 */
export declare function sys6Cycle(
  initialDyadic: DyadicChannel,
  initialTriadic: TriadicChannel,
  dim: number
): Sys6OperadicState[];
/**
 * Create initial dyadic channel from input tensor
 */
export declare function createInitialDyadic(input: ShapedTensor): DyadicChannel;
/**
 * Create initial triadic channel from input tensor
 */
export declare function createInitialTriadic(input: ShapedTensor): TriadicChannel;
/**
 * Extract final output from a complete cycle
 *
 * Combines the final states of all channels
 */
export declare function extractFinalOutput(states: Sys6OperadicState[]): ShapedTensor;
/**
 * Validate operadic composition correctness
 *
 * Checks that all morphisms compose correctly and maintain
 * the required mathematical properties.
 */
export declare function validateOperadicComposition(states: Sys6OperadicState[]): {
  valid: boolean;
  errors: string[];
};
//# sourceMappingURL=composite.d.ts.map
