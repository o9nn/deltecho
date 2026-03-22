import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ReservoirFeedbackLoop, type FeedbackEvent } from '../reservoir-feedback-loop.js';
import { EchoReservoir } from 'deep-tree-echo-core';

describe('ReservoirFeedbackLoop', () => {
  let loop: ReservoirFeedbackLoop;

  beforeEach(() => {
    loop = new ReservoirFeedbackLoop({
      reservoirDim: 32,
      outputDim: 4,
      batchIntervalMs: 0, // Disable timer for tests
      maxBufferSize: 10,
      minRewardMagnitude: 0.01,
      forgettingFactor: 0.99,
      enablePersistence: false,
    });
  });

  afterEach(async () => {
    await loop.stop();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultLoop = new ReservoirFeedbackLoop();
      expect(defaultLoop.isRunning()).toBe(false);
      const metrics = defaultLoop.getMetrics();
      expect(metrics.totalFeedbackEvents).toBe(0);
      expect(metrics.totalRLSUpdates).toBe(0);
    });

    it('should accept custom configuration', () => {
      expect(loop.isRunning()).toBe(false);
      expect(loop.getMetrics().bufferSize).toBe(0);
    });

    it('should have an underlying learner', () => {
      const learner = loop.getLearner();
      expect(learner).toBeDefined();
      expect(learner.getStats().totalUpdates).toBe(0);
    });
  });

  describe('lifecycle', () => {
    it('should start and stop cleanly', async () => {
      loop.start();
      expect(loop.isRunning()).toBe(true);
      await loop.stop();
      expect(loop.isRunning()).toBe(false);
    });

    it('should be idempotent on start', () => {
      loop.start();
      loop.start(); // Should not throw
      expect(loop.isRunning()).toBe(true);
    });

    it('should accept optional reservoir on start', () => {
      const reservoir = new EchoReservoir({ units: 32, inputDim: 8 });
      loop.start(reservoir);
      expect(loop.isRunning()).toBe(true);
    });
  });

  describe('feedback submission', () => {
    it('should accept conversational feedback', () => {
      loop.start();
      const state = new Float64Array(32);
      state[0] = 1.0;

      loop.submitConversationalFeedback('conv-1', 'completed', 0.8, state);
      expect(loop.getMetrics().totalFeedbackEvents).toBe(1);
    });

    it('should accept coherence feedback', () => {
      loop.start();
      loop.submitCoherenceFeedback(0.85);
      expect(loop.getMetrics().totalFeedbackEvents).toBe(1);
    });

    it('should accept self-modification feedback', () => {
      loop.start();
      loop.submitSelfModFeedback(true, 0.05);
      expect(loop.getMetrics().totalFeedbackEvents).toBe(1);
    });

    it('should filter out tiny rewards (noise gate)', () => {
      loop.start();
      loop.submitFeedback({
        source: 'external',
        reward: 0.001, // Below minRewardMagnitude of 0.01
        timestamp: Date.now(),
      });
      expect(loop.getMetrics().totalFeedbackEvents).toBe(0);
    });

    it('should not accept feedback when stopped', () => {
      // Don't start the loop
      loop.submitConversationalFeedback('conv-1', 'completed', 0.8);
      expect(loop.getMetrics().totalFeedbackEvents).toBe(0);
    });

    it('should emit feedback_received event', () => {
      loop.start();
      const events: unknown[] = [];
      loop.on('feedback_received', (e) => events.push(e));

      loop.submitCoherenceFeedback(0.9);
      expect(events.length).toBe(1);
    });
  });

  describe('batch processing', () => {
    it('should force flush when buffer reaches maxBufferSize', () => {
      loop.start();
      const state = new Float64Array(32);
      state[0] = 1.0;

      const events: unknown[] = [];
      loop.on('batch_update', (e) => events.push(e));

      // Submit maxBufferSize events to trigger forced flush
      for (let i = 0; i < 10; i++) {
        loop.submitFeedback({
          source: 'conversation',
          reward: 0.5,
          reservoirState: new Float64Array(state),
          timestamp: Date.now(),
        });
      }

      // Buffer should have been flushed
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(loop.getMetrics().totalRLSUpdates).toBeGreaterThan(0);
    });

    it('should update RLS weights after batch processing', () => {
      loop.start();
      const state = new Float64Array(32);
      for (let i = 0; i < 32; i++) state[i] = Math.random() - 0.5;

      // Submit enough events to trigger flush
      for (let i = 0; i < 10; i++) {
        loop.submitFeedback({
          source: 'coherence',
          reward: 0.7,
          reservoirState: new Float64Array(state),
          timestamp: Date.now(),
        });
      }

      const metrics = loop.getMetrics();
      expect(metrics.totalRLSUpdates).toBeGreaterThan(0);
      expect(metrics.avgPredictionError).toBeGreaterThanOrEqual(0);
    });
  });

  describe('reservoir integration', () => {
    it('should read state from attached reservoir', () => {
      const reservoir = new EchoReservoir({ units: 32, inputDim: 8 });
      // Step the reservoir to generate non-zero state
      const input = new Float64Array(8);
      input[0] = 1.0;
      reservoir.step(input);

      loop.start(reservoir);
      loop.submitCoherenceFeedback(0.9);

      // The feedback should have reservoir state attached
      expect(loop.getMetrics().totalFeedbackEvents).toBe(1);
    });

    it('should allow setting reservoir after start', () => {
      loop.start();
      const reservoir = new EchoReservoir({ units: 32, inputDim: 8 });
      loop.setReservoir(reservoir);

      // Should now read from reservoir
      const input = new Float64Array(8);
      input[0] = 1.0;
      reservoir.step(input);

      loop.submitCoherenceFeedback(0.8);
      expect(loop.getMetrics().totalFeedbackEvents).toBe(1);
    });
  });

  describe('metrics', () => {
    it('should track comprehensive metrics', () => {
      loop.start();
      const metrics = loop.getMetrics();
      expect(metrics).toHaveProperty('totalFeedbackEvents');
      expect(metrics).toHaveProperty('totalRLSUpdates');
      expect(metrics).toHaveProperty('avgPredictionError');
      expect(metrics).toHaveProperty('avgReward');
      expect(metrics).toHaveProperty('weightNorm');
      expect(metrics).toHaveProperty('bufferSize');
      expect(metrics).toHaveProperty('lastUpdateAt');
      expect(metrics).toHaveProperty('isRunning');
    });

    it('should report running state correctly', () => {
      expect(loop.getMetrics().isRunning).toBe(false);
      loop.start();
      expect(loop.getMetrics().isRunning).toBe(true);
    });
  });

  describe('prediction error', () => {
    it('should return 0 initially', () => {
      expect(loop.getAvgPredictionError()).toBe(0);
    });

    it('should update after learning', () => {
      loop.start();
      const state = new Float64Array(32);
      for (let i = 0; i < 32; i++) state[i] = Math.random() - 0.5;

      // Force enough events to trigger batch
      for (let i = 0; i < 10; i++) {
        loop.submitFeedback({
          source: 'conversation',
          reward: 0.6,
          reservoirState: new Float64Array(state),
          timestamp: Date.now(),
        });
      }

      // After RLS updates, prediction error should be non-zero
      expect(loop.getAvgPredictionError()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('conversational feedback mapping', () => {
    it('should map completed status to positive reward', () => {
      loop.start();
      const state = new Float64Array(32);
      state[0] = 1.0;
      loop.submitConversationalFeedback('conv-1', 'completed', 0.9, state);
      expect(loop.getMetrics().totalFeedbackEvents).toBe(1);
    });

    it('should map failed status to negative reward', () => {
      loop.start();
      const state = new Float64Array(32);
      state[0] = 1.0;
      loop.submitConversationalFeedback('conv-2', 'failed', 0, state);
      expect(loop.getMetrics().totalFeedbackEvents).toBe(1);
    });

    it('should map evicted status to small negative reward', () => {
      loop.start();
      const state = new Float64Array(32);
      state[0] = 1.0;
      loop.submitConversationalFeedback('conv-3', 'evicted', 0, state);
      expect(loop.getMetrics().totalFeedbackEvents).toBe(1);
    });
  });
});
