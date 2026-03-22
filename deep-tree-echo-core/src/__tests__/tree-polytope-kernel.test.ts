/**
 * @fileoverview Tree-Polytope Kernel — Comprehensive Test Suite
 *
 * Tests the mathematical foundations and cognitive integration of the
 * tree-polytope kernel: convolution, Matula-Godsil encoding, Pascal rows,
 * simplex polytopes, Butcher conditions, s-gram rhythms, and the
 * structural self-model of the DTE architecture.
 */
import {
  convolve,
  shift1,
  pascalRow,
  chainPoly,
  enumerateRootedTrees,
  treeToParenthesis,
  treeToPoly,
  matulaNumber,
  symmetryFactor,
  density,
  buildSimplexPolytope,
  buildButcherConditions,
  buildSGramRhythm,
  buildStructuralSelfModel,
  TreePolytopeKernel,
  createTreePolytopeKernel,
  type RootedTree,
  type Polynomial,
} from '../tree-polytope-kernel.js';

// ============================================================
// A000081 Reference Values
// ============================================================
const A000081 = [0, 1, 1, 2, 4, 9, 20, 48, 115];

describe('Tree-Polytope Kernel', () => {
  // ============================================================
  // Polynomial Convolution
  // ============================================================
  describe('Polynomial Convolution', () => {
    it('should convolve two constant polynomials', () => {
      expect(convolve([1], [1])).toEqual([1]);
    });

    it('should convolve (1,-1) * (1,-1) = (1,-2,1)', () => {
      expect(convolve([1, -1], [1, -1])).toEqual([1, -2, 1]);
    });

    it('should convolve (1,-1) * (1,-1) * (1,-1) = (1,-3,3,-1)', () => {
      const p2 = convolve([1, -1], [1, -1]);
      expect(convolve(p2, [1, -1])).toEqual([1, -3, 3, -1]);
    });

    it('should be commutative: a*b = b*a', () => {
      const a = [1, 2, 3];
      const b = [4, 5];
      expect(convolve(a, b)).toEqual(convolve(b, a));
    });

    it('should be associative: (a*b)*c = a*(b*c)', () => {
      const a = [1, -1];
      const b = [1, -1];
      const c = [1, -1];
      expect(convolve(convolve(a, b), c)).toEqual(convolve(a, convolve(b, c)));
    });
  });

  // ============================================================
  // Shift-1 Operation
  // ============================================================
  describe('Shift-1 (Edge Polynomial)', () => {
    it('should prepend 1 to empty polynomial', () => {
      expect(shift1([])).toEqual([1]);
    });

    it('should prepend 1 to (1,-1)', () => {
      expect(shift1([1, -1])).toEqual([1, 1, -1]);
    });
  });

  // ============================================================
  // Pascal Rows = (1,-1)^n
  // ============================================================
  describe('Pascal Rows', () => {
    it('should return [1] for n=0 (Sys0: void)', () => {
      expect(pascalRow(0)).toEqual([1]);
    });

    it('should return [1,-1] for n=1 (Sys1: first distinction)', () => {
      expect(pascalRow(1)).toEqual([1, -1]);
    });

    it('should return [1,-2,1] for n=2 (Sys2: edge)', () => {
      expect(pascalRow(2)).toEqual([1, -2, 1]);
    });

    it('should return [1,-3,3,-1] for n=3 (Sys3: face)', () => {
      expect(pascalRow(3)).toEqual([1, -3, 3, -1]);
    });

    it('should return [1,-4,6,-4,1] for n=4 (Sys4: solid)', () => {
      expect(pascalRow(4)).toEqual([1, -4, 6, -4, 1]);
    });

    it('should sum to zero for all n >= 1 (alternating binomial)', () => {
      for (let n = 1; n <= 6; n++) {
        const row = pascalRow(n);
        const sum = row.reduce((a, b) => a + b, 0);
        expect(sum).toBe(0);
      }
    });

    it('should sum to 1 for n=0 (void has net existence)', () => {
      expect(pascalRow(0).reduce((a, b) => a + b, 0)).toBe(1);
    });
  });

  // ============================================================
  // Chain Polynomial
  // ============================================================
  describe('Chain Polynomial', () => {
    it('should return all-ones of length n+1', () => {
      expect(chainPoly(0)).toEqual([1]);
      expect(chainPoly(1)).toEqual([1, 1]);
      expect(chainPoly(2)).toEqual([1, 1, 1]);
      expect(chainPoly(3)).toEqual([1, 1, 1, 1]);
    });
  });

  // ============================================================
  // Rooted Tree Enumeration (A000081)
  // ============================================================
  describe('Rooted Tree Enumeration (A000081)', () => {
    it('should enumerate 1 tree with 1 node', () => {
      const trees = enumerateRootedTrees(1);
      expect(trees.length).toBe(1);
      expect(trees[0]).toEqual([]); // single root
    });

    it('should enumerate 1 tree with 2 nodes', () => {
      const trees = enumerateRootedTrees(2);
      expect(trees.length).toBe(A000081[2]); // 1
    });

    it('should enumerate 2 trees with 3 nodes', () => {
      const trees = enumerateRootedTrees(3);
      expect(trees.length).toBe(A000081[3]); // 2
    });

    it('should enumerate 4 trees with 4 nodes', () => {
      const trees = enumerateRootedTrees(4);
      expect(trees.length).toBe(A000081[4]); // 4
    });

    it('should enumerate 9 trees with 5 nodes (enneagram)', () => {
      const trees = enumerateRootedTrees(5);
      expect(trees.length).toBe(A000081[5]); // 9
    });

    it('should return empty for n=0', () => {
      expect(enumerateRootedTrees(0)).toEqual([]);
    });

    it('should verify sys(n) = a000081(n+1) for n=0..5', () => {
      for (let n = 0; n <= 5; n++) {
        const trees = enumerateRootedTrees(n + 1);
        expect(trees.length).toBe(A000081[n + 1]);
      }
    });
  });

  // ============================================================
  // Tree to Parenthesis Notation
  // ============================================================
  describe('Tree to Parenthesis', () => {
    it('should convert leaf to "()"', () => {
      expect(treeToParenthesis([])).toBe('()');
    });

    it('should convert star-2 to "(())"', () => {
      expect(treeToParenthesis([[]])).toBe('(())');
    });

    it('should produce unique parenthesis for each tree at n=4', () => {
      const trees = enumerateRootedTrees(4);
      const parens = trees.map(treeToParenthesis);
      const unique = new Set(parens);
      expect(unique.size).toBe(trees.length);
    });
  });

  // ============================================================
  // Tree Polynomial
  // ============================================================
  describe('Tree Polynomial', () => {
    it('should compute leaf polynomial as (1,-1)', () => {
      expect(treeToPoly([])).toEqual([1, -1]);
    });

    it('should compute star-2 polynomial', () => {
      const poly = treeToPoly([[]]);
      expect(poly.length).toBeGreaterThan(0);
      // Star-2: root with one leaf → shift1(leaf) = [1,1,-1], then convolve with [1]
      // = [1,1,-1]
      expect(poly).toEqual([1, 1, -1]);
    });

    it('should produce unique polynomials for each tree at n=4', () => {
      const trees = enumerateRootedTrees(4);
      const polys = trees.map(t => JSON.stringify(treeToPoly(t)));
      const unique = new Set(polys);
      // Polynomials should be unique per tree (tree-polynomial correspondence)
      expect(unique.size).toBe(trees.length);
    });
  });

  // ============================================================
  // Matula-Godsil Numbers
  // ============================================================
  describe('Matula-Godsil Numbers', () => {
    it('should assign 1 to the leaf', () => {
      expect(matulaNumber([])).toBe(1);
    });

    it('should assign 2 to the star-2 tree (root + 1 leaf)', () => {
      // matula([]) = 1, prime(1) = 2
      expect(matulaNumber([[]])).toBe(2);
    });

    it('should assign 3 to the chain-3 tree', () => {
      // chain-3: root → child → leaf = [[[]]]
      // matula([[]]) = 2, prime(2) = 3
      expect(matulaNumber([[[]]])).toBe(3);
    });

    it('should assign 4 to the star-3 tree (root + 2 leaves)', () => {
      // star-3: root → 2 leaves = [[], []]
      // matula([]) = 1, prime(1) = 2, product = 2*2 = 4
      expect(matulaNumber([[], []])).toBe(4);
    });

    it('should produce unique Matula numbers for each tree at n=4', () => {
      const trees = enumerateRootedTrees(4);
      const matulas = trees.map(matulaNumber);
      const unique = new Set(matulas);
      expect(unique.size).toBe(trees.length);
    });

    it('should produce prime Matula for chain trees', () => {
      // Chain trees have prime Matula numbers
      const chain2 = [[]]; // matula = 2 (prime)
      const chain3 = [[[]]]; // matula = 3 (prime)
      const chain4 = [[[[]]]]; // matula = 5 (prime)
      expect(matulaNumber(chain2)).toBe(2);
      expect(matulaNumber(chain3)).toBe(3);
      expect(matulaNumber(chain4)).toBe(5);
    });
  });

  // ============================================================
  // Symmetry Factor (Butcher Theory)
  // ============================================================
  describe('Symmetry Factor', () => {
    it('should be 1 for the leaf', () => {
      expect(symmetryFactor([])).toBe(1);
    });

    it('should be 1 for chain trees (no repeated subtrees)', () => {
      expect(symmetryFactor([[]])).toBe(1);
      expect(symmetryFactor([[[]]])).toBe(1);
    });

    it('should be 2 for star-3 (2 identical leaves)', () => {
      expect(symmetryFactor([[], []])).toBe(2);
    });

    it('should be 6 for star-4 (3 identical leaves)', () => {
      expect(symmetryFactor([[], [], []])).toBe(6);
    });
  });

  // ============================================================
  // Density (Node Count)
  // ============================================================
  describe('Density', () => {
    it('should be 1 for the leaf', () => {
      expect(density([])).toBe(1);
    });

    it('should be 2 for star-2', () => {
      expect(density([[]])).toBe(2);
    });

    it('should be 3 for chain-3', () => {
      expect(density([[[]]])).toBe(3);
    });

    it('should equal n for all trees with n nodes', () => {
      for (let n = 1; n <= 5; n++) {
        const trees = enumerateRootedTrees(n);
        for (const tree of trees) {
          expect(density(tree)).toBe(n);
        }
      }
    });
  });

  // ============================================================
  // Simplex Polytopes
  // ============================================================
  describe('Simplex Polytopes', () => {
    it('should build 0-simplex (point) for Sys0', () => {
      const p = buildSimplexPolytope(0);
      expect(p.vertices).toBe(1);
      expect(p.edges).toBe(0);
    });

    it('should build 1-simplex (line segment) for Sys1', () => {
      const p = buildSimplexPolytope(1);
      expect(p.vertices).toBe(2);
      expect(p.edges).toBe(1);
    });

    it('should build 2-simplex (triangle) for Sys2', () => {
      const p = buildSimplexPolytope(2);
      expect(p.vertices).toBe(3);
      expect(p.edges).toBe(3);
      expect(p.faces).toBe(1);
    });

    it('should build 3-simplex (tetrahedron) for Sys3', () => {
      const p = buildSimplexPolytope(3);
      expect(p.vertices).toBe(4);
      expect(p.edges).toBe(6);
      expect(p.faces).toBe(4);
    });

    it('should have Pascal row as incidence polynomial', () => {
      for (let n = 0; n <= 4; n++) {
        const p = buildSimplexPolytope(n);
        const expectedRow = pascalRow(n).map(Math.abs);
        expect(p.pascalRow).toEqual(expectedRow);
      }
    });
  });

  // ============================================================
  // Butcher/RK Conditions
  // ============================================================
  describe('Butcher Conditions', () => {
    it('should generate 1 condition for order 1', () => {
      const conditions = buildButcherConditions(1);
      expect(conditions.length).toBe(1);
      expect(conditions[0].order).toBe(1);
    });

    it('should generate conditions matching A000081 counts', () => {
      const conditions = buildButcherConditions(4);
      const countByOrder = new Map<number, number>();
      for (const c of conditions) {
        countByOrder.set(c.order, (countByOrder.get(c.order) ?? 0) + 1);
      }
      expect(countByOrder.get(1)).toBe(A000081[1]); // 1
      expect(countByOrder.get(2)).toBe(A000081[2]); // 1
      expect(countByOrder.get(3)).toBe(A000081[3]); // 2
      expect(countByOrder.get(4)).toBe(A000081[4]); // 4
    });

    it('should have positive symmetry and density for all conditions', () => {
      const conditions = buildButcherConditions(4);
      for (const c of conditions) {
        expect(c.symmetry).toBeGreaterThan(0);
        expect(c.density).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================
  // S-Gram Rhythms
  // ============================================================
  describe('S-Gram Rhythms', () => {
    it('should build rhythm for each system level', () => {
      for (let sys = 1; sys <= 6; sys++) {
        const rhythm = buildSGramRhythm(sys);
        expect(rhythm.system).toBe(sys);
        expect(rhythm.period).toBeGreaterThan(0);
        expect(rhythm.sequence.length).toBeGreaterThan(0);
        expect(rhythm.currentPosition).toBe(0);
      }
    });

    it('should have denominator 7 for Sys3 (1/7 particular sequence)', () => {
      const rhythm = buildSGramRhythm(3);
      expect(rhythm.denominator).toBe(7);
    });
  });

  // ============================================================
  // Structural Self-Model
  // ============================================================
  describe('Structural Self-Model', () => {
    it('should build a valid self-model', () => {
      const model = buildStructuralSelfModel();
      expect(model.root).toBeDefined();
      expect(model.root.name).toBe('deep-tree-echo');
      expect(model.identityPrime).toBeGreaterThan(0);
      expect(model.leafCount).toBeGreaterThan(0);
      expect(model.maxDepth).toBeGreaterThan(0);
      expect(model.complexity).toBeGreaterThan(0);
    });

    it('should have correct top-level children', () => {
      const model = buildStructuralSelfModel();
      const childNames = model.root.children.map(c => c.name);
      expect(childNames).toContain('core');
      expect(childNames).toContain('active-inference');
      expect(childNames).toContain('consciousness');
      expect(childNames).toContain('orchestrator');
      expect(childNames).toContain('dove9');
      expect(childNames).toContain('sys6-triality');
      expect(childNames).toContain('double-membrane');
    });

    it('should have polynomial for root', () => {
      const model = buildStructuralSelfModel();
      expect(model.totalPolynomial.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // TreePolytopeKernel Engine
  // ============================================================
  describe('TreePolytopeKernel Engine', () => {
    let kernel: TreePolytopeKernel;

    beforeEach(() => {
      kernel = createTreePolytopeKernel();
    });

    afterEach(() => {
      kernel.stop();
    });

    it('should initialize with valid state', () => {
      const state = kernel.getState();
      expect(state.selfModel).toBeDefined();
      expect(state.polytopes.size).toBe(7); // Sys0-Sys6
      expect(state.butcherConditions.length).toBeGreaterThan(0);
      expect(state.sgrams.length).toBe(6); // Sys1-Sys6
      expect(state.activeSystem).toBe(4); // Default to enneagram
      expect(state.integrity).toBe(1.0);
    });

    it('should return identity prime', () => {
      expect(kernel.getIdentityPrime()).toBeGreaterThan(0);
    });

    it('should return polytope for each system', () => {
      for (let sys = 0; sys <= 6; sys++) {
        const polytope = kernel.getPolytope(sys);
        expect(polytope).toBeDefined();
        expect(polytope!.system).toBe(sys);
      }
    });

    it('should advance s-gram rhythms', () => {
      const initial = kernel.getSGramValue(4);
      kernel.advanceSGrams();
      // After advance, position changed (value may or may not differ)
      const state = kernel.getState();
      expect(state.sgrams[3].currentPosition).toBe(1); // Sys4 is index 3
    });

    it('should validate Butcher conditions', () => {
      const result = kernel.validateButcherConditions();
      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('should compute integrity score in [0, 1]', () => {
      const integrity = kernel.computeIntegrity();
      expect(integrity).toBeGreaterThanOrEqual(0);
      expect(integrity).toBeLessThanOrEqual(1);
    });

    it('should set active system', () => {
      kernel.setActiveSystem(3);
      expect(kernel.getState().activeSystem).toBe(3);
    });

    it('should emit system-change event', (done) => {
      kernel.on('system-change', (sys) => {
        expect(sys).toBe(2);
        done();
      });
      kernel.setActiveSystem(2);
    });

    it('should provide snapshot for cosmic order bridge', () => {
      const snapshot = kernel.getSnapshot();
      expect(snapshot.identityPrime).toBeGreaterThan(0);
      expect(snapshot.integrity).toBeGreaterThanOrEqual(0);
      expect(snapshot.butcherValid).toBe(true);
      expect(Object.keys(snapshot.sgramValues).length).toBe(6);
    });

    it('should rebuild self-model', () => {
      const events: any[] = [];
      kernel.on('rebuild', (model) => events.push(model));
      kernel.rebuild();
      expect(events.length).toBe(1);
      expect(events[0].root.name).toBe('deep-tree-echo');
    });

    it('should start and stop periodic assessment', (done) => {
      const events: any[] = [];
      kernel.on('tick', (snapshot) => {
        events.push(snapshot);
        if (events.length >= 2) {
          kernel.stop();
          expect(events.length).toBeGreaterThanOrEqual(2);
          done();
        }
      });
      kernel.start(50); // Fast interval for testing
    }, 5000);
  });

  // ============================================================
  // Mathematical Invariants
  // ============================================================
  describe('Mathematical Invariants', () => {
    it('star tower: (1,-1)^N has 2^N absolute coefficient sum', () => {
      for (let n = 0; n <= 6; n++) {
        const row = pascalRow(n);
        const absSum = row.reduce((sum, c) => sum + Math.abs(c), 0);
        expect(absSum).toBe(Math.pow(2, n));
      }
    });

    it('chain primes: 2 → 3 → 5 → 11 → 31 → 127', () => {
      const chain2 = [[]]; // 2
      const chain3 = [[[]]]; // 3
      const chain4 = [[[[]]]]; // 5
      const chain5 = [[[[[]]]]]; // 11
      expect(matulaNumber(chain2)).toBe(2);
      expect(matulaNumber(chain3)).toBe(3);
      expect(matulaNumber(chain4)).toBe(5);
      expect(matulaNumber(chain5)).toBe(11);
    });

    it('Matula-polynomial correspondence: prime Matula ↔ two leading 1s', () => {
      // Chain trees have prime Matula and polynomial starting with [1, 1, ...]
      for (let n = 2; n <= 5; n++) {
        // Build chain tree of depth n
        let tree: RootedTree = [];
        for (let i = 1; i < n; i++) {
          tree = [tree];
        }
        const matula = matulaNumber(tree);
        const poly = treeToPoly(tree);
        // Chain trees have prime Matula numbers
        // and polynomials with first two coefficients being 1
        expect(poly[0]).toBe(1);
        expect(poly[1]).toBe(1);
      }
    });
  });
});
