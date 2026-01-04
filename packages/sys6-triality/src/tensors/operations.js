/**
 * @fileoverview Tensor operations for Sys6 Triality
 *
 * Provides ATen-compatible operations for tensor manipulation.
 * These operations mirror PyTorch's ATen library for future portability.
 */
import { createTensor, } from './types.js';
// =============================================================================
// BASIC TENSOR OPERATIONS
// =============================================================================
/**
 * Element-wise addition of two tensors
 */
export function add(a, b) {
    validateSameShape(a, b);
    const result = new Array(a.data.length);
    for (let i = 0; i < a.data.length; i++) {
        result[i] = a.data[i] + b.data[i];
    }
    return createTensor(result, [...a.shape], a.dtype);
}
/**
 * Element-wise subtraction
 */
export function sub(a, b) {
    validateSameShape(a, b);
    const result = new Array(a.data.length);
    for (let i = 0; i < a.data.length; i++) {
        result[i] = a.data[i] - b.data[i];
    }
    return createTensor(result, [...a.shape], a.dtype);
}
/**
 * Element-wise multiplication
 */
export function mul(a, b) {
    validateSameShape(a, b);
    const result = new Array(a.data.length);
    for (let i = 0; i < a.data.length; i++) {
        result[i] = a.data[i] * b.data[i];
    }
    return createTensor(result, [...a.shape], a.dtype);
}
/**
 * Scalar multiplication
 */
export function scale(tensor, scalar) {
    const result = new Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
        result[i] = tensor.data[i] * scalar;
    }
    return createTensor(result, [...tensor.shape], tensor.dtype);
}
/**
 * Matrix multiplication (2D tensors)
 */
export function matmul(a, b) {
    if (a.shape.length !== 2 || b.shape.length !== 2) {
        throw new Error('matmul requires 2D tensors');
    }
    if (a.shape[1] !== b.shape[0]) {
        throw new Error(`Matrix dimensions incompatible: ${a.shape} x ${b.shape}`);
    }
    const [m, k] = a.shape;
    const n = b.shape[1];
    const result = new Array(m * n).fill(0);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let p = 0; p < k; p++) {
                sum += a.data[i * k + p] * b.data[p * n + j];
            }
            result[i * n + j] = sum;
        }
    }
    return createTensor(result, [m, n], a.dtype);
}
/**
 * Dot product of two 1D tensors
 */
export function dot(a, b) {
    if (a.shape.length !== 1 || b.shape.length !== 1) {
        throw new Error('dot requires 1D tensors');
    }
    validateSameShape(a, b);
    let sum = 0;
    for (let i = 0; i < a.data.length; i++) {
        sum += a.data[i] * b.data[i];
    }
    return sum;
}
/**
 * Concatenate tensors along a dimension
 */
export function cat(tensors, dim = 0) {
    if (tensors.length === 0) {
        throw new Error('Cannot concatenate empty array');
    }
    const first = tensors[0];
    const ndim = first.shape.length;
    // Handle negative dimensions (Python-style)
    if (dim < 0) {
        dim = ndim + dim;
    }
    if (dim < 0 || dim >= ndim) {
        throw new Error(`Invalid dimension ${dim} for ${ndim}D tensor`);
    }
    // Validate shapes match except for concat dimension
    for (let i = 1; i < tensors.length; i++) {
        for (let d = 0; d < ndim; d++) {
            if (d !== dim && tensors[i].shape[d] !== first.shape[d]) {
                throw new Error(`Shape mismatch at dimension ${d}: ${first.shape} vs ${tensors[i].shape}`);
            }
        }
    }
    // Calculate output shape
    const outputShape = [...first.shape];
    outputShape[dim] = tensors.reduce((sum, t) => sum + t.shape[dim], 0);
    // Simple case: concatenating along first dimension
    if (dim === 0) {
        const result = [];
        for (const t of tensors) {
            result.push(...Array.from(t.data));
        }
        return createTensor(result, outputShape, first.dtype);
    }
    // General case: more complex indexing needed
    const outputSize = outputShape.reduce((a, b) => a * b, 1);
    const result = new Array(outputSize);
    // Calculate strides
    const strides = new Array(ndim);
    strides[ndim - 1] = 1;
    for (let d = ndim - 2; d >= 0; d--) {
        strides[d] = strides[d + 1] * outputShape[d + 1];
    }
    let offset = 0;
    for (const t of tensors) {
        // Copy tensor data to appropriate positions
        const tSize = t.data.length;
        for (let i = 0; i < tSize; i++) {
            // Convert flat index to multi-dimensional index
            const indices = new Array(ndim);
            let remaining = i;
            for (let d = ndim - 1; d >= 0; d--) {
                const stride = d === ndim - 1 ? 1 : t.shape.slice(d + 1).reduce((a, b) => a * b, 1);
                indices[d] = Math.floor(remaining / stride);
                remaining = remaining % stride;
            }
            // Adjust index for concat dimension
            indices[dim] += offset;
            // Convert back to flat index in output
            let outIdx = 0;
            for (let d = 0; d < ndim; d++) {
                outIdx += indices[d] * strides[d];
            }
            result[outIdx] = t.data[i];
        }
        offset += t.shape[dim];
    }
    return createTensor(result, outputShape, first.dtype);
}
/**
 * Split tensor along a dimension
 */
export function split(tensor, splitSize, dim = 0) {
    const dimSize = tensor.shape[dim];
    const numSplits = Math.ceil(dimSize / splitSize);
    const results = [];
    for (let i = 0; i < numSplits; i++) {
        const start = i * splitSize;
        const end = Math.min(start + splitSize, dimSize);
        const size = end - start;
        const newShape = [...tensor.shape];
        newShape[dim] = size;
        // Extract slice
        const sliceData = [];
        const totalSize = tensor.data.length;
        const dimStride = tensor.shape.slice(dim + 1).reduce((a, b) => a * b, 1);
        const outerStride = tensor.shape.slice(dim).reduce((a, b) => a * b, 1);
        for (let j = 0; j < totalSize; j++) {
            const dimIndex = Math.floor((j % outerStride) / dimStride);
            if (dimIndex >= start && dimIndex < end) {
                sliceData.push(tensor.data[j]);
            }
        }
        results.push(createTensor(sliceData, newShape, tensor.dtype));
    }
    return results;
}
// =============================================================================
// ACTIVATION FUNCTIONS
// =============================================================================
/**
 * ReLU activation
 */
export function relu(tensor) {
    const result = new Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
        result[i] = Math.max(0, tensor.data[i]);
    }
    return createTensor(result, [...tensor.shape], tensor.dtype);
}
/**
 * GELU activation (Gaussian Error Linear Unit)
 */
export function gelu(tensor) {
    const result = new Array(tensor.data.length);
    const sqrt2 = Math.sqrt(2);
    for (let i = 0; i < tensor.data.length; i++) {
        const x = tensor.data[i];
        // GELU(x) = x * Φ(x) where Φ is the CDF of standard normal
        // Approximation: 0.5 * x * (1 + tanh(sqrt(2/π) * (x + 0.044715 * x^3)))
        const inner = Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x);
        result[i] = 0.5 * x * (1 + Math.tanh(inner));
    }
    return createTensor(result, [...tensor.shape], tensor.dtype);
}
/**
 * Sigmoid activation
 */
export function sigmoid(tensor) {
    const result = new Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
        const x = tensor.data[i];
        result[i] = 1 / (1 + Math.exp(-x));
    }
    return createTensor(result, [...tensor.shape], tensor.dtype);
}
/**
 * Tanh activation
 */
export function tanh(tensor) {
    const result = new Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
        result[i] = Math.tanh(tensor.data[i]);
    }
    return createTensor(result, [...tensor.shape], tensor.dtype);
}
/**
 * Softmax activation
 */
export function softmax(tensor, dim = -1) {
    if (dim < 0)
        dim = tensor.shape.length + dim;
    const result = new Array(tensor.data.length);
    const dimSize = tensor.shape[dim];
    const outerSize = tensor.shape.slice(0, dim).reduce((a, b) => a * b, 1);
    const innerSize = tensor.shape.slice(dim + 1).reduce((a, b) => a * b, 1);
    for (let outer = 0; outer < outerSize; outer++) {
        for (let inner = 0; inner < innerSize; inner++) {
            // Find max for numerical stability
            let max = -Infinity;
            for (let d = 0; d < dimSize; d++) {
                const idx = outer * dimSize * innerSize + d * innerSize + inner;
                max = Math.max(max, tensor.data[idx]);
            }
            // Compute exp and sum
            let sum = 0;
            const exps = new Array(dimSize);
            for (let d = 0; d < dimSize; d++) {
                const idx = outer * dimSize * innerSize + d * innerSize + inner;
                exps[d] = Math.exp(tensor.data[idx] - max);
                sum += exps[d];
            }
            // Normalize
            for (let d = 0; d < dimSize; d++) {
                const idx = outer * dimSize * innerSize + d * innerSize + inner;
                result[idx] = exps[d] / sum;
            }
        }
    }
    return createTensor(result, [...tensor.shape], tensor.dtype);
}
// =============================================================================
// NORMALIZATION
// =============================================================================
/**
 * Layer normalization
 */
export function layerNorm(tensor, normalizedShape, eps = 1e-5) {
    const result = new Array(tensor.data.length);
    const normalizedSize = normalizedShape.reduce((a, b) => a * b, 1);
    const batchSize = tensor.data.length / normalizedSize;
    for (let b = 0; b < batchSize; b++) {
        const start = b * normalizedSize;
        // Compute mean
        let mean = 0;
        for (let i = 0; i < normalizedSize; i++) {
            mean += tensor.data[start + i];
        }
        mean /= normalizedSize;
        // Compute variance
        let variance = 0;
        for (let i = 0; i < normalizedSize; i++) {
            const diff = tensor.data[start + i] - mean;
            variance += diff * diff;
        }
        variance /= normalizedSize;
        // Normalize
        const std = Math.sqrt(variance + eps);
        for (let i = 0; i < normalizedSize; i++) {
            result[start + i] = (tensor.data[start + i] - mean) / std;
        }
    }
    return createTensor(result, [...tensor.shape], tensor.dtype);
}
// =============================================================================
// DYADIC OPERATIONS
// =============================================================================
/**
 * Opponent processing: compute the interaction between two poles
 */
export function opponentProcess(edge) {
    // Compute difference (contrast)
    const contrast = sub(edge.poleA, edge.poleB);
    // Compute sum (integration)
    const integration = add(edge.poleA, edge.poleB);
    // Combine: contrast modulates integration
    return mul(contrast, scale(integration, 0.5));
}
/**
 * Entangle two poles (order 2 entanglement)
 * Both poles access the same computation simultaneously
 */
export function entangle(edge) {
    // Bilinear interaction
    const interaction = mul(edge.poleA, edge.poleB);
    // Normalize
    return layerNorm(interaction, [...edge.poleA.shape.slice(1)]);
}
// =============================================================================
// TRIADIC OPERATIONS
// =============================================================================
/**
 * Extract thread states from a triadic face
 * Each thread is the average of its two adjacent edges
 */
export function extractThreadsFromFace(face) {
    // Thread i = (edge_ij.poleA + edge_ki.poleB) / 2
    const thread_i = scale(add(face.edge_ij.poleA, face.edge_ki.poleB), 0.5);
    // Thread j = (edge_ij.poleB + edge_jk.poleA) / 2
    const thread_j = scale(add(face.edge_ij.poleB, face.edge_jk.poleA), 0.5);
    // Thread k = (edge_jk.poleB + edge_ki.poleA) / 2
    const thread_k = scale(add(face.edge_jk.poleB, face.edge_ki.poleA), 0.5);
    return { thread_i, thread_j, thread_k };
}
/**
 * Triadic integration: combine three thread states
 */
export function triadicIntegrate(thread_i, thread_j, thread_k) {
    // Concatenate and reduce
    const combined = cat([thread_i, thread_j, thread_k], -1);
    // Apply GELU activation
    return gelu(combined);
}
// =============================================================================
// TETRADIC OPERATIONS
// =============================================================================
/**
 * Extract vertex (thread) states from tetradic bundle
 * Each vertex appears in exactly 3 faces
 */
export function extractVerticesFromBundle(bundle) {
    const threads_123 = extractThreadsFromFace(bundle.face_123);
    const threads_124 = extractThreadsFromFace(bundle.face_124);
    const threads_134 = extractThreadsFromFace(bundle.face_134);
    const threads_234 = extractThreadsFromFace(bundle.face_234);
    // Vertex 1 appears in faces 123, 124, 134
    const vertex1 = scale(add(add(threads_123.thread_i, threads_124.thread_i), threads_134.thread_i), 1 / 3);
    // Vertex 2 appears in faces 123, 124, 234
    const vertex2 = scale(add(add(threads_123.thread_j, threads_124.thread_j), threads_234.thread_i), 1 / 3);
    // Vertex 3 appears in faces 123, 134, 234
    const vertex3 = scale(add(add(threads_123.thread_k, threads_134.thread_j), threads_234.thread_j), 1 / 3);
    // Vertex 4 appears in faces 124, 134, 234
    const vertex4 = scale(add(add(threads_124.thread_k, threads_134.thread_k), threads_234.thread_k), 1 / 3);
    return { vertex1, vertex2, vertex3, vertex4 };
}
/**
 * Tetradic integration: combine four vertex states
 */
export function tetradicIntegrate(vertex1, vertex2, vertex3, vertex4) {
    // Concatenate all vertices
    const combined = cat([vertex1, vertex2, vertex3, vertex4], -1);
    // Apply GELU activation
    return gelu(combined);
}
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Validate that two tensors have the same shape
 */
function validateSameShape(a, b) {
    if (a.shape.join(',') !== b.shape.join(',')) {
        throw new Error(`Shape mismatch: ${a.shape} vs ${b.shape}`);
    }
}
/**
 * Clone a tensor
 */
export function clone(tensor) {
    return createTensor([...Array.from(tensor.data)], [...tensor.shape], tensor.dtype);
}
/**
 * Reshape tensor to new shape
 */
export function reshape(tensor, newShape) {
    const oldSize = tensor.shape.reduce((a, b) => a * b, 1);
    const newSize = newShape.reduce((a, b) => a * b, 1);
    if (oldSize !== newSize) {
        throw new Error(`Cannot reshape tensor of size ${oldSize} to shape ${newShape} (size ${newSize})`);
    }
    return createTensor([...Array.from(tensor.data)], newShape, tensor.dtype);
}
/**
 * Transpose tensor (swap two dimensions)
 */
export function transpose(tensor, dim0, dim1) {
    const ndim = tensor.shape.length;
    if (dim0 < 0)
        dim0 = ndim + dim0;
    if (dim1 < 0)
        dim1 = ndim + dim1;
    const newShape = [...tensor.shape];
    [newShape[dim0], newShape[dim1]] = [newShape[dim1], newShape[dim0]];
    const result = new Array(tensor.data.length);
    // Calculate strides for both old and new shapes
    const oldStrides = new Array(ndim);
    const newStrides = new Array(ndim);
    oldStrides[ndim - 1] = 1;
    newStrides[ndim - 1] = 1;
    for (let d = ndim - 2; d >= 0; d--) {
        oldStrides[d] = oldStrides[d + 1] * tensor.shape[d + 1];
        newStrides[d] = newStrides[d + 1] * newShape[d + 1];
    }
    // Transpose
    for (let i = 0; i < tensor.data.length; i++) {
        // Convert flat index to multi-dimensional
        const indices = new Array(ndim);
        let remaining = i;
        for (let d = 0; d < ndim; d++) {
            indices[d] = Math.floor(remaining / oldStrides[d]);
            remaining = remaining % oldStrides[d];
        }
        // Swap dimensions
        [indices[dim0], indices[dim1]] = [indices[dim1], indices[dim0]];
        // Convert back to flat index
        let newIdx = 0;
        for (let d = 0; d < ndim; d++) {
            newIdx += indices[d] * newStrides[d];
        }
        result[newIdx] = tensor.data[i];
    }
    return createTensor(result, newShape, tensor.dtype);
}
/**
 * Sum tensor along a dimension
 */
export function sum(tensor, dim) {
    if (dim === undefined) {
        // Sum all elements
        let total = 0;
        for (let i = 0; i < tensor.data.length; i++) {
            total += tensor.data[i];
        }
        return total;
    }
    if (dim < 0)
        dim = tensor.shape.length + dim;
    const newShape = [...tensor.shape];
    newShape.splice(dim, 1);
    if (newShape.length === 0) {
        newShape.push(1);
    }
    const newSize = newShape.reduce((a, b) => a * b, 1);
    const result = new Array(newSize).fill(0);
    const dimSize = tensor.shape[dim];
    const outerSize = tensor.shape.slice(0, dim).reduce((a, b) => a * b, 1);
    const innerSize = tensor.shape.slice(dim + 1).reduce((a, b) => a * b, 1);
    for (let outer = 0; outer < outerSize; outer++) {
        for (let inner = 0; inner < innerSize; inner++) {
            let s = 0;
            for (let d = 0; d < dimSize; d++) {
                const idx = outer * dimSize * innerSize + d * innerSize + inner;
                s += tensor.data[idx];
            }
            result[outer * innerSize + inner] = s;
        }
    }
    return createTensor(result, newShape, tensor.dtype);
}
/**
 * Mean of tensor along a dimension
 */
export function mean(tensor, dim) {
    if (dim === undefined) {
        const total = sum(tensor);
        return total / tensor.data.length;
    }
    const summed = sum(tensor, dim);
    return scale(summed, 1 / tensor.shape[dim]);
}
//# sourceMappingURL=operations.js.map