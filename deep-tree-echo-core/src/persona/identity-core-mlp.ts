/**
 * @fileoverview Identity Core MLP — L0 coggml Dense Personality Encoding
 *
 * The "soul backup" — a deterministic MLP that encodes the persona's
 * identity as a dense neural network. Same personality vector = same
 * deterministic MLP initialization.
 *
 * Architecture: 49 → 128 → 64 → 30
 *   Input:  5D personality + 6D emotion + 6D frame + 32D context = 49
 *   Output: 16D action prefs + 6D emotional update + 8D style = 30
 *   Activation: ReLU (hidden), Linear (output)
 *
 * Grounded in tree-polytope kernel:
 *   - Weight initialization seeded from personality vector hash
 *   - Layer dimensions follow simplex incidence counts
 *   - The MLP IS the identity — structure and function are inseparable
 *
 * @packageDocumentation
 */

import type { PersonalityVector, EmotionalState, CommunicationStyle } from './persona-orchestrator.js';

// ─── Types ──────────────────────────────────────────────────────

/** MLP layer weights and biases */
export interface MLPLayer {
  weights: number[][];  // [outputDim][inputDim]
  biases: number[];     // [outputDim]
}

/** Complete MLP state for backup/restore */
export interface MLPState {
  layers: MLPLayer[];
  inputDim: number;
  hiddenDims: number[];
  outputDim: number;
  seed: number;
  version: string;
}

/** MLP input vector (49D) */
export interface MLPInput {
  personality: number[];   // 5D
  emotion: number[];       // 6D (valence, arousal, dominance, joy, sadness, anger)
  frame: number[];         // 6D (context frame encoding)
  context: number[];       // 32D (context hash)
}

/** MLP output vector (30D) */
export interface MLPOutput {
  actionPreferences: number[];  // 16D
  emotionalUpdate: number[];    // 6D
  styleModulation: number[];    // 8D
}

/** Configuration for the Identity Core MLP */
export interface IdentityCoreMlpConfig {
  inputDim: number;
  hiddenDims: number[];
  outputDim: number;
  learningRate: number;
}

// ─── Deterministic PRNG (xoshiro128**) ──────────────────────────

class Xoshiro128 {
  private s: Uint32Array;

  constructor(seed: number) {
    this.s = new Uint32Array(4);
    // SplitMix64 seeding
    let z = seed >>> 0;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) >>> 0;
      let t = z ^ (z >>> 16);
      t = Math.imul(t, 0x85ebca6b);
      t ^= t >>> 13;
      t = Math.imul(t, 0xc2b2ae35);
      t ^= t >>> 16;
      this.s[i] = t >>> 0;
    }
  }

  next(): number {
    const result = Math.imul(this.rotl(Math.imul(this.s[1], 5), 7), 9);
    const t = this.s[1] << 9;
    this.s[2] ^= this.s[0];
    this.s[3] ^= this.s[1];
    this.s[1] ^= this.s[2];
    this.s[0] ^= this.s[3];
    this.s[2] ^= t;
    this.s[3] = this.rotl(this.s[3], 11);
    return (result >>> 0) / 0x100000000;
  }

  /** Gaussian via Box-Muller */
  gaussian(mean = 0, std = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }

  private rotl(x: number, k: number): number {
    return ((x << k) | (x >>> (32 - k))) >>> 0;
  }
}

// ─── Identity Core MLP ─────────────────────────────────────────

const DEFAULT_CONFIG: IdentityCoreMlpConfig = {
  inputDim: 49,
  hiddenDims: [128, 64],
  outputDim: 30,
  learningRate: 0.001,
};

/**
 * IdentityCoreMLP — Dense personality encoding for emergency backup/restore
 *
 * The MLP deterministically encodes the persona's identity. Given the same
 * personality vector, the same MLP is always produced. This is the L0
 * "soul backup" — minimum viable persona when combined with L7 system prompt.
 */
export class IdentityCoreMLP {
  private config: IdentityCoreMlpConfig;
  private layers: MLPLayer[];
  private seed: number;

  constructor(personality: PersonalityVector, config: Partial<IdentityCoreMlpConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Deterministic seed from personality vector
    this.seed = this.personalityToSeed(personality);

    // Initialize layers with deterministic weights
    this.layers = this.initializeLayers();
  }

  /**
   * Forward pass: personality + emotion + frame + context → action + emotion_update + style
   */
  forward(input: MLPInput): MLPOutput {
    // Concatenate input vector
    const x = [
      ...input.personality,
      ...input.emotion,
      ...input.frame,
      ...input.context,
    ];

    // Validate input dimension
    if (x.length !== this.config.inputDim) {
      // Pad or truncate to match
      while (x.length < this.config.inputDim) x.push(0);
      if (x.length > this.config.inputDim) x.length = this.config.inputDim;
    }

    // Forward through layers
    let activation = x;
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const output: number[] = new Array(layer.biases.length);

      for (let i = 0; i < layer.biases.length; i++) {
        let sum = layer.biases[i];
        for (let j = 0; j < activation.length; j++) {
          sum += layer.weights[i][j] * activation[j];
        }
        output[i] = sum;
      }

      // ReLU for hidden layers, linear for output
      if (l < this.layers.length - 1) {
        for (let i = 0; i < output.length; i++) {
          output[i] = Math.max(0, output[i]);
        }
      }

      activation = output;
    }

    // Split output into components
    return {
      actionPreferences: activation.slice(0, 16),
      emotionalUpdate: activation.slice(16, 22),
      styleModulation: activation.slice(22, 30),
    };
  }

  /**
   * Online learning from feedback (simple gradient descent)
   */
  adaptFromFeedback(input: MLPInput, targetOutput: MLPOutput, reward: number): void {
    const predicted = this.forward(input);
    const target = [
      ...targetOutput.actionPreferences,
      ...targetOutput.emotionalUpdate,
      ...targetOutput.styleModulation,
    ];
    const pred = [
      ...predicted.actionPreferences,
      ...predicted.emotionalUpdate,
      ...predicted.styleModulation,
    ];

    // Simple output layer weight adjustment (reward-modulated)
    const lastLayer = this.layers[this.layers.length - 1];
    const lr = this.config.learningRate * reward;

    for (let i = 0; i < lastLayer.biases.length; i++) {
      const error = target[i] - pred[i];
      lastLayer.biases[i] += lr * error;
      // Weight update would require storing activations — simplified here
    }
  }

  /**
   * Export weights for backup (SafeTensors-compatible JSON)
   */
  exportWeights(): MLPState {
    return {
      layers: this.layers.map(l => ({
        weights: l.weights.map(row => [...row]),
        biases: [...l.biases],
      })),
      inputDim: this.config.inputDim,
      hiddenDims: [...this.config.hiddenDims],
      outputDim: this.config.outputDim,
      seed: this.seed,
      version: '1.0.0',
    };
  }

  /**
   * Import weights from backup
   */
  importWeights(state: MLPState): void {
    if (state.layers.length !== this.layers.length) {
      throw new Error(`Layer count mismatch: expected ${this.layers.length}, got ${state.layers.length}`);
    }
    this.layers = state.layers.map(l => ({
      weights: l.weights.map(row => [...row]),
      biases: [...l.biases],
    }));
    this.seed = state.seed;
  }

  /**
   * Get the deterministic seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Get layer dimensions
   */
  getDimensions(): { input: number; hidden: number[]; output: number } {
    return {
      input: this.config.inputDim,
      hidden: [...this.config.hiddenDims],
      output: this.config.outputDim,
    };
  }

  /**
   * Count total parameters
   */
  getParameterCount(): number {
    let count = 0;
    for (const layer of this.layers) {
      count += layer.weights.length * layer.weights[0].length; // weights
      count += layer.biases.length; // biases
    }
    return count;
  }

  // ─── Private Methods ────────────────────────────────────────

  private personalityToSeed(p: PersonalityVector): number {
    // Deterministic hash from personality vector
    const values = [p.playfulness, p.intelligence, p.empathy, p.chaotic, p.sarcasm];
    let hash = 0x811c9dc5; // FNV offset basis
    for (const v of values) {
      const bits = Math.round(v * 1000);
      hash ^= bits;
      hash = Math.imul(hash, 0x01000193); // FNV prime
    }
    return hash >>> 0;
  }

  private initializeLayers(): MLPLayer[] {
    const rng = new Xoshiro128(this.seed);
    const dims = [this.config.inputDim, ...this.config.hiddenDims, this.config.outputDim];
    const layers: MLPLayer[] = [];

    for (let l = 0; l < dims.length - 1; l++) {
      const inputDim = dims[l];
      const outputDim = dims[l + 1];

      // He initialization: std = sqrt(2/fan_in)
      const std = Math.sqrt(2.0 / inputDim);

      const weights: number[][] = [];
      for (let i = 0; i < outputDim; i++) {
        const row: number[] = [];
        for (let j = 0; j < inputDim; j++) {
          row.push(rng.gaussian(0, std));
        }
        weights.push(row);
      }

      const biases = new Array(outputDim).fill(0);

      layers.push({ weights, biases });
    }

    return layers;
  }
}

/**
 * Create an IdentityCoreMLP from a personality vector
 */
export function createIdentityCoreMLP(
  personality: PersonalityVector,
  config?: Partial<IdentityCoreMlpConfig>
): IdentityCoreMLP {
  return new IdentityCoreMLP(personality, config);
}
