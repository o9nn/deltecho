/**
 * Dove9 Integration for Deep Tree Echo Orchestrator
 *
 * Integrates the Dove9 cognitive OS into the orchestrator,
 * replacing the simple email processing with the full triadic
 * cognitive loop architecture.
 *
 * This module:
 * - Creates a Dove9System instance
 * - Bridges Dovecot emails to Dove9 processes
 * - Routes Dove9 responses back through DeltaChat
 * - Provides metrics and monitoring
 */

import { getLogger, LLMService, RAGMemoryStore, PersonaCore, InMemoryStorage } from 'deep-tree-echo-core'
import {
  Dove9System,
  createDove9System,
  MailMessage,
  MessageProcess,
  KernelMetrics,
  CognitiveMode,
  StreamId,
} from 'dove9'
import { EmailMessage } from './dovecot-interface/milter-server.js'

const log = getLogger('deep-tree-echo-orchestrator/Dove9Integration')

/**
 * Adapter to make LLMService compatible with Dove9's interface
 */
class LLMServiceAdapter {
  private llmService: LLMService

  constructor(llmService: LLMService) {
    this.llmService = llmService
  }

  async generateResponse(prompt: string, context: string[]): Promise<string> {
    const result = await this.llmService.generateFullParallelResponse(
      `${prompt}\n\nContext:\n${context.join('\n')}`,
      context
    )
    return result.integratedResponse
  }

  async generateParallelResponse(prompt: string, history: string[]): Promise<{
    integratedResponse: string
    cognitiveResponse?: string
    affectiveResponse?: string
    relevanceResponse?: string
  }> {
    return this.llmService.generateFullParallelResponse(prompt, history)
  }
}

/**
 * Adapter to make RAGMemoryStore compatible with Dove9's interface
 */
class MemoryStoreAdapter {
  private memoryStore: RAGMemoryStore

  constructor(memoryStore: RAGMemoryStore) {
    this.memoryStore = memoryStore
  }

  async storeMemory(memory: { chatId: number; messageId: number; sender: string; text: string }): Promise<void> {
    await this.memoryStore.storeMemory(memory)
  }

  retrieveRecentMemories(count: number): string[] {
    return this.memoryStore.retrieveRecentMemories(count)
  }

  async retrieveRelevantMemories(query: string, count: number): Promise<string[]> {
    // Use the RAG retrieval if available, otherwise fall back to recent
    return this.memoryStore.retrieveRecentMemories(count)
  }
}

/**
 * Adapter to make PersonaCore compatible with Dove9's interface
 */
class PersonaCoreAdapter {
  private personaCore: PersonaCore

  constructor(personaCore: PersonaCore) {
    this.personaCore = personaCore
  }

  getPersonality(): string {
    return this.personaCore.getPersonality()
  }

  getDominantEmotion(): { emotion: string; intensity: number } {
    return this.personaCore.getDominantEmotion()
  }

  async updateEmotionalState(stimuli: Record<string, number>): Promise<void> {
    await this.personaCore.updateEmotionalState(stimuli)
  }
}

/**
 * Configuration for Dove9 integration
 */
export interface Dove9IntegrationConfig {
  enabled: boolean
  stepDuration: number
  maxConcurrentProcesses: number
  botEmailAddress: string
  enableTriadicLoop: boolean
}

const DEFAULT_CONFIG: Dove9IntegrationConfig = {
  enabled: true,
  stepDuration: 100,
  maxConcurrentProcesses: 50,
  botEmailAddress: 'echo@localhost',
  enableTriadicLoop: true,
}

/**
 * Response event data
 */
export interface Dove9Response {
  to: string
  from: string
  subject: string
  body: string
  inReplyTo?: string
  processId: string
  cognitiveMetrics: {
    emotionalValence: number
    emotionalArousal: number
    salienceScore: number
    activeCouplings: string[]
  }
}

/**
 * Dove9Integration
 *
 * Manages the Dove9 cognitive OS within the orchestrator.
 */
export class Dove9Integration {
  private config: Dove9IntegrationConfig
  private dove9: Dove9System | null = null
  private storage = new InMemoryStorage()
  private llmService: LLMService
  private memoryStore: RAGMemoryStore
  private personaCore: PersonaCore
  private running: boolean = false

  // Event handlers
  private responseHandlers: ((response: Dove9Response) => void)[] = []
  private metricsHandlers: ((metrics: KernelMetrics) => void)[] = []

  constructor(config: Partial<Dove9IntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Initialize cognitive services
    this.memoryStore = new RAGMemoryStore(this.storage)
    this.memoryStore.setEnabled(true)
    this.personaCore = new PersonaCore(this.storage)
    this.llmService = new LLMService()
  }

  /**
   * Initialize Dove9 system
   */
  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      log.info('Dove9 integration disabled')
      return
    }

    log.info('Initializing Dove9 cognitive OS...')

    // Create adapters
    const llmAdapter = new LLMServiceAdapter(this.llmService)
    const memoryAdapter = new MemoryStoreAdapter(this.memoryStore)
    const personaAdapter = new PersonaCoreAdapter(this.personaCore)

    // Create Dove9 system
    this.dove9 = createDove9System(
      llmAdapter,
      memoryAdapter,
      personaAdapter,
      {
        stepDuration: this.config.stepDuration,
        maxConcurrentProcesses: this.config.maxConcurrentProcesses,
        enableParallelCognition: this.config.enableTriadicLoop,
      }
    )

    // Set up event handlers
    this.setupEventHandlers()

    log.info('Dove9 cognitive OS initialized')
  }

  /**
   * Set up Dove9 event handlers
   */
  private setupEventHandlers(): void {
    if (!this.dove9) return

    // Handle response ready
    this.dove9.on('response_ready', (data: any) => {
      const response: Dove9Response = {
        to: data.originalMail.from,
        from: this.config.botEmailAddress,
        subject: data.response.subject,
        body: data.response.body,
        inReplyTo: data.originalMail.messageId,
        processId: data.processId,
        cognitiveMetrics: {
          emotionalValence: data.cognitiveResult?.emotionalValence || 0,
          emotionalArousal: data.cognitiveResult?.emotionalArousal || 0.5,
          salienceScore: data.cognitiveResult?.salienceScore || 0.5,
          activeCouplings: data.cognitiveResult?.activeCouplings || [],
        },
      }

      // Notify handlers
      for (const handler of this.responseHandlers) {
        handler(response)
      }
    })

    // Handle cycle completion
    this.dove9.on('cycle_complete', (data: { cycle: number; metrics: KernelMetrics }) => {
      log.debug(`Dove9 cycle ${data.cycle} complete`)

      // Notify metrics handlers
      for (const handler of this.metricsHandlers) {
        handler(data.metrics)
      }
    })

    // Handle triadic sync
    this.dove9.on('triad_sync', (triad: any) => {
      log.debug(`Triadic convergence at time point ${triad.timePoint}`)
    })
  }

  /**
   * Start Dove9 integration
   */
  public async start(): Promise<void> {
    if (!this.dove9) {
      await this.initialize()
    }

    if (!this.dove9 || this.running) return

    await this.dove9.start()
    this.running = true

    log.info('Dove9 cognitive OS started')
  }

  /**
   * Stop Dove9 integration
   */
  public async stop(): Promise<void> {
    if (!this.dove9 || !this.running) return

    await this.dove9.stop()
    this.running = false

    log.info('Dove9 cognitive OS stopped')
  }

  /**
   * Process an email through Dove9
   */
  public async processEmail(email: EmailMessage): Promise<MessageProcess | null> {
    if (!this.dove9) {
      log.warn('Dove9 not initialized, cannot process email')
      return null
    }

    // Check if email is for the bot
    const isForBot = email.to.some(
      addr => addr.toLowerCase() === this.config.botEmailAddress.toLowerCase()
    )

    if (!isForBot) {
      return null
    }

    log.info(`Processing email from ${email.from} through Dove9`)

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
   * Register response handler
   */
  public onResponse(handler: (response: Dove9Response) => void): void {
    this.responseHandlers.push(handler)
  }

  /**
   * Register metrics handler
   */
  public onMetrics(handler: (metrics: KernelMetrics) => void): void {
    this.metricsHandlers.push(handler)
  }

  /**
   * Configure LLM API keys
   */
  public configureApiKeys(keys: Record<string, string>): void {
    if (keys.general) {
      this.llmService.setConfig({ apiKey: keys.general })
    }
    log.info('API keys configured for Dove9')
  }

  /**
   * Get current metrics
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
   * Get the Dove9 system
   */
  public getDove9System(): Dove9System | null {
    return this.dove9
  }

  /**
   * Get cognitive state summary
   */
  public getCognitiveState(): {
    running: boolean
    metrics: KernelMetrics | null
    activeProcessCount: number
    triadic: {
      currentStep: number
      cycleNumber: number
      streams: { id: number; mode: string; active: boolean }[]
    } | null
  } {
    const metrics = this.getMetrics()
    const state = this.dove9?.getState()

    return {
      running: this.running,
      metrics,
      activeProcessCount: this.getActiveProcesses().length,
      triadic: state ? {
        currentStep: state.currentStep,
        cycleNumber: state.cycleNumber,
        streams: Array.from(state.streams.values()).map(s => ({
          id: s.id,
          mode: s.mode,
          active: s.isActive,
        })),
      } : null,
    }
  }
}
