/**
 * @fileoverview S-Gram Periodic Sequences
 *
 * The 2nd-order s-grams define the native radix base and periodic
 * structure of each system (N >= 3). The key relationships:
 *
 *   Denominator:  d(N) = (N-1)(N-2) + 1 = N² - 3N + 3
 *   k-ad order:   k(N) = N - 1
 *   Divisions:    div(N) = k² = (N-1)²
 *   Native base:  b(N) = div + 1 = (N-1)² + 1
 *   Identity:     b(N) = d(N) + k(N)
 *
 * For each system, 1/d(N) in base b(N) produces a period-6 repeating
 * sequence whose digits form k-ads over the div divisions:
 *
 *   Sys3: 1/3  in base 5  → [1,3]           → dyads  over 4  divisions
 *   Sys4: 1/7  in base 10 → [1,4,2,8,5,7]   → triads over 9  divisions
 *   Sys5: 1/13 in base 17 → [1,5,3,15,11,13] → tetrads over 16 divisions
 *   Sys6: 1/21 in base 26 → [1,6,4,24,19,21] → pentads over 25 divisions
 *
 * Complementary pair structure:
 *   The period splits into two halves where paired digits sum to
 *   (N-1)² = divisions. This is the E/R (Expressive/Regenerative) split:
 *     First half  = Expressive orientation
 *     Second half = Regenerative orientation (complement)
 *
 * Recursive self-similarity:
 *   1/3 = 7/21  → Sys3 reappears in Sys6 denominator
 *   1/7 = 3/21  → Sys4 reappears in Sys6 denominator
 *   This encodes the triadic recurrence Sys3↔Sys6
 *
 * References:
 *   Campbell, A.B. "The System of the Cosmic Order"
 *   Mathar, R.J. "Topologies of non-intersecting circles"
 */

import { type SystemLevel } from './types.js';

// ============================================================
// Core Formulas
// ============================================================

/**
 * Compute the s-gram denominator for System N.
 * d(N) = (N-1)(N-2) + 1 = N² - 3N + 3
 *
 * Sys3: d=3, Sys4: d=7, Sys5: d=13, Sys6: d=21
 */
export function sgramDenominator(N: SystemLevel): number {
  return (N - 1) * (N - 2) + 1;
}

/**
 * Compute the k-ad order for System N.
 * k(N) = N - 1
 *
 * Sys3: k=2 (dyads), Sys4: k=3 (triads), Sys5: k=4 (tetrads), Sys6: k=5 (pentads)
 */
export function kadOrder(N: SystemLevel): number {
  return N - 1;
}

/**
 * Compute the number of divisions for System N.
 * div(N) = (N-1)² = k²
 *
 * Sys3: 4, Sys4: 9, Sys5: 16, Sys6: 25
 */
export function divisions(N: SystemLevel): number {
  const k = N - 1;
  return k * k;
}

/**
 * Compute the native radix base for System N.
 * b(N) = (N-1)² + 1 = divisions + 1 = d + k
 *
 * Sys3: 5, Sys4: 10, Sys5: 17, Sys6: 26
 */
export function nativeBase(N: SystemLevel): number {
  return divisions(N) + 1;
}

/**
 * Verify the fundamental identity: base = denominator + k-ad order
 */
export function verifyBaseIdentity(N: SystemLevel): boolean {
  return nativeBase(N) === sgramDenominator(N) + kadOrder(N);
}

// ============================================================
// K-ad Names
// ============================================================

const KAD_NAMES: Record<number, string> = {
  1: 'monads',
  2: 'dyads',
  3: 'triads',
  4: 'tetrads',
  5: 'pentads',
  6: 'hexads',
};

/**
 * Get the name for k-ads of given order
 */
export function kadName(k: number): string {
  return KAD_NAMES[k] ?? `${k}-ads`;
}

// ============================================================
// Periodic Sequence Computation
// ============================================================

/**
 * Result of computing 1/d in a given base
 */
export interface RepeatingExpansion {
  /** The numerator (always 1 for s-grams) */
  numerator: number;
  /** The denominator d(N) */
  denominator: number;
  /** The radix base b(N) */
  base: number;
  /** Non-repeating prefix digits (empty for s-grams) */
  prefix: number[];
  /** The repeating period digits */
  period: number[];
  /** Length of the repeating period */
  periodLength: number;
}

/**
 * Compute the repeating decimal expansion of numerator/denominator in given base.
 * Uses long division to detect the repeating cycle.
 */
export function repeatingExpansion(
  numerator: number,
  denominator: number,
  base: number,
  maxDigits = 200,
): RepeatingExpansion {
  const digits: number[] = [];
  const remainders = new Map<number, number>();
  let remainder = numerator % denominator;
  let position = 0;

  while (remainder !== 0 && position < maxDigits) {
    if (remainders.has(remainder)) {
      const repeatStart = remainders.get(remainder)!;
      return {
        numerator,
        denominator,
        base,
        prefix: digits.slice(0, repeatStart),
        period: digits.slice(repeatStart),
        periodLength: position - repeatStart,
      };
    }
    remainders.set(remainder, position);
    remainder *= base;
    const digit = Math.floor(remainder / denominator);
    remainder = remainder % denominator;
    digits.push(digit);
    position++;
  }

  // Terminating expansion (shouldn't happen for s-gram denominators)
  return {
    numerator,
    denominator,
    base,
    prefix: digits,
    period: [],
    periodLength: 0,
  };
}

// ============================================================
// S-Gram Definition
// ============================================================

/**
 * A k-ad: a group of k digits from the periodic sequence
 */
export interface Kad {
  /** The k digits */
  digits: number[];
  /** Index of this k-ad in the sequence (0-based) */
  index: number;
  /** Mode: E (Expressive) or R (Regenerative) */
  mode: 'E' | 'R';
}

/**
 * Complementary pair: two digits from opposite halves that sum to divisions
 */
export interface ComplementaryPair {
  /** Index in the period (0-based) */
  index: number;
  /** Expressive digit (first half) */
  expressive: number;
  /** Regenerative digit (second half) */
  regenerative: number;
  /** Sum (should equal divisions) */
  sum: number;
}

/**
 * Recursive self-similarity: how lower system denominators divide into this one
 */
export interface SelfSimilarity {
  /** Lower system level */
  lowerLevel: SystemLevel;
  /** Lower system denominator */
  lowerDenominator: number;
  /** Multiplier: d(N) / d(M) or the scaling factor */
  multiplier: number;
  /** Whether d(N) is exactly divisible by d(M) */
  exact: boolean;
  /** Description */
  description: string;
}

/**
 * Complete s-gram definition for a system level
 */
export interface SGramDefinition {
  /** System level */
  level: SystemLevel;
  /** S-gram denominator d(N) */
  denominator: number;
  /** k-ad order k(N) = N-1 */
  kadOrder: number;
  /** k-ad name (dyads, triads, etc.) */
  kadName: string;
  /** Number of divisions = (N-1)² */
  divisions: number;
  /** Native radix base = divisions + 1 */
  base: number;
  /** The repeating expansion of 1/d in base b */
  expansion: RepeatingExpansion;
  /** The period digits */
  period: number[];
  /** Period length */
  periodLength: number;
  /** Complementary pairs (E/R split) */
  complementaryPairs: ComplementaryPair[];
  /** K-ads formed from the period */
  kads: Kad[];
  /** Recursive self-similarities */
  selfSimilarities: SelfSimilarity[];
  /** Base identity verified: b = d + k */
  baseIdentityValid: boolean;
  /** Complementary sum verified: all pairs sum to divisions */
  complementarySumValid: boolean;
}

// ============================================================
// S-Gram Builder
// ============================================================

/**
 * Build the complete s-gram definition for a system level.
 * Only valid for N >= 3 (Sys1 and Sys2 don't have s-gram sequences).
 */
export function buildSGram(level: SystemLevel): SGramDefinition | null {
  if (level < 3) return null;

  const d = sgramDenominator(level);
  const k = kadOrder(level);
  const div = divisions(level);
  const base = nativeBase(level);

  // Compute 1/d in native base
  const expansion = repeatingExpansion(1, d, base);
  const period = expansion.period;
  const periodLength = expansion.periodLength;

  // Build complementary pairs (E/R split)
  const half = Math.floor(periodLength / 2);
  const complementaryPairs: ComplementaryPair[] = [];
  let complementarySumValid = true;

  for (let i = 0; i < half; i++) {
    const e = period[i];
    const r = period[half + i];
    const sum = e + r;
    if (sum !== div) complementarySumValid = false;
    complementaryPairs.push({
      index: i,
      expressive: e,
      regenerative: r,
      sum,
    });
  }

  // Build k-ads from the period
  // The period splits into E (Expressive) and R (Regenerative) halves
  // via the complementary pair structure. We form k-ads from each half.
  const kads: Kad[] = [];
  if (periodLength >= k) {
    // First half of period = E digits, second half = R digits
    const eDigits = period.slice(0, half);
    const rDigits = period.slice(half);

    // Build E k-ads from first half
    for (let i = 0; i <= eDigits.length - k; i += k) {
      kads.push({
        digits: eDigits.slice(i, i + k),
        index: kads.length,
        mode: 'E',
      });
    }

    // Build R k-ads from second half
    for (let i = 0; i <= rDigits.length - k; i += k) {
      kads.push({
        digits: rDigits.slice(i, i + k),
        index: kads.length,
        mode: 'R',
      });
    }

    // If no k-ads were formed (period too short for full k-ads from halves),
    // form k-ads from the full period
    if (kads.length === 0) {
      for (let i = 0; i <= periodLength - k; i += k) {
        const digits = period.slice(i, i + k);
        kads.push({
          digits,
          index: kads.length,
          mode: i < half ? 'E' : 'R',
        });
      }
    }
  }

  // Build self-similarities
  const selfSimilarities: SelfSimilarity[] = [];
  for (let m = 3; m < level; m++) {
    const dM = sgramDenominator(m as SystemLevel);
    if (d % dM === 0) {
      const multiplier = d / dM;
      selfSimilarities.push({
        lowerLevel: m as SystemLevel,
        lowerDenominator: dM,
        multiplier,
        exact: true,
        description: `1/${dM} = ${multiplier}/${d} — Sys${m} reappears in Sys${level}`,
      });
    }
  }

  return {
    level,
    denominator: d,
    kadOrder: k,
    kadName: kadName(k),
    divisions: div,
    base,
    expansion,
    period,
    periodLength,
    complementaryPairs,
    kads,
    selfSimilarities,
    baseIdentityValid: verifyBaseIdentity(level),
    complementarySumValid,
  };
}

/**
 * Build s-grams for all applicable system levels (3-6)
 */
export function buildAllSGrams(): Map<SystemLevel, SGramDefinition> {
  const map = new Map<SystemLevel, SGramDefinition>();
  for (let n = 3; n <= 6; n++) {
    const sgram = buildSGram(n as SystemLevel);
    if (sgram) map.set(n as SystemLevel, sgram);
  }
  return map;
}

/**
 * Verify all s-gram structural properties
 */
export function verifyAllSGrams(): {
  valid: boolean;
  results: Array<{
    level: SystemLevel;
    baseIdentityValid: boolean;
    complementarySumValid: boolean;
    periodLength: number;
    selfSimilarities: number;
  }>;
} {
  const results: Array<{
    level: SystemLevel;
    baseIdentityValid: boolean;
    complementarySumValid: boolean;
    periodLength: number;
    selfSimilarities: number;
  }> = [];
  let allValid = true;

  for (let n = 3; n <= 6; n++) {
    const sgram = buildSGram(n as SystemLevel);
    if (!sgram) continue;

    if (!sgram.baseIdentityValid || !sgram.complementarySumValid) {
      allValid = false;
    }

    results.push({
      level: n as SystemLevel,
      baseIdentityValid: sgram.baseIdentityValid,
      complementarySumValid: sgram.complementarySumValid,
      periodLength: sgram.periodLength,
      selfSimilarities: sgram.selfSimilarities.length,
    });
  }

  return { valid: allValid, results };
}

// ============================================================
// Cross-System Relationships
// ============================================================

/**
 * The denominator sequence: d(3)=3, d(4)=7, d(5)=13, d(6)=21
 * Differences: 4, 6, 8 (arithmetic progression with common difference 2)
 * Second differences: 2, 2 (constant — quadratic formula confirmed)
 */
export function denominatorSequence(maxN = 6): number[] {
  const seq: number[] = [];
  for (let n = 3; n <= maxN; n++) {
    seq.push(sgramDenominator(n as SystemLevel));
  }
  return seq;
}

/**
 * The base sequence: b(3)=5, b(4)=10, b(5)=17, b(6)=26
 * These are (N-1)² + 1
 */
export function baseSequence(maxN = 6): number[] {
  const seq: number[] = [];
  for (let n = 3; n <= maxN; n++) {
    seq.push(nativeBase(n as SystemLevel));
  }
  return seq;
}

/**
 * Get the period of 1/d(N) in base b(N) as a readonly array
 */
export function getParticularSequence(level: SystemLevel): readonly number[] {
  const sgram = buildSGram(level);
  return sgram ? sgram.period : [];
}

/**
 * Compute the "higher-level Sys3" that emerges from Sys6:
 * 1/3 = 7/21 shows Sys3's denominator (3) divides Sys6's (21)
 * with multiplier 7 (= Sys4's denominator).
 *
 * This encodes the triadic recurrence: the ratio of Sys6/Sys3
 * denominators equals the Sys4 denominator.
 */
export function triadicDenominatorRelation(): {
  sys3_d: number;
  sys4_d: number;
  sys6_d: number;
  ratio_6_3: number;
  ratio_6_4: number;
  sys3_reappears: boolean;
  sys4_reappears: boolean;
} {
  const d3 = sgramDenominator(3 as SystemLevel);
  const d4 = sgramDenominator(4 as SystemLevel);
  const d6 = sgramDenominator(6 as SystemLevel);

  return {
    sys3_d: d3,
    sys4_d: d4,
    sys6_d: d6,
    ratio_6_3: d6 / d3,  // 21/3 = 7 = d(4)
    ratio_6_4: d6 / d4,  // 21/7 = 3 = d(3)
    sys3_reappears: d6 % d3 === 0 && d6 / d3 === d4,
    sys4_reappears: d6 % d4 === 0 && d6 / d4 === d3,
  };
}
