/**
 * @fileoverview Tests for AutonomyLifecycleCoordinator
 *
 * Validates the developmental lifecycle that evolves DTE toward
 * true autonomy through the inverted mirror pattern:
 * PERCEPTION → MODELING → REFLECTION → MIRRORING → ENACTION
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  AutonomyLifecycleCoordinator,
  createAutonomyLifecycleCoordinator,
  AutonomyPhase,
} from '../autonomy-lifecycle.js';
import { CognitiveTickProcessor } from '../cognitive-tick-processor.js';
import { ProactivePhase } from '../proactive-loop.js';

describe('AutonomyLifecycleCoordinator', () => {
  let coordinator: AutonomyLifecycleCoordinator;
  let processor: CognitiveTickProcessor;

  beforeEach(() => {
    processor = new CognitiveTickProcessor({
      maxEpisodicMemories: 100,
      maxActiveGoals: 10,
      selfImageInterval: 3,
    });
    coordinator = new AutonomyLifecycleCoordinator(
      { coherenceThreshold: 0.6, selfAssessmentInterval: 5 },
      processor,
    );
  });

  afterEach(() => {
    coordinator.stop();
    coordinator.removeAllListeners();
    processor.removeAllListeners();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      expect(coordinator.getCycleCount()).toBe(0);
      expect(coordinator.getCurrentPhase()).toBe(AutonomyPhase.PERCEPTION);
      expect(coordinator.isRunning()).toBe(false);
    });

    it('should create via factory function', () => {
      const c = createAutonomyLifecycleCoordinator({}, processor);
      expect(c.getCycleCount()).toBe(0);
      c.removeAllListeners();
    });

    it('should have a valid default virtual agent', () => {
      const va = coordinator.getVirtualAgent();
      expect(va.selfStory).toContain('Deep Tree Echo');
      expect(va.selfImage.perceivedStrengths.length).toBeGreaterThan(0);
      expect(va.perceivedCapabilities).toContain('conversation');
    });

    it('should have a valid default virtual arena (world-view)', () => {
      const vo = coordinator.getVirtualArena();
      expect(vo.situationalAwareness.estimatedCoherence).toBeGreaterThan(0);
      expect(vo.perceivedRules.length).toBeGreaterThan(0);
      expect(vo.worldTheory).toBeTruthy();
    });
  });

  describe('Lifecycle Control', () => {
    it('should start and stop', () => {
      const startHandler = jest.fn();
      const stopHandler = jest.fn();
      coordinator.on('started', startHandler);
      coordinator.on('stopped', stopHandler);

      coordinator.start();
      expect(coordinator.isRunning()).toBe(true);
      expect(startHandler).toHaveBeenCalledTimes(1);

      coordinator.stop();
      expect(coordinator.isRunning()).toBe(false);
      expect(stopHandler).toHaveBeenCalledTimes(1);
    });

    it('should not start twice', () => {
      const startHandler = jest.fn();
      coordinator.on('started', startHandler);

      coordinator.start();
      coordinator.start();
      expect(startHandler).toHaveBeenCalledTimes(1);
    });

    it('should not stop if not running', () => {
      const stopHandler = jest.fn();
      coordinator.on('stopped', stopHandler);
      coordinator.stop();
      expect(stopHandler).not.toHaveBeenCalled();
    });
  });

  describe('AutonomyPhase Enum', () => {
    it('should have all five phases', () => {
      expect(Object.values(AutonomyPhase)).toEqual([
        'perception',
        'modeling',
        'reflection',
        'mirroring',
        'enaction',
      ]);
    });
  });

  describe('Single Phase Execution', () => {
    it('should execute PERCEPTION phase', async () => {
      const result = await coordinator.executePhase(AutonomyPhase.PERCEPTION);
      expect(result.phase).toBe('perception');
      expect(result.coherenceAfter).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should execute MODELING phase', async () => {
      const result = await coordinator.executePhase(AutonomyPhase.MODELING);
      expect(result.phase).toBe('modeling');
    });

    it('should execute REFLECTION phase', async () => {
      // Seed some self-image data
      for (let i = 0; i < 5; i++) {
        await processor.processTick(ProactivePhase.PERCEIVE, i);
      }
      const result = await coordinator.executePhase(AutonomyPhase.REFLECTION);
      expect(result.phase).toBe('reflection');
    });

    it('should execute MIRRORING phase (inverted mirror)', async () => {
      const result = await coordinator.executePhase(AutonomyPhase.MIRRORING);
      expect(result.phase).toBe('mirroring');
      expect(result.stateChanges).toHaveProperty('estimatedDrift');
    });

    it('should execute ENACTION phase', async () => {
      const result = await coordinator.executePhase(AutonomyPhase.ENACTION);
      expect(result.phase).toBe('enaction');
    });

    it('should emit phase:start and phase:complete events', async () => {
      const startHandler = jest.fn();
      const completeHandler = jest.fn();
      coordinator.on('phase:start', startHandler);
      coordinator.on('phase:complete', completeHandler);

      await coordinator.executePhase(AutonomyPhase.PERCEPTION);

      expect(startHandler).toHaveBeenCalledWith(expect.objectContaining({
        phase: AutonomyPhase.PERCEPTION,
      }));
      expect(completeHandler).toHaveBeenCalledWith(expect.objectContaining({
        phase: AutonomyPhase.PERCEPTION,
      }));
    });

    it('should update currentPhase during execution', async () => {
      await coordinator.executePhase(AutonomyPhase.MODELING);
      expect(coordinator.getCurrentPhase()).toBe(AutonomyPhase.MODELING);
    });
  });

  describe('Full Cycle Execution', () => {
    it('should run a complete 5-phase cycle', async () => {
      const cycleStartHandler = jest.fn();
      const cycleCompleteHandler = jest.fn();
      coordinator.on('cycle:start', cycleStartHandler);
      coordinator.on('cycle:complete', cycleCompleteHandler);

      const results = await coordinator.runCycle();

      expect(results.length).toBe(5);
      expect(results.map(r => r.phase)).toEqual([
        'perception', 'modeling', 'reflection', 'mirroring', 'enaction',
      ]);
      expect(coordinator.getCycleCount()).toBe(1);
      expect(cycleStartHandler).toHaveBeenCalledWith({ cycleId: 1 });
      expect(cycleCompleteHandler).toHaveBeenCalledWith(expect.objectContaining({
        cycleId: 1,
        results: expect.any(Array),
      }));
    });

    it('should increment cycle count on each run', async () => {
      await coordinator.runCycle();
      await coordinator.runCycle();
      await coordinator.runCycle();
      expect(coordinator.getCycleCount()).toBe(3);
    });

    it('should track coherence history', async () => {
      await coordinator.runCycle();
      const history = coordinator.getCoherenceHistory();
      expect(history.length).toBe(5); // 5 phases per cycle
    });
  });

  describe('Coherence Monitoring', () => {
    it('should emit coherence:low when below threshold', async () => {
      const handler = jest.fn();
      coordinator.on('coherence:low', handler);

      // Create a coordinator with very high threshold
      const strictCoordinator = new AutonomyLifecycleCoordinator(
        { coherenceThreshold: 0.99 },
        processor,
      );
      strictCoordinator.on('coherence:low', handler);

      await strictCoordinator.runCycle();
      expect(handler).toHaveBeenCalled();
      strictCoordinator.removeAllListeners();
    });
  });

  describe('Self-Assessment', () => {
    it('should perform self-assessment at configured interval', async () => {
      const handler = jest.fn();
      coordinator.on('self_assessment', handler);

      // selfAssessmentInterval is 5
      for (let i = 0; i < 5; i++) {
        await coordinator.runCycle();
      }

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        cycleCount: 5,
        averageCoherence: expect.any(Number),
      }));
    });
  });

  describe('Inverted Mirror Pattern', () => {
    it('should update virtual arena drift during mirroring', async () => {
      const initialDrift = coordinator.getVirtualArena().divergenceMetrics.estimatedDrift;
      await coordinator.executePhase(AutonomyPhase.MIRRORING);
      const va = coordinator.getVirtualArena();
      expect(va.divergenceMetrics.lastSyncTime).toBeGreaterThan(0);
      expect(typeof va.divergenceMetrics.estimatedDrift).toBe('number');
    });

    it('should update virtual agent during reflection', async () => {
      // Seed self-image data
      for (let i = 0; i < 5; i++) {
        await processor.processTick(ProactivePhase.PERCEIVE, i);
      }
      await coordinator.executePhase(AutonomyPhase.REFLECTION);
      const va = coordinator.getVirtualAgent();
      expect(va.selfAwareness.lastReflection).toBeGreaterThan(0);
    });

    it('should update current goals during enaction', async () => {
      // Create some goals
      processor.injectPercept({
        id: 'test_p1',
        source: 'message',
        content: 'Important task',
        salience: 0.9,
        emotionalValence: 0,
        timestamp: Date.now(),
        metadata: {},
      });
      await processor.processTick(ProactivePhase.PERCEIVE, 0);
      await processor.processTick(ProactivePhase.PLAN, 12);

      await coordinator.executePhase(AutonomyPhase.ENACTION);
      // Virtual agent should reflect current goals
      const va = coordinator.getVirtualAgent();
      expect(Array.isArray(va.currentGoals)).toBe(true);
    });
  });

  describe('Automatic Cycling', () => {
    it('should auto-cycle when cycleIntervalMs > 0', async () => {
      const autoCoordinator = new AutonomyLifecycleCoordinator(
        { cycleIntervalMs: 50 },
        processor,
      );
      const handler = jest.fn();
      autoCoordinator.on('cycle:complete', handler);

      autoCoordinator.start();

      // Wait for at least one cycle
      await new Promise(resolve => setTimeout(resolve, 120));

      autoCoordinator.stop();
      expect(handler).toHaveBeenCalled();
      autoCoordinator.removeAllListeners();
    });
  });

  describe('Configuration', () => {
    it('should return config copy', () => {
      const config = coordinator.getConfig();
      expect(config.coherenceThreshold).toBe(0.6);
      expect(config.selfAssessmentInterval).toBe(5);
    });
  });
});
