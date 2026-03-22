import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SelfModificationEngine } from '../self-modification.js';
import type { ModificationRequest } from '../self-modification.js';

describe('SelfModificationEngine', () => {
  let engine: SelfModificationEngine;

  beforeEach(() => {
    engine = new SelfModificationEngine({
      enablePersistence: false,
      maxModificationsPerMinute: 20,
      deadManSwitchThreshold: 0.2,
      deadManSwitchCooldown: 1000,
      dryRun: false,
    });
  });

  describe('parameter management', () => {
    it('should initialize with default parameters', () => {
      const params = engine.getAllParameters();
      expect(params.length).toBeGreaterThan(0);

      const cycleInterval = engine.getParameter('echobeats.cycleInterval');
      expect(cycleInterval).toBeDefined();
      expect(cycleInterval!.currentValue).toBe(2000);
      expect(cycleInterval!.defaultValue).toBe(2000);
    });

    it('should register custom parameters', () => {
      engine.registerParameter({
        key: 'custom.param',
        description: 'A custom parameter',
        currentValue: 42,
        defaultValue: 42,
        min: 0,
        max: 100,
        maxDeltaFraction: 0.5,
        category: 'timing',
      });

      const param = engine.getParameter('custom.param');
      expect(param).toBeDefined();
      expect(param!.currentValue).toBe(42);
    });
  });

  describe('modification requests', () => {
    it('should apply a valid modification', () => {
      const request: ModificationRequest = {
        key: 'inference.temperature',
        newValue: 0.8,
        reason: 'Test modification',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      };

      const result = engine.modify(request);
      expect(result.applied).toBe(true);
      expect(result.previousValue).toBe(0.7);
      expect(result.newValue).toBe(0.8);

      const param = engine.getParameter('inference.temperature');
      expect(param!.currentValue).toBe(0.8);
    });

    it('should clamp values to min/max range', () => {
      const request: ModificationRequest = {
        key: 'inference.temperature',
        newValue: 10.0, // Way above max of 2.0
        reason: 'Test clamping',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      };

      const result = engine.modify(request);
      expect(result.applied).toBe(true);
      // Should be clamped by maxDeltaFraction (0.3 * range of 1.9 = 0.57)
      // From 0.7 + 0.57 = 1.27
      expect(result.newValue).toBeLessThanOrEqual(2.0);
      expect(result.newValue).toBeGreaterThan(0.7);
    });

    it('should clamp delta to maxDeltaFraction', () => {
      // Temperature: range 0.1-2.0 = 1.9, maxDelta = 0.3 * 1.9 = 0.57
      // Current = 0.7, requesting 2.0 → delta = 1.3 > 0.57 → clamped to 0.7 + 0.57 = 1.27
      const request: ModificationRequest = {
        key: 'inference.temperature',
        newValue: 2.0,
        reason: 'Test delta clamping',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      };

      const result = engine.modify(request);
      expect(result.applied).toBe(true);
      expect(result.newValue).toBeCloseTo(1.27, 1);
    });

    it('should reject unknown parameters', () => {
      const request: ModificationRequest = {
        key: 'nonexistent.param',
        newValue: 42,
        reason: 'Test rejection',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      };

      const result = engine.modify(request);
      expect(result.applied).toBe(false);
      expect(result.rejectionReason).toContain('Unknown parameter');
    });

    it('should fire onParameterChange callback', () => {
      const callback = jest.fn() as jest.Mock<(value: number) => void>;
      engine.onParameterChange('inference.temperature', callback);

      engine.modify({
        key: 'inference.temperature',
        newValue: 0.8,
        reason: 'Test callback',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      expect(callback).toHaveBeenCalledWith(expect.closeTo(0.8, 1));
    });

    it('should rollback if callback throws', () => {
      engine.onParameterChange('inference.temperature', () => {
        throw new Error('Apply failed');
      });

      const result = engine.modify({
        key: 'inference.temperature',
        newValue: 0.8,
        reason: 'Test rollback',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      expect(result.applied).toBe(false);
      expect(result.rejectionReason).toContain('Apply callback failed');

      // Value should be rolled back
      const param = engine.getParameter('inference.temperature');
      expect(param!.currentValue).toBe(0.7);
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limit', () => {
      const results = [];
      for (let i = 0; i < 25; i++) {
        results.push(engine.modify({
          key: 'inference.temperature',
          newValue: 0.7 + (i % 2) * 0.01,
          reason: `Rate limit test ${i}`,
          source: 'enaction',
          coherenceAtRequest: 0.7,
        }));
      }

      const applied = results.filter(r => r.applied).length;
      const rejected = results.filter(r => !r.applied).length;

      expect(applied).toBeLessThanOrEqual(20);
      expect(rejected).toBeGreaterThan(0);
    });
  });

  describe('dead man\'s switch', () => {
    it('should activate when coherence is critically low', () => {
      // First modify to change from default
      engine.modify({
        key: 'inference.temperature',
        newValue: 0.9,
        reason: 'Setup',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      // Now trigger dead man's switch with very low coherence
      const result = engine.modify({
        key: 'echobeats.cycleInterval',
        newValue: 5000,
        reason: 'This should trigger dead man switch',
        source: 'enaction',
        coherenceAtRequest: 0.1, // Below threshold of 0.2
      });

      expect(result.applied).toBe(false);
      expect(result.rejectionReason).toContain('dead man\'s switch');
      expect(engine.isDeadManSwitchActive()).toBe(true);

      // Temperature should be reverted to default
      const temp = engine.getParameter('inference.temperature');
      expect(temp!.currentValue).toBe(0.7); // Default
    });

    it('should reject modifications during cooldown', () => {
      // Trigger dead man's switch
      engine.modify({
        key: 'inference.temperature',
        newValue: 0.8,
        reason: 'Trigger',
        source: 'enaction',
        coherenceAtRequest: 0.1,
      });

      // Try to modify during cooldown
      const result = engine.modify({
        key: 'inference.temperature',
        newValue: 0.8,
        reason: 'During cooldown',
        source: 'enaction',
        coherenceAtRequest: 0.9,
      });

      expect(result.applied).toBe(false);
      expect(result.rejectionReason).toContain('Dead man\'s switch active');
    });
  });

  describe('modification proposals', () => {
    it('should propose slowing cycle when coherence is low', () => {
      const proposals = engine.proposeModifications(0.3, 0.2, 5, 0.5);
      const cycleProposal = proposals.find(p => p.key === 'echobeats.cycleInterval');
      expect(cycleProposal).toBeDefined();
      expect(cycleProposal!.newValue).toBeGreaterThan(2000); // Should increase
    });

    it('should propose accelerating cycle when coherence is high', () => {
      const proposals = engine.proposeModifications(0.9, 0.05, 5, 0.8);
      const cycleProposal = proposals.find(p => p.key === 'echobeats.cycleInterval');
      expect(cycleProposal).toBeDefined();
      expect(cycleProposal!.newValue).toBeLessThan(2000); // Should decrease
    });

    it('should propose increasing adaptation speed on high prediction error', () => {
      const proposals = engine.proposeModifications(0.6, 0.7, 5, 0.5);
      const ffProposal = proposals.find(p => p.key === 'reservoir.forgettingFactor');
      expect(ffProposal).toBeDefined();
      expect(ffProposal!.newValue).toBeLessThan(0.995); // Lower = faster adaptation
    });

    it('should propose reducing temperature on goal overload', () => {
      const proposals = engine.proposeModifications(0.6, 0.2, 10, 0.5);
      const tempProposal = proposals.find(p => p.key === 'inference.temperature');
      expect(tempProposal).toBeDefined();
      expect(tempProposal!.newValue).toBeLessThan(0.7); // Lower for focus
    });

    it('should propose increasing consolidation frequency on low ratio', () => {
      const proposals = engine.proposeModifications(0.6, 0.2, 5, 0.1);
      const consProposal = proposals.find(p => p.key === 'consolidation.interval');
      expect(consProposal).toBeDefined();
      expect(consProposal!.newValue).toBeLessThan(300000); // Shorter interval = more frequent
    });
  });

  describe('dry run mode', () => {
    it('should log but not apply in dry run mode', () => {
      const dryEngine = new SelfModificationEngine({
        enablePersistence: false,
        dryRun: true,
      });

      const result = dryEngine.modify({
        key: 'inference.temperature',
        newValue: 0.9,
        reason: 'Dry run test',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      expect(result.applied).toBe(true); // Reports applied
      // But the actual value should not change
      const param = dryEngine.getParameter('inference.temperature');
      expect(param!.currentValue).toBe(0.7); // Still default
    });
  });

  describe('history and stats', () => {
    it('should track modification history', () => {
      engine.modify({
        key: 'inference.temperature',
        newValue: 0.8,
        reason: 'History test 1',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      engine.modify({
        key: 'inference.topP',
        newValue: 0.85,
        reason: 'History test 2',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      const history = engine.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].key).toBe('inference.temperature');
      expect(history[1].key).toBe('inference.topP');
    });

    it('should report accurate stats', () => {
      engine.modify({
        key: 'inference.temperature',
        newValue: 0.8,
        reason: 'Stats test',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      engine.modify({
        key: 'nonexistent',
        newValue: 42,
        reason: 'Stats test rejection',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      const stats = engine.getStats();
      expect(stats.totalModifications).toBe(1);
      expect(stats.totalRejections).toBe(1);
      expect(stats.parameterCount).toBeGreaterThan(0);
      expect(stats.deadManSwitchActive).toBe(false);
    });

    it('should emit events on modification', () => {
      const modifiedHandler = jest.fn();
      const rejectedHandler = jest.fn();
      engine.on('modified', modifiedHandler);
      engine.on('rejected', rejectedHandler);

      engine.modify({
        key: 'inference.temperature',
        newValue: 0.8,
        reason: 'Event test',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      engine.modify({
        key: 'nonexistent',
        newValue: 42,
        reason: 'Event test rejection',
        source: 'enaction',
        coherenceAtRequest: 0.7,
      });

      expect(modifiedHandler).toHaveBeenCalledTimes(1);
      expect(rejectedHandler).toHaveBeenCalledTimes(1);
    });
  });
});
