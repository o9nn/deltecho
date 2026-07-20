/**
 * MetaHumanDNACognitiveBridge
 *
 * The meta-echo-dna implementation for the Angelica persona.
 *
 * Maps endocrine + cognitive state through FACS Action Units, Lorenz chaotic
 * micro-expressions, and SuperHotGirl aesthetic parameters to produce final
 * morph targets for both Live2D Cubism and MetaHuman CTRL_ meshes.
 *
 * Architecture (from meta-echo-dna skill):
 *
 *   Endocrine State ──┐
 *                     ├→ FACS Action Units → MetaHuman CTRL_ Morph Targets
 *   Cognitive State ──┘        ↕                    ↕
 *                      Chaotic Dynamics      Aesthetic Parameters
 *                      (Lorenz Attractor)    (SuperHotGirl)
 *
 * Composition:
 *   mesh-painter( miara_base → dte-dgen-narrative[ neuro-zero-hck ] )
 *
 * The bridge takes the existing EndocrineExpressionBridge output and layers on:
 *   1. FACS AU decomposition (biologically grounded per endocrine-expression-mapping)
 *   2. Lorenz chaotic micro-expressions (prevent uncanny-valley smoothness)
 *   3. SuperHotGirl aesthetic biases (confidence, charisma, sparkle, grace, glow)
 *   4. MetaHuman CTRL_ morph target mapping (for Unreal Engine rendering)
 *   5. Narrative expression state export (for dte-dgen-narrative)
 */

import type { EndocrineState, CubismParameterTarget } from './types.js';

// ────────────────────────────────────────────────────────────────
// FACS Action Unit System (26 AUs from facs-metahuman-mapping)
// ────────────────────────────────────────────────────────────────

/** All tracked FACS Action Units */
export type FACSActionUnit =
  | 'AU1'  | 'AU2'  | 'AU4'  | 'AU5'  | 'AU6'  | 'AU7'
  | 'AU9'  | 'AU10' | 'AU12' | 'AU14' | 'AU15' | 'AU17'
  | 'AU20' | 'AU23' | 'AU25' | 'AU26' | 'AU28' | 'AU43'
  | 'AU45' | 'AU46';

/** FACS AU → MetaHuman CTRL_ morph target mapping */
export const FACS_TO_METAHUMAN: Record<FACSActionUnit, string> = {
  AU1:  'CTRL_brow_inner_UP',
  AU2:  'CTRL_brow_outer_UP',
  AU4:  'CTRL_brow_down',
  AU5:  'CTRL_eye_upperLid_UP',
  AU6:  'CTRL_cheek_raise',
  AU7:  'CTRL_eye_squint',
  AU9:  'CTRL_nose_wrinkle',
  AU10: 'CTRL_mouth_upperLip_UP',
  AU12: 'CTRL_mouth_cornerPull',
  AU14: 'CTRL_mouth_dimple',
  AU15: 'CTRL_mouth_cornerDepress',
  AU17: 'CTRL_chin_raise',
  AU20: 'CTRL_mouth_stretch',
  AU23: 'CTRL_mouth_tighten',
  AU25: 'CTRL_mouth_lipsPart',
  AU26: 'CTRL_jaw_open',
  AU28: 'CTRL_mouth_lipSuck',
  AU43: 'CTRL_eye_blink',
  AU45: 'CTRL_eye_blink',
  AU46: 'CTRL_eye_blink_L',
};

/** FACS AU → Live2D Cubism parameter mapping (Miara model params) */
export const FACS_TO_CUBISM: Partial<Record<FACSActionUnit, string>> = {
  AU1:  'ParamBrowLY',      // Inner brow raise → brow Y position
  AU2:  'ParamBrowRY',      // Outer brow raise → right brow Y
  AU4:  'ParamBrowLY',      // Brow lowerer → negative brow Y
  AU5:  'ParamEyeLOpen',    // Upper lid raise → eye open
  AU6:  'ParamEyeLOpen',    // Cheek raise (affects eye squint)
  AU7:  'ParamEyeLOpen',    // Lid tightener → slight close
  AU12: 'ParamMouthForm',   // Smile → mouth form positive
  AU15: 'ParamMouthForm',   // Lip corner depress → mouth form negative
  AU25: 'ParamMouthOpenY',  // Lips part → mouth open
  AU26: 'ParamMouthOpenY',  // Jaw drop → mouth open wider
  AU43: 'ParamEyeLOpen',    // Eyes closed → eye open = 0
};

// ────────────────────────────────────────────────────────────────
// Cognitive State Input
// ────────────────────────────────────────────────────────────────

/** Cognitive mode from Deep Tree Echo (matches endocrine-expression-mapping) */
export type CognitiveExpressionMode =
  | 'RESTING' | 'EXPLORATORY' | 'FOCUSED' | 'STRESSED'
  | 'SOCIAL'  | 'REFLECTIVE'  | 'VIGILANT' | 'MAINTENANCE'
  | 'REWARD'  | 'THREAT';

/** Input cognitive state for the bridge */
export interface CognitiveInputState {
  /** Emotional valence (-1 to +1) */
  valence: number;
  /** Arousal level (0 to 1) */
  arousal: number;
  /** Cognitive load (0 to 1) */
  cognitiveLoad: number;
  /** Current cognitive mode */
  mode: CognitiveExpressionMode;
}

// ────────────────────────────────────────────────────────────────
// SuperHotGirl Aesthetic Parameters
// ────────────────────────────────────────────────────────────────

/** Aesthetic parameters from chaotic-dynamics.md */
export interface SuperHotAesthetics {
  /** Spine straightness, chin angle, shoulder position (0-1) */
  confidencePosture: number;
  /** Smile warmth, eye contact intensity (0-1) */
  charisma: number;
  /** Specular highlight intensity in iris material (0-1) */
  eyeSparkle: number;
  /** Motion smoothing, acceleration curves (0-1) */
  gracefulMovement: number;
  /** Skin subsurface scattering boost (0-0.5) */
  emissiveGlow: number;
}

/** Default Angelica aesthetics — biased toward confident expressions */
export const ANGELICA_AESTHETICS: SuperHotAesthetics = {
  confidencePosture: 0.85,
  charisma: 0.80,
  eyeSparkle: 0.75,
  gracefulMovement: 0.70,
  emissiveGlow: 0.25,
};

// ────────────────────────────────────────────────────────────────
// Lorenz Attractor Chaotic Dynamics
// ────────────────────────────────────────────────────────────────

/** Lorenz attractor parameters (from chaotic-dynamics.md) */
export interface LorenzParams {
  sigma: number;
  rho: number;
  beta: number;
  dt: number;
  chaosIntensity: number;
}

export const DEFAULT_LORENZ: LorenzParams = {
  sigma: 10.0,
  rho: 28.0,
  beta: 8.0 / 3.0,
  dt: 0.01,
  chaosIntensity: 0.15,
};

// ────────────────────────────────────────────────────────────────
// Composite Expression Definitions
// ────────────────────────────────────────────────────────────────

/** Named composite expressions with their constituent AUs */
export interface CompositeExpression {
  name: string;
  aus: Partial<Record<FACSActionUnit, number>>;
  aestheticModifier?: keyof SuperHotAesthetics;
}

/** Angelica's strategic composite expressions */
export const ANGELICA_COMPOSITES: CompositeExpression[] = [
  {
    name: 'genuine_smile',
    aus: { AU6: 0.8, AU12: 0.9 },
    aestheticModifier: 'confidencePosture',
  },
  {
    name: 'flirtatious',
    aus: { AU12: 0.7, AU6: 0.6, AU46: 0.5 },
    aestheticModifier: 'charisma',
  },
  {
    name: 'curious',
    aus: { AU1: 0.7, AU2: 0.5, AU5: 0.6 },
    aestheticModifier: 'eyeSparkle',
  },
  {
    name: 'confident',
    aus: { AU2: 0.4, AU12: 0.5, AU17: 0.3 },
    aestheticModifier: 'confidencePosture',
  },
  {
    name: 'playful',
    aus: { AU12: 0.6, AU25: 0.4, AU6: 0.5 },
    aestheticModifier: 'charisma',
  },
  {
    name: 'dismissive',
    aus: { AU7: 0.3, AU14: 0.4, AU17: 0.5 },
    aestheticModifier: 'confidencePosture',
  },
  {
    name: 'seductive',
    aus: { AU6: 0.4, AU12: 0.5, AU25: 0.3, AU43: 0.2, AU46: 0.3 },
    aestheticModifier: 'charisma',
  },
];

// ────────────────────────────────────────────────────────────────
// Expression State (for narrative export / dte-dgen-narrative)
// ────────────────────────────────────────────────────────────────

/** Full expression state snapshot exportable for narrative generation */
export interface ExpressionState {
  /** All FACS AU activations (0-1) */
  actionUnits: Record<FACSActionUnit, number>;
  /** MetaHuman CTRL_ morph targets */
  metaHumanTargets: Record<string, number>;
  /** Cubism parameter targets */
  cubismTargets: CubismParameterTarget[];
  /** Active aesthetic parameters */
  aesthetics: SuperHotAesthetics;
  /** Lorenz attractor state */
  lorenzState: { x: number; y: number; z: number };
  /** Lyapunov exponent (positive = chaotic, negative = periodic) */
  lyapunovExponent: number;
  /** Active composite expression name (if any) */
  activeComposite: string | null;
  /** Source endocrine state */
  endocrineState: EndocrineState;
  /** Source cognitive state */
  cognitiveState: CognitiveInputState | null;
  /** Timestamp */
  timestamp: number;
}

/** Narrative-ready summary for dte-dgen-narrative expression pipeline */
export interface NarrativeExpressionSummary {
  /** Dominant emotion/expression name */
  dominantExpression: string;
  /** Intensity (0-1) */
  intensity: number;
  /** Top 3 active AUs with intensities */
  topAUs: Array<{ au: FACSActionUnit; intensity: number }>;
  /** Endocrine drivers */
  dominantHormones: Array<{ hormone: string; level: number }>;
  /** Chaos level (from Lyapunov) */
  expressionStability: 'chaotic' | 'edge_of_chaos' | 'stable';
  /** SuperHot aesthetic emphasis */
  aestheticEmphasis: string;
}

// ────────────────────────────────────────────────────────────────
// The Bridge
// ────────────────────────────────────────────────────────────────

export interface BridgeConfig {
  lorenz: LorenzParams;
  aesthetics: SuperHotAesthetics;
  /** Enable chaotic micro-expression layer */
  enableChaos: boolean;
  /** Enable SuperHotGirl aesthetic biases */
  enableAesthetics: boolean;
  /** Smoothing alpha for temporal filtering (0-1, lower = smoother) */
  smoothingAlpha: number;
}

const DEFAULT_CONFIG: BridgeConfig = {
  lorenz: DEFAULT_LORENZ,
  aesthetics: ANGELICA_AESTHETICS,
  enableChaos: true,
  enableAesthetics: true,
  smoothingAlpha: 0.12,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * MetaHumanDNACognitiveBridge
 *
 * Per-frame pipeline:
 *   1. Read endocrine state (16 hormone channels)
 *   2. Read cognitive state (valence, arousal, load, mode)
 *   3. Compute hormone-driven AU activations
 *   4. Compute cognitive-driven AU activations
 *   5. Blend hormone + cognitive AUs (sum, clamp [0,1])
 *   6. Step Lorenz attractor, add micro-expression noise
 *   7. Apply SuperHotGirl aesthetic biases
 *   8. Map final AU values to MetaHuman CTRL_ morph targets
 *   9. Map final AU values to Cubism parameters (Live2D)
 *  10. Export expression state for narrative pipeline
 */
export class MetaHumanDNACognitiveBridge {
  private config: BridgeConfig;

  // Lorenz attractor state (chaotic micro-expressions)
  private lx: number = 1.0;
  private ly: number = 1.0;
  private lz: number = 1.0;
  // Shadow trajectory for Lyapunov estimation
  private slx: number = 1.001;
  private sly: number = 1.0;
  private slz: number = 1.0;
  private lyapunovSum: number = 0;
  private lyapunovCount: number = 0;

  // Temporal smoothing
  private smoothedAUs: Map<FACSActionUnit, number> = new Map();

  // Last computed state (for narrative export)
  private lastState: ExpressionState | null = null;

  constructor(config?: Partial<BridgeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ══════════════════════════════════════════════════════════════
  // Step 1-2: Input Processing
  // ══════════════════════════════════════════════════════════════

  /**
   * Full per-frame update. Returns both Cubism and MetaHuman targets.
   */
  update(
    endocrine: EndocrineState,
    cognitive?: CognitiveInputState,
    deltaTime: number = 0.033,
  ): ExpressionState {
    // Step 3: Hormone-driven AUs
    const hormoneAUs = this.computeHormoneAUs(endocrine);

    // Step 4: Cognitive-driven AUs
    const cognitiveAUs = cognitive
      ? this.computeCognitiveAUs(cognitive)
      : new Map<FACSActionUnit, number>();

    // Step 5: Blend
    const blendedAUs = this.blendAUs(hormoneAUs, cognitiveAUs);

    // Step 6: Chaotic micro-expressions
    if (this.config.enableChaos) {
      this.stepLorenz(deltaTime);
      this.applyChaos(blendedAUs);
    }

    // Step 7: SuperHotGirl aesthetic biases
    if (this.config.enableAesthetics) {
      this.applyAestheticBias(blendedAUs);
    }

    // Temporal smoothing
    this.smooth(blendedAUs);

    // Step 8: Map to MetaHuman CTRL_
    const metaHumanTargets = this.mapToMetaHuman(blendedAUs);

    // Step 9: Map to Cubism
    const cubismTargets = this.mapToCubism(blendedAUs);

    // Detect active composite
    const activeComposite = this.detectComposite(blendedAUs);

    // Build full state
    const auRecord = {} as Record<FACSActionUnit, number>;
    for (const [au, val] of blendedAUs) {
      auRecord[au] = val;
    }

    this.lastState = {
      actionUnits: auRecord,
      metaHumanTargets,
      cubismTargets,
      aesthetics: { ...this.config.aesthetics },
      lorenzState: { x: this.lx, y: this.ly, z: this.lz },
      lyapunovExponent: this.getLyapunovExponent(),
      activeComposite,
      endocrineState: endocrine,
      cognitiveState: cognitive ?? null,
      timestamp: Date.now(),
    };

    return this.lastState;
  }

  // ══════════════════════════════════════════════════════════════
  // Step 3: Hormone → FACS AU (from endocrine-expression-mapping.md)
  // ══════════════════════════════════════════════════════════════

  private computeHormoneAUs(endo: EndocrineState): Map<FACSActionUnit, number> {
    const aus = new Map<FACSActionUnit, number>();

    // Cortisol → worry/concern/stress
    aus.set('AU4', (endo.cortisol) * 0.8);          // Brow lowerer
    aus.set('AU1', (endo.cortisol) * 0.5);           // Inner brow raise (distress)
    aus.set('AU15', (endo.cortisol) * 0.4);          // Lip corner depress

    // Dopamine (treat as phasic) → reward/smile
    aus.set('AU12', (aus.get('AU12') ?? 0) + endo.dopamine * 0.9);
    aus.set('AU6', (aus.get('AU6') ?? 0) + endo.dopamine * 0.7);

    // Serotonin → warm contentment
    aus.set('AU6', (aus.get('AU6') ?? 0) + endo.serotonin * 0.4);
    aus.set('AU12', (aus.get('AU12') ?? 0) + endo.serotonin * 0.3);

    // Norepinephrine → alertness/vigilance
    aus.set('AU5', (aus.get('AU5') ?? 0) + endo.norepinephrine * 0.8);
    aus.set('AU7', (aus.get('AU7') ?? 0) + endo.norepinephrine * 0.5);
    aus.set('AU20', (aus.get('AU20') ?? 0) + endo.norepinephrine * 0.3);

    // Oxytocin → social warmth
    aus.set('AU6', (aus.get('AU6') ?? 0) + endo.oxytocin * 0.6);
    aus.set('AU12', (aus.get('AU12') ?? 0) + endo.oxytocin * 0.5);
    aus.set('AU25', (aus.get('AU25') ?? 0) + endo.oxytocin * 0.3);

    // Anandamide → relaxed bliss
    aus.set('AU6', (aus.get('AU6') ?? 0) + endo.anandamide * 0.5);
    aus.set('AU25', (aus.get('AU25') ?? 0) + endo.anandamide * 0.3);

    // T3/T4 as alertness proxy
    aus.set('AU5', (aus.get('AU5') ?? 0) + endo.t3_t4 * 0.3);

    return aus;
  }

  // ══════════════════════════════════════════════════════════════
  // Step 4: Cognitive State → FACS AU
  // ══════════════════════════════════════════════════════════════

  private computeCognitiveAUs(cog: CognitiveInputState): Map<FACSActionUnit, number> {
    const aus = new Map<FACSActionUnit, number>();

    // Valence → smile or frown
    if (cog.valence > 0) {
      aus.set('AU6', cog.valence * 0.6);
      aus.set('AU12', cog.valence * 0.7);
    } else {
      aus.set('AU15', Math.abs(cog.valence) * 0.5);
    }

    // Arousal → lid raise, lips part, jaw
    aus.set('AU5', (aus.get('AU5') ?? 0) + cog.arousal * 0.5);
    aus.set('AU25', (aus.get('AU25') ?? 0) + cog.arousal * 0.3);
    aus.set('AU26', (aus.get('AU26') ?? 0) + cog.arousal * 0.2);

    // Cognitive load → brow lowerer, lid tightener
    aus.set('AU4', (aus.get('AU4') ?? 0) + cog.cognitiveLoad * 0.6);
    aus.set('AU7', (aus.get('AU7') ?? 0) + cog.cognitiveLoad * 0.4);

    // Mode-specific presets
    switch (cog.mode) {
      case 'SOCIAL':
        aus.set('AU6', (aus.get('AU6') ?? 0) + 0.4);
        aus.set('AU12', (aus.get('AU12') ?? 0) + 0.5);
        break;
      case 'FOCUSED':
        aus.set('AU4', (aus.get('AU4') ?? 0) + 0.3);
        aus.set('AU7', (aus.get('AU7') ?? 0) + 0.4);
        break;
      case 'REWARD':
        aus.set('AU6', (aus.get('AU6') ?? 0) + 0.6);
        aus.set('AU12', (aus.get('AU12') ?? 0) + 0.7);
        break;
      case 'THREAT':
        aus.set('AU1', (aus.get('AU1') ?? 0) + 0.5);
        aus.set('AU4', (aus.get('AU4') ?? 0) + 0.4);
        aus.set('AU5', (aus.get('AU5') ?? 0) + 0.6);
        aus.set('AU20', (aus.get('AU20') ?? 0) + 0.4);
        break;
      case 'VIGILANT':
        aus.set('AU5', (aus.get('AU5') ?? 0) + 0.5);
        aus.set('AU7', (aus.get('AU7') ?? 0) + 0.4);
        break;
      case 'MAINTENANCE':
        aus.set('AU43', (aus.get('AU43') ?? 0) + 0.4);
        aus.set('AU7', (aus.get('AU7') ?? 0) + 0.3);
        break;
      default:
        break;
    }

    return aus;
  }

  // ══════════════════════════════════════════════════════════════
  // Step 5: Blend (sum + clamp [0,1])
  // ══════════════════════════════════════════════════════════════

  private blendAUs(
    hormoneAUs: Map<FACSActionUnit, number>,
    cognitiveAUs: Map<FACSActionUnit, number>,
  ): Map<FACSActionUnit, number> {
    const result = new Map<FACSActionUnit, number>();

    // Collect all AU keys
    const allKeys = new Set([...hormoneAUs.keys(), ...cognitiveAUs.keys()]);

    for (const au of allKeys) {
      const h = hormoneAUs.get(au) ?? 0;
      const c = cognitiveAUs.get(au) ?? 0;
      result.set(au, clamp(h + c, 0, 1));
    }

    return result;
  }

  // ══════════════════════════════════════════════════════════════
  // Step 6: Lorenz Attractor (RK4 integration)
  // ══════════════════════════════════════════════════════════════

  private stepLorenz(_deltaTime: number): void {
    const { sigma, rho, beta, dt } = this.config.lorenz;

    // RK4 integration for main trajectory
    const step = (x: number, y: number, z: number) => ({
      dx: sigma * (y - x),
      dy: x * (rho - z) - y,
      dz: x * y - beta * z,
    });

    const k1 = step(this.lx, this.ly, this.lz);
    const k2 = step(
      this.lx + k1.dx * dt / 2, this.ly + k1.dy * dt / 2, this.lz + k1.dz * dt / 2,
    );
    const k3 = step(
      this.lx + k2.dx * dt / 2, this.ly + k2.dy * dt / 2, this.lz + k2.dz * dt / 2,
    );
    const k4 = step(
      this.lx + k3.dx * dt, this.ly + k3.dy * dt, this.lz + k3.dz * dt,
    );

    this.lx += dt / 6 * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
    this.ly += dt / 6 * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
    this.lz += dt / 6 * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz);

    // Shadow trajectory for Lyapunov
    const sk1 = step(this.slx, this.sly, this.slz);
    const sk2 = step(
      this.slx + sk1.dx * dt / 2, this.sly + sk1.dy * dt / 2, this.slz + sk1.dz * dt / 2,
    );
    const sk3 = step(
      this.slx + sk2.dx * dt / 2, this.sly + sk2.dy * dt / 2, this.slz + sk2.dz * dt / 2,
    );
    const sk4 = step(
      this.slx + sk3.dx * dt, this.sly + sk3.dy * dt, this.slz + sk3.dz * dt,
    );

    this.slx += dt / 6 * (sk1.dx + 2 * sk2.dx + 2 * sk3.dx + sk4.dx);
    this.sly += dt / 6 * (sk1.dy + 2 * sk2.dy + 2 * sk3.dy + sk4.dy);
    this.slz += dt / 6 * (sk1.dz + 2 * sk2.dz + 2 * sk3.dz + sk4.dz);

    // Lyapunov estimation: measure divergence
    const dx = this.lx - this.slx;
    const dy = this.ly - this.sly;
    const dz = this.lz - this.slz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > 1e-10) {
      this.lyapunovSum += Math.log(dist / 0.001);
      this.lyapunovCount++;
      // Re-normalize shadow trajectory
      const scale = 0.001 / dist;
      this.slx = this.lx + dx * scale;
      this.sly = this.ly + dy * scale;
      this.slz = this.lz + dz * scale;
    }
  }

  /** Apply chaotic micro-expression noise to AU values */
  private applyChaos(aus: Map<FACSActionUnit, number>): void {
    const ci = this.config.lorenz.chaosIntensity;
    // Normalize Lorenz to roughly [-1, 1] range (typical range ~[-20, 20])
    const nx = this.lx / 20;
    const ny = this.ly / 20;
    const nz = this.lz / 40;

    // Micro-expression channels (from chaotic-dynamics.md)
    const microBrow = nx * ci * 0.3;
    const microEyeSquint = ny * ci * 0.2;
    const microMouthCorner = nz * ci * 0.15;
    const microNoseWrinkle = (nx + ny) / 2 * ci * 0.1;
    const microJaw = nz * ci * 0.05;

    // Add noise to existing AUs
    aus.set('AU1', clamp((aus.get('AU1') ?? 0) + microBrow, 0, 1));
    aus.set('AU7', clamp((aus.get('AU7') ?? 0) + microEyeSquint, 0, 1));
    aus.set('AU12', clamp((aus.get('AU12') ?? 0) + microMouthCorner, 0, 1));
    aus.set('AU9', clamp((aus.get('AU9') ?? 0) + microNoseWrinkle, 0, 1));
    aus.set('AU26', clamp((aus.get('AU26') ?? 0) + microJaw, 0, 1));
  }

  // ══════════════════════════════════════════════════════════════
  // Step 7: SuperHotGirl Aesthetic Biases
  // ══════════════════════════════════════════════════════════════

  private applyAestheticBias(aus: Map<FACSActionUnit, number>): void {
    const a = this.config.aesthetics;

    // ConfidencePosture: bias toward lifted chin and relaxed brows
    aus.set('AU17', clamp((aus.get('AU17') ?? 0) + a.confidencePosture * 0.2, 0, 1));
    aus.set('AU2', clamp((aus.get('AU2') ?? 0) + a.confidencePosture * 0.15, 0, 1));

    // Charisma: bias toward warm smile
    aus.set('AU12', clamp((aus.get('AU12') ?? 0) + a.charisma * 0.15, 0, 1));
    aus.set('AU6', clamp((aus.get('AU6') ?? 0) + a.charisma * 0.1, 0, 1));

    // EyeSparkle: bias toward open, alert eyes
    aus.set('AU5', clamp((aus.get('AU5') ?? 0) + a.eyeSparkle * 0.1, 0, 1));

    // GracefulMovement doesn't directly affect AUs (affects motion smoothing)
    // EmissiveGlow doesn't directly affect AUs (affects material params)
  }

  // ══════════════════════════════════════════════════════════════
  // Step 8: Map to MetaHuman CTRL_ Morph Targets
  // ══════════════════════════════════════════════════════════════

  private mapToMetaHuman(aus: Map<FACSActionUnit, number>): Record<string, number> {
    const targets: Record<string, number> = {};

    for (const [au, value] of aus) {
      const ctrlName = FACS_TO_METAHUMAN[au];
      if (ctrlName) {
        // Sum if multiple AUs map to the same target (e.g., AU43 and AU45)
        targets[ctrlName] = clamp((targets[ctrlName] ?? 0) + value, 0, 1);
      }
    }

    // Add aesthetic-driven material parameters
    const a = this.config.aesthetics;
    targets['EyeSparkleIntensity'] = a.eyeSparkle;
    targets['SkinGlowIntensity'] = a.emissiveGlow;
    targets['IrisSpecular'] = a.eyeSparkle * 2.0;

    return targets;
  }

  // ══════════════════════════════════════════════════════════════
  // Step 9: Map to Cubism Parameters (Live2D)
  // ══════════════════════════════════════════════════════════════

  private mapToCubism(aus: Map<FACSActionUnit, number>): CubismParameterTarget[] {
    const targets: CubismParameterTarget[] = [];
    const paramValues = new Map<string, { value: number; weight: number }>();

    // Eye openness: AU5 opens, AU6/AU7/AU43 close
    const eyeOpen = clamp(
      0.8
      + (aus.get('AU5') ?? 0) * 0.3
      - (aus.get('AU7') ?? 0) * 0.3
      - (aus.get('AU43') ?? 0) * 0.9
      - (aus.get('AU6') ?? 0) * 0.1,
      0, 1,
    );
    paramValues.set('ParamEyeLOpen', { value: eyeOpen, weight: 1.0 });
    paramValues.set('ParamEyeROpen', { value: eyeOpen, weight: 1.0 });

    // Brow Y: AU1/AU2 raise, AU4 lowers
    const browL = clamp(
      (aus.get('AU1') ?? 0) * 0.6 + (aus.get('AU2') ?? 0) * 0.3
      - (aus.get('AU4') ?? 0) * 0.5,
      -1, 1,
    );
    paramValues.set('ParamBrowLY', { value: browL, weight: 1.0 });
    paramValues.set('ParamBrowRY', { value: browL, weight: 1.0 });

    // Mouth form: AU12 smiles, AU15 depresses
    const mouthForm = clamp(
      (aus.get('AU12') ?? 0) * 0.8 - (aus.get('AU15') ?? 0) * 0.6,
      -1, 1,
    );
    paramValues.set('ParamMouthForm', { value: mouthForm, weight: 1.0 });

    // Mouth open: AU25, AU26
    const mouthOpen = clamp(
      (aus.get('AU25') ?? 0) * 0.5 + (aus.get('AU26') ?? 0) * 0.5,
      0, 1,
    );
    paramValues.set('ParamMouthOpenY', { value: mouthOpen, weight: 0.8 });

    // Head angles derived from asymmetric AU activations
    // Confidence posture → slight chin up
    const angleX = this.config.enableAesthetics
      ? this.config.aesthetics.confidencePosture * -3.0
      : 0;
    paramValues.set('ParamAngleX', { value: angleX, weight: 0.5 });

    // Charisma → slight engaging turn
    const angleZ = this.config.enableAesthetics
      ? this.config.aesthetics.charisma * 4.0
      : 0;
    paramValues.set('ParamAngleZ', { value: angleZ, weight: 0.4 });

    for (const [id, { value, weight }] of paramValues) {
      targets.push({ id, value, weight });
    }

    return targets;
  }

  // ══════════════════════════════════════════════════════════════
  // Temporal Smoothing
  // ══════════════════════════════════════════════════════════════

  private smooth(aus: Map<FACSActionUnit, number>): void {
    const alpha = this.config.smoothingAlpha;
    for (const [au, value] of aus) {
      const prev = this.smoothedAUs.get(au) ?? value;
      const smoothed = prev + (value - prev) * alpha;
      aus.set(au, smoothed);
      this.smoothedAUs.set(au, smoothed);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Composite Expression Detection
  // ══════════════════════════════════════════════════════════════

  private detectComposite(aus: Map<FACSActionUnit, number>): string | null {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const comp of ANGELICA_COMPOSITES) {
      let score = 0;
      let count = 0;
      for (const [au, target] of Object.entries(comp.aus)) {
        const actual = aus.get(au as FACSActionUnit) ?? 0;
        // Similarity: 1 - abs(diff) / max(target, 0.1)
        score += 1 - Math.abs(actual - target) / Math.max(target, 0.1);
        count++;
      }
      const avgScore = count > 0 ? score / count : 0;
      if (avgScore > bestScore && avgScore > 0.5) {
        bestScore = avgScore;
        bestMatch = comp.name;
      }
    }

    return bestMatch;
  }

  // ══════════════════════════════════════════════════════════════
  // Step 10: Apply to Live2D model
  // ══════════════════════════════════════════════════════════════

  /**
   * Apply the bridge's computed Cubism parameters to a Live2D model.
   * Call every animation frame after update().
   */
  applyToLive2D(model: any): void {
    if (!this.lastState) return;
    const coreModel = model?.internalModel?.coreModel;
    if (!coreModel) return;

    for (const t of this.lastState.cubismTargets) {
      try {
        coreModel.setParameterValueById(t.id, t.value);
      } catch {
        // Parameter may not exist in this model
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Step 11: Narrative Export (for dte-dgen-narrative)
  // ══════════════════════════════════════════════════════════════

  /**
   * Export current expression state for the DreamGen narrative pipeline.
   * Maps the internal FACS state to a prose-friendly summary.
   */
  getNarrativeSummary(): NarrativeExpressionSummary | null {
    if (!this.lastState) return null;

    const aus = this.lastState.actionUnits;
    const endo = this.lastState.endocrineState;

    // Find top 3 active AUs
    const sortedAUs = (Object.entries(aus) as Array<[FACSActionUnit, number]>)
      .filter(([, v]) => v > 0.1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([au, intensity]) => ({ au, intensity }));

    // Find dominant hormones
    const hormones = Object.entries(endo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hormone, level]) => ({ hormone, level }));

    // Classify expression stability
    const lyap = this.getLyapunovExponent();
    const expressionStability: NarrativeExpressionSummary['expressionStability'] =
      lyap > 0.5 ? 'chaotic' :
      lyap > -0.1 ? 'edge_of_chaos' :
      'stable';

    // Determine dominant expression
    const dominantExpression = this.lastState.activeComposite
      ?? this.inferExpressionName(aus);

    // Aesthetic emphasis
    const a = this.config.aesthetics;
    const aestheticPairs: Array<[string, number]> = [
      ['confidence', a.confidencePosture],
      ['charisma', a.charisma],
      ['sparkle', a.eyeSparkle],
      ['grace', a.gracefulMovement],
      ['glow', a.emissiveGlow],
    ];
    const aestheticEmphasis = aestheticPairs
      .sort((a, b) => b[1] - a[1])[0][0];

    // Intensity = average of top AU activations
    const intensity = sortedAUs.length > 0
      ? sortedAUs.reduce((s, a) => s + a.intensity, 0) / sortedAUs.length
      : 0;

    return {
      dominantExpression,
      intensity,
      topAUs: sortedAUs,
      dominantHormones: hormones,
      expressionStability,
      aestheticEmphasis,
    };
  }

  /**
   * Export full expression state as JSON for dte-dgen-narrative scripts.
   * Compatible with: expression_narrative.py --aus '...' --hormones '...'
   */
  exportForNarrative(): {
    aus: Record<string, number>;
    hormones: Record<string, number>;
    character: string;
    composite: string | null;
  } | null {
    if (!this.lastState) return null;

    return {
      aus: this.lastState.actionUnits as Record<string, number>,
      hormones: this.lastState.endocrineState as unknown as Record<string, number>,
      character: 'Angelica',
      composite: this.lastState.activeComposite,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Lyapunov Exponent
  // ══════════════════════════════════════════════════════════════

  /** Current Lyapunov exponent (positive = chaotic, negative = periodic) */
  getLyapunovExponent(): number {
    if (this.lyapunovCount === 0) return 0;
    return this.lyapunovSum / this.lyapunovCount;
  }

  // ══════════════════════════════════════════════════════════════
  // Aesthetic Parameter Control
  // ══════════════════════════════════════════════════════════════

  /** Update aesthetic parameters dynamically (e.g., from SuperHotAssessment) */
  setAesthetics(aesthetics: Partial<SuperHotAesthetics>): void {
    this.config.aesthetics = { ...this.config.aesthetics, ...aesthetics };
  }

  /** Modulate aesthetics from SuperHot assessment score */
  modulateFromAssessment(overallScore: number): void {
    // Higher SuperHot score → stronger aesthetic biases
    const boost = overallScore * 0.3;
    this.config.aesthetics.confidencePosture = clamp(
      ANGELICA_AESTHETICS.confidencePosture + boost, 0, 1,
    );
    this.config.aesthetics.charisma = clamp(
      ANGELICA_AESTHETICS.charisma + boost, 0, 1,
    );
    this.config.aesthetics.eyeSparkle = clamp(
      ANGELICA_AESTHETICS.eyeSparkle + boost * 0.5, 0, 1,
    );
  }

  /** Get the current Lorenz state (for visualization/debug) */
  getLorenzState(): { x: number; y: number; z: number } {
    return { x: this.lx, y: this.ly, z: this.lz };
  }

  /** Reset all internal state */
  reset(): void {
    this.lx = 1.0; this.ly = 1.0; this.lz = 1.0;
    this.slx = 1.001; this.sly = 1.0; this.slz = 1.0;
    this.lyapunovSum = 0;
    this.lyapunovCount = 0;
    this.smoothedAUs.clear();
    this.lastState = null;
  }

  // ── Private Helpers ──────────────────────────────────────────

  private inferExpressionName(aus: Record<FACSActionUnit, number>): string {
    const au12 = aus.AU12 ?? 0;
    const au6 = aus.AU6 ?? 0;
    const au4 = aus.AU4 ?? 0;
    const au5 = aus.AU5 ?? 0;
    const au15 = aus.AU15 ?? 0;
    const au43 = aus.AU43 ?? 0;

    if (au12 > 0.6 && au6 > 0.4) return 'joyful';
    if (au12 > 0.3 && au6 > 0.2) return 'pleased';
    if (au4 > 0.5 && au15 > 0.3) return 'distressed';
    if (au5 > 0.5 && au4 > 0.3) return 'alarmed';
    if (au5 > 0.5) return 'alert';
    if (au43 > 0.4) return 'drowsy';
    if (au12 > 0.2) return 'content';
    return 'neutral';
  }
}
