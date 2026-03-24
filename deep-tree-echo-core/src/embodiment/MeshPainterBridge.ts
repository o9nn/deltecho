/**
 * @fileoverview MeshPainterBridge — Full F/B/K triadic runtime integration for Live2D
 *
 * Composition: /deltecho ( /live2d-miara -> /live2d-dtecho ( "mesh-painter" ) )
 *
 * Implements the runtime side of the mesh-painter differentiable skill:
 *
 * F (Forward Pass):
 *   F.1 — Texture atlas variant selection based on cognitive mode
 *   F.2 — Art mesh definitions for accessories (headphones, decals, choker)
 *   F.3 — Custom parameter extensions (ParamExtra01-04) driven by endocrine state
 *   F.4 — Expression override presets (10 named DTE expressions → Cubism params)
 *
 * B (Backward Pass):
 *   Fidelity correction via feedback accumulation and weight adjustment
 *
 * K (Knowledge State):
 *   Persistent autognosis state tracking color corrections, deformer weights,
 *   expression curve adjustments, and loss history
 *
 * @packageDocumentation
 */

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Atlas region definition matching the Python mesh_painter regions */
export interface AtlasRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
  semanticRole: string;
}

/** Art mesh definition for Live2D model integration */
export interface ArtMeshDefinition {
  id: string;
  name: string;
  parentDeformer: string;
  textureRegion: string;
  zOrder: number;
  blendMode: 'Normal' | 'Additive' | 'Multiply';
  opacity: number;
  description: string;
}

/** Custom Cubism parameter extension */
export interface CubismParameterExtension {
  id: string;
  name: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  description: string;
  controlledMeshes: string[];
  endocrineDriver: string;
}

/** Expression preset mapping FACS AUs to Cubism parameters */
export interface ExpressionPreset {
  name: string;
  emotion: string;
  keyAUs: string;
  cognitiveMode: string;
  primaryHormones: string;
  cubismParams: Record<string, number>;
  extraParams: Record<string, number>;
}

/** Cognitive mode glow configuration */
export interface ModeGlowConfig {
  color: [number, number, number, number];
  intensity: number;
  radius: number;
}

/** Texture atlas variant metadata */
export interface AtlasVariant {
  mode: string;
  filename: string;
  glowColor: [number, number, number, number];
}

/** Manifest for all generated variants */
export interface VariantsManifest {
  version: string;
  baseAtlas: string;
  variants: Record<string, string>;
  modeGlowColors: Record<string, [number, number, number, number]>;
}

/** Knowledge state for autognosis (persistent) */
export interface KnowledgeState {
  name: string;
  topology: string;
  version: number;
  lossHistory: Array<{
    timestamp: string;
    feedback: string;
    adjustments: Record<string, number>;
  }>;
  colorCorrections: Record<string, number>;
  deformerWeights: Record<string, number>;
  expressionCurveAdjustments: Record<string, number>;
  lastForwardPass: string | null;
  lastBackwardPass: string | null;
}

/** MeshPainterBridge configuration */
export interface MeshPainterConfig {
  atlasBaseUrl: string;
  preloadAll: boolean;
  transitionMs: number;
  fallbackAtlas: string;
}

/** Result of an expression tick */
export interface ExpressionTickResult {
  atlasUrl: string;
  shouldSwapAtlas: boolean;
  glowColor: [number, number, number, number];
  cubismParams: Record<string, number>;
  extraParams: Record<string, number>;
  activeExpression: string;
  glowRegions: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// Constants — F.1 Atlas Regions
// ═══════════════════════════════════════════════════════════════════════

export const DTE_ATLAS_REGIONS: Record<string, AtlasRegion> = {
  hair_main:     { name: 'hair_main', x: 0, y: 0, width: 600, height: 500,
    description: 'Primary hair strands — silver-white to mint gradient', semanticRole: 'hair' },
  hair_bangs:    { name: 'hair_bangs', x: 0, y: 500, width: 400, height: 300,
    description: 'Bangs and front hair pieces', semanticRole: 'hair' },
  hair_back:     { name: 'hair_back', x: 600, y: 0, width: 400, height: 400,
    description: 'Back hair and flowing strands', semanticRole: 'hair' },
  body_torso:    { name: 'body_torso', x: 512, y: 1024, width: 1024, height: 600,
    description: 'Torso with clothing — black tank top', semanticRole: 'clothing' },
  body_arms:     { name: 'body_arms', x: 400, y: 200, width: 600, height: 400,
    description: 'Arms and hands', semanticRole: 'skin' },
  body_legs:     { name: 'body_legs', x: 0, y: 600, width: 500, height: 400,
    description: 'Legs and feet', semanticRole: 'skin' },
  mushroom_env:  { name: 'mushroom_env', x: 1024, y: 0, width: 1024, height: 1024,
    description: 'Bioluminescent mushroom environment', semanticRole: 'environment' },
  shoulder_pads: { name: 'shoulder_pads', x: 512, y: 1024, width: 1024, height: 512,
    description: 'Amber neural-tree shoulder pads', semanticRole: 'accessory' },
  choker:        { name: 'choker', x: 768, y: 1024, width: 512, height: 200,
    description: 'Purple LED cyberpunk choker', semanticRole: 'accessory' },
  face_decals:   { name: 'face_decals', x: 1400, y: 1600, width: 648, height: 448,
    description: 'Holographic hearts, diamonds, hexagons', semanticRole: 'accessory' },
  decorations:   { name: 'decorations', x: 0, y: 1600, width: 600, height: 448,
    description: 'Small decorative elements and accessories', semanticRole: 'accessory' },
};

// ═══════════════════════════════════════════════════════════════════════
// Constants — F.2 Art Mesh Definitions
// ═══════════════════════════════════════════════════════════════════════

export const DTE_ART_MESHES: ArtMeshDefinition[] = [
  { id: 'ArtMesh_Headphone_L', name: 'Headphone Left (Mushroom)',
    parentDeformer: 'D_HEAD', textureRegion: 'mushroom_env', zOrder: 550,
    blendMode: 'Normal', opacity: 1.0,
    description: 'Bioluminescent mushroom-cap headphone, left ear' },
  { id: 'ArtMesh_Headphone_Glow', name: 'Headphone Glow Layer',
    parentDeformer: 'D_HEAD', textureRegion: 'mushroom_env', zOrder: 551,
    blendMode: 'Additive', opacity: 0.7,
    description: 'Additive glow for headphone. Controlled by ParamExtra01' },
  { id: 'ArtMesh_FaceDecal_Diamond', name: 'Face Decal — Holographic Diamond',
    parentDeformer: 'D_HEAD', textureRegion: 'face_decals', zOrder: 500,
    blendMode: 'Normal', opacity: 1.0,
    description: 'Blue holographic diamond on left cheek' },
  { id: 'ArtMesh_FaceDecal_Hearts', name: 'Face Decal — Pink Hearts',
    parentDeformer: 'D_HEAD', textureRegion: 'face_decals', zOrder: 501,
    blendMode: 'Normal', opacity: 1.0,
    description: 'Pink-magenta hearts scattered around diamond' },
  { id: 'ArtMesh_FaceDecal_Particles', name: 'Face Decal — Cyan Sparkle',
    parentDeformer: 'D_HEAD', textureRegion: 'face_decals', zOrder: 502,
    blendMode: 'Additive', opacity: 0.6,
    description: 'Cyan sparkle particles. Controlled by ParamExtra03' },
  { id: 'ArtMesh_Choker_Body', name: 'Cyberpunk Choker — Body',
    parentDeformer: 'D_NECK', textureRegion: 'choker', zOrder: 400,
    blendMode: 'Normal', opacity: 1.0,
    description: 'Dark metal collar band' },
  { id: 'ArtMesh_Choker_LED', name: 'Cyberpunk Choker — LED',
    parentDeformer: 'D_NECK', textureRegion: 'choker', zOrder: 401,
    blendMode: 'Additive', opacity: 0.8,
    description: 'Purple-violet LED glow. Controlled by ParamExtra02' },
  { id: 'ArtMesh_ShoulderPad_L', name: 'Neural-Tree Shoulder Pad Left',
    parentDeformer: 'D_BODY', textureRegion: 'shoulder_pads', zOrder: 350,
    blendMode: 'Normal', opacity: 1.0,
    description: 'Amber neural-tree shoulder pad, left side' },
  { id: 'ArtMesh_ShoulderPad_R', name: 'Neural-Tree Shoulder Pad Right',
    parentDeformer: 'D_BODY', textureRegion: 'shoulder_pads', zOrder: 351,
    blendMode: 'Normal', opacity: 1.0,
    description: 'Amber neural-tree shoulder pad, right side' },
  { id: 'ArtMesh_ShoulderPad_Glow', name: 'Shoulder Pad Glow Layer',
    parentDeformer: 'D_BODY', textureRegion: 'shoulder_pads', zOrder: 352,
    blendMode: 'Additive', opacity: 0.5,
    description: 'Additive glow for shoulder pads. Controlled by ParamExtra01' },
];

// ═══════════════════════════════════════════════════════════════════════
// Constants — F.3 Parameter Extensions
// ═══════════════════════════════════════════════════════════════════════

export const DTE_PARAM_EXTENSIONS: CubismParameterExtension[] = [
  { id: 'ParamExtra01', name: 'Glow Intensity',
    minValue: 0.0, maxValue: 1.0, defaultValue: 0.3,
    description: 'Controls opacity of bioluminescent glow layers',
    controlledMeshes: ['ArtMesh_Headphone_Glow', 'ArtMesh_ShoulderPad_Glow'],
    endocrineDriver: 'dopamine_tonic' },
  { id: 'ParamExtra02', name: 'LED Pulse',
    minValue: 0.0, maxValue: 1.0, defaultValue: 0.5,
    description: 'Controls choker LED intensity and color cycle',
    controlledMeshes: ['ArtMesh_Choker_LED'],
    endocrineDriver: 'norepinephrine' },
  { id: 'ParamExtra03', name: 'Particle Sparkle',
    minValue: 0.0, maxValue: 1.0, defaultValue: 0.4,
    description: 'Controls face decal sparkle particle visibility',
    controlledMeshes: ['ArtMesh_FaceDecal_Particles'],
    endocrineDriver: 'serotonin' },
  { id: 'ParamExtra04', name: 'Hair Gradient Shift',
    minValue: 0.0, maxValue: 1.0, defaultValue: 0.0,
    description: 'Shifts hair gradient map (silver → mint intensity)',
    controlledMeshes: [],
    endocrineDriver: 'anandamide' },
];

// ═══════════════════════════════════════════════════════════════════════
// Constants — F.4 Expression Presets (10 Named DTE Expressions)
// ═══════════════════════════════════════════════════════════════════════

export const DTE_EXPRESSION_PRESETS: ExpressionPreset[] = [
  { name: 'JOY_01_BroadSmile', emotion: 'Duchenne happiness',
    keyAUs: 'AU6D+12D+25C', cognitiveMode: 'REWARD', primaryHormones: 'DA(t)↑ 5-HT↑',
    cubismParams: { ParamMouthForm: 1.0, ParamMouthOpenY: 0.3, ParamEyeLOpen: 0.65, ParamEyeROpen: 0.65, ParamBrowLY: 0.3, ParamBrowRY: 0.3 },
    extraParams: { ParamExtra01: 0.7, ParamExtra03: 0.6 } },
  { name: 'JOY_02_Laughing', emotion: 'Active laughter',
    keyAUs: 'AU6D+12E+26C+9B', cognitiveMode: 'REWARD', primaryHormones: 'DA(p)↑↑ OXT↑',
    cubismParams: { ParamMouthForm: 1.0, ParamMouthOpenY: 0.85, ParamEyeLOpen: 0.5, ParamEyeROpen: 0.5, ParamBrowLY: 0.4, ParamBrowRY: 0.4, ParamBodyAngleX: 2.0 },
    extraParams: { ParamExtra01: 0.9, ParamExtra02: 0.7, ParamExtra03: 0.8 } },
  { name: 'JOY_03_GentleSmile', emotion: 'Warm contentment',
    keyAUs: 'AU6C+12C+14A', cognitiveMode: 'SOCIAL', primaryHormones: 'DA(t)↑ OXT↑',
    cubismParams: { ParamMouthForm: 0.6, ParamMouthOpenY: 0.0, ParamEyeLOpen: 0.7, ParamEyeROpen: 0.7, ParamBrowLY: 0.15, ParamBrowRY: 0.15 },
    extraParams: { ParamExtra01: 0.4, ParamExtra03: 0.5 } },
  { name: 'JOY_05_Blissful', emotion: 'Serene bliss',
    keyAUs: 'AU6D+12C+43D', cognitiveMode: 'RESTING', primaryHormones: '5-HT↑↑ AEA↑',
    cubismParams: { ParamMouthForm: 0.5, ParamMouthOpenY: 0.0, ParamEyeLOpen: 0.3, ParamEyeROpen: 0.3, ParamBrowLY: 0.1, ParamBrowRY: 0.1, ParamEyeBallY: 0.2 },
    extraParams: { ParamExtra01: 0.3, ParamExtra04: 0.6 } },
  { name: 'PHOTO_Awe', emotion: 'Awe / wonder',
    keyAUs: 'AU1C+2C+5D+26C', cognitiveMode: 'EXPLORATORY', primaryHormones: 'NE↑ DA(p)↑',
    cubismParams: { ParamMouthForm: 0.0, ParamMouthOpenY: 0.45, ParamEyeLOpen: 1.0, ParamEyeROpen: 1.0, ParamBrowLY: 0.55, ParamBrowRY: 0.55, ParamEyeBallY: 0.3 },
    extraParams: { ParamExtra01: 0.8, ParamExtra02: 0.6, ParamExtra03: 0.9 } },
  { name: 'PHOTO_ExuberantLaugh', emotion: 'Delighted surprise',
    keyAUs: 'AU6D+12D+1B+2B+5B', cognitiveMode: 'REWARD', primaryHormones: 'DA(t+p)↑ NE↑',
    cubismParams: { ParamMouthForm: 1.0, ParamMouthOpenY: 0.6, ParamEyeLOpen: 0.85, ParamEyeROpen: 0.85, ParamBrowLY: 0.45, ParamBrowRY: 0.45, ParamBodyAngleX: 3.0 },
    extraParams: { ParamExtra01: 1.0, ParamExtra02: 0.8, ParamExtra03: 1.0 } },
  { name: 'PHOTO_UpwardGaze', emotion: 'Dreamy contemplation',
    keyAUs: 'AU1B+5B+61+63', cognitiveMode: 'REFLECTIVE', primaryHormones: '5-HT↑ AEA↑',
    cubismParams: { ParamMouthForm: 0.1, ParamMouthOpenY: 0.0, ParamEyeLOpen: 0.75, ParamEyeROpen: 0.75, ParamBrowLY: 0.2, ParamBrowRY: 0.2, ParamEyeBallY: 0.5, ParamEyeBallX: -0.2, ParamAngleY: 8.0 },
    extraParams: { ParamExtra01: 0.4, ParamExtra04: 0.5 } },
  { name: 'SPEAK_01_OpenVowel', emotion: 'Animated speaking',
    keyAUs: 'AU25C+26B+12C+6B', cognitiveMode: 'SOCIAL', primaryHormones: 'DA(t)↑ T3↑',
    cubismParams: { ParamMouthForm: 0.4, ParamMouthOpenY: 0.6, ParamEyeLOpen: 0.8, ParamEyeROpen: 0.8, ParamBrowLY: 0.2, ParamBrowRY: 0.2 },
    extraParams: { ParamExtra02: 0.5 } },
  { name: 'WONDER_02_CuriousGaze', emotion: 'Curious wonder',
    keyAUs: 'AU1B+2B+5C+63', cognitiveMode: 'EXPLORATORY', primaryHormones: 'NE↑ T3↑',
    cubismParams: { ParamMouthForm: 0.0, ParamMouthOpenY: 0.15, ParamEyeLOpen: 0.95, ParamEyeROpen: 0.95, ParamBrowLY: 0.4, ParamBrowRY: 0.4, ParamEyeBallY: 0.3, ParamEyeBallX: 0.2, ParamAngleY: 5.0 },
    extraParams: { ParamExtra01: 0.6, ParamExtra02: 0.4, ParamExtra03: 0.7 } },
  { name: 'WONDER_03_Contemplative', emotion: 'Deep thought',
    keyAUs: 'AU1B+5B+4A+63+61', cognitiveMode: 'FOCUSED', primaryHormones: 'T3↑↑ 5-HT↑',
    cubismParams: { ParamMouthForm: -0.1, ParamMouthOpenY: 0.0, ParamEyeLOpen: 0.85, ParamEyeROpen: 0.85, ParamBrowLY: -0.15, ParamBrowRY: -0.15, ParamEyeBallY: 0.3, ParamEyeBallX: -0.3, ParamAngleZ: -3.0 },
    extraParams: { ParamExtra01: 0.5, ParamExtra04: 0.3 } },
];

/** Cognitive mode → glow color (must match Python MODE_GLOW_COLORS) */
export const MODE_GLOW_COLORS: Record<string, [number, number, number, number]> = {
  REWARD:      [255, 200, 50, 100],
  EXPLORATORY: [0, 255, 220, 100],
  REFLECTIVE:  [140, 100, 255, 80],
  FOCUSED:     [200, 220, 255, 60],
  SOCIAL:      [255, 150, 200, 90],
  STRESSED:    [255, 100, 80, 80],
  VIGILANT:    [0, 200, 255, 90],
  RESTING:     [100, 150, 255, 50],
  THREAT:      [255, 60, 60, 100],
  MAINTENANCE: [180, 180, 180, 40],
};

/** DTE cognitive state → expression name mapping */
const DTE_COGNITIVE_EXPRESSION_MAP: Record<string, string> = {
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
};

const DEFAULT_CONFIG: MeshPainterConfig = {
  atlasBaseUrl: '/models/dtecho/',
  preloadAll: false,
  transitionMs: 500,
  fallbackAtlas: 'texture_00.png',
};

// ═══════════════════════════════════════════════════════════════════════
// MeshPainterBridge — Full F/B/K Runtime
// ═══════════════════════════════════════════════════════════════════════

export class MeshPainterBridge {
  private config: MeshPainterConfig;
  private currentMode: string = 'RESTING';
  private currentExpression: string = 'PHOTO_UpwardGaze';
  private manifest: VariantsManifest | null = null;
  private knowledgeState: KnowledgeState;

  constructor(config: Partial<MeshPainterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.knowledgeState = {
      name: 'mesh-painter',
      topology: 'Transform',
      version: 2,
      lossHistory: [],
      colorCorrections: {},
      deformerWeights: {},
      expressionCurveAdjustments: {},
      lastForwardPass: null,
      lastBackwardPass: null,
    };
  }

  // ─── F — Forward Pass ──────────────────────────────────────────

  /**
   * Load the variants manifest generated by mesh-painter.
   */
  async loadManifest(manifestUrl?: string): Promise<VariantsManifest> {
    const url = manifestUrl || `${this.config.atlasBaseUrl}variants/variants_manifest.json`;
    try {
      const response = await fetch(url);
      this.manifest = await response.json();
      return this.manifest!;
    } catch (e) {
      console.warn('[MeshPainterBridge] Failed to load manifest, using defaults');
      this.manifest = {
        version: '2.0.0',
        baseAtlas: 'texture_00.png',
        variants: {},
        modeGlowColors: MODE_GLOW_COLORS as any,
      };
      return this.manifest;
    }
  }

  /**
   * Get the atlas filename for a given cognitive mode.
   */
  getAtlasForMode(mode: string): string {
    if (this.manifest?.variants[mode]) {
      return `${this.config.atlasBaseUrl}variants/${this.manifest.variants[mode]}`;
    }
    return `${this.config.atlasBaseUrl}${this.config.fallbackAtlas}`;
  }

  /**
   * F.4 — Resolve expression preset for a cognitive state.
   *
   * Applies knowledge state curve adjustments to the base preset values.
   */
  resolveExpression(cognitiveState: string): { preset: ExpressionPreset; adjustedParams: Record<string, number>; adjustedExtra: Record<string, number> } {
    const expressionName = DTE_COGNITIVE_EXPRESSION_MAP[cognitiveState] || 'PHOTO_UpwardGaze';
    const preset = DTE_EXPRESSION_PRESETS.find(p => p.name === expressionName)
      || DTE_EXPRESSION_PRESETS.find(p => p.name === 'PHOTO_UpwardGaze')!;

    // Apply knowledge state curve adjustments
    const adjustedParams: Record<string, number> = {};
    for (const [param, value] of Object.entries(preset.cubismParams)) {
      const key = `${preset.name}_${param}`;
      const adj = this.knowledgeState.expressionCurveAdjustments[key] || 0;
      adjustedParams[param] = Math.max(-1, Math.min(1, value + adj));
    }

    // Apply extra param adjustments
    const adjustedExtra: Record<string, number> = {};
    for (const [param, value] of Object.entries(preset.extraParams)) {
      const key = `extra_${param}`;
      const adj = this.knowledgeState.expressionCurveAdjustments[key] || 0;
      adjustedExtra[param] = Math.max(0, Math.min(1, value + adj));
    }

    return { preset, adjustedParams, adjustedExtra };
  }

  /**
   * F.3 — Compute extra parameter values from endocrine state.
   *
   * Maps hormone levels to ParamExtra01-04 values.
   */
  computeExtraParams(endocrineState: Record<string, number>): Record<string, number> {
    const extra: Record<string, number> = {};
    for (const param of DTE_PARAM_EXTENSIONS) {
      const hormoneLevel = endocrineState[param.endocrineDriver] || param.defaultValue;
      extra[param.id] = Math.max(param.minValue, Math.min(param.maxValue, hormoneLevel));
    }
    return extra;
  }

  /**
   * Full forward pass tick — called by the expression pipeline each frame.
   *
   * Combines atlas selection, expression resolution, and extra parameter computation.
   */
  onExpressionTick(
    cognitiveState: string,
    cognitiveMode: string,
    endocrineState?: Record<string, number>,
  ): ExpressionTickResult {
    const shouldSwapAtlas = cognitiveMode !== this.currentMode;
    this.currentMode = cognitiveMode;

    // F.4 — Resolve expression
    const { preset, adjustedParams, adjustedExtra } = this.resolveExpression(cognitiveState);
    this.currentExpression = preset.name;

    // F.3 — Compute endocrine-driven extra params (merge with expression extras)
    let finalExtra = { ...adjustedExtra };
    if (endocrineState) {
      const endocrineExtra = this.computeExtraParams(endocrineState);
      // Blend: expression preset takes priority, endocrine fills gaps
      for (const [key, value] of Object.entries(endocrineExtra)) {
        if (!(key in finalExtra)) {
          finalExtra[key] = value;
        } else {
          // Average expression preset and endocrine value
          finalExtra[key] = (finalExtra[key] + value) / 2;
        }
      }
    }

    return {
      atlasUrl: this.getAtlasForMode(cognitiveMode),
      shouldSwapAtlas,
      glowColor: MODE_GLOW_COLORS[cognitiveMode] || MODE_GLOW_COLORS.RESTING,
      cubismParams: adjustedParams,
      extraParams: finalExtra,
      activeExpression: preset.name,
      glowRegions: this.getGlowRegions(cognitiveMode),
    };
  }

  // ─── B — Backward Pass ─────────────────────────────────────────

  /**
   * Apply fidelity correction based on feedback.
   *
   * Parses feedback and adjusts the knowledge state:
   * - "colors too warm/cool" → adjust colorCorrections
   * - "accessories detached" → adjust deformerWeights
   * - "expression unnatural" → adjust expressionCurveAdjustments
   * - "glow too bright/dim" → adjust extra param curves
   */
  applyFeedback(feedback: string): void {
    const lower = feedback.toLowerCase();
    const entry = {
      timestamp: new Date().toISOString(),
      feedback,
      adjustments: {} as Record<string, number>,
    };

    if (lower.includes('warm') || lower.includes('cool')) {
      const direction = lower.includes('warm') ? -0.05 : 0.05;
      for (const [name, region] of Object.entries(DTE_ATLAS_REGIONS)) {
        if (region.semanticRole === 'hair' || region.semanticRole === 'skin') {
          const current = this.knowledgeState.colorCorrections[name] || 0;
          this.knowledgeState.colorCorrections[name] = +(current + direction).toFixed(3);
          entry.adjustments[`color_${name}`] = direction;
        }
      }
    }

    if (lower.includes('detach') || lower.includes('float')) {
      for (const mesh of DTE_ART_MESHES) {
        const current = this.knowledgeState.deformerWeights[mesh.id] || 1.0;
        this.knowledgeState.deformerWeights[mesh.id] = +(current * 1.05).toFixed(3);
        entry.adjustments[`deformer_${mesh.id}`] = 0.05;
      }
    }

    if (lower.includes('unnatural') || lower.includes('stiff') || lower.includes('expression')) {
      for (const preset of DTE_EXPRESSION_PRESETS) {
        for (const [param, value] of Object.entries(preset.cubismParams)) {
          if (Math.abs(value) > 0.8) {
            const key = `${preset.name}_${param}`;
            const adj = -0.05 * Math.sign(value);
            const current = this.knowledgeState.expressionCurveAdjustments[key] || 0;
            this.knowledgeState.expressionCurveAdjustments[key] = +(current + adj).toFixed(3);
            entry.adjustments[key] = adj;
          }
        }
      }
    }

    if (lower.includes('glow')) {
      const adj = lower.includes('bright') || lower.includes('much') ? -0.1 : 0.1;
      for (const p of DTE_PARAM_EXTENSIONS) {
        if (p.name.toLowerCase().includes('glow')) {
          const key = `extra_${p.id}`;
          const current = this.knowledgeState.expressionCurveAdjustments[key] || 0;
          this.knowledgeState.expressionCurveAdjustments[key] = +(current + adj).toFixed(3);
          entry.adjustments[key] = adj;
        }
      }
    }

    this.knowledgeState.lossHistory.push(entry);
    this.knowledgeState.lastBackwardPass = new Date().toISOString();
  }

  // ─── K — Knowledge State ───────────────────────────────────────

  /** Get the current knowledge state for serialization */
  getKnowledgeState(): KnowledgeState {
    return { ...this.knowledgeState };
  }

  /** Load knowledge state from external source */
  loadKnowledgeState(state: KnowledgeState): void {
    this.knowledgeState = { ...state };
  }

  // ─── Accessors ─────────────────────────────────────────────────

  getGlowIntensity(mode: string): number {
    const color = MODE_GLOW_COLORS[mode] || MODE_GLOW_COLORS.RESTING;
    return color[3] / 255;
  }

  getRegion(name: string): AtlasRegion | undefined {
    return DTE_ATLAS_REGIONS[name];
  }

  getGlowRegions(mode: string): string[] {
    switch (mode) {
      case 'REWARD':
      case 'EXPLORATORY':
        return ['mushroom_env', 'shoulder_pads', 'face_decals'];
      case 'SOCIAL':
        return ['face_decals', 'choker', 'hair_main'];
      case 'FOCUSED':
        return ['shoulder_pads', 'choker'];
      case 'REFLECTIVE':
        return ['mushroom_env', 'hair_main'];
      case 'STRESSED':
      case 'THREAT':
        return ['choker', 'shoulder_pads'];
      case 'RESTING':
        return ['mushroom_env'];
      default:
        return ['mushroom_env'];
    }
  }

  getArtMeshesForRegion(regionName: string): ArtMeshDefinition[] {
    return DTE_ART_MESHES.filter(m => m.textureRegion === regionName);
  }

  getParamExtension(paramId: string): CubismParameterExtension | undefined {
    return DTE_PARAM_EXTENSIONS.find(p => p.id === paramId);
  }

  getExpressionPreset(name: string): ExpressionPreset | undefined {
    return DTE_EXPRESSION_PRESETS.find(p => p.name === name);
  }

  getCurrentMode(): string { return this.currentMode; }
  getCurrentExpression(): string { return this.currentExpression; }
}

// ═══════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════

export function createMeshPainterBridge(
  config?: Partial<MeshPainterConfig>,
): MeshPainterBridge {
  return new MeshPainterBridge(config);
}
