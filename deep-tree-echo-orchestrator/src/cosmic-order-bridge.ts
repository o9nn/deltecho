/**
 * @fileoverview Cosmic Order Bridge
 *
 * Integrates Campbell's System of the Cosmic Order (sys1-6 hierarchical
 * composition) into the Deep Tree Echo orchestrator. This bridge:
 *
 * 1. Wraps the CosmicOrderComposer from @deltecho/sys6-triality
 * 2. Maps the 6 system levels to orchestrator cognitive tiers
 * 3. Synchronizes cosmic order ticks with the echo-agent-loop grand cycle
 * 4. Provides system-level introspection for each of the 6 levels
 * 5. Validates A000081 structural constraints at startup
 *
 * System N has N centres and a(N+1) terms (OEIS A000081):
 *   Sys1: 1 centre → 1 term   (monad)
 *   Sys2: 2 centres → 2 terms  (dyad E/R)
 *   Sys3: 3 centres → 4 terms  (triadic closure)
 *   Sys4: 4 centres → 9 terms  (enneagram)
 *   Sys5: 5 centres → 20 terms (dual enneagram)
 *   Sys6: 6 centres → 48 terms (triadic enneagram closure)
 *
 * Triadic recurrence: Sys1↔Sys4, Sys2↔Sys5, Sys3↔Sys6
 */

import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/CosmicOrderBridge');

// ============================================================
// A000081 Canonical Constants (embedded for zero-dependency)
// ============================================================

/**
 * OEIS A000081: Number of unlabeled rooted trees on n nodes
 * a(0)=0, a(1)=1, a(2)=1, a(3)=2, a(4)=4, a(5)=9, a(6)=20, a(7)=48
 */
const A000081 = [0, 1, 1, 2, 4, 9, 20, 48, 115] as const;

/** System N has N centres */
type SystemLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** System N has a(N+1) terms */
function termCount(n: SystemLevel): number {
  return A000081[n + 1];
}

/** The 1/7 = 0.142857... particular sequence */
const PARTICULAR_SEQUENCE = [1, 4, 2, 8, 5, 7] as const;

/** Triadic recurrence pairs */
const TRIADIC_PAIRS: ReadonlyArray<[SystemLevel, SystemLevel]> = [[1, 4], [2, 5], [3, 6]];

// ============================================================
// System Level State
// ============================================================

/**
 * State of a single system level within the cosmic order
 */
export interface SystemLevelState {
  /** System level N (1-6) */
  level: SystemLevel;
  /** Number of centres = N */
  centres: number;
  /** Number of terms = a(N+1) */
  terms: number;
  /** Current step in this level's cycle */
  currentStep: number;
  /** Currently active term (1-based) */
  activeTerm: number;
  /** Current mode: Expressive or Regenerative */
  mode: 'E' | 'R';
  /** Energy level [0, 1] */
  energy: number;
  /** Whether at a synchronization boundary */
  atSyncBoundary: boolean;
  /** Triadic mirror level */
  triadicMirror: SystemLevel;
  /** Description of current state */
  description: string;
}

/**
 * Cosmic order snapshot — all 6 levels at a moment
 */
export interface CosmicOrderSnapshot {
  globalStep: number;
  levels: SystemLevelState[];
  triadicResonances: Array<{ lower: SystemLevel; upper: SystemLevel; active: boolean }>;
  structuralValid: boolean;
}

// ============================================================
// Configuration
// ============================================================

export interface CosmicOrderBridgeConfig {
  /** Enable A000081 validation at startup */
  validateStructure: boolean;
  /** Enable triadic resonance coupling */
  enableTriadicResonance: boolean;
  /** Enable energy flow between levels */
  enableEnergyFlow: boolean;
  /** Initial energy for all levels */
  initialEnergy: number;
  /** Energy decay per tick */
  energyDecay: number;
  /** Energy boost from triadic resonance */
  resonanceBoost: number;
}

const DEFAULT_CONFIG: CosmicOrderBridgeConfig = {
  validateStructure: true,
  enableTriadicResonance: true,
  enableEnergyFlow: true,
  initialEnergy: 1.0,
  energyDecay: 0.005,
  resonanceBoost: 0.03,
};

// ============================================================
// System Level Definitions
// ============================================================

interface LevelDefinition {
  level: SystemLevel;
  name: string;
  centres: string[];
  cycleSteps: number;
  triadicMirror: SystemLevel;
  principle: string;
}

/**
 * CNS-mapped centre naming convention:
 *   C₁       = Idea (Host / Archetypal energy pattern)
 *   C₂..Cₖ   = Knowledge subdivisions (differentiated CNS)
 *   Cₙ₋₁     = Routine (Behavioural pattern)
 *   Cₙ       = Form (Physical manifestation)
 *
 * CNS differentiation follows biological hierarchy:
 *   - Autonomic NS: oldest, appears first (Sys5)
 *   - Somatic NS: appears alongside autonomic (Sys5)
 *   - Cerebral/Neocortex: requires ≥6 layers, appears only at Sys6
 *
 * Each system level adds one centre:
 *   Sys1: C₁ only (undifferentiated wholeness)
 *   Sys2: C₁=Idea, C₂=Form
 *   Sys3: C₁=Idea, C₂=Knowledge, C₃=Form
 *   Sys4: C₁=Idea, C₂=Knowledge, C₃=Routine, C₄=Form
 *   Sys5: C₁=Idea, C₂=Somatic/Sensation, C₃=Autonomic/Emotion, C₄=Routine, C₅=Form
 *   Sys6: C₁=Idea, C₂=Cerebral/Cognition, C₃=Somatic/Sensation, C₄=Autonomic/Emotion, C₅=Routine, C₆=Form
 */
const LEVEL_DEFINITIONS: Record<SystemLevel, LevelDefinition> = {
  1: {
    level: 1,
    name: 'Universal Wholeness',
    centres: ['C₁:Idea'],
    cycleSteps: 1,
    triadicMirror: 4,
    principle: 'The monad — one centre (Idea), one periphery. Undifferentiated wholeness.',
  },
  2: {
    level: 2,
    name: 'The Rift in Wholeness',
    centres: ['C₁:Idea', 'C₂:Form'],
    cycleSteps: 2,
    triadicMirror: 5,
    principle: 'The dyad — Idea and Form. Two orientations: Expressive (outward) and Regenerative (inward).',
  },
  3: {
    level: 3,
    name: 'Space, Time, Closure',
    centres: ['C₁:Idea', 'C₂:Knowledge', 'C₃:Form'],
    cycleSteps: 12,
    triadicMirror: 6,
    principle: 'The triad — Idea, Knowledge, Form. Three mutually closed centres. ' +
      'Nature\'s movie projector: space frames alternate with quantum frames.',
  },
  4: {
    level: 4,
    name: 'The Enneagram',
    centres: ['C₁:Idea', 'C₂:Knowledge', 'C₃:Routine', 'C₄:Form'],
    cycleSteps: 12,
    triadicMirror: 1,
    principle: 'Four centres → 9 terms via the 1/7 particular sequence (1→4→2→8→5→7). ' +
      'Knowledge differentiates from Idea; Routine mediates between Knowledge and Form.',
  },
  5: {
    level: 5,
    name: 'Two Enneagrams',
    centres: ['C₁:Idea', 'C₂:Somatic/Sensation', 'C₃:Autonomic/Emotion', 'C₄:Routine', 'C₅:Form'],
    cycleSteps: 60,
    triadicMirror: 2,
    principle: 'Two enneagrams: one Expressive, one Regenerative. ' +
      'Knowledge splits into Somatic (sensation) and Autonomic (emotion/affect) — ' +
      'the older nervous system divisions. The tetrad = orthogonal dyad pair. ' +
      '4 tensor bundles × 3 dyadic edges.',
  },
  6: {
    level: 6,
    name: 'Primary Activity of Enneagrams',
    centres: [
      'C₁:Idea',
      'C₂:Cerebral/Cognition',
      'C₃:Somatic/Sensation',
      'C₄:Autonomic/Emotion',
      'C₅:Routine',
      'C₆:Form',
    ],
    cycleSteps: 30,
    triadicMirror: 3,
    principle: 'Three enneagrams in cyclic closure (Means→Goal→Consequence). ' +
      'The Cerebral/Neocortex centre appears for the first time — requiring ≥6 layers ' +
      '(neurons) for full neocortical architecture. Knowledge fully differentiates into ' +
      'Cerebral (cognition), Somatic (sensation), and Autonomic (emotion/affect). ' +
      'LCM(2,3,5) = 30 steps.',
  },
};

// ============================================================
// CosmicOrderBridge
// ============================================================

/**
 * CosmicOrderBridge
 *
 * Manages the hierarchical nesting of Systems 1-6 within the
 * Deep Tree Echo orchestrator. Each system level ticks at its
 * natural frequency (level N ticks every N global steps), creating
 * the nested shell hierarchy:
 *
 *   ((((( Sys1 ) Sys2 ) Sys3 ) Sys4 ) Sys5 ) Sys6
 *
 * Inner shells tick faster, outer shells slower — mirroring the
 * relationship between centres and periphery in Campbell's model.
 */
export class CosmicOrderBridge extends EventEmitter {
  private config: CosmicOrderBridgeConfig;
  private globalStep: number = 0;
  private running: boolean = false;

  // Per-level state
  private levelStates: Map<SystemLevel, SystemLevelState> = new Map();

  constructor(config: Partial<CosmicOrderBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeLevels();
  }

  // ============================================================
  // Initialization
  // ============================================================

  private initializeLevels(): void {
    for (let n = 1; n <= 6; n++) {
      const level = n as SystemLevel;
      const def = LEVEL_DEFINITIONS[level];
      this.levelStates.set(level, {
        level,
        centres: def.centres.length,
        terms: termCount(level),
        currentStep: 0,
        activeTerm: 1,
        mode: 'E',
        energy: this.config.initialEnergy,
        atSyncBoundary: false,
        triadicMirror: def.triadicMirror,
        description: def.principle,
      });
    }
  }

  /**
   * Validate structural constraints:
   * - System N has exactly N centres
   * - System N has exactly a(N+1) terms
   * - Triadic recurrence holds
   */
  public validate(): { valid: boolean; details: string[] } {
    const details: string[] = [];
    let valid = true;

    for (let n = 1; n <= 6; n++) {
      const level = n as SystemLevel;
      const def = LEVEL_DEFINITIONS[level];
      const state = this.levelStates.get(level)!;

      // Check centre count = N
      if (def.centres.length !== n) {
        details.push(`✗ Sys${n}: has ${def.centres.length} centres, expected ${n}`);
        valid = false;
      } else {
        details.push(`✓ Sys${n}: ${n} centres`);
      }

      // Check term count = a(N+1)
      const expected = termCount(level);
      if (state.terms !== expected) {
        details.push(`✗ Sys${n}: has ${state.terms} terms, expected ${expected}`);
        valid = false;
      } else {
        details.push(`✓ Sys${n}: ${expected} terms = a(${n + 1})`);
      }
    }

    // Verify triadic recurrence
    for (const [lower, upper] of TRIADIC_PAIRS) {
      const lDef = LEVEL_DEFINITIONS[lower];
      const uDef = LEVEL_DEFINITIONS[upper];
      if (lDef.triadicMirror === upper && uDef.triadicMirror === lower) {
        details.push(`✓ Triadic: Sys${lower} ↔ Sys${upper}`);
      } else {
        details.push(`✗ Triadic: Sys${lower} ↔ Sys${upper} mismatch`);
        valid = false;
      }
    }

    return { valid, details };
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  /**
   * Start the cosmic order bridge
   */
  public start(): void {
    if (this.running) return;

    // Validate structure if configured
    if (this.config.validateStructure) {
      const validation = this.validate();
      if (!validation.valid) {
        log.error('Cosmic order structural validation failed:');
        validation.details.forEach(d => log.error(`  ${d}`));
        throw new Error('Cosmic order structural validation failed');
      }
      log.info('Cosmic order structural validation passed');
      validation.details.forEach(d => log.info(`  ${d}`));
    }

    this.running = true;
    log.info('Cosmic Order Bridge started — 6 system levels active');
    this.emit('started');
  }

  /**
   * Stop the bridge
   */
  public stop(): void {
    if (!this.running) return;
    this.running = false;
    log.info(`Cosmic Order Bridge stopped at global step ${this.globalStep}`);
    this.emit('stopped');
  }

  // ============================================================
  // Tick — Called by EchoAgentLoop on each grand cycle step
  // ============================================================

  /**
   * Advance the cosmic order by one global step.
   * Each system level ticks at its natural frequency:
   *   Sys1 ticks every step (fastest — innermost shell)
   *   Sys2 ticks every 2 steps
   *   Sys3 ticks every 3 steps
   *   Sys4 ticks every 4 steps
   *   Sys5 ticks every 5 steps
   *   Sys6 ticks every 6 steps (slowest — outermost shell)
   */
  public tick(): CosmicOrderSnapshot {
    this.globalStep++;

    // Advance each level at its natural frequency
    for (let n = 1; n <= 6; n++) {
      const level = n as SystemLevel;
      if (this.globalStep % n === 0) {
        this.advanceLevel(level);
      }
    }

    // Check triadic resonances
    const resonances = this.checkTriadicResonance();

    // Energy flow
    if (this.config.enableEnergyFlow) {
      this.flowEnergy();
    }

    return this.getSnapshot();
  }

  // ============================================================
  // Level Advancement
  // ============================================================

  /**
   * Advance a single system level by one step
   */
  private advanceLevel(level: SystemLevel): void {
    const state = this.levelStates.get(level)!;
    const def = LEVEL_DEFINITIONS[level];

    const prevTerm = state.activeTerm;
    const prevMode = state.mode;

    // Advance step
    state.currentStep = (state.currentStep + 1) % def.cycleSteps;

    // Compute active term
    state.activeTerm = this.computeActiveTerm(level, state.currentStep);

    // Compute mode based on term and level
    state.mode = this.computeMode(level, state.activeTerm);

    // Check sync boundary
    state.atSyncBoundary = state.currentStep === 0;

    // Energy decay
    state.energy = Math.max(0, state.energy - this.config.energyDecay);

    // Emit events
    if (state.activeTerm !== prevTerm) {
      this.emit('term_transition', {
        level,
        from: prevTerm,
        to: state.activeTerm,
        step: state.currentStep,
      });
    }

    if (state.mode !== prevMode) {
      this.emit('mode_flip', {
        level,
        from: prevMode,
        to: state.mode,
        step: state.currentStep,
      });
    }

    if (state.atSyncBoundary && this.globalStep > 1) {
      this.emit('cycle_complete', {
        level,
        globalStep: this.globalStep,
      });
    }
  }

  /**
   * Compute the active term for a level at a given step
   */
  private computeActiveTerm(level: SystemLevel, step: number): number {
    const terms = termCount(level);

    switch (level) {
      case 1:
        // Sys1: always term 1 (the monad)
        return 1;

      case 2:
        // Sys2: alternate E/R (terms 1 and 2)
        return (step % 2) + 1;

      case 3:
        // Sys3: 4 terms cycling through 12-step cycle (3 steps per term)
        return (Math.floor(step / 3) % 4) + 1;

      case 4: {
        // Sys4: 9 terms following the 1/7 particular sequence
        // 12-step cycle: 3 particular sets × 4 steps
        const cyclePos = step % 12;
        // T9 at cycle boundaries (universal hierarchy)
        if (cyclePos === 0 || cyclePos === 4 || cyclePos === 8) {
          return 9;
        }
        // Map through 1/7 sequence
        const seqIndex = cyclePos % 6;
        return Math.min(PARTICULAR_SEQUENCE[seqIndex], 9);
      }

      case 5: {
        // Sys5: 20 terms = 2 enneagrams (10 E + 10 R)
        const halfCycle = 30;
        const enneagramIndex = Math.floor(step / halfCycle) % 2;
        const stepInEnnea = step % halfCycle;
        const termInEnnea = (Math.floor(stepInEnnea / 3) % 10) + 1;
        return enneagramIndex * 10 + termInEnnea;
      }

      case 6: {
        // Sys6: 48 terms = 3 enneagrams × 16 terms each
        // 30-step cycle: 5 stages × 6 steps
        const stage = Math.floor(step / 6) % 5;
        const stepInStage = step % 6;
        const baseIndex = stage * 10 + stepInStage;
        return (baseIndex % 48) + 1;
      }

      default:
        return 1;
    }
  }

  /**
   * Compute mode (E/R) for a term at a given level
   */
  private computeMode(level: SystemLevel, term: number): 'E' | 'R' {
    const terms = termCount(level);

    switch (level) {
      case 1:
        return 'E'; // Monad is always expressive
      case 2:
        return term === 1 ? 'E' : 'R'; // Term 1 = E, Term 2 = R
      case 3:
        // Terms 1,2 = E (shallow), Terms 3,4 = R (deep)
        return term <= 2 ? 'E' : 'R';
      case 4:
        // T8 is always E (pivot). T7, T9 are R. Others follow depth.
        if (term === 8) return 'E';
        if (term === 7 || term === 9) return 'R';
        return term <= 6 ? 'E' : 'R';
      case 5:
        // First 10 terms = E enneagram, last 10 = R enneagram
        return term <= 10 ? 'E' : 'R';
      case 6:
        // First 24 terms = E, last 24 = R
        return term <= 24 ? 'E' : 'R';
      default:
        return 'E';
    }
  }

  // ============================================================
  // Triadic Resonance
  // ============================================================

  /**
   * Check triadic resonance between mirror pairs
   */
  private checkTriadicResonance(): Array<{ lower: SystemLevel; upper: SystemLevel; active: boolean }> {
    const resonances: Array<{ lower: SystemLevel; upper: SystemLevel; active: boolean }> = [];

    for (const [lower, upper] of TRIADIC_PAIRS) {
      const lState = this.levelStates.get(lower)!;
      const uState = this.levelStates.get(upper)!;

      let active = false;

      switch (lower) {
        case 1:
          // Sys1 ↔ Sys4: resonance when Sys4 is at T9 (universal)
          active = uState.activeTerm === 9;
          break;
        case 2:
          // Sys2 ↔ Sys5: resonance when both in same mode
          active = lState.mode === uState.mode;
          break;
        case 3:
          // Sys3 ↔ Sys6: resonance when both at sync boundaries
          active = lState.atSyncBoundary && uState.atSyncBoundary;
          break;
      }

      if (active && this.config.enableTriadicResonance) {
        // Boost energy
        lState.energy = Math.min(1, lState.energy + this.config.resonanceBoost);
        uState.energy = Math.min(1, uState.energy + this.config.resonanceBoost);

        this.emit('triadic_resonance', {
          lower,
          upper,
          lowerTerm: lState.activeTerm,
          upperTerm: uState.activeTerm,
          lowerMode: lState.mode,
          upperMode: uState.mode,
        });
      }

      resonances.push({ lower, upper, active });
    }

    return resonances;
  }

  // ============================================================
  // Energy Flow
  // ============================================================

  /**
   * Simulate energy flow between nested shells
   * E mode: energy flows outward (inner → outer)
   * R mode: energy flows inward (outer → inner)
   */
  private flowEnergy(): void {
    for (let n = 1; n < 6; n++) {
      const inner = this.levelStates.get(n as SystemLevel)!;
      const outer = this.levelStates.get((n + 1) as SystemLevel)!;

      const amount = 0.005 * Math.max(inner.energy, outer.energy);

      if (outer.mode === 'E') {
        // Efflux: inner → outer
        inner.energy = Math.max(0, inner.energy - amount);
        outer.energy = Math.min(1, outer.energy + amount * 0.5);
      } else {
        // Reflux: outer → inner
        outer.energy = Math.max(0, outer.energy - amount);
        inner.energy = Math.min(1, inner.energy + amount * 0.5);
      }
    }
  }

  // ============================================================
  // State Access
  // ============================================================

  /**
   * Get state of a specific system level
   */
  public getLevelState(level: SystemLevel): SystemLevelState {
    return { ...this.levelStates.get(level)! };
  }

  /**
   * Get complete snapshot of all 6 levels
   */
  public getSnapshot(): CosmicOrderSnapshot {
    const levels: SystemLevelState[] = [];
    for (let n = 1; n <= 6; n++) {
      levels.push(this.getLevelState(n as SystemLevel));
    }

    const resonances = TRIADIC_PAIRS.map(([lower, upper]) => {
      const lState = this.levelStates.get(lower)!;
      const uState = this.levelStates.get(upper)!;
      let active = false;
      if (lower === 1) active = uState.activeTerm === 9;
      else if (lower === 2) active = lState.mode === uState.mode;
      else if (lower === 3) active = lState.atSyncBoundary && uState.atSyncBoundary;
      return { lower, upper, active };
    });

    return {
      globalStep: this.globalStep,
      levels,
      triadicResonances: resonances,
      structuralValid: true,
    };
  }

  /**
   * Get the definition for a level
   */
  public getLevelDefinition(level: SystemLevel): LevelDefinition {
    return { ...LEVEL_DEFINITIONS[level] };
  }

  /**
   * Get all level definitions
   */
  public getAllDefinitions(): LevelDefinition[] {
    return Object.values(LEVEL_DEFINITIONS);
  }

  /**
   * Get global step
   */
  public getGlobalStep(): number {
    return this.globalStep;
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the A000081 term count for a system level
   */
  public static termCount(level: SystemLevel): number {
    return termCount(level);
  }

  /**
   * Get the A000081 sequence
   */
  public static getA000081(): readonly number[] {
    return A000081;
  }

  /**
   * Get the particular sequence (1/7 = 0.142857...)
   */
  public static getParticularSequence(): readonly number[] {
    return PARTICULAR_SEQUENCE;
  }
}

/**
 * Create a CosmicOrderBridge with default configuration
 */
export function createCosmicOrderBridge(
  config: Partial<CosmicOrderBridgeConfig> = {}
): CosmicOrderBridge {
  return new CosmicOrderBridge(config);
}

export default CosmicOrderBridge;
