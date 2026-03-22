/**
 * @fileoverview Campbell's System of the Cosmic Order — Type Definitions
 *
 * System N has N centres and a(N+1) terms, where a(n) = OEIS A000081
 * (unlabeled rooted trees on n nodes).
 *
 * The 6 Systems nest hierarchically with triadic recurrence:
 *   Sys1 ↔ Sys4  (monad ↔ enneagram)
 *   Sys2 ↔ Sys5  (dyad E/R ↔ dual enneagram E/R)
 *   Sys3 ↔ Sys6  (triadic closure ↔ triadic closure of enneagrams)
 *
 * Each System level adds one centre and generates new topological
 * configurations (terms) counted by A000081.
 */

// ============================================================
// A000081 Sequence — Canonical Term Counts
// ============================================================

/**
 * A000081 values for n = 0..8
 * a(n) = number of unlabeled rooted trees on n nodes
 */
export const A000081: readonly number[] = [0, 1, 1, 2, 4, 9, 20, 48, 115] as const;

/**
 * System N has a(N+1) terms
 */
export function systemTermCount(n: number): number {
  if (n < 1 || n > 7) throw new RangeError(`System ${n} out of range [1..7]`);
  return A000081[n + 1];
}

// ============================================================
// System Level Definitions
// ============================================================

/** System level identifier */
export type SystemLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Mode of a term: Expressive (outward) or Regenerative (inward) */
export type TermMode = 'E' | 'R';

/** Centre role within a System */
export interface Centre {
  /** Centre index (1-based within system) */
  index: number;
  /** Centre name following Campbell's naming */
  name: string;
  /** Alternative name (physical/biological mapping) */
  altName: string;
  /** Role description */
  role: string;
}

/** A Term is a specific topological configuration of centres */
export interface Term {
  /** Term index (1-based within system) */
  index: number;
  /** Parenthesis word encoding (rooted tree) */
  parens: string;
  /** Mode: Expressive or Regenerative */
  mode: TermMode;
  /** Which centres are active in this term */
  activeCentres: number[];
  /** Nesting depth of the rooted tree */
  depth: number;
  /** Description of this term's function */
  description: string;
}

/** The 1/7 = 0.142857... particular sequence */
export const PARTICULAR_SEQUENCE = [1, 4, 2, 8, 5, 7] as const;

// ============================================================
// System Definitions
// ============================================================

/**
 * Complete definition of a System level
 */
export interface SystemDefinition {
  /** System level N */
  level: SystemLevel;
  /** Number of centres = N */
  centreCount: number;
  /** Number of terms = a(N+1) */
  termCount: number;
  /** Number of nodes in rooted trees = N+1 */
  nodeCount: number;
  /** The centres */
  centres: Centre[];
  /** The terms (rooted tree configurations) */
  terms: Term[];
  /** Triadic mirror: which system this mirrors at higher order */
  triadicMirror: SystemLevel | null;
  /** Structural principle */
  principle: string;
  /** Step count for this system's cycle */
  cycleSteps: number;
}

/**
 * Triadic recurrence mapping
 * Sys1 ↔ Sys4: monad ↔ enneagram
 * Sys2 ↔ Sys5: dyad E/R ↔ dual enneagram E/R
 * Sys3 ↔ Sys6: triadic closure ↔ triadic closure of enneagrams
 */
export const TRIADIC_RECURRENCE: ReadonlyMap<SystemLevel, SystemLevel> = new Map([
  [1, 4],
  [2, 5],
  [3, 6],
  [4, 1],
  [5, 2],
  [6, 3],
]);

// ============================================================
// Hierarchical Nesting
// ============================================================

/**
 * A nested shell represents the hierarchical containment
 * of systems within systems.
 *
 * Example: ((pro) org) glo
 *   = Sys3 shell containing Sys2 containing Sys1
 */
export interface CosmicShell {
  /** The system level of this shell */
  level: SystemLevel;
  /** Child shells contained within */
  children: CosmicShell[];
  /** State of this shell */
  state: ShellState;
}

/**
 * State of a shell at a given moment
 */
export interface ShellState {
  /** Current step within this system's cycle */
  currentStep: number;
  /** Current active term index */
  activeTerm: number;
  /** Current mode */
  mode: TermMode;
  /** Energy level [0, 1] */
  energy: number;
  /** Whether this shell is in a sync boundary */
  atSyncBoundary: boolean;
}

// ============================================================
// Composition Events
// ============================================================

/**
 * Events emitted during system composition
 */
export interface CompositionEvent {
  type:
    | 'system_tick'
    | 'term_transition'
    | 'mode_flip'
    | 'sync_boundary'
    | 'triadic_resonance'
    | 'energy_flow'
    | 'cycle_complete';
  level: SystemLevel;
  step: number;
  data: Record<string, unknown>;
}

// ============================================================
// Energy Flow
// ============================================================

/**
 * Energy flow between centres
 */
export interface EnergyFlow {
  /** Source centre index */
  from: number;
  /** Destination centre index */
  to: number;
  /** Direction: efflux (outward) or reflux (inward) */
  direction: 'efflux' | 'reflux';
  /** Amount of energy transferred */
  amount: number;
}

/**
 * Complete state of the 6-system composition
 */
export interface CosmicOrderState {
  /** State of each system level */
  systems: Map<SystemLevel, SystemDefinition>;
  /** Nested shell hierarchy */
  shell: CosmicShell;
  /** Global step counter */
  globalStep: number;
  /** Energy flows in current step */
  energyFlows: EnergyFlow[];
  /** Active triadic resonances */
  triadicResonances: Array<[SystemLevel, SystemLevel]>;
}
