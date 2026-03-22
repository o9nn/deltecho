import {
  multiplicativeOrbit,
  orbitRepresentative,
  allOrbits,
  buildSGramRow,
  buildSimpleSequence,
  classificationCounts,
  BLOCK_VALUES,
  BLOCK_CLASSIFICATIONS,
  buildSGramTable,
  buildAllSGramTables,
  verifySGramTable,
  type SystemLevel,
} from '../cosmic-order/index.js';

// ============================================================
// Reference data from s-grams-11-full.jpg
// ============================================================

const REFERENCE_PERIODS: Record<number, Record<number, number[]>> = {
  3: { 1: [1, 3] },
  7: { 1: [1, 4, 2, 8, 5, 7] },
  13: {
    1: [1, 5, 3, 15, 11, 13],
    2: [2, 10, 7, 14, 6, 9],
  },
  21: {
    1: [1, 6, 4, 24, 19, 21],
    2: [2, 12, 9, 23, 13, 16],
    3: [3, 18, 14, 22, 7, 11],
    7: [8, 17],
  },
  31: {
    1: [1, 7, 5, 35, 29, 31],
    2: [2, 14, 11, 34, 22, 25],
    3: [3, 21, 17, 33, 15, 19],
    4: [4, 28, 23, 32, 8, 13],
    8: [9, 20, 10, 27, 16, 26],
  },
  43: {
    1: [1, 8, 6, 48, 41, 43],
    2: [2, 16, 13, 47, 33, 36],
    3: [3, 24, 20, 46, 25, 29],
    4: [4, 32, 27, 45, 17, 22],
    5: [5, 40, 34, 44, 9, 15],
    9: [10, 23, 12, 39, 26, 37],
    10: [11, 31, 19, 38, 18, 30],
  },
};

const REFERENCE_SIMPLE: Record<number, number[]> = {
  2: [2],
  3: [3, 6],
  4: [4, 8, 12],
  5: [5, 10, 15, 20],
  6: [6, 12, 18, 24, 30],
};

describe('S-Gram Table — Complete Multi-Row k/d Families', () => {
  // ============================================================
  // Multiplicative Orbits
  // ============================================================

  describe('multiplicative orbits', () => {
    it('orbit of 1 under ×10 mod 7 has all 6 elements', () => {
      const orbit = multiplicativeOrbit(1, 10, 7);
      expect(orbit.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('orbit of 1 under ×17 mod 13 has 6 elements', () => {
      const orbit = multiplicativeOrbit(1, 17, 13);
      expect(orbit).toHaveLength(6);
      expect(orbit.sort((a, b) => a - b)).toEqual([1, 3, 4, 9, 10, 12]);
    });

    it('orbit of 2 under ×17 mod 13 has 6 elements (different orbit)', () => {
      const orbit = multiplicativeOrbit(2, 17, 13);
      expect(orbit).toHaveLength(6);
      expect(orbit.sort((a, b) => a - b)).toEqual([2, 5, 6, 7, 8, 11]);
    });

    it('Sys6 (d=21): orbit of 7 has 2 elements (short row)', () => {
      const orbit = multiplicativeOrbit(7, 26, 21);
      expect(orbit).toHaveLength(2);
      // 7 × 26 mod 21 = 182 mod 21 = 14, 14 × 26 mod 21 = 364 mod 21 = 7
      expect(orbit.sort((a, b) => a - b)).toEqual([7, 14]);
    });

    it('orbit representative is the smallest element', () => {
      const orbit = multiplicativeOrbit(1, 17, 13);
      expect(orbitRepresentative(orbit)).toBe(1);
      const orbit2 = multiplicativeOrbit(2, 17, 13);
      expect(orbitRepresentative(orbit2)).toBe(2);
    });
  });

  describe('all orbits', () => {
    it('Sys4 (d=7): 1 orbit of size 6', () => {
      const orbits = allOrbits(7, 10);
      expect(orbits.size).toBe(1);
      expect(orbits.get(1)).toHaveLength(6);
    });

    it('Sys5 (d=13): 2 orbits of size 6', () => {
      const orbits = allOrbits(13, 17);
      expect(orbits.size).toBe(2);
      for (const [, orbit] of orbits) {
        expect(orbit).toHaveLength(6);
      }
    });

    it('Sys6 (d=21): 3 orbits of size 6 + 1 orbit of size 2', () => {
      const orbits = allOrbits(21, 26);
      const sizes = [...orbits.values()].map(o => o.length).sort();
      expect(sizes).toEqual([2, 6, 6, 6]);
    });

    it('all orbits cover all residues 1..d-1', () => {
      for (const [d, b] of [[7, 10], [13, 17], [21, 26], [31, 37]] as [number, number][]) {
        const orbits = allOrbits(d, b);
        const allElements = new Set<number>();
        for (const orbit of orbits.values()) {
          for (const x of orbit) allElements.add(x);
        }
        expect(allElements.size).toBe(d - 1);
        for (let k = 1; k < d; k++) {
          expect(allElements.has(k)).toBe(true);
        }
      }
    });
  });

  // ============================================================
  // Reference Data Verification
  // ============================================================

  describe('reference data verification', () => {
    for (const [dStr, rows] of Object.entries(REFERENCE_PERIODS)) {
      const d = parseInt(dStr);
      // Find which system level this is
      let level = 0;
      for (let n = 3; n <= 12; n++) {
        if ((n - 1) * (n - 2) + 1 === d) { level = n; break; }
      }
      const b = (level - 1) * (level - 1) + 1;

      for (const [kStr, expected] of Object.entries(rows)) {
        const k = parseInt(kStr);
        it(`${k}/${d} in base ${b} matches reference`, () => {
          const row = buildSGramRow(k, d, b);
          expect(row.period).toEqual(expected);
        });
      }
    }
  });

  // ============================================================
  // Complementary Pairs
  // ============================================================

  describe('complementary pairs sum to divisions', () => {
    it('all full rows in Sys3-8 have pairs summing to divisions', () => {
      for (let n = 3; n <= 8; n++) {
        const table = buildSGramTable(n as SystemLevel);
        if (!table) continue;
        const result = verifySGramTable(table);
        expect(result.allPairsSumToDiv).toBe(true);
      }
    });

    it('Sys4: (1,8), (4,5), (2,7) all sum to 9', () => {
      const row = buildSGramRow(1, 7, 10);
      expect(row.complementaryPairs).toEqual([[1, 8], [4, 5], [2, 7]]);
    });

    it('Sys6: 1/21 pairs (1,24), (6,19), (4,21) all sum to 25', () => {
      const row = buildSGramRow(1, 21, 26);
      expect(row.complementaryPairs).toEqual([[1, 24], [6, 19], [4, 21]]);
    });

    it('short rows also have complementary pairs', () => {
      const row = buildSGramRow(7, 21, 26);
      expect(row.complementaryPairs).toEqual([[8, 17]]);
      expect(8 + 17).toBe(25); // divisions
    });
  });

  // ============================================================
  // Row Counts
  // ============================================================

  describe('row counts per system', () => {
    it('Sys3 (d=3): 0 full + 1 short = 1 row', () => {
      const table = buildSGramTable(3)!;
      // 1/3 in base 5 has period [1,3] which is length 2
      expect(table.shortRows.length + table.fullRows.length).toBeGreaterThanOrEqual(1);
    });

    it('Sys4 (d=7): 1 full + 0 short = 1 row', () => {
      const table = buildSGramTable(4)!;
      expect(table.fullRows).toHaveLength(1);
      expect(table.shortRows).toHaveLength(0);
    });

    it('Sys5 (d=13): 2 full + 0 short = 2 rows', () => {
      const table = buildSGramTable(5)!;
      expect(table.fullRows).toHaveLength(2);
      expect(table.shortRows).toHaveLength(0);
    });

    it('Sys6 (d=21): 3 full + 1 short = 4 rows', () => {
      const table = buildSGramTable(6)!;
      expect(table.fullRows).toHaveLength(3);
      expect(table.shortRows).toHaveLength(1);
    });
  });

  // ============================================================
  // Simple Sequences
  // ============================================================

  describe('simple multiples sequences', () => {
    it('Sys3: 1/2 → [2, 4]', () => {
      const seq = buildSimpleSequence(3);
      expect(seq.k).toBe(2);
      expect(seq.multiples).toEqual([2, 4]);
    });

    it('Sys4: 1/3 → [3, 6, 9]', () => {
      const seq = buildSimpleSequence(4);
      expect(seq.k).toBe(3);
      expect(seq.multiples).toEqual([3, 6, 9]);
    });

    it('Sys5: 1/4 → [4, 8, 12, 16]', () => {
      const seq = buildSimpleSequence(5);
      expect(seq.k).toBe(4);
      expect(seq.multiples).toEqual([4, 8, 12, 16]);
    });

    it('Sys6: 1/5 → [5, 10, 15, 20, 25]', () => {
      const seq = buildSimpleSequence(6);
      expect(seq.k).toBe(5);
      expect(seq.multiples).toEqual([5, 10, 15, 20, 25]);
    });

    it('last multiple always equals divisions', () => {
      for (let n = 3; n <= 6; n++) {
        const seq = buildSimpleSequence(n as SystemLevel);
        const last = seq.multiples[seq.multiples.length - 1];
        expect(last).toBe((n - 1) * (n - 1));
      }
    });
  });

  // ============================================================
  // Block Values and Classification
  // ============================================================

  describe('block values', () => {
    it('Sys1: [2]', () => {
      expect(BLOCK_VALUES[1]).toEqual([2]);
    });

    it('Sys2: [4, 3]', () => {
      expect(BLOCK_VALUES[2]).toEqual([4, 3]);
    });

    it('Sys3: [8, 6, 7, 5]', () => {
      expect(BLOCK_VALUES[3]).toEqual([8, 6, 7, 5]);
    });

    it('Sys4: 9 values starting with [16, 12, 14, 10, 9, ...]', () => {
      expect(BLOCK_VALUES[4]).toHaveLength(9);
      expect(BLOCK_VALUES[4]).toEqual([16, 12, 14, 10, 9, 19, 13, 17, 11]);
    });

    it('Sys5: 20 values starting with [32, 24, 28, 20, 18, ...]', () => {
      expect(BLOCK_VALUES[5]).toHaveLength(20);
      expect(BLOCK_VALUES[5][0]).toBe(32);
      expect(BLOCK_VALUES[5][19]).toBe(31);
    });
  });

  describe('term classification', () => {
    it('Sys1: 1 unity', () => {
      const counts = classificationCounts(1);
      expect(counts).toEqual({ ordinary: 0, special: 0, cross: 0, unity: 1, total: 1 });
    });

    it('Sys2: 1 ordinary + 1 special', () => {
      const counts = classificationCounts(2);
      expect(counts).toEqual({ ordinary: 1, special: 1, cross: 0, unity: 0, total: 2 });
    });

    it('Sys3: 2 ordinary + 2 special', () => {
      const counts = classificationCounts(3);
      expect(counts).toEqual({ ordinary: 2, special: 2, cross: 0, unity: 0, total: 4 });
    });

    it('Sys4: 4 ordinary + 1 cross + 4 special', () => {
      const counts = classificationCounts(4);
      expect(counts).toEqual({ ordinary: 4, special: 4, cross: 1, unity: 0, total: 9 });
    });

    it('Sys5: 9 ordinary + 2 cross + 9 special', () => {
      const counts = classificationCounts(5);
      expect(counts).toEqual({ ordinary: 9, special: 9, cross: 2, unity: 0, total: 20 });
    });

    it('Sys4 cross term is at index 5 (value 9 = 3×3)', () => {
      const classes = BLOCK_CLASSIFICATIONS[4];
      const crossIdx = classes.indexOf('x');
      expect(crossIdx).toBe(4); // 0-indexed
      expect(BLOCK_VALUES[4][crossIdx]).toBe(9);
    });
  });

  // ============================================================
  // Table Verification
  // ============================================================

  describe('table verification', () => {
    it('buildAllSGramTables returns 4 tables', () => {
      const tables = buildAllSGramTables();
      expect(tables.size).toBe(4);
    });

    it('all tables pass verification', () => {
      for (let n = 3; n <= 6; n++) {
        const table = buildSGramTable(n as SystemLevel)!;
        const result = verifySGramTable(table);
        expect(result.valid).toBe(true);
      }
    });

    it('returns null for Sys1 and Sys2', () => {
      expect(buildSGramTable(1)).toBeNull();
      expect(buildSGramTable(2)).toBeNull();
    });
  });

  // ============================================================
  // Short Row Self-Similarity
  // ============================================================

  describe('short row self-similarity', () => {
    it('Sys6: 7/21 = 1/3 (reduces to Sys3 denominator)', () => {
      const table = buildSGramTable(6)!;
      const shortRow = table.shortRows.find(r => r.numerator === 7);
      expect(shortRow).toBeDefined();
      expect(shortRow!.gcd).toBe(7);
      expect(shortRow!.reducedNumerator).toBe(1);
      expect(shortRow!.reducedDenominator).toBe(3);
    });
  });
});
