/**
 * Echo Agent Loop
 *
 * The optimized autonomous cognitive event loop for Deep Tree Echo.
 * Implements the AAR (Agent-Arena-Relation) pattern as a continuous
 * feed-forward/feed-back cycle coupling:
 *
 * - Feed-forward (inference): Agent reads Arena state and acts
 * - Feed-back (learning): Results update Arena and refine Agent
 *
 * The loop integrates:
 * - Dove9 triadic 12-step cognitive cycle (3 streams × 4 steps)
 * - Sys6 30-step cognitive cycle (5 stages × 3 phases × 2 steps)
 * - ProactiveLoop 5-phase autonomous cycle (PERCEIVE→REFLECT→PLAN→ACT→INTEGRATE)
 * - Grand cycle synchronization (LCM(12, 30) = 60 steps)
 *
 * Thread multiplexing follows the 4-particular permutation pattern:
 * P(1,2)→P(1,3)→P(1,4)→P(2,3)→P(2,4)→P(3,4)
 *
 * Two complementary triads cycle:
 * MP1: P[1,2,3]→P[1,2,4]→P[1,3,4]→P[2,3,4]
 * MP2: P[1,3,4]→P[2,3,4]→P[1,2,3]→P[1,2,4]
 */
import { EventEmitter } from 'events';
import {
  getLogger,
  TreePolytopeKernel,
  createTreePolytopeKernel,
  type TreePolytopeKernelState,
} from 'deep-tree-echo-core';
import {
  ProactiveLoop,
  ProactivePhase,
  OntogeneticStage,
  type ProactiveLoopConfig,
  type EnvironmentStimulus,
} from './proactive-loop.js';
import {
  CosmicOrderBridge,
  type CosmicOrderBridgeConfig,
  type CosmicOrderSnapshot,
  type SystemLevelState,
} from './cosmic-order-bridge.js';

const log = getLogger('deep-tree-echo-orchestrator/EchoAgentLoop');

/**
 * Thread permutation for 4-particular multiplexing
 */
export interface ThreadPermutation {
  id: string;
  particulars: [number, number];
  phase: number;
}

/**
 * Triad configuration for complementary cycling
 */
export interface TriadConfig {
  id: 'MP1' | 'MP2';
  sequence: Array<[number, number, number]>;
  currentIndex: number;
}

/**
 * Grand cycle state tracking
 */
export interface GrandCycleState {
  step: number;
  dove9Step: number;
  sys6Step: number;
  proactivePhase: ProactivePhase;
  activeTriad: 'MP1' | 'MP2';
  threadPermutation: ThreadPermutation;
  timestamp: number;
  /** Cosmic order snapshot — all 6 system levels */
  cosmicOrder?: CosmicOrderSnapshot;
}

/**
 * Echo agent loop metrics
 */
export interface EchoAgentMetrics {
  grandCycles: number;
  totalSteps: number;
  averageStepTime: number;
  dove9Syncs: number;
  sys6Syncs: number;
  triadConvergences: number;
  threadSwitches: number;
  feedForwardCycles: number;
  feedBackCycles: number;
  autonomyScore: number;
}

/**
 * Echo agent loop configuration
 */
export interface EchoAgentLoopConfig {
  /** Grand cycle step duration (ms) */
  stepDurationMs: number;
  /** Enable thread multiplexing */
  enableThreadMultiplexing: boolean;
  /** Enable triad cycling */
  enableTriadCycling: boolean;
  /** Enable cosmic order sys1-6 composition */
  enableCosmicOrder: boolean;
  /** Enable telemetry */
  enableTelemetry: boolean;
  /** Proactive loop configuration */
  proactiveConfig?: Partial<ProactiveLoopConfig>;
  /** Cosmic order bridge configuration */
  cosmicOrderConfig?: Partial<CosmicOrderBridgeConfig>;
  /** Maximum concurrent threads */
  maxConcurrentThreads: number;
}

const DEFAULT_CONFIG: EchoAgentLoopConfig = {
  stepDurationMs: 100,
  enableThreadMultiplexing: true,
  enableTriadCycling: true,
  enableCosmicOrder: true,
  enableTelemetry: true,
  maxConcurrentThreads: 4,
};

/**
 * The 6 dyadic permutations of 4 particulars
 */
const THREAD_PERMUTATIONS: ThreadPermutation[] = [
  { id: 'P12', particulars: [1, 2], phase: 0 },
  { id: 'P13', particulars: [1, 3], phase: 1 },
  { id: 'P14', particulars: [1, 4], phase: 2 },
  { id: 'P23', particulars: [2, 3], phase: 3 },
  { id: 'P24', particulars: [2, 4], phase: 4 },
  { id: 'P34', particulars: [3, 4], phase: 5 },
];

/**
 * Two complementary triads
 */
const TRIAD_MP1: TriadConfig = {
  id: 'MP1',
  sequence: [[1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4]],
  currentIndex: 0,
};

const TRIAD_MP2: TriadConfig = {
  id: 'MP2',
  sequence: [[1, 3, 4], [2, 3, 4], [1, 2, 3], [1, 2, 4]],
  currentIndex: 0,
};

/**
 * Grand cycle constants
 */
const DOVE9_CYCLE_LENGTH = 12;
const SYS6_CYCLE_LENGTH = 30;
const GRAND_CYCLE_LENGTH = 60; // LCM(12, 30)

/**
 * EchoAgentLoop
 *
 * The unified autonomous cognitive event loop that synchronizes
 * all cognitive subsystems through the 60-step grand cycle.
 */
export class EchoAgentLoop extends EventEmitter {
  private config: EchoAgentLoopConfig;
  private proactiveLoop: ProactiveLoop;
  private cosmicOrderBridge: CosmicOrderBridge;
  private treePolytopeKernel: TreePolytopeKernel;
  private running: boolean = false;
  private grandCycleTimer?: ReturnType<typeof setInterval>;

  // Grand cycle state
  private grandCycleState: GrandCycleState;
  private metrics: EchoAgentMetrics;

  // Thread multiplexing
  private currentPermutationIndex: number = 0;
  private triadMP1: TriadConfig;
  private triadMP2: TriadConfig;
  private activeTriad: 'MP1' | 'MP2' = 'MP1';

  constructor(config: Partial<EchoAgentLoopConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize proactive loop with synchronized timing
    this.proactiveLoop = new ProactiveLoop({
      cycleIntervalMs: this.config.stepDurationMs * DOVE9_CYCLE_LENGTH,
      enableAutonomousGoals: true,
      enableMemoryConsolidation: true,
      enableSelfImageUpdates: true,
      ...this.config.proactiveConfig,
    });

    // Initialize grand cycle state
    this.grandCycleState = {
      step: 0,
      dove9Step: 0,
      sys6Step: 0,
      proactivePhase: ProactivePhase.IDLE,
      activeTriad: 'MP1',
      threadPermutation: THREAD_PERMUTATIONS[0],
      timestamp: Date.now(),
    };

    // Initialize metrics
    this.metrics = {
      grandCycles: 0,
      totalSteps: 0,
      averageStepTime: 0,
      dove9Syncs: 0,
      sys6Syncs: 0,
      triadConvergences: 0,
      threadSwitches: 0,
      feedForwardCycles: 0,
      feedBackCycles: 0,
      autonomyScore: 0,
    };

    // Clone triad configs
    this.triadMP1 = { ...TRIAD_MP1, currentIndex: 0 };
    this.triadMP2 = { ...TRIAD_MP2, currentIndex: 0 };

    // Initialize cosmic order bridge
    this.cosmicOrderBridge = new CosmicOrderBridge(this.config.cosmicOrderConfig);

    // Initialize tree-polytope kernel for structural self-awareness
    this.treePolytopeKernel = createTreePolytopeKernel();
    this.treePolytopeKernel.on('tick', (snapshot: any) => {
      this.emit('tree_polytope_tick', snapshot);
    });
    this.treePolytopeKernel.on('rebuild', (model: any) => {
      this.emit('structural_rebuild', model);
    });

    // Wire proactive loop events
    this.proactiveLoop.on('telemetry', (event: any) => {
      this.emit('proactive_event', event);
    });

    // Wire cosmic order events
    this.cosmicOrderBridge.on('triadic_resonance', (event: any) => {
      this.emit('cosmic_resonance', event);
    });
    this.cosmicOrderBridge.on('term_transition', (event: any) => {
      this.emit('cosmic_term_transition', event);
    });
    this.cosmicOrderBridge.on('mode_flip', (event: any) => {
      this.emit('cosmic_mode_flip', event);
    });
  }

  /**
   * Start the echo agent loop
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn('Echo agent loop is already running');
      return;
    }

    log.info('Starting Echo Agent Loop');
    log.info(`Grand cycle: ${GRAND_CYCLE_LENGTH} steps ` +
      `(Dove9: ${DOVE9_CYCLE_LENGTH}, Sys6: ${SYS6_CYCLE_LENGTH})`);
    log.info(`Step duration: ${this.config.stepDurationMs}ms`);
    log.info(`Cosmic Order: ${this.config.enableCosmicOrder ? 'enabled (sys1-6)' : 'disabled'}`);

    this.running = true;

    // Start cosmic order bridge
    if (this.config.enableCosmicOrder) {
      this.cosmicOrderBridge.start();
    }

    // Start proactive loop
    await this.proactiveLoop.start();

    // Start grand cycle timer
    this.grandCycleTimer = setInterval(() => {
      this.tick().catch(error => {
        log.error('Grand cycle tick error:', error);
      });
    }, this.config.stepDurationMs);

    log.info('Echo Agent Loop started successfully');
  }

  /**
   * Stop the echo agent loop
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    log.info('Stopping Echo Agent Loop');

    if (this.grandCycleTimer) {
      clearInterval(this.grandCycleTimer);
      this.grandCycleTimer = undefined;
    }

    // Stop cosmic order bridge
    if (this.config.enableCosmicOrder) {
      this.cosmicOrderBridge.stop();
    }

    await this.proactiveLoop.stop();
    this.running = false;

    log.info(`Echo Agent Loop stopped. Grand cycles: ${this.metrics.grandCycles}, ` +
      `Total steps: ${this.metrics.totalSteps}`);
  }

  /**
   * Single tick of the grand cycle
   */
  private async tick(): Promise<void> {
    const tickStart = Date.now();

    // Advance grand cycle step
    this.grandCycleState.step = (this.grandCycleState.step + 1) % GRAND_CYCLE_LENGTH;
    this.grandCycleState.timestamp = tickStart;

    // Calculate sub-cycle positions
    this.grandCycleState.dove9Step = this.grandCycleState.step % DOVE9_CYCLE_LENGTH;
    this.grandCycleState.sys6Step = this.grandCycleState.step % SYS6_CYCLE_LENGTH;

    // Map proactive phase from grand cycle position
    this.grandCycleState.proactivePhase = this.mapProactivePhase(this.grandCycleState.step);

    // Thread multiplexing
    if (this.config.enableThreadMultiplexing) {
      this.advanceThreadPermutation();
    }

    // Triad cycling
    if (this.config.enableTriadCycling) {
      this.advanceTriadCycling();
    }

    // Check for Dove9 triadic convergence (every 3 steps)
    if (this.grandCycleState.dove9Step % 3 === 0) {
      this.metrics.dove9Syncs++;
      this.emit('dove9_sync', {
        step: this.grandCycleState.dove9Step,
        triad: Math.floor(this.grandCycleState.dove9Step / 3),
      });
    }

    // Check for Sys6 phase transition (every 10 steps)
    if (this.grandCycleState.sys6Step % 10 === 0) {
      this.metrics.sys6Syncs++;
      this.emit('sys6_sync', {
        step: this.grandCycleState.sys6Step,
        phase: Math.floor(this.grandCycleState.sys6Step / 10) + 1,
      });
    }

    // Tick cosmic order bridge (advances all 6 system levels)
    if (this.config.enableCosmicOrder) {
      const cosmicSnapshot = this.cosmicOrderBridge.tick();
      this.grandCycleState.cosmicOrder = cosmicSnapshot;
    }

    // Advance tree-polytope s-gram rhythms (structural temporal awareness)
    this.treePolytopeKernel.advanceSGrams();

    // Determine feed-forward vs feed-back
    const isFeedForward = this.grandCycleState.step % 2 === 0;
    if (isFeedForward) {
      this.metrics.feedForwardCycles++;
    } else {
      this.metrics.feedBackCycles++;
    }

    // Grand cycle completion
    if (this.grandCycleState.step === 0 && this.metrics.totalSteps > 0) {
      this.metrics.grandCycles++;
      this.updateAutonomyScore();
      this.emit('grand_cycle_complete', {
        cycleNumber: this.metrics.grandCycles,
        metrics: this.getMetrics(),
      });
    }

    this.metrics.totalSteps++;
    const tickDuration = Date.now() - tickStart;
    this.metrics.averageStepTime =
      (this.metrics.averageStepTime * (this.metrics.totalSteps - 1) + tickDuration) /
      this.metrics.totalSteps;

    if (this.config.enableTelemetry) {
      this.emit('tick', {
        state: this.getGrandCycleState(),
        duration: tickDuration,
      });
    }
  }

  /**
   * Map grand cycle step to proactive phase
   */
  private mapProactivePhase(step: number): ProactivePhase {
    const phaseLength = GRAND_CYCLE_LENGTH / 5;
    const phaseIndex = Math.floor(step / phaseLength);
    const phases = [
      ProactivePhase.PERCEIVE,
      ProactivePhase.REFLECT,
      ProactivePhase.PLAN,
      ProactivePhase.ACT,
      ProactivePhase.INTEGRATE,
    ];
    return phases[phaseIndex] || ProactivePhase.PERCEIVE;
  }

  /**
   * Advance thread permutation
   */
  private advanceThreadPermutation(): void {
    // Advance every 10 grand cycle steps
    if (this.grandCycleState.step % 10 === 0) {
      this.currentPermutationIndex =
        (this.currentPermutationIndex + 1) % THREAD_PERMUTATIONS.length;
      this.grandCycleState.threadPermutation =
        THREAD_PERMUTATIONS[this.currentPermutationIndex];
      this.metrics.threadSwitches++;

      this.emit('thread_switch', {
        permutation: this.grandCycleState.threadPermutation,
        index: this.currentPermutationIndex,
      });
    }
  }

  /**
   * Advance triad cycling
   */
  private advanceTriadCycling(): void {
    // Switch triads every 15 grand cycle steps (4 switches per grand cycle)
    if (this.grandCycleState.step % 15 === 0) {
      if (this.activeTriad === 'MP1') {
        this.triadMP1.currentIndex =
          (this.triadMP1.currentIndex + 1) % this.triadMP1.sequence.length;
        this.activeTriad = 'MP2';
      } else {
        this.triadMP2.currentIndex =
          (this.triadMP2.currentIndex + 1) % this.triadMP2.sequence.length;
        this.activeTriad = 'MP1';
      }

      this.grandCycleState.activeTriad = this.activeTriad;
      this.metrics.triadConvergences++;

      this.emit('triad_convergence', {
        activeTriad: this.activeTriad,
        mp1Index: this.triadMP1.currentIndex,
        mp2Index: this.triadMP2.currentIndex,
      });
    }
  }

  /**
   * Update autonomy score based on accumulated metrics
   */
  private updateAutonomyScore(): void {
    const proactiveState = this.proactiveLoop.getState();

    // Weighted components of autonomy
    const cycleMaturity = Math.min(1, this.metrics.grandCycles / 100);
    const goalCompletion = proactiveState.goalsCompleted > 0
      ? proactiveState.goalsCompleted / (proactiveState.goalsCompleted + proactiveState.goalsActive + 1)
      : 0;
    const feedbackBalance = this.metrics.feedForwardCycles > 0
      ? Math.min(1, this.metrics.feedBackCycles / this.metrics.feedForwardCycles)
      : 0;
    const threadUtilization = this.metrics.threadSwitches > 0
      ? Math.min(1, this.metrics.threadSwitches / (this.metrics.grandCycles * 6 + 1))
      : 0;

    // Tree-polytope structural integrity adds a 5th dimension
    const structuralIntegrity = this.treePolytopeKernel.computeIntegrity();

    this.metrics.autonomyScore =
      cycleMaturity * 0.25 +
      goalCompletion * 0.25 +
      feedbackBalance * 0.15 +
      threadUtilization * 0.15 +
      structuralIntegrity * 0.20;
  }

  /**
   * Inject a stimulus into the proactive loop
   */
  public injectStimulus(stimulus: EnvironmentStimulus): void {
    this.proactiveLoop.injectStimulus(stimulus);
  }

  /**
   * Register a perception handler
   */
  public registerPerceptionHandler(handler: () => Promise<EnvironmentStimulus[]>): void {
    this.proactiveLoop.registerPerceptionHandler(handler);
  }

  /**
   * Get current grand cycle state
   */
  public getGrandCycleState(): GrandCycleState {
    return { ...this.grandCycleState };
  }

  /**
   * Get metrics
   */
  public getMetrics(): EchoAgentMetrics {
    return { ...this.metrics };
  }

  /**
   * Get proactive loop
   */
  public getProactiveLoop(): ProactiveLoop {
    return this.proactiveLoop;
  }

  /**
   * Get cosmic order bridge
   */
  public getCosmicOrderBridge(): CosmicOrderBridge {
    return this.cosmicOrderBridge;
  }

  /**
   * Get tree-polytope kernel
   */
  public getTreePolytopeKernel(): TreePolytopeKernel {
    return this.treePolytopeKernel;
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }
}
