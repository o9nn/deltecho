/**
 * EndocrineExpressionBridge
 *
 * Maps endocrine (hormone) state → Live2D Cubism parameters.
 *
 * Mapping table (from live2d-miara / live2d-char-model skills):
 *
 *  Hormone          → Expression Effect
 *  ─────────────────────────────────────────────────────────
 *  Dopamine ↑       → smile (MouthForm +), slight squint
 *  Serotonin ↑      → relaxed eyes, gentle expression
 *  Norepinephrine ↑ → wide eyes, raised brows (alert)
 *  Cortisol ↑       → lowered brows, tight mouth, head tilt
 *  Oxytocin ↑       → warm smile, relaxed gaze
 *  Anandamide ↑     → drowsy eyes, dreamy expression
 *  T3/T4 ↑          → upward gaze, alert posture
 *
 * Parameters are smoothed over time to avoid jarring transitions.
 */

import type { EndocrineState, CubismParameterTarget } from './types.js';

export interface BridgeConfig {
  baselines: EndocrineState;
  sensitivity: Partial<EndocrineState>;
  /** Exponential smoothing alpha (0–1). Lower = smoother. */
  smoothingFactor: number;
}

const DEFAULT_BASELINES: EndocrineState = {
  cortisol: 0.3,
  dopamine: 0.5,
  serotonin: 0.6,
  norepinephrine: 0.3,
  oxytocin: 0.4,
  t3_t4: 0.5,
  anandamide: 0.3,
};

const DEFAULT_SENSITIVITY: Partial<EndocrineState> = {
  cortisol: 1.2,
  dopamine: 1.0,
  serotonin: 0.8,
  norepinephrine: 1.5,
  oxytocin: 0.9,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class EndocrineExpressionBridge {
  private config: BridgeConfig;
  private currentParams: Map<string, number> = new Map();
  private breathPhase: number = 0;

  constructor(config?: Partial<BridgeConfig>) {
    this.config = {
      baselines: config?.baselines ?? DEFAULT_BASELINES,
      sensitivity: config?.sensitivity ?? DEFAULT_SENSITIVITY,
      smoothingFactor: config?.smoothingFactor ?? 0.15,
    };
  }

  /** Deviation from baseline, scaled by per-channel sensitivity. */
  private deviation(state: EndocrineState): EndocrineState {
    const bl = this.config.baselines;
    const s = this.config.sensitivity;
    return {
      cortisol: (state.cortisol - bl.cortisol) * (s.cortisol ?? 1.0),
      dopamine: (state.dopamine - bl.dopamine) * (s.dopamine ?? 1.0),
      serotonin: (state.serotonin - bl.serotonin) * (s.serotonin ?? 1.0),
      norepinephrine:
        (state.norepinephrine - bl.norepinephrine) *
        (s.norepinephrine ?? 1.0),
      oxytocin: (state.oxytocin - bl.oxytocin) * (s.oxytocin ?? 1.0),
      t3_t4: (state.t3_t4 - bl.t3_t4) * (s.t3_t4 ?? 1.0),
      anandamide:
        (state.anandamide - bl.anandamide) * (s.anandamide ?? 1.0),
    };
  }

  /**
   * Compute raw Cubism parameter targets from the current endocrine state.
   * @param state  current hormone levels (0–1 each)
   * @param deltaTime  seconds since last frame (for breathing phase)
   */
  compute(
    state: EndocrineState,
    deltaTime: number = 0.033,
  ): CubismParameterTarget[] {
    const d = this.deviation(state);
    const targets: CubismParameterTarget[] = [];

    // ── Eyes ──────────────────────────────────────────────
    const eyeOpen = clamp(
      0.8 +
        d.norepinephrine * 0.3 -
        d.anandamide * 0.4 -
        d.cortisol * 0.15 +
        d.serotonin * 0.1,
      0.0,
      1.0,
    );
    targets.push({ id: 'ParamEyeLOpen', value: eyeOpen, weight: 1.0 });
    targets.push({ id: 'ParamEyeROpen', value: eyeOpen, weight: 1.0 });

    // ── Eye Gaze ─────────────────────────────────────────
    targets.push({
      id: 'ParamEyeBallY',
      value: clamp(d.t3_t4 * 0.3, -1.0, 1.0),
      weight: 0.7,
    });
    targets.push({
      id: 'ParamEyeBallX',
      value: clamp(d.dopamine * 0.15, -1.0, 1.0),
      weight: 0.5,
    });

    // ── Brows ────────────────────────────────────────────
    const browY = clamp(
      d.norepinephrine * 0.5 - d.cortisol * 0.4 + d.oxytocin * 0.2,
      -1.0,
      1.0,
    );
    targets.push({ id: 'ParamBrowLY', value: browY, weight: 1.0 });
    targets.push({ id: 'ParamBrowRY', value: browY, weight: 1.0 });

    // ── Mouth ────────────────────────────────────────────
    const mouthForm = clamp(
      d.dopamine * 0.6 +
        d.oxytocin * 0.4 -
        d.cortisol * 0.5 +
        d.serotonin * 0.2,
      -1.0,
      1.0,
    );
    const mouthOpen = clamp(
      d.anandamide * 0.3 +
        d.norepinephrine * 0.2 +
        Math.abs(d.cortisol) * 0.1,
      0.0,
      1.0,
    );
    targets.push({ id: 'ParamMouthForm', value: mouthForm, weight: 1.0 });
    targets.push({ id: 'ParamMouthOpenY', value: mouthOpen, weight: 0.8 });

    // ── Head Angles ──────────────────────────────────────
    targets.push({
      id: 'ParamAngleX',
      value: clamp(d.cortisol * -8.0, -30.0, 30.0),
      weight: 0.6,
    });
    targets.push({
      id: 'ParamAngleY',
      value: clamp(d.dopamine * 5.0 + d.t3_t4 * 3.0, -30.0, 30.0),
      weight: 0.6,
    });
    targets.push({
      id: 'ParamAngleZ',
      value: clamp(d.cortisol * 5.0 - d.serotonin * 3.0, -30.0, 30.0),
      weight: 0.5,
    });

    // ── Body ─────────────────────────────────────────────
    targets.push({
      id: 'ParamBodyAngleX',
      value: clamp(d.anandamide * 3.0 - d.cortisol * 2.0, -10.0, 10.0),
      weight: 0.5,
    });
    targets.push({
      id: 'ParamBodyAngleZ',
      value: clamp(d.anandamide * 2.0 + d.serotonin * 1.5, -10.0, 10.0),
      weight: 0.4,
    });

    // ── Breathing ────────────────────────────────────────
    this.breathPhase +=
      deltaTime *
      (1.0 +
        d.t3_t4 * 0.5 +
        d.cortisol * 0.3 -
        d.anandamide * 0.3 -
        d.serotonin * 0.2);
    const breathValue =
      Math.sin(this.breathPhase * Math.PI * 2) * 0.5 + 0.5;
    targets.push({ id: 'ParamBreath', value: breathValue, weight: 0.8 });

    return targets;
  }

  /**
   * Apply endocrine-driven parameters to a Live2D model with smoothing.
   * Call every animation frame for smooth transitions.
   */
  apply(model: any, state: EndocrineState, deltaTime: number = 0.033): void {
    const targets = this.compute(state, deltaTime);
    const coreModel = model?.internalModel?.coreModel;
    if (!coreModel) return;

    const alpha = this.config.smoothingFactor;

    for (const t of targets) {
      const prev = this.currentParams.get(t.id) ?? 0;
      const smoothed = prev + (t.value - prev) * alpha * t.weight;
      this.currentParams.set(t.id, smoothed);
      try {
        coreModel.setParameterValueById(t.id, smoothed);
      } catch {
        // Parameter may not exist in this model — skip
      }
    }
  }

  /** Reset all tracked state (call on model swap). */
  reset(): void {
    this.currentParams.clear();
    this.breathPhase = 0;
  }
}
