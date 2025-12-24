/**
 * @fileoverview Basic neural network layers
 *
 * Implements common layers like Linear, LayerNorm, etc.
 * Compatible with PyTorch's nn module interface.
 */

import { ShapedTensor, createTensor, zeros } from '../tensors/index.js';

import {
  add,
  matmul,
  reshape,
  layerNorm as layerNormOp,
  gelu,
  relu,
  sigmoid,
  tanh as tanhOp,
  softmax as softmaxOp,
} from '../tensors/operations.js';

import { Module, Parameter, createParameter } from './Module.js';

/**
 * Linear (fully connected) layer
 * y = xW^T + b
 */
export class Linear extends Module {
  private weight: Parameter;
  private bias: Parameter | null;

  readonly inFeatures: number;
  readonly outFeatures: number;

  constructor(inFeatures: number, outFeatures: number, bias: boolean = true) {
    super('Linear');
    this.inFeatures = inFeatures;
    this.outFeatures = outFeatures;

    // Weight: [outFeatures, inFeatures]
    this.weight = createParameter('weight', [outFeatures, inFeatures], 'xavier_uniform');
    this.registerParameter('weight', this.weight);

    // Bias: [outFeatures]
    if (bias) {
      this.bias = createParameter('bias', [outFeatures], 'zeros');
      this.registerParameter('bias', this.bias);
    } else {
      this.bias = null;
    }
  }

  forward(input: ShapedTensor): ShapedTensor {
    // Input shape: [..., inFeatures]
    // Output shape: [..., outFeatures]

    const inputShape = [...input.shape];
    const batchDims = inputShape.slice(0, -1);
    const batchSize = batchDims.reduce((a, b) => a * b, 1);

    // Reshape to 2D: [batch, inFeatures]
    const input2d = reshape(input, [batchSize, this.inFeatures]);

    // Transpose weight for matmul: [inFeatures, outFeatures]
    const weightT = createTensor(this._transposeWeight(), [this.inFeatures, this.outFeatures]);

    // y = x @ W^T
    let output = matmul(input2d, weightT);

    // Add bias
    if (this.bias) {
      // Broadcast bias across batch
      const biasExpanded = createTensor(
        new Array(batchSize).fill(0).flatMap(() => Array.from(this.bias!.data.data)),
        [batchSize, this.outFeatures]
      );
      output = add(output, biasExpanded);
    }

    // Reshape back to original batch dims
    return reshape(output, [...batchDims, this.outFeatures]);
  }

  private _transposeWeight(): number[] {
    const result = new Array(this.inFeatures * this.outFeatures);
    for (let i = 0; i < this.outFeatures; i++) {
      for (let j = 0; j < this.inFeatures; j++) {
        result[j * this.outFeatures + i] = this.weight.data.data[i * this.inFeatures + j];
      }
    }
    return result;
  }

  toString(): string {
    return `Linear(in_features=${this.inFeatures}, out_features=${this.outFeatures}, bias=${this.bias !== null})`;
  }
}

/**
 * Layer Normalization
 */
export class LayerNorm extends Module {
  private weight: Parameter;
  private bias: Parameter;

  readonly normalizedShape: number[];
  readonly eps: number;

  constructor(normalizedShape: number | number[], eps: number = 1e-5) {
    super('LayerNorm');
    this.normalizedShape = Array.isArray(normalizedShape) ? normalizedShape : [normalizedShape];
    this.eps = eps;

    const size = this.normalizedShape.reduce((a, b) => a * b, 1);

    // Learnable scale (gamma)
    this.weight = createParameter('weight', [size], 'ones');
    this.registerParameter('weight', this.weight);

    // Learnable shift (beta)
    this.bias = createParameter('bias', [size], 'zeros');
    this.registerParameter('bias', this.bias);
  }

  forward(input: ShapedTensor): ShapedTensor {
    // Normalize
    const normalized = layerNormOp(input, this.normalizedShape, this.eps);

    // Apply learnable parameters
    const normalizedSize = this.normalizedShape.reduce((a, b) => a * b, 1);
    const batchSize = input.data.length / normalizedSize;

    const result = new Array(input.data.length);
    for (let b = 0; b < batchSize; b++) {
      for (let i = 0; i < normalizedSize; i++) {
        const idx = b * normalizedSize + i;
        result[idx] = normalized.data[idx] * this.weight.data.data[i] + this.bias.data.data[i];
      }
    }

    return createTensor(result, [...input.shape], input.dtype);
  }

  toString(): string {
    return `LayerNorm(${this.normalizedShape}, eps=${this.eps})`;
  }
}

/**
 * GELU activation module
 */
export class GELU extends Module {
  constructor() {
    super('GELU');
  }

  forward(input: ShapedTensor): ShapedTensor {
    return gelu(input);
  }
}

/**
 * ReLU activation module
 */
export class ReLU extends Module {
  constructor() {
    super('ReLU');
  }

  forward(input: ShapedTensor): ShapedTensor {
    return relu(input);
  }
}

/**
 * Sigmoid activation module
 */
export class Sigmoid extends Module {
  constructor() {
    super('Sigmoid');
  }

  forward(input: ShapedTensor): ShapedTensor {
    return sigmoid(input);
  }
}

/**
 * Tanh activation module
 */
export class Tanh extends Module {
  constructor() {
    super('Tanh');
  }

  forward(input: ShapedTensor): ShapedTensor {
    return tanhOp(input);
  }
}

/**
 * Softmax activation module
 */
export class Softmax extends Module {
  readonly dim: number;

  constructor(dim: number = -1) {
    super('Softmax');
    this.dim = dim;
  }

  forward(input: ShapedTensor): ShapedTensor {
    return softmaxOp(input, this.dim);
  }
}

/**
 * Dropout layer
 */
export class Dropout extends Module {
  readonly p: number;

  constructor(p: number = 0.5) {
    super('Dropout');
    this.p = p;
  }

  forward(input: ShapedTensor): ShapedTensor {
    if (!this._training || this.p === 0) {
      return input;
    }

    // Create dropout mask
    const scale = 1 / (1 - this.p);
    const result = new Array(input.data.length);

    for (let i = 0; i < input.data.length; i++) {
      if (Math.random() < this.p) {
        result[i] = 0;
      } else {
        result[i] = input.data[i] * scale;
      }
    }

    return createTensor(result, [...input.shape], input.dtype);
  }

  toString(): string {
    return `Dropout(p=${this.p})`;
  }
}

/**
 * Bilinear layer
 * y = x1^T A x2 + b
 */
export class Bilinear extends Module {
  private weight: Parameter;
  private bias: Parameter | null;

  readonly in1Features: number;
  readonly in2Features: number;
  readonly outFeatures: number;

  constructor(in1Features: number, in2Features: number, outFeatures: number, bias: boolean = true) {
    super('Bilinear');
    this.in1Features = in1Features;
    this.in2Features = in2Features;
    this.outFeatures = outFeatures;

    // Weight: [outFeatures, in1Features, in2Features]
    this.weight = createParameter(
      'weight',
      [outFeatures, in1Features, in2Features],
      'xavier_uniform'
    );
    this.registerParameter('weight', this.weight);

    if (bias) {
      this.bias = createParameter('bias', [outFeatures], 'zeros');
      this.registerParameter('bias', this.bias);
    } else {
      this.bias = null;
    }
  }

  forward(input1: ShapedTensor, input2: ShapedTensor): ShapedTensor {
    // Input1: [batch, in1Features]
    // Input2: [batch, in2Features]
    // Output: [batch, outFeatures]

    const batchSize = input1.shape[0];
    const result = new Array(batchSize * this.outFeatures).fill(0);

    for (let b = 0; b < batchSize; b++) {
      for (let o = 0; o < this.outFeatures; o++) {
        let sum = 0;
        for (let i = 0; i < this.in1Features; i++) {
          for (let j = 0; j < this.in2Features; j++) {
            const wIdx = o * this.in1Features * this.in2Features + i * this.in2Features + j;
            const x1 = input1.data[b * this.in1Features + i];
            const x2 = input2.data[b * this.in2Features + j];
            sum += this.weight.data.data[wIdx] * x1 * x2;
          }
        }

        if (this.bias) {
          sum += this.bias.data.data[o];
        }

        result[b * this.outFeatures + o] = sum;
      }
    }

    return createTensor(result, [batchSize, this.outFeatures], input1.dtype);
  }

  toString(): string {
    return `Bilinear(in1_features=${this.in1Features}, in2_features=${this.in2Features}, out_features=${this.outFeatures}, bias=${this.bias !== null})`;
  }
}

/**
 * Embedding layer
 */
export class Embedding extends Module {
  private weight: Parameter;

  readonly numEmbeddings: number;
  readonly embeddingDim: number;

  constructor(numEmbeddings: number, embeddingDim: number) {
    super('Embedding');
    this.numEmbeddings = numEmbeddings;
    this.embeddingDim = embeddingDim;

    this.weight = createParameter('weight', [numEmbeddings, embeddingDim], 'normal');
    this.registerParameter('weight', this.weight);
  }

  forward(indices: ShapedTensor): ShapedTensor {
    // indices: [batch, seq_len] or [batch]
    // output: [batch, seq_len, embeddingDim] or [batch, embeddingDim]

    const flatIndices = Array.from(indices.data).map((x) => Math.floor(x));
    const result = new Array(flatIndices.length * this.embeddingDim);

    for (let i = 0; i < flatIndices.length; i++) {
      const idx = flatIndices[i];
      if (idx < 0 || idx >= this.numEmbeddings) {
        throw new Error(`Index ${idx} out of range [0, ${this.numEmbeddings})`);
      }
      for (let j = 0; j < this.embeddingDim; j++) {
        result[i * this.embeddingDim + j] = this.weight.data.data[idx * this.embeddingDim + j];
      }
    }

    const outputShape = [...indices.shape, this.embeddingDim];
    return createTensor(result, outputShape, 'float32');
  }

  toString(): string {
    return `Embedding(${this.numEmbeddings}, ${this.embeddingDim})`;
  }
}

/**
 * GRU Cell
 */
export class GRUCell extends Module {
  private weight_ih: Parameter;
  private weight_hh: Parameter;
  private bias_ih: Parameter | null;
  private bias_hh: Parameter | null;

  readonly inputSize: number;
  readonly hiddenSize: number;

  constructor(inputSize: number, hiddenSize: number, bias: boolean = true) {
    super('GRUCell');
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;

    // Input-hidden weights: [3 * hiddenSize, inputSize] for r, z, n gates
    this.weight_ih = createParameter('weight_ih', [3 * hiddenSize, inputSize], 'xavier_uniform');
    this.registerParameter('weight_ih', this.weight_ih);

    // Hidden-hidden weights: [3 * hiddenSize, hiddenSize]
    this.weight_hh = createParameter('weight_hh', [3 * hiddenSize, hiddenSize], 'xavier_uniform');
    this.registerParameter('weight_hh', this.weight_hh);

    if (bias) {
      this.bias_ih = createParameter('bias_ih', [3 * hiddenSize], 'zeros');
      this.bias_hh = createParameter('bias_hh', [3 * hiddenSize], 'zeros');
      this.registerParameter('bias_ih', this.bias_ih);
      this.registerParameter('bias_hh', this.bias_hh);
    } else {
      this.bias_ih = null;
      this.bias_hh = null;
    }
  }

  forward(input: ShapedTensor, hidden?: ShapedTensor): ShapedTensor {
    const batchSize = input.shape[0];

    // Initialize hidden state if not provided
    if (!hidden) {
      hidden = zeros([batchSize, this.hiddenSize]);
    }

    const result = new Array(batchSize * this.hiddenSize);

    for (let b = 0; b < batchSize; b++) {
      // Compute gates
      const gates_ih = new Array(3 * this.hiddenSize).fill(0);
      const gates_hh = new Array(3 * this.hiddenSize).fill(0);

      // Input-hidden contribution
      for (let g = 0; g < 3 * this.hiddenSize; g++) {
        let sum = 0;
        for (let i = 0; i < this.inputSize; i++) {
          sum +=
            this.weight_ih.data.data[g * this.inputSize + i] * input.data[b * this.inputSize + i];
        }
        if (this.bias_ih) {
          sum += this.bias_ih.data.data[g];
        }
        gates_ih[g] = sum;
      }

      // Hidden-hidden contribution
      for (let g = 0; g < 3 * this.hiddenSize; g++) {
        let sum = 0;
        for (let h = 0; h < this.hiddenSize; h++) {
          sum +=
            this.weight_hh.data.data[g * this.hiddenSize + h] *
            hidden.data[b * this.hiddenSize + h];
        }
        if (this.bias_hh) {
          sum += this.bias_hh.data.data[g];
        }
        gates_hh[g] = sum;
      }

      // Reset gate: r = sigmoid(W_ir @ x + b_ir + W_hr @ h + b_hr)
      // Update gate: z = sigmoid(W_iz @ x + b_iz + W_hz @ h + b_hz)
      // New gate: n = tanh(W_in @ x + b_in + r * (W_hn @ h + b_hn))
      // Hidden: h' = (1 - z) * n + z * h

      for (let h = 0; h < this.hiddenSize; h++) {
        const r = 1 / (1 + Math.exp(-(gates_ih[h] + gates_hh[h])));
        const z =
          1 / (1 + Math.exp(-(gates_ih[this.hiddenSize + h] + gates_hh[this.hiddenSize + h])));
        const n = Math.tanh(
          gates_ih[2 * this.hiddenSize + h] + r * gates_hh[2 * this.hiddenSize + h]
        );

        const hPrev = hidden.data[b * this.hiddenSize + h];
        result[b * this.hiddenSize + h] = (1 - z) * n + z * hPrev;
      }
    }

    return createTensor(result, [batchSize, this.hiddenSize], input.dtype);
  }

  toString(): string {
    return `GRUCell(${this.inputSize}, ${this.hiddenSize})`;
  }
}

/**
 * LSTM layer
 */
export class LSTM extends Module {
  private cells: GRUCell[]; // Simplified: using GRU cells for now

  readonly inputSize: number;
  readonly hiddenSize: number;
  readonly numLayers: number;
  readonly batchFirst: boolean;

  constructor(
    inputSize: number,
    hiddenSize: number,
    numLayers: number = 1,
    batchFirst: boolean = true
  ) {
    super('LSTM');
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.numLayers = numLayers;
    this.batchFirst = batchFirst;

    // Create cells for each layer
    this.cells = [];
    for (let i = 0; i < numLayers; i++) {
      const cellInputSize = i === 0 ? inputSize : hiddenSize;
      const cell = new GRUCell(cellInputSize, hiddenSize);
      this.cells.push(cell);
      this.registerModule(`cell_${i}`, cell);
    }
  }

  forward(
    input: ShapedTensor,
    hidden?: [ShapedTensor, ShapedTensor]
  ): [ShapedTensor, [ShapedTensor, ShapedTensor]] {
    // input: [batch, seq, input_size] if batchFirst else [seq, batch, input_size]
    // hidden: (h_0, c_0) each of shape [num_layers, batch, hidden_size]

    const batchSize = this.batchFirst ? input.shape[0] : input.shape[1];
    const seqLen = this.batchFirst ? input.shape[1] : input.shape[0];

    // Initialize hidden states
    const h = hidden?.[0] || zeros([this.numLayers, batchSize, this.hiddenSize]);
    const c = hidden?.[1] || zeros([this.numLayers, batchSize, this.hiddenSize]);

    // Process sequence
    const outputs: number[] = [];

    for (let t = 0; t < seqLen; t++) {
      // Get input at time t
      const inputT = new Array(batchSize * this.inputSize);
      for (let b = 0; b < batchSize; b++) {
        for (let i = 0; i < this.inputSize; i++) {
          const idx = this.batchFirst
            ? b * seqLen * this.inputSize + t * this.inputSize + i
            : t * batchSize * this.inputSize + b * this.inputSize + i;
          inputT[b * this.inputSize + i] = input.data[idx];
        }
      }

      let layerInput = createTensor(inputT, [batchSize, this.inputSize], input.dtype);

      // Process through layers
      for (let l = 0; l < this.numLayers; l++) {
        // Get hidden state for this layer
        const hL = new Array(batchSize * this.hiddenSize);
        for (let b = 0; b < batchSize; b++) {
          for (let i = 0; i < this.hiddenSize; i++) {
            hL[b * this.hiddenSize + i] =
              h.data[l * batchSize * this.hiddenSize + b * this.hiddenSize + i];
          }
        }
        const hiddenL = createTensor(hL, [batchSize, this.hiddenSize], input.dtype);

        // Forward through cell
        const newHidden = this.cells[l].forward(layerInput, hiddenL);

        // Update hidden state
        for (let b = 0; b < batchSize; b++) {
          for (let i = 0; i < this.hiddenSize; i++) {
            const hIdx = l * batchSize * this.hiddenSize + b * this.hiddenSize + i;
            (h.data as number[])[hIdx] = newHidden.data[b * this.hiddenSize + i];
          }
        }

        layerInput = newHidden;
      }

      // Collect output (from last layer)
      outputs.push(...Array.from(layerInput.data));
    }

    // Reshape outputs
    const outputShape = this.batchFirst
      ? [batchSize, seqLen, this.hiddenSize]
      : [seqLen, batchSize, this.hiddenSize];

    const output = createTensor(outputs, outputShape, input.dtype);

    return [output, [h, c]];
  }

  toString(): string {
    return `LSTM(${this.inputSize}, ${this.hiddenSize}, num_layers=${this.numLayers})`;
  }
}
