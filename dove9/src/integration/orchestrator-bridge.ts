/**
 * Dove9 <-> Deep Tree Echo Orchestrator Bridge
 *
 * Connects the Dove9 cognitive OS to the Deep Tree Echo orchestrator,
 * enabling seamless integration between:
 * - Dovecot mail server (via Milter/LMTP)
 * - DeltaChat messaging
 * - Deep Tree Echo cognitive services
 * - The triadic cognitive loop
 */

import { EventEmitter } from 'events'
import {
  Dove9System,
  MailMessage,
  MessageProcess,
  KernelMetrics,
} from '../index.js'
import {
  LLMServiceInterface,
  MemoryStoreInterface,
  PersonaCoreInterface,
} from '../cognitive/deep-tree-echo-processor.js'
import { Dove9Config, DEFAULT_DOVE9_CONFIG } from '../types/index.js'

/**
 * Email message from Dovecot interface
 */
export interface DovecotEmail {
  from: string
  to: string[]
  subject: string
  body: string
  headers: Map<string, string>
  messageId?: string
  receivedAt: Date
}

/**
 * Response to be sent back
 */
export interface EmailResponse {
  to: string
  from: string
  subject: string
  body: string
  inReplyTo?: string
}

/**
 * Bridge configuration
 */
export interface OrchestratorBridgeConfig extends Partial<Dove9Config> {
  // Orchestrator connection
  orchestratorHost?: string
  orchestratorPort?: number

  // Bot identity
  botEmailAddress: string

  // Processing options
  enableAutoResponse: boolean
  responseDelay?: number
}

const DEFAULT_BRIDGE_CONFIG: OrchestratorBridgeConfig = {
  ...DEFAULT_DOVE9_CONFIG,
  botEmailAddress: 'echo@localhost',
  enableAutoResponse: true,
  responseDelay: 0,
}

/**
 * OrchestratorBridge
 *
 * Bridges the Dove9 system with the Deep Tree Echo orchestrator,
 * handling email-to-process conversion and response routing.
 */
export class OrchestratorBridge extends EventEmitter {
  private dove9: Dove9System | null = null
  private config: OrchestratorBridgeConfig
  private running: boolean = false

  // Response queue
  private responseQueue: EmailResponse[] = []

  constructor(config: Partial<OrchestratorBridgeConfig> = {}) {
    super()
    this.config = { ...DEFAULT_BRIDGE_CONFIG, ...config }
  }

  /**
   * Initialize with cognitive services
   */
  public initialize(
    llmService: LLMServiceInterface,
    memoryStore: MemoryStoreInterface,
    personaCore: PersonaCoreInterface
  ): void {
    // Create Dove9 system with full configuration
    const dove9Config: Dove9Config = {
      stepDuration: this.config.stepDuration ?? DEFAULT_DOVE9_CONFIG.stepDuration,
      maxConcurrentProcesses: this.config.maxConcurrentProcesses ?? DEFAULT_DOVE9_CONFIG.maxConcurrentProcesses,
      maxQueueDepth: this.config.maxQueueDepth ?? DEFAULT_DOVE9_CONFIG.maxQueueDepth,
      enableMilter: this.config.enableMilter ?? DEFAULT_DOVE9_CONFIG.enableMilter,
      enableLMTP: this.config.enableLMTP ?? DEFAULT_DOVE9_CONFIG.enableLMTP,
      enableDeltaChat: this.config.enableDeltaChat ?? DEFAULT_DOVE9_CONFIG.enableDeltaChat,
      enableParallelCognition: this.config.enableParallelCognition ?? DEFAULT_DOVE9_CONFIG.enableParallelCognition,
      defaultSalienceThreshold: this.config.defaultSalienceThreshold ?? DEFAULT_DOVE9_CONFIG.defaultSalienceThreshold,
    }

    this.dove9 = new Dove9System({
      ...dove9Config,
      llmService,
      memoryStore,
      personaCore,
    })

    // Subscribe to Dove9 events
    this.setupEventHandlers()
  }

  /**
   * Set up event handlers for Dove9 system
   */
  private setupEventHandlers(): void {
    if (!this.dove9) return

    // Handle response ready
    this.dove9.on('response_ready', (data: {
      originalMail: MailMessage
      response: MailMessage
      processId: string
      cognitiveResult: any
    }) => {
      const emailResponse: EmailResponse = {
        to: data.originalMail.from,
        from: this.config.botEmailAddress,
        subject: data.response.subject,
        body: data.response.body,
        inReplyTo: data.originalMail.messageId,
      }

      if (this.config.enableAutoResponse) {
        this.queueResponse(emailResponse)
      }

      this.emit('response', emailResponse)
    })

    // Forward kernel events
    this.dove9.on('kernel_event', (event: any) => {
      this.emit('kernel_event', event)
    })

    // Handle triadic sync
    this.dove9.on('triad_sync', (triad: any) => {
      this.emit('triad_sync', triad)
    })

    // Handle cycle completion
    this.dove9.on('cycle_complete', (data: { cycle: number; metrics: KernelMetrics }) => {
      this.emit('cycle_complete', data)
    })
  }

  /**
   * Start the bridge
   */
  public async start(): Promise<void> {
    if (!this.dove9) {
      throw new Error('Bridge not initialized. Call initialize() first.')
    }

    if (this.running) return

    await this.dove9.start()
    this.running = true

    this.emit('started')
  }

  /**
   * Stop the bridge
   */
  public async stop(): Promise<void> {
    if (!this.dove9 || !this.running) return

    await this.dove9.stop()
    this.running = false

    this.emit('stopped')
  }

  /**
   * Process incoming email from Dovecot
   */
  public async processEmail(email: DovecotEmail): Promise<MessageProcess | null> {
    if (!this.dove9) {
      throw new Error('Bridge not initialized')
    }

    // Check if email is for the bot
    const isForBot = email.to.some(
      addr => addr.toLowerCase() === this.config.botEmailAddress.toLowerCase()
    )

    if (!isForBot) {
      return null
    }

    // Convert to MailMessage
    const mailMessage: MailMessage = {
      messageId: email.messageId || `msg_${Date.now()}`,
      from: email.from,
      to: email.to,
      subject: email.subject,
      body: email.body,
      headers: email.headers,
      receivedAt: email.receivedAt,
    }

    // Process through Dove9
    return this.dove9.processMailMessage(mailMessage)
  }

  /**
   * Queue a response for sending
   */
  private queueResponse(response: EmailResponse): void {
    this.responseQueue.push(response)

    if (this.config.responseDelay && this.config.responseDelay > 0) {
      setTimeout(() => this.flushResponses(), this.config.responseDelay)
    } else {
      this.flushResponses()
    }
  }

  /**
   * Flush pending responses
   */
  private flushResponses(): void {
    while (this.responseQueue.length > 0) {
      const response = this.responseQueue.shift()
      if (response) {
        this.emit('send_response', response)
      }
    }
  }

  /**
   * Get metrics
   */
  public getMetrics(): KernelMetrics | null {
    return this.dove9?.getMetrics() || null
  }

  /**
   * Get active processes
   */
  public getActiveProcesses(): MessageProcess[] {
    return this.dove9?.getActiveProcesses() || []
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running
  }

  /**
   * Get the underlying Dove9 system
   */
  public getDove9System(): Dove9System | null {
    return this.dove9
  }
}

/**
 * Create a bridge connected to the orchestrator
 */
export function createOrchestratorBridge(
  config: Partial<OrchestratorBridgeConfig> = {}
): OrchestratorBridge {
  return new OrchestratorBridge(config)
}
