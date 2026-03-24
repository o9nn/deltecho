/**
 * @fileoverview ExpressionController — Manages expression blending, queuing,
 * and smooth transitions between cognitive states for the DTEcho avatar.
 *
 * Implements:
 *   - Expression priority queue with fade timing
 *   - Micro-expression injection (chaotic perturbations)
 *   - Echobeats phase-locked expression oscillation
 *   - Endocrine-driven parameter smoothing (IIR filter)
 *   - Expression history for autognosis self-monitoring
 *
 * @packageDocumentation
 */

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface ExpressionRequest {
  name: string;
  priority: ExpressionPriority;
  fadeInTime?: number;
  fadeOutTime?: number;
  duration?: number;       // Auto-revert after duration (ms)
  microExpression?: boolean;
}

export enum ExpressionPriority {
  IDLE = 0,
  COGNITIVE = 1,
  INTERACTION = 2,
  EMOTION = 3,
  OVERRIDE = 4,
}

export interface ExpressionHistoryEntry {
  name: string;
  timestamp: number;
  priority: ExpressionPriority;
  cognitiveState: string;
  echobeatsPhase: number;
  duration: number;
}

export interface SmoothedParameter {
  current: number;
  target: number;
  velocity: number;
  smoothingFactor: number;
}

export interface MicroExpressionConfig {
  enabled: boolean;
  /** Probability per tick of injecting a micro-expression (0.0-1.0) */
  probability: number;
  /** Duration of micro-expression in ms */
  duration: number;
  /** Maximum parameter perturbation */
  amplitude: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

/** Parameters that support micro-expression perturbation */
const MICRO_EXPRESSION_PARAMS = [
  'ParamBrowLY', 'ParamBrowRY', 'ParamBrowLAngle', 'ParamBrowRAngle',
  'ParamEyeLOpen', 'ParamEyeROpen', 'ParamMouthForm',
  'ParamEyeBallX', 'ParamEyeBallY',
];

/** Echobeats 12-step cycle phase → expression weight modulation */
const ECHOBEATS_PHASE_WEIGHTS: Record<number, number> = {
  1: 1.0,  2: 0.95, 3: 0.9,  4: 0.85,
  5: 0.8,  6: 0.85, 7: 0.9,  8: 0.95,
  9: 1.0,  10: 0.95, 11: 0.9, 12: 0.85,
};

// ═══════════════════════════════════════════════════════════════════════
// ExpressionController
// ═══════════════════════════════════════════════════════════════════════

export class ExpressionController {
  private queue: ExpressionRequest[] = [];
  private activeExpression: string = 'NEUTRAL_Reset';
  private activePriority: ExpressionPriority = ExpressionPriority.IDLE;
  private history: ExpressionHistoryEntry[] = [];
  private maxHistorySize: number = 200;
  private echobeatsPhase: number = 1;
  private echobeatsStream: number = 0;
  private cognitiveState: string = 'Idle';

  // Smoothed parameters for endocrine-driven updates
  private smoothedParams: Map<string, SmoothedParameter> = new Map();

  // Micro-expression state
  private microConfig: MicroExpressionConfig = {
    enabled: true,
    probability: 0.005,  // ~0.5% per tick at 60fps ≈ every 3.3 seconds
    duration: 150,
    amplitude: 0.08,
  };
  private activeMicroExpressions: Map<string, { value: number; expiry: number }> = new Map();

  // Revert timer for temporary expressions
  private revertTimer: ReturnType<typeof setTimeout> | null = null;

  // Callback to apply expression on the Live2D model
  private applyCallback: ((name: string) => void) | null = null;
  private paramCallback: ((id: string, value: number) => void) | null = null;

  constructor() {
    // Initialize smoothed params for all endocrine-driven parameters
    const endocrineParams = [
      'ParamEffect1',
    ];
    for (const id of endocrineParams) {
      this.smoothedParams.set(id, {
        current: 0,
        target: 0,
        velocity: 0,
        smoothingFactor: 0.08,
      });
    }
  }

  // ─── Configuration ─────────────────────────────────────────────

  setApplyCallback(cb: (name: string) => void): void {
    this.applyCallback = cb;
  }

  setParamCallback(cb: (id: string, value: number) => void): void {
    this.paramCallback = cb;
  }

  setMicroExpressionConfig(config: Partial<MicroExpressionConfig>): void {
    this.microConfig = { ...this.microConfig, ...config };
  }

  // ─── Expression Queue ──────────────────────────────────────────

  /**
   * Request an expression change. Higher priority overrides lower.
   */
  requestExpression(request: ExpressionRequest): void {
    if (request.priority >= this.activePriority || request.name !== this.activeExpression) {
      this.queue.push(request);
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    const top = this.queue[0];
    if (top.priority >= this.activePriority) {
      this.applyExpression(top);
      this.queue.shift();
    }
  }

  private applyExpression(request: ExpressionRequest): void {
    this.activeExpression = request.name;
    this.activePriority = request.priority;

    // Record in history
    this.history.push({
      name: request.name,
      timestamp: Date.now(),
      priority: request.priority,
      cognitiveState: this.cognitiveState,
      echobeatsPhase: this.echobeatsPhase,
      duration: request.duration ?? 0,
    });
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Apply via callback
    if (this.applyCallback) {
      this.applyCallback(request.name);
    }

    // Set revert timer if duration specified
    if (this.revertTimer) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
    if (request.duration && request.duration > 0) {
      this.revertTimer = setTimeout(() => {
        this.activePriority = ExpressionPriority.IDLE;
        this.requestExpression({
          name: 'NEUTRAL_Reset',
          priority: ExpressionPriority.IDLE,
        });
      }, request.duration);
    }
  }

  // ─── Echobeats Integration ─────────────────────────────────────

  /**
   * Update echobeats phase (1-12) and stream (0-2).
   */
  setEchobeatsPhase(phase: number, stream: number): void {
    this.echobeatsPhase = phase;
    this.echobeatsStream = stream;
  }

  /**
   * Get the echobeats weight for the current phase.
   */
  getEchobeatsWeight(): number {
    return ECHOBEATS_PHASE_WEIGHTS[this.echobeatsPhase] ?? 1.0;
  }

  // ─── Cognitive State ───────────────────────────────────────────

  setCognitiveState(state: string): void {
    this.cognitiveState = state;
  }

  // ─── Smoothed Parameter Updates ────────────────────────────────

  /**
   * Set target value for a smoothed parameter.
   */
  setSmoothedTarget(paramId: string, target: number, smoothingFactor?: number): void {
    const existing = this.smoothedParams.get(paramId);
    if (existing) {
      existing.target = target;
      if (smoothingFactor !== undefined) {
        existing.smoothingFactor = smoothingFactor;
      }
    } else {
      this.smoothedParams.set(paramId, {
        current: target,
        target,
        velocity: 0,
        smoothingFactor: smoothingFactor ?? 0.08,
      });
    }
  }

  // ─── Per-Frame Tick ────────────────────────────────────────────

  /**
   * Called every frame to update smoothed parameters and micro-expressions.
   */
  tick(deltaMs: number): void {
    const now = Date.now();
    const echoWeight = this.getEchobeatsWeight();

    // Update smoothed parameters
    for (const [id, param] of this.smoothedParams) {
      const diff = param.target - param.current;
      param.velocity = diff * param.smoothingFactor;
      param.current += param.velocity * echoWeight;

      // Clamp
      param.current = Math.max(-1, Math.min(1, param.current));

      if (this.paramCallback) {
        this.paramCallback(id, param.current);
      }
    }

    // Micro-expressions
    if (this.microConfig.enabled) {
      // Inject new micro-expressions
      if (Math.random() < this.microConfig.probability) {
        const paramId = MICRO_EXPRESSION_PARAMS[
          Math.floor(Math.random() * MICRO_EXPRESSION_PARAMS.length)
        ];
        const perturbation = (Math.random() - 0.5) * 2 * this.microConfig.amplitude;
        this.activeMicroExpressions.set(paramId, {
          value: perturbation,
          expiry: now + this.microConfig.duration,
        });
      }

      // Apply and clean up expired micro-expressions
      for (const [paramId, micro] of this.activeMicroExpressions) {
        if (now > micro.expiry) {
          this.activeMicroExpressions.delete(paramId);
        } else if (this.paramCallback) {
          // Fade out as we approach expiry
          const remaining = (micro.expiry - now) / this.microConfig.duration;
          this.paramCallback(paramId, micro.value * remaining * echoWeight);
        }
      }
    }
  }

  // ─── Autognosis / History ──────────────────────────────────────

  /**
   * Get expression history for autognosis self-monitoring.
   */
  getHistory(): ReadonlyArray<ExpressionHistoryEntry> {
    return this.history;
  }

  /**
   * Get expression frequency distribution.
   */
  getExpressionDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const entry of this.history) {
      dist[entry.name] = (dist[entry.name] ?? 0) + 1;
    }
    return dist;
  }

  /**
   * Get current state snapshot for debugging/monitoring.
   */
  getState(): {
    activeExpression: string;
    activePriority: ExpressionPriority;
    echobeatsPhase: number;
    echobeatsStream: number;
    cognitiveState: string;
    queueLength: number;
    activeMicroExpressions: number;
    smoothedParamCount: number;
  } {
    return {
      activeExpression: this.activeExpression,
      activePriority: this.activePriority,
      echobeatsPhase: this.echobeatsPhase,
      echobeatsStream: this.echobeatsStream,
      cognitiveState: this.cognitiveState,
      queueLength: this.queue.length,
      activeMicroExpressions: this.activeMicroExpressions.size,
      smoothedParamCount: this.smoothedParams.size,
    };
  }
}
