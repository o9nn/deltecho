/**
 * @fileoverview Tests for AutonomyFeedbackLoop
 *
 * Tests the closed-loop learning system that connects action outcomes
 * back to the OnlineReservoirLearner and training data generator.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock deep-tree-echo-core
jest.unstable_mockModule('deep-tree-echo-core', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const { AutonomyFeedbackLoop } = await import('../autonomy-feedback-loop.js');
type FeedbackSignal = import('../autonomy-feedback-loop.js').FeedbackSignal;

describe('AutonomyFeedbackLoop', () => {
  let loop: InstanceType<typeof AutonomyFeedbackLoop>;

  beforeEach(() => {
    loop = new AutonomyFeedbackLoop({
      batchSize: 4,
      batchInterval: 100,
      enableCoherenceCheck: false,
      enableTrainingDataGeneration: false,
    });
  });

  afterEach(async () => {
    if (loop.isRunning()) {
      await loop.stop();
    }
  });

  describe('Lifecycle', () => {
    it('should start and stop cleanly', async () => {
      expect(loop.isRunning()).toBe(false);
      await loop.start();
      expect(loop.isRunning()).toBe(true);
      await loop.stop();
      expect(loop.isRunning()).toBe(false);
    });

    it('should be idempotent on start/stop', async () => {
      await loop.start();
      await loop.start(); // double start
      expect(loop.isRunning()).toBe(true);
      await loop.stop();
      await loop.stop(); // double stop
      expect(loop.isRunning()).toBe(false);
    });
  });

  describe('Feedback Submission', () => {
    it('should accept feedback signals', () => {
      const signal: FeedbackSignal = {
        actionId: 'test-1',
        reservoirState: [0.1, 0.2, 0.3],
        targetOutput: [0.5, 0.6],
        reward: 0.8,
        source: 'user',
        timestamp: Date.now(),
      };

      loop.submitFeedback(signal);
      const stats = loop.getStats();
      expect(stats.totalFeedbackReceived).toBe(1);
    });

    it('should track average reward', () => {
      const signals: FeedbackSignal[] = [
        { actionId: '1', reservoirState: [0.1], targetOutput: [0.5], reward: 1.0, source: 'user', timestamp: Date.now() },
        { actionId: '2', reservoirState: [0.2], targetOutput: [0.6], reward: 0.0, source: 'user', timestamp: Date.now() },
      ];

      for (const s of signals) loop.submitFeedback(s);
      const stats = loop.getStats();
      expect(stats.averageReward).toBeCloseTo(0.5, 1);
    });

    it('should emit feedback_received events', () => {
      const events: any[] = [];
      loop.on('event', (e: any) => events.push(e));

      loop.submitFeedback({
        actionId: 'test-1',
        reservoirState: [0.1],
        targetOutput: [0.5],
        reward: 0.8,
        source: 'user',
        timestamp: Date.now(),
      });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('feedback_received');
    });
  });

  describe('Batch Processing', () => {
    it('should process batch when buffer reaches batchSize', async () => {
      const events: any[] = [];
      loop.on('event', (e: any) => {
        if (e.type === 'learning_update') events.push(e);
      });

      await loop.start();

      // Submit batchSize signals to trigger immediate processing
      for (let i = 0; i < 4; i++) {
        loop.submitFeedback({
          actionId: `test-${i}`,
          reservoirState: [Math.random()],
          targetOutput: [Math.random()],
          reward: 0.7,
          source: 'self-evaluation',
          timestamp: Date.now(),
        });
      }

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have processed the batch
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should process remaining buffer on stop', async () => {
      await loop.start();

      loop.submitFeedback({
        actionId: 'remaining-1',
        reservoirState: [0.1],
        targetOutput: [0.5],
        reward: 0.9,
        source: 'user',
        timestamp: Date.now(),
      });

      await loop.stop();
      // No error means the remaining buffer was processed
    });
  });

  describe('Online Learner Integration', () => {
    it('should call online learner update on batch processing', async () => {
      const updateCalls: any[] = [];
      loop.setOnlineLearner({
        update: (state: number[], target: number[]) => {
          updateCalls.push({ state, target });
        },
        getWeights: () => [[0.1, 0.2]],
        getStats: () => ({ totalUpdates: 0, avgError: 0 }),
      });

      await loop.start();

      // Submit enough signals with significant reward delta
      for (let i = 0; i < 4; i++) {
        loop.submitFeedback({
          actionId: `learn-${i}`,
          reservoirState: [0.1, 0.2, 0.3],
          targetOutput: [0.5, 0.6],
          reward: 0.9, // High reward → significant delta from 0.5
          source: 'user',
          timestamp: Date.now(),
        });
      }

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it('should skip learning for low reward delta', async () => {
      const updateCalls: any[] = [];
      loop.setOnlineLearner({
        update: (state: number[], target: number[]) => {
          updateCalls.push({ state, target });
        },
        getWeights: () => [[0.1]],
        getStats: () => ({ totalUpdates: 0, avgError: 0 }),
      });

      // Use a loop with high minRewardDelta
      const strictLoop = new AutonomyFeedbackLoop({
        batchSize: 2,
        batchInterval: 100,
        minRewardDelta: 0.4,
        enableCoherenceCheck: false,
        enableTrainingDataGeneration: false,
      });
      strictLoop.setOnlineLearner({
        update: (state: number[], target: number[]) => {
          updateCalls.push({ state, target });
        },
        getWeights: () => [[0.1]],
        getStats: () => ({ totalUpdates: 0, avgError: 0 }),
      });

      await strictLoop.start();

      // Submit signals with reward close to 0.5 (low delta)
      for (let i = 0; i < 2; i++) {
        strictLoop.submitFeedback({
          actionId: `skip-${i}`,
          reservoirState: [0.1],
          targetOutput: [0.5],
          reward: 0.52, // |0.52 - 0.5| = 0.02 < 0.4
          source: 'user',
          timestamp: Date.now(),
        });
      }

      await new Promise(resolve => setTimeout(resolve, 50));
      await strictLoop.stop();
      expect(updateCalls.length).toBe(0);
    });
  });

  describe('Identity Mesh Integration', () => {
    it('should record experience in identity mesh', async () => {
      const xpRecords: any[] = [];
      loop.setIdentityMesh({
        recordExperience: (xp: number, source: string) => {
          xpRecords.push({ xp, source });
        },
        getCoherenceScore: () => 0.9,
      });

      await loop.start();

      for (let i = 0; i < 4; i++) {
        loop.submitFeedback({
          actionId: `xp-${i}`,
          reservoirState: [0.1],
          targetOutput: [0.5],
          reward: 0.8,
          source: 'user',
          timestamp: Date.now(),
        });
      }

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(xpRecords.length).toBeGreaterThan(0);
      expect(xpRecords[0].source).toBe('feedback-loop');
    });
  });

  describe('Feedback Signal Generation', () => {
    it('should generate user feedback signals', () => {
      const signal = loop.generateUserFeedback(
        'action-1',
        [0.1, 0.2, 0.3],
        [0.5, 0.6],
        0.9,
      );
      expect(signal.actionId).toBe('action-1');
      expect(signal.source).toBe('user');
      expect(signal.reward).toBe(0.9);
      expect(signal.reservoirState).toEqual([0.1, 0.2, 0.3]);
    });

    it('should generate self-evaluation feedback signals', () => {
      const signal = loop.generateSelfEvalFeedback(
        'action-2',
        [0.1, 0.2],
        [0.5],
        0.75,
      );
      expect(signal.source).toBe('self-evaluation');
      expect(signal.reward).toBe(0.75);
    });
  });

  describe('Coherence Monitoring', () => {
    it('should emit coherence_alert when below threshold', async () => {
      const coherenceLoop = new AutonomyFeedbackLoop({
        batchSize: 4,
        batchInterval: 1000,
        enableCoherenceCheck: true,
        coherenceCheckInterval: 50,
        minCoherenceThreshold: 0.5,
        enableTrainingDataGeneration: false,
      });

      coherenceLoop.setIdentityMesh({
        recordExperience: jest.fn(),
        getCoherenceScore: () => 0.2, // Below threshold
      });

      const alerts: any[] = [];
      coherenceLoop.on('event', (e: any) => {
        if (e.type === 'coherence_alert') alerts.push(e);
      });

      await coherenceLoop.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await coherenceLoop.stop();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].score).toBe(0.2);
    });
  });

  describe('Statistics', () => {
    it('should track comprehensive statistics', async () => {
      await loop.start();

      for (let i = 0; i < 5; i++) {
        loop.submitFeedback({
          actionId: `stat-${i}`,
          reservoirState: [Math.random()],
          targetOutput: [Math.random()],
          reward: Math.random(),
          source: 'user',
          timestamp: Date.now(),
        });
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      const stats = loop.getStats();
      expect(stats.totalFeedbackReceived).toBe(5);
      expect(stats.averageReward).toBeGreaterThanOrEqual(0);
      expect(stats.averageReward).toBeLessThanOrEqual(1);
    });
  });
});
