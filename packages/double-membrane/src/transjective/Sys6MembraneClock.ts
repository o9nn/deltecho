/**
 * Sys6MembraneClock - Membrane Transport Discipline via Sys6 Cycle
 *
 * The Sys6 cycle (30 steps = LCM(2,3,5)) serves as the "heartbeat" of the
 * membrane system, governing when and how packets can cross boundaries.
 *
 * Transport discipline mapping:
 * - Δ₂ (8-way cubic concurrency): Objective fan-out lanes (tool calls, retrieval)
 * - Δ₃ (9-phase triadic convolution): Transjective batching phases
 * - μ (30-step clock): Membrane heartbeat / event loop cadence
 * - φ (fold/compression): Subjective update operator
 * - σ (stage scheduler): Governs which stage can cross what, when
 *
 * This is analogous to the proton gradient in mitochondria that drives
 * ATP synthesis - the Sys6 cycle creates an "information gradient" that
 * powers the membrane transport.
 */

import { EventEmitter } from 'events';
import { MembraneBus, LogEntry } from './MembraneBus.js';
import { CrossingPolicy, PolicyContext } from './CrossingPolicy.js';
import { CodecPipeline } from './CodecPipeline.js';
import { EvidencePacket, IntentPacket, TelemetryPacket } from './packets.js';

/**
 * Sys6 phase (1-3)
 */
export type Sys6Phase = 1 | 2 | 3;

/**
 * Sys6 stage (1-5)
 */
export type Sys6Stage = 1 | 2 | 3 | 4 | 5;

/**
 * Sys6 step (1-2)
 */
export type Sys6Step = 1 | 2;

/**
 * Dyad state (A or B)
 */
export type DyadState = 'A' | 'B';

/**
 * Triad permutation
 */
export type TriadPermutation = [number, number, number];

/**
 * Sys6 address (phase, stage, step)
 */
export interface Sys6Address {
  globalStep: number; // 1-30
  phase: Sys6Phase;
  stage: Sys6Stage;
  step: Sys6Step;
  dyadState: DyadState;
  triadPermutation: TriadPermutation;
}

/**
 * Delta-2 lane (8-way cubic concurrency for objective fan-out)
 */
export interface Delta2Lane {
  id: number; // 0-7
  name: string;
  type:
    | 'tool_call'
    | 'retrieval'
    | 'message_parse'
    | 'candidate_gen'
    | 'search'
    | 'api'
    | 'plan'
    | 'validate';
  active: boolean;
  currentLoad: number;
  maxLoad: number;
}

/**
 * Delta-3 phase (9-phase triadic convolution for transjective batching)
 */
export interface Delta3Phase {
  id: number; // 0-8
  name: string;
  type:
    | 'sanitize'
    | 'summarize'
    | 'tensorize'
    | 'validate'
    | 'transform'
    | 'batch'
    | 'commit'
    | 'notify'
    | 'archive';
  active: boolean;
}

/**
 * Clock tick event
 */
export interface ClockTick {
  address: Sys6Address;
  timestamp: string;
  energyLevel: number;
  delta2Lanes: Delta2Lane[];
  delta3Phase: Delta3Phase;
}

/**
 * Clock configuration
 */
export interface Sys6MembraneClockConfig {
  /** Tick interval in milliseconds */
  tickIntervalMs?: number;
  /** Enable auto-advance */
  autoAdvance?: boolean;
  /** Initial energy level */
  initialEnergy?: number;
  /** Energy decay per tick */
  energyDecayPerTick?: number;
  /** Energy recovery per tick (idle) */
  energyRecoveryPerTick?: number;
}

const DEFAULT_CONFIG: Required<Sys6MembraneClockConfig> = {
  tickIntervalMs: 100,
  autoAdvance: true,
  initialEnergy: 1.0,
  energyDecayPerTick: 0.001,
  energyRecoveryPerTick: 0.002,
};

/**
 * Phase names
 */
const PHASE_NAMES: Record<Sys6Phase, string> = {
  1: 'Perception-Orientation',
  2: 'Evaluation-Generation',
  3: 'Action-Integration',
};

/**
 * Stage names per phase
 */
const STAGE_NAMES: Record<Sys6Phase, Record<Sys6Stage, string>> = {
  1: {
    1: 'Sensory Intake',
    2: 'Pattern Recognition',
    3: 'Salience Detection',
    4: 'Context Binding',
    5: 'Orientation Commitment',
  },
  2: {
    1: 'Value Assessment',
    2: 'Option Generation',
    3: 'Simulation Projection',
    4: 'Consequence Modeling',
    5: 'Selection Crystallization',
  },
  3: {
    1: 'Response Formulation',
    2: 'Execution Monitoring',
    3: 'Feedback Comparison',
    4: 'Model Updating',
    5: 'Integration Consolidation',
  },
};

/**
 * Delta-2 lane definitions (8-way cubic concurrency)
 */
const DELTA2_LANES: Omit<Delta2Lane, 'active' | 'currentLoad'>[] = [
  { id: 0, name: 'Tool Calls', type: 'tool_call', maxLoad: 10 },
  { id: 1, name: 'Retrieval', type: 'retrieval', maxLoad: 20 },
  { id: 2, name: 'Message Parsing', type: 'message_parse', maxLoad: 50 },
  { id: 3, name: 'Candidate Generation', type: 'candidate_gen', maxLoad: 8 },
  { id: 4, name: 'Search', type: 'search', maxLoad: 5 },
  { id: 5, name: 'API Calls', type: 'api', maxLoad: 10 },
  { id: 6, name: 'Planning', type: 'plan', maxLoad: 4 },
  { id: 7, name: 'Validation', type: 'validate', maxLoad: 30 },
];

/**
 * Delta-3 phase definitions (9-phase triadic convolution)
 */
const DELTA3_PHASES: Omit<Delta3Phase, 'active'>[] = [
  { id: 0, name: 'Sanitize', type: 'sanitize' },
  { id: 1, name: 'Summarize', type: 'summarize' },
  { id: 2, name: 'Tensorize', type: 'tensorize' },
  { id: 3, name: 'Validate', type: 'validate' },
  { id: 4, name: 'Transform', type: 'transform' },
  { id: 5, name: 'Batch', type: 'batch' },
  { id: 6, name: 'Commit', type: 'commit' },
  { id: 7, name: 'Notify', type: 'notify' },
  { id: 8, name: 'Archive', type: 'archive' },
];

/**
 * Tetradic thread permutations (4 threads, cycling through combinations)
 */
const TETRADIC_PERMUTATIONS: TriadPermutation[] = [
  [1, 2, 3],
  [1, 2, 4],
  [1, 3, 4],
  [2, 3, 4],
];

/**
 * Sys6MembraneClock - The membrane heartbeat
 */
export class Sys6MembraneClock extends EventEmitter {
  private config: Required<Sys6MembraneClockConfig>;
  private currentStep: number = 0;
  private energyLevel: number;
  private running: boolean = false;
  private tickInterval?: NodeJS.Timeout;
  private delta2Lanes: Delta2Lane[];
  private delta3Phases: Delta3Phase[];
  private bus?: MembraneBus;
  private policy?: CrossingPolicy;
  private codec?: CodecPipeline;

  constructor(config: Sys6MembraneClockConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.energyLevel = this.config.initialEnergy;

    // Initialize Delta-2 lanes
    this.delta2Lanes = DELTA2_LANES.map((lane) => ({
      ...lane,
      active: true,
      currentLoad: 0,
    }));

    // Initialize Delta-3 phases
    this.delta3Phases = DELTA3_PHASES.map((phase) => ({
      ...phase,
      active: false,
    }));
  }

  /**
   * Connect membrane components
   */
  public connect(bus: MembraneBus, policy: CrossingPolicy, codec: CodecPipeline): void {
    this.bus = bus;
    this.policy = policy;
    this.codec = codec;
    policy.connectBus(bus);
  }

  /**
   * Start the clock
   */
  public start(): void {
    if (this.running) return;
    this.running = true;

    if (this.config.autoAdvance) {
      this.tickInterval = setInterval(() => {
        this.tick();
      }, this.config.tickIntervalMs);
    }

    this.emit('started');
  }

  /**
   * Stop the clock
   */
  public stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }

    this.emit('stopped');
  }

  /**
   * Manual tick (for testing or external control)
   */
  public tick(): ClockTick {
    // Advance step
    this.currentStep = (this.currentStep % 30) + 1;

    // Get current address
    const address = this.getAddress();

    // Update Delta-3 phase (cycles through 9 phases over 30 steps)
    const delta3Index = Math.floor((this.currentStep - 1) / 3.33) % 9;
    this.delta3Phases.forEach((phase, i) => {
      phase.active = i === delta3Index;
    });

    // Update energy
    this.updateEnergy();

    // Create tick event
    const tick: ClockTick = {
      address,
      timestamp: new Date().toISOString(),
      energyLevel: this.energyLevel,
      delta2Lanes: [...this.delta2Lanes],
      delta3Phase: this.delta3Phases[delta3Index],
    };

    // Process pending crossings
    this.processPendingCrossings(tick);

    // Emit telemetry
    this.emitTelemetry(tick);

    this.emit('tick', tick);
    return tick;
  }

  /**
   * Get current Sys6 address
   */
  public getAddress(): Sys6Address {
    const globalStep = this.currentStep || 1;

    // Calculate phase (1-3), stage (1-5), step (1-2)
    const phase = (Math.ceil(globalStep / 10) as Sys6Phase) || 1;
    const stageOffset = (globalStep - 1) % 10;
    const stage = ((Math.floor(stageOffset / 2) + 1) as Sys6Stage) || 1;
    const step = (((stageOffset % 2) + 1) as Sys6Step) || 1;

    // Dyad state alternates every step
    const dyadState: DyadState = globalStep % 2 === 1 ? 'A' : 'B';

    // Triad permutation cycles through tetradic combinations
    const triadIndex = Math.floor((globalStep - 1) / 8) % 4;
    const triadPermutation = TETRADIC_PERMUTATIONS[triadIndex];

    return {
      globalStep,
      phase,
      stage,
      step,
      dyadState,
      triadPermutation,
    };
  }

  /**
   * Get current energy level
   */
  public getEnergyLevel(): number {
    return this.energyLevel;
  }

  /**
   * Set energy level
   */
  public setEnergyLevel(level: number): void {
    this.energyLevel = Math.max(0, Math.min(1, level));
  }

  /**
   * Get Delta-2 lane status
   */
  public getDelta2Lanes(): readonly Delta2Lane[] {
    return this.delta2Lanes;
  }

  /**
   * Get Delta-3 phase status
   */
  public getDelta3Phases(): readonly Delta3Phase[] {
    return this.delta3Phases;
  }

  /**
   * Get active Delta-3 phase
   */
  public getActiveDelta3Phase(): Delta3Phase | undefined {
    return this.delta3Phases.find((p) => p.active);
  }

  /**
   * Check if inward crossing is allowed at current step
   */
  public canCrossInward(): boolean {
    const address = this.getAddress();
    // Inward crossings preferred during Phase 1 (Perception)
    // Also allowed during Phase 2 stages 1-3
    return address.phase === 1 || (address.phase === 2 && address.stage <= 3);
  }

  /**
   * Check if outward crossing is allowed at current step
   */
  public canCrossOutward(): boolean {
    const address = this.getAddress();
    // Outward crossings preferred during Phase 3 (Action)
    // Also allowed during Phase 2 stages 3-5
    return address.phase === 3 || (address.phase === 2 && address.stage >= 3);
  }

  /**
   * Check if subjective commit is allowed at current step
   */
  public canCommitSubjective(): boolean {
    const address = this.getAddress();
    // Subjective commits only during specific stages
    // Phase 1 Stage 5: Orientation Commitment
    // Phase 2 Stage 5: Selection Crystallization
    // Phase 3 Stage 5: Integration Consolidation
    return address.stage === 5;
  }

  /**
   * Get optimal Delta-2 lane for a task type
   */
  public getOptimalDelta2Lane(taskType: Delta2Lane['type']): Delta2Lane | undefined {
    const lane = this.delta2Lanes.find(
      (l) => l.type === taskType && l.active && l.currentLoad < l.maxLoad
    );
    return lane;
  }

  /**
   * Allocate load to a Delta-2 lane
   */
  public allocateDelta2Load(laneId: number, load: number = 1): boolean {
    const lane = this.delta2Lanes.find((l) => l.id === laneId);
    if (!lane || !lane.active || lane.currentLoad + load > lane.maxLoad) {
      return false;
    }
    lane.currentLoad += load;
    return true;
  }

  /**
   * Release load from a Delta-2 lane
   */
  public releaseDelta2Load(laneId: number, load: number = 1): void {
    const lane = this.delta2Lanes.find((l) => l.id === laneId);
    if (lane) {
      lane.currentLoad = Math.max(0, lane.currentLoad - load);
    }
  }

  /**
   * Create policy context for current state
   */
  public createPolicyContext(): PolicyContext {
    const queueDepths = this.bus?.getQueueDepths() || { inward: 0, outward: 0, internal: 0 };

    return {
      sys6Step: this.currentStep,
      energyLevel: this.energyLevel,
      queueDepths,
      recentCrossings: this.policy?.getHistory(100) || [],
      activeGoals: [],
      trustCache: new Map(),
    };
  }

  /**
   * Get phase name
   */
  public getPhaseName(phase: Sys6Phase): string {
    return PHASE_NAMES[phase];
  }

  /**
   * Get stage name
   */
  public getStageName(phase: Sys6Phase, stage: Sys6Stage): string {
    return STAGE_NAMES[phase][stage];
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private updateEnergy(): void {
    // Check if there's activity
    const totalLoad = this.delta2Lanes.reduce((sum, l) => sum + l.currentLoad, 0);

    if (totalLoad > 0) {
      // Decay energy based on load
      this.energyLevel -= this.config.energyDecayPerTick * (1 + totalLoad / 100);
    } else {
      // Recover energy when idle
      this.energyLevel += this.config.energyRecoveryPerTick;
    }

    // Clamp to [0, 1]
    this.energyLevel = Math.max(0, Math.min(1, this.energyLevel));
  }

  private processPendingCrossings(tick: ClockTick): void {
    if (!this.bus || !this.policy) return;

    const context = this.createPolicyContext();

    // Process inward crossings if allowed
    if (this.canCrossInward()) {
      const pendingInward = this.bus.getPendingInward();
      for (const entry of pendingInward.slice(0, 10)) {
        // Batch limit
        this.processInwardCrossing(entry, context, tick);
      }
    }

    // Process outward crossings if allowed
    if (this.canCrossOutward()) {
      const pendingOutward = this.bus.getPendingOutward();
      for (const entry of pendingOutward.slice(0, 10)) {
        this.processOutwardCrossing(entry, context, tick);
      }
    }
  }

  private processInwardCrossing(entry: LogEntry, context: PolicyContext, tick: ClockTick): void {
    if (!this.bus || !this.policy) return;

    const packet = entry.packet as EvidencePacket;
    if (packet.type !== 'evidence') return;

    // Mark as processing
    this.bus.markProcessing(entry.id, 'Sys6MembraneClock', tick.address.globalStep);

    // Evaluate crossing policy
    const result = this.policy.evaluateInward(packet, context);

    // Apply decision
    if (result.decision === 'approve') {
      // Apply codec transformations if needed
      if (this.codec && tick.delta3Phase.type === 'summarize') {
        // Summarize during summarize phase
        const summary = this.codec.summarizeEvidence(packet);
        this.emit('evidence_summarized', { packet, summary });
      }

      this.bus.approve(entry.id);
      this.emit('inward_crossing_approved', { entry, result });
    } else if (result.decision === 'reject') {
      this.bus.reject(entry.id, result.reason);
      this.emit('inward_crossing_rejected', { entry, result });
    }
    // defer and quarantine leave entry in pending state
  }

  private processOutwardCrossing(entry: LogEntry, context: PolicyContext, tick: ClockTick): void {
    if (!this.bus || !this.policy) return;

    const packet = entry.packet as IntentPacket;
    if (packet.type !== 'intent') return;

    // Mark as processing
    this.bus.markProcessing(entry.id, 'Sys6MembraneClock', tick.address.globalStep);

    // Evaluate crossing policy
    const result = this.policy.evaluateOutward(packet, context);

    // Apply decision
    if (result.decision === 'approve') {
      // Apply redaction before crossing
      if (this.codec) {
        const redacted = this.codec.redactIntent(packet);
        this.emit('intent_redacted', { original: packet, redacted });
      }

      this.bus.approve(entry.id);
      this.emit('outward_crossing_approved', { entry, result });
    } else if (result.decision === 'reject') {
      this.bus.reject(entry.id, result.reason);
      this.emit('outward_crossing_rejected', { entry, result });
    }
  }

  private emitTelemetry(tick: ClockTick): void {
    if (!this.bus) return;

    const telemetry: TelemetryPacket = {
      type: 'telemetry',
      id: `tel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sys6: {
        step: tick.address.globalStep,
        phase: tick.address.phase,
        stage: tick.address.stage,
        activeStreams: tick.address.triadPermutation,
        dyadState: tick.address.dyadState,
        triadPermutation: tick.address.triadPermutation,
      },
      energy: {
        level: tick.energyLevel,
        consumptionRate: this.config.energyDecayPerTick,
        availableBudget: tick.energyLevel * 1000, // Arbitrary units
      },
      queues: {
        inbound: this.bus.getQueueDepths().inward,
        outbound: this.bus.getQueueDepths().outward,
        pending: this.bus.getQueueDepths().internal,
      },
      health: {
        coherence: 1.0, // Would be computed from actual state
        latency: this.config.tickIntervalMs,
        errorRate: 0,
      },
      timestamp: tick.timestamp,
    };

    this.bus.submitTelemetry(telemetry);
    this.emit('telemetry', telemetry);
  }
}

export default Sys6MembraneClock;
