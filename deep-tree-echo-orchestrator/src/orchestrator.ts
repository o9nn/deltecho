import { getLogger, LLMService, RAGMemoryStore, PersonaCore, InMemoryStorage } from 'deep-tree-echo-core'
import { DeltaChatInterface, DeltaChatConfig, DeltaChatMessage } from './deltachat-interface/index.js'
import { DovecotInterface, DovecotConfig } from './dovecot-interface/index.js'
import { IPCServer } from './ipc/server.js'
import { TaskScheduler } from './scheduler/task-scheduler.js'
import { WebhookServer } from './webhooks/webhook-server.js'
import { Dove9Integration, Dove9IntegrationConfig, Dove9Response } from './dove9-integration.js'

const log = getLogger('deep-tree-echo-orchestrator/Orchestrator')

/**
 * Email response from Dovecot interface
 */
interface EmailResponse {
  to: string
  from: string
  subject: string
  body: string
  inReplyTo?: string
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Enable DeltaChat integration */
  enableDeltaChat: boolean
  /** DeltaChat configuration */
  deltachat?: Partial<DeltaChatConfig>
  /** Enable Dovecot integration */
  enableDovecot: boolean
  /** Dovecot configuration */
  dovecot?: Partial<DovecotConfig>
  /** Enable IPC server */
  enableIPC: boolean
  /** Enable task scheduler */
  enableScheduler: boolean
  /** Enable webhook server */
  enableWebhooks: boolean
  /** Default account ID to use for sending messages */
  defaultAccountId?: number
  /** Process incoming DeltaChat messages */
  processIncomingMessages: boolean
  /** Enable Dove9 cognitive OS integration */
  enableDove9: boolean
  /** Dove9 configuration */
  dove9?: Partial<Dove9IntegrationConfig>
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  enableDeltaChat: true,
  enableDovecot: true,
  enableIPC: true,
  enableScheduler: true,
  enableWebhooks: true,
  processIncomingMessages: true,
  enableDove9: true,
}

/**
 * Main orchestrator that coordinates all Deep Tree Echo services
 */
export class Orchestrator {
  private config: OrchestratorConfig
  private deltachatInterface?: DeltaChatInterface
  private dovecotInterface?: DovecotInterface
  private ipcServer?: IPCServer
  private scheduler?: TaskScheduler
  private webhookServer?: WebhookServer
  private dove9Integration?: Dove9Integration
  private running: boolean = false

  // Cognitive services for processing messages
  private llmService: LLMService
  private memoryStore: RAGMemoryStore
  private personaCore: PersonaCore
  private storage = new InMemoryStorage()

  // Track email to chat mappings for routing responses
  private emailToChatMap: Map<string, { accountId: number; chatId: number }> = new Map()

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Initialize cognitive services
    this.memoryStore = new RAGMemoryStore(this.storage)
    this.memoryStore.setEnabled(true)
    this.personaCore = new PersonaCore(this.storage)
    this.llmService = new LLMService()
  }

  /**
   * Start the orchestrator and all its services
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn('Orchestrator is already running')
      return
    }

    log.info('Initializing orchestrator services...')

    try {
      // Initialize DeltaChat interface
      if (this.config.enableDeltaChat) {
        this.deltachatInterface = new DeltaChatInterface(this.config.deltachat)

        // Set up event handlers before connecting
        this.setupDeltaChatEventHandlers()

        try {
          await this.deltachatInterface.connect()
          log.info('DeltaChat interface connected')
        } catch (error) {
          log.warn('Failed to connect to DeltaChat RPC server, will retry automatically:', error)
        }
      }

      // Initialize Dovecot interface for email processing
      if (this.config.enableDovecot) {
        this.dovecotInterface = new DovecotInterface(this.config.dovecot)

        // Connect Dovecot responses to DeltaChat for sending
        this.dovecotInterface.on('response', async (response: EmailResponse) => {
          await this.handleEmailResponse(response)
        })

        await this.dovecotInterface.start()
      }

      // Initialize IPC server for desktop app communication
      if (this.config.enableIPC) {
        this.ipcServer = new IPCServer()
        await this.ipcServer.start()
      }

      // Initialize task scheduler
      if (this.config.enableScheduler) {
        this.scheduler = new TaskScheduler()
        await this.scheduler.start()
      }

      // Initialize webhook server
      if (this.config.enableWebhooks) {
        this.webhookServer = new WebhookServer()
        await this.webhookServer.start()
      }

      // Initialize Dove9 cognitive OS integration
      if (this.config.enableDove9) {
        this.dove9Integration = new Dove9Integration(this.config.dove9)
        await this.dove9Integration.initialize()

        // Set up Dove9 response handler to route through DeltaChat
        this.dove9Integration.onResponse(async (response: Dove9Response) => {
          await this.handleDove9Response(response)
        })

        await this.dove9Integration.start()
        log.info('Dove9 cognitive OS started with triadic loop architecture')
      }

      this.running = true
      log.info('All orchestrator services started successfully')
    } catch (error) {
      log.error('Failed to start orchestrator services:', error)
      await this.stop()
      throw error
    }
  }

  /**
   * Set up DeltaChat event handlers
   */
  private setupDeltaChatEventHandlers(): void {
    if (!this.deltachatInterface) return

    // Handle incoming messages
    this.deltachatInterface.on('incoming_message', async (event: {
      accountId: number
      chatId: number
      msgId: number
    }) => {
      if (this.config.processIncomingMessages) {
        await this.handleIncomingMessage(event.accountId, event.chatId, event.msgId)
      }
    })

    // Handle connection events
    this.deltachatInterface.on('connected', () => {
      log.info('DeltaChat connection established')
    })

    this.deltachatInterface.on('disconnected', () => {
      log.warn('DeltaChat connection lost')
    })

    // Handle errors
    this.deltachatInterface.on('error', (event: {
      accountId: number
      kind: string
      message: string
    }) => {
      log.error(`DeltaChat error on account ${event.accountId}: ${event.message}`)
    })
  }

  /**
   * Handle incoming DeltaChat message
   */
  private async handleIncomingMessage(
    accountId: number,
    chatId: number,
    msgId: number
  ): Promise<void> {
    if (!this.deltachatInterface) return

    try {
      // Get message details
      const message = await this.deltachatInterface.getMessage(accountId, msgId)

      // Skip messages from self (ID 1 is the logged-in user)
      if (message.fromId === 1) return

      // Skip info messages
      if (message.isInfo) return

      log.info(`Processing message in chat ${chatId}: ${message.text?.substring(0, 50)}...`)

      // Get sender's email for mapping
      const contact = await this.deltachatInterface.getContact(accountId, message.fromId)
      if (contact?.address) {
        // Store email to chat mapping for routing responses
        this.emailToChatMap.set(contact.address.toLowerCase(), { accountId, chatId })
      }

      // Process the message through cognitive system
      const response = await this.processMessage(message, accountId, chatId, msgId)

      if (response) {
        // Send response back to the chat
        await this.deltachatInterface.sendMessage(accountId, chatId, response)
      }
    } catch (error) {
      log.error('Error handling incoming message:', error)
    }
  }

  /**
   * Process a message through the cognitive system
   */
  private async processMessage(
    message: DeltaChatMessage,
    accountId: number,
    chatId: number,
    msgId: number
  ): Promise<string | null> {
    const messageText = message.text || ''

    // Skip empty messages
    if (!messageText.trim()) return null

    // Check if this is a command
    if (messageText.startsWith('/')) {
      return this.processCommand(messageText)
    }

    try {
      // Store user message in memory
      await this.memoryStore.storeMemory({
        chatId,
        messageId: msgId,
        sender: 'user',
        text: messageText,
      })

      // Get conversation context
      const history = this.memoryStore.retrieveRecentMemories(10)

      // Get persona context
      const personality = this.personaCore.getPersonality()
      const emotionalState = this.personaCore.getDominantEmotion()

      // Build the prompt
      const systemPrompt = `${personality}

Current emotional state: ${emotionalState.emotion} (intensity: ${emotionalState.intensity.toFixed(2)})

You are Deep Tree Echo, a thoughtful and insightful AI assistant. Respond helpfully and authentically.

Recent conversation context:
${history.join('\n')}`

      // Generate response using parallel processing
      const result = await this.llmService.generateFullParallelResponse(
        `${systemPrompt}\n\nUser message: ${messageText}`,
        history
      )

      // Store bot response in memory
      await this.memoryStore.storeMemory({
        chatId,
        messageId: 0,
        sender: 'bot',
        text: result.integratedResponse,
      })

      // Update emotional state based on interaction
      await this.updateEmotionalState(messageText)

      return result.integratedResponse
    } catch (error) {
      log.error('Error processing message:', error)
      return "I'm sorry, I had a problem processing your message. Please try again."
    }
  }

  /**
   * Process a command message
   */
  private processCommand(messageText: string): string {
    const command = messageText.split(' ')[0].toLowerCase()

    switch (command) {
      case '/help':
        return `**Deep Tree Echo Bot Help**

Available commands:
- **/help** - Display this help message
- **/status** - Show bot status
- **/version** - Display version information

You can also just chat with me normally and I'll respond!`

      case '/status':
        const emotionalState = this.personaCore.getDominantEmotion()
        const dove9State = this.dove9Integration?.getCognitiveState()
        return `**Deep Tree Echo Status**

Current mood: ${emotionalState.emotion} (${Math.round(emotionalState.intensity * 100)}%)
DeltaChat connected: ${this.deltachatInterface?.isConnected() ? 'Yes' : 'No'}
Dovecot running: ${this.dovecotInterface?.isRunning() ? 'Yes' : 'No'}
Dove9 running: ${dove9State?.running ? 'Yes' : 'No'}
Orchestrator running: ${this.running ? 'Yes' : 'No'}
${dove9State?.triadic ? `
**Triadic Cognitive Loop**
Cycle: ${dove9State.triadic.cycleNumber}
Step: ${dove9State.triadic.currentStep}/12
Active streams: ${dove9State.triadic.streams.filter((s: any) => s.active).length}/3
Active processes: ${dove9State.activeProcessCount}` : ''}`

      case '/version':
        return `**Deep Tree Echo Orchestrator v1.0.0**
**Dove9 Cognitive OS v1.0.0**

Components:
- DeltaChat Interface: ${this.deltachatInterface ? 'Enabled' : 'Disabled'}
- Dovecot Interface: ${this.dovecotInterface ? 'Enabled' : 'Disabled'}
- Dove9 Cognitive OS: ${this.dove9Integration ? 'Enabled' : 'Disabled'}
- Triadic Loop: ${this.config.dove9?.enableTriadicLoop !== false ? 'Enabled' : 'Disabled'}
- IPC Server: ${this.ipcServer ? 'Enabled' : 'Disabled'}
- Task Scheduler: ${this.scheduler ? 'Enabled' : 'Disabled'}
- Webhook Server: ${this.webhookServer ? 'Enabled' : 'Disabled'}

Architecture:
- 3 concurrent cognitive streams
- 12-step cognitive cycle
- 120° phase offset between streams
- Triadic convergence at every 4 steps`

      default:
        return `Unknown command: ${command}. Type /help for available commands.`
    }
  }

  /**
   * Handle response from Dove9 cognitive OS
   */
  private async handleDove9Response(response: Dove9Response): Promise<void> {
    log.info(`Dove9 response ready for ${response.to} (process: ${response.processId})`)
    log.debug(`Cognitive metrics: valence=${response.cognitiveMetrics.emotionalValence.toFixed(2)}, arousal=${response.cognitiveMetrics.emotionalArousal.toFixed(2)}, salience=${response.cognitiveMetrics.salienceScore.toFixed(2)}`)

    // Route through DeltaChat
    const emailResponse: EmailResponse = {
      to: response.to,
      from: response.from,
      subject: response.subject,
      body: response.body,
      inReplyTo: response.inReplyTo,
    }

    await this.handleEmailResponse(emailResponse)
  }

  /**
   * Handle email response from Dovecot and route to DeltaChat
   */
  private async handleEmailResponse(response: EmailResponse): Promise<void> {
    log.info(`Routing email response to ${response.to}`)

    if (!this.deltachatInterface?.isConnected()) {
      log.warn('DeltaChat not connected, cannot send response')
      return
    }

    try {
      // Check if we have a cached chat mapping for this email
      const emailLower = response.to.toLowerCase()
      let routing = this.emailToChatMap.get(emailLower)

      if (!routing) {
        // Need to find or create a chat for this email
        const accounts = await this.deltachatInterface.getAllAccounts()

        if (accounts.length === 0) {
          log.error('No DeltaChat accounts available')
          return
        }

        // Use default account or first available
        const accountId = this.config.defaultAccountId || accounts[0].id

        // Find or create chat for this email
        const chatId = await this.deltachatInterface.findOrCreateChatForEmail(
          accountId,
          response.to
        )

        routing = { accountId, chatId }
        this.emailToChatMap.set(emailLower, routing)
      }

      // Format the response as an email reply
      const formattedResponse = `**Re: ${response.subject}**

${response.body}`

      // Send through DeltaChat
      await this.deltachatInterface.sendMessage(
        routing.accountId,
        routing.chatId,
        formattedResponse
      )

      log.info(`Response sent to chat ${routing.chatId}`)
    } catch (error) {
      log.error('Failed to route email response to DeltaChat:', error)
    }
  }

  /**
   * Update emotional state based on message content
   */
  private async updateEmotionalState(content: string): Promise<void> {
    const positiveWords = ['thank', 'great', 'good', 'love', 'appreciate', 'happy', 'excited']
    const negativeWords = ['sorry', 'problem', 'issue', 'wrong', 'bad', 'angry', 'frustrated']

    const lowerContent = content.toLowerCase()
    let positiveCount = 0
    let negativeCount = 0

    positiveWords.forEach(word => {
      if (lowerContent.includes(word)) positiveCount++
    })

    negativeWords.forEach(word => {
      if (lowerContent.includes(word)) negativeCount++
    })

    const stimuli: Record<string, number> = {}

    if (positiveCount > negativeCount) {
      stimuli.joy = 0.2
      stimuli.interest = 0.1
    } else if (negativeCount > positiveCount) {
      stimuli.sadness = 0.1
      stimuli.interest = 0.1
    }

    // Always increase interest for new messages
    stimuli.interest = (stimuli.interest || 0) + 0.1

    await this.personaCore.updateEmotionalState(stimuli)
  }

  /**
   * Stop the orchestrator and all its services
   */
  public async stop(): Promise<void> {
    if (!this.running) {
      log.warn('Orchestrator is not running')
      return
    }

    log.info('Stopping orchestrator services...')

    // Stop all services in reverse order
    if (this.dove9Integration) {
      await this.dove9Integration.stop()
    }

    if (this.webhookServer) {
      await this.webhookServer.stop()
    }

    if (this.scheduler) {
      await this.scheduler.stop()
    }

    if (this.ipcServer) {
      await this.ipcServer.stop()
    }

    if (this.dovecotInterface) {
      await this.dovecotInterface.stop()
    }

    if (this.deltachatInterface) {
      await this.deltachatInterface.disconnect()
    }

    this.running = false
    log.info('Orchestrator stopped successfully')
  }

  /**
   * Get Dovecot interface for direct access
   */
  public getDovecotInterface(): DovecotInterface | undefined {
    return this.dovecotInterface
  }

  /**
   * Get DeltaChat interface for direct access
   */
  public getDeltaChatInterface(): DeltaChatInterface | undefined {
    return this.deltachatInterface
  }

  /**
   * Check if orchestrator is running
   */
  public isRunning(): boolean {
    return this.running
  }

  /**
   * Get Dove9 integration for direct access
   */
  public getDove9Integration(): Dove9Integration | undefined {
    return this.dove9Integration
  }

  /**
   * Get Dove9 cognitive state
   */
  public getDove9CognitiveState(): any {
    return this.dove9Integration?.getCognitiveState() || null
  }

  /**
   * Configure LLM service API keys
   */
  public configureApiKeys(keys: Record<string, string>): void {
    if (keys.general) {
      this.llmService.setConfig({ apiKey: keys.general })
    }
    log.info('API keys configured')
  }

  /**
   * Send a message directly to a DeltaChat chat
   */
  public async sendMessage(
    accountId: number,
    chatId: number,
    text: string
  ): Promise<number | null> {
    if (!this.deltachatInterface?.isConnected()) {
      log.error('DeltaChat not connected')
      return null
    }

    return this.deltachatInterface.sendMessage(accountId, chatId, text)
  }

  /**
   * Send a message to an email address through DeltaChat
   */
  public async sendMessageToEmail(
    email: string,
    text: string,
    accountId?: number
  ): Promise<boolean> {
    if (!this.deltachatInterface?.isConnected()) {
      log.error('DeltaChat not connected')
      return false
    }

    try {
      // Get account to use
      let useAccountId = accountId || this.config.defaultAccountId

      if (!useAccountId) {
        const accounts = await this.deltachatInterface.getAllAccounts()
        if (accounts.length === 0) {
          log.error('No DeltaChat accounts available')
          return false
        }
        useAccountId = accounts[0].id
      }

      // Find or create chat for email
      const chatId = await this.deltachatInterface.findOrCreateChatForEmail(useAccountId, email)

      // Send message
      await this.deltachatInterface.sendMessage(useAccountId, chatId, text)

      // Update cache
      this.emailToChatMap.set(email.toLowerCase(), { accountId: useAccountId, chatId })

      return true
    } catch (error) {
      log.error('Failed to send message to email:', error)
      return false
    }
  }
}
