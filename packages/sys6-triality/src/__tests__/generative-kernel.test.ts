import {
  convolve,
  shift1,
  pascalRow,
  chainPoly,
  polyStr,
  enumerateRootedTrees,
  treeToParenthesis,
  matulaNumber,
  treeToPoly,
  matulaToPolyViaFactors,
  buildSystemKernel,
  buildAllSystemKernels,
  verifyFactorizationTheorem,
  chainPrimeTower,
  verifyChainPrimes,
  generativeSequence,
  type RootedTree,
} from '../cosmic-order/index.js';

// ============================================================
// A000081 expected counts: a(n+1) terms for System N
// ============================================================

const A000081: Record<number, number> = {
  1: 1, 2: 1, 3: 2, 4: 4, 5: 9, 6: 20, 7: 48,
};

// ============================================================
// Dan's reference data: tree → polynomial → Matula
// ============================================================

const REFERENCE: Array<{
  matula: number;
  parenthesis: string;
  polynomial: number[];
  isPrime: boolean;
}> = [
  { matula: 1,  parenthesis: '()',         polynomial: [1],             isPrime: false },
  { matula: 2,  parenthesis: '(())',       polynomial: [1,1],           isPrime: true },
  { matula: 3,  parenthesis: '((()))',     polynomial: [1,1,1],         isPrime: true },
  { matula: 4,  parenthesis: '(()())',     polynomial: [1,2,1],         isPrime: false },
  { matula: 5,  parenthesis: '(((())))',   polynomial: [1,1,1,1],       isPrime: true },
  { matula: 6,  parenthesis: '((())())',   polynomial: [1,2,2,1],       isPrime: false },
  { matula: 7,  parenthesis: '((()()))',   polynomial: [1,1,2,1],       isPrime: true },
  { matula: 8,  parenthesis: '(()()())',   polynomial: [1,3,3,1],       isPrime: false },
  { matula: 9,  parenthesis: '((())(()))', polynomial: [1,2,3,2,1],     isPrime: false },
  { matula: 10, parenthesis: '(((())))())',polynomial: [1,2,2,2,1],     isPrime: false },
  { matula: 11, parenthesis: '((((()))))' ,polynomial: [1,1,1,1,1],     isPrime: true },
];

describe('Generative Kernel — Tree-Polynomial-Matula Correspondence', () => {

  // ============================================================
  // Polynomial operations
  // ============================================================

  describe('polynomial operations', () => {
    it('convolve [1,1] * [1,1] = [1,2,1]', () => {
      expect(convolve([1,1], [1,1])).toEqual([1,2,1]);
    });

    it('convolve [1,1] * [1,1] * [1,1] = [1,3,3,1]', () => {
      expect(convolve(convolve([1,1], [1,1]), [1,1])).toEqual([1,3,3,1]);
    });

    it('convolve [1,1,1] * [1,1,1] = [1,2,3,2,1]', () => {
      expect(convolve([1,1,1], [1,1,1])).toEqual([1,2,3,2,1]);
    });

    it('convolve [1,1,1] * [1,1] = [1,2,2,1]', () => {
      expect(convolve([1,1,1], [1,1])).toEqual([1,2,2,1]);
    });

    it('shift1 prepends a 1', () => {
      expect(shift1([1])).toEqual([1,1]);
      expect(shift1([1,1])).toEqual([1,1,1]);
      expect(shift1([1,2,1])).toEqual([1,1,2,1]);
    });

    it('shift1 always gives two leading 1s (polynomic signature)', () => {
      const polys = [[1], [1,1], [1,1,1], [1,2,1], [1,1,2,1]];
      for (const p of polys) {
        const shifted = shift1(p);
        expect(shifted[0]).toBe(1);
        expect(shifted[1]).toBe(1);
      }
    });
  });

  // ============================================================
  // Pascal rows (star tower)
  // ============================================================

  describe('Pascal rows — (1-1)^N star tower', () => {
    it('pascalRow(0) = [1] — Sys0 void', () => {
      expect(pascalRow(0)).toEqual([1]);
    });

    it('pascalRow(1) = [1,1] — Sys1 first distinction', () => {
      expect(pascalRow(1)).toEqual([1,1]);
    });

    it('pascalRow(2) = [1,2,1] — Sys2', () => {
      expect(pascalRow(2)).toEqual([1,2,1]);
    });

    it('pascalRow(3) = [1,3,3,1] — Sys3', () => {
      expect(pascalRow(3)).toEqual([1,3,3,1]);
    });

    it('pascalRow(4) = [1,4,6,4,1] — Sys4 tetrahedron', () => {
      expect(pascalRow(4)).toEqual([1,4,6,4,1]);
    });

    it('pascalRow(5) = [1,5,10,10,5,1] — Sys5', () => {
      expect(pascalRow(5)).toEqual([1,5,10,10,5,1]);
    });

    it('pascalRow(6) = [1,6,15,20,15,6,1] — Sys6', () => {
      expect(pascalRow(6)).toEqual([1,6,15,20,15,6,1]);
    });

    it('coefficient sum = 2^N (Cayley-Dixon doubling)', () => {
      for (let n = 0; n <= 7; n++) {
        const row = pascalRow(n);
        const sum = row.reduce((a, b) => a + b, 0);
        expect(sum).toBe(2 ** n);
      }
    });
  });

  // ============================================================
  // Chain polynomials (chain tower)
  // ============================================================

  describe('chain polynomials — all-ones tower', () => {
    it('chainPoly(0) = [1]', () => {
      expect(chainPoly(0)).toEqual([1]);
    });

    it('chainPoly(N) has N+1 ones', () => {
      for (let n = 0; n <= 6; n++) {
        const cp = chainPoly(n);
        expect(cp).toHaveLength(n + 1);
        expect(cp.every(c => c === 1)).toBe(true);
      }
    });
  });

  // ============================================================
  // Tree enumeration — A000081 counts
  // ============================================================

  describe('tree enumeration', () => {
    for (const [nStr, expected] of Object.entries(A000081)) {
      const n = parseInt(nStr);
      it(`n=${n} nodes: ${expected} rooted trees`, () => {
        const trees = enumerateRootedTrees(n);
        expect(trees).toHaveLength(expected);
      });
    }
  });

  // ============================================================
  // Reference data verification
  // ============================================================

  describe('reference data — Dan\'s examples', () => {
    for (const ref of REFERENCE) {
      it(`M=${ref.matula} ${ref.parenthesis} → ${polyStr(ref.polynomial)}`, () => {
        // Find the tree with this Matula number
        for (let n = 1; n <= 7; n++) {
          for (const tree of enumerateRootedTrees(n)) {
            if (matulaNumber(tree) === ref.matula) {
              expect(treeToPoly(tree)).toEqual(ref.polynomial);
              return;
            }
          }
        }
        // Matula 1 is the single node
        if (ref.matula === 1) {
          expect(treeToPoly([])).toEqual([1]);
        }
      });
    }
  });

  // ============================================================
  // Matula number properties
  // ============================================================

  describe('Matula number properties', () => {
    it('leaf has Matula 1', () => {
      expect(matulaNumber([])).toBe(1);
    });

    it('path of 2 nodes has Matula 2 = p(1)', () => {
      const tree: RootedTree = [[]]; // root -> leaf
      expect(matulaNumber(tree)).toBe(2);
    });

    it('star with k leaves has Matula 2^k', () => {
      for (let k = 1; k <= 5; k++) {
        const tree: RootedTree = Array(k).fill([]);
        expect(matulaNumber(tree)).toBe(2 ** k);
      }
    });

    it('path of n nodes has Matula = chain prime tower', () => {
      const tower = chainPrimeTower(6);
      // Build paths and check
      let path: RootedTree = []; // 1 node
      expect(matulaNumber(path)).toBe(tower[0]); // 1
      for (let i = 1; i <= 6; i++) {
        path = [path]; // add one more node
        expect(matulaNumber(path)).toBe(tower[i]);
      }
    });
  });

  // ============================================================
  // Factorization theorem
  // ============================================================

  describe('factorization theorem: composite Matula ↔ factorable polynomial', () => {
    it('all trees up to Sys6 satisfy the theorem', () => {
      const kernels = buildAllSystemKernels();
      const result = verifyFactorizationTheorem(kernels);
      expect(result.failures).toEqual([]);
      expect(result.passed).toBe(result.total);
    });

    it('M=4: (1-2-1) = (1-1) ⊗ (1-1)', () => {
      const polyTable = new Map<number, readonly number[]>();
      polyTable.set(1, [1]);
      const result = matulaToPolyViaFactors(4, polyTable);
      expect(result).toEqual([1,2,1]);
    });

    it('M=9: (1-2-3-2-1) = (1-1-1) ⊗ (1-1-1)', () => {
      const polyTable = new Map<number, readonly number[]>();
      polyTable.set(1, [1]);
      polyTable.set(2, [1,1]);
      const result = matulaToPolyViaFactors(9, polyTable);
      expect(result).toEqual([1,2,3,2,1]);
    });

    it('M=6: (1-2-2-1) = (1-1) ⊗ (1-1-1)', () => {
      const polyTable = new Map<number, readonly number[]>();
      polyTable.set(1, [1]);
      polyTable.set(2, [1,1]);
      const result = matulaToPolyViaFactors(6, polyTable);
      expect(result).toEqual([1,2,2,1]);
    });

    it('M=35 = 5×7: (1-1-1-1) ⊗ (1-1-2-1)', () => {
      const polyTable = new Map<number, readonly number[]>();
      polyTable.set(1, [1]);
      polyTable.set(2, [1,1]);
      polyTable.set(3, [1,1,1]);
      polyTable.set(4, [1,2,1]);
      const result = matulaToPolyViaFactors(35, polyTable);
      expect(result).toEqual([1,2,4,5,4,3,1]);
    });
  });

  // ============================================================
  // System kernels
  // ============================================================

  describe('system kernels', () => {
    it('Sys0: 0 centres, 1 node, 1 term', () => {
      const k = buildSystemKernel(0);
      expect(k.centres).toBe(0);
      expect(k.nodes).toBe(1);
      expect(k.terms).toHaveLength(1);
      expect(k.terms[0].matula).toBe(1);
      expect(k.terms[0].polynomial).toEqual([1]);
    });

    it('Sys1: 1 centre, 2 nodes, 1 term', () => {
      const k = buildSystemKernel(1);
      expect(k.centres).toBe(1);
      expect(k.terms).toHaveLength(1);
      expect(k.terms[0].matula).toBe(2);
      expect(k.terms[0].polynomial).toEqual([1,1]);
    });

    it('Sys4: 4 centres, 5 nodes, 9 terms', () => {
      const k = buildSystemKernel(4);
      expect(k.centres).toBe(4);
      expect(k.terms).toHaveLength(9);
    });

    it('Sys6: 6 centres, 7 nodes, 48 terms', () => {
      const k = buildSystemKernel(6);
      expect(k.centres).toBe(6);
      expect(k.terms).toHaveLength(48);
    });

    it('star polynomial matches Pascal row for each system', () => {
      for (let n = 0; n <= 6; n++) {
        const k = buildSystemKernel(n);
        expect(k.starPolynomial).toEqual(pascalRow(n));
      }
    });

    it('chain polynomial is all-ones for each system', () => {
      for (let n = 0; n <= 6; n++) {
        const k = buildSystemKernel(n);
        expect(k.chainPolynomial).toEqual(chainPoly(n));
        expect(k.chainPolynomial.every(c => c === 1)).toBe(true);
      }
    });
  });

  // ============================================================
  // Chain prime tower
  // ============================================================

  describe('chain prime tower', () => {
    it('tower starts: 1, 2, 3, 5, 11, 31, 127', () => {
      const tower = chainPrimeTower(6);
      expect(tower).toEqual([1, 2, 3, 5, 11, 31, 127]);
    });

    it('all chain primes are prime (up to depth 10)', () => {
      expect(verifyChainPrimes(10)).toBe(true);
    });

    it('chain prime tower = iterated prime function p(p(p(...)))', () => {
      const tower = chainPrimeTower(5);
      // tower[0] = 1
      // tower[1] = p(1) = 2
      // tower[2] = p(2) = 3
      // tower[3] = p(3) = 5
      // tower[4] = p(5) = 11
      // tower[5] = p(11) = 31
      expect(tower[0]).toBe(1);
      expect(tower[1]).toBe(2);  // p(1)
      expect(tower[2]).toBe(3);  // p(2)
      expect(tower[3]).toBe(5);  // p(3)
      expect(tower[4]).toBe(11); // p(5)
      expect(tower[5]).toBe(31); // p(11)
    });
  });

  // ============================================================
  // Generative sequence — void and distinction
  // ============================================================

  describe('generative sequence — void and distinction', () => {
    it('Sys0 (void) has coefficient sum 1 — the only system with net existence', () => {
      const seq = generativeSequence(6);
      expect(seq[0].coefficientSum).toBe(1);
    });

    it('all systems Sys1+ have coefficient sum 2^N', () => {
      const seq = generativeSequence(6);
      for (let n = 1; n <= 6; n++) {
        expect(seq[n].coefficientSum).toBe(2 ** n);
      }
    });

    it('Sys0 alternating sum = 1 (net existence)', () => {
      const seq = generativeSequence(6);
      expect(seq[0].alternatingSum).toBe(1);
    });

    it('all systems Sys1+ have alternating sum 0 (self-cancelling)', () => {
      const seq = generativeSequence(6);
      for (let n = 1; n <= 6; n++) {
        expect(seq[n].alternatingSum).toBe(0);
      }
    });
  });

  // ============================================================
  // Polynomic signature — two leading 1s for primes
  // ============================================================

  describe('polynomic signature', () => {
    it('all prime Matula trees have two leading 1s', () => {
      const kernels = buildAllSystemKernels();
      for (const kernel of kernels.values()) {
        for (const term of kernel.terms) {
          if (term.isPrime) {
            expect(term.isPolynomic).toBe(true);
          }
        }
      }
    });

    it('composite Matula trees do NOT always have two leading 1s', () => {
      // M=4 = (1-2-1) — second coefficient is 2, not 1
      const k = buildSystemKernel(2);
      const m4 = k.terms.find(t => t.matula === 4);
      expect(m4).toBeDefined();
      expect(m4!.isPolynomic).toBe(false);
    });
  });

  // ============================================================
  // Kind classification
  // ============================================================

  describe('term kind classification', () => {
    it('M=2^N are star kind for N >= 2 (N=1 is degenerate: both star and chain)', () => {
      // M=2 = (()) is a path of 2, degenerate case where star = chain
      const k1 = buildSystemKernel(1);
      expect(k1.terms.find(t => t.matula === 2)!.kind).toBe('chain');
      // M=4,8,16,32 are pure stars (branching at root)
      for (let n = 2; n <= 5; n++) {
        const k = buildSystemKernel(n);
        const star = k.terms.find(t => t.matula === 2 ** n);
        expect(star).toBeDefined();
        expect(star!.kind).toBe('star');
      }
    });

    it('chain primes are chain kind', () => {
      const tower = chainPrimeTower(5);
      for (let n = 1; n <= 5; n++) {
        const k = buildSystemKernel(n);
        const chain = k.terms.find(t => t.matula === tower[n]);
        expect(chain).toBeDefined();
        expect(chain!.kind).toBe('chain');
      }
    });

    it('M=7 (first non-trivial prime) is mixed kind', () => {
      const k = buildSystemKernel(3);
      const m7 = k.terms.find(t => t.matula === 7);
      expect(m7).toBeDefined();
      expect(m7!.kind).toBe('mixed');
    });
  });
});
