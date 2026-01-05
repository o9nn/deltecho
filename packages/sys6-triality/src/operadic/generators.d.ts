/**
 * @fileoverview Operadic Generators for Sys6 Triality
 *
 * Implements the core morphisms: Δ₂, Δ₃, μ, φ, σ
 */
import { Delta2, Delta3, Mu, Phi, Sigma, SyncEvent } from './types.js';
/**
 * Δ₂: Prime-power delegation for dyadic channel
 * D → (D, C₈)
 *
 * Delegates 2³ to cubic concurrency by creating 8 parallel states
 * from the dyadic poles using binary combinations.
 */
export declare const delta2: Delta2;
/**
 * Δ₃: Prime-power delegation for triadic channel
 * T → (T, K₉)
 *
 * Delegates 3² to triadic convolution phases by creating 9 orthogonal
 * phase-conditioned kernels from the three streams.
 */
export declare const delta3: Delta3;
/**
 * μ: LCM synchronizer / global clocking
 * (D, T, P) → Clock₃₀
 *
 * Aligns dyadic, triadic, and pentadic channels into a single
 * clock domain of length 30 based on LCM(2,3,5) = 30.
 */
export declare const mu: Mu;
/**
 * φ: 2×3 → 4 fold via double-step delay
 *
 * Compresses the naive 6-step dyad×triad multiplex into 4 real steps
 * by holding the dyad for two consecutive steps while the triad advances.
 *
 * Double-step delay pattern:
 * | Step | State | Dyad | Triad |
 * |------|-------|------|-------|
 * | 1    | 1     | A    | 1     |
 * | 2    | 4     | A    | 2     |
 * | 3    | 6     | B    | 2     |
 * | 4    | 1     | B    | 3     |
 */
export declare const phi: Phi;
/**
 * σ: Stage scheduler
 *
 * Maps the 30-step clock into 5 stages × 6 steps.
 * Runs φ once per stage with 2 transition/sync steps (steps 5,6 in each stage).
 */
export declare const sigma: Sigma;
/**
 * Calculate all synchronization events in a 30-step cycle
 *
 * Sync events occur at mod-2/mod-3/mod-5 boundaries.
 * Expected: 42 sync events per 30-step cycle.
 */
export declare function calculateSyncEvents(): SyncEvent[];
/**
 * Get the current phase index for K₉ based on step
 */
export declare function getK9PhaseIndex(step: number): [number, number];
/**
 * Get the current state index for C₈ based on step
 */
export declare function getC8StateIndex(step: number): number;
//# sourceMappingURL=generators.d.ts.map
