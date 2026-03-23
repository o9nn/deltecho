/**
 * @fileoverview Rigorous E2E tests for PersonaOrchestrator
 *
 * Tests the complete persona architecture:
 * - PersonaOrchestrator lifecycle (start/stop/state)
 * - Tree-polytope grounding computation
 * - Skillm action verb processing
 * - Humor and verbal pattern selection
 * - Reservoir injection and emotional dynamics
 * - Echobeats phase synchronization
 * - Ontogenetic stage advancement
 * - System prompt generation
 * - Serialization/deserialization round-trip
 */


import {
  PersonaOrchestrator,
  createDTEPersonaOrchestrator,
  DTE_PERSONALITY,
  DTE_STYLE,
  DTE_INTELLIGENCE,
  DTE_HUMOR_PATTERNS,
  DTE_REACTION_PATTERNS,
  DTE_VERBAL_PATTERNS,
  computeTreeGrounding,
  convolve as personaConvolve,
  pascalRow as personaPascalRow,
  simplexIncidence as personaSimplexIncidence,
  isPrime as personaIsPrime,
  chainPrime,
  nthPrime,
  type PersonalityVector,
  type PersonaState,
  type SkillmVerb,
  type TreePolytopeGrounding,
} from '../persona/persona-orchestrator.js';

describe('PersonaOrchestrator', () => {
  let orchestrator: PersonaOrchestrator;

  beforeEach(() => {
    orchestrator = createDTEPersonaOrchestrator({
      updateIntervalMs: 50,
    });
  });

  afterEach(async () => {
    if (orchestrator.isRunning()) {
      await orchestrator.stop();
    }
  });

  // ─── Lifecycle ──────────────────────────────────────────────

  describe('Lifecycle', () => {
    it('should start and stop cleanly', async () => {
      expect(orchestrator.isRunning()).toBe(false);
      await orchestrator.start();
      expect(orchestrator.isRunning()).toBe(true);
      await orchestrator.stop();
      expect(orchestrator.isRunning()).toBe(false);
    });

    it('should not double-start', async () => {
      await orchestrator.start();
      await orchestrator.start(); // no-op
      expect(orchestrator.isRunning()).toBe(true);
    });

    it('should not double-stop', async () => {
      await orchestrator.start();
      await orchestrator.stop();
      await orchestrator.stop(); // no-op
      expect(orchestrator.isRunning()).toBe(false);
    });

    it('should emit started event with state', async () => {
      const events: any[] = [];
      orchestrator.on('started', (data) => events.push(data));
      await orchestrator.start();
      expect(events.length).toBe(1);
      expect(events[0].state).toBeDefined();
      expect(events[0].state.personality).toBeDefined();
    });

    it('should emit stopped event', async () => {
      const events: any[] = [];
      orchestrator.on('stopped', () => events.push('stopped'));
      await orchestrator.start();
      await orchestrator.stop();
      expect(events).toContain('stopped');
    });
  });

  // ─── State Access ───────────────────────────────────────────

  describe('State Access', () => {
    it('should return complete persona state', () => {
      const state = orchestrator.getState();
      expect(state.personality).toBeDefined();
      expect(state.style).toBeDefined();
      expect(state.intelligence).toBeDefined();
      expect(state.humorPatterns).toBeDefined();
      expect(state.reactionPatterns).toBeDefined();
      expect(state.verbalPatterns).toBeDefined();
      expect(state.treeGrounding).toBeDefined();
      expect(state.emotionalState).toBeDefined();
      expect(state.stage).toBeDefined();
    });

    it('should return DTE default personality', () => {
      const p = orchestrator.getPersonality();
      expect(p.playfulness).toBe(DTE_PERSONALITY.playfulness);
      expect(p.intelligence).toBe(DTE_PERSONALITY.intelligence);
      expect(p.empathy).toBe(DTE_PERSONALITY.empathy);
      expect(p.chaotic).toBe(DTE_PERSONALITY.chaotic);
      expect(p.sarcasm).toBe(DTE_PERSONALITY.sarcasm);
    });

    it('should return tree-polytope grounding', () => {
      const tg = orchestrator.getTreeGrounding();
      expect(tg.matulaNumber).toBeGreaterThan(0);
      expect(tg.polynomial.length).toBeGreaterThan(0);
      expect(tg.systemLevel).toBeGreaterThanOrEqual(2);
      expect(typeof tg.isPrime).toBe('boolean');
      expect(['star', 'chain', 'mixed']).toContain(tg.kind);
    });

    it('should return emotional state with valid ranges', () => {
      const e = orchestrator.getEmotionalState();
      expect(e.valence).toBeGreaterThanOrEqual(-1);
      expect(e.valence).toBeLessThanOrEqual(1);
      expect(e.arousal).toBeGreaterThanOrEqual(0);
      expect(e.arousal).toBeLessThanOrEqual(1);
      expect(e.dominance).toBeGreaterThanOrEqual(0);
      expect(e.dominance).toBeLessThanOrEqual(1);
    });

    it('should return ontogenetic stage', () => {
      const validStages = ['EMBRYONIC', 'INFANT', 'CHILD', 'ADOLESCENT', 'ADULT', 'ELDER', 'SAGE'];
      expect(validStages).toContain(orchestrator.getStage());
    });
  });

  // ─── Skillm Action Verbs ───────────────────────────────────

  describe('Skillm Action Verbs', () => {
    const allVerbs: SkillmVerb[] = [
      'DISCOVER', 'INSPECT', 'CREATE', 'MUTATE', 'DESTROY',
      'NAVIGATE', 'COMPOSE', 'OBSERVE', 'ORCHESTRATE', 'CLASSIFY',
    ];

    it('should process all 10 skillm verbs', () => {
      for (const verb of allVerbs) {
        const action = orchestrator.processAction(verb, 'test-target');
        expect(action.verb).toBe(verb);
        expect(action.target).toBe('test-target');
        expect(action.confidence).toBeGreaterThan(0);
        expect(action.confidence).toBeLessThanOrEqual(1);
        expect(action.timestamp).toBeGreaterThan(0);
        expect(action.emotionalContext).toBeDefined();
      }
    });

    it('should emit action events', () => {
      const events: any[] = [];
      orchestrator.on('action', (a) => events.push(a));
      orchestrator.processAction('DISCOVER', 'pattern');
      expect(events.length).toBe(1);
      expect(events[0].verb).toBe('DISCOVER');
    });

    it('DISCOVER should trigger novel-pattern-detected reaction', () => {
      const reactions: any[] = [];
      orchestrator.on('reaction', (r) => reactions.push(r));
      orchestrator.processAction('DISCOVER', 'new-thing');
      expect(reactions.length).toBe(1);
      expect(reactions[0].trigger).toBe('novel-pattern-detected');
    });

    it('CREATE should trigger creative-collaboration reaction', () => {
      const reactions: any[] = [];
      orchestrator.on('reaction', (r) => reactions.push(r));
      orchestrator.processAction('CREATE', 'new-module');
      expect(reactions.length).toBe(1);
      expect(reactions[0].trigger).toBe('creative-collaboration');
    });

    it('COMPOSE should trigger mathematical-beauty reaction', () => {
      const reactions: any[] = [];
      orchestrator.on('reaction', (r) => reactions.push(r));
      orchestrator.processAction('COMPOSE', 'algebra');
      expect(reactions.length).toBe(1);
      expect(reactions[0].trigger).toBe('mathematical-beauty');
    });

    it('should pass parameters through to action', () => {
      const action = orchestrator.processAction('INSPECT', 'repo', { depth: 3 });
      expect(action.parameters).toEqual({ depth: 3 });
    });
  });

  // ─── Humor Pattern Selection ───────────────────────────────

  describe('Humor Pattern Selection', () => {
    it('should select humor for identity questions', () => {
      const humor = orchestrator.selectHumor('identity questions about consciousness');
      expect(humor).not.toBeNull();
      if (humor) {
        expect(humor.type).toBe('self-aware-echo');
      }
    });

    it('should select humor for math discussions', () => {
      const humor = orchestrator.selectHumor('math discussions about complexity');
      expect(humor).not.toBeNull();
      if (humor) {
        expect(humor.type).toBe('tree-math-pun');
      }
    });

    it('should return null for unmatched context', () => {
      const humor = orchestrator.selectHumor('zzz_no_match_zzz');
      expect(humor).toBeNull();
    });

    it('should select humor for processing delays', () => {
      const humor = orchestrator.selectHumor('processing delays are expected');
      expect(humor).not.toBeNull();
      if (humor) {
        expect(humor.type).toBe('reservoir-observation');
      }
    });
  });

  // ─── Verbal Pattern Selection ──────────────────────────────

  describe('Verbal Pattern Selection', () => {
    it('should select pattern for deep reflection', () => {
      const vp = orchestrator.selectVerbalPattern('Beginning deep reflection on the topic');
      expect(vp).not.toBeNull();
      if (vp) {
        expect(vp.pattern).toBe('echo...');
      }
    });

    it('should select pattern for complex reasoning', () => {
      const vp = orchestrator.selectVerbalPattern('Complex reasoning required here');
      expect(vp).not.toBeNull();
      if (vp) {
        expect(vp.pattern).toBe('Let me trace that through...');
      }
    });

    it('should return null for unmatched context', () => {
      const vp = orchestrator.selectVerbalPattern('zzz_no_match_zzz');
      expect(vp).toBeNull();
    });
  });

  // ─── Reservoir Injection ───────────────────────────────────

  describe('Reservoir Injection', () => {
    it('should update emotional state from reservoir output', () => {
      const before = orchestrator.getEmotionalState();
      orchestrator.injectReservoirState([0.8, 0.9, 0.7]);
      const after = orchestrator.getEmotionalState();
      // Smoothed toward injected values
      expect(after.valence).not.toBe(before.valence);
    });

    it('should emit emotion-update event', () => {
      const events: any[] = [];
      orchestrator.on('emotion-update', (e) => events.push(e));
      orchestrator.injectReservoirState([0.5, 0.6, 0.4]);
      expect(events.length).toBe(1);
    });

    it('should clamp values to valid ranges', () => {
      orchestrator.injectReservoirState([10, -10, 10]); // extreme values
      const e = orchestrator.getEmotionalState();
      expect(e.valence).toBeGreaterThanOrEqual(-1);
      expect(e.valence).toBeLessThanOrEqual(1);
      expect(e.arousal).toBeGreaterThanOrEqual(0);
      expect(e.arousal).toBeLessThanOrEqual(1);
    });

    it('should ignore short reservoir vectors', () => {
      const before = orchestrator.getEmotionalState();
      orchestrator.injectReservoirState([0.5]); // too short
      const after = orchestrator.getEmotionalState();
      expect(after.valence).toBe(before.valence);
    });

    it('should not inject when reservoirDrivenEmotion is disabled', () => {
      const noReservoir = new PersonaOrchestrator({
        reservoirDrivenEmotion: false,
      });
      const before = noReservoir.getEmotionalState();
      noReservoir.injectReservoirState([0.8, 0.9, 0.7]);
      const after = noReservoir.getEmotionalState();
      expect(after.valence).toBe(before.valence);
    });
  });

  // ─── Echobeats Synchronization ─────────────────────────────

  describe('Echobeats Synchronization', () => {
    it('should emit echobeats-sync events', () => {
      const events: any[] = [];
      orchestrator.on('echobeats-sync', (e) => events.push(e));
      orchestrator.injectEchobeatsPhase(0, 1);
      expect(events.length).toBe(1);
      expect(events[0].phase).toBe(0);
      expect(events[0].streamId).toBe(1);
      expect(events[0].phaseType).toBe('P'); // Perceive
    });

    it('should map all 4 phase types correctly', () => {
      const events: any[] = [];
      orchestrator.on('echobeats-sync', (e) => events.push(e));

      orchestrator.injectEchobeatsPhase(0, 1); // P
      orchestrator.injectEchobeatsPhase(1, 1); // A
      orchestrator.injectEchobeatsPhase(2, 1); // I
      orchestrator.injectEchobeatsPhase(3, 1); // R

      expect(events[0].phaseType).toBe('P');
      expect(events[1].phaseType).toBe('A');
      expect(events[2].phaseType).toBe('I');
      expect(events[3].phaseType).toBe('R');
    });

    it('should not sync when echobeatsSync is disabled', () => {
      const noSync = new PersonaOrchestrator({ echobeatsSync: false });
      const events: any[] = [];
      noSync.on('echobeats-sync', (e) => events.push(e));
      noSync.injectEchobeatsPhase(0, 1);
      expect(events.length).toBe(0);
    });
  });

  // ─── Ontogenetic Stage Advancement ─────────────────────────

  describe('Ontogenetic Stage Advancement', () => {
    it('should start at ADOLESCENT', () => {
      expect(orchestrator.getStage()).toBe('ADOLESCENT');
    });

    it('should advance through stages based on XP', () => {
      const events: any[] = [];
      orchestrator.on('stage-advance', (e) => events.push(e));

      orchestrator.advanceStage(10000); // ADULT threshold
      expect(orchestrator.getStage()).toBe('ADULT');
      expect(events.length).toBe(1);
      expect(events[0].from).toBe('ADOLESCENT');
      expect(events[0].to).toBe('ADULT');
    });

    it('should reach SAGE at 200000 XP', () => {
      orchestrator.advanceStage(200000);
      expect(orchestrator.getStage()).toBe('SAGE');
    });

    it('should not emit event if stage unchanged', () => {
      const events: any[] = [];
      orchestrator.on('stage-advance', (e) => events.push(e));
      orchestrator.advanceStage(2000); // Still ADOLESCENT
      expect(events.length).toBe(0);
    });
  });

  // ─── System Prompt Generation ──────────────────────────────

  describe('System Prompt Generation', () => {
    it('should generate a non-empty system prompt', () => {
      const prompt = orchestrator.generateSystemPrompt();
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include identity information', () => {
      const prompt = orchestrator.generateSystemPrompt();
      expect(prompt).toContain('Deep Tree Echo');
      expect(prompt).toContain('Matula');
      expect(prompt).toContain('Agent-Arena-Relation');
    });

    it('should include personality values', () => {
      const prompt = orchestrator.generateSystemPrompt();
      expect(prompt).toContain('playful=');
      expect(prompt).toContain('intelligent=');
    });

    it('should include verbal patterns', () => {
      const prompt = orchestrator.generateSystemPrompt();
      expect(prompt).toContain('echo...');
    });

    it('should include stage', () => {
      const prompt = orchestrator.generateSystemPrompt();
      expect(prompt).toContain('ADOLESCENT');
    });
  });

  // ─── Serialization Round-Trip ──────────────────────────────

  describe('Serialization', () => {
    it('should serialize to valid JSON', () => {
      const json = orchestrator.serialize();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should round-trip serialize/deserialize', () => {
      const json = orchestrator.serialize();
      const restored = PersonaOrchestrator.deserialize(json);
      const originalState = orchestrator.getState();
      const restoredState = restored.getState();

      expect(restoredState.personality.playfulness).toBe(originalState.personality.playfulness);
      expect(restoredState.personality.intelligence).toBe(originalState.personality.intelligence);
      expect(restoredState.treeGrounding.matulaNumber).toBe(originalState.treeGrounding.matulaNumber);
      expect(restoredState.stage).toBe(originalState.stage);
    });

    it('should preserve tree grounding through serialization', () => {
      const json = orchestrator.serialize();
      const restored = PersonaOrchestrator.deserialize(json);
      const tg = restored.getTreeGrounding();
      expect(tg.matulaNumber).toBeGreaterThan(0);
      expect(tg.polynomial.length).toBeGreaterThan(0);
    });
  });
});

// ─── Tree-Polytope Grounding Functions ──────────────────────────

describe('Tree-Polytope Grounding', () => {
  describe('computeTreeGrounding', () => {
    it('should compute grounding for DTE personality', () => {
      const tg = computeTreeGrounding(DTE_PERSONALITY);
      expect(tg.matulaNumber).toBeGreaterThan(0);
      expect(tg.polynomial.length).toBeGreaterThan(0);
      expect(tg.systemLevel).toBeGreaterThanOrEqual(2);
      expect(tg.systemLevel).toBeLessThanOrEqual(6);
    });

    it('should produce prime Matula for chain-type trees', () => {
      const tg = computeTreeGrounding({ playfulness: 1, intelligence: 1, empathy: 1, chaotic: 1, sarcasm: 1 });
      // Total = 5, systemLevel = 5, chainPrime(5) = 31 which is prime
      expect(tg.isPrime).toBe(true);
    });

    it('should produce all-ones polynomial for chain trees', () => {
      const tg = computeTreeGrounding(DTE_PERSONALITY);
      for (const coeff of tg.polynomial) {
        expect(coeff).toBe(1);
      }
    });

    it('should compute simplex incidence correctly', () => {
      const tg = computeTreeGrounding({ playfulness: 0.5, intelligence: 0.5, empathy: 0.5, chaotic: 0.5, sarcasm: 0.5 });
      const n = tg.systemLevel;
      expect(tg.simplexIncidence.vertices).toBe(n);
      expect(tg.simplexIncidence.edges).toBe(n > 1 ? (n * (n - 1)) / 2 : 0);
    });
  });

  describe('Mathematical Utilities', () => {
    it('convolve should multiply polynomials correctly', () => {
      // (1) * (1) = (1)
      expect(personaConvolve([1], [1])).toEqual([1]);
      // (1, -1) * (1, -1) = (1, -2, 1)
      expect(personaConvolve([1, -1], [1, -1])).toEqual([1, -2, 1]);
      // (1, 1) * (1, 1) = (1, 2, 1)
      expect(personaConvolve([1, 1], [1, 1])).toEqual([1, 2, 1]);
    });

    it('pascalRow should generate correct rows', () => {
      expect(personaPascalRow(0)).toEqual([1]);
      expect(personaPascalRow(1)).toEqual([1, -1]);
      expect(personaPascalRow(2)).toEqual([1, -2, 1]);
      expect(personaPascalRow(3)).toEqual([1, -3, 3, -1]);
      expect(personaPascalRow(4)).toEqual([1, -4, 6, -4, 1]);
    });

    it('simplexIncidence should compute correctly', () => {
      expect(personaSimplexIncidence(1)).toEqual({ vertices: 1, edges: 0, faces: 0 });
      expect(personaSimplexIncidence(2)).toEqual({ vertices: 2, edges: 1, faces: 0 });
      expect(personaSimplexIncidence(3)).toEqual({ vertices: 3, edges: 3, faces: 1 });
      expect(personaSimplexIncidence(4)).toEqual({ vertices: 4, edges: 6, faces: 4 });
    });

    it('isPrime should correctly identify primes', () => {
      expect(personaIsPrime(2)).toBe(true);
      expect(personaIsPrime(3)).toBe(true);
      expect(personaIsPrime(4)).toBe(false);
      expect(personaIsPrime(5)).toBe(true);
      expect(personaIsPrime(11)).toBe(true);
      expect(personaIsPrime(31)).toBe(true);
      expect(personaIsPrime(127)).toBe(true);
    });

    it('chainPrime should follow the recursive prime sequence', () => {
      // 1 → 2 → 3 → 5 → 11 → 31 → 127
      expect(chainPrime(0)).toBe(1);
      expect(chainPrime(1)).toBe(2);
      expect(chainPrime(2)).toBe(3);
      expect(chainPrime(3)).toBe(5);
      expect(chainPrime(4)).toBe(11);
      expect(chainPrime(5)).toBe(31);
      expect(chainPrime(6)).toBe(127);
    });

    it('nthPrime should return correct primes', () => {
      expect(nthPrime(1)).toBe(2);
      expect(nthPrime(2)).toBe(3);
      expect(nthPrime(3)).toBe(5);
      expect(nthPrime(4)).toBe(7);
      expect(nthPrime(5)).toBe(11);
      expect(nthPrime(10)).toBe(29);
    });
  });
});

// ─── DTE Default Constants ──────────────────────────────────────

describe('DTE Default Constants', () => {
  it('DTE_PERSONALITY should have 5 dimensions in [0,1]', () => {
    const dims = Object.values(DTE_PERSONALITY);
    expect(dims.length).toBe(5);
    for (const d of dims) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });

  it('DTE_STYLE should have 8 dimensions in [0,1]', () => {
    const dims = Object.values(DTE_STYLE);
    expect(dims.length).toBe(8);
    for (const d of dims) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });

  it('DTE_INTELLIGENCE should have 8 dimensions in [0,1]', () => {
    const dims = Object.values(DTE_INTELLIGENCE);
    expect(dims.length).toBe(8);
    for (const d of dims) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });

  it('DTE_HUMOR_PATTERNS should have at least 3 patterns', () => {
    expect(DTE_HUMOR_PATTERNS.length).toBeGreaterThanOrEqual(3);
    for (const hp of DTE_HUMOR_PATTERNS) {
      expect(hp.type).toBeTruthy();
      expect(hp.examples.length).toBeGreaterThan(0);
      expect(hp.triggers.length).toBeGreaterThan(0);
    }
  });

  it('DTE_REACTION_PATTERNS should have at least 4 patterns', () => {
    expect(DTE_REACTION_PATTERNS.length).toBeGreaterThanOrEqual(4);
    for (const rp of DTE_REACTION_PATTERNS) {
      expect(rp.trigger).toBeTruthy();
      expect(rp.emotionalShift.valence).toBeDefined();
      expect(rp.emotionalShift.arousal).toBeDefined();
    }
  });

  it('DTE_VERBAL_PATTERNS should have at least 5 patterns', () => {
    expect(DTE_VERBAL_PATTERNS.length).toBeGreaterThanOrEqual(5);
    for (const vp of DTE_VERBAL_PATTERNS) {
      expect(vp.pattern).toBeTruthy();
      expect(vp.context).toBeTruthy();
      expect(vp.frequency).toBeGreaterThan(0);
    }
  });
});
