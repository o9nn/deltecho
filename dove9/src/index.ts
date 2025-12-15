/**
 * Dove9 - "Everything is a Chatbot" Operating System
 *
 * The revolutionary OS paradigm where:
 * - Mail server is the CPU (cognitive processing unit)
 * - Messages are process threads
 * - Inference is feedforward processing
 * - Learning is feedback processing
 * - Deep Tree Echo is the orchestration agent
 *
 * Triadic Architecture:
 * - 3 concurrent cognitive streams (120° phase offset)
 * - 12-step cognitive loop per cycle
 * - Self-balancing feedback loops
 * - Feedforward anticipation
 * - Projected onto shared Salience Landscape
 */

export * from './types/index.js'
export * from './cognitive/triadic-engine.js'
export * from './cognitive/deep-tree-echo-processor.js'
export * from './core/kernel.js'

import { EventEmitter } from 'events'
import { Dove9Kernel } from './core/kernel.js'
import { DeepTreeEchoProcessor, LLMServiceInterface, MemoryStoreInterface, PersonaCoreInterface } from './cognitive/deep-tree-echo-processor.js'
import { Dove9Config, DEFAULT_DOVE9_CONFIG, MessageProcess, KernelEvent, KernelMetrics } from './types/index.js'

/**
 * Mail message input format
 */
export interface MailMessage {
  messageId: string
  from: string
  to: string[]
  subject: string
  body: string
  headers?: Map<string, string>
  receivedAt?: Date
}

/**
 * Dove9 System configuration
 */
export interface Dove9SystemConfig extends Dove9Config {
  // Deep Tree Echo integration
  llmService: LLMServiceInterface
  memoryStore: MemoryStoreInterface
  personaCore: PersonaCoreInterface

  // Mail server integration
  milterSocket?: string
  lmtpSocket?: string

  // Bot identity
  botEmailAddress?: string
}

/**
 * Dove9System - The complete cognitive operating system
 *
 * Integrates:
 * - Dove9 Kernel (process management)
 * - Triadic Cognitive Engine (3-phase loop)
 * - Deep Tree Echo (orchestration agent)
 * - Mail server (Dovecot) integration
 */
export class Dove9System extends EventEmitter {
  private kernel: Dove9Kernel
  private processor: DeepTreeEchoProcessor
  private config: Dove9SystemConfig
  private running: boolean = false

  // Mail integration
  private pendingMail: Map<string, MailMessage> = new Map()
  private processToMail: Map<string, string> = new Map()

  constructor(config: Dove9SystemConfig) {
    super()

    this.config = {
      ...DEFAULT_DOVE9_CONFIG,
      ...config,
    }

    // Create the Deep Tree Echo processor
    this.processor = new DeepTreeEchoProcessor(
      config.llmService,
      config.memoryStore,
      config.personaCore,
      {
        enableParallelCognition: config.enableParallelCognition,
        memoryRetrievalCount: 10,
        salienceThreshold: config.defaultSalienceThreshold,
      }
    )

    // Create the Dove9 kernel with the processor
    this.kernel = new Dove9Kernel(this.processor, this.config)

    // Forward kernel events
    this.kernel.on('kernel_event', (event: KernelEvent) => {
      this.emit('kernel_event', event)
      this.handleKernelEvent(event)
    })
  }

  /**
   * Start the Dove9 system
   */
  public async start(): Promise<void> {
    if (this.running) return

    this.running = true
    await this.kernel.start()

    this.emit('started')
  }

  /**
   * Stop the Dove9 system
   */
  public async stop(): Promise<void> {
    if (!this.running) return

    this.running = false
    await this.kernel.stop()

    this.emit('stopped')
  }

  /**
   * Process an incoming mail message
   */
  public async processMailMessage(mail: MailMessage): Promise<MessageProcess> {
    // Store the original mail
    this.pendingMail.set(mail.messageId, mail)

    // Create a process for this message
    const process = this.kernel.createProcess(
      mail.messageId,
      mail.from,
      mail.to,
      mail.subject,
      mail.body,
      this.calculatePriority(mail)
    )

    // Map process to mail
    this.processToMail.set(process.id, mail.messageId)

    this.emit('mail_received', { mail, process })

    return process
  }

  /**
   * Calculate priority for a mail message
   */
  private calculatePriority(mail: MailMessage): number {
    let priority = 5 // Default priority

    // Higher priority for direct messages
    if (mail.to.length === 1) {
      priority += 2
    }

    // Higher priority for replies
    if (mail.subject.toLowerCase().startsWith('re:')) {
      priority += 1
    }

    // Higher priority for urgent markers
    const urgentMarkers = ['urgent', 'important', 'asap', 'priority']
    const subjectLower = mail.subject.toLowerCase()
    if (urgentMarkers.some(marker => subjectLower.includes(marker))) {
      priority += 3
    }

    return Math.min(10, priority)
  }

  /**
   * Handle kernel events
   */
  private handleKernelEvent(event: KernelEvent): void {
    switch (event.type) {
      case 'process_completed':
        this.handleProcessCompleted(event.processId, event.result)
        break

      case 'triad_convergence':
        this.emit('triad_sync', event.triad)
        break

      case 'cycle_complete':
        this.emit('cycle_complete', {
          cycle: event.cycle,
          metrics: event.metrics,
        })
        break
    }
  }

  /**
   * Handle process completion
   */
  private handleProcessCompleted(processId: string, result: any): void {
    const mailId = this.processToMail.get(processId)
    if (!mailId) return

    const mail = this.pendingMail.get(mailId)
    if (!mail) return

    // Generate response
    const response = this.generateMailResponse(mail, result)

    this.emit('response_ready', {
      originalMail: mail,
      response,
      processId,
      cognitiveResult: result,
    })

    // Cleanup
    this.pendingMail.delete(mailId)
    this.processToMail.delete(processId)
  }

  /**
   * Generate a mail response from cognitive result
   */
  private generateMailResponse(mail: MailMessage, result: any): MailMessage {
    const responseBody = result.thoughtData?.integrated ||
      result.thoughtData?.response ||
      'Thank you for your message. I have processed it.'

    return {
      messageId: `response_${mail.messageId}_${Date.now()}`,
      from: this.config.botEmailAddress || 'echo@localhost',
      to: [mail.from],
      subject: `Re: ${mail.subject}`,
      body: responseBody,
      receivedAt: new Date(),
    }
  }

  /**
   * Get kernel metrics
   */
  public getMetrics(): KernelMetrics {
    return this.kernel.getMetrics()
  }

  /**
   * Get kernel state
   */
  public getState(): any {
    return this.kernel.getState()
  }

  /**
   * Get all active processes
   */
  public getActiveProcesses(): MessageProcess[] {
    return this.kernel.getActiveProcesses()
  }

  /**
   * Check if system is running
   */
  public isRunning(): boolean {
    return this.running
  }

  /**
   * Get the underlying kernel
   */
  public getKernel(): Dove9Kernel {
    return this.kernel
  }

  /**
   * Get the cognitive processor
   */
  public getProcessor(): DeepTreeEchoProcessor {
    return this.processor
  }
}

/**
 * Create a Dove9 system with default configuration
 */
export function createDove9System(
  llmService: LLMServiceInterface,
  memoryStore: MemoryStoreInterface,
  personaCore: PersonaCoreInterface,
  config: Partial<Dove9Config> = {}
): Dove9System {
  return new Dove9System({
    ...DEFAULT_DOVE9_CONFIG,
    ...config,
    llmService,
    memoryStore,
    personaCore,
  })
}
