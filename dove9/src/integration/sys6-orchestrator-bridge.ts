/**
 * Sys6 Orchestrator Bridge
 *
 * Extends the OrchestratorBridge with Sys6 operadic scheduling capabilities.
 * Integrates the 60-step grand cycle synchronization between:
 * - 30-step Sys6 cognitive cycle
 * - 12-step Dove9 triadic cycle
 *
 * This enables intelligent scheduling of mail processes based on:
 * - Operadic composition rules
 * - Priority-aware phase alignment
 * - Stream load balancing
 * - Grand cycle synchronization
 */

import { EventEmitter } from 'events';
import { Dove9System, MailMessage, MessageProcess, KernelMetrics } from '../index.js';
import {
  LLMServiceInterface,
  MemoryStoreInterface,
  PersonaCoreInterface,
} from '../cognitive/deep-tree-echo-processor.js';
import { Dove9Config, DEFAULT_DOVE9_CONFIG } from '../types/index.js';
import {
  Sys6MailScheduler,
  Sys6MailSchedulerConfig,
  MailScheduleResult,
  SchedulerEvent,
  GRAND_CYCLE_LENGTH,
  SYS6_CYCLE_LENGTH,
  DOVE9_CYCLE_LENGTH,
} from './sys6-mail-scheduler.js';
import { OrchestratorBridge, OrchestratorBridgeConfig, DovecotEmail, EmailResponse } from './orchestrator-bridge.js';

/**
 * Sys6 integration statistics
 */
export interface Sys6IntegrationStats {
  grandCycles: number;
  sys6Cycles: number;
  dove9Cycles: number;
  totalScheduled: number;
  totalCompleted: number;
  averageProcessingSteps: number;
  phaseDistribution: {
    phase1: number;
    phase2: number;
    phase3: number;
  };
  streamDistribution: {
    stream1: number;
    stream2: number;
    stream3: number;
  };
}

/**
 * Sys6 orchestrator bridge configuration
 */
export interface Sys6OrchestratorBridgeConfig extends OrchestratorBridgeConfig {
  /** Enable Sys6 operadic scheduling */
  enableSys6Scheduling: boolean;
  /** Sys6 scheduler configuration */
  schedulerConfig?: Partial<Sys6MailSchedulerConfig>;
  /** Enable telemetry for cycle synchronization */
  enableCycleTelemetry: boolean;
  /** Grand cycle step duration (ms) */
  grandCycleStepDuration: number;
}

/**
 * Default Sys6 bridge configuration
 */
const DEFAULT_SYS6_BRIDGE_CONFIG: Sys6OrchestratorBridgeConfig = {
  ...DEFAULT_DOVE9_CONFIG,
  botEmailAddress: 'echo@localhost',
  enableAutoResponse: true,
  responseDelay: 0,
  enableSys6Scheduling: true,
  enableCycleTelemetry: true,
  grandCycleStepDuration: 100,
};

/**
 * Sys6 orchestrator bridge events
 */
export type Sys6BridgeEvent =
  | { type: 'process_scheduled'; result: MailScheduleResult }
  | { type: 'grand_cycle_complete'; grandCycle: number; stats: Sys6IntegrationStats }
  | { type: 'phase_transition'; fromPhase: number; toPhase: number }
  | { type: 'optimal_slot_used'; processId: string; slot: any }
  | { type: 'scheduling_deferred'; processId: string; reason: string };

/**
 * Sys6OrchestratorBridge
 *
 * Enhanced orchestrator bridge with Sys6 operadic scheduling.
 * Provides optimal scheduling of mail processes through the
 * combined 60-step grand cycle.
 */
export class Sys6OrchestratorBridge extends EventEmitter {
  private bridge: OrchestratorBridge;
  private scheduler: Sys6MailScheduler;
  private config: Sys6OrchestratorBridgeConfig;
  private running: boolean = false;

  // Statistics tracking
  private stats: Sys6IntegrationStats;
  private processCompletionTimes: Map<string, number> = new Map();

  constructor(config: Partial<Sys6OrchestratorBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SYS6_BRIDGE_CONFIG, ...config };

    // Create underlying orchestrator bridge
    this.bridge = new OrchestratorBridge(this.config);

    // Create Sys6 mail scheduler
    this.scheduler = new Sys6MailScheduler(
      this.config.grandCycleStepDuration,
      this.config.schedulerConfig
    );

    // Initialize statistics
    this.stats = this.initializeStats();

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): Sys6IntegrationStats {
    return {
      grandCycles: 0,
      sys6Cycles: 0,
      dove9Cycles: 0,
      totalScheduled: 0,
      totalCompleted: 0,
      averageProcessingSteps: 0,
      phaseDistribution: { phase1: 0, phase2: 0, phase3: 0 },
      streamDistribution: { stream1: 0, stream2: 0, stream3: 0 },
    };
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Forward bridge events
    this.bridge.on('response', (response: EmailResponse) => {
      this.emit('response', response);
    });

    this.bridge.on('kernel_event', (event: any) => {
      this.emit('kernel_event', event);
    });

    this.bridge.on('triad_sync', (triad: any) => {
      this.emit('triad_sync', triad);
    });

    this.bridge.on('cycle_complete', (data: { cycle: number; metrics: KernelMetrics }) => {
      this.emit('cycle_complete', data);
    });

    this.bridge.on('send_response', (response: EmailResponse) => {
      this.emit('send_response', response);
    });

    // Handle scheduler events
    this.scheduler.on('scheduler_event', (event: SchedulerEvent) => {
      this.handleSchedulerEvent(event);
    });

    this.scheduler.on('process_completed', (event: { processId: string; duration: number }) => {
      this.stats.totalCompleted++;
      this.updateAverageProcessingTime(event.duration);
    });

    this.scheduler.on('grand_cycle_boundary', (event: { grandCycle: number }) => {
      this.stats.grandCycles = event.grandCycle;
      this.emitSys6Event({
        type: 'grand_cycle_complete',
        grandCycle: event.grandCycle,
        stats: this.getStats(),
      });
    });

    this.scheduler.on('sys6_cycle_boundary', (event: { cycle: number }) => {
      this.stats.sys6Cycles = event.cycle;
    });

    this.scheduler.on('dove9_cycle_boundary', (event: { cycle: number }) => {
      this.stats.dove9Cycles = event.cycle;
    });
  }

  /**
   * Handle scheduler events
   */
  private handleSchedulerEvent(event: SchedulerEvent): void {
    if (event.type === 'process_scheduled') {
      this.stats.totalScheduled++;

      // Update phase distribution
      const phase = event.result.sys6Phase;
      if (phase === 1) this.stats.phaseDistribution.phase1++;
      else if (phase === 2) this.stats.phaseDistribution.phase2++;
      else this.stats.phaseDistribution.phase3++;

      // Update stream distribution
      const stream = event.result.dove9Stream;
      if (stream === 1) this.stats.streamDistribution.stream1++;
      else if (stream === 2) this.stats.streamDistribution.stream2++;
      else this.stats.streamDistribution.stream3++;

      this.emitSys6Event({ type: 'process_scheduled', result: event.result });
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(duration: number): void {
    if (this.stats.totalCompleted === 0) return;
    const total =
      this.stats.averageProcessingSteps * (this.stats.totalCompleted - 1) + duration;
    this.stats.averageProcessingSteps = total / this.stats.totalCompleted;
  }

  /**
   * Initialize with cognitive services
   */
  public initialize(
    llmService: LLMServiceInterface,
    memoryStore: MemoryStoreInterface,
    personaCore: PersonaCoreInterface
  ): void {
    this.bridge.initialize(llmService, memoryStore, personaCore);
  }

  /**
   * Start the Sys6 bridge
   */
  public async start(): Promise<void> {
    if (this.running) return;

    // Start scheduler first
    if (this.config.enableSys6Scheduling) {
      this.scheduler.start();
    }

    // Start bridge
    await this.bridge.start();
    this.running = true;

    this.emit('started');
  }

  /**
   * Stop the Sys6 bridge
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    // Stop scheduler
    this.scheduler.stop();

    // Stop bridge
    await this.bridge.stop();
    this.running = false;

    this.emit('stopped');
  }

  /**
   * Process email with Sys6 scheduling
   */
  public async processEmail(email: DovecotEmail): Promise<MessageProcess | null> {
    // Process through standard bridge first
    const process = await this.bridge.processEmail(email);

    if (!process) return null;

    // Apply Sys6 scheduling if enabled
    if (this.config.enableSys6Scheduling) {
      // Convert DovecotEmail to MailMessage format for scheduler
      const mailMessage: MailMessage = {
        messageId: email.messageId || `msg_${Date.now()}`,
        from: email.from,
        to: email.to,
        subject: email.subject,
        body: email.body,
        headers: email.headers,
        timestamp: email.receivedAt || new Date(),
        receivedAt: email.receivedAt || new Date(),
        mailbox: 'INBOX',
      };

      // Schedule with Sys6
      const schedule = this.scheduler.scheduleMailMessage(mailMessage, process);

      // Emit scheduling info
      this.emitSys6Event({
        type: 'optimal_slot_used',
        processId: process.id,
        slot: {
          phase: schedule.sys6Phase,
          stage: schedule.sys6Stage,
          stream: schedule.dove9Stream,
          step: schedule.scheduledStep,
        },
      });
    }

    return process;
  }

  /**
   * Get next optimal scheduling slot for a priority level
   */
  public getNextOptimalSlot(priority: number): {
    step: number;
    phase: 1 | 2 | 3;
    stage: 1 | 2 | 3 | 4 | 5;
    stream: 1 | 2 | 3;
    cyclePositions: ReturnType<Sys6MailScheduler['getCyclePositions']>;
  } {
    const slot = this.scheduler.getNextSlot(priority);
    const positions = this.scheduler.getCyclePositions();

    return {
      ...slot,
      cyclePositions: positions,
    };
  }

  /**
   * Get schedule for a specific process
   */
  public getProcessSchedule(processId: string): MailScheduleResult | undefined {
    return this.scheduler.getSchedule(processId);
  }

  /**
   * Get all scheduled processes
   */
  public getAllScheduledProcesses(): MailScheduleResult[] {
    return this.scheduler.getAllSchedules();
  }

  /**
   * Mark a process as completed
   */
  public completeProcess(processId: string): void {
    this.scheduler.completeProcess(processId);
  }

  /**
   * Get Sys6 integration statistics
   */
  public getStats(): Sys6IntegrationStats {
    return { ...this.stats };
  }

  /**
   * Get current cycle positions
   */
  public getCyclePositions(): ReturnType<Sys6MailScheduler['getCyclePositions']> {
    return this.scheduler.getCyclePositions();
  }

  /**
   * Get pending process count
   */
  public getPendingCount(): number {
    return this.scheduler.getPendingCount();
  }

  /**
   * Get kernel metrics
   */
  public getMetrics(): KernelMetrics | null {
    return this.bridge.getMetrics();
  }

  /**
   * Get active processes
   */
  public getActiveProcesses(): MessageProcess[] {
    return this.bridge.getActiveProcesses();
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if Sys6 scheduling is enabled
   */
  public isSys6Enabled(): boolean {
    return this.config.enableSys6Scheduling;
  }

  /**
   * Get the underlying orchestrator bridge
   */
  public getBridge(): OrchestratorBridge {
    return this.bridge;
  }

  /**
   * Get the Sys6 mail scheduler
   */
  public getScheduler(): Sys6MailScheduler {
    return this.scheduler;
  }

  /**
   * Get the Dove9 system
   */
  public getDove9System(): Dove9System | null {
    return this.bridge.getDove9System();
  }

  /**
   * Emit Sys6 bridge event
   */
  private emitSys6Event(event: Sys6BridgeEvent): void {
    this.emit('sys6_event', event);
    this.emit(event.type, event);
  }
}

/**
 * Create a Sys6 orchestrator bridge
 */
export function createSys6OrchestratorBridge(
  config: Partial<Sys6OrchestratorBridgeConfig> = {}
): Sys6OrchestratorBridge {
  return new Sys6OrchestratorBridge(config);
}

// Re-export cycle constants for convenience
export { GRAND_CYCLE_LENGTH, SYS6_CYCLE_LENGTH, DOVE9_CYCLE_LENGTH };

export default Sys6OrchestratorBridge;
