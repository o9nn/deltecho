import { getLogger } from 'deep-tree-echo-core'
import { DeltaChatInterface } from './deltachat-interface/index.js'
import { IPCServer } from './ipc/server.js'
import { TaskScheduler } from './scheduler/task-scheduler.js'
import { WebhookServer } from './webhooks/webhook-server.js'

const log = getLogger('deep-tree-echo-orchestrator/Orchestrator')

/**
 * Main orchestrator that coordinates all Deep Tree Echo services
 */
export class Orchestrator {
  private deltachatInterface?: DeltaChatInterface
  private ipcServer?: IPCServer
  private scheduler?: TaskScheduler
  private webhookServer?: WebhookServer
  private running: boolean = false

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

      // Initialize IPC server for desktop app communication
      this.ipcServer = new IPCServer()
      await this.ipcServer.start()

      // Initialize task scheduler
      this.scheduler = new TaskScheduler()
      await this.scheduler.start()

      // Initialize webhook server
      this.webhookServer = new WebhookServer()
      await this.webhookServer.start()

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

    if (this.deltachatInterface) {
      await this.deltachatInterface.disconnect()
    }

    this.running = false
    log.info('Orchestrator stopped successfully')
  }

  /**
   * Check if orchestrator is running
   */
  public isRunning(): boolean {
    return this.running
  }
}
