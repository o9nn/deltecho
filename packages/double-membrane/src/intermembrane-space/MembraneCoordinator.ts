/**
 * MembraneCoordinator - The Intermembrane Space
 *
 * This module implements the "Intermembrane Space" of the double membrane architecture,
 * coordinating communication between the Outer Membrane (API Gateway) and the
 * Inner Membrane (Core Identity & Native Inference).
 *
 * Analogous to the mitochondrial intermembrane space, which:
 * - Buffers protons to create the electrochemical gradient
 * - Facilitates protein transport between membranes
 * - Contains enzymes for specific metabolic functions
 *
 * Key responsibilities:
 * - Request routing and prioritization
 * - Resource allocation decisions
 * - State synchronization between membranes
 * - Fallback logic and graceful degradation
 */

import { EventEmitter } from 'events';
import { AutonomousController, ControllerEvent } from '../inner-membrane/AutonomousController.js';
import { APIGateway, APIRequest, GatewayEvent, LLMProvider } from '../outer-membrane/APIGateway.js';
import { InferenceRequest } from '../inner-membrane/NativeInferenceEngine.js';
import { IdentityState } from '../inner-membrane/CoreIdentity.js';

/**
 * Unified request structure for the coordinator
 */
export interface CoordinatorRequest {
  id: string;
  prompt: string;
  systemPrompt?: string;
  context?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  preferNative: boolean;
  maxLatencyMs?: number;
}

/**
 * Unified response structure from the coordinator
 */
export interface CoordinatorResponse {
  id: string;
  text: string;
  source: 'native' | 'external' | 'hybrid';
  provider?: LLMProvider;
  latencyMs: number;
  tokensUsed: number;
  cost: number;
  identityState: IdentityState;
  processingPath: string[];
}

/**
 * Coordinator configuration
 */
export interface CoordinatorConfig {
  /** Complexity threshold for external API escalation */
  escalationThreshold: number;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Enable hybrid processing (combine native + external) */
  enableHybridProcessing: boolean;
  /** Timeout for external API calls */
  externalTimeoutMs: number;
  /** Prefer native processing when possible */
  preferNativeProcessing: boolean;
}

const DEFAULT_CONFIG: CoordinatorConfig = {
  escalationThreshold: 0.6,
  maxQueueSize: 100,
  enableHybridProcessing: true,
  externalTimeoutMs: 30000,
  preferNativeProcessing: true,
};

/**
 * Queue entry
 */
interface QueueEntry {
  request: CoordinatorRequest;
  timestamp: number;
  attempts: number;
}

/**
 * Coordinator events
 */
export type CoordinatorEvent =
  | { type: 'coordinator_started' }
  | { type: 'coordinator_stopped' }
  | { type: 'request_queued'; requestId: string; queuePosition: number }
  | { type: 'request_processing'; requestId: string; path: 'native' | 'external' | 'hybrid' }
  | { type: 'request_completed'; response: CoordinatorResponse }
  | { type: 'request_failed'; requestId: string; error: string }
  | { type: 'queue_overflow'; droppedRequestId: string }
  | { type: 'mode_transition'; from: string; to: string };

/**
 * MembraneCoordinator - Coordinates between inner and outer membranes
 */
export class MembraneCoordinator extends EventEmitter {
  private config: CoordinatorConfig;
  private innerMembrane: AutonomousController;
  private outerMembrane: APIGateway;
  private requestQueue: QueueEntry[];
  private running: boolean = false;
  private processingInterval?: ReturnType<typeof setInterval>;

  constructor(config: Partial<CoordinatorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.innerMembrane = new AutonomousController({
      escalationThreshold: this.config.escalationThreshold,
    });
    this.outerMembrane = new APIGateway();
    this.requestQueue = [];

    this.setupEventForwarding();
  }

  /**
   * Setup event forwarding from child components
   */
  private setupEventForwarding(): void {
    // Forward inner membrane events
    this.innerMembrane.on('escalation_requested', (event: ControllerEvent) => {
      if (event.type === 'escalation_requested') {
        this.emit('mode_transition', {
          type: 'mode_transition',
          from: 'native',
          to: 'external',
        });
      }
    });

    // Forward outer membrane events
    this.outerMembrane.on('fallback_triggered', (event: GatewayEvent) => {
      if (event.type === 'fallback_triggered') {
        this.emit('mode_transition', {
          type: 'mode_transition',
          from: event.from,
          to: event.to,
        });
      }
    });
  }

  /**
   * Start the coordinator
   */
  public async start(): Promise<void> {
    if (this.running) return;

    this.running = true;

    // Start child components
    await this.innerMembrane.start();
    this.outerMembrane.start();

    // Start queue processing
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Process queue every 100ms

    this.emit('coordinator_started', { type: 'coordinator_started' });
  }

  /**
   * Stop the coordinator
   */
  public stop(): void {
    if (!this.running) return;

    this.running = false;

    // Stop child components
    this.innerMembrane.stop();
    this.outerMembrane.stop();

    // Stop queue processing
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    this.emit('coordinator_stopped', { type: 'coordinator_stopped' });
  }

  /**
   * Submit a request for processing
   */
  public async submitRequest(request: CoordinatorRequest): Promise<CoordinatorResponse> {
    if (!this.running) {
      throw new Error('Coordinator not running');
    }

    // Check queue capacity
    if (this.requestQueue.length >= this.config.maxQueueSize) {
      // Drop oldest low-priority request
      const droppedIndex = this.requestQueue.findIndex((e) => e.request.priority === 'low');
      if (droppedIndex >= 0) {
        const dropped = this.requestQueue.splice(droppedIndex, 1)[0];
        this.emit('queue_overflow', {
          type: 'queue_overflow',
          droppedRequestId: dropped.request.id,
        });
      } else {
        throw new Error('Queue full and no low-priority requests to drop');
      }
    }

    // Add to queue
    const entry: QueueEntry = {
      request,
      timestamp: Date.now(),
      attempts: 0,
    };

    // Insert based on priority
    const insertIndex = this.findInsertIndex(request.priority);
    this.requestQueue.splice(insertIndex, 0, entry);

    this.emit('request_queued', {
      type: 'request_queued',
      requestId: request.id,
      queuePosition: insertIndex,
    });

    // Process immediately if queue was empty
    return this.processRequest(entry);
  }

  /**
   * Find insertion index based on priority
   */
  private findInsertIndex(priority: CoordinatorRequest['priority']): number {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const targetPriority = priorityOrder[priority];

    for (let i = 0; i < this.requestQueue.length; i++) {
      const entryPriority = priorityOrder[this.requestQueue[i].request.priority];
      if (entryPriority > targetPriority) {
        return i;
      }
    }

    return this.requestQueue.length;
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    // Process oldest request
    const entry = this.requestQueue[0];
    if (entry.attempts > 0) return; // Already being processed

    entry.attempts++;

    try {
      await this.processRequest(entry);
    } catch (error) {
      this.emit('request_failed', {
        type: 'request_failed',
        requestId: entry.request.id,
        error: String(error),
      });
    }

    // Remove from queue
    const index = this.requestQueue.indexOf(entry);
    if (index >= 0) {
      this.requestQueue.splice(index, 1);
    }
  }

  /**
   * Process a single request
   */
  private async processRequest(entry: QueueEntry): Promise<CoordinatorResponse> {
    const request = entry.request;
    const startTime = Date.now();
    const processingPath: string[] = [];

    // Determine processing path
    const path = this.determineProcessingPath(request);
    processingPath.push(`path:${path}`);

    this.emit('request_processing', {
      type: 'request_processing',
      requestId: request.id,
      path,
    });

    let response: CoordinatorResponse;

    switch (path) {
      case 'native':
        response = await this.processNative(request, startTime, processingPath);
        break;
      case 'external':
        response = await this.processExternal(request, startTime, processingPath);
        break;
      case 'hybrid':
        response = await this.processHybrid(request, startTime, processingPath);
        break;
      default:
        throw new Error(`Unknown processing path: ${path}`);
    }

    this.emit('request_completed', { type: 'request_completed', response });

    return response;
  }

  /**
   * Determine the best processing path for a request
   */
  private determineProcessingPath(request: CoordinatorRequest): 'native' | 'external' | 'hybrid' {
    // Critical requests always go external
    if (request.priority === 'critical') {
      return 'external';
    }

    // If native preferred and available
    if (request.preferNative || this.config.preferNativeProcessing) {
      const identityState = this.innerMembrane.getIdentityState();
      const complexity = this.estimateComplexity(request.prompt);

      // If complexity is low and energy is sufficient, use native
      if (complexity < this.config.escalationThreshold && identityState.energyLevel > 0.3) {
        return 'native';
      }
    }

    // Check if external APIs are available
    const availableProviders = this.outerMembrane.getAvailableProviders();
    if (availableProviders.length === 0) {
      return 'native'; // Fallback to native if no external available
    }

    // Use hybrid for complex requests if enabled
    if (this.config.enableHybridProcessing) {
      const complexity = this.estimateComplexity(request.prompt);
      if (complexity > 0.7) {
        return 'hybrid';
      }
    }

    return 'external';
  }

  /**
   * Estimate request complexity
   */
  private estimateComplexity(prompt: string): number {
    return this.innerMembrane.getInferenceEngine().estimateComplexity(prompt);
  }

  /**
   * Process request using native inference only
   */
  private async processNative(
    request: CoordinatorRequest,
    startTime: number,
    processingPath: string[]
  ): Promise<CoordinatorResponse> {
    processingPath.push('native:start');

    const inferenceRequest: InferenceRequest = {
      id: request.id,
      prompt: request.prompt,
      context: request.context,
    };

    const result = await this.innerMembrane.processRequest(inferenceRequest);
    processingPath.push('native:complete');

    if (result.escalated) {
      // Escalate to external
      processingPath.push('native:escalated');
      return this.processExternal(request, startTime, processingPath);
    }

    return {
      id: request.id,
      text: result.response?.text || '',
      source: 'native',
      latencyMs: Date.now() - startTime,
      tokensUsed: result.response?.tokensUsed || 0,
      cost: 0,
      identityState: result.identityState,
      processingPath,
    };
  }

  /**
   * Process request using external API
   */
  private async processExternal(
    request: CoordinatorRequest,
    startTime: number,
    processingPath: string[]
  ): Promise<CoordinatorResponse> {
    processingPath.push('external:start');

    const apiRequest: APIRequest = {
      id: request.id,
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      allowFallback: true,
    };

    try {
      const response = await this.outerMembrane.sendRequest(apiRequest);
      processingPath.push(`external:${response.provider}`);

      // Recharge inner membrane energy from successful external call
      this.innerMembrane.rechargeEnergy(0.1);

      return {
        id: request.id,
        text: response.text,
        source: 'external',
        provider: response.provider,
        latencyMs: Date.now() - startTime,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        identityState: this.innerMembrane.getIdentityState(),
        processingPath,
      };
    } catch (error) {
      processingPath.push('external:failed');
      // Fallback to native
      return this.processNative(request, startTime, processingPath);
    }
  }

  /**
   * Process request using hybrid approach (native + external)
   */
  private async processHybrid(
    request: CoordinatorRequest,
    startTime: number,
    processingPath: string[]
  ): Promise<CoordinatorResponse> {
    processingPath.push('hybrid:start');

    // First, get native analysis
    const nativeRequest: InferenceRequest = {
      id: `${request.id}_native`,
      prompt: `Analyze this request and provide key points: ${request.prompt}`,
    };

    const nativeResult = await this.innerMembrane.processRequest(nativeRequest);
    processingPath.push('hybrid:native_analysis');

    // Then, enhance with external API
    const enhancedPrompt = nativeResult.response
      ? `Based on this analysis: ${nativeResult.response.text}\n\nProvide a comprehensive response to: ${request.prompt}`
      : request.prompt;

    const apiRequest: APIRequest = {
      id: `${request.id}_external`,
      prompt: enhancedPrompt,
      systemPrompt: request.systemPrompt,
      allowFallback: true,
    };

    try {
      const externalResponse = await this.outerMembrane.sendRequest(apiRequest);
      processingPath.push(`hybrid:external_${externalResponse.provider}`);

      return {
        id: request.id,
        text: externalResponse.text,
        source: 'hybrid',
        provider: externalResponse.provider,
        latencyMs: Date.now() - startTime,
        tokensUsed: (nativeResult.response?.tokensUsed || 0) + externalResponse.tokensUsed,
        cost: externalResponse.cost,
        identityState: this.innerMembrane.getIdentityState(),
        processingPath,
      };
    } catch (error) {
      processingPath.push('hybrid:external_failed');
      // Return native result if external fails
      return {
        id: request.id,
        text: nativeResult.response?.text || 'Processing failed',
        source: 'native',
        latencyMs: Date.now() - startTime,
        tokensUsed: nativeResult.response?.tokensUsed || 0,
        cost: 0,
        identityState: nativeResult.identityState,
        processingPath,
      };
    }
  }

  /**
   * Get coordinator status
   */
  public getStatus(): {
    running: boolean;
    queueLength: number;
    innerMembraneStatus: ReturnType<AutonomousController['getStatus']>;
    outerMembraneStats: ReturnType<APIGateway['getStats']>;
    availableProviders: LLMProvider[];
  } {
    return {
      running: this.running,
      queueLength: this.requestQueue.length,
      innerMembraneStatus: this.innerMembrane.getStatus(),
      outerMembraneStats: this.outerMembrane.getStats(),
      availableProviders: this.outerMembrane.getAvailableProviders(),
    };
  }

  /**
   * Get inner membrane controller
   */
  public getInnerMembrane(): AutonomousController {
    return this.innerMembrane;
  }

  /**
   * Get outer membrane gateway
   */
  public getOuterMembrane(): APIGateway {
    return this.outerMembrane;
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }
}

export default MembraneCoordinator;
