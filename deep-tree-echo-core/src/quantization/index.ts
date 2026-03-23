/**
 * @fileoverview Quantization module — TQ ⊗ PPQ zero-multiply inference
 *
 * Exports the Tree-Polytope NPU quantization engine that eliminates
 * multiplication from the MAC unit by combining:
 *   - Ternary Quantization (TQ) for weights: {-1, 0, +1}
 *   - Prime-Partition Quantization (PPQ) for activations: Matula-encoded integers
 *   - Zero-Multiply MAC (ZMAC): negate/zero/pass accumulation
 */
export {
  // Matula-Godsil encoding
  matulaEncode,
  matulaDecode,
  exponentVector,
  // Ternary quantization
  ternaryQuantize,
  optimalThreshold,
  quantizeWeights,
  // PPQ codebook
  buildCodebook,
  quantizeActivation,
  // ZMAC operations
  zmacDotProduct,
  zmacGemv,
  zmacLinear,
  // Hardware cost model
  estimateInferenceCost,
  HARDWARE_COSTS,
  // Integration with DTE reservoir
  quantizeReservoirState,
  quantizeReadoutWeights,
  tqppqInference,
  // Types
  type Trit,
  type PPQCodebook,
  type HardwareCost,
} from './TQPPQQuantizer.js';
