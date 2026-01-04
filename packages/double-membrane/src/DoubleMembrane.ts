/**
 * DoubleMembrane - The Complete Bio-Inspired Cognitive Architecture
 *
 * This is the main entry point for the Double Membrane system, integrating
 * all components into a unified cognitive architecture for Deep Tree Echo.
 *
 * The system provides:
 * - Autonomous operation with native inference
 * - API acceleration when external services are available
 * - Graceful degradation and fallback handling
 * - Strong core identity with AAR dynamics
 * - Energy-aware processing decisions
 *
 * Usage:
 * ```typescript
 * const membrane = new DoubleMembrane();
 * await membrane.start();
 *
 * const response = await membrane.process({
 *   id: 'req-1',
 *   prompt: 'Hello, who are you?',
 *   priority: 'normal',
 *   preferNative: true,
 * });
 *
 * console.log(response.text);
 * membrane.stop();
 * ```
 */

import { EventEmitter } from 'events';
import {
  MembraneCoordinator,
  CoordinatorRequest,
  CoordinatorResponse,
  CoordinatorConfig,
  CoordinatorEvent,
} from './intermembrane-space/MembraneCoordinator.js';
import { IdentityState } from './inner-membrane/CoreIdentity.js';
import { LLMProvider } from './outer-membrane/APIGateway.js';

/**
 * Configuration for the Double Membrane system
 */
export interface DoubleMembraneConfig extends Partial<CoordinatorConfig> {
  /** Name of this Deep Tree Echo instance */
  instanceName?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Auto-start on construction */
  autoStart?: boolean;
  /** Persistence path for identity state */
  persistencePath?: string;
}

const DEFAULT_CONFIG: DoubleMembraneConfig = {
  instanceName: 'DeepTreeEcho',
  verbose: false,
  autoStart: false,
  persistencePath: undefined,
  escalationThreshold: 0.6,
  maxQueueSize: 100,
  enableHybridProcessing: true,
  externalTimeoutMs: 30000,
  preferNativeProcessing: true,
};

/**
 * System status
 */
export interface SystemStatus {
  running: boolean;
  instanceName: string;
  uptime: number;
  identityState: IdentityState;
  queueLength: number;
  availableProviders: LLMProvider[];
  stats: {
    totalRequests: number;
    nativeRequests: number;
    externalRequests: number;
    hybridRequests: number;
    averageLatency: number;
  };
}

/**
 * DoubleMembrane - The unified cognitive architecture
 */
export class DoubleMembrane extends EventEmitter {
  private config: DoubleMembraneConfig;
  private coordinator: MembraneCoordinator;
  private running: boolean = false;
  private startTime: number = 0;
  private requestStats = {
    total: 0,
    native: 0,
    external: 0,
    hybrid: 0,
    totalLatency: 0,
  };

  constructor(config: DoubleMembraneConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.coordinator = new MembraneCoordinator({
      escalationThreshold: this.config.escalationThreshold,
      maxQueueSize: this.config.maxQueueSize,
      enableHybridProcessing: this.config.enableHybridProcessing,
      externalTimeoutMs: this.config.externalTimeoutMs,
      preferNativeProcessing: this.config.preferNativeProcessing,
    });

    this.setupEventHandlers();

    if (this.config.autoStart) {
      this.start().catch((error) => {
        this.log('error', `Auto-start failed: ${error}`);
      });
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.coordinator.on('request_completed', (event: CoordinatorEvent) => {
      if (event.type === 'request_completed') {
        this.updateStats(event.response);
        this.emit('response', event.response);
      }
    });

    this.coordinator.on('request_failed', (event: CoordinatorEvent) => {
      if (event.type === 'request_failed') {
        this.emit('error', { requestId: event.requestId, error: event.error });
      }
    });

    this.coordinator.on('mode_transition', (event: CoordinatorEvent) => {
      if (event.type === 'mode_transition') {
        this.log('info', `Mode transition: ${event.from} -> ${event.to}`);
        this.emit('mode_change', event);
      }
    });
  }

  /**
   * Start the Double Membrane system
   */
  public async start(): Promise<void> {
    if (this.running) {
      this.log('warn', 'System already running');
      return;
    }

    this.log('info', `Starting ${this.config.instanceName}...`);
    this.startTime = Date.now();

    await this.coordinator.start();
    this.running = true;

    this.log('info', `${this.config.instanceName} started successfully`);
    this.emit('started');
  }

  /**
   * Stop the Double Membrane system
   */
  public stop(): void {
    if (!this.running) {
      this.log('warn', 'System not running');
      return;
    }

    this.log('info', `Stopping ${this.config.instanceName}...`);
    this.coordinator.stop();
    this.running = false;

    this.log('info', `${this.config.instanceName} stopped`);
    this.emit('stopped');
  }

  /**
   * Process a request through the Double Membrane system
   */
  public async process(request: CoordinatorRequest): Promise<CoordinatorResponse> {
    if (!this.running) {
      throw new Error('System not running. Call start() first.');
    }

    this.log('debug', `Processing request: ${request.id}`);
    return this.coordinator.submitRequest(request);
  }

  /**
   * Simple chat interface
   */
  public async chat(message: string, options: Partial<CoordinatorRequest> = {}): Promise<string> {
    const request: CoordinatorRequest = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt: message,
      priority: 'normal',
      preferNative: this.config.preferNativeProcessing ?? true,
      ...options,
    };

    const response = await this.process(request);
    return response.text;
  }

  /**
   * Update request statistics
   */
  private updateStats(response: CoordinatorResponse): void {
    this.requestStats.total++;
    this.requestStats.totalLatency += response.latencyMs;

    switch (response.source) {
      case 'native':
        this.requestStats.native++;
        break;
      case 'external':
        this.requestStats.external++;
        break;
      case 'hybrid':
        this.requestStats.hybrid++;
        break;
    }
  }

  /**
   * Get system status
   */
  public getStatus(): SystemStatus {
    const coordinatorStatus = this.coordinator.getStatus();

    return {
      running: this.running,
      instanceName: this.config.instanceName || 'DeepTreeEcho',
      uptime: this.running ? Date.now() - this.startTime : 0,
      identityState: coordinatorStatus.innerMembraneStatus.identityState,
      queueLength: coordinatorStatus.queueLength,
      availableProviders: coordinatorStatus.availableProviders,
      stats: {
        totalRequests: this.requestStats.total,
        nativeRequests: this.requestStats.native,
        externalRequests: this.requestStats.external,
        hybridRequests: this.requestStats.hybrid,
        averageLatency:
          this.requestStats.total > 0
            ? this.requestStats.totalLatency / this.requestStats.total
            : 0,
      },
    };
  }

  /**
   * Get identity state
   */
  public getIdentityState(): IdentityState {
    return this.coordinator.getInnerMembrane().getIdentityState();
  }

  /**
   * Get available providers
   */
  public getAvailableProviders(): LLMProvider[] {
    return this.coordinator.getOuterMembrane().getAvailableProviders();
  }

  /**
   * Recharge energy (simulate external resource availability)
   */
  public rechargeEnergy(amount: number): void {
    this.coordinator.getInnerMembrane().rechargeEnergy(amount);
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the coordinator for advanced access
   */
  public getCoordinator(): MembraneCoordinator {
    return this.coordinator;
  }

  /**
   * Log message
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.config.verbose && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.config.instanceName}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`);
        break;
      case 'info':
        console.info(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
    }
  }
}

export default DoubleMembrane;
