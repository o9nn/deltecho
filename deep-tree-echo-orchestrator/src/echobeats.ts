/**
 * Echobeats — 3-Stream Concurrent Cognitive Loop
 *
 * Implements the Echobeats architecture: 3 concurrent cognitive loops
 * phased 4 steps apart over a 12-step cycle, enabling simultaneous
 * perception, action, and simulation.
 *
 * Architecture (System 4 → System 5 evolution):
 *
 *   System 4 (9 terms = OEIS A000081 for N=4):
 *     3 concurrent streams × 4 phases = 12 steps
 *     Stream 0 (Perception):  steps {1, 4, 7, 10}
 *     Stream 1 (Action):      steps {2, 5, 8, 11}
 *     Stream 2 (Simulation):  steps {3, 6, 9, 12}
 *
 *   Thread Multiplexing (6 dyadic permutations of 4 particular sets):
 *     P(1,2) → P(1,3) → P(1,4) → P(2,3) → P(2,4) → P(3,4)
 *
 *   Two complementary triads cycle:
 *     MP1: P[1,2,3] → P[1,2,4] → P[1,3,4] → P[2,3,4]
 *     MP2: P[1,3,4] → P[2,3,4] → P[1,2,3] → P[1,2,4]
 *
 *   Nested Shell Execution Contexts (OEIS A000081):
 *     N=1 → 1 term:  (global)
 *     N=2 → 2 terms: (process) (organization)
 *     N=3 → 4 terms: ((pro) org) glo
 *     N=4 → 9 terms: System 4 full structure
 *
 * The 1/7 = 0.142857... particular sequence governs energy flow:
 *   1 → 4 → 2 → 8 → 5 → 7 → 1 (the enneagram inner flow)
 *
 * This module provides the standalone Echobeats engine that can be
 * used independently or wired into the AutonomyPipeline.
 */
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/Echobeats');

// ─── Types ─────────────────────────────────────────────────────

export type StreamPhase = 'perceive' | 'reflect' | 'plan' | 'act';

export interface EchobeatsConfig {
  /** Cycle interval in ms (one step per interval) */
  cycleInterval: number;
  /** Enable thread multiplexing (System 5 tetradic) */
  enableMultiplexing: boolean;
  /** Enable nested shell execution contexts */
  enableNestedShells: boolean;
  /** Number of concurrent streams (default: 3) */
  streamCount: number;
  /** Steps per cycle (default: 12) */
  stepsPerCycle: number;
}

const DEFAULT_CONFIG: EchobeatsConfig = {
  cycleInterval: 2000,
  enableMultiplexing: true,
  enableNestedShells: true,
  streamCount: 3,
  stepsPerCycle: 12,
};

/**
 * A cognitive stream — one of the concurrent processing loops
 */
export interface CognitiveStream {
  id: number;
  name: string;
  currentPhase: StreamPhase;
  tickCount: number;
  lastTickTime: number;
  /** Current particular set assignment (for multiplexing) */
  particularSet: number[];
  /** Accumulated energy from the 1/7 flow */
  energy: number;
  /** Stream-local state */
  state: Record<string, unknown>;
}

/**
 * A nested shell execution context
 */
export interface NestedShell {
  level: number;
  name: string;
  /** Number of terms at this level (OEIS A000081) */
  termCount: number;
  /** Parent shell (null for global) */
  parent: string | null;
  /** Active streams in this shell */
  activeStreams: number[];
}

/**
 * Thread multiplexing permutation
 */
export interface ThreadPermutation {
  /** Dyadic pair indices */
  pair: [number, number];
  /** Step in the 6-permutation cycle */
  step: number;
  /** Which triad (MP1 or MP2) this belongs to */
  triad: 'MP1' | 'MP2';
}

/**
 * Echobeats tick event
 */
export interface EchobeatsTick {
  globalStep: number;
  cycleStep: number;
  cycleNumber: number;
  stream: CognitiveStream;
  phase: StreamPhase;
  permutation: ThreadPermutation | null;
  shell: NestedShell;
  energyFlow: number;
}

/**
 * Callback for processing a stream tick
 */
export type StreamTickHandler = (tick: EchobeatsTick) => Promise<void>;

// ─── Echobeats Engine ──────────────────────────────────────────

export class Echobeats extends EventEmitter {
  private config: EchobeatsConfig;
  private streams: CognitiveStream[] = [];
  private shells: NestedShell[] = [];
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private globalStep = 0;
  private cycleNumber = 0;
  private tickHandler: StreamTickHandler | null = null;

  // The 12-step phase map (3 streams × 4 phases)
  private readonly PHASE_MAP: StreamPhase[] = [
    'perceive', 'perceive', 'perceive',
    'reflect',  'reflect',  'reflect',
    'plan',     'plan',     'plan',
    'act',      'act',      'act',
  ];

  // The 6 dyadic permutations of 4 particular sets
  private readonly PERMUTATIONS: Array<[number, number]> = [
    [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
  ];

  // Two complementary triads
  private readonly MP1_TRIADS: number[][] = [[1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4]];
  private readonly MP2_TRIADS: number[][] = [[1, 3, 4], [2, 3, 4], [1, 2, 3], [1, 2, 4]];

  // The 1/7 = 0.142857 particular sequence (enneagram inner flow)
  private readonly ENERGY_FLOW = [1, 4, 2, 8, 5, 7];

  constructor(config?: Partial<EchobeatsConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeStreams();
    this.initializeShells();
  }

  // ─── Initialization ────────────────────────────────────────────

  private initializeStreams(): void {
    const streamNames = ['perception', 'action', 'simulation'];

    for (let i = 0; i < this.config.streamCount; i++) {
      this.streams.push({
        id: i,
        name: streamNames[i] || `stream-${i}`,
        currentPhase: 'perceive',
        tickCount: 0,
        lastTickTime: 0,
        particularSet: this.MP1_TRIADS[i] || [1, 2, 3],
        energy: 1.0,
        state: {},
      });
    }
  }

  private initializeShells(): void {
    if (!this.config.enableNestedShells) {
      // Single global shell
      this.shells = [{
        level: 0,
        name: 'global',
        termCount: 1,
        parent: null,
        activeStreams: this.streams.map(s => s.id),
      }];
      return;
    }

    // OEIS A000081 nested shells: N=1→1, N=2→2, N=3→4, N=4→9
    this.shells = [
      {
        level: 0,
        name: 'global',
        termCount: 1,
        parent: null,
        activeStreams: [0, 1, 2],
      },
      {
        level: 1,
        name: 'organization',
        termCount: 2,
        parent: 'global',
        activeStreams: [0, 1],
      },
      {
        level: 2,
        name: 'process',
        termCount: 4,
        parent: 'organization',
        activeStreams: [0],
      },
    ];
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  /**
   * Register the tick handler that processes each stream step
   */
  onTick(handler: StreamTickHandler): void {
    this.tickHandler = handler;
  }

  /**
   * Start the Echobeats concurrent loop
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    log.info('═══════════════════════════════════════════════');
    log.info('  Echobeats 3-Stream Concurrent Loop ACTIVE');
    log.info(`  Streams: ${this.config.streamCount}`);
    log.info(`  Steps/cycle: ${this.config.stepsPerCycle}`);
    log.info(`  Interval: ${this.config.cycleInterval}ms`);
    log.info(`  Multiplexing: ${this.config.enableMultiplexing ? 'ON' : 'OFF'}`);
    log.info(`  Nested shells: ${this.config.enableNestedShells ? 'ON' : 'OFF'}`);
    log.info('═══════════════════════════════════════════════');

    this.timer = setInterval(() => this.tick(), this.config.cycleInterval);
    this.emit('started');
  }

  /**
   * Stop the Echobeats loop
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    log.info(`Echobeats stopped after ${this.globalStep} steps (${this.cycleNumber} cycles)`);
    this.emit('stopped');
  }

  // ─── Core Tick ─────────────────────────────────────────────────

  /**
   * Execute one step of the 12-step cycle.
   * Each step activates one stream in its current phase.
   */
  private async tick(): Promise<void> {
    if (!this.running) return;

    this.globalStep++;
    const cycleStep = ((this.globalStep - 1) % this.config.stepsPerCycle) + 1;

    // New cycle detection
    if (cycleStep === 1) {
      this.cycleNumber++;
      this.emit('cycle_start', { cycleNumber: this.cycleNumber, globalStep: this.globalStep });
    }

    // Determine which stream is active for this step
    const streamIdx = (cycleStep - 1) % this.config.streamCount;
    const stream = this.streams[streamIdx];

    // Determine the phase for this step
    const phase = this.PHASE_MAP[cycleStep - 1];
    stream.currentPhase = phase;
    stream.tickCount++;
    stream.lastTickTime = Date.now();

    // Compute thread multiplexing permutation
    let permutation: ThreadPermutation | null = null;
    if (this.config.enableMultiplexing) {
      const permIdx = (this.globalStep - 1) % 6;
      const triadIdx = Math.floor((this.globalStep - 1) / 6) % 4;
      permutation = {
        pair: this.PERMUTATIONS[permIdx],
        step: permIdx,
        triad: (Math.floor((this.globalStep - 1) / 6) % 2 === 0) ? 'MP1' : 'MP2',
      };

      // Update stream's particular set based on current triad
      const triads = permutation.triad === 'MP1' ? this.MP1_TRIADS : this.MP2_TRIADS;
      stream.particularSet = triads[triadIdx] || [1, 2, 3];
    }

    // Compute energy flow from 1/7 sequence
    const energyIdx = (this.globalStep - 1) % 6;
    const energyFlow = this.ENERGY_FLOW[energyIdx] / 9; // Normalize to [0, 1]
    stream.energy = 0.5 + energyFlow * 0.5; // Scale to [0.5, 1.0]

    // Determine active shell for this stream
    const shell = this.getActiveShell(streamIdx);

    // Build tick event
    const tickEvent: EchobeatsTick = {
      globalStep: this.globalStep,
      cycleStep,
      cycleNumber: this.cycleNumber,
      stream: { ...stream },
      phase,
      permutation,
      shell,
      energyFlow,
    };

    // Emit events
    this.emit('tick', tickEvent);
    this.emit(`stream_${stream.name}`, tickEvent);
    this.emit(`phase_${phase}`, tickEvent);

    // Execute tick handler
    if (this.tickHandler) {
      try {
        await this.tickHandler(tickEvent);
      } catch (error) {
        log.error(`Echobeats tick handler error at step ${this.globalStep}:`, error);
        this.emit('error', { step: this.globalStep, stream: stream.name, error: String(error) });
      }
    }

    // End of cycle
    if (cycleStep === this.config.stepsPerCycle) {
      this.emit('cycle_end', {
        cycleNumber: this.cycleNumber,
        globalStep: this.globalStep,
        streamStats: this.streams.map(s => ({
          name: s.name,
          tickCount: s.tickCount,
          energy: s.energy,
          phase: s.currentPhase,
        })),
      });
    }
  }

  /**
   * Get the active nested shell for a stream
   */
  private getActiveShell(streamIdx: number): NestedShell {
    if (!this.config.enableNestedShells) {
      return this.shells[0];
    }

    // Find the deepest shell that contains this stream
    for (let i = this.shells.length - 1; i >= 0; i--) {
      if (this.shells[i].activeStreams.includes(streamIdx)) {
        return this.shells[i];
      }
    }

    return this.shells[0]; // Fallback to global
  }

  // ─── Accessors ─────────────────────────────────────────────────

  isRunning(): boolean {
    return this.running;
  }

  getStreams(): CognitiveStream[] {
    return this.streams.map(s => ({ ...s }));
  }

  getShells(): NestedShell[] {
    return this.shells.map(s => ({ ...s }));
  }

  getStats(): {
    running: boolean;
    globalStep: number;
    cycleNumber: number;
    cycleStep: number;
    streams: Array<{
      name: string;
      phase: StreamPhase;
      tickCount: number;
      energy: number;
      particularSet: number[];
    }>;
    shells: Array<{ name: string; level: number; termCount: number }>;
  } {
    return {
      running: this.running,
      globalStep: this.globalStep,
      cycleNumber: this.cycleNumber,
      cycleStep: ((this.globalStep - 1) % this.config.stepsPerCycle) + 1,
      streams: this.streams.map(s => ({
        name: s.name,
        phase: s.currentPhase,
        tickCount: s.tickCount,
        energy: s.energy,
        particularSet: s.particularSet,
      })),
      shells: this.shells.map(s => ({
        name: s.name,
        level: s.level,
        termCount: s.termCount,
      })),
    };
  }
}
