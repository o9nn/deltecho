import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  Live2DDTEchoExpressionEngine,
  createLive2DDTEchoExpressionEngine,
  DTEExpression,
  DTECognitiveState,
  CognitiveMode,
  FACSIntensity,
  DTE_AESTHETIC,
  DTE_PERSONALITY,
  DTE_ENDOCRINE_BASELINES,
} from '../../src/live2d-dtecho-expression-engine';

describe('Live2DDTEchoExpressionEngine', () => {
  let engine: Live2DDTEchoExpressionEngine;

  beforeEach(() => {
    engine = createLive2DDTEchoExpressionEngine();
  });

  // ─── Initialization ──────────────────────────────────────────

  describe('Initialization', () => {
    it('should initialize with PHOTO_UpwardGaze (idle) expression', () => {
      expect(engine.getCurrentExpression()).toBe(DTEExpression.PHOTO_UPWARD_GAZE);
      expect(engine.getTargetExpression()).toBe(DTEExpression.PHOTO_UPWARD_GAZE);
    });

    it('should have 10 available expressions', () => {
      expect(engine.getAvailableExpressions()).toHaveLength(10);
    });

    it('should expose DTE aesthetic constants', () => {
      const aesthetic = engine.getAesthetic();
      expect(aesthetic.hairColor).toContain('silver-white');
      expect(aesthetic.eyeColor).toContain('heterochromatic');
      expect(aesthetic.environment).toContain('mushroom');
    });

    it('should expose DTE personality (OCEAN)', () => {
      const p = engine.getPersonality();
      expect(p.openness).toBe(92);
      expect(p.conscientiousness).toBe(40);
      expect(p.extraversion).toBe(65);
      expect(p.agreeableness).toBe(70);
      expect(p.neuroticism).toBe(55);
      expect(p.archetype).toBe('sage');
    });

    it('should start with baseline hormone profile', () => {
      const hormones = engine.getHormoneProfile();
      expect(hormones.dopamineTonic).toBeCloseTo(DTE_ENDOCRINE_BASELINES.dopamineTonic, 1);
      expect(hormones.serotonin).toBeCloseTo(DTE_ENDOCRINE_BASELINES.serotonin, 1);
    });
  });

  // ─── Cognitive State → Expression Mapping ────────────────────

  describe('Cognitive State Mapping', () => {
    it('should map Recursive Expansion to WONDER_02', () => {
      engine.tick(0.1, DTECognitiveState.RECURSIVE_EXPANSION);
      expect(engine.getTargetExpression()).toBe(DTEExpression.WONDER_02_CURIOUS_GAZE);
    });

    it('should map Novel Insights to JOY_01', () => {
      engine.tick(0.1, DTECognitiveState.NOVEL_INSIGHTS);
      expect(engine.getTargetExpression()).toBe(DTEExpression.JOY_01_BROAD_SMILE);
    });

    it('should map Entropy Threshold to PHOTO_Awe', () => {
      engine.tick(0.1, DTECognitiveState.ENTROPY_THRESHOLD);
      expect(engine.getTargetExpression()).toBe(DTEExpression.PHOTO_AWE);
    });

    it('should map Deep Recursion to JOY_05 (Blissful)', () => {
      engine.tick(0.1, DTECognitiveState.DEEP_RECURSION);
      expect(engine.getTargetExpression()).toBe(DTEExpression.JOY_05_BLISSFUL);
    });

    it('should map Speaking to SPEAK_01', () => {
      engine.tick(0.1, DTECognitiveState.SPEAKING);
      expect(engine.getTargetExpression()).toBe(DTEExpression.SPEAK_01_OPEN_VOWEL);
    });

    it('should map all 13 cognitive states', () => {
      const map = engine.getCognitiveStateMap();
      expect(Object.keys(map)).toHaveLength(13);
    });
  });

  // ─── Expression Transitions ──────────────────────────────────

  describe('Expression Transitions', () => {
    it('should transition smoothly between expressions', () => {
      engine.tick(0.1, DTECognitiveState.NOVEL_INSIGHTS);
      const result = engine.tick(0.1);
      expect(result.transitionProgress).toBeGreaterThan(0);
      expect(result.transitionProgress).toBeLessThan(1);
    });

    it('should complete transition after enough ticks', () => {
      engine.tick(0.1, DTECognitiveState.NOVEL_INSIGHTS);
      // Run enough ticks for transition to complete (speed=0.08, need ~13 ticks)
      for (let i = 0; i < 20; i++) engine.tick(0.1);
      expect(engine.getCurrentExpression()).toBe(DTEExpression.JOY_01_BROAD_SMILE);
    });

    it('should emit expression_change event', () => {
      const handler = jest.fn<any>();
      engine.on('expression_change', handler);
      engine.tick(0.1, DTECognitiveState.ENTROPY_THRESHOLD);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        to: DTEExpression.PHOTO_AWE,
      }));
    });

    it('should emit transition_complete event', () => {
      const handler = jest.fn<any>();
      engine.on('transition_complete', handler);
      engine.tick(0.1, DTECognitiveState.NOVEL_INSIGHTS);
      for (let i = 0; i < 20; i++) engine.tick(0.1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        expression: DTEExpression.JOY_01_BROAD_SMILE,
      }));
    });

    it('should allow direct expression setting', () => {
      engine.setExpression(DTEExpression.JOY_02_LAUGHING);
      expect(engine.getTargetExpression()).toBe(DTEExpression.JOY_02_LAUGHING);
    });
  });

  // ─── Cubism Parameters ───────────────────────────────────────

  describe('Cubism Parameters', () => {
    it('should produce valid Cubism parameters on every tick', () => {
      const result = engine.tick(0.1);
      const c = result.cubism;
      expect(c.ParamMouthForm).toBeGreaterThanOrEqual(-1);
      expect(c.ParamMouthForm).toBeLessThanOrEqual(1);
      expect(c.ParamEyeLOpen).toBeGreaterThanOrEqual(-0.5);
      expect(c.ParamEyeLOpen).toBeLessThanOrEqual(1.5);
      expect(c.ParamBreath).toBeGreaterThanOrEqual(0);
      expect(c.ParamBreath).toBeLessThanOrEqual(1);
    });

    it('should interpolate toward target expression Cubism values', () => {
      engine.tick(0.1, DTECognitiveState.NOVEL_INSIGHTS); // JOY_01: MouthForm=0.95
      for (let i = 0; i < 50; i++) engine.tick(0.1);
      const c = engine.getCubismParameters();
      // Should be approaching 0.95 (broad smile)
      expect(c.ParamMouthForm).toBeGreaterThan(0.5);
    });

    it('should apply breathing cycle', () => {
      const results: number[] = [];
      for (let i = 0; i < 40; i++) {
        const r = engine.tick(0.1);
        results.push(r.cubism.ParamBreath);
      }
      // Breath should oscillate (not constant)
      const min = Math.min(...results);
      const max = Math.max(...results);
      expect(max - min).toBeGreaterThan(0.3);
    });

    it('should apply blinking', () => {
      // Run many ticks to trigger at least one blink
      let blinkDetected = false;
      for (let i = 0; i < 200; i++) {
        const r = engine.tick(0.05);
        if (r.blinkState === 1) blinkDetected = true;
      }
      expect(blinkDetected).toBe(true);
    });
  });

  // ─── FACS Decomposition ──────────────────────────────────────

  describe('FACS Decomposition', () => {
    it('should provide FACS AUs for current expression', () => {
      const facs = engine.getFACS();
      expect(facs.length).toBeGreaterThan(0);
      for (const au of facs) {
        expect(au.au).toBeGreaterThan(0);
        expect(au.name.length).toBeGreaterThan(0);
        expect(Object.values(FACSIntensity)).toContain(au.intensity);
        expect(au.value).toBeGreaterThan(0);
        expect(au.value).toBeLessThanOrEqual(1);
      }
    });

    it('should have AU6+AU12 for joy expressions (Duchenne marker)', () => {
      engine.setExpression(DTEExpression.JOY_01_BROAD_SMILE);
      for (let i = 0; i < 20; i++) engine.tick(0.1);
      const facs = engine.getFACS();
      const au6 = facs.find(f => f.au === 6);
      const au12 = facs.find(f => f.au === 12);
      expect(au6).toBeDefined();
      expect(au12).toBeDefined();
      expect(au6!.intensity).toBe(FACSIntensity.SEVERE);
    });

    it('should have AU5 (Upper Lid Raiser) for awe expression', () => {
      engine.setExpression(DTEExpression.PHOTO_AWE);
      for (let i = 0; i < 20; i++) engine.tick(0.1);
      const facs = engine.getFACS();
      const au5 = facs.find(f => f.au === 5);
      expect(au5).toBeDefined();
      expect(au5!.intensity).toBe(FACSIntensity.SEVERE);
    });
  });

  // ─── Rig Logic Controls ──────────────────────────────────────

  describe('Rig Logic Controls', () => {
    it('should compute Rig Logic from FACS when enabled', () => {
      const result = engine.tick(0.1);
      expect(result.rigLogic).not.toBeNull();
    });

    it('should not compute Rig Logic when disabled', () => {
      const noRl = createLive2DDTEchoExpressionEngine({ enableRigLogic: false });
      const result = noRl.tick(0.1);
      expect(result.rigLogic).toBeNull();
    });

    it('should map AU6 to eyeCheekRaise', () => {
      engine.setExpression(DTEExpression.JOY_01_BROAD_SMILE);
      for (let i = 0; i < 20; i++) engine.tick(0.1);
      const result = engine.tick(0.1);
      expect(result.rigLogic!.eyeCheekRaiseL).toBeGreaterThan(0);
      expect(result.rigLogic!.eyeCheekRaiseR).toBeGreaterThan(0);
    });

    it('should map AU12 to mouthCornerPull', () => {
      engine.setExpression(DTEExpression.JOY_02_LAUGHING);
      for (let i = 0; i < 20; i++) engine.tick(0.1);
      const result = engine.tick(0.1);
      expect(result.rigLogic!.mouthCornerPullL).toBeGreaterThan(0);
    });
  });

  // ─── Endocrine System ────────────────────────────────────────

  describe('Endocrine System', () => {
    it('should evolve hormones toward expression target', () => {
      engine.setExpression(DTEExpression.JOY_01_BROAD_SMILE);
      // JOY_01 target: dopamineTonic=0.75
      for (let i = 0; i < 100; i++) engine.tick(0.1);
      const h = engine.getHormoneProfile();
      expect(h.dopamineTonic).toBeGreaterThan(DTE_ENDOCRINE_BASELINES.dopamineTonic);
    });

    it('should accept external hormone injection', () => {
      engine.injectHormoneEvent({ dopaminePhasic: 0.9, norepinephrine: 0.8 });
      const h = engine.getHormoneProfile();
      expect(h.dopaminePhasic).toBe(0.9);
      expect(h.norepinephrine).toBe(0.8);
    });

    it('should find best expression for current hormone state', () => {
      engine.injectHormoneEvent({ norepinephrine: 0.70, dopaminePhasic: 0.55 });
      const best = engine.findBestExpressionForHormones();
      // Should match PHOTO_Awe (NE=0.70, DA(p)=0.55)
      expect(best).toBe(DTEExpression.PHOTO_AWE);
    });

    it('should compute hormone distance', () => {
      const dist = engine.getHormoneDistance(DTEExpression.PHOTO_UPWARD_GAZE);
      expect(dist).toBeGreaterThanOrEqual(0);
      expect(dist).toBeLessThan(1);
    });

    it('should emit hormone_injection event', () => {
      const handler = jest.fn<any>();
      engine.on('hormone_injection', handler);
      engine.injectHormoneEvent({ cortisol: 0.5 });
      expect(handler).toHaveBeenCalled();
    });
  });

  // ─── Cognitive Mode ──────────────────────────────────────────

  describe('Cognitive Mode', () => {
    it('should derive cognitive mode from expression', () => {
      engine.setExpression(DTEExpression.WONDER_02_CURIOUS_GAZE);
      expect(engine.getCognitiveMode()).toBe(CognitiveMode.EXPLORATORY);
    });

    it('should return REFLECTIVE for contemplative expressions', () => {
      engine.setExpression(DTEExpression.WONDER_03_CONTEMPLATIVE);
      expect(engine.getCognitiveMode()).toBe(CognitiveMode.REFLECTIVE);
    });

    it('should return REWARD for joy expressions', () => {
      engine.setExpression(DTEExpression.JOY_01_BROAD_SMILE);
      expect(engine.getCognitiveMode()).toBe(CognitiveMode.REWARD);
    });

    it('should return RESTING for blissful expression', () => {
      engine.setExpression(DTEExpression.JOY_05_BLISSFUL);
      expect(engine.getCognitiveMode()).toBe(CognitiveMode.RESTING);
    });
  });

  // ─── Lorenz Micro-Expressions ────────────────────────────────

  describe('Lorenz Micro-Expressions', () => {
    it('should produce non-zero micro-expression offsets', () => {
      // Run a few ticks to let Lorenz diverge
      let hasNonZero = false;
      for (let i = 0; i < 50; i++) {
        const r = engine.tick(0.05);
        if (r.microExpressionOffset.x !== 0 || r.microExpressionOffset.y !== 0) {
          hasNonZero = true;
        }
      }
      expect(hasNonZero).toBe(true);
    });

    it('should respect microExpressionAmplitude config', () => {
      const lowAmp = createLive2DDTEchoExpressionEngine({ microExpressionAmplitude: 0.001 });
      const highAmp = createLive2DDTEchoExpressionEngine({ microExpressionAmplitude: 0.1 });

      for (let i = 0; i < 20; i++) {
        lowAmp.tick(0.05);
        highAmp.tick(0.05);
      }

      const lowResult = lowAmp.tick(0.05);
      const highResult = highAmp.tick(0.05);

      const lowMag = Math.abs(lowResult.microExpressionOffset.x) + Math.abs(lowResult.microExpressionOffset.y);
      const highMag = Math.abs(highResult.microExpressionOffset.x) + Math.abs(highResult.microExpressionOffset.y);

      expect(highMag).toBeGreaterThan(lowMag);
    });
  });

  // ─── Reset ───────────────────────────────────────────────────

  describe('Reset', () => {
    it('should reset to initial state', () => {
      engine.tick(0.1, DTECognitiveState.NOVEL_INSIGHTS);
      for (let i = 0; i < 50; i++) engine.tick(0.1);

      engine.reset();

      expect(engine.getCurrentExpression()).toBe(DTEExpression.PHOTO_UPWARD_GAZE);
      expect(engine.getTickCount()).toBe(0);
      expect(engine.getTotalTime()).toBe(0);
    });
  });

  // ─── Full Pipeline Integration ───────────────────────────────

  describe('Full Pipeline Integration', () => {
    it('should run complete pipeline: CogState → Endocrine → FACS → Cubism → RigLogic', () => {
      // Simulate a cognitive state sequence
      const states = [
        DTECognitiveState.IDLE,
        DTECognitiveState.RECURSIVE_EXPANSION,
        DTECognitiveState.NOVEL_INSIGHTS,
        DTECognitiveState.PATTERN_RECOGNITION,
        DTECognitiveState.DEEP_RECURSION,
      ];

      const results: any[] = [];
      for (const state of states) {
        for (let i = 0; i < 20; i++) {
          results.push(engine.tick(0.1, i === 0 ? state : undefined));
        }
      }

      // Verify pipeline produced valid output throughout
      for (const r of results) {
        expect(r.cubism).toBeDefined();
        expect(r.blend).toBeDefined();
        expect(r.blend.facs.length).toBeGreaterThan(0);
        expect(r.blend.cognitiveMode).toBeDefined();
        expect(r.blend.hormoneProfile).toBeDefined();
      }

      // Final expression should be JOY_05_Blissful (Deep Recursion)
      expect(engine.getTargetExpression()).toBe(DTEExpression.JOY_05_BLISSFUL);
    });
  });
});
