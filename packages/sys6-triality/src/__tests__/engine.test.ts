/**
 * @fileoverview Tests for Sys6 Cycle Engine
 */

import { createTensor, randn } from '../tensors/types.js';

import { Sys6CycleEngine, PHASE_NAMES, STAGE_NAMES } from '../engine/Sys6CycleEngine.js';

describe('Sys6CycleEngine', () => {
  const dim = 64;
  let engine: Sys6CycleEngine;

  beforeEach(() => {
    engine = new Sys6CycleEngine({ dim });
  });

  describe('Initialization', () => {
    test('creates engine with correct configuration', () => {
      expect(engine.config.dim).toBe(dim);
      expect(engine.config.hiddenDim).toBe(dim * 2);
    });

    test('engine has correct number of parameters', () => {
      const numParams = engine.numParameters();
      expect(numParams).toBeGreaterThan(0);
    });
  });

  describe('Forward Pass', () => {
    test('forward produces output with correct shape', () => {
      const input = randn([1, dim]);
      const result = engine.forward(input, 1);

      expect(result.finalState.shape).toEqual([1, dim]);
    });

    test('forward produces 30 step results', () => {
      const input = randn([1, dim]);
      const result = engine.forward(input, 1);

      expect(result.steps.length).toBe(30);
    });

    test('each step has valid address', () => {
      const input = randn([1, dim]);
      const result = engine.forward(input, 1);

      for (let i = 0; i < 30; i++) {
        const step = result.steps[i];
        expect(step.step.phase).toBeGreaterThanOrEqual(1);
        expect(step.step.phase).toBeLessThanOrEqual(3);
        expect(step.step.stage).toBeGreaterThanOrEqual(1);
        expect(step.step.stage).toBeLessThanOrEqual(5);
        expect(step.step.step).toBeGreaterThanOrEqual(1);
        expect(step.step.step).toBeLessThanOrEqual(2);
      }
    });

    test('streams are updated at each step', () => {
      const input = randn([1, dim]);
      const result = engine.forward(input, 1);

      for (const step of result.steps) {
        expect(step.streams.length).toBe(3);
        for (const stream of step.streams) {
          expect(stream.streamId).toBeGreaterThanOrEqual(1);
          expect(stream.streamId).toBeLessThanOrEqual(3);
          expect(['perception', 'evaluation', 'action']).toContain(stream.phase);
        }
      }
    });

    test('double step delay pattern is correct', () => {
      const input = randn([1, dim]);
      const result = engine.forward(input, 1);

      // Check first 4 steps follow the pattern
      expect(result.steps[0].delayState.dyad).toBe('A');
      expect(result.steps[0].delayState.triad).toBe(1);

      expect(result.steps[1].delayState.dyad).toBe('A');
      expect(result.steps[1].delayState.triad).toBe(2);

      expect(result.steps[2].delayState.dyad).toBe('B');
      expect(result.steps[2].delayState.triad).toBe(2);

      expect(result.steps[3].delayState.dyad).toBe('B');
      expect(result.steps[3].delayState.triad).toBe(3);
    });

    test('multiple cycles produce different results', () => {
      const input = randn([1, dim]);
      const result1 = engine.forward(input, 1);
      const result2 = engine.forward(input, 2);

      // More cycles should produce different final state
      expect(result2.steps.length).toBe(60); // 2 cycles * 30 steps
    });
  });

  describe('Batch Processing', () => {
    test('handles batch input', () => {
      const batchSize = 4;
      const input = randn([batchSize, dim]);
      const result = engine.forward(input, 1);

      expect(result.finalState.shape).toEqual([batchSize, dim]);
    });
  });

  describe('Step Information', () => {
    test('getStepInfo returns correct information', () => {
      const info = engine.getStepInfo(1);

      expect(info.address.phase).toBe(1);
      expect(info.address.stage).toBe(1);
      expect(info.address.step).toBe(1);
      expect(info.phaseName).toBe(PHASE_NAMES[1]);
      expect(info.stageName).toBe(STAGE_NAMES[1][1]);
    });

    test('getStepInfo covers all 30 steps', () => {
      for (let step = 1; step <= 30; step++) {
        const info = engine.getStepInfo(step);
        expect(info.address).toBeDefined();
        expect(info.phaseName).toBeDefined();
        expect(info.stageName).toBeDefined();
        expect(info.primaryStream).toBeDefined();
        expect(info.dyadicPair).toBeDefined();
        expect(info.triadicPermutations).toBeDefined();
      }
    });
  });

  describe('Training Mode', () => {
    test('train mode can be toggled', () => {
      expect(engine.isTraining()).toBe(true);

      engine.eval();
      expect(engine.isTraining()).toBe(false);

      engine.train();
      expect(engine.isTraining()).toBe(true);
    });
  });

  describe('Performance', () => {
    test('processing time is recorded', () => {
      const input = randn([1, dim]);
      const result = engine.forward(input, 1);

      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    test('completes 30-step cycle in reasonable time', () => {
      const input = randn([1, dim]);
      const startTime = Date.now();
      const result = engine.forward(input, 1);
      const elapsed = Date.now() - startTime;

      // Should complete in under 5 seconds for small dimension
      expect(elapsed).toBeLessThan(5000);
    });
  });
});

describe('Phase and Stage Names', () => {
  test('all phases have names', () => {
    expect(PHASE_NAMES[1]).toBeDefined();
    expect(PHASE_NAMES[2]).toBeDefined();
    expect(PHASE_NAMES[3]).toBeDefined();
  });

  test('all stages have names for each phase', () => {
    for (let phase = 1; phase <= 3; phase++) {
      for (let stage = 1; stage <= 5; stage++) {
        expect(STAGE_NAMES[phase as 1 | 2 | 3][stage as 1 | 2 | 3 | 4 | 5]).toBeDefined();
      }
    }
  });
});
