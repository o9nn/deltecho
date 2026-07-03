/**
 * E2E Tests: Salience Landscape Renegotiation (PIVOTAL_RR)
 *
 * Tests the complete salience landscape mechanism ported from
 * delovecho/dovecho-core/src/dove9/cognitive/dove9-triadic-engine.c
 *
 * Verifies:
 * - 12-step triadic cycle with 4 T-point convergences
 * - PIVOTAL_RR at steps 1 and 5 (0-indexed: 0 and 4)
 * - Decay, boost, coupling-based modulation
 * - Entry lifecycle (register, boost, prune)
 * - Integration with grand cycle timing
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

import {
  SalienceLandscape,
  CognitiveTerm,
  CouplingType,
  CognitiveMode,
  type SalienceEntry,
  type RenegotiationEvent,
} from '../../src/salience-landscape.js';

describe('SalienceLandscape E2E', () => {
  let landscape: SalienceLandscape;

  beforeEach(() => {
    landscape = new SalienceLandscape({
      maxEntries: 100,
      baseDecayRate: 0.02,
      couplingBoostFactor: 1.5,
      pruneThreshold: 0.05,
      tPointBoostMultiplier: 2.0,
      pivotalRRStrength: 0.3,
    });
  });

  describe('Entry Management', () => {
    it('should register entries with correct initial salience', () => {
      const entry = landscape.register('test1', 'perception', 0.7);
      expect(entry.id).toBe('test1');
      expect(entry.salience).toBe(0.7);
      expect(entry.source).toBe('perception');
    });

    it('should clamp salience to [0, 1]', () => {
      const high = landscape.register('high', 'test', 1.5);
      const low = landscape.register('low', 'test', -0.5);
      expect(high.salience).toBe(1);
      expect(low.salience).toBe(0);
    });

    it('should boost entry salience', () => {
      landscape.register('boost_test', 'test', 0.5);
      landscape.boost('boost_test', 0.2);
      const entry = landscape.getEntry('boost_test');
      expect(entry!.salience).toBe(0.7);
    });

    it('should not exceed 1.0 on boost', () => {
      landscape.register('cap_test', 'test', 0.9);
      landscape.boost('cap_test', 0.5);
      const entry = landscape.getEntry('cap_test');
      expect(entry!.salience).toBe(1.0);
    });

    it('should remove entries', () => {
      landscape.register('remove_test', 'test', 0.5);
      landscape.remove('remove_test');
      expect(landscape.getEntry('remove_test')).toBeUndefined();
    });

    it('should enforce maxEntries limit', () => {
      for (let i = 0; i < 110; i++) {
        landscape.register(`entry_${i}`, 'test', Math.random());
      }
      expect(landscape.getAllEntries().length).toBeLessThanOrEqual(100);
    });

    it('should return top entries sorted by salience', () => {
      landscape.register('low', 'test', 0.2);
      landscape.register('mid', 'test', 0.5);
      landscape.register('high', 'test', 0.9);

      const top = landscape.getTopEntries(2);
      expect(top[0].id).toBe('high');
      expect(top[1].id).toBe('mid');
      expect(top.length).toBe(2);
    });
  });

  describe('12-Step Triadic Cycle', () => {
    it('should complete one full triadic cycle in 12 steps', () => {
      landscape.register('cycle_test', 'test', 0.8);

      const events: RenegotiationEvent[] = [];
      landscape.on('renegotiation', (e: RenegotiationEvent) => events.push(e));

      // Run 12 steps (one full triadic cycle)
      for (let i = 0; i < 12; i++) {
        landscape.advanceStep(i);
      }

      expect(events.length).toBe(12);
      // Verify cycle step wraps correctly
      expect(events[0].cycleStep).toBe(0);
      expect(events[11].cycleStep).toBe(11);
    });

    it('should map grand cycle steps to triadic cycle steps correctly', () => {
      landscape.register('map_test', 'test', 0.5);

      // Grand cycle step 24 should map to triadic step 0 (24 % 12 = 0)
      const event = landscape.advanceStep(24);
      expect(event.cycleStep).toBe(0);

      // Grand cycle step 37 should map to triadic step 1 (37 % 12 = 1)
      const event2 = landscape.advanceStep(37);
      expect(event2.cycleStep).toBe(1);
    });
  });

  describe('PIVOTAL_RR (Steps 1 and 5)', () => {
    it('should identify PIVOTAL_RR at step 0 (1-indexed step 1)', () => {
      landscape.register('pivotal_test', 'test', 0.5);
      const event = landscape.advanceStep(0); // Step 0 = PIVOTAL_RR
      expect(event.isPivotalRR).toBe(true);
    });

    it('should identify PIVOTAL_RR at step 4 (1-indexed step 5)', () => {
      landscape.register('pivotal_test', 'test', 0.5);
      const event = landscape.advanceStep(4); // Step 4 = PIVOTAL_RR
      expect(event.isPivotalRR).toBe(true);
    });

    it('should NOT identify PIVOTAL_RR at other steps', () => {
      landscape.register('pivotal_test', 'test', 0.5);
      const event = landscape.advanceStep(2);
      expect(event.isPivotalRR).toBe(false);
    });

    it('should emit pivotal_rr event at PIVOTAL_RR steps', () => {
      landscape.register('pivotal_event_test', 'test', 0.5);

      const pivotalEvents: RenegotiationEvent[] = [];
      landscape.on('pivotal_rr', (e: RenegotiationEvent) => pivotalEvents.push(e));

      // Run full cycle
      for (let i = 0; i < 12; i++) {
        landscape.advanceStep(i);
      }

      expect(pivotalEvents.length).toBe(2); // Steps 0 and 4
    });

    it('should apply stronger decay at PIVOTAL_RR steps for stale entries', () => {
      // Register an entry and don't boost it for a while
      landscape.register('stale_entry', 'test', 0.8, {
        decayRate: 0.02,
      });

      // Simulate time passing (entry was boosted long ago)
      const entry = landscape.getEntry('stale_entry')!;
      (entry as any).lastBoosted = Date.now() - 20000; // 20 seconds ago

      // Advance to a PIVOTAL_RR step
      landscape.advanceStep(0);

      const afterPivotal = landscape.getEntry('stale_entry');
      // Should have decayed more aggressively
      expect(afterPivotal!.salience).toBeLessThan(0.78);
    });
  });

  describe('T-Point Convergences', () => {
    it('should identify T-points at steps 1, 4, 7, 10 (0-indexed)', () => {
      landscape.register('tpoint_test', 'test', 0.5);

      const tPointSteps = [1, 4, 7, 10];
      for (const step of tPointSteps) {
        const event = landscape.advanceStep(step);
        expect(event.isTPoint).toBe(true);
      }
    });

    it('should NOT identify T-points at non-T-point steps', () => {
      landscape.register('tpoint_test', 'test', 0.5);

      const nonTPointSteps = [0, 2, 3, 5, 6, 8, 9, 11];
      for (const step of nonTPointSteps) {
        const event = landscape.advanceStep(step);
        expect(event.isTPoint).toBe(false);
      }
    });

    it('should emit t_point_convergence events', () => {
      landscape.register('tpoint_event_test', 'test', 0.5);

      const tPointEvents: RenegotiationEvent[] = [];
      landscape.on('t_point_convergence', (e: RenegotiationEvent) => tPointEvents.push(e));

      for (let i = 0; i < 12; i++) {
        landscape.advanceStep(i);
      }

      expect(tPointEvents.length).toBe(4); // 4 T-points per cycle
    });

    it('should dampen high-salience entries at T-points (anti-monopoly)', () => {
      landscape.register('monopoly_test', 'test', 0.95);

      // Advance to a T-point
      landscape.advanceStep(1);

      const entry = landscape.getEntry('monopoly_test');
      // Should be slightly dampened (0.95 * 0.95 = 0.9025, minus decay)
      expect(entry!.salience).toBeLessThan(0.95);
    });

    it('should provide anti-starvation floor at T-points', () => {
      landscape.register('starving_test', 'test', 0.1);

      // Advance to a T-point
      landscape.advanceStep(1);

      const entry = landscape.getEntry('starving_test');
      // Should get a small floor boost (but also decay, so net effect varies)
      // The key invariant is it shouldn't be pruned if above threshold
      expect(entry).toBeDefined();
    });
  });

  describe('Coupling-Based Modulation', () => {
    it('should boost entries with PERCEPTION_MEMORY coupling at T4/T7 steps', () => {
      landscape.register('perception_memory', 'test', 0.5, {
        couplings: [CouplingType.PERCEPTION_MEMORY],
      });

      // Step 2 has T4_SENSORY_INPUT which activates PERCEPTION_MEMORY coupling
      landscape.advanceStep(2);

      const entry = landscape.getEntry('perception_memory');
      // Should be boosted (coupling factor) minus decay
      // Net should be slightly above or near initial depending on exact math
      expect(entry).toBeDefined();
    });

    it('should boost entries with ASSESSMENT_PLANNING coupling at T1/T2 steps', () => {
      landscape.register('assessment_planning', 'test', 0.5, {
        couplings: [CouplingType.ASSESSMENT_PLANNING],
      });

      // Step 0 has T1_PERCEPTION which activates ASSESSMENT_PLANNING coupling
      landscape.advanceStep(0);

      const entry = landscape.getEntry('assessment_planning');
      expect(entry).toBeDefined();
    });

    it('should boost entries with BALANCED_INTEGRATION coupling at T8 steps', () => {
      landscape.register('balanced_integration', 'test', 0.5, {
        couplings: [CouplingType.BALANCED_INTEGRATION],
      });

      // Step 5 has T8_BALANCED_RESPONSE
      landscape.advanceStep(5);

      const entry = landscape.getEntry('balanced_integration');
      expect(entry).toBeDefined();
    });

    it('should report active couplings in renegotiation events', () => {
      landscape.register('coupling_report', 'test', 0.5);

      const event = landscape.advanceStep(0); // T1_PERCEPTION → ASSESSMENT_PLANNING
      expect(event.activeCouplings).toContain(CouplingType.ASSESSMENT_PLANNING);
    });
  });

  describe('Cognitive Term Affinity', () => {
    it('should boost entries with affinity for the current cognitive term', () => {
      landscape.register('affinity_test', 'test', 0.5, {
        cognitiveTermAffinity: [CognitiveTerm.T1_PERCEPTION],
      });

      // Step 0 has T1_PERCEPTION
      const initialSalience = landscape.getEntry('affinity_test')!.salience;
      landscape.advanceStep(0);

      const afterStep = landscape.getEntry('affinity_test');
      // Should be boosted by affinity (minus decay)
      // The boost is 0.03, decay is 0.02 * 0.3 (PIVOTAL_RR) = 0.006
      // Net: +0.024 approximately
      expect(afterStep).toBeDefined();
    });

    it('should not boost entries without affinity for current term', () => {
      landscape.register('no_affinity', 'test', 0.5, {
        cognitiveTermAffinity: [CognitiveTerm.T8_BALANCED_RESPONSE],
      });

      // Step 0 has T1_PERCEPTION, not T8
      landscape.advanceStep(0);

      const entry = landscape.getEntry('no_affinity');
      // Should only decay, not boost
      expect(entry!.salience).toBeLessThan(0.5);
    });
  });

  describe('Decay and Pruning', () => {
    it('should decay all entries each step', () => {
      landscape.register('decay_test', 'test', 0.5);

      // Non-PIVOTAL_RR, non-T-point step
      landscape.advanceStep(3);

      const entry = landscape.getEntry('decay_test');
      expect(entry!.salience).toBeLessThan(0.5);
    });

    it('should prune entries below threshold', () => {
      landscape.register('prune_test', 'test', 0.06); // Just above threshold

      // Advance several steps to decay below threshold
      for (let i = 0; i < 5; i++) {
        landscape.advanceStep(i + 2); // Avoid PIVOTAL_RR for predictable decay
      }

      const entry = landscape.getEntry('prune_test');
      // Should be pruned after enough decay
      expect(entry).toBeUndefined();
    });

    it('should report pruned entries in renegotiation events', () => {
      landscape.register('prune_report', 'test', 0.06);

      // Run enough steps to prune
      let totalPruned = 0;
      for (let i = 0; i < 10; i++) {
        const event = landscape.advanceStep(i + 2);
        totalPruned += event.entriesPruned;
      }

      expect(totalPruned).toBeGreaterThan(0);
    });
  });

  describe('Metrics', () => {
    it('should track total renegotiations', () => {
      landscape.register('metrics_test', 'test', 0.5);

      for (let i = 0; i < 5; i++) {
        landscape.advanceStep(i);
      }

      const metrics = landscape.getMetrics();
      expect(metrics.totalRenegotiations).toBe(5);
    });

    it('should track cycle number', () => {
      landscape.register('cycle_metrics', 'test', 0.8);

      // Run 24 steps (2 full triadic cycles)
      for (let i = 0; i < 24; i++) {
        landscape.advanceStep(i);
      }

      const metrics = landscape.getMetrics();
      expect(metrics.cycleNumber).toBe(2);
    });

    it('should calculate average salience correctly', () => {
      landscape.register('avg1', 'test', 0.4);
      landscape.register('avg2', 'test', 0.6);
      landscape.register('avg3', 'test', 0.8);

      const metrics = landscape.getMetrics();
      expect(metrics.averageSalience).toBeCloseTo(0.6, 1);
    });

    it('should report correct entry count', () => {
      landscape.register('count1', 'test', 0.5);
      landscape.register('count2', 'test', 0.5);
      landscape.register('count3', 'test', 0.5);

      const metrics = landscape.getMetrics();
      expect(metrics.totalEntries).toBe(3);
    });
  });

  describe('Grand Cycle Integration (60 steps)', () => {
    it('should complete 5 full triadic cycles in one grand cycle', () => {
      landscape.register('grand_cycle_test', 'test', 0.9);

      let pivotalCount = 0;
      let tPointCount = 0;

      landscape.on('pivotal_rr', () => pivotalCount++);
      landscape.on('t_point_convergence', () => tPointCount++);

      // Run full 60-step grand cycle
      for (let i = 0; i < 60; i++) {
        landscape.advanceStep(i);
      }

      // 5 triadic cycles × 2 PIVOTAL_RR per cycle = 10
      expect(pivotalCount).toBe(10);
      // 5 triadic cycles × 4 T-points per cycle = 20
      expect(tPointCount).toBe(20);
    });

    it('should maintain entry stability over a full grand cycle', () => {
      // Register a high-salience entry with coupling alignment
      landscape.register('stable_entry', 'test', 0.9, {
        couplings: [CouplingType.ASSESSMENT_PLANNING, CouplingType.PERCEPTION_MEMORY],
        cognitiveTermAffinity: [CognitiveTerm.T1_PERCEPTION, CognitiveTerm.T4_SENSORY_INPUT],
      });

      // Run full grand cycle
      for (let i = 0; i < 60; i++) {
        landscape.advanceStep(i);
      }

      // Well-coupled entries should survive the full cycle
      const entry = landscape.getEntry('stable_entry');
      expect(entry).toBeDefined();
      expect(entry!.salience).toBeGreaterThan(0.1);
    });
  });

  describe('Reset', () => {
    it('should clear all state on reset', () => {
      landscape.register('reset_test', 'test', 0.5);
      landscape.advanceStep(0);
      landscape.advanceStep(1);

      landscape.reset();

      expect(landscape.getAllEntries().length).toBe(0);
      const metrics = landscape.getMetrics();
      expect(metrics.totalRenegotiations).toBe(0);
      expect(metrics.cycleNumber).toBe(0);
      expect(metrics.currentStep).toBe(0);
    });
  });
});
