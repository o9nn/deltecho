/**
 * @fileoverview Complete S-Gram Table — Multi-Row k/d Families
 *
 * For each System N (N >= 3), the s-gram table contains all rows k/d
 * where k and d = (N-1)(N-2)+1 produce distinct periodic sequences
 * in the native radix base b = (N-1)²+1.
 *
 * Each row belongs to a multiplicative orbit under ×b mod d.
 * Orbits of coprime k have period 6 (full rows).
 * Orbits of non-coprime k have period 2 (short rows, reducing to lower system).
 *
 * The table also includes the "simple" 1/k multiples sequence for each
 * system boundary: 1/(N-1) → [(N-1), 2(N-1), ..., (N-1)²].
 *
 * Term classification (from System Block Values):
 *   u = unity (Sys1 only — the undifferentiated whole)
 *   o = ordinary (Expressive half — first terms)
 *   s = special (Regenerative half — complement terms)
 *   x = cross (the crossing point between E and R)
 *
 * References:
 *   Campbell, A.B. "The System of the Cosmic Order"
 *   Mathar, R.J. "Topologies of non-intersecting circles"
 */

import { type SystemLevel } from './types.js';
import {
  sgramDenominator,
  nativeBase,
  divisions,
  kadOrder,
  repeatingExpansion,
} from './sgram-sequences.js';

// ============================================================
// Multiplicative Orbit Computation
// ============================================================

/**
 * Compute the multiplicative orbit of k under ×base mod d.
 * The orbit is the set {k, k·b, k·b², ...} mod d until it cycles.
 */
export function multiplicativeOrbit(k: number, base: number, d: number): number[] {
  const orbit: number[] = [];
  const seen = new Set<number>();
  let x = ((k % d) + d) % d;

  while (!seen.has(x) && x !== 0) {
    seen.add(x);
    orbit.push(x);
    x = (x * base) % d;
  }

  return orbit;
}

/**
 * Find the canonical representative (smallest element) of an orbit.
 */
export function orbitRepresentative(orbit: number[]): number {
  return Math.min(...orbit);
}

/**
 * Compute all distinct orbits for a given d and base.
 * Returns orbits grouped by their canonical representative.
 */
export function allOrbits(d: number, base: number): Map<number, number[]> {
  const orbits = new Map<number, number[]>();
  const assigned = new Set<number>();

  for (let k = 1; k < d; k++) {
    if (assigned.has(k)) continue;

    const orbit = multiplicativeOrbit(k, base, d);
    const rep = orbitRepresentative(orbit);

    orbits.set(rep, orbit);
    for (const x of orbit) {
      assigned.add(x);
    }
  }

  return orbits;
}

// ============================================================
// S-Gram Row
// ============================================================

/**
 * A single row in the s-gram table: k/d in base b
 */
export interface SGramRow {
  /** Numerator k */
  numerator: number;
  /** Denominator d */
  denominator: number;
  /** Native radix base */
  base: number;
  /** The period digits (length 6 for full rows, 2 for short rows) */
  period: number[];
  /** Period length */
  periodLength: number;
  /** Whether this is a full (period-6) or short (period-2) row */
  isFull: boolean;
  /** The multiplicative orbit this row belongs to */
  orbit: number[];
  /** Canonical representative of the orbit */
  orbitRep: number;
  /** GCD of numerator and denominator (1 for coprime/full rows) */
  gcd: number;
  /** If short row: the reduced fraction k/d = k'/d' */
  reducedNumerator?: number;
  /** If short row: the reduced denominator */
  reducedDenominator?: number;
  /** Complementary pairs (for full rows): each pair sums to divisions */
  complementaryPairs: Array<[number, number]>;
}

function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Build a single s-gram row for k/d in base b
 */
export function buildSGramRow(k: number, d: number, b: number): SGramRow {
  const expansion = repeatingExpansion(k, d, b);
  const period = expansion.period.length > 0 ? expansion.period : expansion.prefix;
  const periodLength = period.length;
  const g = gcd(k, d);
  const div = b - 1; // divisions = base - 1

  const orbit = multiplicativeOrbit(k, b, d);
  const orbitRep = orbitRepresentative(orbit);

  // Build complementary pairs for full (period-6) rows
  const complementaryPairs: Array<[number, number]> = [];
  if (periodLength === 6) {
    for (let i = 0; i < 3; i++) {
      complementaryPairs.push([period[i], period[3 + i]]);
    }
  } else if (periodLength === 2) {
    complementaryPairs.push([period[0], period[1]]);
  }

  const row: SGramRow = {
    numerator: k,
    denominator: d,
    base: b,
    period,
    periodLength,
    isFull: periodLength === 6,
    orbit,
    orbitRep,
    gcd: g,
    complementaryPairs,
  };

  if (g > 1) {
    row.reducedNumerator = k / g;
    row.reducedDenominator = d / g;
  }

  return row;
}

// ============================================================
// Simple Multiples Sequence
// ============================================================

/**
 * The "simple" 1/k multiples sequence for system boundary.
 * For System N, this is 1/(N-1) → [(N-1), 2(N-1), ..., (N-1)²]
 * which gives the k-ad order multiples up to divisions.
 */
export interface SimpleSequence {
  /** The fraction 1/k */
  k: number;
  /** The multiples */
  multiples: number[];
}

/**
 * Build the simple multiples sequence for a system level
 */
export function buildSimpleSequence(level: SystemLevel): SimpleSequence {
  const k = level - 1;
  // The simple sequence is 1/k in the native base, giving k multiples
  // up to k² = divisions. These are: k, 2k, 3k, ..., k·k
  const multiples: number[] = [];
  for (let i = 1; i <= k; i++) {
    multiples.push(k * i);
  }
  return { k, multiples };
}

// ============================================================
// Term Classification
// ============================================================

/**
 * Term classification in the System Block Values
 */
export type TermClass = 'u' | 'o' | 's' | 'x';

/**
 * A term in the system block values
 */
export interface BlockTerm {
  /** Term index (1-based) */
  index: number;
  /** Term value (the block value) */
  value: number;
  /** Factored representation as product of primes/composites */
  factored: string;
  /** Parenthesized tree notation */
  parenthesized: string;
  /** Classification: u/o/s/x */
  classification: TermClass;
}

/**
 * Canonical term values for Systems 1-6 from the reference image.
 * These are the "block values" — the product representations of each rooted tree.
 */
export const BLOCK_VALUES: Record<number, number[]> = {
  1: [2],
  2: [4, 3],
  3: [8, 6, 7, 5],
  4: [16, 12, 14, 10, 9, 19, 13, 17, 11],
  5: [32, 24, 28, 20, 18, 38, 26, 34, 22, 21, 15, 53, 37, 43, 29, 23, 67, 41, 59, 31],
};

/**
 * Canonical term classifications for Systems 1-6.
 */
export const BLOCK_CLASSIFICATIONS: Record<number, TermClass[]> = {
  1: ['u'],
  2: ['o', 's'],
  3: ['o', 'o', 's', 's'],
  4: ['o', 'o', 'o', 'o', 'x', 's', 's', 's', 's'],
  5: ['o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'x', 'x', 's', 's', 's', 's', 's', 's', 's', 's', 's'],
};

/**
 * Get the classification counts for a system level
 */
export function classificationCounts(level: SystemLevel): {
  ordinary: number;
  special: number;
  cross: number;
  unity: number;
  total: number;
} {
  const classes = BLOCK_CLASSIFICATIONS[level];
  if (!classes) {
    return { ordinary: 0, special: 0, cross: 0, unity: 0, total: 0 };
  }

  return {
    ordinary: classes.filter(c => c === 'o').length,
    special: classes.filter(c => c === 's').length,
    cross: classes.filter(c => c === 'x').length,
    unity: classes.filter(c => c === 'u').length,
    total: classes.length,
  };
}

// ============================================================
// Complete S-Gram Table
// ============================================================

/**
 * Complete s-gram table for a system level
 */
export interface SGramTable {
  /** System level */
  level: SystemLevel;
  /** Denominator d(N) */
  denominator: number;
  /** Native radix base b(N) */
  base: number;
  /** Divisions = (N-1)² */
  divisions: number;
  /** k-ad order = N-1 */
  kadOrder: number;
  /** All rows in the table, keyed by numerator */
  rows: Map<number, SGramRow>;
  /** Full (period-6) rows only */
  fullRows: SGramRow[];
  /** Short (period-2) rows only */
  shortRows: SGramRow[];
  /** All multiplicative orbits */
  orbits: Map<number, number[]>;
  /** Simple multiples sequence */
  simpleSequence: SimpleSequence;
  /** Term block values (if available for this level) */
  blockValues?: number[];
  /** Term classifications (if available) */
  blockClassifications?: TermClass[];
}

/**
 * Build the complete s-gram table for a system level.
 * Computes all k/d rows by finding orbit representatives.
 */
export function buildSGramTable(level: SystemLevel): SGramTable | null {
  if (level < 3) return null;

  const d = sgramDenominator(level);
  const b = nativeBase(level);
  const div = divisions(level);
  const k = kadOrder(level);

  // Find all orbits
  const orbits = allOrbits(d, b);

  // Build rows for each orbit representative
  const rows = new Map<number, SGramRow>();
  const fullRows: SGramRow[] = [];
  const shortRows: SGramRow[] = [];

  for (const [rep, orbit] of orbits) {
    const row = buildSGramRow(rep, d, b);
    rows.set(rep, row);

    if (row.isFull) {
      fullRows.push(row);
    } else {
      shortRows.push(row);
    }
  }

  // Sort rows by numerator
  fullRows.sort((a, b) => a.numerator - b.numerator);
  shortRows.sort((a, b) => a.numerator - b.numerator);

  const table: SGramTable = {
    level,
    denominator: d,
    base: b,
    divisions: div,
    kadOrder: k,
    rows,
    fullRows,
    shortRows,
    orbits,
    simpleSequence: buildSimpleSequence(level),
  };

  if (BLOCK_VALUES[level]) {
    table.blockValues = BLOCK_VALUES[level];
  }
  if (BLOCK_CLASSIFICATIONS[level]) {
    table.blockClassifications = BLOCK_CLASSIFICATIONS[level];
  }

  return table;
}

/**
 * Build s-gram tables for all system levels 3-6
 */
export function buildAllSGramTables(): Map<SystemLevel, SGramTable> {
  const tables = new Map<SystemLevel, SGramTable>();
  for (let n = 3; n <= 6; n++) {
    const table = buildSGramTable(n as SystemLevel);
    if (table) tables.set(n as SystemLevel, table);
  }
  return tables;
}

/**
 * Verify that all complementary pairs in a table sum to divisions
 */
export function verifySGramTable(table: SGramTable): {
  valid: boolean;
  allPairsSumToDiv: boolean;
  allOrbitsSize6or2: boolean;
  rowCount: number;
  fullRowCount: number;
  shortRowCount: number;
} {
  let allPairsSumToDiv = true;
  let allOrbitsSize6or2 = true;

  for (const row of [...table.fullRows, ...table.shortRows]) {
    for (const [a, b] of row.complementaryPairs) {
      if (a + b !== table.divisions) {
        allPairsSumToDiv = false;
      }
    }
    if (row.orbit.length !== 6 && row.orbit.length !== 2) {
      allOrbitsSize6or2 = false;
    }
  }

  return {
    valid: allPairsSumToDiv && allOrbitsSize6or2,
    allPairsSumToDiv,
    allOrbitsSize6or2,
    rowCount: table.fullRows.length + table.shortRows.length,
    fullRowCount: table.fullRows.length,
    shortRowCount: table.shortRows.length,
  };
}
