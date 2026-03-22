import {
  sgramDenominator,
  kadOrder,
  divisions,
  nativeBase,
  verifyBaseIdentity,
  kadName,
  repeatingExpansion,
  buildSGram,
  buildAllSGrams,
  verifyAllSGrams,
  denominatorSequence,
  baseSequence,
  getSGramSequence,
  triadicDenominatorRelation,
  type SystemLevel,
  type SGramDefinition,
} from '../cosmic-order/index.js';

describe('S-Gram Periodic Sequences', () => {
  // ============================================================
  // Core Formulas
  // ============================================================

  describe('denominator formula: d(N) = (N-1)(N-2) + 1', () => {
    it('Sys3: d = 3', () => expect(sgramDenominator(3)).toBe(3));
    it('Sys4: d = 7', () => expect(sgramDenominator(4)).toBe(7));
    it('Sys5: d = 13', () => expect(sgramDenominator(5)).toBe(13));
    it('Sys6: d = 21', () => expect(sgramDenominator(6)).toBe(21));

    it('denominator differences are 4, 6, 8 (arithmetic, common diff 2)', () => {
      const seq = denominatorSequence();
      const diffs = [];
      for (let i = 1; i < seq.length; i++) diffs.push(seq[i] - seq[i - 1]);
      expect(diffs).toEqual([4, 6, 8]);
      // Second differences should be constant = 2
      const diffs2 = [];
      for (let i = 1; i < diffs.length; i++) diffs2.push(diffs[i] - diffs[i - 1]);
      expect(diffs2).toEqual([2, 2]);
    });
  });

  describe('k-ad order: k(N) = N - 1', () => {
    it('Sys3: k = 2 (dyads)', () => {
      expect(kadOrder(3)).toBe(2);
      expect(kadName(2)).toBe('dyads');
    });
    it('Sys4: k = 3 (triads)', () => {
      expect(kadOrder(4)).toBe(3);
      expect(kadName(3)).toBe('triads');
    });
    it('Sys5: k = 4 (tetrads)', () => {
      expect(kadOrder(5)).toBe(4);
      expect(kadName(4)).toBe('tetrads');
    });
    it('Sys6: k = 5 (pentads)', () => {
      expect(kadOrder(6)).toBe(5);
      expect(kadName(5)).toBe('pentads');
    });
  });

  describe('divisions: div(N) = (N-1)²', () => {
    it('Sys3: 4 = 2²', () => expect(divisions(3)).toBe(4));
    it('Sys4: 9 = 3²', () => expect(divisions(4)).toBe(9));
    it('Sys5: 16 = 4²', () => expect(divisions(5)).toBe(16));
    it('Sys6: 25 = 5²', () => expect(divisions(6)).toBe(25));
  });

  describe('native base: b(N) = (N-1)² + 1', () => {
    it('Sys3: base 5', () => expect(nativeBase(3)).toBe(5));
    it('Sys4: base 10', () => expect(nativeBase(4)).toBe(10));
    it('Sys5: base 17', () => expect(nativeBase(5)).toBe(17));
    it('Sys6: base 26', () => expect(nativeBase(6)).toBe(26));

    it('base sequence is [5, 10, 17, 26]', () => {
      expect(baseSequence()).toEqual([5, 10, 17, 26]);
    });
  });

  describe('fundamental identity: base = denominator + k', () => {
    it('Sys3: 5 = 3 + 2', () => expect(verifyBaseIdentity(3)).toBe(true));
    it('Sys4: 10 = 7 + 3', () => expect(verifyBaseIdentity(4)).toBe(true));
    it('Sys5: 17 = 13 + 4', () => expect(verifyBaseIdentity(5)).toBe(true));
    it('Sys6: 26 = 21 + 5', () => expect(verifyBaseIdentity(6)).toBe(true));
  });

  // ============================================================
  // Periodic Sequences
  // ============================================================

  describe('periodic sequences: 1/d in native base', () => {
    it('Sys3: 1/3 in base 5 → period [1, 3]', () => {
      const exp = repeatingExpansion(1, 3, 5);
      expect(exp.prefix).toEqual([]);
      expect(exp.period).toEqual([1, 3]);
      expect(exp.periodLength).toBe(2);
    });

    it('Sys4: 1/7 in base 10 → period [1, 4, 2, 8, 5, 7]', () => {
      const exp = repeatingExpansion(1, 7, 10);
      expect(exp.prefix).toEqual([]);
      expect(exp.period).toEqual([1, 4, 2, 8, 5, 7]);
      expect(exp.periodLength).toBe(6);
    });

    it('Sys5: 1/13 in base 17 → period [1, 5, 3, 15, 11, 13]', () => {
      const exp = repeatingExpansion(1, 13, 17);
      expect(exp.prefix).toEqual([]);
      expect(exp.period).toEqual([1, 5, 3, 15, 11, 13]);
      expect(exp.periodLength).toBe(6);
    });

    it('Sys6: 1/21 in base 26 → period [1, 6, 4, 24, 19, 21]', () => {
      const exp = repeatingExpansion(1, 21, 26);
      expect(exp.prefix).toEqual([]);
      expect(exp.period).toEqual([1, 6, 4, 24, 19, 21]);
      expect(exp.periodLength).toBe(6);
    });

    it('all periods have length 6 (except Sys3 which has length 2)', () => {
      for (let n = 3; n <= 6; n++) {
        const sgram = buildSGram(n as SystemLevel)!;
        if (n === 3) {
          expect(sgram.periodLength).toBe(2);
        } else {
          expect(sgram.periodLength).toBe(6);
        }
      }
    });

    it('getSGramSequence returns the period for each level', () => {
      expect(Array.from(getSGramSequence(3))).toEqual([1, 3]);
      expect(Array.from(getSGramSequence(4))).toEqual([1, 4, 2, 8, 5, 7]);
      expect(Array.from(getSGramSequence(5))).toEqual([1, 5, 3, 15, 11, 13]);
      expect(Array.from(getSGramSequence(6))).toEqual([1, 6, 4, 24, 19, 21]);
    });
  });

  // ============================================================
  // Complementary Pair Structure (E/R Split)
  // ============================================================

  describe('complementary pairs: E + R = divisions', () => {
    it('Sys3: 1 + 3 = 4 = divisions', () => {
      const sgram = buildSGram(3)!;
      expect(sgram.complementaryPairs).toHaveLength(1);
      expect(sgram.complementaryPairs[0].expressive).toBe(1);
      expect(sgram.complementaryPairs[0].regenerative).toBe(3);
      expect(sgram.complementaryPairs[0].sum).toBe(4);
    });

    it('Sys4: pairs (1,8), (4,5), (2,7) all sum to 9', () => {
      const sgram = buildSGram(4)!;
      expect(sgram.complementaryPairs).toHaveLength(3);
      expect(sgram.complementaryPairs[0]).toEqual({ index: 0, expressive: 1, regenerative: 8, sum: 9 });
      expect(sgram.complementaryPairs[1]).toEqual({ index: 1, expressive: 4, regenerative: 5, sum: 9 });
      expect(sgram.complementaryPairs[2]).toEqual({ index: 2, expressive: 2, regenerative: 7, sum: 9 });
    });

    it('Sys5: pairs (1,15), (5,11), (3,13) all sum to 16', () => {
      const sgram = buildSGram(5)!;
      expect(sgram.complementaryPairs).toHaveLength(3);
      for (const pair of sgram.complementaryPairs) {
        expect(pair.sum).toBe(16);
      }
    });

    it('Sys6: pairs (1,24), (6,19), (4,21) all sum to 25', () => {
      const sgram = buildSGram(6)!;
      expect(sgram.complementaryPairs).toHaveLength(3);
      for (const pair of sgram.complementaryPairs) {
        expect(pair.sum).toBe(25);
      }
    });

    it('all systems pass complementary sum validation', () => {
      for (let n = 3; n <= 6; n++) {
        const sgram = buildSGram(n as SystemLevel)!;
        expect(sgram.complementarySumValid).toBe(true);
      }
    });
  });

  // ============================================================
  // K-ad Formation
  // ============================================================

  describe('k-ad formation over divisions', () => {
    it('Sys3: 1 dyad (1,3) over 4 divisions', () => {
      const sgram = buildSGram(3)!;
      expect(sgram.kads).toHaveLength(1);
      expect(sgram.kads[0].digits).toEqual([1, 3]);
    });

    it('Sys4: 2 triads (1,4,2) and (8,5,7) over 9 divisions', () => {
      const sgram = buildSGram(4)!;
      expect(sgram.kads).toHaveLength(2);
      expect(sgram.kads[0].digits).toEqual([1, 4, 2]);
      expect(sgram.kads[0].mode).toBe('E');
      expect(sgram.kads[1].digits).toEqual([8, 5, 7]);
      expect(sgram.kads[1].mode).toBe('R');
    });

    it('Sys4 k-ads should have both E and R modes', () => {
      const sgram = buildSGram(4)!;
      const modes = sgram.kads.map(k => k.mode);
      expect(modes).toContain('E');
      expect(modes).toContain('R');
    });

    it('Sys5 and Sys6 k-ads span the full period (k > half)', () => {
      // When k >= half of the period, a single k-ad spans the E half
      // and the remaining digits form an incomplete R k-ad
      for (let n = 5; n <= 6; n++) {
        const sgram = buildSGram(n as SystemLevel)!;
        expect(sgram.kads.length).toBeGreaterThanOrEqual(1);
        // The single k-ad should be E (from the first half)
        expect(sgram.kads[0].mode).toBe('E');
        // k-ad length should equal k
        expect(sgram.kads[0].digits.length).toBe(sgram.kadOrder);
      }
    });
  });

  // ============================================================
  // Recursive Self-Similarity
  // ============================================================

  describe('recursive self-similarity', () => {
    it('Sys6: 1/3 = 7/21 — Sys3 reappears in Sys6', () => {
      const sgram = buildSGram(6)!;
      const sys3sim = sgram.selfSimilarities.find(s => s.lowerLevel === 3);
      expect(sys3sim).toBeDefined();
      expect(sys3sim!.exact).toBe(true);
      expect(sys3sim!.multiplier).toBe(7); // 21/3 = 7 = d(4)
    });

    it('Sys6: 1/7 = 3/21 — Sys4 reappears in Sys6', () => {
      const sgram = buildSGram(6)!;
      const sys4sim = sgram.selfSimilarities.find(s => s.lowerLevel === 4);
      expect(sys4sim).toBeDefined();
      expect(sys4sim!.exact).toBe(true);
      expect(sys4sim!.multiplier).toBe(3); // 21/7 = 3 = d(3)
    });

    it('triadic denominator relation: d(6)/d(3) = d(4) and d(6)/d(4) = d(3)', () => {
      const rel = triadicDenominatorRelation();
      expect(rel.sys3_d).toBe(3);
      expect(rel.sys4_d).toBe(7);
      expect(rel.sys6_d).toBe(21);
      expect(rel.ratio_6_3).toBe(7);  // 21/3 = 7 = d(4)
      expect(rel.ratio_6_4).toBe(3);  // 21/7 = 3 = d(3)
      expect(rel.sys3_reappears).toBe(true);
      expect(rel.sys4_reappears).toBe(true);
    });

    it('d(6) = d(3) × d(4) — the triadic product', () => {
      const d3 = sgramDenominator(3);
      const d4 = sgramDenominator(4);
      const d6 = sgramDenominator(6);
      expect(d3 * d4).toBe(d6);
    });
  });

  // ============================================================
  // S-Gram Builder
  // ============================================================

  describe('buildSGram', () => {
    it('returns null for Sys1 and Sys2', () => {
      expect(buildSGram(1)).toBeNull();
      expect(buildSGram(2)).toBeNull();
    });

    it('returns valid definitions for Sys3-6', () => {
      for (let n = 3; n <= 6; n++) {
        const sgram = buildSGram(n as SystemLevel);
        expect(sgram).not.toBeNull();
        expect(sgram!.level).toBe(n);
        expect(sgram!.denominator).toBe(sgramDenominator(n as SystemLevel));
        expect(sgram!.kadOrder).toBe(n - 1);
        expect(sgram!.divisions).toBe((n - 1) * (n - 1));
        expect(sgram!.base).toBe((n - 1) * (n - 1) + 1);
      }
    });

    it('buildAllSGrams returns 4 definitions', () => {
      const all = buildAllSGrams();
      expect(all.size).toBe(4);
      expect(all.has(3 as SystemLevel)).toBe(true);
      expect(all.has(4 as SystemLevel)).toBe(true);
      expect(all.has(5 as SystemLevel)).toBe(true);
      expect(all.has(6 as SystemLevel)).toBe(true);
    });
  });

  // ============================================================
  // Verification
  // ============================================================

  describe('verification', () => {
    it('verifyAllSGrams should pass', () => {
      const result = verifyAllSGrams();
      expect(result.valid).toBe(true);
      expect(result.results).toHaveLength(4);
    });

    it('all base identities should be valid', () => {
      const result = verifyAllSGrams();
      for (const r of result.results) {
        expect(r.baseIdentityValid).toBe(true);
      }
    });

    it('all complementary sums should be valid', () => {
      const result = verifyAllSGrams();
      for (const r of result.results) {
        expect(r.complementarySumValid).toBe(true);
      }
    });
  });

  // ============================================================
  // Cross-System Structure
  // ============================================================

  describe('cross-system structure', () => {
    it('period first digit is always 1', () => {
      for (let n = 3; n <= 6; n++) {
        const sgram = buildSGram(n as SystemLevel)!;
        expect(sgram.period[0]).toBe(1);
      }
    });

    it('period last digit always equals denominator', () => {
      for (let n = 3; n <= 6; n++) {
        const sgram = buildSGram(n as SystemLevel)!;
        const last = sgram.period[sgram.period.length - 1];
        expect(last).toBe(sgram.denominator);
      }
    });

    it('period second digit equals k-ad order + 1 for N >= 4', () => {
      // Sys4: second digit = 4 = k+1 = 3+1
      // Sys5: second digit = 5 = k+1 = 4+1
      // Sys6: second digit = 6 = k+1 = 5+1
      for (let n = 4; n <= 6; n++) {
        const sgram = buildSGram(n as SystemLevel)!;
        expect(sgram.period[1]).toBe(sgram.kadOrder + 1);
      }
    });

    it('all period digits are in range [1, base-1]', () => {
      for (let n = 3; n <= 6; n++) {
        const sgram = buildSGram(n as SystemLevel)!;
        for (const digit of sgram.period) {
          expect(digit).toBeGreaterThanOrEqual(1);
          expect(digit).toBeLessThan(sgram.base);
        }
      }
    });
  });
});
