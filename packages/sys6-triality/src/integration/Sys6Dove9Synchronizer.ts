/**
 * Sys6Dove9Synchronizer - Synchronizes Sys6 and Dove9 Cognitive Cycles
 *
 * Implements the grand cycle synchronization between:
 * - 30-step Sys6 cycle (LCM(2,3,5) = 30)
 * - 12-step Dove9 cycle (3 streams × 4 triads)
 *
 * Grand Cycle = LCM(30, 12) = 60 steps
 * - 5 complete Dove9 cycles per grand cycle
 * - 2 complete Sys6 cycles per grand cycle
 *
 * This synchronizer enables the operadic composition of mail processes
 * through both cognitive architectures simultaneously.
 */

import { EventEmitter } from 'events';
import type { Sys6CycleEngine, CycleStepResult } from '../engine/Sys6CycleEngine.js';

/**
 * Dove9 kernel interface (minimal type for integration)
 */
export interface Dove9KernelInterface {
  isRunning(): boolean;
  getMetrics(): Dove9Metrics;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
}

/**
 * Dove9 metrics interface
 */
export interface Dove9Metrics {
  totalSteps: number;
  totalCycles: number;
  processesCompleted: number;
  averageLatency: number;
  streamCoherence: number;
  cognitiveLoad: number;
  activeCouplings: string[];
}

/**
 * Synchronizer configuration
 */
export interface Sys6Dove9SynchronizerConfig {
  /** Enable grand cycle synchronization */
  enableGrandCycle: boolean;
  /** Step duration in milliseconds */
  stepDuration: number;
  /** Enable operadic scheduling on mail processes */
  enableOperadicScheduling: boolean;
  /** Grand cycle synchronization tolerance (steps) */
  syncTolerance: number;
  /** Enable telemetry logging */
  enableTelemetry: boolean;
}

/**
 * Synchronization point information
 */
export interface SyncPoint {
  grandCycleStep: number;
  sys6Step: number;
  sys6Cycle: number;
  dove9Step: number;
  dove9Cycle: number;
  timestamp: Date;
  type: 'sys6_cycle' | 'dove9_cycle' | 'grand_cycle' | 'triad_sync';
}

/**
 * Grand cycle state
 */
export interface GrandCycleState {
  currentStep: number;
  currentGrandCycle: number;
  sys6Step: number;
  sys6Cycle: number;
  dove9Step: number;
  dove9Cycle: number;
  syncPoints: SyncPoint[];
  lastSync: Date;
  driftMs: number;
}

/**
 * Operadic scheduling result
 */
export interface OperadicScheduleResult {
  processId: string;
  scheduledStep: number;
  phase: number;
  stage: number;
  stream: number;
  priority: number;
}

/**
 * Synchronizer events
 */
export type SynchronizerEvent =
  | { type: 'step_complete'; step: number; grandCycleStep: number }
  | { type: 'sys6_cycle_complete'; cycle: number; metrics: any }
  | { type: 'dove9_cycle_complete'; cycle: number; metrics: Dove9Metrics }
  | { type: 'grand_cycle_complete'; grandCycle: number; syncPoints: SyncPoint[] }
  | { type: 'sync_point'; point: SyncPoint }
  | { type: 'drift_warning'; driftMs: number }
  | { type: 'error'; error: string };

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Sys6Dove9SynchronizerConfig = {
  enableGrandCycle: true,
  stepDuration: 100,
  enableOperadicScheduling: true,
  syncTolerance: 2,
  enableTelemetry: true,
};

/**
 * Constants for cycle lengths
 */
export const SYS6_CYCLE_LENGTH = 30;
export const DOVE9_CYCLE_LENGTH = 12;
export const GRAND_CYCLE_LENGTH = 60; // LCM(30, 12) = 60

/**
 * Sys6Dove9Synchronizer - Grand cycle synchronization engine
 */
export class Sys6Dove9Synchronizer extends EventEmitter {
  private sys6Engine: Sys6CycleEngine;
  private dove9Kernel: Dove9KernelInterface;
  private config: Sys6Dove9SynchronizerConfig;
  private state: GrandCycleState;
  private running: boolean = false;
  private cycleInterval: ReturnType<typeof setInterval> | null = null;
  private processSchedule: Map<string, OperadicScheduleResult>;
  private startTimestamp: number = 0;
  private driftHistory: number[] = [];

  constructor(
    sys6Engine: Sys6CycleEngine,
    dove9Kernel: Dove9KernelInterface,
    config: Partial<Sys6Dove9SynchronizerConfig> = {}
  ) {
    super();
    this.sys6Engine = sys6Engine;
    this.dove9Kernel = dove9Kernel;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.initializeState();
    this.processSchedule = new Map();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize grand cycle state
   */
  private initializeState(): GrandCycleState {
    return {
      currentStep: 0,
      currentGrandCycle: 0,
      sys6Step: 0,
      sys6Cycle: 0,
      dove9Step: 0,
      dove9Cycle: 0,
      syncPoints: [],
      lastSync: new Date(),
      driftMs: 0,
    };
  }

  /**
   * Set up event listeners for both engines
   */
  private setupEventListeners(): void {
    // Listen to Dove9 events
    this.dove9Kernel.on('step_advance', this.onDove9Step.bind(this));
    this.dove9Kernel.on('cycle_complete', this.onDove9Cycle.bind(this));
    this.dove9Kernel.on('triad_convergence', this.onTriadSync.bind(this));
  }

  /**
   * Start the synchronizer
   */
  public async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.state = this.initializeState();
    this.startTimestamp = Date.now();
    this.driftHistory = [];

    // Start the grand cycle timer
    this.cycleInterval = setInterval(() => {
      this.advanceGrandCycle();
    }, this.config.stepDuration);
  }

  /**
   * Stop the synchronizer
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
  }

  /**
   * Advance the grand cycle by one step
   */
  private advanceGrandCycle(): void {
    this.state.currentStep++;

    // Calculate current positions in each cycle
    this.state.sys6Step = this.state.currentStep % SYS6_CYCLE_LENGTH;
    this.state.dove9Step = this.state.currentStep % DOVE9_CYCLE_LENGTH;

    // Check for cycle completions
    if (this.state.sys6Step === 0 && this.state.currentStep > 0) {
      this.state.sys6Cycle++;
      this.emitEvent({
        type: 'sys6_cycle_complete',
        cycle: this.state.sys6Cycle,
        metrics: this.getSys6Metrics(),
      });
    }

    if (this.state.dove9Step === 0 && this.state.currentStep > 0) {
      this.state.dove9Cycle++;
      this.emitEvent({
        type: 'dove9_cycle_complete',
        cycle: this.state.dove9Cycle,
        metrics: this.dove9Kernel.getMetrics(),
      });
    }

    // Check for grand cycle completion
    if (this.state.currentStep % GRAND_CYCLE_LENGTH === 0 && this.state.currentStep > 0) {
      this.state.currentGrandCycle++;

      const syncPoint: SyncPoint = {
        grandCycleStep: this.state.currentStep,
        sys6Step: 0,
        sys6Cycle: this.state.sys6Cycle,
        dove9Step: 0,
        dove9Cycle: this.state.dove9Cycle,
        timestamp: new Date(),
        type: 'grand_cycle',
      };

      this.state.syncPoints.push(syncPoint);
      this.emitEvent({
        type: 'grand_cycle_complete',
        grandCycle: this.state.currentGrandCycle,
        syncPoints: this.state.syncPoints.slice(-10), // Last 10 sync points
      });

      // Reset sync points for next grand cycle (keep history limited)
      if (this.state.syncPoints.length > 100) {
        this.state.syncPoints = this.state.syncPoints.slice(-50);
      }
    }

    // Calculate drift from ideal timing
    const expectedTime = this.state.currentStep * this.config.stepDuration;
    const actualElapsedTime = Date.now() - this.startTimestamp;
    this.state.driftMs = actualElapsedTime - expectedTime;

    // Track drift history for statistics
    this.driftHistory.push(this.state.driftMs);
    if (this.driftHistory.length > 100) {
      this.driftHistory.shift();
    }

    if (Math.abs(this.state.driftMs) > this.config.stepDuration * this.config.syncTolerance) {
      this.emitEvent({ type: 'drift_warning', driftMs: this.state.driftMs });
    }

    this.emitEvent({
      type: 'step_complete',
      step: this.state.currentStep % GRAND_CYCLE_LENGTH,
      grandCycleStep: this.state.currentStep,
    });
  }

  /**
   * Handle Dove9 step event
   */
  private onDove9Step(event: { step: number; cycle: number }): void {
    // Verify synchronization
    const expectedDove9Step = this.state.currentStep % DOVE9_CYCLE_LENGTH;
    if (Math.abs(event.step - expectedDove9Step) > this.config.syncTolerance) {
      // Dove9 has drifted - log warning
      this.emitEvent({
        type: 'error',
        error: `Dove9 drift detected: expected step ${expectedDove9Step}, got ${event.step}`,
      });
    }
  }

  /**
   * Handle Dove9 cycle completion
   */
  private onDove9Cycle(_event: { cycle: number; metrics: Dove9Metrics }): void {
    // Record sync point at Dove9 cycle boundaries
    const syncPoint: SyncPoint = {
      grandCycleStep: this.state.currentStep,
      sys6Step: this.state.sys6Step,
      sys6Cycle: this.state.sys6Cycle,
      dove9Step: 0,
      dove9Cycle: this.state.dove9Cycle,
      timestamp: new Date(),
      type: 'dove9_cycle',
    };

    this.state.syncPoints.push(syncPoint);
    this.emitEvent({ type: 'sync_point', point: syncPoint });
  }

  /**
   * Handle triadic convergence point
   */
  private onTriadSync(event: { timePoint: number }): void {
    const syncPoint: SyncPoint = {
      grandCycleStep: this.state.currentStep,
      sys6Step: this.state.sys6Step,
      sys6Cycle: this.state.sys6Cycle,
      dove9Step: this.state.dove9Step,
      dove9Cycle: this.state.dove9Cycle,
      timestamp: new Date(),
      type: 'triad_sync',
    };

    this.state.syncPoints.push(syncPoint);
    this.emitEvent({ type: 'sync_point', point: syncPoint });
  }

  /**
   * Schedule a process using operadic composition
   */
  public scheduleProcess(processId: string, priority: number = 5): OperadicScheduleResult {
    if (!this.config.enableOperadicScheduling) {
      return {
        processId,
        scheduledStep: this.state.currentStep + 1,
        phase: 1,
        stage: 1,
        stream: 1,
        priority,
      };
    }

    // Calculate optimal scheduling based on grand cycle position
    const result = this.calculateOperadicSchedule(processId, priority);
    this.processSchedule.set(processId, result);

    return result;
  }

  /**
   * Calculate operadic scheduling for a process
   */
  private calculateOperadicSchedule(processId: string, priority: number): OperadicScheduleResult {
    // Determine the best step to schedule based on:
    // 1. Current cycle position
    // 2. Process priority
    // 3. Sys6 phase/stage alignment
    // 4. Dove9 stream availability

    const currentPosition = this.state.currentStep % GRAND_CYCLE_LENGTH;

    // Map priority to Sys6 phase (higher priority → earlier phase)
    const phase = priority >= 7 ? 1 : priority >= 4 ? 2 : 3;

    // Calculate stage within phase
    const stage = Math.ceil(((priority - 1) % 3) + 1);

    // Determine stream based on hash of processId
    const stream = (this.hashString(processId) % 3) + 1;

    // Calculate target step
    const targetStep = this.calculateTargetStep(currentPosition, phase, stage, stream);

    return {
      processId,
      scheduledStep: this.state.currentStep + targetStep,
      phase,
      stage,
      stream,
      priority,
    };
  }

  /**
   * Calculate target step offset based on phase/stage/stream
   */
  private calculateTargetStep(
    currentPosition: number,
    phase: number,
    stage: number,
    stream: number
  ): number {
    // Each phase is 10 Sys6 steps (30 / 3)
    // Each stage is 2 Sys6 steps
    // Stream alignment with Dove9 triads (4 per cycle)

    const phaseOffset = (phase - 1) * 10;
    const stageOffset = (stage - 1) * 2;
    const streamOffset = stream - 1;

    // Calculate next occurrence of this phase/stage/stream
    const targetSys6Step = phaseOffset + stageOffset + streamOffset;
    const currentSys6Step = currentPosition % SYS6_CYCLE_LENGTH;

    let stepsToTarget = targetSys6Step - currentSys6Step;
    if (stepsToTarget <= 0) {
      stepsToTarget += SYS6_CYCLE_LENGTH;
    }

    return Math.max(1, stepsToTarget);
  }

  /**
   * Hash a string to a number (simple djb2 hash)
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  /**
   * Get Sys6 metrics (placeholder - actual metrics from engine)
   */
  private getSys6Metrics(): any {
    return {
      cycle: this.state.sys6Cycle,
      step: this.state.sys6Step,
      phase: Math.floor(this.state.sys6Step / 10) + 1,
      stage: Math.floor((this.state.sys6Step % 10) / 2) + 1,
    };
  }

  /**
   * Emit synchronizer event
   */
  private emitEvent(event: SynchronizerEvent): void {
    this.emit('synchronizer_event', event);
    this.emit(event.type, event);
  }

  /**
   * Get current grand cycle state
   */
  public getState(): GrandCycleState {
    return { ...this.state };
  }

  /**
   * Get process schedule
   */
  public getProcessSchedule(processId: string): OperadicScheduleResult | undefined {
    return this.processSchedule.get(processId);
  }

  /**
   * Get all scheduled processes
   */
  public getAllScheduledProcesses(): OperadicScheduleResult[] {
    return Array.from(this.processSchedule.values());
  }

  /**
   * Clear completed processes from schedule
   */
  public clearCompletedProcess(processId: string): boolean {
    return this.processSchedule.delete(processId);
  }

  /**
   * Check if synchronizer is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get synchronization statistics
   */
  public getSyncStats(): {
    grandCycles: number;
    sys6Cycles: number;
    dove9Cycles: number;
    totalSteps: number;
    averageDriftMs: number;
    syncPointCount: number;
  } {
    const avgDrift = this.driftHistory.length > 0 
      ? this.driftHistory.reduce((a, b) => a + Math.abs(b), 0) / this.driftHistory.length 
      : 0;

    return {
      grandCycles: this.state.currentGrandCycle,
      sys6Cycles: this.state.sys6Cycle,
      dove9Cycles: this.state.dove9Cycle,
      totalSteps: this.state.currentStep,
      averageDriftMs: avgDrift,
      syncPointCount: this.state.syncPoints.length,
    };
  }

  /**
   * Get grand cycle progress (0 to 1)
   */
  public getGrandCycleProgress(): number {
    return (this.state.currentStep % GRAND_CYCLE_LENGTH) / GRAND_CYCLE_LENGTH;
  }

  /**
   * Get Sys6 cycle progress (0 to 1)
   */
  public getSys6CycleProgress(): number {
    return (this.state.currentStep % SYS6_CYCLE_LENGTH) / SYS6_CYCLE_LENGTH;
  }

  /**
   * Get Dove9 cycle progress (0 to 1)
   */
  public getDove9CycleProgress(): number {
    return (this.state.currentStep % DOVE9_CYCLE_LENGTH) / DOVE9_CYCLE_LENGTH;
  }

  /**
   * Check if currently at a synchronization point
   */
  public isAtSyncPoint(): boolean {
    const step = this.state.currentStep;
    // Sync points occur when both cycles align
    return step % SYS6_CYCLE_LENGTH === 0 || step % DOVE9_CYCLE_LENGTH === 0;
  }

  /**
   * Get next synchronization point (steps until)
   */
  public getNextSyncPoint(): { stepsUntil: number; type: 'sys6' | 'dove9' | 'grand' } {
    const currentStep = this.state.currentStep;

    const stepsToSys6 = SYS6_CYCLE_LENGTH - (currentStep % SYS6_CYCLE_LENGTH);
    const stepsToDove9 = DOVE9_CYCLE_LENGTH - (currentStep % DOVE9_CYCLE_LENGTH);
    const stepsToGrand = GRAND_CYCLE_LENGTH - (currentStep % GRAND_CYCLE_LENGTH);

    if (stepsToGrand <= Math.min(stepsToSys6, stepsToDove9)) {
      return { stepsUntil: stepsToGrand, type: 'grand' };
    }
    if (stepsToSys6 <= stepsToDove9) {
      return { stepsUntil: stepsToSys6, type: 'sys6' };
    }
    return { stepsUntil: stepsToDove9, type: 'dove9' };
  }
}

export default Sys6Dove9Synchronizer;
