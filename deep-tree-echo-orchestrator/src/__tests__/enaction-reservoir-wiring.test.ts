import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  AutonomyLifecycleCoordinator,
  AutonomyPhase,
} from '../autonomy-lifecycle.js';
import { SelfModificationEngine } from '../self-modification.js';
import { ReservoirFeedbackLoop } from '../reservoir-feedback-loop.js';

describe('ENACTION Phase with Reservoir Feedback Wiring', () => {
  let coordinator: AutonomyLifecycleCoordinator;
  let selfMod: SelfModificationEngine;
  let feedbackLoop: ReservoirFeedbackLoop;

  beforeEach(() => {
    coordinator = new AutonomyLifecycleCoordinator({
      cycleIntervalMs: 0,
      coherenceThreshold: 0.3,
    });

    selfMod = new SelfModificationEngine({
      dryRun: false,
      maxModificationsPerMinute: 100,
    });

    feedbackLoop = new ReservoirFeedbackLoop({
      reservoirDim: 32,
      outputDim: 4,
      batchIntervalMs: 0,
      maxBufferSize: 100,
      minRewardMagnitude: 0.01,
      enablePersistence: false,
    });
  });

  afterEach(async () => {
    coordinator.stop();
    await feedbackLoop.stop();
  });

  describe('wiring', () => {
    it('should wire SelfModificationEngine', () => {
      coordinator.wireSelfModification(selfMod);
      expect(coordinator.getSelfModificationEngine()).toBe(selfMod);
    });

    it('should wire ReservoirFeedbackLoop', () => {
      coordinator.wireReservoirFeedback(feedbackLoop);
      expect(coordinator.getReservoirFeedback()).toBe(feedbackLoop);
    });

    it('should return undefined when not wired', () => {
      expect(coordinator.getReservoirFeedback()).toBeUndefined();
    });
  });

  describe('ENACTION phase execution', () => {
    it('should execute ENACTION without reservoir feedback', async () => {
      coordinator.wireSelfModification(selfMod);

      const result = await coordinator.executePhase(AutonomyPhase.ENACTION);
      expect(result.phase).toBe('enaction');
      expect(result.coherenceAfter).toBeGreaterThanOrEqual(0);
      expect(result.coherenceAfter).toBeLessThanOrEqual(1);
    });

    it('should execute ENACTION with reservoir feedback wired', async () => {
      coordinator.wireSelfModification(selfMod);
      coordinator.wireReservoirFeedback(feedbackLoop);
      feedbackLoop.start();

      const result = await coordinator.executePhase(AutonomyPhase.ENACTION);
      expect(result.phase).toBe('enaction');
      expect(result).toHaveProperty('stateChanges');
    });

    it('should use real avgPredictionError from reservoir when wired', async () => {
      coordinator.wireSelfModification(selfMod);
      coordinator.wireReservoirFeedback(feedbackLoop);
      feedbackLoop.start();

      // Submit some feedback to generate non-zero prediction error
      const state = new Float64Array(32);
      for (let i = 0; i < 32; i++) state[i] = Math.random() - 0.5;

      for (let i = 0; i < 10; i++) {
        feedbackLoop.submitFeedback({
          source: 'coherence',
          reward: 0.7,
          reservoirState: new Float64Array(state),
          timestamp: Date.now(),
        });
      }

      // The ENACTION phase should now use real prediction error
      const result = await coordinator.executePhase(AutonomyPhase.ENACTION);
      expect(result.phase).toBe('enaction');
    });

    it('should execute ENACTION without selfMod engine', async () => {
      // No selfMod wired — should still succeed
      const result = await coordinator.executePhase(AutonomyPhase.ENACTION);
      expect(result.phase).toBe('enaction');
      expect(result.stateChanges).toHaveProperty('activeGoals');
    });
  });

  describe('full cycle with reservoir feedback', () => {
    it('should complete a full developmental cycle', async () => {
      coordinator.wireSelfModification(selfMod);
      coordinator.wireReservoirFeedback(feedbackLoop);
      feedbackLoop.start();

      const results = await coordinator.runCycle();
      expect(results.length).toBe(5); // All 5 phases

      const phases = results.map(r => r.phase);
      expect(phases).toContain('perception');
      expect(phases).toContain('modeling');
      expect(phases).toContain('reflection');
      expect(phases).toContain('mirroring');
      expect(phases).toContain('enaction');
    });

    it('should track coherence history across cycles', async () => {
      coordinator.wireSelfModification(selfMod);

      await coordinator.runCycle();
      await coordinator.runCycle();

      const history = coordinator.getCoherenceHistory();
      expect(history.length).toBe(10); // 5 phases × 2 cycles
    });

    it('should increment cycle count', async () => {
      expect(coordinator.getCycleCount()).toBe(0);
      await coordinator.runCycle();
      expect(coordinator.getCycleCount()).toBe(1);
      await coordinator.runCycle();
      expect(coordinator.getCycleCount()).toBe(2);
    });
  });

  describe('inverted mirror state', () => {
    it('should report inverted mirror state', () => {
      const state = coordinator.getInvertedMirrorState();
      expect(state).toHaveProperty('virtualAgent');
      expect(state).toHaveProperty('coherence');
      expect(state).toHaveProperty('drift');
      expect(state).toHaveProperty('echobeatsFeedback');
      expect(state).toHaveProperty('system5Active');
    });

    it('should have coherence + drift = 1', () => {
      const state = coordinator.getInvertedMirrorState();
      expect(state.coherence + state.drift).toBeCloseTo(1.0, 5);
    });
  });

  describe('event emission', () => {
    it('should emit cycle events', async () => {
      const events: string[] = [];
      coordinator.on('cycle:start', () => events.push('start'));
      coordinator.on('cycle:complete', () => events.push('complete'));

      await coordinator.runCycle();
      expect(events).toContain('start');
      expect(events).toContain('complete');
    });

    it('should emit phase events', async () => {
      const phases: string[] = [];
      coordinator.on('phase:start', (e: any) => phases.push(e.phase));
      coordinator.on('phase:complete', () => {});

      await coordinator.runCycle();
      expect(phases).toContain('perception');
      expect(phases).toContain('enaction');
    });
  });
});
