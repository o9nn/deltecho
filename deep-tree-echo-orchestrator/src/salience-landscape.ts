/**
 * Salience Landscape Renegotiation
 *
 * Ported from delovecho/dovecho-core/src/dove9/cognitive/dove9-triadic-engine.c
 *
 * Implements PIVOTAL_RR (Pivotal Relevance Realization) — the mechanism by which
 * the cognitive system dynamically reprioritizes processes at specific convergence
 * points in the triadic cycle.
 *
 * In the C layer, PIVOTAL_RR occurs at steps 1 and 5 of the 12-step triadic cycle
 * where the salience landscape is most actively renegotiated. This TypeScript port
 * integrates with the EchoAgentLoop's 60-step grand cycle.
 *
 * Architecture:
 * - Salience values are floating-point [0.0, 1.0] representing relevance/importance
 * - The landscape is a priority map over all active cognitive processes
 * - Renegotiation uses decay, boost, and coupling-based modulation
 * - T-point convergences (where all 3 streams are simultaneously active) trigger
 *   landscape-wide rebalancing
 *
 * Key Invariants (from spec):
 * - 4 T-point convergences per 12-step cycle
 * - 7 Expressive : 5 Reflective step ratio
 * - Tensional couplings: PERCEPTION_MEMORY, ASSESSMENT_PLANNING, BALANCED_INTEGRATION
 */
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/SalienceLandscape');

/**
 * Cognitive term types (from dove9-types.h)
 */
export enum CognitiveTerm {
  T1_PERCEPTION = 'T1_PERCEPTION',
  T2_IDEA_FORMATION = 'T2_IDEA_FORMATION',
  T4_SENSORY_INPUT = 'T4_SENSORY_INPUT',
  T5_ACTION_SEQUENCE = 'T5_ACTION_SEQUENCE',
  T7_MEMORY_ENCODING = 'T7_MEMORY_ENCODING',
  T8_BALANCED_RESPONSE = 'T8_BALANCED_RESPONSE',
}

/**
 * Tensional coupling types (from dove9-types.h)
 */
export enum CouplingType {
  PERCEPTION_MEMORY = 'PERCEPTION_MEMORY',       // T4E ↔ T7R
  ASSESSMENT_PLANNING = 'ASSESSMENT_PLANNING',   // T1R ↔ T2E
  BALANCED_INTEGRATION = 'BALANCED_INTEGRATION', // T8E
}

/**
 * Cognitive mode (Expressive vs Reflective)
 */
export enum CognitiveMode {
  EXPRESSIVE = 'EXPRESSIVE',
  REFLECTIVE = 'REFLECTIVE',
}

/**
 * A salience entry in the landscape
 */
export interface SalienceEntry {
  id: string;
  source: string;
  salience: number;
  decayRate: number;
  lastBoosted: number;
  couplings: CouplingType[];
  cognitiveTermAffinity: CognitiveTerm[];
  metadata?: Record<string, unknown>;
}

/**
 * Renegotiation event emitted during PIVOTAL_RR
 */
export interface RenegotiationEvent {
  step: number;
  cycleStep: number;
  isPivotalRR: boolean;
  isTPoint: boolean;
  activeCouplings: CouplingType[];
  topEntries: SalienceEntry[];
  entriesDecayed: number;
  entriesBoosted: number;
  entriesPruned: number;
  timestamp: number;
}

/**
 * Configuration for the salience landscape
 */
export interface SalienceLandscapeConfig {
  /** Maximum entries in the landscape */
  maxEntries: number;
  /** Base decay rate per step */
  baseDecayRate: number;
  /** Boost factor for coupling-aligned entries */
  couplingBoostFactor: number;
  /** Threshold below which entries are pruned */
  pruneThreshold: number;
  /** T-point convergence boost multiplier */
  tPointBoostMultiplier: number;
  /** PIVOTAL_RR renegotiation strength */
  pivotalRRStrength: number;
}

const DEFAULT_CONFIG: SalienceLandscapeConfig = {
  maxEntries: 256,
  baseDecayRate: 0.02,
  couplingBoostFactor: 1.5,
  pruneThreshold: 0.05,
  tPointBoostMultiplier: 2.0,
  pivotalRRStrength: 0.3,
};

/**
 * The 12-step triadic cycle step assignment table
 * Maps each step to its cognitive term and mode
 */
const STEP_ASSIGNMENTS: Array<{ term: CognitiveTerm; mode: CognitiveMode }> = [
  { term: CognitiveTerm.T1_PERCEPTION, mode: CognitiveMode.EXPRESSIVE },      // Step 1 (PIVOTAL_RR)
  { term: CognitiveTerm.T2_IDEA_FORMATION, mode: CognitiveMode.EXPRESSIVE },  // Step 2
  { term: CognitiveTerm.T4_SENSORY_INPUT, mode: CognitiveMode.EXPRESSIVE },   // Step 3
  { term: CognitiveTerm.T5_ACTION_SEQUENCE, mode: CognitiveMode.EXPRESSIVE }, // Step 4
  { term: CognitiveTerm.T7_MEMORY_ENCODING, mode: CognitiveMode.REFLECTIVE }, // Step 5 (PIVOTAL_RR)
  { term: CognitiveTerm.T8_BALANCED_RESPONSE, mode: CognitiveMode.EXPRESSIVE }, // Step 6
  { term: CognitiveTerm.T1_PERCEPTION, mode: CognitiveMode.REFLECTIVE },      // Step 7
  { term: CognitiveTerm.T2_IDEA_FORMATION, mode: CognitiveMode.REFLECTIVE },  // Step 8
  { term: CognitiveTerm.T4_SENSORY_INPUT, mode: CognitiveMode.REFLECTIVE },   // Step 9
  { term: CognitiveTerm.T5_ACTION_SEQUENCE, mode: CognitiveMode.REFLECTIVE }, // Step 10
  { term: CognitiveTerm.T7_MEMORY_ENCODING, mode: CognitiveMode.EXPRESSIVE }, // Step 11
  { term: CognitiveTerm.T8_BALANCED_RESPONSE, mode: CognitiveMode.REFLECTIVE }, // Step 12
];

/**
 * T-point positions in the 12-step cycle (where all 3 streams converge)
 */
const T_POINTS: number[] = [1, 4, 7, 10]; // 0-indexed: steps 1, 5, 9 in 1-indexed

/**
 * PIVOTAL_RR positions (steps where salience landscape is most actively renegotiated)
 */
const PIVOTAL_RR_STEPS: number[] = [0, 4]; // Steps 1 and 5 (0-indexed)

/**
 * SalienceLandscape
 *
 * Manages the dynamic priority landscape of all active cognitive processes.
 * Implements the PIVOTAL_RR mechanism from the delovecho C layer.
 */
export class SalienceLandscape extends EventEmitter {
  private config: SalienceLandscapeConfig;
  private entries: Map<string, SalienceEntry> = new Map();
  private currentStep: number = 0;
  private cycleNumber: number = 0;
  private totalRenegotiations: number = 0;

  constructor(config: Partial<SalienceLandscapeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a new entry in the salience landscape
   */
  public register(
    id: string,
    source: string,
    initialSalience: number,
    options: {
      decayRate?: number;
      couplings?: CouplingType[];
      cognitiveTermAffinity?: CognitiveTerm[];
      metadata?: Record<string, unknown>;
    } = {}
  ): SalienceEntry {
    const entry: SalienceEntry = {
      id,
      source,
      salience: Math.max(0, Math.min(1, initialSalience)),
      decayRate: options.decayRate ?? this.config.baseDecayRate,
      lastBoosted: Date.now(),
      couplings: options.couplings ?? [],
      cognitiveTermAffinity: options.cognitiveTermAffinity ?? [],
      metadata: options.metadata,
    };

    this.entries.set(id, entry);

    // Enforce max entries
    if (this.entries.size > this.config.maxEntries) {
      this.pruneLowest();
    }

    return entry;
  }

  /**
   * Boost an entry's salience
   */
  public boost(id: string, amount: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    entry.salience = Math.min(1, entry.salience + amount);
    entry.lastBoosted = Date.now();
  }

  /**
   * Remove an entry
   */
  public remove(id: string): void {
    this.entries.delete(id);
  }

  /**
   * Advance one step in the triadic cycle and perform renegotiation
   *
   * This is the core PIVOTAL_RR mechanism. Called by the EchoAgentLoop
   * at each grand cycle tick, mapped to the 12-step triadic sub-cycle.
   */
  public advanceStep(grandCycleStep: number): RenegotiationEvent {
    // Map 60-step grand cycle to 12-step triadic cycle
    this.currentStep = grandCycleStep % 12;

    // Check if we're at a PIVOTAL_RR step
    const isPivotalRR = PIVOTAL_RR_STEPS.includes(this.currentStep);

    // Check if we're at a T-point convergence
    const isTPoint = T_POINTS.includes(this.currentStep);

    // Get current step assignment
    const stepAssignment = STEP_ASSIGNMENTS[this.currentStep];

    // Detect active couplings at this step
    const activeCouplings = this.detectCouplings(this.currentStep);

    // Perform renegotiation
    let entriesDecayed = 0;
    let entriesBoosted = 0;
    let entriesPruned = 0;

    for (const [id, entry] of this.entries) {
      // 1. Apply decay
      const decayAmount = entry.decayRate * (isPivotalRR ? this.config.pivotalRRStrength : 1);
      entry.salience = Math.max(0, entry.salience - decayAmount);
      entriesDecayed++;

      // 2. Coupling-based boost: entries aligned with active couplings get boosted
      if (activeCouplings.length > 0) {
        const couplingOverlap = entry.couplings.filter(c => activeCouplings.includes(c));
        if (couplingOverlap.length > 0) {
          const boost = this.config.couplingBoostFactor * couplingOverlap.length * 0.05;
          entry.salience = Math.min(1, entry.salience + boost);
          entry.lastBoosted = Date.now();
          entriesBoosted++;
        }
      }

      // 3. Cognitive term affinity boost: entries matching current term get boosted
      if (entry.cognitiveTermAffinity.includes(stepAssignment.term)) {
        const affinityBoost = 0.03 * (isTPoint ? this.config.tPointBoostMultiplier : 1);
        entry.salience = Math.min(1, entry.salience + affinityBoost);
        entriesBoosted++;
      }

      // 4. T-point convergence: global rebalancing
      if (isTPoint) {
        // At T-points, high-salience entries get slightly dampened (prevent monopoly)
        // and low-salience entries get a small floor boost (prevent starvation)
        if (entry.salience > 0.8) {
          entry.salience *= 0.95; // Gentle dampening
        } else if (entry.salience < 0.2 && entry.salience > this.config.pruneThreshold) {
          entry.salience += 0.01; // Anti-starvation floor
        }
      }

      // 5. PIVOTAL_RR: aggressive renegotiation
      if (isPivotalRR) {
        // At PIVOTAL_RR steps, the landscape is most actively renegotiated
        // Entries that haven't been boosted recently decay faster
        const timeSinceBoost = Date.now() - entry.lastBoosted;
        if (timeSinceBoost > 10000) { // 10 seconds without boost
          entry.salience *= (1 - this.config.pivotalRRStrength * 0.1);
        }
      }

      // 6. Prune entries below threshold
      if (entry.salience < this.config.pruneThreshold) {
        this.entries.delete(id);
        entriesPruned++;
      }
    }

    // Track cycle completion
    if (this.currentStep === 11) {
      this.cycleNumber++;
    }

    this.totalRenegotiations++;

    // Get top entries for event reporting
    const topEntries = this.getTopEntries(5);

    const event: RenegotiationEvent = {
      step: grandCycleStep,
      cycleStep: this.currentStep,
      isPivotalRR,
      isTPoint,
      activeCouplings,
      topEntries,
      entriesDecayed,
      entriesBoosted,
      entriesPruned,
      timestamp: Date.now(),
    };

    this.emit('renegotiation', event);

    if (isPivotalRR) {
      this.emit('pivotal_rr', event);
    }

    if (isTPoint) {
      this.emit('t_point_convergence', event);
    }

    return event;
  }

  /**
   * Detect active tensional couplings at a given step
   */
  private detectCouplings(step: number): CouplingType[] {
    const couplings: CouplingType[] = [];
    const assignment = STEP_ASSIGNMENTS[step];

    // PERCEPTION_MEMORY: T4 (Sensory) ↔ T7 (Memory)
    if (assignment.term === CognitiveTerm.T4_SENSORY_INPUT ||
        assignment.term === CognitiveTerm.T7_MEMORY_ENCODING) {
      couplings.push(CouplingType.PERCEPTION_MEMORY);
    }

    // ASSESSMENT_PLANNING: T1 (Perception) ↔ T2 (Idea Formation)
    if (assignment.term === CognitiveTerm.T1_PERCEPTION ||
        assignment.term === CognitiveTerm.T2_IDEA_FORMATION) {
      couplings.push(CouplingType.ASSESSMENT_PLANNING);
    }

    // BALANCED_INTEGRATION: T8 (Balanced Response)
    if (assignment.term === CognitiveTerm.T8_BALANCED_RESPONSE) {
      couplings.push(CouplingType.BALANCED_INTEGRATION);
    }

    return couplings;
  }

  /**
   * Get the top N entries by salience
   */
  public getTopEntries(n: number): SalienceEntry[] {
    return [...this.entries.values()]
      .sort((a, b) => b.salience - a.salience)
      .slice(0, n);
  }

  /**
   * Get entry by ID
   */
  public getEntry(id: string): SalienceEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get all entries
   */
  public getAllEntries(): SalienceEntry[] {
    return [...this.entries.values()];
  }

  /**
   * Get landscape metrics
   */
  public getMetrics(): {
    totalEntries: number;
    averageSalience: number;
    maxSalience: number;
    minSalience: number;
    cycleNumber: number;
    totalRenegotiations: number;
    currentStep: number;
  } {
    const entries = [...this.entries.values()];
    const saliences = entries.map(e => e.salience);

    return {
      totalEntries: entries.length,
      averageSalience: saliences.length > 0 ? saliences.reduce((a, b) => a + b, 0) / saliences.length : 0,
      maxSalience: saliences.length > 0 ? Math.max(...saliences) : 0,
      minSalience: saliences.length > 0 ? Math.min(...saliences) : 0,
      cycleNumber: this.cycleNumber,
      totalRenegotiations: this.totalRenegotiations,
      currentStep: this.currentStep,
    };
  }

  /**
   * Prune the lowest-salience entries to maintain maxEntries limit
   */
  private pruneLowest(): void {
    const sorted = [...this.entries.entries()]
      .sort((a, b) => a[1].salience - b[1].salience);

    const toRemove = sorted.slice(0, sorted.length - this.config.maxEntries);
    for (const [key] of toRemove) {
      this.entries.delete(key);
    }
  }

  /**
   * Reset the landscape
   */
  public reset(): void {
    this.entries.clear();
    this.currentStep = 0;
    this.cycleNumber = 0;
    this.totalRenegotiations = 0;
  }
}
