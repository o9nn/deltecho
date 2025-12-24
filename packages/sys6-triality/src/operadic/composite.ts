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

import { delta2, delta3, mu, phi, sigma } from './generators.js';

import { ShapedTensor, createTensor } from '../tensors/index.js';

/**
 * The complete Sys6 morphism implementation
 */
export const sys6Morphism: Sys6Morphism = {
  delta2,
  delta3,
  mu,
  phi,
  sigma,
};

/**
 * Execute one complete step of the Sys6 operadic composition
 *
 * @param dyadic - Current dyadic channel state
 * @param triadic - Current triadic channel state
 * @param pentadic - Current pentadic stage state
 * @returns Complete operadic state for this step
 */
export function sys6Step(
  dyadic: DyadicChannel,
  triadic: TriadicChannel,
  pentadic: PentadicStage
): Sys6OperadicState {
  // Step 1: Apply Δ₂ ⊗ Δ₃ ⊗ id_P (prime-power delegation)
  const [dyadicOut, cubic] = delta2(dyadic);
  const [triadicOut, convolution] = delta3(triadic);
  // pentadic passes through unchanged (id_P)

  // Step 2: Apply μ (LCM synchronizer)
  const clock = mu(dyadicOut, triadicOut, pentadic);

  // Step 3: Apply φ (double-step delay fold)
  const phiFold = phi(clock, dyadicOut, triadicOut);

  // Step 4: Apply σ (stage scheduler)
  const schedule = sigma(clock);
  schedule.phiFold = phiFold;

  // Assemble complete state
  const state: Sys6OperadicState = {
    clock,
    dyadic: dyadicOut,
    triadic: triadicOut,
    pentadic,
    cubic,
    convolution,
    phiFold,
    schedule,
  };

  return state;
}

/**
 * Execute a complete 30-step Sys6 cycle
 *
 * @param initialDyadic - Initial dyadic channel state
 * @param initialTriadic - Initial triadic channel state
 * @param dim - Dimension of state tensors
 * @returns Array of all 30 operadic states
 */
export function sys6Cycle(
  initialDyadic: DyadicChannel,
  initialTriadic: TriadicChannel,
  dim: number
): Sys6OperadicState[] {
  const states: Sys6OperadicState[] = [];

  let currentDyadic = initialDyadic;
  let currentTriadic = initialTriadic;

  // Execute all 30 steps
  for (let absoluteStep = 1; absoluteStep <= 30; absoluteStep++) {
    // Calculate pentadic stage
    const stage = Math.ceil(absoluteStep / 6) as 1 | 2 | 3 | 4 | 5;
    const stepInStage = (((absoluteStep - 1) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;

    const pentadic: PentadicStage = {
      type: 'pentadic',
      stage,
      stepInStage,
      stageState: currentDyadic.poleA, // Use current state
    };

    // Execute step
    const state = sys6Step(currentDyadic, currentTriadic, pentadic);
    states.push(state);

    // Update channels for next step
    currentDyadic = {
      ...currentDyadic,
      phase: state.clock.dyadicPhase,
    };

    currentTriadic = {
      ...currentTriadic,
      phase: state.clock.triadicPhase,
    };
  }

  return states;
}

/**
 * Create initial dyadic channel from input tensor
 */
export function createInitialDyadic(input: ShapedTensor): DyadicChannel {
  return {
    type: 'dyadic',
    phase: 0,
    poleA: input,
    poleB: input, // Initially same, will diverge through processing
  };
}

/**
 * Create initial triadic channel from input tensor
 */
export function createInitialTriadic(input: ShapedTensor): TriadicChannel {
  return {
    type: 'triadic',
    phase: 0,
    stream1: input,
    stream2: input,
    stream3: input, // Initially same, will diverge through processing
  };
}

/**
 * Extract final output from a complete cycle
 *
 * Combines the final states of all channels
 */
export function extractFinalOutput(states: Sys6OperadicState[]): ShapedTensor {
  const finalState = states[states.length - 1];

  // The final output is the phi fold state from the last step
  return finalState.phiFold.state;
}

/**
 * Validate operadic composition correctness
 *
 * Checks that all morphisms compose correctly and maintain
 * the required mathematical properties.
 */
export function validateOperadicComposition(states: Sys6OperadicState[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check that we have exactly 30 steps
  if (states.length !== 30) {
    errors.push(`Expected 30 steps, got ${states.length}`);
  }

  // Check clock progression
  for (let i = 0; i < states.length; i++) {
    const expectedStep = i + 1;
    if (states[i].clock.absoluteStep !== expectedStep) {
      errors.push(
        `Step ${i}: expected absoluteStep ${expectedStep}, got ${states[i].clock.absoluteStep}`
      );
    }
  }

  // Check dyadic phase alternation (mod 2)
  for (let i = 0; i < states.length; i++) {
    const expectedPhase = ((i + 1) % 2) as 0 | 1;
    if (states[i].clock.dyadicPhase !== expectedPhase) {
      errors.push(
        `Step ${i + 1}: expected dyadicPhase ${expectedPhase}, got ${states[i].clock.dyadicPhase}`
      );
    }
  }

  // Check triadic phase rotation (mod 3)
  for (let i = 0; i < states.length; i++) {
    const expectedPhase = ((i + 1) % 3) as 0 | 1 | 2;
    if (states[i].clock.triadicPhase !== expectedPhase) {
      errors.push(
        `Step ${i + 1}: expected triadicPhase ${expectedPhase}, got ${states[i].clock.triadicPhase}`
      );
    }
  }

  // Check pentadic stage boundaries (every 6 steps)
  for (let i = 0; i < states.length; i++) {
    const expectedStage = Math.ceil((i + 1) / 6) as 1 | 2 | 3 | 4 | 5;
    if (states[i].clock.pentadicStage !== expectedStage) {
      errors.push(
        `Step ${i + 1}: expected pentadicStage ${expectedStage}, got ${states[i].clock.pentadicStage}`
      );
    }
  }

  // Check cubic concurrency has 8 states
  for (let i = 0; i < states.length; i++) {
    if (states[i].cubic.states.length !== 8) {
      errors.push(
        `Step ${i + 1}: cubic concurrency should have 8 states, got ${states[i].cubic.states.length}`
      );
    }
  }

  // Check triadic convolution has 9 phases
  for (let i = 0; i < states.length; i++) {
    if (states[i].convolution.phases.length !== 9) {
      errors.push(
        `Step ${i + 1}: triadic convolution should have 9 phases, got ${states[i].convolution.phases.length}`
      );
    }
  }

  // Check double-step delay pattern
  const expectedPattern = [
    { step: 1, dyad: 'A', triad: 1 },
    { step: 2, dyad: 'A', triad: 2 },
    { step: 3, dyad: 'B', triad: 2 },
    { step: 4, dyad: 'B', triad: 3 },
  ];

  for (let i = 0; i < states.length; i++) {
    const patternIndex = i % 4;
    const expected = expectedPattern[patternIndex];
    const actual = states[i].phiFold;

    if (actual.step !== expected.step) {
      errors.push(`Step ${i + 1}: expected phi fold step ${expected.step}, got ${actual.step}`);
    }
    if (actual.dyad !== expected.dyad) {
      errors.push(`Step ${i + 1}: expected phi fold dyad ${expected.dyad}, got ${actual.dyad}`);
    }
    if (actual.triad !== expected.triad) {
      errors.push(`Step ${i + 1}: expected phi fold triad ${expected.triad}, got ${actual.triad}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
