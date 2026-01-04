/**
 * @fileoverview Tensor operations for Sys6 Triality
 *
 * Provides ATen-compatible operations for tensor manipulation.
 * These operations mirror PyTorch's ATen library for future portability.
 */
import { ShapedTensor, DyadicEdge, TriadicFace, TetradicBundle } from './types.js';
/**
 * Element-wise addition of two tensors
 */
export declare function add(a: ShapedTensor, b: ShapedTensor): ShapedTensor;
/**
 * Element-wise subtraction
 */
export declare function sub(a: ShapedTensor, b: ShapedTensor): ShapedTensor;
/**
 * Element-wise multiplication
 */
export declare function mul(a: ShapedTensor, b: ShapedTensor): ShapedTensor;
/**
 * Scalar multiplication
 */
export declare function scale(tensor: ShapedTensor, scalar: number): ShapedTensor;
/**
 * Matrix multiplication (2D tensors)
 */
export declare function matmul(a: ShapedTensor, b: ShapedTensor): ShapedTensor;
/**
 * Dot product of two 1D tensors
 */
export declare function dot(a: ShapedTensor, b: ShapedTensor): number;
/**
 * Concatenate tensors along a dimension
 */
export declare function cat(tensors: ShapedTensor[], dim?: number): ShapedTensor;
/**
 * Split tensor along a dimension
 */
export declare function split(tensor: ShapedTensor, splitSize: number, dim?: number): ShapedTensor[];
/**
 * ReLU activation
 */
export declare function relu(tensor: ShapedTensor): ShapedTensor;
/**
 * GELU activation (Gaussian Error Linear Unit)
 */
export declare function gelu(tensor: ShapedTensor): ShapedTensor;
/**
 * Sigmoid activation
 */
export declare function sigmoid(tensor: ShapedTensor): ShapedTensor;
/**
 * Tanh activation
 */
export declare function tanh(tensor: ShapedTensor): ShapedTensor;
/**
 * Softmax activation
 */
export declare function softmax(tensor: ShapedTensor, dim?: number): ShapedTensor;
/**
 * Layer normalization
 */
export declare function layerNorm(tensor: ShapedTensor, normalizedShape: number[], eps?: number): ShapedTensor;
/**
 * Opponent processing: compute the interaction between two poles
 */
export declare function opponentProcess(edge: DyadicEdge): ShapedTensor;
/**
 * Entangle two poles (order 2 entanglement)
 * Both poles access the same computation simultaneously
 */
export declare function entangle(edge: DyadicEdge): ShapedTensor;
/**
 * Extract thread states from a triadic face
 * Each thread is the average of its two adjacent edges
 */
export declare function extractThreadsFromFace(face: TriadicFace): {
    thread_i: ShapedTensor;
    thread_j: ShapedTensor;
    thread_k: ShapedTensor;
};
/**
 * Triadic integration: combine three thread states
 */
export declare function triadicIntegrate(thread_i: ShapedTensor, thread_j: ShapedTensor, thread_k: ShapedTensor): ShapedTensor;
/**
 * Extract vertex (thread) states from tetradic bundle
 * Each vertex appears in exactly 3 faces
 */
export declare function extractVerticesFromBundle(bundle: TetradicBundle): {
    vertex1: ShapedTensor;
    vertex2: ShapedTensor;
    vertex3: ShapedTensor;
    vertex4: ShapedTensor;
};
/**
 * Tetradic integration: combine four vertex states
 */
export declare function tetradicIntegrate(vertex1: ShapedTensor, vertex2: ShapedTensor, vertex3: ShapedTensor, vertex4: ShapedTensor): ShapedTensor;
/**
 * Clone a tensor
 */
export declare function clone(tensor: ShapedTensor): ShapedTensor;
/**
 * Reshape tensor to new shape
 */
export declare function reshape(tensor: ShapedTensor, newShape: number[]): ShapedTensor;
/**
 * Transpose tensor (swap two dimensions)
 */
export declare function transpose(tensor: ShapedTensor, dim0: number, dim1: number): ShapedTensor;
/**
 * Sum tensor along a dimension
 */
export declare function sum(tensor: ShapedTensor, dim?: number): ShapedTensor | number;
/**
 * Mean of tensor along a dimension
 */
export declare function mean(tensor: ShapedTensor, dim?: number): ShapedTensor | number;
//# sourceMappingURL=operations.d.ts.map