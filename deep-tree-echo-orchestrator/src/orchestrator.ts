import { getLogger } from 'deep-tree-echo-core'
import { DeltaChatInterface } from './deltachat-interface/index.js'
import { DovecotInterface, DovecotConfig } from './dovecot-interface/index.js'
import { IPCServer } from './ipc/server.js'
import { TaskScheduler } from './scheduler/task-scheduler.js'
import { WebhookServer } from './webhooks/webhook-server.js'

const log = getLogger('deep-tree-echo-orchestrator/Orchestrator')

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
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
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  enableDovecot: true,
  enableIPC: true,
  enableScheduler: true,
  enableWebhooks: true,
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
  private running: boolean = false

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
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
      this.deltachatInterface = new DeltaChatInterface()
      await this.deltachatInterface.connect()

      // Initialize Dovecot interface for email processing
      if (this.config.enableDovecot) {
        this.dovecotInterface = new DovecotInterface(this.config.dovecot)

        // Connect Dovecot responses to DeltaChat for sending
        this.dovecotInterface.on('response', async (response: any) => {
          log.info(`Sending response to ${response.to}`)
          // Route through DeltaChat or direct SMTP based on configuration
          if (this.deltachatInterface?.isConnected()) {
            // Use DeltaChat to send the response
            // This ensures the response is encrypted if possible
            await this.deltachatInterface.sendMessage(0, response.body)
          }
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

      this.running = true
      log.info('All orchestrator services started successfully')
    } catch (error) {
      log.error('Failed to start orchestrator services:', error)
      await this.stop()
      throw error
    }
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
}
