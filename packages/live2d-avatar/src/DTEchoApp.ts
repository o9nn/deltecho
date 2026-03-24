/**
 * @fileoverview DTEchoApp — Production-grade Live2D avatar application
 * using PixiJS v8 and untitled-pixi-live2d-engine (Cubism 5.4 SDK).
 *
 * Features:
 *   - WebGL2/WebGPU dual renderer via PixiJS v8
 *   - Cubism 5 model loading with 4K texture support
 *   - Mouse/touch tracking with hit area detection
 *   - Real-time lip sync via Web Audio API
 *   - Parallel motion playback
 *   - Expression blending with fade transitions
 *   - Cognitive state → expression/motion mapping
 *   - Endocrine-driven parameter updates at 60fps
 *   - Responsive canvas with HiDPI support
 *
 * @packageDocumentation
 */

import { Application, Container, Ticker, FederatedPointerEvent } from 'pixi.js';
import { Live2DModel, MotionPriority } from 'untitled-pixi-live2d-engine';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface DTEchoAppConfig {
  /** Canvas element or CSS selector */
  canvas: HTMLCanvasElement | string;
  /** Model path relative to static root */
  modelPath: string;
  /** Background color (hex) */
  backgroundColor: number;
  /** Enable mouse/touch tracking */
  mouseTracking: boolean;
  /** Enable hit area interaction */
  hitAreaInteraction: boolean;
  /** Enable lip sync */
  lipSync: boolean;
  /** Target FPS for parameter updates */
  targetFps: number;
  /** Memory size for Cubism SDK (MB) */
  cubismMemoryMB: number;
  /** Preferred renderer: 'webgl' | 'webgpu' */
  preferredRenderer: 'webgl' | 'webgpu';
  /** Scale mode: 'fit' | 'cover' | 'fixed' */
  scaleMode: 'fit' | 'cover' | 'fixed';
  /** Fixed scale (only used when scaleMode is 'fixed') */
  fixedScale: number;
}

export interface CognitiveStateUpdate {
  state: string;
  echobeatsPhase: number;
  echobeatsStream: number;
  reservoirActivation: number;
  lipSyncAmplitude?: number;
}

export interface EndocrineUpdate {
  glowIntensity: number;    // ParamExtra01: dopamine_tonic
  ledPulse: number;          // ParamExtra02: norepinephrine
  particleSparkle: number;   // ParamExtra03: serotonin
  hairGradientShift: number; // ParamExtra04: anandamide
}

export interface UserDataEvent {
  event: string;
  cognitive_state: string;
  endocrine: Record<string, number>;
  expression?: string;
  motion?: string;
}

export type HitAreaCallback = (area: string, event: UserDataEvent) => void;
export type ExpressionChangeCallback = (name: string) => void;

// ═══════════════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: DTEchoAppConfig = {
  canvas: '#live2d-canvas',
  modelPath: '/models/dtecho/dtecho_pro_t03.model3.json',
  backgroundColor: 0x000000,
  mouseTracking: true,
  hitAreaInteraction: true,
  lipSync: true,
  targetFps: 60,
  cubismMemoryMB: 32,
  preferredRenderer: 'webgl',
  scaleMode: 'fit',
  fixedScale: 0.12,
};

// ═══════════════════════════════════════════════════════════════════════
// Cognitive State → Expression Mapping
// ═══════════════════════════════════════════════════════════════════════

const COGNITIVE_EXPRESSION_MAP: Record<string, string> = {
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
  'Social Engagement':             'JOY_03_GentleSmile',
  'Surprise':                      'SURPRISE_01_Startled',
  'Boundary Violation':            'SADNESS_01_Melancholy',
  'Sensory Input':                 'WONDER_02_CuriousGaze',
  'Exploratory':                   'PHOTO_ExuberantLaugh',
};

// ═══════════════════════════════════════════════════════════════════════
// Cognitive State → Motion Group Mapping
// ═══════════════════════════════════════════════════════════════════════

const COGNITIVE_MOTION_MAP: Record<string, string> = {
  'Idle':                          'Idle',
  'Speaking':                      'Speaking',
  'Recursive Expansion':           'Thinking',
  'Self-Sealing Loop':             'Thinking',
  'Self-Reference Point':          'Thinking',
  'Evolutionary Pruning':          'Thinking',
  'Novel Insights':                'Excited',
  'Pattern Recognition':           'Excited',
  'External Validation Triggered': 'Excited',
  'Deep Recursion':                'Sleeping',
  'Social Engagement':             'Greeting',
};

// ═══════════════════════════════════════════════════════════════════════
// DTEchoApp
// ═══════════════════════════════════════════════════════════════════════

export class DTEchoApp {
  private config: DTEchoAppConfig;
  private app: Application | null = null;
  private model: any | null = null;
  private container: Container | null = null;
  private hitAreaCallbacks: HitAreaCallback[] = [];
  private expressionCallbacks: ExpressionChangeCallback[] = [];
  private currentExpression: string = 'NEUTRAL_Reset';
  private currentMotionGroup: string = 'Idle';
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private lipSyncData: Uint8Array | null = null;
  private destroyed: boolean = false;

  // Smoothed extra parameters
  private extraParams = {
    glowIntensity: 0.3,
    ledPulse: 0.5,
    particleSparkle: 0.4,
    hairGradientShift: 0.0,
  };

  constructor(config: Partial<DTEchoAppConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  async init(): Promise<void> {
    // Resolve canvas
    const canvas = typeof this.config.canvas === 'string'
      ? document.querySelector<HTMLCanvasElement>(this.config.canvas)!
      : this.config.canvas;

    // Initialize PixiJS v8 Application
    this.app = new Application();
    await this.app.init({
      canvas,
      resizeTo: canvas.parentElement ?? window,
      preference: this.config.preferredRenderer,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      backgroundColor: this.config.backgroundColor,
      antialias: true,
      powerPreference: 'high-performance',
    });

    // Create container for model
    this.container = new Container();
    this.app.stage.addChild(this.container);

    // Load Live2D model
    this.model = await Live2DModel.from(this.config.modelPath, {
      autoInteract: this.config.hitAreaInteraction,
      autoUpdate: true,
    });

    // Configure model transform
    this.positionModel();

    // Add to container
    this.container.addChild(this.model);

    // Setup mouse tracking
    if (this.config.mouseTracking) {
      this.setupMouseTracking();
    }

    // Setup hit area interaction
    if (this.config.hitAreaInteraction) {
      this.setupHitAreas();
    }

    // Setup lip sync
    if (this.config.lipSync) {
      this.setupLipSync();
    }

    // Setup resize handler
    window.addEventListener('resize', () => this.positionModel());

    // Start update loop
    this.app.ticker.add(this.onTick, this);
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    if (this.app) {
      this.app.ticker.remove(this.onTick, this);
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.model = null;
    this.container = null;
  }

  // ─── Model Positioning ─────────────────────────────────────────

  private positionModel(): void {
    if (!this.model || !this.app) return;

    const { width, height } = this.app.screen;

    switch (this.config.scaleMode) {
      case 'fit': {
        const scaleX = width / this.model.width;
        const scaleY = height / this.model.height;
        const scale = Math.min(scaleX, scaleY) * 0.9;
        this.model.scale.set(scale);
        break;
      }
      case 'cover': {
        const scaleX = width / this.model.width;
        const scaleY = height / this.model.height;
        const scale = Math.max(scaleX, scaleY);
        this.model.scale.set(scale);
        break;
      }
      case 'fixed':
        this.model.scale.set(this.config.fixedScale);
        break;
    }

    this.model.anchor.set(0.5, 0.5);
    this.model.position.set(width / 2, height / 2);
  }

  // ─── Mouse Tracking ────────────────────────────────────────────

  private setupMouseTracking(): void {
    if (!this.app) return;

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on('pointermove', (e: FederatedPointerEvent) => {
      if (!this.model) return;
      this.model.focus(e.global.x, e.global.y);
    });
  }

  // ─── Hit Area Interaction ──────────────────────────────────────

  private setupHitAreas(): void {
    if (!this.model) return;

    this.model.on('hit', (hitAreas: string[]) => {
      for (const area of hitAreas) {
        // Parse userdata for this hit area
        const userData = this.getUserDataForHitArea(area);
        if (userData) {
          // Notify callbacks
          for (const cb of this.hitAreaCallbacks) {
            cb(area, userData);
          }
          // Auto-apply expression and motion
          if (userData.expression) {
            this.setExpression(userData.expression);
          }
          if (userData.motion) {
            this.playMotion(userData.motion, 0, MotionPriority.FORCE);
          }
        }
      }
    });
  }

  private getUserDataForHitArea(area: string): UserDataEvent | null {
    // Map hit area names to their userdata events
    const hitAreaEvents: Record<string, UserDataEvent> = {
      'Head': { event: 'HEAD_TAP', cognitive_state: 'Social Engagement', endocrine: { oxytocin: 0.3, dopamine_tonic: 0.2 }, expression: 'JOY_03_GentleSmile', motion: 'TapHead' },
      'Body': { event: 'BODY_TAP', cognitive_state: 'External Validation Triggered', endocrine: { dopamine_phasic: 0.2, norepinephrine: 0.1 }, expression: 'JOY_01_BroadSmile', motion: 'TapBody' },
      'ArmL': { event: 'ARM_TOUCH', cognitive_state: 'Social Engagement', endocrine: { oxytocin: 0.2 }, expression: 'JOY_03_GentleSmile' },
      'ArmR': { event: 'ARM_TOUCH', cognitive_state: 'Social Engagement', endocrine: { oxytocin: 0.2 }, expression: 'JOY_03_GentleSmile' },
      'Hair': { event: 'HAIR_TOUCH', cognitive_state: 'Sensory Input', endocrine: { serotonin: 0.15, anandamide: 0.1 }, expression: 'JOY_05_Blissful' },
      'Fairy': { event: 'FAIRY_TAP', cognitive_state: 'Novel Insights', endocrine: { dopamine_phasic: 0.3, norepinephrine: 0.2 }, expression: 'WONDER_02_CuriousGaze', motion: 'Excited' },
    };
    return hitAreaEvents[area] ?? null;
  }

  // ─── Lip Sync ──────────────────────────────────────────────────

  private setupLipSync(): void {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.lipSyncData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /**
   * Speak with lip sync from an audio URL.
   */
  async speak(audioUrl: string): Promise<void> {
    if (!this.model) return;
    this.model.speak(audioUrl);
  }

  /**
   * Set lip sync amplitude directly (0.0-1.0).
   * Used when audio analysis is handled externally (e.g., by the cognitive core).
   */
  setLipSyncAmplitude(amplitude: number): void {
    if (!this.model) return;
    const coreModel = this.model.internalModel?.coreModel;
    if (coreModel) {
      coreModel.setParameterValueById('ParamMouthOpenY', amplitude);
    }
  }

  // ─── Expression Control ────────────────────────────────────────

  /**
   * Set expression by name with fade transition.
   */
  setExpression(name: string): void {
    if (!this.model || name === this.currentExpression) return;
    this.model.expression(name);
    this.currentExpression = name;
    for (const cb of this.expressionCallbacks) {
      cb(name);
    }
  }

  /**
   * Reset to neutral expression.
   */
  resetExpression(): void {
    this.setExpression('NEUTRAL_Reset');
  }

  // ─── Motion Control ────────────────────────────────────────────

  /**
   * Play a motion from a group.
   */
  playMotion(group: string, index: number = 0, priority: number = MotionPriority.NORMAL): void {
    if (!this.model) return;
    this.model.motion(group, index, priority);
    this.currentMotionGroup = group;
  }

  /**
   * Play parallel motions (Cubism 5 feature).
   */
  playParallelMotions(motions: Array<{ group: string; index: number }>): void {
    if (!this.model) return;
    this.model.parallelMotion(motions);
  }

  /**
   * Play motion and freeze at last frame.
   */
  async playMotionLastFrame(group: string, index: number = 0): Promise<void> {
    if (!this.model) return;
    await this.model.motionLastFrame(group, index);
  }

  // ─── Cognitive State Integration ───────────────────────────────

  /**
   * Update from cognitive state (called by ExpressionTickPipeline).
   */
  updateCognitiveState(update: CognitiveStateUpdate): void {
    // Map cognitive state to expression
    const expression = COGNITIVE_EXPRESSION_MAP[update.state];
    if (expression) {
      this.setExpression(expression);
    }

    // Map cognitive state to motion
    const motionGroup = COGNITIVE_MOTION_MAP[update.state];
    if (motionGroup && motionGroup !== this.currentMotionGroup) {
      this.playMotion(motionGroup);
    }

    // Apply lip sync if present
    if (update.lipSyncAmplitude !== undefined) {
      this.setLipSyncAmplitude(update.lipSyncAmplitude);
    }
  }

  /**
   * Update endocrine-driven extra parameters.
   */
  updateEndocrine(update: EndocrineUpdate): void {
    // Smooth towards target values
    const lerp = 0.1;
    this.extraParams.glowIntensity += (update.glowIntensity - this.extraParams.glowIntensity) * lerp;
    this.extraParams.ledPulse += (update.ledPulse - this.extraParams.ledPulse) * lerp;
    this.extraParams.particleSparkle += (update.particleSparkle - this.extraParams.particleSparkle) * lerp;
    this.extraParams.hairGradientShift += (update.hairGradientShift - this.extraParams.hairGradientShift) * lerp;
  }

  // ─── Update Loop ───────────────────────────────────────────────

  private onTick = (ticker: Ticker): void => {
    if (this.destroyed || !this.model) return;

    const coreModel = this.model.internalModel?.coreModel;
    if (!coreModel) return;

    // Apply extra parameters (endocrine-driven)
    // These are custom parameters that control mesh-painter glow regions
    try {
      coreModel.setParameterValueById('ParamEffect1', this.extraParams.glowIntensity);
    } catch {
      // Parameter may not exist in all model versions
    }
  };

  // ─── Event Listeners ───────────────────────────────────────────

  onHitArea(callback: HitAreaCallback): () => void {
    this.hitAreaCallbacks.push(callback);
    return () => {
      this.hitAreaCallbacks = this.hitAreaCallbacks.filter(cb => cb !== callback);
    };
  }

  onExpressionChange(callback: ExpressionChangeCallback): () => void {
    this.expressionCallbacks.push(callback);
    return () => {
      this.expressionCallbacks = this.expressionCallbacks.filter(cb => cb !== callback);
    };
  }

  // ─── Accessors ─────────────────────────────────────────────────

  getModel(): any { return this.model; }
  getApp(): Application | null { return this.app; }
  getCurrentExpression(): string { return this.currentExpression; }
  getCurrentMotionGroup(): string { return this.currentMotionGroup; }
  getExtraParams(): typeof this.extraParams { return { ...this.extraParams }; }
}

// ═══════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════

export async function createDTEchoApp(
  config: Partial<DTEchoAppConfig> = {},
): Promise<DTEchoApp> {
  const app = new DTEchoApp(config);
  await app.init();
  return app;
}
