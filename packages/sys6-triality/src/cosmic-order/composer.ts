/**
 * @fileoverview CosmicOrderComposer — Runtime engine for sys1-6 hierarchical composition
 *
 * Nests all 6 system levels into a coherent hierarchy where each level
 * contains and governs the levels below it. The composer manages:
 *
 * 1. Hierarchical shell nesting: Sys6 → Sys5 → Sys4 → Sys3 → Sys2 → Sys1
 * 2. Triadic resonance: Sys1↔Sys4, Sys2↔Sys5, Sys3↔Sys6
 * 3. Energy flow between centres at each level
 * 4. Synchronization boundaries at mod-2/mod-3/mod-5 points
 * 5. The 12-step creative cycle (3 particular sets × 4 steps)
 * 6. The 1/7 particular sequence: 1→4→2→8→5→7
 *
 * The composer implements the operadic morphism:
 *   Sys6 := σ ∘ (φ ∘ μ ∘ (Δ₂ ⊗ Δ₃ ⊗ id_P))
 * where each system level contributes its own generators.
 */

import { EventEmitter } from 'events';
import {
  type SystemLevel,
  type SystemDefinition,
  type CosmicShell,
  type ShellState,
  type CompositionEvent,
  type EnergyFlow,
  type CosmicOrderState,
  type TermMode,
  A000081,
  PARTICULAR_SEQUENCE,
  TRIADIC_RECURRENCE,
} from './types.js';
import {
  getSystemDefinition,
  getAllSystemDefinitions,
  verifyA000081Constraint,
  verifyTriadicRecurrence,
} from './definitions.js';

// ============================================================
// Configuration
// ============================================================

export interface CosmicOrderConfig {
  /** Tick interval in milliseconds */
  tickIntervalMs: number;
  /** Enable triadic resonance coupling */
  enableTriadicResonance: boolean;
  /** Enable energy flow simulation */
  enableEnergyFlow: boolean;
  /** Enable telemetry events */
  enableTelemetry: boolean;
  /** Initial energy level for all shells [0, 1] */
  initialEnergy: number;
  /** Energy decay per tick */
  energyDecayPerTick: number;
  /** Energy recovery from resonance */
  resonanceEnergyBoost: number;
}

const DEFAULT_CONFIG: CosmicOrderConfig = {
  tickIntervalMs: 100,
  enableTriadicResonance: true,
  enableEnergyFlow: true,
  enableTelemetry: true,
  initialEnergy: 1.0,
  energyDecayPerTick: 0.01,
  resonanceEnergyBoost: 0.05,
};

// ============================================================
// CosmicOrderComposer
// ============================================================

export class CosmicOrderComposer extends EventEmitter {
  private config: CosmicOrderConfig;
  private systems: Map<SystemLevel, SystemDefinition>;
  private shell: CosmicShell;
  private globalStep: number = 0;
  private running: boolean = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  // Per-level step counters
  private levelSteps: Map<SystemLevel, number> = new Map();

  // The 12-step creative cycle state (for Sys4)
  private particularSetIndex: number = 0;
  private cycleNumber: number = 0;

  constructor(config: Partial<CosmicOrderConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.systems = getAllSystemDefinitions();
    this.shell = this.buildNestedShell();

    // Initialize level step counters
    for (let n = 1; n <= 6; n++) {
      this.levelSteps.set(n as SystemLevel, 0);
    }
  }

  // ============================================================
  // Shell Construction
  // ============================================================

  /**
   * Build the nested shell hierarchy: Sys6 contains Sys5 contains ... Sys1
   *
   * The shell structure mirrors the rooted tree nesting:
   *   ((((( Sys1 ) Sys2 ) Sys3 ) Sys4 ) Sys5 ) Sys6
   */
  private buildNestedShell(): CosmicShell {
    const makeState = (): ShellState => ({
      currentStep: 0,
      activeTerm: 1,
      mode: 'E',
      energy: this.config.initialEnergy,
      atSyncBoundary: false,
    });

    // Build inside-out: Sys1 is the innermost shell
    const sys1: CosmicShell = { level: 1, children: [], state: makeState() };
    const sys2: CosmicShell = { level: 2, children: [sys1], state: makeState() };
    const sys3: CosmicShell = { level: 3, children: [sys2], state: makeState() };
    const sys4: CosmicShell = { level: 4, children: [sys3], state: makeState() };
    const sys5: CosmicShell = { level: 5, children: [sys4], state: makeState() };
    const sys6: CosmicShell = { level: 6, children: [sys5], state: makeState() };

    return sys6;
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  /**
   * Verify structural integrity before starting
   */
  public verify(): { a000081Valid: boolean; triadicValid: boolean; details: string } {
    const a000081 = verifyA000081Constraint();
    const triadic = verifyTriadicRecurrence();

    const details = [
      'A000081 Constraint (System N has a(N+1) terms):',
      ...a000081.results.map(r =>
        `  Sys${r.level}: ${r.actual} terms (expected ${r.expected}) ${r.valid ? '✓' : '✗'}`
      ),
      '',
      'Triadic Recurrence:',
      ...triadic.pairs.map(p =>
        `  Sys${p.lower} ↔ Sys${p.upper}: ${p.principle}`
      ),
    ].join('\n');

    return {
      a000081Valid: a000081.valid,
      triadicValid: triadic.valid,
      details,
    };
  }

  /**
   * Start the cosmic order composition
   */
  public start(): void {
    if (this.running) return;
    this.running = true;

    this.tickTimer = setInterval(() => {
      this.tick();
    }, this.config.tickIntervalMs);

    this.emitEvent({
      type: 'system_tick',
      level: 6,
      step: 0,
      data: { action: 'started' },
    });
  }

  /**
   * Stop the composition
   */
  public stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    this.emitEvent({
      type: 'system_tick',
      level: 6,
      step: this.globalStep,
      data: { action: 'stopped' },
    });
  }

  /**
   * Execute a single tick of the composition
   */
  public tick(): void {
    this.globalStep++;

    // Advance each system level according to its cycle structure
    this.advanceShell(this.shell);

    // Check triadic resonances
    if (this.config.enableTriadicResonance) {
      this.checkTriadicResonance();
    }

    // Simulate energy flow
    if (this.config.enableEnergyFlow) {
      this.simulateEnergyFlow();
    }

    // Emit telemetry
    if (this.config.enableTelemetry) {
      this.emitEvent({
        type: 'system_tick',
        level: 6,
        step: this.globalStep,
        data: this.getSnapshot(),
      });
    }
  }

  // ============================================================
  // Shell Advancement
  // ============================================================

  /**
   * Recursively advance a shell and its children
   */
  private advanceShell(shell: CosmicShell): void {
    const level = shell.level;
    const sysDef = this.systems.get(level)!;
    const levelStep = (this.levelSteps.get(level) || 0) + 1;
    this.levelSteps.set(level, levelStep);

    // Determine if this level should advance based on divisor hierarchy
    // Sys1 ticks every step, Sys2 every 2, Sys3 every 3, etc.
    // This creates the nested shell timing: inner shells tick faster
    const shouldAdvance = this.globalStep % level === 0;

    if (shouldAdvance) {
      const prevTerm = shell.state.activeTerm;
      const prevMode = shell.state.mode;

      // Advance step within cycle
      shell.state.currentStep = (shell.state.currentStep + 1) % sysDef.cycleSteps;

      // Determine active term based on system level
      shell.state.activeTerm = this.computeActiveTerm(level, shell.state.currentStep, sysDef);

      // Determine mode
      const term = sysDef.terms[shell.state.activeTerm - 1];
      if (term) {
        shell.state.mode = term.mode;
      }

      // Check sync boundaries
      shell.state.atSyncBoundary = this.isAtSyncBoundary(level, shell.state.currentStep);

      // Energy decay
      shell.state.energy = Math.max(0, shell.state.energy - this.config.energyDecayPerTick);

      // Emit term transition
      if (shell.state.activeTerm !== prevTerm) {
        this.emitEvent({
          type: 'term_transition',
          level,
          step: shell.state.currentStep,
          data: {
            from: prevTerm,
            to: shell.state.activeTerm,
            parens: term?.parens,
          },
        });
      }

      // Emit mode flip
      if (shell.state.mode !== prevMode) {
        this.emitEvent({
          type: 'mode_flip',
          level,
          step: shell.state.currentStep,
          data: { from: prevMode, to: shell.state.mode },
        });
      }

      // Emit sync boundary
      if (shell.state.atSyncBoundary) {
        this.emitEvent({
          type: 'sync_boundary',
          level,
          step: shell.state.currentStep,
          data: { globalStep: this.globalStep },
        });
      }

      // Cycle completion
      if (shell.state.currentStep === 0 && levelStep > 1) {
        this.emitEvent({
          type: 'cycle_complete',
          level,
          step: shell.state.currentStep,
          data: { cycleNumber: Math.floor(levelStep / sysDef.cycleSteps) },
        });
      }
    }

    // Recurse into children
    for (const child of shell.children) {
      this.advanceShell(child);
    }
  }

  /**
   * Compute the active term for a given system level and step
   */
  private computeActiveTerm(level: SystemLevel, step: number, sysDef: SystemDefinition): number {
    switch (level) {
      case 1:
        // Sys1: always term 1 (the monad)
        return 1;

      case 2:
        // Sys2: alternate between E and R (terms 1 and 2)
        return (step % 2) + 1;

      case 3:
        // Sys3: 4 terms cycling through 12-step cycle
        // Each term active for 3 steps
        return (Math.floor(step / 3) % 4) + 1;

      case 4: {
        // Sys4: 9 terms following the 1/7 particular sequence
        // 12-step cycle: 3 particular sets × 4 steps
        // The particular sequence maps step to term
        const cyclePos = step % 12;
        const setIndex = Math.floor(cyclePos / 4);
        const stepInSet = cyclePos % 4;

        // Map through 1/7 sequence with set offset
        const seqIndex = (stepInSet * 2 + setIndex) % 6;
        const termNumber = PARTICULAR_SEQUENCE[seqIndex];

        // Terms 1-8 are particular, T9 is universal
        if (cyclePos === 0 || cyclePos === 4 || cyclePos === 8) {
          return 9; // T9 at cycle boundaries (universal)
        }
        return Math.min(termNumber, 9);
      }

      case 5: {
        // Sys5: 20 terms = 2 enneagrams
        // First 10 terms = Expressive enneagram, last 10 = Regenerative
        const enneagramIndex = Math.floor(step / 30); // Which enneagram
        const stepInEnnea = step % 30;
        const termInEnnea = (Math.floor(stepInEnnea / 3) % 10) + 1;
        return enneagramIndex * 10 + termInEnnea;
      }

      case 6: {
        // Sys6: 48 terms = 3 enneagrams in cyclic closure
        // 30-step cycle: 5 stages × 6 steps
        const stage = Math.floor(step / 6) % 5;
        const stepInStage = step % 6;
        // Map to one of 48 terms based on stage and step
        const baseTermIndex = stage * 10 + stepInStage;
        return (baseTermIndex % 48) + 1;
      }

      default:
        return 1;
    }
  }

  /**
   * Check if a system level is at a synchronization boundary
   */
  private isAtSyncBoundary(level: SystemLevel, step: number): boolean {
    switch (level) {
      case 1: return true; // Sys1 is always at boundary (monad)
      case 2: return step % 2 === 0; // Dyadic boundary
      case 3: return step % 3 === 0; // Triadic boundary
      case 4: return step % 4 === 0; // Tetradic boundary (12-step / 3 sets)
      case 5: return step % 5 === 0; // Pentadic boundary
      case 6: return step % 6 === 0; // Hexadic boundary (stage boundary)
      default: return false;
    }
  }

  // ============================================================
  // Triadic Resonance
  // ============================================================

  /**
   * Check for triadic resonance between mirror systems
   *
   * Resonance occurs when mirror systems are at compatible steps:
   *   Sys1 ↔ Sys4: when Sys4 completes a cycle, Sys1 resonates
   *   Sys2 ↔ Sys5: when both are in same E/R mode
   *   Sys3 ↔ Sys6: when both are at triadic closure points
   */
  private checkTriadicResonance(): void {
    const pairs: Array<[SystemLevel, SystemLevel]> = [[1, 4], [2, 5], [3, 6]];

    for (const [lower, upper] of pairs) {
      const lowerShell = this.findShell(lower);
      const upperShell = this.findShell(upper);
      if (!lowerShell || !upperShell) continue;

      let resonating = false;

      switch (lower) {
        case 1:
          // Sys1 ↔ Sys4: resonance when Sys4 is at T9 (universal hierarchy)
          resonating = upperShell.state.activeTerm === 9;
          break;
        case 2:
          // Sys2 ↔ Sys5: resonance when both in same mode
          resonating = lowerShell.state.mode === upperShell.state.mode;
          break;
        case 3:
          // Sys3 ↔ Sys6: resonance when both at sync boundaries
          resonating = lowerShell.state.atSyncBoundary && upperShell.state.atSyncBoundary;
          break;
      }

      if (resonating) {
        // Boost energy in both shells
        lowerShell.state.energy = Math.min(1, lowerShell.state.energy + this.config.resonanceEnergyBoost);
        upperShell.state.energy = Math.min(1, upperShell.state.energy + this.config.resonanceEnergyBoost);

        this.emitEvent({
          type: 'triadic_resonance',
          level: lower,
          step: this.globalStep,
          data: {
            pair: [lower, upper],
            lowerMode: lowerShell.state.mode,
            upperMode: upperShell.state.mode,
            lowerTerm: lowerShell.state.activeTerm,
            upperTerm: upperShell.state.activeTerm,
          },
        });
      }
    }
  }

  // ============================================================
  // Energy Flow
  // ============================================================

  /**
   * Simulate energy flow between centres at each level
   *
   * Energy flows follow the efflux/reflux pattern:
   *   Efflux: outward from inner shells to outer (E mode)
   *   Reflux: inward from outer shells to inner (R mode)
   */
  private simulateEnergyFlow(): void {
    const flows: EnergyFlow[] = [];

    // Energy flows from inner to outer in E mode, outer to inner in R mode
    this.traverseShell(this.shell, (shell) => {
      for (const child of shell.children) {
        const direction: 'efflux' | 'reflux' = shell.state.mode === 'E' ? 'efflux' : 'reflux';
        const amount = 0.01 * shell.state.energy;

        if (direction === 'efflux') {
          // Inner → outer
          child.state.energy = Math.max(0, child.state.energy - amount);
          shell.state.energy = Math.min(1, shell.state.energy + amount * 0.5);
        } else {
          // Outer → inner
          shell.state.energy = Math.max(0, shell.state.energy - amount);
          child.state.energy = Math.min(1, child.state.energy + amount * 0.5);
        }

        flows.push({
          from: direction === 'efflux' ? child.level : shell.level,
          to: direction === 'efflux' ? shell.level : child.level,
          direction,
          amount,
        });
      }
    });

    if (flows.length > 0) {
      this.emitEvent({
        type: 'energy_flow',
        level: 6,
        step: this.globalStep,
        data: { flows },
      });
    }
  }

  // ============================================================
  // Shell Navigation
  // ============================================================

  /**
   * Find a shell by level in the hierarchy
   */
  public findShell(level: SystemLevel): CosmicShell | null {
    return this.findShellRecursive(this.shell, level);
  }

  private findShellRecursive(shell: CosmicShell, level: SystemLevel): CosmicShell | null {
    if (shell.level === level) return shell;
    for (const child of shell.children) {
      const found = this.findShellRecursive(child, level);
      if (found) return found;
    }
    return null;
  }

  /**
   * Traverse all shells depth-first
   */
  private traverseShell(shell: CosmicShell, fn: (shell: CosmicShell) => void): void {
    fn(shell);
    for (const child of shell.children) {
      this.traverseShell(child, fn);
    }
  }

  // ============================================================
  // State Access
  // ============================================================

  /**
   * Get the current state of a specific system level
   */
  public getSystemState(level: SystemLevel): {
    definition: SystemDefinition;
    shell: ShellState;
    levelStep: number;
  } | null {
    const shell = this.findShell(level);
    if (!shell) return null;
    const definition = this.systems.get(level)!;
    return {
      definition,
      shell: { ...shell.state },
      levelStep: this.levelSteps.get(level) || 0,
    };
  }

  /**
   * Get a snapshot of the entire composition state
   */
  public getSnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {
      globalStep: this.globalStep,
      running: this.running,
      systems: {} as Record<string, unknown>,
    };

    for (let n = 1; n <= 6; n++) {
      const level = n as SystemLevel;
      const state = this.getSystemState(level);
      if (state) {
        (snapshot.systems as Record<string, unknown>)[`sys${n}`] = {
          centres: state.definition.centreCount,
          terms: state.definition.termCount,
          activeTerm: state.shell.activeTerm,
          mode: state.shell.mode,
          energy: Math.round(state.shell.energy * 1000) / 1000,
          step: state.shell.currentStep,
          atSync: state.shell.atSyncBoundary,
        };
      }
    }

    return snapshot;
  }

  /**
   * Get the complete state for CosmicOrderState interface
   */
  public getFullState(): CosmicOrderState {
    return {
      systems: this.systems,
      shell: this.shell,
      globalStep: this.globalStep,
      energyFlows: [],
      triadicResonances: [],
    };
  }

  /**
   * Get the nested shell hierarchy
   */
  public getShell(): CosmicShell {
    return this.shell;
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

  // ============================================================
  // Event Emission
  // ============================================================

  private emitEvent(event: CompositionEvent): void {
    this.emit('composition_event', event);
    this.emit(event.type, event);
  }
}

/**
 * Create a CosmicOrderComposer with default configuration
 */
export function createCosmicOrderComposer(
  config: Partial<CosmicOrderConfig> = {}
): CosmicOrderComposer {
  return new CosmicOrderComposer(config);
}

export default CosmicOrderComposer;
