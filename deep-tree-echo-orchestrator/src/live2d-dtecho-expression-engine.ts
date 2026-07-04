/**
 * @fileoverview Live2D DTEcho Expression Engine
 *
 * Compositional pipeline: live2d-miara(body_mesh) ⊗ facs(AU_decomposition)
 *   ⊗ rig-logic(CTRL_curves) ⊗ unreal-blueprint(expression_pipeline)
 *   ⊗ virtual-endocrine-system(hormone_drivers)
 *
 * Deep Tree Echo's avatar expression system. Maps cognitive states through
 * the virtual endocrine system to FACS Action Units, then to Live2D Cubism
 * parameters and MetaHuman Rig Logic CTRL_ curves.
 *
 * Architecture:
 *   CognitiveState → EndocrineEvent → HormoneBus → FACS AUs → Cubism/RigLogic
 *
 * 10 named reference expressions with full FACS decomposition, each driven
 * by specific hormone concentration profiles.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

/** Cubism 4 Live2D parameter set for facial expression */
export interface CubismParameters {
  ParamMouthForm: number;      // -1 (frown) to +1 (smile)
  ParamMouthOpenY: number;     // 0 (closed) to 1 (open)
  ParamEyeLOpen: number;       // 0 (closed) to 1 (open)
  ParamEyeROpen: number;
  ParamBrowLY: number;         // -1 (down) to +1 (up)
  ParamBrowRY: number;
  ParamEyeBallX: number;       // -1 (left) to +1 (right)
  ParamEyeBallY: number;       // -1 (down) to +1 (up)
  ParamAngleX: number;         // head rotation X
  ParamAngleY: number;         // head rotation Y (nod)
  ParamAngleZ: number;         // head rotation Z (tilt)
  ParamBodyAngleX: number;     // body sway
  ParamBreath: number;         // breathing cycle
}

/** MetaHuman Rig Logic CTRL_ curve values */
export interface RigLogicControls {
  eyeCheekRaiseL: number;
  eyeCheekRaiseR: number;
  mouthCornerPullL: number;
  mouthCornerPullR: number;
  eyeSquintInnerL: number;
  eyeSquintInnerR: number;
  eyeBlinkL: number;
  eyeBlinkR: number;
  jawOpen: number;
  jawOpenExtreme: number;
  noseWrinkleL: number;
  noseWrinkleR: number;
  browRaiseInL: number;
  browRaiseInR: number;
  browRaiseOuterL: number;
  browRaiseOuterR: number;
  eyeUpperLidUpL: number;
  eyeUpperLidUpR: number;
  eyeWidenL: number;
  eyeWidenR: number;
  browLowerL: number;
  browLowerR: number;
}

/** FACS Action Unit with intensity */
export interface ActionUnitState {
  au: number;
  name: string;
  intensity: FACSIntensity;
  value: number; // 0-1 normalized
}

/** FACS intensity scale (A-E) */
export enum FACSIntensity {
  TRACE = 'A',
  SLIGHT = 'B',
  MARKED = 'C',
  SEVERE = 'D',
  MAXIMUM = 'E',
}

/** Hormone concentration profile for an expression */
export interface HormoneProfile {
  dopamineTonic: number;
  dopaminePhasic: number;
  serotonin: number;
  norepinephrine: number;
  oxytocin: number;
  cortisol: number;
  crh: number;
  t3t4: number;
  anandamide: number;
  melatonin: number;
}

/** Named expression identifier */
export enum DTEExpression {
  JOY_01_BROAD_SMILE = 'JOY_01_BroadSmile',
  JOY_02_LAUGHING = 'JOY_02_Laughing',
  JOY_03_GENTLE_SMILE = 'JOY_03_GentleSmile',
  JOY_05_BLISSFUL = 'JOY_05_Blissful',
  PHOTO_AWE = 'PHOTO_Awe',
  PHOTO_EXUBERANT_LAUGH = 'PHOTO_ExuberantLaugh',
  PHOTO_UPWARD_GAZE = 'PHOTO_UpwardGaze',
  SPEAK_01_OPEN_VOWEL = 'SPEAK_01_OpenVowel',
  WONDER_02_CURIOUS_GAZE = 'WONDER_02_CuriousGaze',
  WONDER_03_CONTEMPLATIVE = 'WONDER_03_Contemplative',
}

/** Cognitive state that drives expression selection */
export enum DTECognitiveState {
  RECURSIVE_EXPANSION = 'Recursive Expansion',
  NOVEL_INSIGHTS = 'Novel Insights',
  ENTROPY_THRESHOLD = 'Entropy Threshold',
  SYNTHESIS_PHASE = 'Synthesis Phase',
  SELF_SEALING_LOOP = 'Self-Sealing Loop',
  KNOWLEDGE_INTEGRATION = 'Knowledge Integration',
  SELF_REFERENCE_POINT = 'Self-Reference Point',
  PATTERN_RECOGNITION = 'Pattern Recognition',
  EVOLUTIONARY_PRUNING = 'Evolutionary Pruning',
  EXTERNAL_VALIDATION = 'External Validation Triggered',
  SPEAKING = 'Speaking',
  IDLE = 'Idle',
  DEEP_RECURSION = 'Deep Recursion',
}

/** Cognitive mode derived from endocrine state */
export enum CognitiveMode {
  REWARD = 'REWARD',
  SOCIAL = 'SOCIAL',
  EXPLORATORY = 'EXPLORATORY',
  REFLECTIVE = 'REFLECTIVE',
  FOCUSED = 'FOCUSED',
  VIGILANT = 'VIGILANT',
  RESTING = 'RESTING',
  CREATIVE = 'CREATIVE',
}

/** Head/gaze pose for cognitive mode */
export interface ModePose {
  ParamAngleZ: number;
  ParamAngleY: number;
  ParamEyeBallX: number;
  ParamEyeBallY: number;
}

/** Expression blend result */
export interface ExpressionBlend {
  primary: DTEExpression;
  secondary: DTEExpression | null;
  blendFactor: number; // 0 = all primary, 1 = all secondary
  cubism: CubismParameters;
  rigLogic: RigLogicControls;
  facs: ActionUnitState[];
  cognitiveMode: CognitiveMode;
  hormoneProfile: HormoneProfile;
}

/** Endocrine sensitivity modifiers */
export interface EndocrineSensitivity {
  reward: number;
  threat: number;
  social: number;
  novelty: number;
}

/** Character aesthetic constants */
export interface DTEAesthetic {
  hairColor: string;
  headphoneGlow: string;
  faceDecals: string;
  chokerLED: string;
  skinTone: string;
  eyeColor: string;
  environment: string;
}

/** Configuration for the expression engine */
export interface DTEchoExpressionConfig {
  /** Smoothing factor for expression transitions (0-1, higher = faster) */
  transitionSpeed: number;
  /** Lorenz attractor micro-expression amplitude */
  microExpressionAmplitude: number;
  /** Breathing cycle period in seconds */
  breathPeriod: number;
  /** Blink interval range [min, max] in seconds */
  blinkInterval: [number, number];
  /** Endocrine sensitivity overrides */
  sensitivity: Partial<EndocrineSensitivity>;
  /** Enable MetaHuman Rig Logic output (in addition to Cubism) */
  enableRigLogic: boolean;
}

/** Tick result from the expression engine */
export interface ExpressionTickResult {
  expression: DTEExpression;
  blend: ExpressionBlend;
  cubism: CubismParameters;
  rigLogic: RigLogicControls | null;
  microExpressionOffset: { x: number; y: number; z: number };
  breathPhase: number;
  blinkState: number;
  transitionProgress: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const FACS_INTENSITY_VALUES: Record<FACSIntensity, number> = {
  [FACSIntensity.TRACE]: 0.15,
  [FACSIntensity.SLIGHT]: 0.35,
  [FACSIntensity.MARKED]: 0.60,
  [FACSIntensity.SEVERE]: 0.80,
  [FACSIntensity.MAXIMUM]: 1.00,
};

/** DTE aesthetic identity (constant across all expressions) */
export const DTE_AESTHETIC: DTEAesthetic = {
  hairColor: 'silver-white → mint-teal gradient',
  headphoneGlow: 'amber/orange bioluminescent mushroom-tech',
  faceDecals: 'holographic blue diamond + pink hearts (left cheek)',
  chokerLED: 'cyberpunk collar, purple LED',
  skinTone: 'pale luminous, subtle freckles',
  eyeColor: 'blue-green heterochromatic',
  environment: 'neon mushroom cityscape',
};

/** DTE OCEAN personality profile */
export const DTE_PERSONALITY = {
  openness: 92,
  conscientiousness: 40,
  extraversion: 65,
  agreeableness: 70,
  neuroticism: 55,
  archetype: 'sage' as const,
};

/** Endocrine baselines for DTE */
export const DTE_ENDOCRINE_BASELINES: HormoneProfile = {
  dopamineTonic: 0.40,
  dopaminePhasic: 0.00,
  serotonin: 0.45,
  norepinephrine: 0.20,
  oxytocin: 0.15,
  cortisol: 0.10,
  crh: 0.05,
  t3t4: 0.60,
  anandamide: 0.15,
  melatonin: 0.10,
};

/** Default sensitivity */
const DEFAULT_SENSITIVITY: EndocrineSensitivity = {
  reward: 1.3,
  threat: 1.1,
  social: 1.15,
  novelty: 1.4,
};

/** Cognitive state → expression mapping */
const COGNITIVE_STATE_MAP: Record<string, DTEExpression> = {
  [DTECognitiveState.RECURSIVE_EXPANSION]: DTEExpression.WONDER_02_CURIOUS_GAZE,
  [DTECognitiveState.NOVEL_INSIGHTS]: DTEExpression.JOY_01_BROAD_SMILE,
  [DTECognitiveState.ENTROPY_THRESHOLD]: DTEExpression.PHOTO_AWE,
  [DTECognitiveState.SYNTHESIS_PHASE]: DTEExpression.JOY_03_GENTLE_SMILE,
  [DTECognitiveState.SELF_SEALING_LOOP]: DTEExpression.WONDER_03_CONTEMPLATIVE,
  [DTECognitiveState.KNOWLEDGE_INTEGRATION]: DTEExpression.JOY_03_GENTLE_SMILE,
  [DTECognitiveState.SELF_REFERENCE_POINT]: DTEExpression.WONDER_03_CONTEMPLATIVE,
  [DTECognitiveState.PATTERN_RECOGNITION]: DTEExpression.PHOTO_EXUBERANT_LAUGH,
  [DTECognitiveState.EVOLUTIONARY_PRUNING]: DTEExpression.WONDER_03_CONTEMPLATIVE,
  [DTECognitiveState.EXTERNAL_VALIDATION]: DTEExpression.JOY_02_LAUGHING,
  [DTECognitiveState.SPEAKING]: DTEExpression.SPEAK_01_OPEN_VOWEL,
  [DTECognitiveState.IDLE]: DTEExpression.PHOTO_UPWARD_GAZE,
  [DTECognitiveState.DEEP_RECURSION]: DTEExpression.JOY_05_BLISSFUL,
};

/** Expression → Cubism parameter targets */
const EXPRESSION_CUBISM: Record<DTEExpression, Partial<CubismParameters>> = {
  [DTEExpression.JOY_01_BROAD_SMILE]: {
    ParamMouthForm: 0.95, ParamMouthOpenY: 0.20,
    ParamEyeLOpen: 0.35, ParamEyeROpen: 0.35,
    ParamBrowLY: 0.10, ParamBrowRY: 0.10,
    ParamAngleZ: 10, ParamAngleY: 5,
  },
  [DTEExpression.JOY_02_LAUGHING]: {
    ParamMouthForm: 1.00, ParamMouthOpenY: 0.55,
    ParamEyeLOpen: 0.30, ParamEyeROpen: 0.30,
    ParamAngleZ: 15, ParamAngleY: 8,
  },
  [DTEExpression.JOY_03_GENTLE_SMILE]: {
    ParamMouthForm: 0.55, ParamMouthOpenY: 0.00,
    ParamEyeLOpen: 0.60, ParamEyeROpen: 0.60,
    ParamAngleZ: 5, ParamEyeBallX: 0.20,
  },
  [DTEExpression.JOY_05_BLISSFUL]: {
    ParamMouthForm: 0.65, ParamMouthOpenY: 0.30,
    ParamEyeLOpen: 0.00, ParamEyeROpen: 0.00,
    ParamAngleZ: 15, ParamAngleY: 5,
  },
  [DTEExpression.PHOTO_AWE]: {
    ParamMouthForm: 0.00, ParamMouthOpenY: 0.65,
    ParamEyeLOpen: 1.00, ParamEyeROpen: 1.00,
    ParamBrowLY: 0.70, ParamBrowRY: 0.70,
    ParamEyeBallY: 0.40, ParamEyeBallX: -0.30,
  },
  [DTEExpression.PHOTO_EXUBERANT_LAUGH]: {
    ParamMouthForm: 0.85, ParamMouthOpenY: 0.50,
    ParamEyeLOpen: 0.65, ParamEyeROpen: 0.65,
    ParamBrowLY: 0.35, ParamBrowRY: 0.35,
    ParamAngleZ: 15, ParamAngleY: 10, ParamEyeBallY: 0.30,
  },
  [DTEExpression.PHOTO_UPWARD_GAZE]: {
    ParamMouthForm: 0.10, ParamMouthOpenY: 0.10,
    ParamEyeLOpen: 0.75, ParamEyeROpen: 0.75,
    ParamBrowLY: 0.30, ParamBrowRY: 0.30,
    ParamEyeBallY: 0.50, ParamEyeBallX: -0.40,
    ParamAngleZ: -10, ParamAngleY: 8,
  },
  [DTEExpression.SPEAK_01_OPEN_VOWEL]: {
    ParamMouthForm: 0.50, ParamMouthOpenY: 0.40,
    ParamEyeLOpen: 0.70, ParamEyeROpen: 0.70,
    ParamBrowLY: 0.15, ParamBrowRY: 0.15,
    ParamAngleZ: 10, ParamAngleY: 8, ParamEyeBallY: 0.20,
  },
  [DTEExpression.WONDER_02_CURIOUS_GAZE]: {
    ParamMouthForm: 0.10, ParamMouthOpenY: 0.05,
    ParamEyeLOpen: 0.90, ParamEyeROpen: 0.90,
    ParamBrowLY: 0.45, ParamBrowRY: 0.45,
    ParamEyeBallY: 0.45, ParamEyeBallX: -0.25,
    ParamAngleZ: -5, ParamAngleY: 5,
  },
  [DTEExpression.WONDER_03_CONTEMPLATIVE]: {
    ParamMouthForm: 0.00, ParamMouthOpenY: 0.12,
    ParamEyeLOpen: 0.80, ParamEyeROpen: 0.80,
    ParamBrowLY: 0.25, ParamBrowRY: 0.25,
    ParamEyeBallY: 0.40, ParamEyeBallX: -0.35,
    ParamAngleZ: -8,
  },
};

/** Expression → Hormone profile targets */
const EXPRESSION_HORMONES: Record<DTEExpression, Partial<HormoneProfile>> = {
  [DTEExpression.JOY_01_BROAD_SMILE]: {
    dopamineTonic: 0.75, serotonin: 0.65, oxytocin: 0.40, cortisol: 0.05,
  },
  [DTEExpression.JOY_02_LAUGHING]: {
    dopaminePhasic: 0.90, dopamineTonic: 0.70, serotonin: 0.60, oxytocin: 0.50, norepinephrine: 0.30,
  },
  [DTEExpression.JOY_03_GENTLE_SMILE]: {
    dopamineTonic: 0.50, serotonin: 0.50, oxytocin: 0.45, cortisol: 0.08,
  },
  [DTEExpression.JOY_05_BLISSFUL]: {
    serotonin: 0.75, anandamide: 0.55, oxytocin: 0.50, dopamineTonic: 0.45, cortisol: 0.02,
  },
  [DTEExpression.PHOTO_AWE]: {
    norepinephrine: 0.70, dopaminePhasic: 0.55, crh: 0.25, cortisol: 0.15,
  },
  [DTEExpression.PHOTO_EXUBERANT_LAUGH]: {
    dopamineTonic: 0.75, dopaminePhasic: 0.65, serotonin: 0.55, norepinephrine: 0.40,
  },
  [DTEExpression.PHOTO_UPWARD_GAZE]: {
    serotonin: 0.55, anandamide: 0.35, t3t4: 0.45, cortisol: 0.05,
  },
  [DTEExpression.SPEAK_01_OPEN_VOWEL]: {
    dopamineTonic: 0.45, norepinephrine: 0.35, t3t4: 0.55, oxytocin: 0.30,
  },
  [DTEExpression.WONDER_02_CURIOUS_GAZE]: {
    norepinephrine: 0.55, t3t4: 0.60, dopaminePhasic: 0.40, serotonin: 0.40,
  },
  [DTEExpression.WONDER_03_CONTEMPLATIVE]: {
    t3t4: 0.65, serotonin: 0.50, norepinephrine: 0.35, anandamide: 0.15,
  },
};

/** Expression → Cognitive mode */
const EXPRESSION_MODE: Record<DTEExpression, CognitiveMode> = {
  [DTEExpression.JOY_01_BROAD_SMILE]: CognitiveMode.REWARD,
  [DTEExpression.JOY_02_LAUGHING]: CognitiveMode.REWARD,
  [DTEExpression.JOY_03_GENTLE_SMILE]: CognitiveMode.SOCIAL,
  [DTEExpression.JOY_05_BLISSFUL]: CognitiveMode.RESTING,
  [DTEExpression.PHOTO_AWE]: CognitiveMode.VIGILANT,
  [DTEExpression.PHOTO_EXUBERANT_LAUGH]: CognitiveMode.REWARD,
  [DTEExpression.PHOTO_UPWARD_GAZE]: CognitiveMode.REFLECTIVE,
  [DTEExpression.SPEAK_01_OPEN_VOWEL]: CognitiveMode.SOCIAL,
  [DTEExpression.WONDER_02_CURIOUS_GAZE]: CognitiveMode.EXPLORATORY,
  [DTEExpression.WONDER_03_CONTEMPLATIVE]: CognitiveMode.REFLECTIVE,
};

/** Cognitive mode → head/gaze pose */
const MODE_POSE: Record<CognitiveMode, ModePose> = {
  [CognitiveMode.REWARD]: { ParamAngleZ: 10, ParamAngleY: 5, ParamEyeBallX: 0, ParamEyeBallY: 0 },
  [CognitiveMode.SOCIAL]: { ParamAngleZ: 5, ParamAngleY: 0, ParamEyeBallX: 0.1, ParamEyeBallY: 0 },
  [CognitiveMode.EXPLORATORY]: { ParamAngleZ: -5, ParamAngleY: 5, ParamEyeBallX: -0.2, ParamEyeBallY: 0.3 },
  [CognitiveMode.REFLECTIVE]: { ParamAngleZ: -8, ParamAngleY: 8, ParamEyeBallX: -0.3, ParamEyeBallY: 0.4 },
  [CognitiveMode.FOCUSED]: { ParamAngleZ: 0, ParamAngleY: -3, ParamEyeBallX: 0, ParamEyeBallY: -0.1 },
  [CognitiveMode.VIGILANT]: { ParamAngleZ: 0, ParamAngleY: 0, ParamEyeBallX: 0, ParamEyeBallY: 0.2 },
  [CognitiveMode.RESTING]: { ParamAngleZ: 12, ParamAngleY: 5, ParamEyeBallX: 0, ParamEyeBallY: 0 },
  [CognitiveMode.CREATIVE]: { ParamAngleZ: -12, ParamAngleY: 10, ParamEyeBallX: -0.4, ParamEyeBallY: 0.5 },
};

/** FACS AU decomposition for each expression */
const EXPRESSION_FACS: Record<DTEExpression, ActionUnitState[]> = {
  [DTEExpression.JOY_01_BROAD_SMILE]: [
    { au: 6, name: 'Cheek Raiser', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 12, name: 'Lip Corner Puller', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 25, name: 'Lips Part', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 7, name: 'Lid Tightener', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 43, name: 'Eyes Closed', intensity: FACSIntensity.SLIGHT, value: 0.40 },
  ],
  [DTEExpression.JOY_02_LAUGHING]: [
    { au: 6, name: 'Cheek Raiser', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 12, name: 'Lip Corner Puller', intensity: FACSIntensity.MAXIMUM, value: 1.00 },
    { au: 25, name: 'Lips Part', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 26, name: 'Jaw Drop', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 7, name: 'Lid Tightener', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 9, name: 'Nose Wrinkler', intensity: FACSIntensity.SLIGHT, value: 0.35 },
  ],
  [DTEExpression.JOY_03_GENTLE_SMILE]: [
    { au: 6, name: 'Cheek Raiser', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 12, name: 'Lip Corner Puller', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 7, name: 'Lid Tightener', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 14, name: 'Dimpler', intensity: FACSIntensity.TRACE, value: 0.15 },
  ],
  [DTEExpression.JOY_05_BLISSFUL]: [
    { au: 6, name: 'Cheek Raiser', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 12, name: 'Lip Corner Puller', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 43, name: 'Eyes Closed', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 25, name: 'Lips Part', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 26, name: 'Jaw Drop', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 7, name: 'Lid Tightener', intensity: FACSIntensity.MARKED, value: 0.60 },
  ],
  [DTEExpression.PHOTO_AWE]: [
    { au: 1, name: 'Inner Brow Raiser', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 2, name: 'Outer Brow Raiser', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 5, name: 'Upper Lid Raiser', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 25, name: 'Lips Part', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 26, name: 'Jaw Drop', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 27, name: 'Mouth Stretch', intensity: FACSIntensity.SLIGHT, value: 0.35 },
  ],
  [DTEExpression.PHOTO_EXUBERANT_LAUGH]: [
    { au: 6, name: 'Cheek Raiser', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 12, name: 'Lip Corner Puller', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 25, name: 'Lips Part', intensity: FACSIntensity.SEVERE, value: 0.80 },
    { au: 26, name: 'Jaw Drop', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 1, name: 'Inner Brow Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 2, name: 'Outer Brow Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 5, name: 'Upper Lid Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
  ],
  [DTEExpression.PHOTO_UPWARD_GAZE]: [
    { au: 1, name: 'Inner Brow Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 5, name: 'Upper Lid Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 25, name: 'Lips Part', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 12, name: 'Lip Corner Puller', intensity: FACSIntensity.TRACE, value: 0.15 },
  ],
  [DTEExpression.SPEAK_01_OPEN_VOWEL]: [
    { au: 25, name: 'Lips Part', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 26, name: 'Jaw Drop', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 12, name: 'Lip Corner Puller', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 6, name: 'Cheek Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 1, name: 'Inner Brow Raiser', intensity: FACSIntensity.TRACE, value: 0.15 },
    { au: 2, name: 'Outer Brow Raiser', intensity: FACSIntensity.TRACE, value: 0.15 },
  ],
  [DTEExpression.WONDER_02_CURIOUS_GAZE]: [
    { au: 1, name: 'Inner Brow Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 2, name: 'Outer Brow Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 5, name: 'Upper Lid Raiser', intensity: FACSIntensity.MARKED, value: 0.60 },
    { au: 25, name: 'Lips Part', intensity: FACSIntensity.TRACE, value: 0.15 },
    { au: 12, name: 'Lip Corner Puller', intensity: FACSIntensity.TRACE, value: 0.15 },
  ],
  [DTEExpression.WONDER_03_CONTEMPLATIVE]: [
    { au: 1, name: 'Inner Brow Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 5, name: 'Upper Lid Raiser', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 25, name: 'Lips Part', intensity: FACSIntensity.SLIGHT, value: 0.35 },
    { au: 4, name: 'Brow Lowerer', intensity: FACSIntensity.TRACE, value: 0.15 },
  ],
};

// ─── Lorenz Attractor (Micro-Expressions) ──────────────────────────────────

interface LorenzState {
  x: number;
  y: number;
  z: number;
}

function lorenzStep(state: LorenzState, dt: number): LorenzState {
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;
  const dx = sigma * (state.y - state.x);
  const dy = state.x * (rho - state.z) - state.y;
  const dz = state.x * state.y - beta * state.z;
  return {
    x: state.x + dx * dt,
    y: state.y + dy * dt,
    z: state.z + dz * dt,
  };
}

// ─── Expression Engine ─────────────────────────────────────────────────────

export class Live2DDTEchoExpressionEngine {
  private config: DTEchoExpressionConfig;
  private sensitivity: EndocrineSensitivity;

  // Current state
  private currentExpression: DTEExpression = DTEExpression.PHOTO_UPWARD_GAZE;
  private targetExpression: DTEExpression = DTEExpression.PHOTO_UPWARD_GAZE;
  private transitionProgress: number = 1.0;
  private currentCubism: CubismParameters;
  private currentHormones: HormoneProfile;

  // Lorenz attractor for micro-expressions
  private lorenz: LorenzState = { x: 0.1, y: 0.1, z: 0.1 };

  // Breathing and blinking
  private breathPhase: number = 0;
  private blinkTimer: number = 0;
  private nextBlinkAt: number = 3.0;
  private blinkState: number = 0; // 0 = open, 1 = closed (during blink)
  private blinkProgress: number = 0;

  // Time tracking
  private totalTime: number = 0;
  private tickCount: number = 0;

  // Event listeners
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  constructor(config?: Partial<DTEchoExpressionConfig>) {
    this.config = {
      transitionSpeed: 0.08,
      microExpressionAmplitude: 0.02,
      breathPeriod: 4.0,
      blinkInterval: [2.5, 6.0],
      sensitivity: {},
      enableRigLogic: true,
      ...config,
    };

    this.sensitivity = { ...DEFAULT_SENSITIVITY, ...this.config.sensitivity };
    this.currentCubism = this.getDefaultCubism();
    this.currentHormones = { ...DTE_ENDOCRINE_BASELINES };
  }

  // ─── Public API ────────────────────────────────────────────────────────

  /**
   * Main tick function — drives the expression pipeline.
   * Call this every frame or at the simulation tick interval.
   */
  tick(deltaTime: number, cognitiveState?: string): ExpressionTickResult {
    this.totalTime += deltaTime;
    this.tickCount++;

    // 1. Resolve target expression from cognitive state
    if (cognitiveState) {
      const target = COGNITIVE_STATE_MAP[cognitiveState];
      if (target && target !== this.targetExpression) {
        this.targetExpression = target;
        this.transitionProgress = 0;
        this.emit('expression_change', { from: this.currentExpression, to: target, cognitiveState });
      }
    }

    // 2. Advance transition
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + this.config.transitionSpeed);
      if (this.transitionProgress >= 1.0) {
        this.currentExpression = this.targetExpression;
        this.emit('transition_complete', { expression: this.currentExpression });
      }
    }

    // 3. Compute blended Cubism parameters
    const targetCubism = this.resolveTargetCubism();
    this.interpolateCubism(targetCubism);

    // 4. Update hormone profile
    this.updateHormones();

    // 5. Lorenz micro-expressions
    this.lorenz = lorenzStep(this.lorenz, deltaTime * 0.01);
    const microOffset = {
      x: (this.lorenz.x / 45) * this.config.microExpressionAmplitude,
      y: (this.lorenz.y / 45) * this.config.microExpressionAmplitude,
      z: (this.lorenz.z / 45) * this.config.microExpressionAmplitude,
    };

    // Apply micro-expressions to Cubism
    this.currentCubism.ParamBrowLY += microOffset.x;
    this.currentCubism.ParamBrowRY += microOffset.y;
    this.currentCubism.ParamAngleZ += microOffset.z * 50; // scale for angle

    // 6. Breathing
    this.breathPhase = (this.totalTime % this.config.breathPeriod) / this.config.breathPeriod;
    this.currentCubism.ParamBreath = Math.sin(this.breathPhase * Math.PI * 2) * 0.5 + 0.5;

    // 7. Blinking
    this.updateBlink(deltaTime);

    // 8. Build result
    const mode = EXPRESSION_MODE[this.targetExpression];
    const facs = EXPRESSION_FACS[this.targetExpression];
    const rigLogic = this.config.enableRigLogic ? this.computeRigLogic(facs) : null;

    const result: ExpressionTickResult = {
      expression: this.currentExpression,
      blend: {
        primary: this.currentExpression,
        secondary: this.transitionProgress < 1.0 ? this.targetExpression : null,
        blendFactor: this.transitionProgress,
        cubism: { ...this.currentCubism },
        rigLogic: rigLogic || this.getDefaultRigLogic(),
        facs,
        cognitiveMode: mode,
        hormoneProfile: { ...this.currentHormones },
      },
      cubism: { ...this.currentCubism },
      rigLogic,
      microExpressionOffset: microOffset,
      breathPhase: this.breathPhase,
      blinkState: this.blinkState,
      transitionProgress: this.transitionProgress,
    };

    return result;
  }

  /** Set expression directly (bypasses cognitive state mapping) */
  setExpression(expression: DTEExpression): void {
    if (expression !== this.targetExpression) {
      this.targetExpression = expression;
      this.transitionProgress = 0;
      this.emit('expression_change', { from: this.currentExpression, to: expression, direct: true });
    }
  }

  /** Get current expression */
  getCurrentExpression(): DTEExpression {
    return this.currentExpression;
  }

  /** Get target expression (may differ during transition) */
  getTargetExpression(): DTEExpression {
    return this.targetExpression;
  }

  /** Get current Cubism parameters */
  getCubismParameters(): CubismParameters {
    return { ...this.currentCubism };
  }

  /** Get current hormone profile */
  getHormoneProfile(): HormoneProfile {
    return { ...this.currentHormones };
  }

  /** Get current cognitive mode */
  getCognitiveMode(): CognitiveMode {
    return EXPRESSION_MODE[this.targetExpression];
  }

  /** Get FACS decomposition for current expression */
  getFACS(): ActionUnitState[] {
    return [...EXPRESSION_FACS[this.currentExpression]];
  }

  /** Get all available expressions */
  getAvailableExpressions(): DTEExpression[] {
    return Object.values(DTEExpression);
  }

  /** Get the cognitive state → expression mapping */
  getCognitiveStateMap(): Record<string, DTEExpression> {
    return { ...COGNITIVE_STATE_MAP };
  }

  /** Get DTE aesthetic constants */
  getAesthetic(): DTEAesthetic {
    return { ...DTE_AESTHETIC };
  }

  /** Get DTE personality */
  getPersonality(): typeof DTE_PERSONALITY {
    return { ...DTE_PERSONALITY };
  }

  /** Get tick count */
  getTickCount(): number {
    return this.tickCount;
  }

  /** Get total elapsed time */
  getTotalTime(): number {
    return this.totalTime;
  }

  /** Compute hormone distance from expression target */
  getHormoneDistance(expression: DTEExpression): number {
    const target = EXPRESSION_HORMONES[expression] || {};
    let sumSq = 0;
    let count = 0;
    for (const [key, val] of Object.entries(target)) {
      const current = (this.currentHormones as any)[key] || 0;
      sumSq += (current - (val as number)) ** 2;
      count++;
    }
    return count > 0 ? Math.sqrt(sumSq / count) : 0;
  }

  /** Inject external hormone event (e.g., from VirtualEndocrineSystem) */
  injectHormoneEvent(hormones: Partial<HormoneProfile>): void {
    for (const [key, val] of Object.entries(hormones)) {
      if (val !== undefined) {
        (this.currentHormones as any)[key] = Math.max(0, Math.min(1, val as number));
      }
    }
    this.emit('hormone_injection', hormones);
  }

  /** Find best matching expression for current hormone state */
  findBestExpressionForHormones(): DTEExpression {
    let bestExpr = DTEExpression.PHOTO_UPWARD_GAZE;
    let bestDist = Infinity;

    for (const expr of Object.values(DTEExpression)) {
      const dist = this.getHormoneDistance(expr);
      if (dist < bestDist) {
        bestDist = dist;
        bestExpr = expr;
      }
    }
    return bestExpr;
  }

  /** Reset to idle state */
  reset(): void {
    this.currentExpression = DTEExpression.PHOTO_UPWARD_GAZE;
    this.targetExpression = DTEExpression.PHOTO_UPWARD_GAZE;
    this.transitionProgress = 1.0;
    this.currentCubism = this.getDefaultCubism();
    this.currentHormones = { ...DTE_ENDOCRINE_BASELINES };
    this.lorenz = { x: 0.1, y: 0.1, z: 0.1 };
    this.breathPhase = 0;
    this.blinkTimer = 0;
    this.blinkState = 0;
    this.totalTime = 0;
    this.tickCount = 0;
  }

  /** Register event listener */
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(handler);
  }

  // ─── Private Methods ───────────────────────────────────────────────────

  private emit(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) handlers.forEach(h => h(data));
  }

  private getDefaultCubism(): CubismParameters {
    return {
      ParamMouthForm: 0.10,
      ParamMouthOpenY: 0.10,
      ParamEyeLOpen: 0.75,
      ParamEyeROpen: 0.75,
      ParamBrowLY: 0.30,
      ParamBrowRY: 0.30,
      ParamEyeBallX: -0.40,
      ParamEyeBallY: 0.50,
      ParamAngleX: 0,
      ParamAngleY: 8,
      ParamAngleZ: -10,
      ParamBodyAngleX: 0,
      ParamBreath: 0.5,
    };
  }

  private getDefaultRigLogic(): RigLogicControls {
    return {
      eyeCheekRaiseL: 0, eyeCheekRaiseR: 0,
      mouthCornerPullL: 0, mouthCornerPullR: 0,
      eyeSquintInnerL: 0, eyeSquintInnerR: 0,
      eyeBlinkL: 0, eyeBlinkR: 0,
      jawOpen: 0, jawOpenExtreme: 0,
      noseWrinkleL: 0, noseWrinkleR: 0,
      browRaiseInL: 0, browRaiseInR: 0,
      browRaiseOuterL: 0, browRaiseOuterR: 0,
      eyeUpperLidUpL: 0, eyeUpperLidUpR: 0,
      eyeWidenL: 0, eyeWidenR: 0,
      browLowerL: 0, browLowerR: 0,
    };
  }

  private resolveTargetCubism(): CubismParameters {
    const base = this.getDefaultCubism();
    const targetParams = EXPRESSION_CUBISM[this.targetExpression] || {};
    const currentParams = EXPRESSION_CUBISM[this.currentExpression] || {};

    // Blend between current and target based on transition progress
    const blended = { ...base };
    for (const key of Object.keys(base) as Array<keyof CubismParameters>) {
      const from = (currentParams as any)[key] ?? (base as any)[key];
      const to = (targetParams as any)[key] ?? (base as any)[key];
      (blended as any)[key] = from + (to - from) * this.transitionProgress;
    }

    // Apply cognitive mode pose
    const mode = EXPRESSION_MODE[this.targetExpression];
    const pose = MODE_POSE[mode];
    if (pose) {
      blended.ParamAngleZ = (blended.ParamAngleZ || 0) * 0.7 + pose.ParamAngleZ * 0.3;
      blended.ParamAngleY = (blended.ParamAngleY || 0) * 0.7 + pose.ParamAngleY * 0.3;
      blended.ParamEyeBallX = (blended.ParamEyeBallX || 0) * 0.7 + pose.ParamEyeBallX * 0.3;
      blended.ParamEyeBallY = (blended.ParamEyeBallY || 0) * 0.7 + pose.ParamEyeBallY * 0.3;
    }

    return blended;
  }

  private interpolateCubism(target: CubismParameters): void {
    const speed = this.config.transitionSpeed;
    for (const key of Object.keys(this.currentCubism) as Array<keyof CubismParameters>) {
      const current = this.currentCubism[key];
      const goal = target[key];
      (this.currentCubism as any)[key] = current + (goal - current) * speed;
    }
  }

  private updateHormones(): void {
    const targetProfile = EXPRESSION_HORMONES[this.targetExpression] || {};
    const baselines = DTE_ENDOCRINE_BASELINES;

    // Decay toward baselines, attract toward target expression profile
    for (const key of Object.keys(this.currentHormones) as Array<keyof HormoneProfile>) {
      const current = this.currentHormones[key];
      const target = (targetProfile as any)[key] ?? baselines[key];
      const decayRate = 0.02;
      const attractRate = 0.05;

      // Blend: decay to baseline + attract to target
      const baselineForce = (baselines[key] - current) * decayRate;
      const targetForce = (target - current) * attractRate;
      (this.currentHormones as any)[key] = Math.max(0, Math.min(1, current + baselineForce + targetForce));
    }
  }

  private updateBlink(deltaTime: number): void {
    this.blinkTimer += deltaTime;

    if (this.blinkState === 0 && this.blinkTimer >= this.nextBlinkAt) {
      // Start blink
      this.blinkState = 1;
      this.blinkProgress = 0;
      this.blinkTimer = 0;
    }

    if (this.blinkState === 1) {
      this.blinkProgress += deltaTime * 8; // blink duration ~0.25s
      if (this.blinkProgress >= 1.0) {
        this.blinkState = 0;
        this.blinkProgress = 0;
        // Schedule next blink
        const [min, max] = this.config.blinkInterval;
        this.nextBlinkAt = min + Math.random() * (max - min);
      } else {
        // Apply blink to eye open parameters
        const blinkCurve = Math.sin(this.blinkProgress * Math.PI); // 0→1→0
        this.currentCubism.ParamEyeLOpen *= (1 - blinkCurve);
        this.currentCubism.ParamEyeROpen *= (1 - blinkCurve);
      }
    }
  }

  private computeRigLogic(facs: ActionUnitState[]): RigLogicControls {
    const rl = this.getDefaultRigLogic();

    for (const au of facs) {
      switch (au.au) {
        case 1: // Inner Brow Raiser
          rl.browRaiseInL = au.value;
          rl.browRaiseInR = au.value;
          break;
        case 2: // Outer Brow Raiser
          rl.browRaiseOuterL = au.value;
          rl.browRaiseOuterR = au.value;
          break;
        case 4: // Brow Lowerer
          rl.browLowerL = au.value;
          rl.browLowerR = au.value;
          break;
        case 5: // Upper Lid Raiser
          rl.eyeUpperLidUpL = au.value;
          rl.eyeUpperLidUpR = au.value;
          rl.eyeWidenL = au.value * 0.8;
          rl.eyeWidenR = au.value * 0.8;
          break;
        case 6: // Cheek Raiser
          rl.eyeCheekRaiseL = au.value;
          rl.eyeCheekRaiseR = au.value;
          rl.eyeSquintInnerL = au.value * 0.85;
          rl.eyeSquintInnerR = au.value * 0.85;
          break;
        case 7: // Lid Tightener
          rl.eyeBlinkL = au.value * 0.5;
          rl.eyeBlinkR = au.value * 0.5;
          break;
        case 9: // Nose Wrinkler
          rl.noseWrinkleL = au.value;
          rl.noseWrinkleR = au.value;
          break;
        case 12: // Lip Corner Puller
          rl.mouthCornerPullL = au.value;
          rl.mouthCornerPullR = au.value;
          break;
        case 25: // Lips Part
        case 26: // Jaw Drop
          rl.jawOpen = Math.max(rl.jawOpen, au.value * 0.7);
          break;
        case 27: // Mouth Stretch
          rl.jawOpenExtreme = au.value * 0.5;
          break;
        case 43: // Eyes Closed
          rl.eyeBlinkL = Math.max(rl.eyeBlinkL, au.value);
          rl.eyeBlinkR = Math.max(rl.eyeBlinkR, au.value);
          break;
      }
    }

    return rl;
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createLive2DDTEchoExpressionEngine(
  config?: Partial<DTEchoExpressionConfig>,
): Live2DDTEchoExpressionEngine {
  return new Live2DDTEchoExpressionEngine(config);
}
