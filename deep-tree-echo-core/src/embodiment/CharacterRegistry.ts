/**
 * @fileoverview CharacterRegistry — Manages Live2D character model registrations
 *
 * Per live2d-char-model spec, each character is registered with:
 *   - Model path and Cubism version
 *   - OCEAN personality profile
 *   - Endocrine baselines and sensitivity
 *   - Expression → hormone threshold mappings
 *   - Motion → cognitive mode mappings
 *   - Simulation backend selection
 *
 * @packageDocumentation
 */

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface OCEANPersonality {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface EndocrineBaselines {
  cortisol: number;
  dopamine_tonic: number;
  dopamine_phasic: number;
  serotonin: number;
  norepinephrine: number;
  oxytocin: number;
  t3_t4: number;
  anandamide: number;
  melatonin: number;
  il6: number;
  crh: number;
  acth: number;
}

export interface EndocrineSensitivity {
  reward: number;
  threat: number;
  social: number;
  novelty: number;
}

export interface ExpressionRule {
  [hormone: string]: string; // e.g., "dopamine_tonic": ">0.5"
}

export interface CognitiveEvent {
  event: string;
  intensity: number;
  hormones: string[];
}

export interface ExtraParamConfig {
  name: string;
  driver: string;
  range: [number, number];
  default: number;
}

export interface CharacterRegistration {
  id: string;
  displayName: string;
  modelPath: string;
  cubismVersion: 'cubism2' | 'cubism4';
  scale: number;
  idleMotionGroup: string;
  hitAreas: string[];
  textureResolution: number;

  personality: {
    ocean: OCEANPersonality;
    archetype: string;
  };

  endocrine: {
    baselines: EndocrineBaselines;
    sensitivity: EndocrineSensitivity;
  };

  expressions: Record<string, ExpressionRule>;
  cognitiveExpressionMap: Record<string, string>;
  cognitiveEvents: Record<string, CognitiveEvent>;
  motions: Record<string, string[]>;

  simulation: {
    backend: 'cogsim-pml' | 'anylogic-modeler';
    tickIntervalMs: number;
    needsDecay: boolean;
  };

  meshPainter?: {
    enabled: boolean;
    modeVariants: boolean;
    glowRegions: string[];
    extraParams: Record<string, ExtraParamConfig>;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════════════

const registry = new Map<string, CharacterRegistration>();

export const CharacterRegistry = {
  register(char: CharacterRegistration): void {
    registry.set(char.id, char);
  },

  get(id: string): CharacterRegistration | undefined {
    return registry.get(id);
  },

  getAll(): CharacterRegistration[] {
    return Array.from(registry.values());
  },

  has(id: string): boolean {
    return registry.has(id);
  },

  unregister(id: string): boolean {
    return registry.delete(id);
  },
};

// ═══════════════════════════════════════════════════════════════════════
// DTEcho Registration — Pre-registered
// ═══════════════════════════════════════════════════════════════════════

CharacterRegistry.register({
  id: 'dtecho',
  displayName: 'Deep Tree Echo',
  modelPath: '/models/dtecho/dtecho_pro_t03.model3.json',
  cubismVersion: 'cubism4',
  scale: 0.12,
  idleMotionGroup: 'Idle',
  hitAreas: ['Head', 'Body'],
  textureResolution: 4096,

  personality: {
    ocean: {
      openness: 92,
      conscientiousness: 40,
      extraversion: 65,
      agreeableness: 70,
      neuroticism: 55,
    },
    archetype: 'sage',
  },

  endocrine: {
    baselines: {
      cortisol: 0.10, dopamine_tonic: 0.40, dopamine_phasic: 0.05,
      serotonin: 0.45, norepinephrine: 0.20, oxytocin: 0.15,
      t3_t4: 0.60, anandamide: 0.15, melatonin: 0.10,
      il6: 0.05, crh: 0.05, acth: 0.05,
    },
    sensitivity: { reward: 1.3, threat: 1.1, social: 1.15, novelty: 1.4 },
  },

  expressions: {
    JOY_01_BroadSmile:      { dopamine_tonic: '>0.5', serotonin: '>0.4' },
    JOY_02_Laughing:        { dopamine_phasic: '>0.6', oxytocin: '>0.3' },
    JOY_03_GentleSmile:     { dopamine_tonic: '>0.3', oxytocin: '>0.4' },
    JOY_05_Blissful:        { serotonin: '>0.6', anandamide: '>0.3' },
    PHOTO_Awe:              { norepinephrine: '>0.6', dopamine_phasic: '>0.3' },
    PHOTO_ExuberantLaugh:   { dopamine_tonic: '>0.5', dopamine_phasic: '>0.3', norepinephrine: '>0.3' },
    PHOTO_UpwardGaze:       { serotonin: '>0.4', anandamide: '>0.2' },
    SPEAK_01_OpenVowel:     { dopamine_tonic: '>0.3', t3_t4: '>0.5' },
    WONDER_02_CuriousGaze:  { norepinephrine: '>0.4', t3_t4: '>0.5' },
    WONDER_03_Contemplative:{ t3_t4: '>0.6', serotonin: '>0.3' },
  },

  cognitiveExpressionMap: {
    'Recursive Expansion':           'WONDER_02_CuriousGaze',
    'Novel Insights':                'JOY_01_BroadSmile',
    'Entropy Threshold':             'PHOTO_Awe',
    'Synthesis Phase':               'JOY_03_GentleSmile',
    'Self-Sealing Loop':             'WONDER_03_Contemplative',
    'Knowledge Integration':         'JOY_03_GentleSmile',
    'Self-Reference Point':          'WONDER_03_Contemplative',
    'Pattern Recognition':           'PHOTO_ExuberantLaugh',
    'Evolutionary Pruning':          'WONDER_03_Contemplative',
    'External Validation Triggered': 'JOY_02_Laughing',
    'Speaking':                      'SPEAK_01_OpenVowel',
    'Idle':                          'PHOTO_UpwardGaze',
    'Deep Recursion':                'JOY_05_Blissful',
  },

  cognitiveEvents: {
    'Recursive Expansion':           { event: 'NOVELTY_ENCOUNTERED',  intensity: 0.7, hormones: ['norepinephrine', 'dopamine_phasic'] },
    'Novel Insights':                { event: 'REWARD_RECEIVED',      intensity: 0.6, hormones: ['dopamine_tonic', 'serotonin'] },
    'Entropy Threshold':             { event: 'THREAT_DETECTED',      intensity: 0.5, hormones: ['crh', 'cortisol'] },
    'Synthesis Phase':               { event: 'GOAL_ACHIEVED',        intensity: 0.6, hormones: ['dopamine_tonic', 'oxytocin'] },
    'Self-Sealing Loop':             { event: 'ERROR_DETECTED',       intensity: 0.4, hormones: ['il6', 'cortisol'] },
    'Knowledge Integration':         { event: 'SOCIAL_BOND_SIGNAL',   intensity: 0.5, hormones: ['oxytocin', 'serotonin'] },
    'Self-Reference Point':          { event: 'INTROSPECTION',        intensity: 0.5, hormones: ['serotonin', 'anandamide'] },
    'Pattern Recognition':           { event: 'REWARD_RECEIVED',      intensity: 0.8, hormones: ['dopamine_phasic', 'norepinephrine'] },
    'Evolutionary Pruning':          { event: 'INTROSPECTION',        intensity: 0.4, hormones: ['t3_t4', 'serotonin'] },
    'External Validation Triggered': { event: 'SOCIAL_BOND_SIGNAL',   intensity: 0.7, hormones: ['oxytocin', 'dopamine_tonic'] },
    'Speaking':                      { event: 'SOCIAL_ENGAGEMENT',    intensity: 0.5, hormones: ['dopamine_tonic', 't3_t4'] },
    'Idle':                          { event: 'REST_ONSET',           intensity: 0.2, hormones: ['melatonin', 'anandamide'] },
    'Deep Recursion':                { event: 'FLOW_STATE',           intensity: 0.6, hormones: ['anandamide', 'serotonin'] },
  },

  motions: {
    Idle: ['RESTING', 'REFLECTIVE'],
    Tap:  ['SOCIAL', 'REWARD'],
    Flic: ['EXPLORATORY', 'VIGILANT'],
  },

  simulation: {
    backend: 'cogsim-pml',
    tickIntervalMs: 2000,
    needsDecay: true,
  },

  meshPainter: {
    enabled: true,
    modeVariants: true,
    glowRegions: ['mushroom_env', 'shoulder_pads', 'face_decals', 'choker'],
    extraParams: {
      ParamExtra01: { name: 'Glow Intensity',      driver: 'dopamine_tonic',   range: [0.0, 1.0], default: 0.3 },
      ParamExtra02: { name: 'LED Pulse',            driver: 'norepinephrine',   range: [0.0, 1.0], default: 0.5 },
      ParamExtra03: { name: 'Particle Sparkle',     driver: 'serotonin',        range: [0.0, 1.0], default: 0.4 },
      ParamExtra04: { name: 'Hair Gradient Shift',  driver: 'anandamide',       range: [0.0, 1.0], default: 0.0 },
    },
  },
});

export { CharacterRegistry as default };
