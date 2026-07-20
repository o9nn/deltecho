/**
 * Live2D Avatar Types
 *
 * Core types for the endocrine-driven Live2D Cubism avatar system.
 * Part of @deltecho/ui-components.
 */

/** Hormone channel state (0.0 - 1.0 normalized) */
export interface EndocrineState {
  cortisol: number;
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  oxytocin: number;
  t3_t4: number;
  anandamide: number;
}

/** A single Cubism parameter target with blending weight */
export interface CubismParameterTarget {
  id: string;
  value: number;
  weight: number;
}

/** OCEAN Big Five personality model */
export interface OCEANPersonality {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

/** Maps a cognitive mode to a Live2D motion group */
export interface MotionMapping {
  cognitiveMode: string;
  motionGroup: string;
  motionIndex: number;
  priority: number;
}

/** Maps an endocrine condition to Cubism parameter targets */
export interface ExpressionMapping {
  name: string;
  condition: (state: EndocrineState) => boolean;
  targets: CubismParameterTarget[];
}

/** Full character definition manifest */
export interface CharacterManifest {
  id: string;
  name: string;
  modelPath: string;
  scale: number;
  position?: { x: number; y: number };
  personality: OCEANPersonality;
  endocrineBaselines: EndocrineState;
  endocrineSensitivity: Partial<EndocrineState>;
  expressionMappings: ExpressionMapping[];
  motionMappings: MotionMapping[];
  tickInterval: number;
}

/** Props for the Live2DAvatar React component */
export interface Live2DAvatarProps {
  /** URL to the model3.json file (served by the host app) */
  modelUrl: string;
  /** Container width in pixels (default: 800) */
  width?: number;
  /** Container height in pixels (default: 600) */
  height?: number;
  /** Model scale factor (default: 0.12 for Miara) */
  scale?: number;
  /** Current endocrine state from the cognitive system */
  endocrineState?: EndocrineState;
  /** Current cognitive mode (idle, thinking, responding, etc.) */
  cognitiveMode?: string;
  /** Callback fired when the model finishes loading */
  onModelLoaded?: (model: any) => void;
  /** Callback fired on load or runtime error */
  onError?: (error: Error) => void;
  /** Enable mouse-follow tracking (default: true) */
  autoInteract?: boolean;
  /** CSS class for the outer container div */
  className?: string;
  /** Character manifest for personality-driven expressions */
  manifest?: CharacterManifest;
  /** Override CDN URLs for offline / local serving */
  cdnOverrides?: {
    cubismCore?: string;
    pixi?: string;
    pixiLive2D?: string;
  };
}

/** CDN script loading state */
export interface ScriptLoadState {
  loaded: boolean;
  error: Error | null;
  loading: boolean;
}
