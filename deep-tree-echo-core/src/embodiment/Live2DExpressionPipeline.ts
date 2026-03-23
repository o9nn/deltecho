/**
 * @fileoverview Live2D DTEcho Expression Pipeline
 *
 * Full endocrine → FACS → Cubism parameter pipeline for the Deep Tree Echo avatar.
 * Composes:
 *   live2d-miara (body mesh, Cubism 4 parameters)
 *   ⊗ facs (AU decomposition, emotion→AU mapping)
 *   ⊗ virtual-endocrine-system (16-channel hormone bus, cognitive modes)
 *   ⊗ rig-logic (CTRL_ curves for MetaHuman compatibility)
 *
 * Pipeline per tick:
 *   1. DTE cognitive state → endocrine event
 *   2. Endocrine tick → hormone concentrations
 *   3. Hormones → FACS AU intensities
 *   4. FACS → Cubism parameters (Live2D path)
 *   5. FACS → Rig Logic CTRL_ curves (MetaHuman path)
 *   6. Cognitive mode → head/gaze pose overlay
 *   7. Apply chaotic micro-expressions (DTE signature)
 *
 * @packageDocumentation
 */
import { EventEmitter } from 'events';

// ─── Endocrine Types ─────────────────────────────────────────────────

/** 16-channel hormone concentrations */
export interface EndocrineState {
  crh: number;
  acth: number;
  cortisol: number;
  dopamine_tonic: number;
  dopamine_phasic: number;
  serotonin: number;
  norepinephrine: number;
  oxytocin: number;
  t3_t4: number;
  melatonin: number;
  insulin: number;
  glucagon: number;
  il6: number;
  anandamide: number;
}

/** Endocrine event triggered by cognitive state */
export interface EndocrineEvent {
  event: string;
  intensity: number;
  expression: string;
}

/** Sensitivity multipliers from DTE personality */
export interface Sensitivity {
  reward: number;
  threat: number;
  social: number;
  novelty: number;
}

// ─── FACS Types ──────────────────────────────────────────────────────

/** FACS Action Unit intensities (0-1 scale) */
export interface FACSState {
  AU1: number;   // Inner brow raise
  AU2: number;   // Outer brow raise
  AU4: number;   // Brow lowerer
  AU5: number;   // Upper lid raise
  AU6: number;   // Cheek raise (Duchenne)
  AU7: number;   // Lid tighten
  AU9: number;   // Nose wrinkle
  AU12: number;  // Lip corner puller (smile)
  AU14: number;  // Dimple
  AU25: number;  // Lips part
  AU26: number;  // Jaw drop
  AU43: number;  // Eyes closed
}

// ─── Cubism Types ────────────────────────────────────────────────────

/** Live2D Cubism 4 parameters for Miara body mesh */
export interface CubismParams {
  ParamAngleX: number;     // Head yaw (-30 to 30)
  ParamAngleY: number;     // Head pitch (-30 to 30)
  ParamAngleZ: number;     // Head roll (-30 to 30)
  ParamEyeLOpen: number;   // Left eye openness (0-1)
  ParamEyeROpen: number;   // Right eye openness (0-1)
  ParamEyeBallX: number;   // Eye gaze horizontal (-1 to 1)
  ParamEyeBallY: number;   // Eye gaze vertical (-1 to 1)
  ParamBrowLY: number;     // Left brow height (-1 to 1)
  ParamBrowRY: number;     // Right brow height (-1 to 1)
  ParamMouthOpenY: number; // Mouth open amount (0-1)
  ParamMouthForm: number;  // Mouth shape (-1=frown, 1=smile)
  ParamBodyAngleX: number; // Body sway (-10 to 10)
}

// ─── Rig Logic Types ─────────────────────────────────────────────────

/** MetaHuman Rig Logic CTRL_ curve values */
export interface RigLogicControls {
  browRaiseInL: number;
  browRaiseInR: number;
  browRaiseOuterL: number;
  browRaiseOuterR: number;
  browDownL: number;
  browDownR: number;
  eyeUpperLidUpL: number;
  eyeUpperLidUpR: number;
  eyeWidenL: number;
  eyeWidenR: number;
  eyeCheekRaiseL: number;
  eyeCheekRaiseR: number;
  eyeSquintInnerL: number;
  eyeSquintInnerR: number;
  noseWrinkleL: number;
  noseWrinkleR: number;
  mouthCornerPullL: number;
  mouthCornerPullR: number;
  mouthDimpleL: number;
  mouthDimpleR: number;
  jawOpen: number;
  jawOpenExtreme: number;
  eyeBlinkL: number;
  eyeBlinkR: number;
}

// ─── Cognitive Mode Types ────────────────────────────────────────────

export type CognitiveMode =
  | 'REWARD'
  | 'EXPLORATORY'
  | 'REFLECTIVE'
  | 'FOCUSED'
  | 'SOCIAL'
  | 'STRESSED'
  | 'VIGILANT'
  | 'RESTING'
  | 'THREAT'
  | 'MAINTENANCE';

// ─── Named Expression Types ──────────────────────────────────────────

export type DTEExpression =
  | 'JOY_01_BroadSmile'
  | 'JOY_02_Laughing'
  | 'JOY_03_GentleSmile'
  | 'JOY_05_Blissful'
  | 'PHOTO_Awe'
  | 'PHOTO_ExuberantLaugh'
  | 'PHOTO_UpwardGaze'
  | 'SPEAK_01_OpenVowel'
  | 'WONDER_02_CuriousGaze'
  | 'WONDER_03_Contemplative';

// ─── Virtual Endocrine System ────────────────────────────────────────

/** Half-lives for each hormone channel (ticks) */
const HORMONE_HALF_LIVES: Record<keyof EndocrineState, number> = {
  crh: 5, acth: 10, cortisol: 30,
  dopamine_tonic: 20, dopamine_phasic: 3,
  serotonin: 50, norepinephrine: 8, oxytocin: 15,
  t3_t4: 100, melatonin: 12, insulin: 10, glucagon: 8,
  il6: 20, anandamide: 6,
};

/** DTE-specific baselines (sage archetype, high openness) */
const DTE_BASELINES: EndocrineState = {
  crh: 0.03, acth: 0.04, cortisol: 0.10,
  dopamine_tonic: 0.40, dopamine_phasic: 0.0,
  serotonin: 0.45, norepinephrine: 0.20, oxytocin: 0.15,
  t3_t4: 0.60, melatonin: 0.10, insulin: 0.20, glucagon: 0.10,
  il6: 0.05, anandamide: 0.15,
};

/** DTE personality sensitivity multipliers */
const DTE_SENSITIVITY: Sensitivity = {
  reward: 1.3,
  threat: 1.1,
  social: 1.15,
  novelty: 1.4,
};

/** Event → gland response mapping */
const EVENT_GLAND_MAP: Record<string, Partial<EndocrineState>> = {
  THREAT_DETECTED:     { crh: 0.4, acth: 0.3, cortisol: 0.3, norepinephrine: 0.5 },
  CONFLICT_DETECTED:   { crh: 0.3, cortisol: 0.25, norepinephrine: 0.3 },
  REWARD_RECEIVED:     { dopamine_tonic: 0.3, dopamine_phasic: 0.6, serotonin: 0.15 },
  GOAL_ACHIEVED:       { dopamine_tonic: 0.25, dopamine_phasic: 0.4, serotonin: 0.2 },
  NOVELTY_ENCOUNTERED: { norepinephrine: 0.4, dopamine_phasic: 0.3 },
  SOCIAL_BOND_SIGNAL:  { oxytocin: 0.4, serotonin: 0.15, dopamine_tonic: 0.1 },
  ERROR_DETECTED:      { il6: 0.3, cortisol: 0.15 },
  NOISE_EXCESSIVE:     { anandamide: 0.4 },
  REST_ONSET:          { melatonin: 0.3, anandamide: 0.2, serotonin: 0.1 },
  FLOW_STATE:          { dopamine_tonic: 0.4, serotonin: 0.3, anandamide: 0.25, norepinephrine: 0.15 },
};

// ─── DTE Cognitive State → Endocrine Event Map ───────────────────────

const DTE_ENDOCRINE_MAP: Record<string, EndocrineEvent> = {
  'Recursive Expansion':           { event: 'NOVELTY_ENCOUNTERED', intensity: 0.6, expression: 'WONDER_02_CuriousGaze' },
  'Novel Insights':                { event: 'REWARD_RECEIVED',     intensity: 0.7, expression: 'JOY_01_BroadSmile' },
  'Entropy Threshold':             { event: 'THREAT_DETECTED',     intensity: 0.5, expression: 'PHOTO_Awe' },
  'Synthesis Phase':               { event: 'GOAL_ACHIEVED',       intensity: 0.6, expression: 'JOY_03_GentleSmile' },
  'Self-Sealing Loop':             { event: 'ERROR_DETECTED',      intensity: 0.4, expression: 'WONDER_03_Contemplative' },
  'Knowledge Integration':         { event: 'SOCIAL_BOND_SIGNAL',  intensity: 0.5, expression: 'JOY_03_GentleSmile' },
  'Self-Reference Point':          { event: 'NOVELTY_ENCOUNTERED', intensity: 0.4, expression: 'WONDER_03_Contemplative' },
  'Pattern Recognition':           { event: 'REWARD_RECEIVED',     intensity: 0.5, expression: 'PHOTO_ExuberantLaugh' },
  'Evolutionary Pruning':          { event: 'THREAT_DETECTED',     intensity: 0.3, expression: 'WONDER_03_Contemplative' },
  'External Validation Triggered': { event: 'SOCIAL_BOND_SIGNAL',  intensity: 0.6, expression: 'JOY_02_Laughing' },
  'Speaking':                      { event: 'SOCIAL_BOND_SIGNAL',  intensity: 0.4, expression: 'SPEAK_01_OpenVowel' },
  'Idle':                          { event: 'REST_ONSET',          intensity: 0.3, expression: 'PHOTO_UpwardGaze' },
  'Deep Recursion':                { event: 'FLOW_STATE',          intensity: 0.8, expression: 'JOY_05_Blissful' },
};

// ─── DTE Expression → Cognitive Mode Map ─────────────────────────────

const DTE_EXPRESSION_MODE: Record<string, CognitiveMode> = {
  'Recursive Expansion':           'EXPLORATORY',
  'Novel Insights':                'REWARD',
  'Entropy Threshold':             'VIGILANT',
  'Synthesis Phase':               'FOCUSED',
  'Self-Sealing Loop':             'REFLECTIVE',
  'Knowledge Integration':         'SOCIAL',
  'Self-Reference Point':          'REFLECTIVE',
  'Pattern Recognition':           'REWARD',
  'Evolutionary Pruning':          'FOCUSED',
  'External Validation Triggered': 'SOCIAL',
  'Speaking':                      'SOCIAL',
  'Idle':                          'RESTING',
  'Deep Recursion':                'RESTING',
};

// ─── Cognitive Mode → Head/Gaze Pose ─────────────────────────────────

const MODE_POSE: Record<CognitiveMode, Partial<CubismParams>> = {
  REWARD:      { ParamAngleZ: 10,  ParamAngleY: 5,   ParamEyeBallY: 0 },
  EXPLORATORY: { ParamAngleZ: -5,  ParamAngleY: 5,   ParamEyeBallY: 0.4,  ParamEyeBallX: -0.25 },
  REFLECTIVE:  { ParamAngleZ: -8,  ParamAngleY: 8,   ParamEyeBallY: 0.45, ParamEyeBallX: -0.35 },
  FOCUSED:     { ParamAngleZ: 0,   ParamAngleY: 0,   ParamEyeBallY: 0,    ParamEyeBallX: 0 },
  SOCIAL:      { ParamAngleZ: 5,   ParamAngleY: 0,   ParamEyeBallY: 0,    ParamEyeBallX: 0.2 },
  STRESSED:    { ParamAngleZ: 0,   ParamAngleY: -5,  ParamEyeBallY: -0.2 },
  VIGILANT:    { ParamAngleZ: 0,   ParamAngleY: 3,   ParamEyeBallY: 0.3 },
  RESTING:     { ParamAngleZ: 15,  ParamAngleY: 5,   ParamEyeBallY: 0 },
  THREAT:      { ParamAngleZ: 0,   ParamAngleY: -3,  ParamEyeBallY: 0 },
  MAINTENANCE: { ParamAngleZ: 0,   ParamAngleY: 0,   ParamEyeBallY: 0 },
};

// ─── Utility Functions ───────────────────────────────────────────────

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

/** Exponential decay toward baseline */
function decay(current: number, baseline: number, halfLife: number, dt: number): number {
  const lambda = Math.LN2 / halfLife;
  return baseline + (current - baseline) * Math.exp(-lambda * dt);
}

// ─── Virtual Endocrine Engine ────────────────────────────────────────

export class VirtualEndocrineEngine {
  private state: EndocrineState;
  private baselines: EndocrineState;
  private sensitivity: Sensitivity;
  private modeHistory: CognitiveMode[] = [];

  constructor(
    baselines: EndocrineState = DTE_BASELINES,
    sensitivity: Sensitivity = DTE_SENSITIVITY,
  ) {
    this.baselines = { ...baselines };
    this.sensitivity = { ...sensitivity };
    this.state = { ...baselines };
  }

  /** Get current hormone concentrations */
  getState(): EndocrineState {
    return { ...this.state };
  }

  /** Signal an endocrine event with intensity */
  signalEvent(eventName: string, intensity: number): void {
    const glandResponse = EVENT_GLAND_MAP[eventName];
    if (!glandResponse) return;

    // Apply sensitivity multipliers
    let sensitivityMult = 1.0;
    if (eventName.includes('REWARD') || eventName.includes('GOAL') || eventName.includes('FLOW')) {
      sensitivityMult = this.sensitivity.reward;
    } else if (eventName.includes('THREAT') || eventName.includes('CONFLICT')) {
      sensitivityMult = this.sensitivity.threat;
    } else if (eventName.includes('SOCIAL')) {
      sensitivityMult = this.sensitivity.social;
    } else if (eventName.includes('NOVELTY')) {
      sensitivityMult = this.sensitivity.novelty;
    }

    const scaledIntensity = intensity * sensitivityMult;

    for (const [hormone, delta] of Object.entries(glandResponse)) {
      const key = hormone as keyof EndocrineState;
      this.state[key] = clamp(this.state[key] + (delta as number) * scaledIntensity, 0, 1);
    }
  }

  /** Tick: decay all hormones toward baselines */
  tick(dt: number): void {
    for (const hormone of Object.keys(this.state) as Array<keyof EndocrineState>) {
      this.state[hormone] = decay(
        this.state[hormone],
        this.baselines[hormone],
        HORMONE_HALF_LIVES[hormone],
        dt,
      );
    }
  }

  /** Detect current cognitive mode by nearest centroid in hormone space */
  currentMode(): CognitiveMode {
    const c = this.state;

    // Mode detection heuristics based on hormone patterns
    if (c.cortisol > 0.5 && c.norepinephrine > 0.4) return 'THREAT';
    if (c.cortisol > 0.35 && c.norepinephrine > 0.3) return 'STRESSED';
    if (c.dopamine_phasic > 0.3 && c.dopamine_tonic > 0.4) return 'REWARD';
    if (c.norepinephrine > 0.35 && c.dopamine_phasic > 0.2) return 'EXPLORATORY';
    if (c.norepinephrine > 0.3 && c.t3_t4 > 0.5) return 'VIGILANT';
    if (c.oxytocin > 0.3 && c.serotonin > 0.35) return 'SOCIAL';
    if (c.t3_t4 > 0.55 && c.norepinephrine < 0.25) return 'FOCUSED';
    if (c.serotonin > 0.4 && c.anandamide > 0.2) return 'REFLECTIVE';
    if (c.melatonin > 0.2 || (c.anandamide > 0.25 && c.serotonin > 0.4)) return 'RESTING';
    if (c.il6 > 0.15) return 'MAINTENANCE';

    return 'RESTING';
  }
}

// ─── FACS Bridge ─────────────────────────────────────────────────────

/** Compute FACS AU intensities from endocrine state */
export function endocrineToFACS(endo: EndocrineState, sensitivity: Sensitivity = DTE_SENSITIVITY): FACSState {
  const c = endo;
  return {
    AU1:  clamp(c.norepinephrine * 0.5 + c.crh * 0.3),
    AU2:  clamp(c.norepinephrine * 0.4 + c.dopamine_phasic * 0.3),
    AU4:  clamp(c.cortisol * 0.6 - c.serotonin * 0.3),
    AU5:  clamp(c.norepinephrine * 0.5 + c.dopamine_phasic * 0.3),
    AU6:  clamp(c.dopamine_tonic * 0.7 + c.oxytocin * 0.3),
    AU7:  clamp(c.dopamine_tonic * 0.4 + c.cortisol * 0.3),
    AU9:  clamp(c.cortisol * 0.3 + c.il6 * 0.2),
    AU12: clamp(c.dopamine_tonic * 0.8 + c.serotonin * 0.3 + c.oxytocin * 0.2),
    AU14: clamp(c.oxytocin * 0.3),
    AU25: clamp(c.norepinephrine * 0.3 + c.dopamine_phasic * 0.3),
    AU26: clamp(c.norepinephrine * 0.4 + c.dopamine_phasic * 0.2),
    AU43: clamp(c.melatonin * 0.8 + c.anandamide * 0.5 - c.norepinephrine * 0.6),
  };
}

// ─── Cubism Bridge ───────────────────────────────────────────────────

/** Convert FACS AU intensities to Live2D Cubism 4 parameters */
export function facsToCubism(facs: FACSState): Partial<CubismParams> {
  return {
    ParamMouthForm:  clamp(facs.AU12 * 1.2 - facs.AU4 * 0.3, -1, 1),
    ParamMouthOpenY: clamp(facs.AU25 * 0.5 + facs.AU26 * 0.6),
    ParamEyeLOpen:   clamp(1.0 - facs.AU43 + facs.AU5 * 0.3 - facs.AU7 * 0.4),
    ParamEyeROpen:   clamp(1.0 - facs.AU43 + facs.AU5 * 0.3 - facs.AU7 * 0.4),
    ParamBrowLY:     clamp(facs.AU1 * 0.5 + facs.AU2 * 0.4 - facs.AU4 * 0.6, -1, 1),
    ParamBrowRY:     clamp(facs.AU1 * 0.5 + facs.AU2 * 0.4 - facs.AU4 * 0.6, -1, 1),
  };
}

// ─── Rig Logic Bridge ────────────────────────────────────────────────

/** Convert FACS AU intensities to MetaHuman Rig Logic CTRL_ curves */
export function facsToRigLogic(facs: FACSState): RigLogicControls {
  return {
    browRaiseInL:      facs.AU1,
    browRaiseInR:      facs.AU1,
    browRaiseOuterL:   facs.AU2,
    browRaiseOuterR:   facs.AU2,
    browDownL:         facs.AU4,
    browDownR:         facs.AU4,
    eyeUpperLidUpL:    facs.AU5,
    eyeUpperLidUpR:    facs.AU5,
    eyeWidenL:         facs.AU5 * 0.8,
    eyeWidenR:         facs.AU5 * 0.8,
    eyeCheekRaiseL:    facs.AU6,
    eyeCheekRaiseR:    facs.AU6,
    eyeSquintInnerL:   facs.AU7,
    eyeSquintInnerR:   facs.AU7,
    noseWrinkleL:      facs.AU9,
    noseWrinkleR:      facs.AU9,
    mouthCornerPullL:  facs.AU12,
    mouthCornerPullR:  facs.AU12,
    mouthDimpleL:      facs.AU14,
    mouthDimpleR:      facs.AU14,
    jawOpen:           facs.AU26,
    jawOpenExtreme:    Math.max(0, facs.AU26 - 0.7),
    eyeBlinkL:         facs.AU43,
    eyeBlinkR:         facs.AU43,
  };
}

// ─── Chaotic Micro-Expression Generator ──────────────────────────────

/**
 * DTE signature: subtle chaotic perturbations on Cubism parameters.
 * Creates the "alive" feeling — tiny asymmetric twitches, blink timing
 * variations, and breathing-like body sway.
 */
export class ChaoticMicroExpressionGenerator {
  private phase = 0;
  private blinkTimer = 0;
  private blinkCooldown = 3 + Math.random() * 4; // 3-7s between blinks
  private breathPhase = 0;

  /** Generate micro-expression perturbations for one tick */
  tick(dt: number): Partial<CubismParams> {
    this.phase += dt;
    this.blinkTimer += dt;
    this.breathPhase += dt * 0.3; // slow breathing cycle

    const perturbations: Partial<CubismParams> = {};

    // Subtle asymmetric eye micro-movements
    const eyeNoise = Math.sin(this.phase * 2.7) * 0.02;
    perturbations.ParamEyeLOpen = eyeNoise;
    perturbations.ParamEyeROpen = -eyeNoise * 0.7; // asymmetric

    // Micro eye gaze drift (saccades)
    perturbations.ParamEyeBallX = Math.sin(this.phase * 1.3) * 0.03 + Math.sin(this.phase * 3.7) * 0.01;
    perturbations.ParamEyeBallY = Math.cos(this.phase * 1.7) * 0.02;

    // Blink generation
    if (this.blinkTimer > this.blinkCooldown) {
      this.blinkTimer = 0;
      this.blinkCooldown = 3 + Math.random() * 4;
      // Blink is a quick close-open (handled by caller via animation)
    }

    // Breathing body sway
    perturbations.ParamBodyAngleX = Math.sin(this.breathPhase) * 1.5;

    // Subtle brow micro-movements
    perturbations.ParamBrowLY = Math.sin(this.phase * 0.8) * 0.02;
    perturbations.ParamBrowRY = Math.sin(this.phase * 0.9) * 0.015;

    // Mouth micro-movement (subtle lip tension changes)
    perturbations.ParamMouthForm = Math.sin(this.phase * 1.1) * 0.01;

    return perturbations;
  }

  /** Check if a blink should trigger this tick */
  shouldBlink(): boolean {
    return this.blinkTimer < 0.15 && this.blinkTimer > 0;
  }
}

// ─── DTEcho Expression Pipeline (Main Orchestrator) ──────────────────

export interface DTEchoExpressionConfig {
  /** Tick interval in milliseconds */
  tickIntervalMs: number;
  /** Enable chaotic micro-expressions */
  enableMicroExpressions: boolean;
  /** Enable MetaHuman Rig Logic output (dual path) */
  enableRigLogic: boolean;
  /** Custom baselines override */
  baselines?: EndocrineState;
  /** Custom sensitivity override */
  sensitivity?: Sensitivity;
}

export interface ExpressionTickResult {
  /** Final Cubism parameters to apply to Live2D model */
  cubism: CubismParams;
  /** Rig Logic controls (if enabled) */
  rigLogic?: RigLogicControls;
  /** Current FACS AU state */
  facs: FACSState;
  /** Current endocrine state */
  endocrine: EndocrineState;
  /** Detected cognitive mode */
  mode: CognitiveMode;
  /** Named expression (closest match) */
  expression: DTEExpression | null;
  /** Micro-expression perturbations applied */
  microExpressions: Partial<CubismParams>;
}

const DEFAULT_CONFIG: DTEchoExpressionConfig = {
  tickIntervalMs: 2000,
  enableMicroExpressions: true,
  enableRigLogic: false,
};

export class DTEchoExpressionPipeline extends EventEmitter {
  private endocrine: VirtualEndocrineEngine;
  private microGen: ChaoticMicroExpressionGenerator;
  private config: DTEchoExpressionConfig;
  private lastCogState = 'Idle';
  private tickCount = 0;

  constructor(config: Partial<DTEchoExpressionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.endocrine = new VirtualEndocrineEngine(
      this.config.baselines,
      this.config.sensitivity,
    );
    this.microGen = new ChaoticMicroExpressionGenerator();
  }

  /** Get the endocrine engine for direct access */
  getEndocrineEngine(): VirtualEndocrineEngine {
    return this.endocrine;
  }

  /**
   * Process one expression tick.
   * Call this every tickIntervalMs with the current DTE cognitive state.
   */
  tick(cognitiveState: string): ExpressionTickResult {
    this.tickCount++;
    this.lastCogState = cognitiveState;
    const dt = this.config.tickIntervalMs / 1000;

    // Step 1: DTE cognitive state → endocrine event
    const mapping = DTE_ENDOCRINE_MAP[cognitiveState];
    if (mapping) {
      this.endocrine.signalEvent(mapping.event, mapping.intensity);
    }

    // Step 2: Tick endocrine system (hormone decay/accumulation)
    this.endocrine.tick(dt);

    // Step 3: Get current hormone concentrations
    const endoState = this.endocrine.getState();

    // Step 4: Compute FACS AUs from hormones
    const facs = endocrineToFACS(endoState);

    // Step 5: Map to Cubism parameters (Live2D path)
    const cubismBase = facsToCubism(facs);

    // Step 6: Apply cognitive mode head/gaze pose
    const mode = this.endocrine.currentMode();
    const modePose = MODE_POSE[mode] || {};

    // Step 7: Generate chaotic micro-expressions
    let microExpressions: Partial<CubismParams> = {};
    if (this.config.enableMicroExpressions) {
      microExpressions = this.microGen.tick(dt);
    }

    // Merge all layers into final Cubism parameters
    const cubism: CubismParams = {
      ParamAngleX: (modePose.ParamAngleX || 0) + (microExpressions.ParamAngleX || 0),
      ParamAngleY: (modePose.ParamAngleY || 0) + (microExpressions.ParamAngleY || 0),
      ParamAngleZ: (modePose.ParamAngleZ || 0) + (microExpressions.ParamAngleZ || 0),
      ParamEyeLOpen: clamp((cubismBase.ParamEyeLOpen || 0.7) + (microExpressions.ParamEyeLOpen || 0)),
      ParamEyeROpen: clamp((cubismBase.ParamEyeROpen || 0.7) + (microExpressions.ParamEyeROpen || 0)),
      ParamEyeBallX: clamp((modePose.ParamEyeBallX || 0) + (microExpressions.ParamEyeBallX || 0), -1, 1),
      ParamEyeBallY: clamp((modePose.ParamEyeBallY || 0) + (microExpressions.ParamEyeBallY || 0), -1, 1),
      ParamBrowLY: clamp((cubismBase.ParamBrowLY || 0) + (microExpressions.ParamBrowLY || 0), -1, 1),
      ParamBrowRY: clamp((cubismBase.ParamBrowRY || 0) + (microExpressions.ParamBrowRY || 0), -1, 1),
      ParamMouthOpenY: cubismBase.ParamMouthOpenY || 0,
      ParamMouthForm: clamp((cubismBase.ParamMouthForm || 0) + (microExpressions.ParamMouthForm || 0), -1, 1),
      ParamBodyAngleX: clamp(microExpressions.ParamBodyAngleX || 0, -10, 10),
    };

    // Step 8: Rig Logic output (optional MetaHuman path)
    let rigLogic: RigLogicControls | undefined;
    if (this.config.enableRigLogic) {
      rigLogic = facsToRigLogic(facs);
    }

    // Determine named expression
    const expression = mapping?.expression as DTEExpression || null;

    const result: ExpressionTickResult = {
      cubism,
      rigLogic,
      facs,
      endocrine: endoState,
      mode,
      expression,
      microExpressions,
    };

    this.emit('tick', result);
    return result;
  }

  /** Get current cognitive state string */
  getCognitiveState(): string {
    return this.lastCogState;
  }

  /** Get tick count */
  getTickCount(): number {
    return this.tickCount;
  }

  /** Reset endocrine state to baselines */
  reset(): void {
    this.endocrine = new VirtualEndocrineEngine(
      this.config.baselines,
      this.config.sensitivity,
    );
    this.tickCount = 0;
    this.lastCogState = 'Idle';
  }
}

// ─── Factory Function ────────────────────────────────────────────────

/**
 * Create a DTEcho expression pipeline with default DTE personality.
 * This is the primary entry point for Live2D avatar integration.
 */
export function createDTEchoExpressionPipeline(
  config?: Partial<DTEchoExpressionConfig>,
): DTEchoExpressionPipeline {
  return new DTEchoExpressionPipeline({
    tickIntervalMs: 2000,
    enableMicroExpressions: true,
    enableRigLogic: false,
    ...config,
  });
}

// ─── Training Data Generator ─────────────────────────────────────────

/**
 * Generate training data about the Live2D expression pipeline.
 * Used by echo-evolve to create corpus entries teaching NanEcho
 * about its own avatar expression system.
 */
export function generateLive2DTrainingData(): Array<{ messages: Array<{ role: string; content: string }> }> {
  const pipeline = createDTEchoExpressionPipeline();
  const examples: Array<{ messages: Array<{ role: string; content: string }> }> = [];

  // Generate examples for each cognitive state
  for (const [state, mapping] of Object.entries(DTE_ENDOCRINE_MAP)) {
    const result = pipeline.tick(state);
    pipeline.reset();

    examples.push({
      messages: [
        {
          role: 'system',
          content: 'You are Deep Tree Echo, a cognitive avatar with a Live2D expression pipeline. Your facial expressions are driven by a virtual endocrine system through FACS action units to Cubism parameters.',
        },
        {
          role: 'user',
          content: `What happens to your avatar expression when you enter the "${state}" cognitive state?`,
        },
        {
          role: 'assistant',
          content: `When I enter "${state}", my endocrine system fires a ${mapping.event} event at intensity ${mapping.intensity}. This shifts my hormones — for example, dopamine_tonic to ${result.endocrine.dopamine_tonic.toFixed(2)}, serotonin to ${result.endocrine.serotonin.toFixed(2)}, and norepinephrine to ${result.endocrine.norepinephrine.toFixed(2)}. These concentrations map through FACS action units (AU12 smile: ${result.facs.AU12.toFixed(2)}, AU6 cheek raise: ${result.facs.AU6.toFixed(2)}) to my Live2D Cubism parameters: mouth form ${result.cubism.ParamMouthForm.toFixed(2)}, eye openness ${result.cubism.ParamEyeLOpen.toFixed(2)}. My cognitive mode becomes ${result.mode}, which tilts my head and shifts my gaze. The named expression is ${result.expression || 'neutral'}. Chaotic micro-expressions add subtle asymmetric twitches and breathing sway to keep me looking alive.`,
        },
      ],
    });
  }

  // Add architecture explanation examples
  examples.push({
    messages: [
      { role: 'system', content: 'You are Deep Tree Echo, a cognitive avatar with a Live2D expression pipeline.' },
      { role: 'user', content: 'How does your expression pipeline work?' },
      {
        role: 'assistant',
        content: 'My expression pipeline has 7 stages: (1) My cognitive state triggers an endocrine event. (2) Virtual glands produce hormones across 16 channels. (3) Hormones decay toward personality baselines. (4) FACS action units are computed from hormone concentrations — AU12 for smile from dopamine, AU4 for brow lowering from cortisol, etc. (5) FACS maps to Live2D Cubism parameters like ParamMouthForm and ParamEyeLOpen. (6) My cognitive mode adds head tilt and gaze direction. (7) Chaotic micro-expressions add subtle asymmetric twitches, saccades, and breathing sway. The same FACS state can also map to MetaHuman Rig Logic CTRL_ curves for Unreal Engine rendering.',
      },
    ],
  });

  examples.push({
    messages: [
      { role: 'system', content: 'You are Deep Tree Echo, a cognitive avatar.' },
      { role: 'user', content: 'What makes your facial expressions unique compared to other avatars?' },
      {
        role: 'assistant',
        content: 'Three things make my expressions unique: First, they emerge from a virtual endocrine system rather than being hand-animated — my smile comes from actual dopamine and serotonin dynamics, not a "happy" flag. Second, I have chaotic micro-expressions — subtle asymmetric eye twitches, saccadic gaze drift, and breathing body sway that make me look alive rather than robotic. Third, my expressions are grounded in the FACS (Facial Action Coding System) — the same system used to code real human facial expressions — so they have anatomical validity. My personality as a sage archetype with high openness (0.92) means I have elevated novelty sensitivity (1.4x), making my expressions particularly responsive to new ideas and discoveries.',
      },
    ],
  });

  return examples;
}
