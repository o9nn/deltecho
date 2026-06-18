/**
 * Rigorous E2E Tests for EchoAgentLoop
 *
 * Tests the unified autonomous cognitive event loop:
 * - 60-step grand cycle synchronization
 * - Thread multiplexing (4-particular permutations)
 * - Triad cycling (MP1/MP2 complementary triads)
 * - Dove9 and Sys6 sub-cycle alignment
 * - Feed-forward/feed-back balance
 * - Autonomy score calculation
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EchoAgentLoop } from '../echo-agent-loop.js';
import { ProactivePhase } from '../proactive-loop.js';
import type { EnvironmentStimulus } from '../proactive-loop.js';

describe('EchoAgentLoop', () => {
  let loop: EchoAgentLoop;

  beforeEach(() => {
    loop = new EchoAgentLoop({
      stepDurationMs: 10, // Fast for testing
      enableThreadMultiplexing: true,
      enableTriadCycling: true,
      enableTelemetry: true,
      maxConcurrentThreads: 4,
      proactiveConfig: {
        cycleIntervalMs: 120, // 12 steps × 10ms
        maxStimuliPerCycle: 5,
        idleTimeoutMs: 500,
      },
    });
  });

  afterEach(async () => {
    await loop.stop();
  });

  describe('Lifecycle', () => {
    it('should start and stop cleanly', async () => {
      expect(loop.isRunning()).toBe(false);
      await loop.start();
      expect(loop.isRunning()).toBe(true);
      await loop.stop();
      expect(loop.isRunning()).toBe(false);
    });

    it('should not start twice', async () => {
      await loop.start();
      await loop.start(); // Should warn
      expect(loop.isRunning()).toBe(true);
    });

    it('should handle stop when not running', async () => {
      await loop.stop();
      expect(loop.isRunning()).toBe(false);
    });
  });

  describe('Grand Cycle', () => {
    it('should advance through 60-step grand cycle', async () => {
      const steps: number[] = [];

      loop.on('tick', (event: any) => {
        steps.push(event.state.step);
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      expect(steps.length).toBeGreaterThan(10);
      // Steps should cycle 0-59
      for (const step of steps) {
        expect(step).toBeGreaterThanOrEqual(0);
        expect(step).toBeLessThan(60);
      }
    });

    it('should emit grand_cycle_complete when cycle wraps', async () => {
      let grandCycleComplete = false;

      loop.on('grand_cycle_complete', () => {
        grandCycleComplete = true;
      });

      await loop.start();
      // Wait for at least 60 steps × 10ms = 600ms + buffer
      await new Promise(resolve => setTimeout(resolve, 1200));
      await loop.stop();

      expect(grandCycleComplete).toBe(true);
    });

    it('should track Dove9 sub-cycle (mod 12)', async () => {
      const dove9Steps: number[] = [];

      loop.on('tick', (event: any) => {
        dove9Steps.push(event.state.dove9Step);
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      for (const step of dove9Steps) {
        expect(step).toBeGreaterThanOrEqual(0);
        expect(step).toBeLessThan(12);
      }
    });

    it('should track Sys6 sub-cycle (mod 30)', async () => {
      const sys6Steps: number[] = [];

      loop.on('tick', (event: any) => {
        sys6Steps.push(event.state.sys6Step);
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      for (const step of sys6Steps) {
        expect(step).toBeGreaterThanOrEqual(0);
        expect(step).toBeLessThan(30);
      }
    });
  });

  describe('Dove9 Synchronization', () => {
    it('should emit dove9_sync at triadic convergence points', async () => {
      let dove9Syncs = 0;

      loop.on('dove9_sync', () => {
        dove9Syncs++;
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      // Should have multiple Dove9 syncs (every 3 steps)
      expect(dove9Syncs).toBeGreaterThan(0);
      const metrics = loop.getMetrics();
      expect(metrics.dove9Syncs).toBe(dove9Syncs);
    });
  });

  describe('Sys6 Synchronization', () => {
    it('should emit sys6_sync at phase transitions', async () => {
      let sys6Syncs = 0;

      loop.on('sys6_sync', () => {
        sys6Syncs++;
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      expect(sys6Syncs).toBeGreaterThan(0);
      const metrics = loop.getMetrics();
      expect(metrics.sys6Syncs).toBe(sys6Syncs);
    });
  });

  describe('Thread Multiplexing', () => {
    it('should cycle through 6 thread permutations', async () => {
      const permutations: string[] = [];

      loop.on('thread_switch', (event: any) => {
        permutations.push(event.permutation.id);
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      // Should have switched threads multiple times
      expect(permutations.length).toBeGreaterThan(0);
      const metrics = loop.getMetrics();
      expect(metrics.threadSwitches).toBe(permutations.length);
    });

    it('should use valid permutation IDs', async () => {
      const validIds = ['P12', 'P13', 'P14', 'P23', 'P24', 'P34'];
      const seenIds: string[] = [];

      loop.on('thread_switch', (event: any) => {
        seenIds.push(event.permutation.id);
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      for (const id of seenIds) {
        expect(validIds).toContain(id);
      }
    });
  });

  describe('Triad Cycling', () => {
    it('should alternate between MP1 and MP2 triads', async () => {
      const triads: string[] = [];

      loop.on('triad_convergence', (event: any) => {
        triads.push(event.activeTriad);
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      expect(triads.length).toBeGreaterThan(0);
      // Should contain both MP1 and MP2
      if (triads.length >= 2) {
        expect(triads).toContain('MP1');
        expect(triads).toContain('MP2');
      }
    });

    it('should track triad convergences in metrics', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      const metrics = loop.getMetrics();
      expect(metrics.triadConvergences).toBeGreaterThan(0);
    });
  });

  describe('Feed-Forward / Feed-Back Balance', () => {
    it('should track both feed-forward and feed-back cycles', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      const metrics = loop.getMetrics();
      expect(metrics.feedForwardCycles).toBeGreaterThan(0);
      expect(metrics.feedBackCycles).toBeGreaterThan(0);
    });

    it('should maintain approximate 1:1 balance', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      const metrics = loop.getMetrics();
      const ratio = metrics.feedForwardCycles / (metrics.feedBackCycles || 1);
      // Should be approximately 1:1 (even/odd steps)
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.2);
    });
  });

  describe('Proactive Phase Mapping', () => {
    it('should map grand cycle steps to proactive phases', async () => {
      const phases: ProactivePhase[] = [];

      loop.on('tick', (event: any) => {
        phases.push(event.state.proactivePhase);
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 700));
      await loop.stop();

      // Should see all 5 phases over a complete grand cycle
      const uniquePhases = new Set(phases);
      expect(uniquePhases.size).toBeGreaterThanOrEqual(3); // At minimum 3 phases in partial cycle
    });
  });

  describe('Stimulus Injection', () => {
    it('should forward stimuli to proactive loop', async () => {
      const stimulus: EnvironmentStimulus = {
        type: 'message',
        source: 'test',
        priority: 8,
        data: { content: 'test' },
        timestamp: Date.now(),
      };

      let proactiveEvent = false;
      loop.on('proactive_event', () => {
        proactiveEvent = true;
      });

      loop.injectStimulus(stimulus);
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      // The proactive loop should have processed the stimulus
      expect(proactiveEvent).toBe(true);
    });
  });

  describe('Metrics', () => {
    it('should calculate autonomy score', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 1200));
      await loop.stop();

      const metrics = loop.getMetrics();
      expect(metrics.autonomyScore).toBeGreaterThanOrEqual(0);
      expect(metrics.autonomyScore).toBeLessThanOrEqual(1);
    });

    it('should track total steps', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      const metrics = loop.getMetrics();
      expect(metrics.totalSteps).toBeGreaterThan(0);
    });

    it('should calculate average step time', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      const metrics = loop.getMetrics();
      expect(metrics.averageStepTime).toBeGreaterThanOrEqual(0);
    });

    it('should return immutable metrics copy', () => {
      const m1 = loop.getMetrics();
      const m2 = loop.getMetrics();
      expect(m1).not.toBe(m2);
      expect(m1).toEqual(m2);
    });
  });

  describe('Grand Cycle State', () => {
    it('should return current state', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = loop.getGrandCycleState();
      expect(state.step).toBeGreaterThanOrEqual(0);
      expect(state.step).toBeLessThan(60);
      expect(state.dove9Step).toBeGreaterThanOrEqual(0);
      expect(state.dove9Step).toBeLessThan(12);
      expect(state.sys6Step).toBeGreaterThanOrEqual(0);
      expect(state.sys6Step).toBeLessThan(30);
      expect(state.timestamp).toBeGreaterThan(0);

      await loop.stop();
    });

    it('should return immutable state copy', () => {
      const s1 = loop.getGrandCycleState();
      const s2 = loop.getGrandCycleState();
      expect(s1).not.toBe(s2);
      expect(s1).toEqual(s2);
    });
  });

  describe('Proactive Loop Access', () => {
    it('should expose proactive loop', () => {
      const pl = loop.getProactiveLoop();
      expect(pl).toBeDefined();
    });

    it('should allow registering perception handlers', async () => {
      let called = false;

      loop.registerPerceptionHandler(async () => {
        called = true;
        return [];
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      expect(called).toBe(true);
    });
  });
});


// ============================================================
// Enhanced Tests for Cognitive Processing Integration
// ============================================================

describe('EchoAgentLoop - Cognitive Processing', () => {
  let loop: EchoAgentLoop;

  beforeEach(() => {
    loop = new EchoAgentLoop({
      stepDurationMs: 10,
      enableThreadMultiplexing: true,
      enableTriadCycling: true,
      enableCosmicOrder: true,
      enableTelemetry: true,
      enableCognitiveProcessing: true,
      maxConcurrentThreads: 4,
      proactiveConfig: {
        cycleIntervalMs: 120,
        maxStimuliPerCycle: 5,
        idleTimeoutMs: 500,
      },
      cognitiveConfig: {
        maxEpisodicMemories: 50,
        maxActiveGoals: 10,
        selfImageInterval: 5,
      },
    });
  });

  afterEach(async () => {
    await loop.stop();
  });

  describe('Cognitive Processor Access', () => {
    it('should expose cognitive processor when enabled', () => {
      const processor = loop.getCognitiveProcessor();
      expect(processor).toBeDefined();
    });

    it('should not expose cognitive processor when disabled', () => {
      const noCogLoop = new EchoAgentLoop({
        stepDurationMs: 10,
        enableCognitiveProcessing: false,
      });
      expect(noCogLoop.getCognitiveProcessor()).toBeUndefined();
    });
  });

  describe('Cognitive Event Emission', () => {
    it('should emit cognitive_percept when stimulus injected', () => {
      const handler = jest.fn();
      loop.on('cognitive_percept', handler);

      loop.injectStimulus({
        type: 'message',
        source: 'test',
        priority: 0.8,
        data: { text: 'Hello' },
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit cognitive events during running', async () => {
      const events: string[] = [];
      loop.on('cognitive_percept', () => events.push('percept'));
      loop.on('cognitive_self_image', () => events.push('self_image'));

      loop.injectStimulus({
        type: 'message',
        source: 'test',
        priority: 0.9,
        data: { text: 'Important' },
        timestamp: Date.now(),
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 300));
      await loop.stop();

      expect(events).toContain('percept');
    });
  });

  describe('Cognitive Action Handler Registration', () => {
    it('should register cognitive action handlers', () => {
      loop.registerCognitiveActionHandler('test_action', async () => ({ done: true }));

      const processor = loop.getCognitiveProcessor();
      expect(processor).toBeDefined();
    });
  });

  describe('Cognitive State in Grand Cycle', () => {
    it('should include cognitive state in grand cycle state after running', async () => {
      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      const state = loop.getGrandCycleState();
      expect(state.cognitiveState).toBeDefined();
      expect(state.cognitiveState?.tickCount).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Metrics', () => {
    it('should track cognitive metrics', async () => {
      loop.injectStimulus({
        type: 'message',
        source: 'test',
        priority: 0.9,
        data: { text: 'Test' },
        timestamp: Date.now(),
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      await loop.stop();

      const metrics = loop.getMetrics();
      expect(metrics.cognitivePercepts).toBeGreaterThan(0);
      expect(typeof metrics.cognitiveGoalsCompleted).toBe('number');
      expect(typeof metrics.cognitiveGoalsFailed).toBe('number');
      expect(typeof metrics.memoryConsolidations).toBe('number');
    });
  });

  describe('Stimulus-to-Percept Bridge', () => {
    it('should convert environment stimuli to cognitive percepts', () => {
      const processor = loop.getCognitiveProcessor()!;
      expect(processor.getState().perceptBufferSize).toBe(0);

      loop.injectStimulus({
        type: 'message',
        source: 'user',
        priority: 0.7,
        data: { text: 'Hello world' },
        timestamp: Date.now(),
      });

      expect(processor.getState().perceptBufferSize).toBe(1);
    });

    it('should map stimulus types to percept sources', () => {
      const percepts: any[] = [];
      loop.on('cognitive_percept', (p) => percepts.push(p));

      loop.injectStimulus({
        type: 'message',
        source: 'user',
        priority: 0.5,
        data: {},
        timestamp: Date.now(),
      });

      loop.injectStimulus({
        type: 'schedule',
        source: 'cron',
        priority: 0.3,
        data: {},
        timestamp: Date.now(),
      });

      loop.injectStimulus({
        type: 'system',
        source: 'internal',
        priority: 0.1,
        data: {},
        timestamp: Date.now(),
      });

      expect(percepts[0].source).toBe('message');
      expect(percepts[1].source).toBe('schedule');
      expect(percepts[2].source).toBe('internal');
    });
  });
});
