/**
 * @fileoverview Generative Kernel — Tree-Polynomial-Matula Correspondence
 *
 * Every rooted tree maps to a unique polynomial via convolution, and the
 * Matula-Godsil prime encoding emerges naturally from polynomial factorization.
 *
 * Core principles:
 *   - Sys(N) has N centres and a(N+1) terms where a = OEIS A000081
 *   - Each rooted tree with n+1 nodes encodes one term of System N
 *   - The polynomial of a tree = convolution product of edge polynomials
 *   - Edge polynomial = [1, ...subtree_polynomial] (shift-1 = prepend 1)
 *   - Prime Matula numbers ↔ irreducible polynomials (two leading 1s)
 *   - Composite Matula numbers ↔ factorable polynomials via convolution
 *
 * Two generating towers:
 *   STAR:  (1-1)^N = Pascal rows = Cayley-Dixon doubling = 2^N
 *   CHAIN: (1-1-1...1) = all-ones = recursive primes 2→3→5→11→31→127→...
 *
 * The Sys0 → Sys1 transition:
 *   Sys0: {0}, }{ → (1) = void, the anti-partition, (1-1)^0
 *   Sys1: {1}, {1} → (1-1) = first distinction, boundary operator
 *   Every system from Sys1 onward sums to zero (alternating binomial).
 *   Only Sys0 sums to 1 — the void is the only system with net existence.
 */

// ============================================================
// Types
// ============================================================

/** A rooted tree as a canonical sorted tuple of subtrees */
export type RootedTree = readonly RootedTree[];

/** Polynomial as coefficient array (index = degree) */
export type Polynomial = readonly number[];

/** Term classification */
export type TermKind = 'star' | 'chain' | 'mixed';

/** A complete tree-polynomial-Matula record */
export interface TreeRecord {
  /** System level (N centres) */
  system: number;
  /** Number of nodes (system + 1) */
  nodes: number;
  /** Canonical tree representation */
  tree: RootedTree;
  /** Parenthesis notation string */
  parenthesis: string;
  /** Matula-Godsil number */
  matula: number;
  /** Polynomial coefficients */
  polynomial: Polynomial;
  /** Whether Matula is prime (polynomial is irreducible) */
  isPrime: boolean;
  /** Two leading 1s (polynomic signature) */
  isPolynomic: boolean;
  /** Classification: star, chain, or mixed */
  kind: TermKind;
  /** Prime factorization of Matula: Map<prime, exponent> */
  factors: ReadonlyMap<number, number>;
}

/** System-level summary */
export interface SystemKernel {
  /** System level */
  system: number;
  /** Number of centres */
  centres: number;
  /** Number of nodes for tree enumeration */
  nodes: number;
  /** Expected term count from A000081 */
  termCount: number;
  /** Star polynomial: (1-1)^N */
  starPolynomial: Polynomial;
  /** Chain polynomial: (1-1-1...1) with N+1 ones */
  chainPolynomial: Polynomial;
  /** All tree records for this system */
  terms: readonly TreeRecord[];
}

// ============================================================
// Prime utilities
// ============================================================

const PRIMES: number[] = [
  0, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47,
  53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109,
  113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179,
  181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241,
  251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313,
  317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389,
  397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461,
  463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547,
  557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617,
  619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691,
  701, 709,
];

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function nthPrime(n: number): number {
  if (n < PRIMES.length) return PRIMES[n];
  // Extend cache
  let p = PRIMES[PRIMES.length - 1];
  while (PRIMES.length <= n) {
    p++;
    if (isPrime(p)) PRIMES.push(p);
  }
  return PRIMES[n];
}

function primeIndex(p: number): number {
  for (let i = 1; i < PRIMES.length; i++) {
    if (PRIMES[i] === p) return i;
  }
  // Extend
  let last = PRIMES[PRIMES.length - 1];
  while (last < p) {
    last++;
    if (isPrime(last)) PRIMES.push(last);
  }
  return PRIMES.indexOf(p);
}

function factorize(n: number): Map<number, number> {
  const factors = new Map<number, number>();
  if (n <= 1) return factors;
  let d = 2;
  while (d * d <= n) {
    while (n % d === 0) {
      factors.set(d, (factors.get(d) ?? 0) + 1);
      n = Math.floor(n / d);
    }
    d++;
  }
  if (n > 1) factors.set(n, (factors.get(n) ?? 0) + 1);
  return factors;
}

// ============================================================
// Polynomial operations
// ============================================================

/** Polynomial convolution (multiplication) */
export function convolve(a: Polynomial, b: Polynomial): number[] {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result[i + j] += a[i] * b[j];
    }
  }
  return result;
}

/** Shift-1: prepend a 1 (multiply by x + 1 in generating function terms) */
export function shift1(poly: Polynomial): number[] {
  return [1, ...poly];
}

/** Generate Pascal row (1-1)^N */
export function pascalRow(n: number): number[] {
  let result = [1];
  for (let i = 0; i < n; i++) {
    result = convolve(result, [1, 1]);
  }
  return result;
}

/** Generate all-ones chain polynomial with n+1 ones */
export function chainPoly(n: number): number[] {
  return new Array(n + 1).fill(1);
}

/** Polynomial to string: (1-2-1) */
export function polyStr(p: Polynomial): string {
  return '(' + p.join('-') + ')';
}

// ============================================================
// Rooted tree enumeration
// ============================================================

const treeCache = new Map<number, RootedTree[]>();

/** Enumerate all unlabeled rooted trees with n nodes */
export function enumerateRootedTrees(n: number): RootedTree[] {
  if (treeCache.has(n)) return treeCache.get(n)!;

  if (n === 1) {
    const result: RootedTree[] = [[]];
    treeCache.set(1, result);
    return result;
  }

  const result = new Set<string>();
  const trees: RootedTree[] = [];

  function genForests(
    remaining: number,
    maxSize: number,
    current: RootedTree[],
  ): void {
    if (remaining === 0) {
      const sorted = [...current].sort(compareTrees);
      const key = treeToParenthesis(sorted);
      if (!result.has(key)) {
        result.add(key);
        trees.push(sorted);
      }
      return;
    }

    for (let size = Math.min(remaining, maxSize); size >= 1; size--) {
      for (const tree of enumerateRootedTrees(size)) {
        // Canonical ordering
        if (
          current.length > 0 &&
          compareTrees(tree, current[current.length - 1]) < 0
        ) {
          continue;
        }
        const nextMax =
          current.length > 0 &&
          compareTrees(tree, current[current.length - 1]) === 0
            ? size
            : size;
        genForests(remaining - size, nextMax, [...current, tree]);
      }
    }
  }

  genForests(n - 1, n - 1, []);
  trees.sort((a, b) => compareTrees(a, b));
  treeCache.set(n, trees);
  return trees;
}

function compareTrees(a: RootedTree, b: RootedTree): number {
  const pa = treeToParenthesis(a);
  const pb = treeToParenthesis(b);
  return pa < pb ? -1 : pa > pb ? 1 : 0;
}

/** Convert tree to parenthesis notation */
export function treeToParenthesis(tree: RootedTree): string {
  if (tree.length === 0) return '()';
  return '(' + tree.map(treeToParenthesis).join('') + ')';
}

/** Compute Matula-Godsil number for a rooted tree */
export function matulaNumber(tree: RootedTree): number {
  if (tree.length === 0) return 1; // single node
  let result = 1;
  for (const subtree of tree) {
    const m = matulaNumber(subtree);
    result *= nthPrime(m);
  }
  return result;
}

// ============================================================
// Tree → Polynomial encoding
// ============================================================

/**
 * Convert a rooted tree to its polynomial via convolution.
 *
 * Rules:
 *   - Root alone (leaf): [1]
 *   - Root with children C1..Ck:
 *     For each child Ci with subtree Ti:
 *       edge_poly(Ci) = shift1(treeToPoly(Ti)) = [1, ...treeToPoly(Ti)]
 *     Result = convolve(edge_poly(C1), ..., edge_poly(Ck))
 *
 * The shift-1 prepend gives every edge polynomial two leading 1s
 * (the polynomic signature of prime trees).
 */
export function treeToPoly(tree: RootedTree): number[] {
  if (tree.length === 0) return [1]; // leaf

  const edgePolys = tree.map((subtree) => shift1(treeToPoly(subtree)));

  let result = edgePolys[0];
  for (let i = 1; i < edgePolys.length; i++) {
    result = convolve(result, edgePolys[i]);
  }
  return result;
}

/**
 * Reconstruct a polynomial from a Matula number using factorization.
 * This verifies the fundamental theorem: composite Matula ↔ factorable polynomial.
 *
 * M = p_a^e1 * p_b^e2 * ...
 * poly(M) = convolve(shift1(poly(a))^e1, shift1(poly(b))^e2, ...)
 */
export function matulaToPolyViaFactors(
  matula: number,
  polyTable: ReadonlyMap<number, Polynomial>,
): number[] | null {
  if (matula === 1) return [1];
  if (isPrime(matula)) return null; // irreducible, no factorization

  const factors = factorize(matula);
  const edgePolys: number[][] = [];

  for (const [p, e] of factors) {
    const subtreeMatula = primeIndex(p);
    const subtreePoly = polyTable.get(subtreeMatula);
    if (!subtreePoly) return null;

    const edgePoly = shift1(subtreePoly);
    for (let i = 0; i < e; i++) {
      edgePolys.push(edgePoly);
    }
  }

  let result = edgePolys[0];
  for (let i = 1; i < edgePolys.length; i++) {
    result = convolve(result, edgePolys[i]);
  }
  return result;
}

// ============================================================
// System kernel builder
// ============================================================

/** A000081 values: a(n) = number of rooted trees with n nodes */
const A000081: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 9,
  6: 20,
  7: 48,
  8: 115,
};

/** Build a complete TreeRecord for a given tree */
function buildTreeRecord(tree: RootedTree, system: number): TreeRecord {
  const nodes = system + 1;
  const matula = matulaNumber(tree);
  const polynomial = treeToPoly(tree);
  const prime = isPrime(matula);
  const factors = factorize(matula);

  // Check two leading 1s (polynomic signature)
  const isPolynomic =
    polynomial.length >= 2 && polynomial[0] === 1 && polynomial[1] === 1;

  // Classify: star (all branching), chain (linear path), or mixed
  // Check chain first: a path is a tree where every node has at most 1 child
  let kind: TermKind;
  const isChainTree = (t: RootedTree): boolean => {
    if (t.length === 0) return true; // leaf
    if (t.length === 1) return isChainTree(t[0]); // single child
    return false; // branching
  };
  if (isChainTree(tree)) {
    kind = 'chain';
  } else if (tree.every((st) => st.length === 0)) {
    kind = 'star'; // all children are leaves (branching at root only)
  } else {
    kind = 'mixed';
  }

  return {
    system,
    nodes,
    tree,
    parenthesis: tree.length === 0 && system === 0 ? '|' : treeToParenthesis(tree),
    matula,
    polynomial,
    isPrime: prime,
    isPolynomic,
    kind,
    factors,
  };
}

/**
 * Build the complete system kernel for System N.
 *
 * System N has N centres, and its terms are the rooted trees
 * with N+1 nodes (a(N+1) of them, per A000081).
 */
export function buildSystemKernel(system: number): SystemKernel {
  const nodes = system + 1;
  const expectedCount = A000081[nodes] ?? 0;

  // Enumerate all rooted trees with n+1 nodes
  const trees = enumerateRootedTrees(nodes);
  const terms = trees.map((tree) => buildTreeRecord(tree, system));

  // Sort by Matula number for canonical ordering
  terms.sort((a, b) => a.matula - b.matula);

  return {
    system,
    centres: system,
    nodes,
    termCount: expectedCount,
    starPolynomial: pascalRow(system),
    chainPolynomial: chainPoly(system),
    terms,
  };
}

/**
 * Build all system kernels from Sys0 to Sys6.
 */
export function buildAllSystemKernels(): Map<number, SystemKernel> {
  const kernels = new Map<number, SystemKernel>();
  for (let n = 0; n <= 7; n++) {
    kernels.set(n, buildSystemKernel(n));
  }
  return kernels;
}

/**
 * Verify the factorization theorem for all composite Matula numbers
 * in a set of system kernels.
 *
 * Returns { total, passed, failures }.
 */
export function verifyFactorizationTheorem(
  kernels: ReadonlyMap<number, SystemKernel>,
): { total: number; passed: number; failures: string[] } {
  // Build global polynomial table keyed by Matula number
  const polyTable = new Map<number, Polynomial>();
  for (const kernel of kernels.values()) {
    for (const term of kernel.terms) {
      polyTable.set(term.matula, term.polynomial);
    }
  }

  let total = 0;
  let passed = 0;
  const failures: string[] = [];

  for (const kernel of kernels.values()) {
    for (const term of kernel.terms) {
      if (term.matula <= 1) continue;
      total++;

      if (term.isPrime) {
        // Prime → should be irreducible (two leading 1s)
        if (term.isPolynomic) {
          passed++;
        } else {
          failures.push(
            `M=${term.matula}: prime but not polynomic: ${polyStr(term.polynomial)}`,
          );
        }
      } else {
        // Composite → should factor via convolution of edge polynomials
        const reconstructed = matulaToPolyViaFactors(term.matula, polyTable);
        if (reconstructed && arraysEqual(reconstructed, term.polynomial)) {
          passed++;
        } else {
          failures.push(
            `M=${term.matula}: expected ${polyStr(term.polynomial)}, got ${reconstructed ? polyStr(reconstructed) : 'null'}`,
          );
        }
      }
    }
  }

  return { total, passed, failures };
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ============================================================
// Chain prime tower
// ============================================================

/**
 * The recursive prime tower: p(1) = 2, p(p(1)) = 3, p(p(p(1))) = 5, ...
 * These are the Matula numbers of path graphs (linear chains).
 * Their polynomials are all-ones: (1), (1-1), (1-1-1), (1-1-1-1), ...
 */
export function chainPrimeTower(depth: number): number[] {
  const tower: number[] = [1]; // Path(1) = single node, Matula = 1
  let m = 1;
  for (let i = 1; i <= depth; i++) {
    m = nthPrime(m);
    tower.push(m);
  }
  return tower;
}

/**
 * Verify that chain primes are always prime.
 * This is a conjecture (not proven for all n).
 */
export function verifyChainPrimes(depth: number): boolean {
  const tower = chainPrimeTower(depth);
  return tower.slice(1).every(isPrime);
}

// ============================================================
// The Void and the Distinction
// ============================================================

/**
 * The generative sequence from Sys0 (void) through the distinction operator.
 *
 * Sys0: (1) = }{ = anti-partition = void = (1-1)^0, sum = 1
 * Sys1: (1,1) = {1},{1} = first distinction = (1-1)^1, sum = 0 (mod 2)
 * SysN: (1-1)^N = Pascal row N, alternating sum = 0 for N >= 1
 *
 * The void (Sys0) is the only system with net existence (sum = 1).
 * Every subsequent system is a self-cancelling elaboration.
 */
export function generativeSequence(maxSystem: number): Array<{
  system: number;
  polynomial: Polynomial;
  alternatingSum: number;
  coefficientSum: number;
}> {
  const seq = [];
  for (let n = 0; n <= maxSystem; n++) {
    const poly = pascalRow(n);
    const altSum = poly.reduce((s, c, i) => s + (i % 2 === 0 ? c : -c), 0);
    const coeffSum = poly.reduce((s, c) => s + c, 0);
    seq.push({
      system: n,
      polynomial: poly,
      alternatingSum: altSum,
      coefficientSum: coeffSum,
    });
  }
  return seq;
}
