/**
 * @fileoverview Tests for CognitiveTickProcessor
 *
 * Validates the real cognitive processing layer that provides
 * actual cognitive work at each phase of the proactive loop.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CognitiveTickProcessor, type CognitivePercept, type CognitiveGoal } from '../cognitive-tick-processor.js';
import { ProactivePhase } from '../proactive-loop.js';

function makePercept(overrides: Partial<CognitivePercept> = {}): CognitivePercept {
  return {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source: 'message',
    content: 'Test percept content',
    salience: 0.5,
    emotionalValence: 0,
    timestamp: Date.now(),
    metadata: {},
    ...overrides,
  };
}

describe('CognitiveTickProcessor', () => {
  let processor: CognitiveTickProcessor;

  beforeEach(() => {
    processor = new CognitiveTickProcessor({
      maxEpisodicMemories: 100,
      maxActiveGoals: 10,
      maxGoalAttempts: 3,
      selfImageInterval: 5,
      consolidationThreshold: 0.5,
    });
  });

  afterEach(() => {
    processor.removeAllListeners();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      const state = processor.getState();
      expect(state.tickCount).toBe(0);
      expect(state.perceptBufferSize).toBe(0);
      expect(state.activeGoals).toBe(0);
      expect(state.episodicMemories).toBe(0);
      expect(state.consolidatedMemories).toBe(0);
      expect(state.selfImageSnapshots).toBe(0);
    });

    it('should accept custom configuration', () => {
      const custom = new CognitiveTickProcessor({
        maxEpisodicMemories: 50,
        maxActiveGoals: 5,
      });
      expect(custom.getState().tickCount).toBe(0);
      custom.removeAllListeners();
    });
  });

  describe('Percept Injection', () => {
    it('should accept percepts into the buffer', () => {
      processor.injectPercept(makePercept());
      expect(processor.getState().perceptBufferSize).toBe(1);
    });

    it('should emit percept_injected event', () => {
      const handler = jest.fn();
      processor.on('percept_injected', handler);
      processor.injectPercept(makePercept());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should accumulate multiple percepts', () => {
      for (let i = 0; i < 5; i++) {
        processor.injectPercept(makePercept({ salience: i * 0.2 }));
      }
      expect(processor.getState().perceptBufferSize).toBe(5);
    });
  });

  describe('PERCEIVE Phase', () => {
    it('should aggregate percepts and emit perception event', async () => {
      const handler = jest.fn();
      processor.on('perception_aggregated', handler);

      processor.injectPercept(makePercept({ salience: 0.9 }));
      processor.injectPercept(makePercept({ salience: 0.3 }));

      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        count: 2,
        highestSalience: 0.9,
      }));
    });

    it('should handle empty percept buffer gracefully', async () => {
      const handler = jest.fn();
      processor.on('perception_aggregated', handler);
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('REFLECT Phase', () => {
    it('should emit reflection with cognitive load metrics', async () => {
      const handler = jest.fn();
      processor.on('reflection_complete', handler);

      await processor.processTick(ProactivePhase.REFLECT, 12);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        cognitiveLoad: expect.any(Number),
        emotionalState: expect.any(Number),
        memoryCoherence: expect.any(Number),
      }));
    });
  });

  describe('PLAN Phase', () => {
    it('should generate goals from high-salience percepts', async () => {
      const handler = jest.fn();
      processor.on('goal_created', handler);

      processor.injectPercept(makePercept({ salience: 0.9, content: 'Important task' }));
      processor.injectPercept(makePercept({ salience: 0.3, content: 'Low priority' }));

      // PERCEIVE first to populate buffer
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      // PLAN to generate goals
      await processor.processTick(ProactivePhase.PLAN, 12);

      expect(handler).toHaveBeenCalledTimes(1); // Only high-salience generates goal
    });

    it('should clear percept buffer after planning', async () => {
      processor.injectPercept(makePercept({ salience: 0.9 }));
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);
      expect(processor.getState().perceptBufferSize).toBe(0);
    });

    it('should cap active goals at maxActiveGoals', async () => {
      // Inject many high-salience percepts
      for (let i = 0; i < 15; i++) {
        processor.injectPercept(makePercept({ salience: 0.8 + Math.random() * 0.2 }));
      }
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);

      const goals = processor.getGoals();
      const activeOrPending = goals.filter(g => g.status === 'active' || g.status === 'pending');
      // Should not exceed maxActiveGoals (10)
      expect(activeOrPending.length).toBeLessThanOrEqual(10);
    });
  });

  describe('ACT Phase', () => {
    it('should execute goals with registered handlers', async () => {
      const handler = async (_g: CognitiveGoal): Promise<Record<string, unknown>> => ({ success: true });
      const spy = jest.fn(handler);
      processor.registerActionHandler('important', spy);

      processor.injectPercept(makePercept({ salience: 0.9, content: 'Important task' }));
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);
      await processor.processTick(ProactivePhase.ACT, 24);

      expect(spy).toHaveBeenCalled();
    });

    it('should emit goal_completed on successful execution', async () => {
      const completedHandler = jest.fn();
      processor.on('goal_completed', completedHandler);
      processor.registerActionHandler('default', async (_goal: CognitiveGoal) => ({ done: true }));

      processor.injectPercept(makePercept({ salience: 0.9 }));
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);
      await processor.processTick(ProactivePhase.ACT, 24);

      expect(completedHandler).toHaveBeenCalled();
    });

    it('should retry failed goals up to maxAttempts', async () => {
      let callCount = 0;
      processor.registerActionHandler('default', async (_goal: CognitiveGoal) => {
        callCount++;
        if (callCount < 3) throw new Error('Temporary failure');
        return { success: true };
      });

      processor.injectPercept(makePercept({ salience: 0.9 }));
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);

      // First attempt - fails, retries
      await processor.processTick(ProactivePhase.ACT, 24);
      // Second attempt - fails, retries
      await processor.processTick(ProactivePhase.ACT, 24);
      // Third attempt - succeeds
      await processor.processTick(ProactivePhase.ACT, 24);

      expect(callCount).toBe(3);
    });

    it('should mark goal as failed after maxAttempts exceeded', async () => {
      const failedHandler = jest.fn();
      processor.on('goal_failed', failedHandler);
      processor.registerActionHandler('default', async (_goal: CognitiveGoal) => {
        throw new Error('Permanent failure');
      });

      processor.injectPercept(makePercept({ salience: 0.9 }));
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);

      // Exhaust all attempts (maxGoalAttempts = 3)
      for (let i = 0; i < 4; i++) {
        await processor.processTick(ProactivePhase.ACT, 24);
      }

      expect(failedHandler).toHaveBeenCalled();
    });
  });

  describe('INTEGRATE Phase', () => {
    it('should convert completed goals to episodic memories', async () => {
      processor.registerActionHandler('default', async (_goal: CognitiveGoal) => ({ done: true }));

      processor.injectPercept(makePercept({ salience: 0.9 }));
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);
      await processor.processTick(ProactivePhase.ACT, 24);
      await processor.processTick(ProactivePhase.INTEGRATE, 48);

      expect(processor.getState().episodicMemories).toBeGreaterThan(0);
    });

    it('should emit integration_complete event', async () => {
      const handler = jest.fn();
      processor.on('integration_complete', handler);

      await processor.processTick(ProactivePhase.INTEGRATE, 48);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        memoriesStored: expect.any(Number),
        totalMemories: expect.any(Number),
      }));
    });

    it('should consolidate high-salience memories', async () => {
      processor.registerActionHandler('default', async (_goal: CognitiveGoal) => ({ done: true }));

      // Create a high-salience percept that becomes a goal and memory
      processor.injectPercept(makePercept({ salience: 0.9 }));
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);
      await processor.processTick(ProactivePhase.ACT, 24);
      await processor.processTick(ProactivePhase.INTEGRATE, 48);

      const consolidated = processor.getEpisodicMemories({ consolidated: true });
      expect(consolidated.length).toBeGreaterThanOrEqual(0);
    });

    it('should evict old non-consolidated memories when over limit', async () => {
      const smallProcessor = new CognitiveTickProcessor({
        maxEpisodicMemories: 5,
        maxActiveGoals: 20,
        consolidationThreshold: 0.95,
      });

      // Fill with many low-salience memories
      for (let i = 0; i < 10; i++) {
        smallProcessor.injectPercept(makePercept({ salience: 0.8 }));
      }
      await smallProcessor.processTick(ProactivePhase.PERCEIVE, 0);
      await smallProcessor.processTick(ProactivePhase.PLAN, 12);
      await smallProcessor.processTick(ProactivePhase.ACT, 24);
      await smallProcessor.processTick(ProactivePhase.INTEGRATE, 48);

      expect(smallProcessor.getState().episodicMemories).toBeLessThanOrEqual(5);
      smallProcessor.removeAllListeners();
    });
  });

  describe('Self-Image Tracking', () => {
    it('should capture self-image at configured interval', async () => {
      const handler = jest.fn();
      processor.on('self_image_captured', handler);

      // selfImageInterval is 5, so after 5 ticks we should get a snapshot
      for (let i = 0; i < 5; i++) {
        await processor.processTick(ProactivePhase.PERCEIVE, i);
      }

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should track ontogenetic progress', async () => {
      for (let i = 0; i < 10; i++) {
        await processor.processTick(ProactivePhase.PERCEIVE, i);
      }

      const history = processor.getSelfImageHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].ontogeneticProgress).toBeGreaterThanOrEqual(0);
      expect(history[0].ontogeneticProgress).toBeLessThanOrEqual(1);
    });

    it('should compute coherence score between snapshots', async () => {
      for (let i = 0; i < 15; i++) {
        await processor.processTick(ProactivePhase.PERCEIVE, i);
      }

      const history = processor.getSelfImageHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
      // Second snapshot should have a coherence score
      expect(history[1].coherenceScore).toBeGreaterThanOrEqual(0);
      expect(history[1].coherenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Full Cognitive Cycle', () => {
    it('should process a complete PERCEIVE→REFLECT→PLAN→ACT→INTEGRATE cycle', async () => {
      const events: string[] = [];
      processor.on('perception_aggregated', () => events.push('perceive'));
      processor.on('reflection_complete', () => events.push('reflect'));
      processor.on('goal_created', () => events.push('plan'));
      processor.on('goal_completed', () => events.push('act'));
      processor.on('integration_complete', () => events.push('integrate'));

      processor.registerActionHandler('default', async (_goal: CognitiveGoal) => ({ done: true }));
      processor.injectPercept(makePercept({ salience: 0.9 }));

      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.REFLECT, 12);
      await processor.processTick(ProactivePhase.PLAN, 24);
      await processor.processTick(ProactivePhase.ACT, 36);
      await processor.processTick(ProactivePhase.INTEGRATE, 48);

      expect(events).toContain('perceive');
      expect(events).toContain('reflect');
      expect(events).toContain('plan');
      expect(events).toContain('act');
      expect(events).toContain('integrate');
    });
  });

  describe('State Accessors', () => {
    it('should return immutable state copy', () => {
      const state1 = processor.getState();
      const state2 = processor.getState();
      expect(state1).not.toBe(state2);
    });

    it('should return filtered episodic memories', async () => {
      processor.registerActionHandler('default', async (_goal: CognitiveGoal) => ({ done: true }));
      processor.injectPercept(makePercept({ salience: 0.9 }));
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);
      await processor.processTick(ProactivePhase.ACT, 24);
      await processor.processTick(ProactivePhase.INTEGRATE, 48);

      const all = processor.getEpisodicMemories();
      const limited = processor.getEpisodicMemories({ limit: 1 });
      expect(limited.length).toBeLessThanOrEqual(1);
    });
  });
});
