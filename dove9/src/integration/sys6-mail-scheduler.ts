/**
 * Sys6 Mail Scheduler
 *
 * Applies Sys6 operadic scheduling to mail-based cognitive processes.
 * Integrates the 30-step Sys6 cycle with the 12-step Dove9 cycle
 * through a 60-step grand cycle (LCM of 30 and 12).
 *
 * This enables optimal scheduling of mail processes based on:
 * - Process priority
 * - Current cycle position
 * - Phase/stage/stream alignment
 * - Operadic composition rules
 */

import { EventEmitter } from 'events';
import type { MessageProcess, ProcessState, CognitiveContext } from '../types/index.js';
import { MailFlag, type MailMessage } from '../types/mail.js';

/**
 * Cycle constants
 */
export const SYS6_CYCLE_LENGTH = 30;
export const DOVE9_CYCLE_LENGTH = 12;
export const GRAND_CYCLE_LENGTH = 60; // LCM(30, 12) = 60

/**
 * Alignment tolerance constants for scheduling
 */
const SYS6_ALIGNMENT_TOLERANCE = 2;
const DOVE9_STEPS_PER_STREAM = 4;

/**
 * Phase mapping for Sys6 stages
 */
export const SYS6_PHASES = {
  1: 'perception-orientation',
  2: 'evaluation-generation',
  3: 'action-integration',
} as const;

/**
 * Dove9 triadic streams
 */
export const DOVE9_STREAMS = {
  1: 'primary',
  2: 'secondary',
  3: 'tertiary',
} as const;

/**
 * Schedule result for a mail process
 */
export interface MailScheduleResult {
  processId: string;
  messageId: string;
  scheduledStep: number;
  scheduledGrandCycleStep: number;
  sys6Phase: 1 | 2 | 3;
  sys6Stage: 1 | 2 | 3 | 4 | 5;
  sys6Step: 1 | 2;
  dove9Stream: 1 | 2 | 3;
  dove9Triad: 0 | 1 | 2 | 3;
  priority: number;
  estimatedCompletionStep: number;
}

/**
 * Scheduler configuration
 */
export interface Sys6MailSchedulerConfig {
  /** Enable operadic scheduling (vs simple FIFO) */
  enableOperadicScheduling: boolean;
  /** Maximum processes per grand cycle */
  maxProcessesPerGrandCycle: number;
  /** Priority boost for urgent messages */
  urgentPriorityBoost: number;
  /** Priority boost for flagged messages */
  flaggedPriorityBoost: number;
  /** Priority boost for reply messages */
  replyPriorityBoost: number;
  /** Base processing steps for a typical message */
  baseProcessingSteps: number;
}

/**
 * Default scheduler configuration
 */
const DEFAULT_CONFIG: Sys6MailSchedulerConfig = {
  enableOperadicScheduling: true,
  maxProcessesPerGrandCycle: 30,
  urgentPriorityBoost: 3,
  flaggedPriorityBoost: 2,
  replyPriorityBoost: 1,
  baseProcessingSteps: 6,
};

/**
 * Scheduler state
 */
export interface SchedulerState {
  currentStep: number;
  currentGrandCycle: number;
  sys6Step: number;
  sys6Cycle: number;
  dove9Step: number;
  dove9Cycle: number;
  scheduledProcesses: Map<string, MailScheduleResult>;
  completedProcesses: Set<string>;
  processQueue: string[];
}

/**
 * Scheduler events
 */
export type SchedulerEvent =
  | { type: 'process_scheduled'; result: MailScheduleResult }
  | { type: 'process_ready'; processId: string; step: number }
  | { type: 'process_completed'; processId: string; duration: number }
  | { type: 'grand_cycle_boundary'; grandCycle: number }
  | { type: 'sys6_cycle_boundary'; cycle: number }
  | { type: 'dove9_cycle_boundary'; cycle: number }
  | { type: 'capacity_warning'; activeCount: number; maxCount: number };

/**
 * Sys6MailScheduler
 *
 * Schedules mail processes using operadic composition through
 * the combined Sys6-Dove9 grand cycle.
 */
export class Sys6MailScheduler extends EventEmitter {
  private config: Sys6MailSchedulerConfig;
  private state: SchedulerState;
  private stepTimer: ReturnType<typeof setInterval> | null = null;
  private stepDuration: number;
  private running: boolean = false;

  constructor(stepDuration: number = 100, config: Partial<Sys6MailSchedulerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stepDuration = stepDuration;
    this.state = this.initializeState();
  }

  /**
   * Initialize scheduler state
   */
  private initializeState(): SchedulerState {
    return {
      currentStep: 0,
      currentGrandCycle: 0,
      sys6Step: 0,
      sys6Cycle: 0,
      dove9Step: 0,
      dove9Cycle: 0,
      scheduledProcesses: new Map(),
      completedProcesses: new Set(),
      processQueue: [],
    };
  }

  /**
   * Start the scheduler
   */
  public start(): void {
    if (this.running) return;

    this.running = true;
    this.state = this.initializeState();

    // Start the step timer
    this.stepTimer = setInterval(() => {
      this.advanceStep();
    }, this.stepDuration);
  }

  /**
   * Stop the scheduler
   */
  public stop(): void {
    if (!this.running) return;

    this.running = false;

    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
  }

  /**
   * Advance the scheduler by one step
   */
  private advanceStep(): void {
    this.state.currentStep++;

    // Calculate positions in each cycle
    const grandStep = this.state.currentStep % GRAND_CYCLE_LENGTH;
    this.state.sys6Step = this.state.currentStep % SYS6_CYCLE_LENGTH;
    this.state.dove9Step = this.state.currentStep % DOVE9_CYCLE_LENGTH;

    // Check for cycle boundaries
    if (this.state.sys6Step === 0 && this.state.currentStep > 0) {
      this.state.sys6Cycle++;
      this.emitEvent({ type: 'sys6_cycle_boundary', cycle: this.state.sys6Cycle });
    }

    if (this.state.dove9Step === 0 && this.state.currentStep > 0) {
      this.state.dove9Cycle++;
      this.emitEvent({ type: 'dove9_cycle_boundary', cycle: this.state.dove9Cycle });
    }

    if (grandStep === 0 && this.state.currentStep > 0) {
      this.state.currentGrandCycle++;
      this.emitEvent({ type: 'grand_cycle_boundary', grandCycle: this.state.currentGrandCycle });
    }

    // Check for processes ready to execute at this step
    this.checkReadyProcesses();
  }

  /**
   * Check for processes scheduled to execute at current step
   */
  private checkReadyProcesses(): void {
    for (const [processId, schedule] of this.state.scheduledProcesses) {
      if (schedule.scheduledGrandCycleStep <= this.state.currentStep) {
        // Process is ready
        this.emitEvent({ type: 'process_ready', processId, step: this.state.currentStep });
      }
    }
  }

  /**
   * Schedule a mail message for processing
   */
  public scheduleMailMessage(mail: MailMessage, process: MessageProcess): MailScheduleResult {
    // Check capacity
    const activeCount = this.state.scheduledProcesses.size;
    if (activeCount >= this.config.maxProcessesPerGrandCycle) {
      this.emitEvent({
        type: 'capacity_warning',
        activeCount,
        maxCount: this.config.maxProcessesPerGrandCycle,
      });
    }

    // Calculate effective priority with boosts
    let priority = process.priority;

    // Check for urgent markers
    const urgentMarkers = ['urgent', 'important', 'asap', 'priority', 'critical'];
    const subjectLower = mail.subject.toLowerCase();
    if (urgentMarkers.some((marker) => subjectLower.includes(marker))) {
      priority += this.config.urgentPriorityBoost;
    }

    // Check for flagged
    if (mail.flags?.includes(MailFlag.FLAGGED)) {
      priority += this.config.flaggedPriorityBoost;
    }

    // Check for reply
    if (mail.inReplyTo || subjectLower.startsWith('re:')) {
      priority += this.config.replyPriorityBoost;
    }

    // Clamp priority
    priority = Math.max(1, Math.min(10, priority));

    // Schedule using operadic composition
    const result = this.calculateOperadicSchedule(process.id, mail.messageId, priority);

    // Store schedule
    this.state.scheduledProcesses.set(process.id, result);
    this.state.processQueue.push(process.id);

    this.emitEvent({ type: 'process_scheduled', result });

    return result;
  }

  /**
   * Calculate operadic schedule for a process
   */
  private calculateOperadicSchedule(
    processId: string,
    messageId: string,
    priority: number
  ): MailScheduleResult {
    if (!this.config.enableOperadicScheduling) {
      // Simple FIFO scheduling
      return this.createSimpleSchedule(processId, messageId, priority);
    }

    // Operadic scheduling based on priority and cycle position

    // Map priority to Sys6 phase (higher priority → earlier phase)
    // Phase 1 (perception): priorities 8-10
    // Phase 2 (evaluation): priorities 4-7
    // Phase 3 (action): priorities 1-3
    const sys6Phase = priority >= 8 ? 1 : priority >= 4 ? 2 : 3;

    // Map to stage within phase (priority fine-tuning)
    const phaseBaseStep = (sys6Phase - 1) * 10;
    const priorityWithinPhase = ((priority - 1) % 3) + 1;
    const sys6Stage = Math.min(5, Math.ceil(priorityWithinPhase * (5 / 3))) as 1 | 2 | 3 | 4 | 5;

    // Alternating step (A/B pattern)
    const sys6Step = ((this.hashString(processId) % 2) + 1) as 1 | 2;

    // Map to Dove9 stream based on content hash (distribute load)
    const dove9Stream = ((this.hashString(messageId) % 3) + 1) as 1 | 2 | 3;

    // Calculate triad (0-3) within Dove9 cycle
    const dove9Triad = (Math.floor(this.state.dove9Step / 3) % 4) as 0 | 1 | 2 | 3;

    // Calculate scheduled step
    const scheduledStep = this.calculateScheduledStep(sys6Phase, sys6Stage, sys6Step, dove9Stream);

    // Calculate estimated completion
    const estimatedCompletionStep =
      scheduledStep + this.config.baseProcessingSteps + (10 - priority);

    return {
      processId,
      messageId,
      scheduledStep,
      scheduledGrandCycleStep: this.state.currentStep + scheduledStep,
      sys6Phase: sys6Phase as 1 | 2 | 3,
      sys6Stage,
      sys6Step,
      dove9Stream,
      dove9Triad,
      priority,
      estimatedCompletionStep,
    };
  }

  /**
   * Create a simple FIFO schedule
   */
  private createSimpleSchedule(
    processId: string,
    messageId: string,
    priority: number
  ): MailScheduleResult {
    const scheduledStep = this.state.processQueue.length + 1;

    return {
      processId,
      messageId,
      scheduledStep,
      scheduledGrandCycleStep: this.state.currentStep + scheduledStep,
      sys6Phase: 1,
      sys6Stage: 1,
      sys6Step: 1,
      dove9Stream: 1,
      dove9Triad: 0,
      priority,
      estimatedCompletionStep: scheduledStep + this.config.baseProcessingSteps,
    };
  }

  /**
   * Calculate the scheduled step based on phase/stage/step/stream
   */
  private calculateScheduledStep(
    phase: number,
    stage: number,
    step: number,
    stream: number
  ): number {
    const currentGrandStep = this.state.currentStep % GRAND_CYCLE_LENGTH;

    // Calculate target position in Sys6 cycle (30 steps)
    // Phase 1: steps 1-10, Phase 2: steps 11-20, Phase 3: steps 21-30
    const phaseOffset = (phase - 1) * 10;
    // Each stage is 2 steps within the 10-step phase
    const stageOffset = (stage - 1) * 2;
    const targetSys6Step = phaseOffset + stageOffset + step;

    // Calculate target position in Dove9 cycle (12 steps)
    // Each stream gets 4 steps (triadic distribution)
    const targetDove9Step = (stream - 1) * 4;

    // Find the next grand cycle step where both conditions are met
    // We need: grandStep % 30 >= targetSys6Step AND grandStep % 12 aligns with stream

    let stepsToTarget = 0;
    for (let offset = 1; offset <= GRAND_CYCLE_LENGTH; offset++) {
      const testGrandStep = (currentGrandStep + offset) % GRAND_CYCLE_LENGTH;
      const testSys6 = testGrandStep % SYS6_CYCLE_LENGTH;
      const testDove9 = testGrandStep % DOVE9_CYCLE_LENGTH;

      // Check Sys6 alignment (within tolerance steps of target)
      const sys6Aligned = Math.abs(testSys6 - targetSys6Step) <= SYS6_ALIGNMENT_TOLERANCE || testSys6 >= targetSys6Step - SYS6_ALIGNMENT_TOLERANCE;

      // Check Dove9 stream alignment (within same triadic period)
      const dove9Aligned = Math.floor(testDove9 / DOVE9_STEPS_PER_STREAM) === stream - 1 || testDove9 >= targetDove9Step;

      if (sys6Aligned && dove9Aligned) {
        stepsToTarget = offset;
        break;
      }
    }

    // Ensure we schedule at least 1 step ahead
    return Math.max(1, stepsToTarget);
  }

  /**
   * Mark a process as completed
   */
  public completeProcess(processId: string): void {
    const schedule = this.state.scheduledProcesses.get(processId);
    if (!schedule) return;

    const duration = this.state.currentStep - schedule.scheduledGrandCycleStep;

    this.state.scheduledProcesses.delete(processId);
    this.state.completedProcesses.add(processId);

    // Remove from queue
    const queueIndex = this.state.processQueue.indexOf(processId);
    if (queueIndex !== -1) {
      this.state.processQueue.splice(queueIndex, 1);
    }

    this.emitEvent({ type: 'process_completed', processId, duration });
  }

  /**
   * Get schedule for a process
   */
  public getSchedule(processId: string): MailScheduleResult | undefined {
    return this.state.scheduledProcesses.get(processId);
  }

  /**
   * Get all scheduled processes
   */
  public getAllSchedules(): MailScheduleResult[] {
    return Array.from(this.state.scheduledProcesses.values());
  }

  /**
   * Get pending process count
   */
  public getPendingCount(): number {
    return this.state.scheduledProcesses.size;
  }

  /**
   * Get scheduler state
   */
  public getState(): Readonly<SchedulerState> {
    return { ...this.state };
  }

  /**
   * Check if scheduler is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current cycle positions
   */
  public getCyclePositions(): {
    grandCycle: number;
    grandStep: number;
    sys6Cycle: number;
    sys6Step: number;
    dove9Cycle: number;
    dove9Step: number;
    sys6Progress: number;
    dove9Progress: number;
    grandProgress: number;
  } {
    return {
      grandCycle: this.state.currentGrandCycle,
      grandStep: this.state.currentStep % GRAND_CYCLE_LENGTH,
      sys6Cycle: this.state.sys6Cycle,
      sys6Step: this.state.sys6Step,
      dove9Cycle: this.state.dove9Cycle,
      dove9Step: this.state.dove9Step,
      sys6Progress: this.state.sys6Step / SYS6_CYCLE_LENGTH,
      dove9Progress: this.state.dove9Step / DOVE9_CYCLE_LENGTH,
      grandProgress: (this.state.currentStep % GRAND_CYCLE_LENGTH) / GRAND_CYCLE_LENGTH,
    };
  }

  /**
   * Get next optimal scheduling slot for a given priority
   */
  public getNextSlot(priority: number): {
    step: number;
    phase: 1 | 2 | 3;
    stage: 1 | 2 | 3 | 4 | 5;
    stream: 1 | 2 | 3;
  } {
    const phase = priority >= 8 ? 1 : priority >= 4 ? 2 : 3;
    const stage = (Math.ceil(((priority - 1) % 3 + 1) * (5 / 3))) as 1 | 2 | 3 | 4 | 5;
    const stream = ((this.state.currentStep % 3) + 1) as 1 | 2 | 3;
    const step = this.calculateScheduledStep(phase, stage, 1, stream);

    return { step, phase: phase as 1 | 2 | 3, stage: Math.min(5, stage) as 1 | 2 | 3 | 4 | 5, stream };
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  /**
   * Emit scheduler event
   */
  private emitEvent(event: SchedulerEvent): void {
    this.emit('scheduler_event', event);
    this.emit(event.type, event);
  }
}

export default Sys6MailScheduler;
