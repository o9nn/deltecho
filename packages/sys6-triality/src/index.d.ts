/**
 * @fileoverview Sys6 Triality - Nested Neural Networks for Cognitive Architecture
 *
 * This package implements the Sys6 Triality cognitive architecture with:
 * - 30-step cognitive cycle (LCM(2,3,5) = 30)
 * - Dyadic, Triadic, and Tetradic convolutions
 * - Nested Neural Networks (NNN) following OEIS A000081
 * - ATen-compatible tensor operations
 * - PyTorch nn.Module-compatible interface
 *
 * @example
 * ```typescript
 * import { Sys6CycleEngine, createTensor } from '@deltecho/sys6-triality';
 *
 * // Create engine
 * const engine = new Sys6CycleEngine({ dim: 256 });
 *
 * // Create input state
 * const input = createTensor(new Array(256).fill(0).map(() => Math.random()), [1, 256]);
 *
 * // Run 30-step cycle
 * const result = engine.forward(input);
 * console.log('Final state:', result.finalState);
 * console.log('Processing time:', result.processingTimeMs, 'ms');
 * ```
 */
export * from './tensors/index.js';
export * from './modules/index.js';
export * from './engine/index.js';
export * from './integration/index.js';
export * from './operadic/index.js';
//# sourceMappingURL=index.d.ts.map
