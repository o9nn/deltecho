/**
 * MembraneMailBridge - Connects Double Membrane to Mail-Based IPC
 *
 * This bridge routes cognitive processing through the Double Membrane architecture
 * using mail protocols as the transport layer. It implements the "mail server as CPU"
 * paradigm by:
 *
 * - Processing incoming mail through Double Membrane
 * - Routing requests to Inner/Outer Membrane based on complexity
 * - Sending responses back via mail
 * - Maintaining cognitive state across mail sessions
 */

import { EventEmitter } from 'events';
import type { DoubleMembrane } from '../DoubleMembrane.js';
import type { CoordinatorRequest, CoordinatorResponse } from '../intermembrane-space/MembraneCoordinator.js';
import type { DovecotIPCTransport, MailIPCMessage } from './DovecotIPCTransport.js';
import type { IPCMessage } from './IPCBridge.js';

/** Priority string values for CoordinatorRequest */
type PriorityLevel = 'low' | 'normal' | 'high' | 'critical';

/**
 * Bridge configuration
 */
export interface MembraneMailBridgeConfig {
  botAddress: string;
  enableAutoResponse: boolean;
  responseDelay: number;
  priorityThreshold: number;
  complexityThreshold: number;
  maxConcurrentRequests: number;
  enableMetrics: boolean;
}

/**
 * Processing request with mail context
 */
export interface MailProcessingRequest {
  id: string;
  originalMail: MailIPCMessage;
  coordinatorRequest: CoordinatorRequest;
  receivedAt: Date;
  priority: number;
}

/**
 * Processing result with response
 */
export interface MailProcessingResult {
  requestId: string;
  response: CoordinatorResponse;
  responseMail: MailIPCMessage;
  processingTimeMs: number;
  source: 'inner' | 'outer' | 'hybrid';
}

/**
 * Bridge statistics
 */
export interface BridgeStats {
  requestsProcessed: number;
  requestsFailed: number;
  averageResponseTimeMs: number;
  innerMembraneUsage: number;
  outerMembraneUsage: number;
  hybridMembraneUsage: number;
  activeRequests: number;
  lastRequestTime?: Date;
}

/**
 * Bridge events
 */
export type BridgeEvent =
  | { type: 'request_received'; request: MailProcessingRequest }
  | { type: 'request_completed'; result: MailProcessingResult }
  | { type: 'request_failed'; requestId: string; error: string }
  | { type: 'response_sent'; requestId: string }
  | { type: 'error'; error: string };

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MembraneMailBridgeConfig = {
  botAddress: 'echo@dove9.local',
  enableAutoResponse: true,
  responseDelay: 0,
  priorityThreshold: 7,
  complexityThreshold: 0.5,
  maxConcurrentRequests: 50,
  enableMetrics: true,
};

/**
 * MembraneMailBridge - Routes mail through Double Membrane
 */
export class MembraneMailBridge extends EventEmitter {
  private membrane: DoubleMembrane;
  private transport: DovecotIPCTransport;
  private config: MembraneMailBridgeConfig;
  private activeRequests: Map<string, MailProcessingRequest>;
  private stats: BridgeStats;
  private running: boolean = false;
  private requestCounter: number = 0;

  constructor(
    membrane: DoubleMembrane,
    transport: DovecotIPCTransport,
    config: Partial<MembraneMailBridgeConfig> = {}
  ) {
    super();
    this.membrane = membrane;
    this.transport = transport;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeRequests = new Map();
    this.stats = this.initializeStats();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): BridgeStats {
    return {
      requestsProcessed: 0,
      requestsFailed: 0,
      averageResponseTimeMs: 0,
      innerMembraneUsage: 0,
      outerMembraneUsage: 0,
      hybridMembraneUsage: 0,
      activeRequests: 0,
    };
  }

  /**
   * Start the bridge
   */
  public async start(): Promise<void> {
    if (this.running) return;

    // Subscribe to cognitive processing channel
    await this.transport.subscribe('cognitive:process', this.handleIncomingMessage.bind(this));

    // Subscribe to memory channels
    await this.transport.subscribe('memory:store', this.handleMemoryMessage.bind(this));
    await this.transport.subscribe('memory:retrieve', this.handleMemoryMessage.bind(this));

    // Subscribe to identity channels
    await this.transport.subscribe('identity:state', this.handleIdentityMessage.bind(this));

    this.running = true;
  }

  /**
   * Stop the bridge
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    // Unsubscribe from all channels
    await this.transport.unsubscribe('cognitive:process');
    await this.transport.unsubscribe('memory:store');
    await this.transport.unsubscribe('memory:retrieve');
    await this.transport.unsubscribe('identity:state');

    // Clear pending requests
    this.activeRequests.clear();

    this.running = false;
  }

  /**
   * Handle incoming cognitive processing message
   */
  private async handleIncomingMessage(message: IPCMessage): Promise<void> {
    // Check concurrent request limit
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      this.emitEvent({ type: 'error', error: 'Max concurrent requests reached' });
      return;
    }

    // Create processing request
    const request = this.createProcessingRequest(message);
    this.activeRequests.set(request.id, request);
    this.stats.activeRequests = this.activeRequests.size;

    this.emitEvent({ type: 'request_received', request });

    try {
      // Process through Double Membrane
      const result = await this.processRequest(request);

      // Update statistics
      this.updateStats(result);

      this.emitEvent({ type: 'request_completed', result });

      // Send response if auto-response is enabled
      if (this.config.enableAutoResponse) {
        await this.sendResponse(result);
      }
    } catch (error) {
      this.stats.requestsFailed++;
      this.emitEvent({ type: 'request_failed', requestId: request.id, error: String(error) });
    } finally {
      this.activeRequests.delete(request.id);
      this.stats.activeRequests = this.activeRequests.size;
    }
  }

  /**
   * Handle memory-related messages
   */
  private async handleMemoryMessage(message: IPCMessage): Promise<void> {
    // Memory operations bypass the full cognitive loop
    // and go directly to the membrane coordinator
    const request: CoordinatorRequest = {
      id: `mem_${Date.now()}_${this.requestCounter++}`,
      prompt: JSON.stringify(message.payload),
      context: `Memory operation: ${message.channel}`,
      priority: 'normal',
      preferNative: true,
    };

    try {
      const response = await this.membrane.process(request);
      // For memory operations, we don't send mail responses
      // They are handled internally
      this.emit('memory_operation', { request, response });
    } catch (error) {
      this.emitEvent({ type: 'error', error: `Memory operation failed: ${error}` });
    }
  }

  /**
   * Handle identity-related messages
   */
  private async handleIdentityMessage(message: IPCMessage): Promise<void> {
    // Identity operations go to inner membrane only
    const request: CoordinatorRequest = {
      id: `identity_${Date.now()}_${this.requestCounter++}`,
      prompt: JSON.stringify(message.payload),
      context: `Identity operation: ${message.channel}`,
      priority: 'critical', // High priority for identity operations
      preferNative: true, // Identity operations should use native processing
    };

    try {
      const response = await this.membrane.process(request);
      this.emit('identity_operation', { request, response });
    } catch (error) {
      this.emitEvent({ type: 'error', error: `Identity operation failed: ${error}` });
    }
  }

  /**
   * Create a processing request from IPC message
   */
  private createProcessingRequest(message: IPCMessage): MailProcessingRequest {
    const id = `req_${Date.now()}_${this.requestCounter++}`;
    const numericPriority = this.calculatePriority(message);
    const priorityLevel = this.numericToPriorityLevel(numericPriority);

    // Create mail IPC message representation
    const originalMail: MailIPCMessage = {
      messageId: message.id,
      from: message.source,
      to: [this.config.botAddress],
      subject: `[${message.channel}] Request`,
      body: typeof message.payload === 'string' ? message.payload : JSON.stringify(message.payload),
      headers: new Map([
        ['X-IPC-Channel', message.channel],
        ['X-IPC-Type', message.type],
        ['X-IPC-Source', message.source],
      ]),
      timestamp: new Date(message.timestamp),
      channel: message.channel,
      ipcType: message.type,
      payload: message.payload,
    };

    // Create coordinator request
    const coordinatorRequest: CoordinatorRequest = {
      id,
      prompt: this.extractPrompt(message),
      context: `Channel: ${message.channel}, Source: ${message.source}`,
      priority: priorityLevel,
      preferNative: false,
    };

    return {
      id,
      originalMail,
      coordinatorRequest,
      receivedAt: new Date(),
      priority: numericPriority,
    };
  }

  /**
   * Convert numeric priority (1-10) to priority level
   */
  private numericToPriorityLevel(priority: number): PriorityLevel {
    if (priority >= 9) return 'critical';
    if (priority >= 7) return 'high';
    if (priority >= 4) return 'normal';
    return 'low';
  }

  /**
   * Process request through Double Membrane
   */
  private async processRequest(request: MailProcessingRequest): Promise<MailProcessingResult> {
    const startTime = Date.now();

    // Process through membrane
    const response = await this.membrane.process(request.coordinatorRequest);

    const processingTimeMs = Date.now() - startTime;

    // Create response mail
    const responseMail = this.createResponseMail(request, response);

    // Determine which membrane handled the request
    const source = this.determineSource(response);

    return {
      requestId: request.id,
      response,
      responseMail,
      processingTimeMs,
      source,
    };
  }

  /**
   * Create response mail message
   */
  private createResponseMail(request: MailProcessingRequest, response: CoordinatorResponse): MailIPCMessage {
    return {
      messageId: `<${request.id}.response@dove9.local>`,
      from: this.config.botAddress,
      to: [request.originalMail.from],
      subject: `Re: ${request.originalMail.subject}`,
      body: response.text,
      headers: new Map([
        ['In-Reply-To', request.originalMail.messageId],
        ['X-Cognitive-Source', response.source],
        ['X-Processing-Time', response.latencyMs.toString()],
        ['X-Energy-Cost', response.cost.toString()],
        ['X-IPC-Channel', request.originalMail.channel],
        ['X-IPC-Type', 'response'],
      ]),
      timestamp: new Date(),
      channel: request.originalMail.channel,
      ipcType: 'response',
      payload: {
        text: response.text,
        source: response.source,
        metrics: {
          processingTimeMs: response.latencyMs,
          energyCost: response.cost,
        },
      },
    };
  }

  /**
   * Send response via mail transport
   */
  private async sendResponse(result: MailProcessingResult): Promise<void> {
    // Apply response delay if configured
    if (this.config.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.responseDelay));
    }

    // Convert to IPC message and send
    const ipcMessage = this.transport.mailToIPCMessage(result.responseMail);
    await this.transport.send(ipcMessage);

    this.emitEvent({ type: 'response_sent', requestId: result.requestId });
  }

  /**
   * Extract prompt from IPC message
   */
  private extractPrompt(message: IPCMessage): string {
    if (typeof message.payload === 'string') {
      return message.payload;
    }
    if (message.payload?.text) {
      return message.payload.text;
    }
    if (message.payload?.prompt) {
      return message.payload.prompt;
    }
    if (message.payload?.body) {
      return message.payload.body;
    }
    return JSON.stringify(message.payload);
  }

  /**
   * Calculate priority from message
   */
  private calculatePriority(message: IPCMessage): number {
    let priority = 5;

    // Increase for certain channels
    if (message.channel === 'identity:state' || message.channel === 'identity:update') {
      priority += 3;
    }
    if (message.channel === 'cognitive:process') {
      priority += 2;
    }

    // Check payload for priority hints
    if (message.payload?.priority) {
      priority = Math.min(10, Math.max(1, message.payload.priority));
    }
    if (message.payload?.urgent) {
      priority = Math.min(10, priority + 2);
    }

    return priority;
  }

  /**
   * Determine which membrane handled the request
   */
  private determineSource(response: CoordinatorResponse): 'inner' | 'outer' | 'hybrid' {
    const source = response.source.toLowerCase();
    if (source.includes('native') || source.includes('inner')) {
      return 'inner';
    }
    if (source.includes('api') || source.includes('outer') || source.includes('external')) {
      return 'outer';
    }
    return 'hybrid';
  }

  /**
   * Update statistics with result
   */
  private updateStats(result: MailProcessingResult): void {
    this.stats.requestsProcessed++;
    this.stats.lastRequestTime = new Date();

    // Update average response time
    this.stats.averageResponseTimeMs =
      (this.stats.averageResponseTimeMs * (this.stats.requestsProcessed - 1) + result.processingTimeMs) /
      this.stats.requestsProcessed;

    // Update membrane usage with clear integer counts
    if (result.source === 'inner') {
      this.stats.innerMembraneUsage++;
    } else if (result.source === 'outer') {
      this.stats.outerMembraneUsage++;
    } else {
      // Hybrid: track separately for clear statistics
      this.stats.hybridMembraneUsage++;
    }
  }

  /**
   * Emit bridge event
   */
  private emitEvent(event: BridgeEvent): void {
    this.emit('bridge_event', event);
    this.emit(event.type, event);
  }

  /**
   * Process a mail message directly (external API)
   */
  public async processMailMessage(mail: MailIPCMessage): Promise<MailProcessingResult> {
    // Create IPC message from mail
    const ipcMessage = this.transport.mailToIPCMessage(mail);

    // Create processing request
    const request = this.createProcessingRequest(ipcMessage);
    this.activeRequests.set(request.id, request);
    this.stats.activeRequests = this.activeRequests.size;

    try {
      const result = await this.processRequest(request);
      this.updateStats(result);
      return result;
    } finally {
      this.activeRequests.delete(request.id);
      this.stats.activeRequests = this.activeRequests.size;
    }
  }

  /**
   * Get bridge statistics
   */
  public getStats(): BridgeStats {
    return { ...this.stats };
  }

  /**
   * Get active requests
   */
  public getActiveRequests(): MailProcessingRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get configuration
   */
  public getConfig(): MembraneMailBridgeConfig {
    return { ...this.config };
  }
}

export default MembraneMailBridge;
