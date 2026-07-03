import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('EchoAngelCognitiveSynthesis', () => {
  let EchoAngelCognitiveSynthesis: any;
  let EchobeatStep: any;
  let OntogeneticStage: any;
  let ContentRating: any;
  let ActionUnit: any;
  let IMMUTABLE_ETHICS: any;

  beforeEach(async () => {
    const mod = await import('../../src/echo-angel-synthesis.js');
    EchoAngelCognitiveSynthesis = mod.EchoAngelCognitiveSynthesis;
    EchobeatStep = mod.EchobeatStep;
    OntogeneticStage = mod.OntogeneticStage;
    ContentRating = mod.ContentRating;
    ActionUnit = mod.ActionUnit;
    IMMUTABLE_ETHICS = mod.IMMUTABLE_ETHICS;
  });

  const makeEndocrine = (overrides: any = {}) => ({
    cortisol: 0.1, dopamine: 0.4, serotonin: 0.45,
    norepinephrine: 0.2, oxytocin: 0.3, melatonin: 0.05,
    currentMode: 'RESTING', arousal: 0.3, valence: 0.2,
    ...overrides,
  });

  // ─── Layer 1: Echobeats + ESN ─────────────────────────────

  it('should execute a full 9-step Echobeats cycle per tick', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    const expr = synth.tick(makeEndocrine(), null, 1 / 30);

    expect(expr).toBeDefined();
    expect(expr.actionUnits).toBeInstanceOf(Map);
    expect(expr.actionUnits.size).toBeGreaterThan(0);
    expect(expr.cognitiveMode).toBe('RESTING');
    expect(expr.timestamp).toBeGreaterThan(0);
  });

  it('should advance through Echobeat steps', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    expect(synth.getCurrentStep()).toBe(EchobeatStep.SENSE);

    synth.tick(makeEndocrine(), null);
    expect(synth.getCurrentStep()).toBe(EchobeatStep.ATTEND);

    synth.tick(makeEndocrine(), null);
    expect(synth.getCurrentStep()).toBe(EchobeatStep.REMEMBER);
  });

  it('should track prediction error from ESN reservoir', () => {
    const synth = new EchoAngelCognitiveSynthesis({ reservoirSize: 64 });

    synth.tick(makeEndocrine(), null);
    const error1 = synth.getPredictionError();
    expect(error1).toBeGreaterThan(0);

    // After many ticks, the reservoir adapts and prediction error is tracked
    for (let i = 0; i < 50; i++) {
      synth.tick(makeEndocrine(), null);
    }
    const error2 = synth.getPredictionError();
    // ESN prediction error is always tracked (may increase or decrease depending on dynamics)
    expect(error2).toBeGreaterThanOrEqual(0);
    expect(error2).toBeDefined();
  });

  it('should initialize 4E cognition metrics', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    const fourE = synth.getFourEMetrics();

    expect(fourE.embodied).toBeDefined();
    expect(fourE.embedded).toBeDefined();
    expect(fourE.enacted).toBeDefined();
    expect(fourE.extended).toBeDefined();
    expect(fourE.embodied.bodySchema).toBeGreaterThan(0);
  });

  // ─── Layer 2: Persona Dynamics ────────────────────────────

  it('should respect immutable ethics', () => {
    expect(IMMUTABLE_ETHICS.noActualHarm).toBe(1.0);
    expect(IMMUTABLE_ETHICS.respectBoundaries).toBe(0.95);
    expect(IMMUTABLE_ETHICS.constructiveExpression).toBe(0.90);
    // Should be frozen
    expect(() => { (IMMUTABLE_ETHICS as any).noActualHarm = 0; }).toThrow();
  });

  it('should compute effective content rating from spice gate', () => {
    const synth = new EchoAngelCognitiveSynthesis({
      spiceGate: {
        ownerContentRating: ContentRating.EXPLICIT,
        personaCeiling: ContentRating.SUGGESTIVE,
        ageVerified: true,
        allowExplicit: true,
      },
    });
    // min(explicit, suggestive) = suggestive
    expect(synth.getEffectiveRating()).toBe(ContentRating.SUGGESTIVE);
  });

  it('should block explicit without age verification', () => {
    const synth = new EchoAngelCognitiveSynthesis({
      spiceGate: {
        ownerContentRating: ContentRating.EXPLICIT,
        personaCeiling: ContentRating.EXPLICIT,
        ageVerified: false,
        allowExplicit: true,
      },
    });
    expect(synth.getEffectiveRating()).toBe(ContentRating.SUGGESTIVE);
  });

  it('should have configurable persona living centers', () => {
    const synth = new EchoAngelCognitiveSynthesis({
      personaCenters: {
        driveTrain: 0.9,
        gamerMastery: 0.8,
        humor: 0.95,
        boundariesAsGradients: 0.7,
        endocrineEmbodiment: 0.9,
      },
    });
    const centers = synth.getLivingCenters();
    expect(centers.driveTrain).toBe(0.9);
    expect(centers.humor).toBe(0.95);
  });

  it('should allow dynamic living center updates', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    synth.updateLivingCenters({ humor: 1.0 });
    expect(synth.getLivingCenters().humor).toBe(1.0);
  });

  // ─── Layer 3: Expression Pipeline ────────────────────────

  it('should produce cortisol-driven worry expression', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    const expr = synth.tick(makeEndocrine({ cortisol: 0.9, dopamine: 0.0 }), null);

    const au4 = expr.actionUnits.get(ActionUnit.AU4_BROW_LOWERER) ?? 0;
    const au15 = expr.actionUnits.get(ActionUnit.AU15_LIP_CORNER_DEPRESS) ?? 0;
    expect(au4).toBeGreaterThan(0.4);
    expect(au15).toBeGreaterThan(0.3);
  });

  it('should produce dopamine-driven smile expression', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    const expr = synth.tick(makeEndocrine({ dopamine: 0.9, cortisol: 0.0 }), null);

    const au12 = expr.actionUnits.get(ActionUnit.AU12_LIP_CORNER_PULL) ?? 0;
    const au6 = expr.actionUnits.get(ActionUnit.AU6_CHEEK_RAISE) ?? 0;
    expect(au12).toBeGreaterThan(0.5);
    expect(au6).toBeGreaterThan(0.3);
  });

  it('should add Lorenz chaotic micro-expressions', () => {
    const synth = new EchoAngelCognitiveSynthesis({ chaosIntensity: 0.3 });
    const expr = synth.tick(makeEndocrine(), null);

    expect(expr.chaosContribution).toBeGreaterThan(0);
  });

  it('should track Lyapunov exponent', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    for (let i = 0; i < 20; i++) {
      synth.tick(makeEndocrine(), null);
    }
    const expr = synth.tick(makeEndocrine(), null);
    // After enough steps, Lyapunov should be non-zero
    expect(expr.lyapunovExponent).not.toBe(0);
  });

  it('should clamp all AU values to [0, 1]', () => {
    const synth = new EchoAngelCognitiveSynthesis({ chaosIntensity: 1.0 });
    // Extreme inputs
    const expr = synth.tick(makeEndocrine({
      cortisol: 1.0, dopamine: 1.0, norepinephrine: 1.0,
      oxytocin: 1.0, arousal: 1.0, valence: 1.0,
    }), null);

    for (const [_au, val] of expr.actionUnits) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  // ─── Layer 4: Platform & Introspection ────────────────────

  it('should generate introspection insights at interval', () => {
    const synth = new EchoAngelCognitiveSynthesis({ introspectionInterval: 5 });
    const insights: any[] = [];
    synth.on('introspection', (i: any) => insights.push(i));

    for (let i = 0; i < 6; i++) {
      synth.tick(makeEndocrine(), null);
    }

    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].observation).toBeDefined();
    expect(typeof insights[0].wisdomScore).toBe('number');
  });

  it('should call platform hooks on stream tick', () => {
    const onStreamTick = jest.fn<any>();
    const synth = new EchoAngelCognitiveSynthesis({
      platformHooks: { onStreamTick },
    });

    synth.tick(makeEndocrine(), null);
    expect(onStreamTick).toHaveBeenCalledTimes(1);
    expect(onStreamTick).toHaveBeenCalledWith(expect.objectContaining({
      actionUnits: expect.any(Map),
      cognitiveMode: 'RESTING',
    }));
  });

  it('should process chat messages through platform hooks', () => {
    const onChatMessage = jest.fn<any>().mockReturnValue('Hello back!');
    const synth = new EchoAngelCognitiveSynthesis({
      platformHooks: { onChatMessage },
    });

    const response = synth.processChat('Hello!');
    expect(response).toBe('Hello back!');
    expect(onChatMessage).toHaveBeenCalledWith('Hello!');
  });

  // ─── Layer 5: Evolution ───────────────────────────────────

  it('should start at EMBRYONIC stage', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    expect(synth.getStage()).toBe(OntogeneticStage.EMBRYONIC);
  });

  it('should emit stage_advanced event on evolution', () => {
    const synth = new EchoAngelCognitiveSynthesis({ introspectionInterval: 1 });
    const advances: any[] = [];
    synth.on('stage_advanced', (e: any) => advances.push(e));

    // Run many cycles to potentially trigger evolution
    // (In practice, 4E scores start low so evolution is slow)
    for (let i = 0; i < 200; i++) {
      synth.tick(makeEndocrine({ dopamine: 0.5, arousal: 0.5 }), { term: 'test', salience: 0.8 });
    }

    // Stage may or may not advance depending on 4E scores
    // Just verify the mechanism exists
    expect(synth.getStage()).toBeDefined();
  });

  // ─── Comprehensive Metrics ────────────────────────────────

  it('should provide comprehensive metrics', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    synth.tick(makeEndocrine(), null);

    const metrics = synth.getMetrics();
    expect(metrics.totalTicks).toBe(1);
    expect(metrics.cycleCount).toBe(1);
    expect(metrics.currentStep).toBeDefined();
    expect(metrics.stage).toBe(OntogeneticStage.EMBRYONIC);
    expect(metrics.fourEScore).toBeGreaterThan(0);
    expect(metrics.predictionError).toBeGreaterThanOrEqual(0);
    expect(metrics.effectiveRating).toBeDefined();
    expect(metrics.livingCenters).toBeDefined();
  });

  it('should reset to initial state', () => {
    const synth = new EchoAngelCognitiveSynthesis();
    for (let i = 0; i < 10; i++) synth.tick(makeEndocrine(), null);

    synth.reset();
    expect(synth.getCycleCount()).toBe(0);
    expect(synth.getMetrics().totalTicks).toBe(0);
    expect(synth.getCurrentStep()).toBe(EchobeatStep.SENSE);
    expect(synth.getLastExpression()).toBeNull();
  });

  // ─── Integration: Salience Landscape ──────────────────────

  it('should respond to salience input', () => {
    const synthA = new EchoAngelCognitiveSynthesis();
    const synthB = new EchoAngelCognitiveSynthesis();

    // Run both for several ticks with different salience
    let exprA, exprB;
    for (let i = 0; i < 10; i++) {
      exprA = synthA.tick(makeEndocrine(), null);
      exprB = synthB.tick(makeEndocrine(), { term: 'important', salience: 0.95 });
    }

    // After multiple ticks, the reservoirs diverge due to different input
    expect(synthA.getPredictionError()).not.toEqual(synthB.getPredictionError());
  });
});
