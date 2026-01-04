/**
 * AutonomousController - Inner Membrane Coordination
 *
 * This controller coordinates all operations within the Inner Membrane,
 * managing the interplay between CoreIdentity and NativeInferenceEngine.
 * It decides when to operate autonomously and when to request external
 * API acceleration through the Outer Membrane.
 *
 * The controller implements the "proton gradient" analogy from mitochondria:
 * - Energy level determines operational capacity
 * - Coherence determines identity stability
 * - Complexity thresholds determine escalation to external APIs
 */

import { EventEmitter } from 'events';
import { CoreIdentity, IdentityState, CoreIdentityEvent } from './CoreIdentity.js';
import {
  NativeInferenceEngine,
  InferenceRequest,
  InferenceResponse,
  EngineStats,
} from './NativeInferenceEngine.js';

/**
 * Controller configuration
 */
export interface ControllerConfig {
  /** Complexity threshold for escalating to external API (0-1) */
  escalationThreshold: number;
  /** Minimum energy level for full operation (0-1) */
  minEnergyLevel: number;
  /** Minimum coherence for stable operation (0-1) */
  minCoherence: number;
  /** Enable degraded mode when resources are low */
  enableDegradedMode: boolean;
  /** Maximum requests per minute in degraded mode */
  degradedModeRateLimit: number;
}

const DEFAULT_CONFIG: ControllerConfig = {
  escalationThreshold: 0.6,
  minEnergyLevel: 0.2,
  minCoherence: 0.4,
  enableDegradedMode: true,
  degradedModeRateLimit: 10,
};

/**
 * Processing result from the controller
 */
export interface ProcessingResult {
  response: InferenceResponse | null;
  escalated: boolean;
  escalationReason?: string;
  processingMode: 'full' | 'degraded' | 'escalated';
  identityState: IdentityState;
}

/**
 * Controller events
 */
export type ControllerEvent =
  | { type: 'controller_started' }
  | { type: 'controller_stopped' }
  | { type: 'mode_changed'; mode: 'full' | 'degraded' }
  | { type: 'escalation_requested'; reason: string; complexity: number }
  | { type: 'request_processed'; result: ProcessingResult }
  | { type: 'energy_critical'; level: number }
  | { type: 'coherence_unstable'; coherence: number };

/**
 * AutonomousController - Coordinates inner membrane operations
 */
export class AutonomousController extends EventEmitter {
  private config: ControllerConfig;
  private coreIdentity: CoreIdentity;
  private inferenceEngine: NativeInferenceEngine;
  private running: boolean = false;
  private currentMode: 'full' | 'degraded' = 'full';
  private requestsThisMinute: number = 0;
  private rateLimitResetTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<ControllerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.coreIdentity = new CoreIdentity();
    this.inferenceEngine = new NativeInferenceEngine();

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for child components
   */
  private setupEventHandlers(): void {
    // Handle core identity events
    this.coreIdentity.on('coherence_check', (event: CoreIdentityEvent) => {
      if (event.type === 'coherence_check') {
        if (event.coherence < this.config.minCoherence) {
          this.emit('coherence_unstable', {
            type: 'coherence_unstable',
            coherence: event.coherence,
          });
          this.checkModeTransition();
        }
      }
    });

    this.coreIdentity.on('energy_low', (event: CoreIdentityEvent) => {
      if (event.type === 'energy_low') {
        this.emit('energy_critical', {
          type: 'energy_critical',
          level: event.level,
        });
        this.checkModeTransition();
      }
    });
  }

  /**
   * Start the controller
   */
  public async start(): Promise<void> {
    if (this.running) return;

    this.running = true;

    // Start child components
    await this.coreIdentity.start();
    this.inferenceEngine.start();

    // Start rate limit reset timer
    this.rateLimitResetTimer = setInterval(() => {
      this.requestsThisMinute = 0;
    }, 60000);

    this.emit('controller_started', { type: 'controller_started' });
  }

  /**
   * Stop the controller
   */
  public stop(): void {
    if (!this.running) return;

    this.running = false;

    // Stop child components
    this.coreIdentity.stop();
    this.inferenceEngine.stop();

    // Clear rate limit timer
    if (this.rateLimitResetTimer) {
      clearInterval(this.rateLimitResetTimer);
      this.rateLimitResetTimer = undefined;
    }

    this.emit('controller_stopped', { type: 'controller_stopped' });
  }

  /**
   * Process a request through the inner membrane
   */
  public async processRequest(request: InferenceRequest): Promise<ProcessingResult> {
    if (!this.running) {
      throw new Error('Controller not running');
    }

    // Check rate limit in degraded mode
    if (this.currentMode === 'degraded') {
      if (this.requestsThisMinute >= this.config.degradedModeRateLimit) {
        return this.createEscalationResult(
          'Rate limit exceeded in degraded mode',
          1.0
        );
      }
    }

    this.requestsThisMinute++;

    // Estimate complexity
    const complexity = this.inferenceEngine.estimateComplexity(request.prompt);

    // Check if escalation is needed
    if (this.shouldEscalate(complexity)) {
      return this.createEscalationResult(
        `Complexity ${complexity.toFixed(2)} exceeds threshold`,
        complexity
      );
    }

    // Process with native inference
    try {
      const response = await this.inferenceEngine.infer(request);

      // Update identity state based on processing
      this.updateIdentityAfterProcessing(complexity);

      const result: ProcessingResult = {
        response,
        escalated: false,
        processingMode: this.currentMode,
        identityState: this.coreIdentity.getState(),
      };

      this.emit('request_processed', { type: 'request_processed', result });

      return result;
    } catch (error) {
      // On error, escalate to external API
      return this.createEscalationResult(
        `Native inference failed: ${error}`,
        complexity
      );
    }
  }

  /**
   * Determine if request should be escalated to external API
   */
  private shouldEscalate(complexity: number): boolean {
    const state = this.coreIdentity.getState();

    // Always escalate if coherence is too low
    if (state.coherence < this.config.minCoherence) {
      return true;
    }

    // Adjust threshold based on energy level
    const adjustedThreshold = this.config.escalationThreshold * state.energyLevel;

    // Check if complexity exceeds adjusted threshold
    if (complexity > adjustedThreshold) {
      return true;
    }

    // Check if core identity recommends escalation
    if (this.coreIdentity.needsExternalAPI(complexity)) {
      return true;
    }

    return false;
  }

  /**
   * Create an escalation result
   */
  private createEscalationResult(reason: string, complexity: number): ProcessingResult {
    this.emit('escalation_requested', {
      type: 'escalation_requested',
      reason,
      complexity,
    });

    return {
      response: null,
      escalated: true,
      escalationReason: reason,
      processingMode: 'escalated',
      identityState: this.coreIdentity.getState(),
    };
  }

  /**
   * Update identity state after processing
   */
  private updateIdentityAfterProcessing(complexity: number): void {
    // Consume energy based on complexity
    const energyCost = complexity * 0.05;
    const currentState = this.coreIdentity.getState();
    this.coreIdentity.setEnergyLevel(currentState.energyLevel - energyCost);

    // Update arena state
    this.coreIdentity.updateArenaState('cognitive_load', complexity);
  }

  /**
   * Check if mode transition is needed
   */
  private checkModeTransition(): void {
    const state = this.coreIdentity.getState();
    const previousMode = this.currentMode;

    if (
      state.energyLevel < this.config.minEnergyLevel ||
      state.coherence < this.config.minCoherence
    ) {
      if (this.config.enableDegradedMode) {
        this.currentMode = 'degraded';
      }
    } else {
      this.currentMode = 'full';
    }

    if (previousMode !== this.currentMode) {
      this.emit('mode_changed', { type: 'mode_changed', mode: this.currentMode });
    }
  }

  /**
   * Recharge energy (called when external resources become available)
   */
  public rechargeEnergy(amount: number): void {
    const currentState = this.coreIdentity.getState();
    this.coreIdentity.setEnergyLevel(
      Math.min(1.0, currentState.energyLevel + amount)
    );
    this.checkModeTransition();
  }

  /**
   * Get current operating mode
   */
  public getMode(): 'full' | 'degraded' {
    return this.currentMode;
  }

  /**
   * Get core identity state
   */
  public getIdentityState(): IdentityState {
    return this.coreIdentity.getState();
  }

  /**
   * Get inference engine statistics
   */
  public getEngineStats(): EngineStats {
    return this.inferenceEngine.getStats();
  }

  /**
   * Get controller status
   */
  public getStatus(): {
    running: boolean;
    mode: 'full' | 'degraded';
    identityState: IdentityState;
    engineStats: EngineStats;
    requestsThisMinute: number;
  } {
    return {
      running: this.running,
      mode: this.currentMode,
      identityState: this.coreIdentity.getState(),
      engineStats: this.inferenceEngine.getStats(),
      requestsThisMinute: this.requestsThisMinute,
    };
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get core identity instance (for direct access if needed)
   */
  public getCoreIdentity(): CoreIdentity {
    return this.coreIdentity;
  }

  /**
   * Get inference engine instance (for direct access if needed)
   */
  public getInferenceEngine(): NativeInferenceEngine {
    return this.inferenceEngine;
  }

  /**
   * Serialize controller state
   */
  public serialize(): string {
    return JSON.stringify({
      config: this.config,
      mode: this.currentMode,
      identityState: this.coreIdentity.serialize(),
      engineStats: this.inferenceEngine.getStats(),
    });
  }

  /**
   * Restore controller state
   */
  public deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.config = { ...DEFAULT_CONFIG, ...parsed.config };
      this.currentMode = parsed.mode || 'full';
      if (parsed.identityState) {
        this.coreIdentity.deserialize(parsed.identityState);
      }
    } catch (error) {
      console.error('Failed to deserialize controller state:', error);
    }
  }
}

export default AutonomousController;
