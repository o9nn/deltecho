/**
 * @fileoverview ExpressionTickPipeline — The orchestrator connecting all
 * embodiment components into a single per-frame tick loop.
 *
 * Pipeline:
 *   CoreSelfEngine → Echobeats → EndocrineExpressionBridge
 *     → CharacterRegistry → MeshPainterBridge → Live2D Cubism Model
 *
 * This module is the top-level entry point for the entire avatar expression
 * system. It receives cognitive state updates from the DTE cognitive core
 * and drives the Live2D avatar through the endocrine → expression → Cubism
 * parameter chain.
 *
 * @packageDocumentation
 */

import { CharacterRegistry, CharacterRegistration } from './CharacterRegistry.js';
import {
  EndocrineExpressionBridge,
  ExpressionEvaluation,
  EndocrineState,
  createEndocrineExpressionBridge,
} from './EndocrineExpressionBridge.js';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Cubism parameter update to be applied to the Live2D model */
export interface CubismParameterUpdate {
  parameterId: string;
  value: number;
  blend: 'Add' | 'Multiply' | 'Override';
}

/** Complete frame output from the pipeline */
export interface FrameOutput {
  timestamp: number;
  characterId: string;
  expressionName: string;
  cognitiveMode: string;
  motionGroup: string;
  endocrineState: EndocrineState;
  parameterUpdates: CubismParameterUpdate[];
  extraParams: Record<string, number>;
  textureVariant: string | null;
}

/** Listener for frame outputs */
export type FrameListener = (frame: FrameOutput) => void;

/** Cognitive state input from CoreSelfEngine / Echobeats */
export interface CognitiveStateInput {
  state: string;
  echobeatsPhase: number;     // 1-12
  echobeatsStream: number;    // 0-2 (three concurrent streams)
  reservoirActivation: number; // 0.0-1.0
  lipSyncAmplitude?: number;  // 0.0-1.0 for speech
}

// ═══════════════════════════════════════════════════════════════════════
// Expression Parameter Mappings (from exp3.json → CubismParameterUpdate)
// ═══════════════════════════════════════════════════════════════════════

const EXPRESSION_PARAMS: Record<string, Record<string, number>> = {
  JOY_01_BroadSmile:      { ParamMouthForm: 1.0, ParamMouthOpenY: 0.3, ParamEyeLOpen: 0.65, ParamEyeROpen: 0.65, ParamBrowLY: 0.3, ParamBrowRY: 0.3 },
  JOY_02_Laughing:        { ParamMouthForm: 1.0, ParamMouthOpenY: 0.85, ParamEyeLOpen: 0.5, ParamEyeROpen: 0.5, ParamBrowLY: 0.4, ParamBrowRY: 0.4, ParamBodyAngleX: 2.0 },
  JOY_03_GentleSmile:     { ParamMouthForm: 0.6, ParamMouthOpenY: 0.0, ParamEyeLOpen: 0.7, ParamEyeROpen: 0.7, ParamBrowLY: 0.15, ParamBrowRY: 0.15 },
  JOY_05_Blissful:        { ParamMouthForm: 0.5, ParamMouthOpenY: 0.0, ParamEyeLOpen: 0.3, ParamEyeROpen: 0.3, ParamBrowLY: 0.1, ParamBrowRY: 0.1, ParamEyeBallY: 0.2 },
  PHOTO_Awe:              { ParamMouthForm: 0.0, ParamMouthOpenY: 0.45, ParamEyeLOpen: 1.0, ParamEyeROpen: 1.0, ParamBrowLY: 0.55, ParamBrowRY: 0.55, ParamEyeBallY: 0.3 },
  PHOTO_ExuberantLaugh:   { ParamMouthForm: 1.0, ParamMouthOpenY: 0.6, ParamEyeLOpen: 0.85, ParamEyeROpen: 0.85, ParamBrowLY: 0.45, ParamBrowRY: 0.45, ParamBodyAngleX: 3.0 },
  PHOTO_UpwardGaze:       { ParamMouthForm: 0.1, ParamMouthOpenY: 0.0, ParamEyeLOpen: 0.75, ParamEyeROpen: 0.75, ParamBrowLY: 0.2, ParamBrowRY: 0.2, ParamEyeBallY: 0.5, ParamEyeBallX: -0.2, ParamAngleY: 8.0 },
  SPEAK_01_OpenVowel:     { ParamMouthForm: 0.4, ParamMouthOpenY: 0.6, ParamEyeLOpen: 0.8, ParamEyeROpen: 0.8, ParamBrowLY: 0.2, ParamBrowRY: 0.2 },
  WONDER_02_CuriousGaze:  { ParamMouthForm: 0.0, ParamMouthOpenY: 0.15, ParamEyeLOpen: 0.95, ParamEyeROpen: 0.95, ParamBrowLY: 0.4, ParamBrowRY: 0.4, ParamEyeBallY: 0.3, ParamEyeBallX: 0.2, ParamAngleY: 5.0 },
  WONDER_03_Contemplative: { ParamMouthForm: -0.1, ParamMouthOpenY: 0.0, ParamEyeLOpen: 0.85, ParamEyeROpen: 0.85, ParamBrowLY: -0.15, ParamBrowRY: -0.15, ParamEyeBallY: 0.3, ParamEyeBallX: -0.3, ParamAngleZ: -3.0 },
};

// ═══════════════════════════════════════════════════════════════════════
// Cognitive Mode → Texture Variant Mapping (for mesh-painter)
// ═══════════════════════════════════════════════════════════════════════

const MODE_TEXTURE_VARIANTS: Record<string, string> = {
  REWARD:      'texture_00_reward',
  EXPLORATORY: 'texture_00_exploratory',
  REFLECTIVE:  'texture_00_reflective',
  FOCUSED:     'texture_00_focused',
  SOCIAL:      'texture_00_social',
  STRESSED:    'texture_00_stressed',
  VIGILANT:    'texture_00_vigilant',
  RESTING:     'texture_00_resting',
  THREAT:      'texture_00_threat',
  MAINTENANCE: 'texture_00_maintenance',
};

// ═══════════════════════════════════════════════════════════════════════
// ExpressionTickPipeline
// ═══════════════════════════════════════════════════════════════════════

export class ExpressionTickPipeline {
  private characterId: string;
  private character: CharacterRegistration;
  private bridge: EndocrineExpressionBridge;
  private listeners: FrameListener[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = 0;
  private running: boolean = false;
  private currentCognitiveInput: CognitiveStateInput = {
    state: 'Idle',
    echobeatsPhase: 1,
    echobeatsStream: 0,
    reservoirActivation: 0.0,
  };

  // Smoothing state for parameter interpolation
  private currentParams: Record<string, number> = {};
  private readonly smoothingFactor: number = 0.15; // lerp factor per tick

  constructor(characterId: string = 'dtecho') {
    const char = CharacterRegistry.get(characterId);
    if (!char) {
      throw new Error(`Character '${characterId}' not found in registry`);
    }
    this.characterId = characterId;
    this.character = char;
    this.bridge = createEndocrineExpressionBridge(char);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTickTime = Date.now();
    this.tickInterval = setInterval(
      () => this.tick(),
      this.character.simulation.tickIntervalMs,
    );
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  // ─── Input ─────────────────────────────────────────────────────

  /**
   * Update cognitive state from CoreSelfEngine / Echobeats.
   * Called externally whenever the cognitive state changes.
   */
  updateCognitiveState(input: CognitiveStateInput): void {
    this.currentCognitiveInput = input;
  }

  // ─── Core Tick ─────────────────────────────────────────────────

  /**
   * Execute one tick of the expression pipeline.
   * This is the main loop body called at tickIntervalMs.
   */
  tick(): FrameOutput {
    const now = Date.now();
    const dt = (now - this.lastTickTime) / 1000; // seconds
    this.lastTickTime = now;

    // 1. Process cognitive state through endocrine bridge
    const evaluation: ExpressionEvaluation = this.bridge.processCognitiveState(
      this.currentCognitiveInput.state,
      dt,
    );

    // 2. Get expression parameters
    const targetParams = EXPRESSION_PARAMS[evaluation.expressionName] ?? {};

    // 3. Apply Echobeats modulation
    const modulatedParams = this.applyEchobeatsModulation(targetParams);

    // 4. Apply lip sync override if speaking
    if (this.currentCognitiveInput.lipSyncAmplitude !== undefined) {
      modulatedParams['ParamMouthOpenY'] = this.currentCognitiveInput.lipSyncAmplitude;
    }

    // 5. Smooth parameters to prevent jitter
    const smoothedParams = this.smoothParameters(modulatedParams);

    // 6. Build Cubism parameter updates
    const parameterUpdates: CubismParameterUpdate[] = Object.entries(smoothedParams).map(
      ([parameterId, value]) => ({
        parameterId,
        value,
        blend: 'Add' as const,
      }),
    );

    // 7. Add extra params (ParamExtra01-04)
    for (const [paramId, value] of Object.entries(evaluation.extraParams)) {
      parameterUpdates.push({
        parameterId: paramId,
        value,
        blend: 'Override',
      });
    }

    // 8. Determine texture variant
    const textureVariant = this.character.meshPainter?.modeVariants
      ? MODE_TEXTURE_VARIANTS[evaluation.cognitiveMode] ?? null
      : null;

    // 9. Build frame output
    const frame: FrameOutput = {
      timestamp: now,
      characterId: this.characterId,
      expressionName: evaluation.expressionName,
      cognitiveMode: evaluation.cognitiveMode,
      motionGroup: evaluation.motionGroup,
      endocrineState: this.bridge.getState(),
      parameterUpdates,
      extraParams: evaluation.extraParams,
      textureVariant,
    };

    // 10. Notify listeners
    for (const listener of this.listeners) {
      try { listener(frame); } catch (e) { /* swallow */ }
    }

    return frame;
  }

  // ─── Echobeats Modulation ──────────────────────────────────────

  /**
   * Apply Echobeats phase modulation to expression parameters.
   * The 3 concurrent streams create subtle oscillations in the
   * expression parameters, giving the avatar a "breathing" quality.
   */
  private applyEchobeatsModulation(
    params: Record<string, number>,
  ): Record<string, number> {
    const phase = this.currentCognitiveInput.echobeatsPhase;
    const stream = this.currentCognitiveInput.echobeatsStream;
    const reservoir = this.currentCognitiveInput.reservoirActivation;

    // Phase modulation: subtle sine wave based on 12-step cycle
    const phaseAngle = (phase / 12) * 2 * Math.PI;
    const streamOffset = (stream / 3) * 2 * Math.PI;
    const modulation = Math.sin(phaseAngle + streamOffset) * 0.05;

    // Reservoir activation scales the modulation amplitude
    const amplitude = modulation * (0.5 + reservoir * 0.5);

    const result = { ...params };
    // Apply subtle breathing to eye openness and brow position
    if (result['ParamEyeLOpen'] !== undefined) {
      result['ParamEyeLOpen'] += amplitude;
    }
    if (result['ParamEyeROpen'] !== undefined) {
      result['ParamEyeROpen'] += amplitude;
    }
    if (result['ParamBrowLY'] !== undefined) {
      result['ParamBrowLY'] += amplitude * 0.5;
    }
    if (result['ParamBrowRY'] !== undefined) {
      result['ParamBrowRY'] += amplitude * 0.5;
    }
    // Breathing parameter driven by phase
    result['ParamBreath'] = Math.abs(Math.sin(phaseAngle * 0.5));

    return result;
  }

  // ─── Parameter Smoothing ───────────────────────────────────────

  /**
   * Smooth parameters using exponential moving average to prevent
   * abrupt expression changes.
   */
  private smoothParameters(
    target: Record<string, number>,
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, targetValue] of Object.entries(target)) {
      const current = this.currentParams[key] ?? targetValue;
      const smoothed = current + (targetValue - current) * this.smoothingFactor;
      result[key] = smoothed;
      this.currentParams[key] = smoothed;
    }
    return result;
  }

  // ─── Listeners ─────────────────────────────────────────────────

  onFrame(listener: FrameListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ─── Accessors ─────────────────────────────────────────────────

  getCharacter(): CharacterRegistration { return this.character; }
  getBridge(): EndocrineExpressionBridge { return this.bridge; }
}

// ═══════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════

export function createExpressionTickPipeline(
  characterId: string = 'dtecho',
): ExpressionTickPipeline {
  return new ExpressionTickPipeline(characterId);
}
