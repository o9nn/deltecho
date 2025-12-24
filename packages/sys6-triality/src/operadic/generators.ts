/**
 * @fileoverview Operadic Generators for Sys6 Triality
 *
 * Implements the core morphisms: Δ₂, Δ₃, μ, φ, σ
 */

import {
  DyadicChannel,
  TriadicChannel,
  PentadicStage,
  CubicConcurrency,
  TriadicConvolutionBundle,
  Clock30,
  PhiFoldState,
  SigmaScheduleStep,
  Delta2,
  Delta3,
  Mu,
  Phi,
  Sigma,
  SyncEvent,
} from './types.js';

import { ShapedTensor, createTensor, zeros } from '../tensors/index.js';
import { scale, add } from '../tensors/operations.js';

/**
 * Δ₂: Prime-power delegation for dyadic channel
 * D → (D, C₈)
 *
 * Delegates 2³ to cubic concurrency by creating 8 parallel states
 * from the dyadic poles using binary combinations.
 */
export const delta2: Delta2 = (d: DyadicChannel) => {
  const { poleA, poleB } = d;

  // Generate 8 parallel states from 2³ combinations
  // Each state is a weighted combination of poleA and poleB
  const states: CubicConcurrency['states'] = [
    poleA, // 000: pure A
    scale(add(scale(poleA, 0.875), scale(poleB, 0.125)), 1.0), // 001
    scale(add(scale(poleA, 0.75), scale(poleB, 0.25)), 1.0), // 010
    scale(add(scale(poleA, 0.625), scale(poleB, 0.375)), 1.0), // 011
    scale(add(scale(poleA, 0.5), scale(poleB, 0.5)), 1.0), // 100: balanced
    scale(add(scale(poleA, 0.375), scale(poleB, 0.625)), 1.0), // 101
    scale(add(scale(poleA, 0.25), scale(poleB, 0.75)), 1.0), // 110
    poleB, // 111: pure B
  ];

  const cubic: CubicConcurrency = {
    type: 'cubic',
    states,
  };

  return [d, cubic];
};

/**
 * Δ₃: Prime-power delegation for triadic channel
 * T → (T, K₉)
 *
 * Delegates 3² to triadic convolution phases by creating 9 orthogonal
 * phase-conditioned kernels from the three streams.
 */
export const delta3: Delta3 = (t: TriadicChannel) => {
  const { stream1, stream2, stream3 } = t;

  // Generate 9 orthogonal phases from 3² combinations
  // Each phase is a weighted combination of the three streams
  const phases: TriadicConvolutionBundle['phases'] = [
    stream1, // (0,0): pure stream1
    scale(add(scale(stream1, 0.67), scale(stream2, 0.33)), 1.0), // (0,1)
    scale(add(scale(stream1, 0.33), scale(stream2, 0.67)), 1.0), // (0,2)
    scale(add(scale(stream1, 0.67), scale(stream3, 0.33)), 1.0), // (1,0)
    scale(add(add(scale(stream1, 0.33), scale(stream2, 0.33)), scale(stream3, 0.34)), 1.0), // (1,1): balanced
    scale(add(scale(stream2, 0.67), scale(stream3, 0.33)), 1.0), // (1,2)
    scale(add(scale(stream1, 0.33), scale(stream3, 0.67)), 1.0), // (2,0)
    scale(add(scale(stream2, 0.33), scale(stream3, 0.67)), 1.0), // (2,1)
    stream3, // (2,2): pure stream3
  ];

  const convolution: TriadicConvolutionBundle = {
    type: 'triadic_convolution',
    phases,
    currentPhase: [t.phase % 3, Math.floor(t.phase / 3) % 3] as [number, number],
  };

  return [t, convolution];
};

/**
 * μ: LCM synchronizer / global clocking
 * (D, T, P) → Clock₃₀
 *
 * Aligns dyadic, triadic, and pentadic channels into a single
 * clock domain of length 30 based on LCM(2,3,5) = 30.
 */
export const mu: Mu = (d: DyadicChannel, t: TriadicChannel, p: PentadicStage) => {
  // Calculate absolute step from pentadic stage
  const absoluteStep = (p.stage - 1) * 6 + p.stepInStage;

  const clock: Clock30 = {
    type: 'clock30',
    absoluteStep,
    dyadicPhase: (absoluteStep % 2) as 0 | 1,
    triadicPhase: (absoluteStep % 3) as 0 | 1 | 2,
    pentadicStage: p.stage,
  };

  return clock;
};

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
export const phi: Phi = (clock: Clock30, dyad: DyadicChannel, triad: TriadicChannel) => {
  // Calculate 4-step phase from absolute step
  const fourStepPhase = (((clock.absoluteStep - 1) % 4) + 1) as 1 | 2 | 3 | 4;

  // Map to double-step delay pattern
  const patterns: Array<{ dyad: 'A' | 'B'; triad: 1 | 2 | 3 }> = [
    { dyad: 'A', triad: 1 },
    { dyad: 'A', triad: 2 },
    { dyad: 'B', triad: 2 },
    { dyad: 'B', triad: 3 },
  ];

  const pattern = patterns[fourStepPhase - 1];

  // Select state based on pattern
  const dyadState = pattern.dyad === 'A' ? dyad.poleA : dyad.poleB;
  const triadState =
    pattern.triad === 1 ? triad.stream1 : pattern.triad === 2 ? triad.stream2 : triad.stream3;

  // Combine dyad and triad states
  const state = add(scale(dyadState, 0.5), scale(triadState, 0.5));

  const phiFold: PhiFoldState = {
    step: fourStepPhase,
    dyad: pattern.dyad,
    triad: pattern.triad,
    state,
  };

  return phiFold;
};

/**
 * σ: Stage scheduler
 *
 * Maps the 30-step clock into 5 stages × 6 steps.
 * Runs φ once per stage with 2 transition/sync steps (steps 5,6 in each stage).
 */
export const sigma: Sigma = (clock: Clock30) => {
  const { absoluteStep, pentadicStage } = clock;

  // Calculate step within current stage (1-6)
  const stepInStage = (((absoluteStep - 1) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;

  // Steps 5 and 6 are transition/sync steps
  const isTransition = stepInStage === 5 || stepInStage === 6;

  const schedule: SigmaScheduleStep = {
    absoluteStep,
    stage: pentadicStage,
    stepInStage,
    isTransition,
    phiFold: null, // Will be populated by phi during non-transition steps
  };

  return schedule;
};

/**
 * Calculate all synchronization events in a 30-step cycle
 *
 * Sync events occur at mod-2/mod-3/mod-5 boundaries.
 * Expected: 42 sync events per 30-step cycle.
 */
export function calculateSyncEvents(): SyncEvent[] {
  const events: SyncEvent[] = [];

  for (let step = 1; step <= 30; step++) {
    const isDyadicBoundary = step % 2 === 0;
    const isTriadicBoundary = step % 3 === 0;
    const isPentadicBoundary = step % 6 === 0; // Stage boundaries

    if (isDyadicBoundary && isTriadicBoundary && isPentadicBoundary) {
      events.push({
        step,
        type: 'full',
        description: `Full synchronization at step ${step} (mod 2,3,5)`,
      });
    } else if (isDyadicBoundary && isTriadicBoundary) {
      events.push({
        step,
        type: 'dyadic-triadic',
        description: `Dyadic-Triadic sync at step ${step} (mod 2,3)`,
      });
    } else if (isDyadicBoundary && isPentadicBoundary) {
      events.push({
        step,
        type: 'dyadic-pentadic',
        description: `Dyadic-Pentadic sync at step ${step} (mod 2,5)`,
      });
    } else if (isTriadicBoundary && isPentadicBoundary) {
      events.push({
        step,
        type: 'triadic-pentadic',
        description: `Triadic-Pentadic sync at step ${step} (mod 3,5)`,
      });
    } else if (isDyadicBoundary) {
      events.push({
        step,
        type: 'dyadic',
        description: `Dyadic sync at step ${step} (mod 2)`,
      });
    } else if (isTriadicBoundary) {
      events.push({
        step,
        type: 'triadic',
        description: `Triadic sync at step ${step} (mod 3)`,
      });
    } else if (isPentadicBoundary) {
      events.push({
        step,
        type: 'pentadic',
        description: `Pentadic sync at step ${step} (mod 5)`,
      });
    }
  }

  return events;
}

/**
 * Get the current phase index for K₉ based on step
 */
export function getK9PhaseIndex(step: number): [number, number] {
  const triadPhase = step % 3;
  const secondaryPhase = Math.floor(step / 3) % 3;
  return [triadPhase, secondaryPhase];
}

/**
 * Get the current state index for C₈ based on step
 */
export function getC8StateIndex(step: number): number {
  // Map step to one of 8 states using modular arithmetic
  return step % 8;
}
