/**
 * Unit tests for OpenPsi
 * Tests the motivational and emotional system
 */

import { OpenPsi, PsiRule, Demand, Emotion } from '../reasoning/OpenPsi.js';
import { AtomSpace } from '../atomspace/AtomSpace.js';

describe('OpenPsi', () => {
  let atomSpace: AtomSpace;
  let openPsi: OpenPsi;

  beforeEach(() => {
    atomSpace = new AtomSpace();
    openPsi = new OpenPsi(atomSpace);
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create an OpenPsi instance', () => {
      expect(openPsi).toBeDefined();
    });

    it('should initialize default demands', () => {
      const demands = openPsi.getDemands();
      expect(demands.length).toBeGreaterThan(0);
    });
  });

  describe('demand management', () => {
    it('should add a new demand', () => {
      const demand: Demand = {
        id: 'curiosity',
        name: 'Curiosity',
        goalValue: 0.7,
        currentValue: 0.5,
        urgency: 0.3,
      };

      openPsi.addDemand(demand);
      const demands = openPsi.getDemands();

      expect(demands.some((d) => d.id === 'curiosity')).toBe(true);
    });

    it('should update demand values', () => {
      const demand: Demand = {
        id: 'energy',
        name: 'Energy',
        goalValue: 1.0,
        currentValue: 0.5,
        urgency: 0.5,
      };

      openPsi.addDemand(demand);
      openPsi.updateDemand('energy', { currentValue: 0.8 });

      const updated = openPsi.getDemand('energy');
      expect(updated?.currentValue).toBe(0.8);
    });

    it('should calculate demand urgency based on gap', () => {
      const demand: Demand = {
        id: 'test',
        name: 'Test',
        goalValue: 1.0,
        currentValue: 0.2,
        urgency: 0,
      };

      openPsi.addDemand(demand);
      const urgency = openPsi.calculateUrgency('test');

      // Large gap should result in high urgency
      expect(urgency).toBeGreaterThan(0.5);
    });

    it('should prioritize demands by urgency', () => {
      openPsi.addDemand({
        id: 'low',
        name: 'Low Priority',
        goalValue: 1.0,
        currentValue: 0.9,
        urgency: 0.1,
      });

      openPsi.addDemand({
        id: 'high',
        name: 'High Priority',
        goalValue: 1.0,
        currentValue: 0.1,
        urgency: 0.9,
      });

      const prioritized = openPsi.getPrioritizedDemands();

      expect(prioritized[0].id).toBe('high');
    });
  });

  describe('psi rules', () => {
    it('should add psi rules', () => {
      const rule: PsiRule = {
        id: 'rule_1',
        context: () => true,
        action: () => ({ executed: true }),
        goal: 'energy',
        weight: 0.8,
      };

      openPsi.addRule(rule);
      const rules = openPsi.getRules();

      expect(rules.some((r) => r.id === 'rule_1')).toBe(true);
    });

    it('should evaluate rule context', () => {
      let contextCalled = false;

      const rule: PsiRule = {
        id: 'context_rule',
        context: () => {
          contextCalled = true;
          return true;
        },
        action: () => ({ success: true }),
        goal: 'test',
        weight: 1.0,
      };

      openPsi.addRule(rule);
      openPsi.selectAction();

      expect(contextCalled).toBe(true);
    });

    it('should execute rule action when context is satisfied', () => {
      let actionExecuted = false;

      const rule: PsiRule = {
        id: 'action_rule',
        context: () => true,
        action: () => {
          actionExecuted = true;
          return { success: true };
        },
        goal: 'test',
        weight: 1.0,
      };

      openPsi.addRule(rule);
      openPsi.step();

      expect(actionExecuted).toBe(true);
    });

    it('should not execute action when context is not satisfied', () => {
      let actionExecuted = false;

      const rule: PsiRule = {
        id: 'blocked_rule',
        context: () => false,
        action: () => {
          actionExecuted = true;
          return { success: true };
        },
        goal: 'test',
        weight: 1.0,
      };

      openPsi.addRule(rule);
      openPsi.step();

      expect(actionExecuted).toBe(false);
    });
  });

  describe('emotion modeling', () => {
    it('should track emotional state', () => {
      const emotion: Emotion = {
        valence: 0.5,
        arousal: 0.3,
        dominance: 0.6,
      };

      openPsi.setEmotionalState(emotion);
      const state = openPsi.getEmotionalState();

      expect(state.valence).toBe(0.5);
      expect(state.arousal).toBe(0.3);
      expect(state.dominance).toBe(0.6);
    });

    it('should update emotional state based on events', () => {
      openPsi.setEmotionalState({ valence: 0.5, arousal: 0.5, dominance: 0.5 });

      // Positive event should increase valence
      openPsi.processEvent({ type: 'reward', magnitude: 0.3 });
      let state = openPsi.getEmotionalState();

      expect(state.valence).toBeGreaterThan(0.5);

      // Negative event should decrease valence
      openPsi.processEvent({ type: 'punishment', magnitude: 0.5 });
      state = openPsi.getEmotionalState();

      expect(state.valence).toBeLessThan(0.8);
    });

    it('should influence action selection based on emotion', () => {
      // High arousal should affect rule weight
      openPsi.setEmotionalState({ valence: 0.5, arousal: 0.9, dominance: 0.5 });

      const rule: PsiRule = {
        id: 'arousal_sensitive',
        context: () => true,
        action: () => ({ success: true }),
        goal: 'test',
        weight: 0.5,
        emotionalModulation: true,
      };

      openPsi.addRule(rule);
      const effectiveWeight = openPsi.getEffectiveWeight(rule);

      // High arousal should modulate weight
      expect(effectiveWeight).not.toBe(0.5);
    });
  });

  describe('action selection', () => {
    it('should select highest weighted applicable rule', () => {
      const lowRule: PsiRule = {
        id: 'low_weight',
        context: () => true,
        action: () => ({ id: 'low' }),
        goal: 'test',
        weight: 0.3,
      };

      const highRule: PsiRule = {
        id: 'high_weight',
        context: () => true,
        action: () => ({ id: 'high' }),
        goal: 'test',
        weight: 0.9,
      };

      openPsi.addRule(lowRule);
      openPsi.addRule(highRule);

      const selected = openPsi.selectAction();

      expect(selected?.id).toBe('high_weight');
    });

    it('should return null when no rules are applicable', () => {
      const rule: PsiRule = {
        id: 'blocked',
        context: () => false,
        action: () => ({ success: true }),
        goal: 'test',
        weight: 1.0,
      };

      openPsi.addRule(rule);
      const selected = openPsi.selectAction();

      expect(selected).toBeNull();
    });
  });

  describe('cognitive cycle', () => {
    it('should run continuous cognitive cycle', async () => {
      let stepCount = 0;

      const rule: PsiRule = {
        id: 'counter',
        context: () => stepCount < 5,
        action: () => {
          stepCount++;
          return { count: stepCount };
        },
        goal: 'test',
        weight: 1.0,
      };

      openPsi.addRule(rule);

      // Run for a few cycles
      for (let i = 0; i < 5; i++) {
        openPsi.step();
      }

      expect(stepCount).toBe(5);
    });

    it('should update demands after action execution', () => {
      const demand: Demand = {
        id: 'hunger',
        name: 'Hunger',
        goalValue: 1.0,
        currentValue: 0.3,
        urgency: 0.7,
      };

      openPsi.addDemand(demand);

      const rule: PsiRule = {
        id: 'eat',
        context: () => true,
        action: () => {
          openPsi.updateDemand('hunger', { currentValue: 0.8 });
          return { ate: true };
        },
        goal: 'hunger',
        weight: 1.0,
      };

      openPsi.addRule(rule);
      openPsi.step();

      const updated = openPsi.getDemand('hunger');
      expect(updated?.currentValue).toBe(0.8);
    });
  });
});
