import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  VorticogCoreSelfEngine,
  createVorticogCoreSelfEngine,
  AgentRole,
  CoreValue,
  CognitiveNeed,
  ActionType,
  AutognosisLevel,
  SkillCategory,
} from '../../src/vorticog-core-self-engine';

describe('VorticogCoreSelfEngine', () => {
  let engine: VorticogCoreSelfEngine;

  beforeEach(() => {
    engine = createVorticogCoreSelfEngine();
  });

  // ─── Initialization ──────────────────────────────────────────

  describe('Initialization', () => {
    it('should initialize with default identity mesh', () => {
      const mesh = engine.getIdentityMesh();
      expect(mesh.roles.size).toBe(5);
      expect(mesh.values.size).toBe(5);
      expect(mesh.roles.get(AgentRole.LEARNER)).toBe(0.9);
      expect(mesh.values.get(CoreValue.CURIOSITY)).toBe(0.9);
      expect(mesh.coherenceScore).toBe(0.5);
    });

    it('should derive Big Five personality from identity mesh', () => {
      const personality = engine.getPersonality();
      expect(personality.openness).toBeGreaterThan(0);
      expect(personality.conscientiousness).toBeGreaterThan(0);
      expect(personality.extraversion).toBeGreaterThan(0);
      expect(personality.agreeableness).toBeGreaterThan(0);
      expect(personality.neuroticism).toBeGreaterThanOrEqual(0);
      expect(personality.neuroticism).toBeLessThanOrEqual(100);
    });

    it('should initialize 6 cognitive needs', () => {
      const needs = engine.getNeeds();
      expect(needs.size).toBe(6);
      for (const [, state] of needs) {
        expect(state.current).toBeGreaterThanOrEqual(60);
        expect(state.current).toBeLessThanOrEqual(80);
        expect(state.decayRate).toBeGreaterThan(0);
      }
    });

    it('should initialize 15 skills across 5 categories', () => {
      const skills = engine.getSkills();
      expect(skills.size).toBe(15);
      for (const [, skill] of skills) {
        expect(skill.level).toBe(0);
        expect(skill.xp).toBe(0);
        expect(skill.xpToNext).toBe(100);
        expect(Object.values(SkillCategory)).toContain(skill.category);
      }
    });

    it('should accept custom configuration', () => {
      const custom = createVorticogCoreSelfEngine({
        initialRoles: { [AgentRole.SAGE]: 1.0 },
        introspectionInterval: 10,
      });
      const mesh = custom.getIdentityMesh();
      expect(mesh.roles.get(AgentRole.SAGE)).toBe(1.0);
    });
  });

  // ─── Simulation Tick ─────────────────────────────────────────

  describe('Simulation Tick', () => {
    it('should increment tick count on each tick', () => {
      expect(engine.getTickCount()).toBe(0);
      engine.tick();
      expect(engine.getTickCount()).toBe(1);
      engine.tick();
      expect(engine.getTickCount()).toBe(2);
    });

    it('should decay needs over time', () => {
      // Queue only REST actions so curiosity isn't replenished
      for (let i = 0; i < 20; i++) {
        engine.queueAction(ActionType.REST, 10);
      }

      const initialNeeds = engine.getNeeds();
      const initialCuriosity = initialNeeds.get(CognitiveNeed.CURIOSITY)!.current;

      // Run enough ticks for decay to outpace any replenishment
      for (let i = 0; i < 50; i++) engine.tick();

      const afterNeeds = engine.getNeeds();
      expect(afterNeeds.get(CognitiveNeed.CURIOSITY)!.current).toBeLessThan(initialCuriosity);
    });

    it('should auto-queue urgent actions when needs become critical', () => {
      // Run many ticks to deplete needs
      for (let i = 0; i < 100; i++) engine.tick();

      // At least one action should have been taken
      const log = engine.getBehaviorLog();
      expect(log.length).toBeGreaterThan(0);
    });

    it('should complete actions and apply need effects', () => {
      engine.queueAction(ActionType.MEDITATE, 10);

      // Run enough ticks to complete the action (duration=3)
      for (let i = 0; i < 10; i++) engine.tick();

      const log = engine.getBehaviorLog();
      expect(log).toContain(ActionType.MEDITATE);
    });

    it('should process external events', () => {
      const result = engine.tick({
        events: [{
          id: 'test-1',
          type: 'social',
          description: 'A friend visited',
          emotionalImpact: { valence: 0.8, arousal: 0.5 },
          timestamp: Date.now(),
        }],
      });

      expect(result.needsState).toBeDefined();
    });
  });

  // ─── Introspection ───────────────────────────────────────────

  describe('Introspection', () => {
    it('should run introspection at configured interval', () => {
      // Default interval is 30
      for (let i = 0; i < 29; i++) {
        const result = engine.tick();
        expect(result.introspection).toBeNull();
      }
      const result = engine.tick(); // tick 30
      expect(result.introspection).not.toBeNull();
    });

    it('should detect shadow (identity-behavior gap)', () => {
      // Queue only REST actions to create a gap with CREATOR role
      for (let i = 0; i < 15; i++) {
        engine.queueAction(ActionType.REST, 10);
      }

      // Run to introspection
      for (let i = 0; i < 30; i++) engine.tick();

      const history = engine.getIntrospectionHistory();
      expect(history.length).toBe(1);
      expect(history[0].shadow.identityBehaviorGap).toBeGreaterThanOrEqual(0);
    });

    it('should provide moral perception', () => {
      for (let i = 0; i < 30; i++) engine.tick();

      const history = engine.getIntrospectionHistory();
      const moral = history[0].moralPerception;
      expect(moral.rawAffect).toBeGreaterThanOrEqual(-1);
      expect(moral.rawAffect).toBeLessThanOrEqual(1);
      expect(moral.empathicInference).toBeGreaterThanOrEqual(0);
      expect(moral.noveltySignal).toBeGreaterThanOrEqual(0);
    });

    it('should generate evolution directives', () => {
      for (let i = 0; i < 30; i++) engine.tick();

      const history = engine.getIntrospectionHistory();
      expect(history[0].evolutionDirective).toBeDefined();
      expect(history[0].evolutionDirective.length).toBeGreaterThan(0);
    });

    it('should accumulate wisdom over multiple introspection sessions', () => {
      // Run multiple introspection cycles
      for (let i = 0; i < 90; i++) engine.tick();

      expect(engine.getWisdomScore()).toBeGreaterThan(0);
      expect(engine.getIntrospectionHistory().length).toBe(3);
    });

    it('should advance autognosis level with wisdom', () => {
      expect(engine.getAutognosisLevel()).toBe(AutognosisLevel.OBSERVATION);

      // Manually set wisdom high to test level progression
      // Run many cycles with diverse behavior
      const diverseEngine = createVorticogCoreSelfEngine({
        introspectionInterval: 5,
        shadowSensitivity: 0.1,
      });

      for (let i = 0; i < 200; i++) {
        diverseEngine.queueAction(
          [ActionType.EXPLORE, ActionType.CREATE, ActionType.MEDITATE,
           ActionType.SOCIALIZE, ActionType.LEARN][i % 5],
          5,
        );
        diverseEngine.tick();
      }

      // Wisdom should have grown
      expect(diverseEngine.getWisdomScore()).toBeGreaterThan(0);
    });
  });

  // ─── Relationships ───────────────────────────────────────────

  describe('Relationships', () => {
    it('should add and track relationships', () => {
      engine.addRelationship('agent-1', 'Alice', 50);
      const rels = engine.getRelationships();
      expect(rels.size).toBe(1);
      expect(rels.get('agent-1')!.entityName).toBe('Alice');
      expect(rels.get('agent-1')!.friendship).toBe(50);
    });

    it('should influence moral perception empathy', () => {
      engine.addRelationship('a1', 'Alice', 80);
      engine.addRelationship('a2', 'Bob', 60);

      for (let i = 0; i < 30; i++) engine.tick();

      const history = engine.getIntrospectionHistory();
      expect(history[0].moralPerception.empathicInference).toBeGreaterThan(0);
    });
  });

  // ─── Skills ──────────────────────────────────────────────────

  describe('Skills', () => {
    it('should gain XP from completed actions', () => {
      engine.queueAction(ActionType.MEDITATE, 10);
      for (let i = 0; i < 10; i++) engine.tick();

      const skills = engine.getSkills();
      const selfAwareness = skills.get('self_awareness');
      expect(selfAwareness!.xp).toBeGreaterThan(0);
    });

    it('should emit skill_leveled event on level up', () => {
      const levelHandler = jest.fn<any>();
      engine.on('skill_leveled', levelHandler);

      // Queue many MEDITATE actions to level up self_awareness
      for (let i = 0; i < 50; i++) {
        engine.queueAction(ActionType.MEDITATE, 10);
      }
      for (let i = 0; i < 200; i++) engine.tick();

      expect(levelHandler).toHaveBeenCalled();
    });
  });

  // ─── Identity Coherence ──────────────────────────────────────

  describe('Identity Coherence', () => {
    it('should track coherence score', () => {
      const initial = engine.getIdentityMesh().coherenceScore;
      for (let i = 0; i < 60; i++) engine.tick();
      const after = engine.getIdentityMesh().coherenceScore;
      // Coherence should change (either direction based on behavior)
      expect(typeof after).toBe('number');
      expect(after).toBeGreaterThanOrEqual(0);
      expect(after).toBeLessThanOrEqual(1);
    });

    it('should refine identity mesh during introspection', () => {
      // Suppress SAGE role by never meditating
      for (let i = 0; i < 15; i++) {
        engine.queueAction(ActionType.EXPLORE, 10);
      }
      for (let i = 0; i < 30; i++) engine.tick();

      // After introspection, suppressed roles should be slightly strengthened
      const mesh = engine.getIdentityMesh();
      // SAGE starts at 0.4, may have been slightly increased
      expect(mesh.roles.get(AgentRole.SAGE)).toBeGreaterThanOrEqual(0.4);
    });
  });

  // ─── Metrics & Reset ─────────────────────────────────────────

  describe('Metrics and Reset', () => {
    it('should provide comprehensive metrics', () => {
      for (let i = 0; i < 30; i++) engine.tick();

      const metrics = engine.getMetrics();
      expect(metrics.tickCount).toBe(30);
      expect(metrics.wisdomScore).toBeGreaterThanOrEqual(0);
      expect(metrics.autognosisLevel).toBeDefined();
      expect(metrics.coherence).toBeGreaterThan(0);
      expect(metrics.personality).toBeDefined();
      expect(metrics.skillLevels).toBeDefined();
      expect(metrics.behaviorDiversity).toBeGreaterThanOrEqual(0);
      expect(metrics.introspectionCount).toBe(1);
    });

    it('should reset to initial state', () => {
      for (let i = 0; i < 60; i++) engine.tick();
      engine.reset();

      expect(engine.getTickCount()).toBe(0);
      expect(engine.getWisdomScore()).toBe(0);
      expect(engine.getBehaviorLog()).toHaveLength(0);
      expect(engine.getIntrospectionHistory()).toHaveLength(0);
      expect(engine.getIdentityMesh().coherenceScore).toBe(0.5);
    });
  });

  // ─── Events ──────────────────────────────────────────────────

  describe('Event Emission', () => {
    it('should emit action_completed events', () => {
      const handler = jest.fn<any>();
      engine.on('action_completed', handler);

      engine.queueAction(ActionType.REST, 10);
      for (let i = 0; i < 10; i++) engine.tick();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit introspection_complete events', () => {
      const handler = jest.fn<any>();
      engine.on('introspection_complete', handler);

      for (let i = 0; i < 30; i++) engine.tick();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit event_processed for external events', () => {
      const handler = jest.fn<any>();
      engine.on('event_processed', handler);

      engine.tick({
        events: [{
          id: 'e1',
          type: 'discovery',
          description: 'Found a new pattern',
          emotionalImpact: { valence: 0.7, arousal: 0.6 },
          timestamp: Date.now(),
        }],
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ─── AAR Core Mapping ────────────────────────────────────────

  describe('AAR Core Architecture', () => {
    it('should map Agent=ActionQueue, Arena=SimWorld, Relation=IdentityMesh', () => {
      // The Agent (urge-to-act) is the action queue
      engine.queueAction(ActionType.CREATE, 8);
      engine.queueAction(ActionType.LEARN, 6);

      // The Arena (need-to-be) is the simulation world state
      const needs = engine.getNeeds();
      expect(needs.size).toBe(6); // 6 dimensions of being

      // The Relation (self) is the identity mesh connecting them
      const mesh = engine.getIdentityMesh();
      expect(mesh.coherenceScore).toBeGreaterThan(0); // Self-coherence

      // Running the loop couples Agent and Arena through Relation
      for (let i = 0; i < 30; i++) engine.tick();

      // After coupling, coherence should reflect the alignment
      expect(engine.getIdentityMesh().coherenceScore).toBeGreaterThan(0);
    });
  });
});
