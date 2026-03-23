/**
 * @fileoverview Tests for TQ ⊗ PPQ Zero-Multiply Quantizer
 *
 * Tests the complete quantization pipeline:
 *   - Matula-Godsil encoding/decoding
 *   - Ternary weight quantization
 *   - PPQ activation codebook
 *   - ZMAC zero-multiply MAC operations
 *   - Hardware cost model
 *   - DTE reservoir integration
 */
import { describe, it, expect } from '@jest/globals';
import {
  matulaEncode,
  matulaDecode,
  exponentVector,
  ternaryQuantize,
  optimalThreshold,
  quantizeWeights,
  buildCodebook,
  quantizeActivation,
  zmacDotProduct,
  zmacGemv,
  zmacLinear,
  estimateInferenceCost,
  HARDWARE_COSTS,
  quantizeReservoirState,
  quantizeReadoutWeights,
  tqppqInference,
  type Trit,
} from '../quantization/index.js';

describe('TQ ⊗ PPQ Quantizer', () => {
  // ─── Matula-Godsil Encoding ────────────────────────────────

  describe('Matula-Godsil Encoding', () => {
    it('should encode a leaf as 1', () => {
      expect(matulaEncode([])).toBe(1);
    });

    it('should encode a single-child tree', () => {
      // Tree with one leaf subtree: prime(matula(leaf)) = prime(1) = 2
      expect(matulaEncode([1])).toBe(2);
    });

    it('should encode a two-child tree', () => {
      // Tree with two leaf subtrees: prime(1) * prime(1) = 2 * 2 = 4
      expect(matulaEncode([1, 1])).toBe(4);
    });

    it('should encode a path of length 2', () => {
      // Path: root → child → leaf
      // Inner: matulaEncode([1]) = 2
      // Root: matulaEncode([2]) = prime(2) = 3
      expect(matulaEncode([2])).toBe(3);
    });

    it('should decode a leaf correctly', () => {
      expect(matulaDecode(1)).toEqual([]);
    });

    it('should decode 2 to a single leaf subtree', () => {
      expect(matulaDecode(2)).toEqual([1]);
    });

    it('should decode 4 to two leaf subtrees', () => {
      expect(matulaDecode(4)).toEqual([1, 1]);
    });

    it('should decode 3 to a single depth-1 subtree', () => {
      expect(matulaDecode(3)).toEqual([2]);
    });

    it('should round-trip encode/decode', () => {
      const subtrees = [1, 2, 1];
      const encoded = matulaEncode(subtrees);
      const decoded = matulaDecode(encoded);
      // Decoded may be in different order but same multiset
      expect(decoded.sort()).toEqual(subtrees.sort());
    });
  });

  describe('Exponent Vector', () => {
    it('should return zero vector for 1', () => {
      expect(exponentVector(1, 4)).toEqual([0, 0, 0, 0]);
    });

    it('should encode 2 as [1,0,0,0]', () => {
      expect(exponentVector(2, 4)).toEqual([1, 0, 0, 0]);
    });

    it('should encode 12 = 2^2 * 3 as [2,1,0,0]', () => {
      expect(exponentVector(12, 4)).toEqual([2, 1, 0, 0]);
    });

    it('should encode 30 = 2*3*5 as [1,1,1,0]', () => {
      expect(exponentVector(30, 4)).toEqual([1, 1, 1, 0]);
    });
  });

  // ─── Ternary Quantization ──────────────────────────────────

  describe('Ternary Quantization', () => {
    it('should quantize positive values above threshold to +1', () => {
      expect(ternaryQuantize(0.5, 0.3)).toBe(1);
    });

    it('should quantize negative values below -threshold to -1', () => {
      expect(ternaryQuantize(-0.5, 0.3)).toBe(-1);
    });

    it('should quantize values within threshold to 0', () => {
      expect(ternaryQuantize(0.1, 0.3)).toBe(0);
      expect(ternaryQuantize(-0.1, 0.3)).toBe(0);
    });

    it('should compute optimal threshold', () => {
      const weights = [0.1, -0.5, 0.8, -0.2, 0.0, 0.3, -0.7, 0.4];
      const threshold = optimalThreshold(weights);
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThan(1);
    });

    it('should quantize weights with sparsity', () => {
      const weights = [0.1, -0.5, 0.8, -0.02, 0.0, 0.03, -0.7, 0.4];
      const result = quantizeWeights(weights);
      expect(result.ternary).toHaveLength(8);
      expect(result.alpha).toBeGreaterThan(0);
      expect(result.sparsity).toBeGreaterThanOrEqual(0);
      expect(result.sparsity).toBeLessThanOrEqual(1);
      // All values should be -1, 0, or 1
      for (const t of result.ternary) {
        expect([-1, 0, 1]).toContain(t);
      }
    });
  });

  // ─── PPQ Codebook ──────────────────────────────────────────

  describe('PPQ Codebook', () => {
    it('should build a codebook with correct number of levels', () => {
      const cb = buildCodebook(4); // 4-bit = 16 levels
      expect(cb.levels).toBe(16);
      expect(cb.matulas).toHaveLength(16);
      expect(cb.values).toHaveLength(16);
      expect(cb.exponents).toHaveLength(16);
    });

    it('should build an 8-bit codebook with 256 levels', () => {
      const cb = buildCodebook(8);
      expect(cb.levels).toBe(256);
    });

    it('should have zero at the center', () => {
      const cb = buildCodebook(4);
      // The center value (index 8) should be 0
      expect(cb.values[8]).toBe(0);
    });

    it('should quantize activations to nearest codebook entry', () => {
      const cb = buildCodebook(8);
      const idx = quantizeActivation(0.0, cb);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(256);
    });

    it('should quantize extreme values to boundary entries', () => {
      const cb = buildCodebook(8);
      const posIdx = quantizeActivation(1000.0, cb);
      const negIdx = quantizeActivation(-1000.0, cb);
      expect(posIdx).not.toBe(negIdx);
    });
  });

  // ─── ZMAC Operations ──────────────────────────────────────

  describe('ZMAC Operations', () => {
    const codebook = buildCodebook(8);

    it('should compute dot product with all-ones weights', () => {
      const weights: Trit[] = [1, 1, 1, 1];
      const activations = [128, 128, 128, 128]; // center of codebook
      const result = zmacDotProduct(weights, activations, 1.0, codebook);
      expect(typeof result).toBe('number');
      expect(isFinite(result)).toBe(true);
    });

    it('should return zero for all-zero weights', () => {
      const weights: Trit[] = [0, 0, 0, 0];
      const activations = [100, 150, 200, 50];
      const result = zmacDotProduct(weights, activations, 1.0, codebook);
      expect(result).toBe(0);
    });

    it('should negate for all-negative-one weights', () => {
      const weights: Trit[] = [1, 1, 1, 1];
      const negWeights: Trit[] = [-1, -1, -1, -1];
      const activations = [100, 150, 200, 50];
      const pos = zmacDotProduct(weights, activations, 1.0, codebook);
      const neg = zmacDotProduct(negWeights, activations, 1.0, codebook);
      expect(neg).toBeCloseTo(-pos, 5);
    });

    it('should scale by alpha', () => {
      const weights: Trit[] = [1, 1, 1, 1];
      const activations = [100, 150, 200, 50];
      const r1 = zmacDotProduct(weights, activations, 1.0, codebook);
      const r2 = zmacDotProduct(weights, activations, 2.0, codebook);
      expect(r2).toBeCloseTo(2 * r1, 5);
    });

    it('should compute GEMV correctly', () => {
      const weightRows: Trit[][] = [
        [1, 0, -1, 1],
        [0, 1, 1, -1],
        [-1, -1, 0, 1],
      ];
      const activations = [100, 150, 200, 50];
      const result = zmacGemv(weightRows, activations, 1.0, codebook);
      expect(result).toHaveLength(3);
      for (const v of result) {
        expect(isFinite(v)).toBe(true);
      }
    });

    it('should compute linear layer with bias', () => {
      const weightRows: Trit[][] = [
        [1, 0, -1],
        [0, 1, 1],
      ];
      const activations = [100, 150, 200];
      const bias = [0.5, -0.5];
      const result = zmacLinear(weightRows, activations, 1.0, bias, codebook);
      expect(result).toHaveLength(2);
      // Verify bias is added
      const noBias = zmacGemv(weightRows, activations, 1.0, codebook);
      expect(result[0]).toBeCloseTo(noBias[0] + 0.5, 5);
      expect(result[1]).toBeCloseTo(noBias[1] - 0.5, 5);
    });
  });

  // ─── Hardware Cost Model ───────────────────────────────────

  describe('Hardware Cost Model', () => {
    it('should have TQ_PPQ cost lower than INT8', () => {
      expect(HARDWARE_COSTS.TQ_PPQ.gatesPerMAC).toBeLessThan(HARDWARE_COSTS.INT8.gatesPerMAC);
      expect(HARDWARE_COSTS.TQ_PPQ.energyPerMAC_pJ).toBeLessThan(HARDWARE_COSTS.INT8.energyPerMAC_pJ);
      expect(HARDWARE_COSTS.TQ_PPQ.criticalPathDepth).toBeLessThan(HARDWARE_COSTS.INT8.criticalPathDepth);
    });

    it('should estimate inference cost correctly', () => {
      const cost = estimateInferenceCost(256, 64, 'TQ_PPQ');
      expect(cost.totalMACs).toBe(256 * 64);
      expect(cost.speedupVsINT8).toBeGreaterThan(1);
    });

    it('should show TQ_PPQ speedup of ~5.3x over INT8', () => {
      const cost = estimateInferenceCost(256, 64, 'TQ_PPQ');
      expect(cost.speedupVsINT8).toBeCloseTo(16 / 3, 0);
    });
  });

  // ─── DTE Reservoir Integration ─────────────────────────────

  describe('DTE Reservoir Integration', () => {
    it('should quantize reservoir state to PPQ indices', () => {
      const state = Array.from({ length: 32 }, () => Math.random() * 2 - 1);
      const codebook = buildCodebook(8);
      const quantized = quantizeReservoirState(state, codebook);
      expect(quantized).toHaveLength(32);
      for (const idx of quantized) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(256);
      }
    });

    it('should quantize readout weights to ternary', () => {
      const weights = Array.from({ length: 8 }, () =>
        Array.from({ length: 32 }, () => Math.random() * 2 - 1)
      );
      const result = quantizeReadoutWeights(weights);
      expect(result.ternaryWeights).toHaveLength(8);
      expect(result.ternaryWeights[0]).toHaveLength(32);
      expect(result.alpha).toBeGreaterThan(0);
      expect(result.sparsity).toBeGreaterThanOrEqual(0);
    });

    it('should run full TQ⊗PPQ inference pipeline', () => {
      const reservoirState = Array.from({ length: 32 }, () => Math.random() * 2 - 1);
      const readoutWeights = Array.from({ length: 8 }, () =>
        Array.from({ length: 32 }, () => Math.random() * 2 - 1)
      );
      const bias = Array.from({ length: 8 }, () => Math.random() * 0.1);

      const result = tqppqInference(reservoirState, readoutWeights, bias);
      expect(result.output).toHaveLength(8);
      expect(result.sparsity).toBeGreaterThanOrEqual(0);
      expect(result.energySavings).toBeGreaterThan(0);
      for (const v of result.output) {
        expect(isFinite(v)).toBe(true);
      }
    });

    it('should show energy savings > 50%', () => {
      const reservoirState = Array.from({ length: 256 }, () => Math.random() * 2 - 1);
      const readoutWeights = Array.from({ length: 64 }, () =>
        Array.from({ length: 256 }, () => Math.random() * 2 - 1)
      );
      const bias = Array.from({ length: 64 }, () => 0);

      const result = tqppqInference(reservoirState, readoutWeights, bias);
      expect(result.energySavings).toBeGreaterThan(0.5);
    });
  });
});
