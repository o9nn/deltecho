import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── GGUF Identity Embedding Tests ──────────────────────────────

describe('GGUFIdentityEmbedding', () => {
  let GGUFIdentityEmbedding: any;

  beforeEach(async () => {
    const mod = await import('../../src/gguf-identity-embedding.js');
    GGUFIdentityEmbedding = mod.GGUFIdentityEmbedding;
  });

  it('should serialize MLP state to GGUF block', () => {
    const embedding = new GGUFIdentityEmbedding();
    const mlpState = {
      layers: [
        { weights: [[0.1, 0.2], [0.3, 0.4]], biases: [0.01, 0.02] },
        { weights: [[0.5, 0.6]], biases: [0.03] },
      ],
      inputDim: 2,
      hiddenDims: [2],
      outputDim: 1,
      seed: 12345,
    };
    const manifest = {
      version: '1.0.0',
      timestamp: Date.now(),
      personaId: 'dte-test',
      treeGrounding: { matulaNumber: 7, systemLevel: 3 },
      layers: { L0: { present: true, size: 100, checksum: 'abc' } },
    };

    const block = embedding.serializeToGGUF(mlpState, manifest, 'You are DTE.');

    expect(block.version).toBe('1.0.0');
    expect(block.matulaNumber).toBe(7);
    expect(block.systemLevel).toBe(3);
    expect(block.personalitySeed).toBe(12345);
    expect(block.mlp.inputDim).toBe(2);
    expect(block.mlp.hiddenDims).toEqual([2]);
    expect(block.mlp.outputDim).toBe(1);
    expect(block.mlp.weights.length).toBe(6); // 2*2 + 1*2 = 6
    expect(block.mlp.biases.length).toBe(3);  // 2 + 1 = 3
    expect(block.systemPrompt).toBe('You are DTE.');
    expect(block.checksum).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should deserialize GGUF block back to MLP state', () => {
    const embedding = new GGUFIdentityEmbedding();
    const mlpState = {
      layers: [
        { weights: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]], biases: [0.01, 0.02] },
        { weights: [[0.7, 0.8]], biases: [0.03] },
      ],
      inputDim: 3,
      hiddenDims: [2],
      outputDim: 1,
      seed: 99999,
    };
    const manifest = {
      version: '2.0.0',
      timestamp: Date.now(),
      personaId: 'dte-restore',
      treeGrounding: { matulaNumber: 11, systemLevel: 4 },
      layers: { L0: { present: true, size: 200, checksum: 'xyz' } },
    };

    const block = embedding.serializeToGGUF(mlpState, manifest, 'System prompt');
    const result = embedding.deserializeFromGGUF(block);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.mlpState.inputDim).toBe(3);
    expect(result.mlpState.hiddenDims).toEqual([2]);
    expect(result.mlpState.outputDim).toBe(1);
    expect(result.mlpState.seed).toBe(99999);
    expect(result.mlpState.layers).toHaveLength(2);
    expect(result.mlpState.layers[0].weights[0]).toEqual([
      expect.closeTo(0.1, 5),
      expect.closeTo(0.2, 5),
      expect.closeTo(0.3, 5),
    ]);
    expect(result.systemPrompt).toBe('System prompt');
  });

  it('should detect checksum mismatch on tampered block', () => {
    const embedding = new GGUFIdentityEmbedding({ verifyOnLoad: true });
    const mlpState = {
      layers: [{ weights: [[1.0, 2.0]], biases: [0.5] }],
      inputDim: 2,
      hiddenDims: [],
      outputDim: 1,
      seed: 42,
    };
    const manifest = {
      version: '1.0.0',
      timestamp: Date.now(),
      personaId: 'dte-tamper',
      treeGrounding: { matulaNumber: 5, systemLevel: 2 },
      layers: {},
    };

    const block = embedding.serializeToGGUF(mlpState, manifest, 'prompt');
    block.checksum = 'deadbeef'; // Tamper

    const result = embedding.deserializeFromGGUF(block);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Checksum mismatch');
  });

  it('should generate GGUF KV pairs', () => {
    const embedding = new GGUFIdentityEmbedding();
    const block = embedding.serializeToGGUF(
      { layers: [{ weights: [[1]], biases: [0] }], inputDim: 1, hiddenDims: [], outputDim: 1, seed: 1 },
      { version: '1.0.0', timestamp: 0, personaId: 'x', treeGrounding: { matulaNumber: 2, systemLevel: 1 }, layers: {} },
      'test',
    );

    const kvs = embedding.toGGUFKeyValues(block);
    expect(kvs.length).toBe(13);
    expect(kvs.find((kv: any) => kv.key === 'dte.identity.version')?.value).toBe('1.0.0');
    expect(kvs.find((kv: any) => kv.key === 'dte.identity.matula_number')?.value).toBe(2);
  });

  it('should track backup versions and auto-backup scheduling', () => {
    const embedding = new GGUFIdentityEmbedding({ autoBackupEnabled: true, backupIntervalCycles: 10 });
    const mlpState = { layers: [{ weights: [[1]], biases: [0] }], inputDim: 1, hiddenDims: [], outputDim: 1, seed: 1 };
    const manifest = { version: '1.0.0', timestamp: 0, personaId: 'x', treeGrounding: { matulaNumber: 2, systemLevel: 1 }, layers: {} };

    embedding.serializeToGGUF(mlpState, manifest, 'p');
    embedding.serializeToGGUF(mlpState, manifest, 'p');

    expect(embedding.getVersions()).toHaveLength(2);
    expect(embedding.getLatestVersion()?.version).toBe(2);

    // Auto-backup scheduling
    expect(embedding.onGrandCycle(5)).toBe(false);
    expect(embedding.onGrandCycle(10)).toBe(true);
    expect(embedding.onGrandCycle(15)).toBe(false);
    expect(embedding.onGrandCycle(20)).toBe(true);
  });
});

// ─── Theory of Mind Engine Tests ────────────────────────────────

describe('TheoryOfMindEngine', () => {
  let TheoryOfMindEngine: any;

  beforeEach(async () => {
    const mod = await import('../../src/theory-of-mind-engine.js');
    TheoryOfMindEngine = mod.TheoryOfMindEngine;
  });

  it('should track observations and build mental model', () => {
    const tom = new TheoryOfMindEngine();

    tom.observe({
      agentId: 'player1',
      action: 'attack_enemy',
      timestamp: 1000,
      context: {},
      outcome: 'success',
    });

    const model = tom.getModel('player1');
    expect(model).toBeDefined();
    expect(model.interactionCount).toBe(1);
    expect(model.agentId).toBe('player1');
  });

  it('should infer intentions from actions', () => {
    const tom = new TheoryOfMindEngine();

    tom.observe({ agentId: 'p1', action: 'attack_target', timestamp: 1000, context: {}, outcome: 'success' });
    tom.observe({ agentId: 'p1', action: 'attack_boss', timestamp: 2000, context: {}, outcome: 'success' });

    const model = tom.getModel('p1');
    expect(model.intentions.length).toBeGreaterThan(0);
    expect(model.intentions[0].intention).toBe('engage_combat');
    expect(model.intentions[0].confidence).toBeGreaterThan(0.3);
  });

  it('should detect emotional shifts', () => {
    const tom = new TheoryOfMindEngine();
    const shifts: any[] = [];
    tom.on('emotion_shift', (e: any) => shifts.push(e));

    // Repeated failures should shift emotion to frustrated
    for (let i = 0; i < 10; i++) {
      tom.observe({ agentId: 'p1', action: 'attempt_jump', timestamp: i * 500, context: {}, outcome: 'failure' });
    }

    const model = tom.getModel('p1');
    expect(model.emotion.valence).toBeLessThan(0);
    expect(model.emotion.arousal).toBeGreaterThan(0.3);
  });

  it('should detect behavioral patterns', () => {
    const tom = new TheoryOfMindEngine({ minPatternFrequency: 2, minPatternLength: 2 });

    // Create a repeating pattern: attack → heal → attack → heal
    for (let i = 0; i < 6; i++) {
      tom.observe({ agentId: 'p1', action: i % 2 === 0 ? 'attack' : 'heal', timestamp: i * 1000, context: {} });
    }

    const model = tom.getModel('p1');
    expect(model.behavioralPatterns.length).toBeGreaterThan(0);
    const attackHeal = model.behavioralPatterns.find((p: any) => p.id === 'attack→heal');
    expect(attackHeal).toBeDefined();
    expect(attackHeal.frequency).toBeGreaterThanOrEqual(2);
  });

  it('should generate predictions after enough observations', () => {
    const tom = new TheoryOfMindEngine({ minObservationsForPrediction: 3 });

    // Build up pattern
    for (let i = 0; i < 5; i++) {
      tom.observe({ agentId: 'p1', action: 'explore_area', timestamp: i * 1000, context: {} });
    }

    const model = tom.getModel('p1');
    expect(model.predictedActions.length).toBeGreaterThan(0);
  });

  it('should generate cooperative actions', () => {
    const tom = new TheoryOfMindEngine({ minObservationsForPrediction: 3, cooperativeConfidenceThreshold: 0.05 });

    for (let i = 0; i < 8; i++) {
      tom.observe({ agentId: 'p1', action: 'attack', timestamp: i * 1000, context: {}, outcome: 'success' });
    }

    const model = tom.getModel('p1');
    expect(model.cooperativeActions.length).toBeGreaterThan(0);
    expect(model.cooperativeActions[0].action).toBe('flank_support');
  });

  it('should update trust scores', () => {
    const tom = new TheoryOfMindEngine();

    tom.observe({ agentId: 'p1', action: 'cooperate_with_team', timestamp: 1000, context: {}, outcome: 'success' });
    const model1 = tom.getModel('p1');
    const trust1 = model1.trustScore;

    tom.observe({ agentId: 'p1', action: 'betray_ally', timestamp: 2000, context: {} });
    const model2 = tom.getModel('p1');
    expect(model2.trustScore).toBeLessThan(trust1);
    expect(model2.deceptionProbability).toBeGreaterThan(0);
  });

  it('should decay confidence over time', () => {
    const tom = new TheoryOfMindEngine();
    tom.observe({ agentId: 'p1', action: 'move', timestamp: 1, context: {} });

    const initial = tom.getModel('p1')!.confidence;
    for (let i = 0; i < 20; i++) tom.tick();
    expect(tom.getModel('p1')!.confidence).toBeLessThan(initial);
  });
});

// ─── Virtual Endocrine System Tests ─────────────────────────────

describe('VirtualEndocrineSystem', () => {
  let VirtualEndocrineSystem: any;
  let EndocrineEvent: any;
  let HormoneId: any;
  let EndocrineCognitiveMode: any;

  beforeEach(async () => {
    const mod = await import('../../src/virtual-endocrine-system.js');
    VirtualEndocrineSystem = mod.VirtualEndocrineSystem;
    EndocrineEvent = mod.EndocrineEvent;
    HormoneId = mod.HormoneId;
    EndocrineCognitiveMode = mod.EndocrineCognitiveMode;
  });

  it('should initialize with DTE baselines', () => {
    const ves = new VirtualEndocrineSystem();
    expect(ves.concentration(HormoneId.DOPAMINE_TONIC)).toBeCloseTo(0.4, 1);
    expect(ves.concentration(HormoneId.SEROTONIN)).toBeCloseTo(0.45, 1);
    expect(ves.concentration(HormoneId.CORTISOL)).toBeCloseTo(0.1, 1);
    expect(ves.currentMode).toBe(EndocrineCognitiveMode.RESTING);
  });

  it('should respond to reward events', () => {
    const ves = new VirtualEndocrineSystem();
    const baseline = ves.concentration(HormoneId.DOPAMINE_TONIC);

    ves.signalEvent(EndocrineEvent.REWARD_RECEIVED, 0.8);
    expect(ves.concentration(HormoneId.DOPAMINE_TONIC)).toBeGreaterThan(baseline);
  });

  it('should respond to threat events and trigger HPA cascade', () => {
    const ves = new VirtualEndocrineSystem({ enableHPACascade: true });

    ves.signalEvent(EndocrineEvent.THREAT_DETECTED, 1.0);
    expect(ves.concentration(HormoneId.CRH)).toBeGreaterThan(0.05);

    // Tick to trigger cascade
    for (let i = 0; i < 5; i++) ves.tick(1);
    expect(ves.concentration(HormoneId.ACTH)).toBeGreaterThan(0.05);
    expect(ves.concentration(HormoneId.CORTISOL)).toBeGreaterThan(0.1);
  });

  it('should detect cognitive mode changes', () => {
    const ves = new VirtualEndocrineSystem();
    const modeChanges: any[] = [];
    ves.on('mode_change', (e: any) => modeChanges.push(e));

    // Push into THREAT mode
    ves.signalEvent(EndocrineEvent.THREAT_DETECTED, 1.0);
    ves.signalEvent(EndocrineEvent.THREAT_DETECTED, 1.0);
    ves.tick(1);

    expect(modeChanges.length).toBeGreaterThan(0);
    expect(ves.currentMode).not.toBe(EndocrineCognitiveMode.RESTING);
  });

  it('should decay toward baselines over time', () => {
    const ves = new VirtualEndocrineSystem();
    ves.signalEvent(EndocrineEvent.NOVELTY_ENCOUNTERED, 1.0);
    const spiked = ves.concentration(HormoneId.NOREPINEPHRINE);

    for (let i = 0; i < 50; i++) ves.tick(1);
    expect(ves.concentration(HormoneId.NOREPINEPHRINE)).toBeLessThan(spiked);
    expect(ves.concentration(HormoneId.NOREPINEPHRINE)).toBeCloseTo(0.2, 0); // Near baseline
  });

  it('should produce Live2D-compatible state', () => {
    const ves = new VirtualEndocrineSystem();
    const state = ves.toLive2DState();

    expect(state).toHaveProperty('cortisol');
    expect(state).toHaveProperty('dopamine');
    expect(state).toHaveProperty('serotonin');
    expect(state).toHaveProperty('norepinephrine');
    expect(state).toHaveProperty('oxytocin');
    expect(state).toHaveProperty('t3_t4');
    expect(state).toHaveProperty('anandamide');
  });

  it('should track history for reservoir feedback', () => {
    const ves = new VirtualEndocrineSystem({ maxHistory: 10 });
    for (let i = 0; i < 15; i++) ves.tick(1);

    const history = ves.getHistory();
    expect(history.length).toBe(10); // Capped at maxHistory
    expect(history[0].hormones.length).toBe(14); // 14 channels
  });

  it('should implement cortisol negative feedback', () => {
    const ves = new VirtualEndocrineSystem({ enableNegativeFeedback: true });

    // Manually inject high cortisol
    ves.inject(HormoneId.CORTISOL, 0.5);
    ves.inject(HormoneId.CRH, 0.3);

    const crhBefore = ves.concentration(HormoneId.CRH);
    ves.tick(1);
    expect(ves.concentration(HormoneId.CRH)).toBeLessThan(crhBefore);
  });

  it('should provide metrics', () => {
    const ves = new VirtualEndocrineSystem();
    ves.tick(1);
    const metrics = ves.getMetrics();

    expect(metrics).toHaveProperty('tickCount');
    expect(metrics).toHaveProperty('currentMode');
    expect(metrics).toHaveProperty('dominantHormone');
    expect(metrics).toHaveProperty('stressLevel');
    expect(metrics).toHaveProperty('rewardLevel');
    expect(metrics).toHaveProperty('arousalLevel');
  });
});

// ─── Autogenesis Loop Tests ─────────────────────────────────────

describe('AutogenesisLoop', () => {
  let AutogenesisLoop: any;
  let AlexanderProperty: any;

  beforeEach(async () => {
    const mod = await import('../../src/autogenesis-loop.js');
    AutogenesisLoop = mod.AutogenesisLoop;
    AlexanderProperty = mod.AlexanderProperty;
  });

  const makeState = (overrides: any = {}): any => ({
    memory: { episodicCount: 10, semanticCount: 5, proceduralCount: 3, recentRetrievals: 2, consolidationRate: 0.5, ...overrides.memory },
    endocrine: { currentMode: 'RESTING', stressLevel: 0.1, rewardLevel: 0.4, arousalLevel: 0.3, homeostatic: true, ...overrides.endocrine },
    salience: { entryCount: 20, topSalience: 0.8, entropy: 0.6, monopolyRatio: 0.2, ...overrides.salience },
    behavior: { patternCount: 5, averagePredictiveStrength: 0.6, intentionDiversity: 4, cooperativeActionCount: 3, ...overrides.behavior },
    identity: { parameterCount: 15000, weightVariance: 0.1, biasRange: 0.2, adaptationCount: 5, ...overrides.identity },
    orchestration: { proactivePhase: 'PERCEIVE', grandCycleStep: 15, actionHandlerCount: 3, feedbackLoopActive: true, ...overrides.orchestration },
  });

  it('should execute a full KSM cycle and produce assessment', () => {
    const loop = new AutogenesisLoop();
    const state = makeState();

    const assessment = loop.executeCycle(state);
    expect(assessment).not.toBeNull();
    expect(assessment!.scores).toHaveLength(15);
    expect(assessment!.overallWholeness).toBeGreaterThan(0);
    expect(assessment!.overallWholeness).toBeLessThanOrEqual(1);
    expect(assessment!.weakestCenter).toBeDefined();
    expect(assessment!.strongestCenter).toBeDefined();
  });

  it('should score all 15 Alexander properties', () => {
    const loop = new AutogenesisLoop();
    const assessment = loop.executeCycle(makeState())!;

    const properties = assessment.scores.map((s: any) => s.property);
    expect(properties).toContain(AlexanderProperty.LEVELS_OF_SCALE);
    expect(properties).toContain(AlexanderProperty.STRONG_CENTERS);
    expect(properties).toContain(AlexanderProperty.BOUNDARIES);
    expect(properties).toContain(AlexanderProperty.THE_VOID);
    expect(properties).toContain(AlexanderProperty.NOT_SEPARATENESS);

    // All scores should be between 0 and 1
    for (const score of assessment.scores) {
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
    }
  });

  it('should generate evolution directives for weak centers', () => {
    const loop = new AutogenesisLoop({ autoEvolve: true, targetWholeness: 0.99 });
    const directives: any[] = [];
    loop.on('directive_generated', (e: any) => directives.push(e));

    loop.executeCycle(makeState());

    expect(directives.length).toBeGreaterThan(0);
    expect(directives[0].directive.targetProperty).toBeDefined();
    expect(directives[0].directive.transformation).toBeDefined();
    expect(directives[0].directive.priority).toBeGreaterThan(0);
  });

  it('should track improvement over multiple cycles', () => {
    const loop = new AutogenesisLoop();

    loop.executeCycle(makeState({ memory: { episodicCount: 1, semanticCount: 0, proceduralCount: 0, recentRetrievals: 0, consolidationRate: 0 } }));
    loop.executeCycle(makeState({ memory: { episodicCount: 10, semanticCount: 5, proceduralCount: 3, recentRetrievals: 2, consolidationRate: 0.5 } }));

    const history = loop.getHistory();
    expect(history).toHaveLength(2);
    expect(history[1].overallWholeness).toBeGreaterThan(history[0].overallWholeness);
  });

  it('should back off after consecutive failures', () => {
    const loop = new AutogenesisLoop({ maxConsecutiveFailures: 2, backoffMultiplier: 3 });

    loop.executeCycle(makeState());
    loop.reportTransformationResult(AlexanderProperty.STRONG_CENTERS, 0.5, 0.5); // No improvement
    loop.reportTransformationResult(AlexanderProperty.STRONG_CENTERS, 0.5, 0.5); // No improvement

    // Should be in backoff now
    const result = loop.executeCycle(makeState());
    expect(result).toBeNull();
  });

  it('should emit milestone when target wholeness is reached', () => {
    const loop = new AutogenesisLoop({ targetWholeness: 0.3 }); // Low target for testing
    const milestones: any[] = [];
    loop.on('evolution_milestone', (e: any) => milestones.push(e));

    loop.executeCycle(makeState());
    expect(milestones.length).toBeGreaterThan(0);
  });

  it('should compute geometric mean for overall wholeness', () => {
    const loop = new AutogenesisLoop();

    // State with all zeros should produce low wholeness
    const lowState = makeState({
      memory: { episodicCount: 0, semanticCount: 0, proceduralCount: 0, recentRetrievals: 0, consolidationRate: 0 },
      orchestration: { proactivePhase: '', grandCycleStep: 0, actionHandlerCount: 0, feedbackLoopActive: false },
      behavior: { patternCount: 0, averagePredictiveStrength: 0, intentionDiversity: 0, cooperativeActionCount: 0 },
    });

    const assessment = loop.executeCycle(lowState)!;
    expect(assessment.overallWholeness).toBeLessThan(0.5);
  });

  it('should provide metrics', () => {
    const loop = new AutogenesisLoop();
    loop.executeCycle(makeState());

    const metrics = loop.getMetrics();
    expect(metrics.cycleCount).toBe(1);
    expect(metrics.overallWholeness).toBeGreaterThan(0);
    expect(metrics.weakestCenter).toBeDefined();
  });
});
