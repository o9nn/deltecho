/**
 * @fileoverview Basic neural network layers
 *
 * Implements common layers like Linear, LayerNorm, etc.
 * Compatible with PyTorch's nn module interface.
 */
import { ShapedTensor } from '../tensors/index.js';
import { Module } from './Module.js';
/**
 * Linear (fully connected) layer
 * y = xW^T + b
 */
export declare class Linear extends Module {
    private weight;
    private bias;
    readonly inFeatures: number;
    readonly outFeatures: number;
    constructor(inFeatures: number, outFeatures: number, bias?: boolean);
    forward(input: ShapedTensor): ShapedTensor;
    private _transposeWeight;
    toString(): string;
}
/**
 * Layer Normalization
 */
export declare class LayerNorm extends Module {
    private weight;
    private bias;
    readonly normalizedShape: number[];
    readonly eps: number;
    constructor(normalizedShape: number | number[], eps?: number);
    forward(input: ShapedTensor): ShapedTensor;
    toString(): string;
}
/**
 * GELU activation module
 */
export declare class GELU extends Module {
    constructor();
    forward(input: ShapedTensor): ShapedTensor;
}
/**
 * ReLU activation module
 */
export declare class ReLU extends Module {
    constructor();
    forward(input: ShapedTensor): ShapedTensor;
}
/**
 * Sigmoid activation module
 */
export declare class Sigmoid extends Module {
    constructor();
    forward(input: ShapedTensor): ShapedTensor;
}
/**
 * Tanh activation module
 */
export declare class Tanh extends Module {
    constructor();
    forward(input: ShapedTensor): ShapedTensor;
}
/**
 * Softmax activation module
 */
export declare class Softmax extends Module {
    readonly dim: number;
    constructor(dim?: number);
    forward(input: ShapedTensor): ShapedTensor;
}
/**
 * Dropout layer
 */
export declare class Dropout extends Module {
    readonly p: number;
    constructor(p?: number);
    forward(input: ShapedTensor): ShapedTensor;
    toString(): string;
}
/**
 * Bilinear layer
 * y = x1^T A x2 + b
 */
export declare class Bilinear extends Module {
    private weight;
    private bias;
    readonly in1Features: number;
    readonly in2Features: number;
    readonly outFeatures: number;
    constructor(in1Features: number, in2Features: number, outFeatures: number, bias?: boolean);
    forward(input1: ShapedTensor, input2: ShapedTensor): ShapedTensor;
    toString(): string;
}
/**
 * Embedding layer
 */
export declare class Embedding extends Module {
    private weight;
    readonly numEmbeddings: number;
    readonly embeddingDim: number;
    constructor(numEmbeddings: number, embeddingDim: number);
    forward(indices: ShapedTensor): ShapedTensor;
    toString(): string;
}
/**
 * GRU Cell
 */
export declare class GRUCell extends Module {
    private weight_ih;
    private weight_hh;
    private bias_ih;
    private bias_hh;
    readonly inputSize: number;
    readonly hiddenSize: number;
    constructor(inputSize: number, hiddenSize: number, bias?: boolean);
    forward(input: ShapedTensor, hidden?: ShapedTensor): ShapedTensor;
    toString(): string;
}
/**
 * LSTM layer
 */
export declare class LSTM extends Module {
    private cells;
    readonly inputSize: number;
    readonly hiddenSize: number;
    readonly numLayers: number;
    readonly batchFirst: boolean;
    constructor(inputSize: number, hiddenSize: number, numLayers?: number, batchFirst?: boolean);
    forward(input: ShapedTensor, hidden?: [ShapedTensor, ShapedTensor]): [ShapedTensor, [ShapedTensor, ShapedTensor]];
    toString(): string;
}
//# sourceMappingURL=layers.d.ts.map