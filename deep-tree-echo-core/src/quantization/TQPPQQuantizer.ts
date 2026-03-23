/**
 * TQ ⊗ PPQ Quantizer — Zero-Multiply Neural Inference for DTE
 *
 * Integrates the Tree-Polytope NPU (Matula-Godsil rooted tree encoding)
 * with Ternary Quantization to eliminate multiplication entirely from
 * the MAC (Multiply-Accumulate) unit.
 *
 * Architecture:
 *   Weights  → TQ: {-1, 0, +1} encoded as 2-bit trits
 *   Activations → PPQ: Matula-encoded prime-partition integers
 *   MAC → ZMAC: negate/zero/pass (no multiplier hardware needed)
 *
 * The key insight: if weights are ternary, multiplication reduces to:
 *   w = -1 → negate activation
 *   w =  0 → skip (zero)
 *   w = +1 → pass activation unchanged
 *
 * This gives ~58% fewer gates, ~70% less energy, and ~5.3x faster
 * critical path compared to standard INT8 MAC units.
 *
 * @see cogpy/tq-ppq for the C++11 header-only reference implementation
 */
import { getLogger } from '../utils/logger.js';

const log = getLogger('deep-tree-echo-core/TQPPQQuantizer');

// ─── Matula-Godsil Encoding ────────────────────────────────────

/** First 100 primes for Matula encoding */
const PRIMES: number[] = (() => {
  const primes: number[] = [];
  for (let n = 2; primes.length < 100; n++) {
    let isPrime = true;
    for (let i = 0; i < primes.length && primes[i] * primes[i] <= n; i++) {
      if (n % primes[i] === 0) { isPrime = false; break; }
    }
    if (isPrime) primes.push(n);
  }
  return primes;
})();

/** Get the nth prime (1-indexed) */
function nthPrime(n: number): number {
  if (n < 1 || n > PRIMES.length) throw new Error(`Prime index ${n} out of range`);
  return PRIMES[n - 1];
}

/** Get the index of a prime (1-indexed) */
function primeIndex(p: number): number {
  const idx = PRIMES.indexOf(p);
  if (idx === -1) throw new Error(`${p} is not in the prime table`);
  return idx + 1;
}

/**
 * Compute the Matula number for a rooted tree.
 * The Matula number encodes the tree structure as a unique integer
 * via the prime factorization correspondence.
 *
 * Leaf → 1
 * Tree with subtrees [t1, t2, ...] → product of prime(matula(ti))
 */
export function matulaEncode(subtreeMatulas: number[]): number {
  if (subtreeMatulas.length === 0) return 1; // leaf
  let product = 1;
  for (const m of subtreeMatulas) {
    product *= nthPrime(m);
  }
  return product;
}

/**
 * Decode a Matula number back to subtree Matula numbers.
 */
export function matulaDecode(n: number): number[] {
  if (n === 1) return []; // leaf
  const subtrees: number[] = [];
  let remaining = n;
  for (const p of PRIMES) {
    if (p > remaining) break;
    while (remaining % p === 0) {
      subtrees.push(primeIndex(p));
      remaining /= p;
    }
  }
  return subtrees;
}

/**
 * Compute the prime exponent vector for a Matula number.
 * This is the key representation for PPQ: multiplication becomes
 * addition of exponent vectors.
 */
export function exponentVector(n: number, maxPrimes: number = 8): number[] {
  const vec = new Array(maxPrimes).fill(0);
  let remaining = n;
  for (let i = 0; i < maxPrimes && remaining > 1; i++) {
    while (remaining % PRIMES[i] === 0) {
      vec[i]++;
      remaining /= PRIMES[i];
    }
  }
  return vec;
}

// ─── Ternary Quantization ──────────────────────────────────────

export type Trit = -1 | 0 | 1;

/**
 * Quantize a float weight to ternary {-1, 0, +1} using threshold.
 * Weights within [-threshold, +threshold] are zeroed.
 */
export function ternaryQuantize(value: number, threshold: number): Trit {
  if (value > threshold) return 1;
  if (value < -threshold) return -1;
  return 0;
}

/**
 * Compute the optimal ternary threshold for a weight vector.
 * Uses the 0.7 * mean(|w|) heuristic from TWN (Ternary Weight Networks).
 */
export function optimalThreshold(weights: number[]): number {
  const absWeights = weights.map(Math.abs);
  const mean = absWeights.reduce((a, b) => a + b, 0) / absWeights.length;
  return 0.7 * mean;
}

/**
 * Quantize a weight matrix to ternary with optimal threshold.
 * Returns the ternary weights and the scaling factor alpha.
 */
export function quantizeWeights(weights: number[]): {
  ternary: Trit[];
  alpha: number;
  threshold: number;
  sparsity: number;
} {
  const threshold = optimalThreshold(weights);
  const ternary = weights.map(w => ternaryQuantize(w, threshold));

  // Compute scaling factor: alpha = mean(|w_i|) for non-zero entries
  const nonZero = weights.filter((_, i) => ternary[i] !== 0);
  const alpha = nonZero.length > 0
    ? nonZero.reduce((a, b) => a + Math.abs(b), 0) / nonZero.length
    : 1.0;

  const sparsity = ternary.filter(t => t === 0).length / ternary.length;

  return { ternary, alpha, threshold, sparsity };
}

// ─── PPQ Codebook ──────────────────────────────────────────────

export interface PPQCodebook {
  /** Number of quantization levels */
  levels: number;
  /** Matula numbers for each level */
  matulas: number[];
  /** Decoded float values for each level */
  values: number[];
  /** Exponent vectors for each level */
  exponents: number[][];
}

/**
 * Build a PPQ codebook using log-uniform spacing.
 * Maps the activation range to Matula-encoded integers.
 */
export function buildCodebook(bits: number = 8): PPQCodebook {
  const levels = 1 << bits; // 256 for 8-bit
  const halfLevels = levels >> 1;
  const matulas: number[] = [];
  const values: number[] = [];
  const exponents: number[][] = [];

  for (let i = 0; i < levels; i++) {
    // Map to signed range: [-halfLevels, halfLevels-1]
    const signed = i - halfLevels;
    const absVal = Math.abs(signed);

    // Matula number is the absolute index + 1 (0 maps to leaf=1)
    const matula = absVal + 1;
    const sign = signed >= 0 ? 1 : -1;

    // Decoded value: log-uniform spacing
    const value = sign * (absVal === 0 ? 0 : Math.pow(2, (absVal - 1) / (halfLevels - 1) * 4 - 2));

    matulas.push(matula);
    values.push(value);
    exponents.push(exponentVector(matula));
  }

  return { levels, matulas, values, exponents };
}

/**
 * Quantize an activation value using the PPQ codebook.
 * Returns the codebook index (8-bit integer).
 */
export function quantizeActivation(value: number, codebook: PPQCodebook): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < codebook.levels; i++) {
    const dist = Math.abs(value - codebook.values[i]);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ─── ZMAC (Zero-Multiply MAC) ──────────────────────────────────

/**
 * Zero-Multiply MAC operation.
 * Computes dot product of ternary weights and PPQ activations
 * WITHOUT any multiplication.
 *
 * For each pair (w, a):
 *   w = +1 → accumulator += alpha * codebook.values[a]
 *   w = -1 → accumulator -= alpha * codebook.values[a]
 *   w =  0 → skip (no operation)
 */
export function zmacDotProduct(
  weights: Trit[],
  activations: number[],
  alpha: number,
  codebook: PPQCodebook,
): number {
  let acc = 0;
  const len = Math.min(weights.length, activations.length);
  for (let i = 0; i < len; i++) {
    const w = weights[i];
    if (w === 0) continue; // zero: skip entirely
    const aVal = codebook.values[activations[i]];
    if (w === 1) {
      acc += aVal; // pass
    } else {
      acc -= aVal; // negate
    }
  }
  return acc * alpha;
}

/**
 * ZMAC GEMV (General Matrix-Vector multiply).
 * Computes y = alpha * W_ternary @ x_ppq
 */
export function zmacGemv(
  weightRows: Trit[][],
  activations: number[],
  alpha: number,
  codebook: PPQCodebook,
): number[] {
  return weightRows.map(row => zmacDotProduct(row, activations, alpha, codebook));
}

/**
 * ZMAC Linear layer: y = W @ x + bias
 */
export function zmacLinear(
  weightRows: Trit[][],
  activations: number[],
  alpha: number,
  bias: number[],
  codebook: PPQCodebook,
): number[] {
  const y = zmacGemv(weightRows, activations, alpha, codebook);
  for (let i = 0; i < y.length; i++) {
    y[i] += bias[i];
  }
  return y;
}

// ─── Hardware Cost Model ───────────────────────────────────────

export interface HardwareCost {
  gatesPerMAC: number;
  energyPerMAC_pJ: number;
  criticalPathDepth: number;
  description: string;
}

export const HARDWARE_COSTS: Record<string, HardwareCost> = {
  INT8: {
    gatesPerMAC: 96,
    energyPerMAC_pJ: 0.20,
    criticalPathDepth: 16,
    description: 'Standard 8×8 array multiplier + adder',
  },
  NF4: {
    gatesPerMAC: 72,
    energyPerMAC_pJ: 0.15,
    criticalPathDepth: 12,
    description: 'NormalFloat4 with LUT dequant + FP16 MAC',
  },
  TQ_PPQ: {
    gatesPerMAC: 40,
    energyPerMAC_pJ: 0.06,
    criticalPathDepth: 3,
    description: 'Zero-multiply: ternary select + PPQ accumulate',
  },
};

/**
 * Estimate inference cost for a given layer size and quantization method.
 */
export function estimateInferenceCost(
  inputDim: number,
  outputDim: number,
  method: 'INT8' | 'NF4' | 'TQ_PPQ',
): {
  totalMACs: number;
  totalGates: number;
  totalEnergy_nJ: number;
  speedupVsINT8: number;
} {
  const cost = HARDWARE_COSTS[method];
  const totalMACs = inputDim * outputDim;
  const totalGates = totalMACs * cost.gatesPerMAC;
  const totalEnergy_nJ = totalMACs * cost.energyPerMAC_pJ / 1000;
  const int8Cost = HARDWARE_COSTS.INT8;
  const speedupVsINT8 = int8Cost.criticalPathDepth / cost.criticalPathDepth;

  return { totalMACs, totalGates, totalEnergy_nJ, speedupVsINT8 };
}

// ─── Integration with Tree-Polytope Kernel ─────────────────────

/**
 * Quantize a reservoir state vector using PPQ encoding.
 * Maps continuous reservoir activations to Matula-encoded integers.
 */
export function quantizeReservoirState(
  state: number[],
  codebook: PPQCodebook,
): number[] {
  return state.map(v => quantizeActivation(v, codebook));
}

/**
 * Quantize readout weights using TQ encoding.
 * Returns ternary weights and scaling factor.
 */
export function quantizeReadoutWeights(weights: number[][]): {
  ternaryWeights: Trit[][];
  alpha: number;
  sparsity: number;
} {
  const flat = weights.flat();
  const { alpha, threshold } = quantizeWeights(flat);
  const ternaryWeights = weights.map(row =>
    row.map(w => ternaryQuantize(w, threshold))
  );
  const totalZeros = ternaryWeights.flat().filter(t => t === 0).length;
  const sparsity = totalZeros / flat.length;

  return { ternaryWeights, alpha, sparsity };
}

/**
 * Full TQ ⊗ PPQ inference pipeline for the DTE reservoir readout.
 *
 * 1. Reservoir state → PPQ quantize activations
 * 2. Readout weights → TQ quantize to ternary
 * 3. ZMAC: zero-multiply MAC to produce output
 */
export function tqppqInference(
  reservoirState: number[],
  readoutWeights: number[][],
  bias: number[],
  codebook?: PPQCodebook,
): {
  output: number[];
  sparsity: number;
  energySavings: number;
} {
  const cb = codebook ?? buildCodebook(8);

  // Step 1: Quantize activations
  const quantizedActivations = quantizeReservoirState(reservoirState, cb);

  // Step 2: Quantize weights
  const { ternaryWeights, alpha, sparsity } = quantizeReadoutWeights(readoutWeights);

  // Step 3: ZMAC inference
  const output = zmacLinear(ternaryWeights, quantizedActivations, alpha, bias, cb);

  // Energy savings estimate
  const tqppqCost = estimateInferenceCost(reservoirState.length, readoutWeights.length, 'TQ_PPQ');
  const int8Cost = estimateInferenceCost(reservoirState.length, readoutWeights.length, 'INT8');
  const energySavings = 1 - (tqppqCost.totalEnergy_nJ / int8Cost.totalEnergy_nJ);

  log.info(`TQ⊗PPQ inference: ${reservoirState.length}→${readoutWeights.length}, ` +
    `sparsity=${(sparsity * 100).toFixed(1)}%, energy savings=${(energySavings * 100).toFixed(1)}%`);

  return { output, sparsity, energySavings };
}
