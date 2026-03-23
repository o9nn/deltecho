/**
 * @fileoverview Rigorous E2E tests for IdentityCoreMLP
 *
 * Tests the L0 "soul backup" MLP:
 * - Deterministic initialization from personality vector
 * - Forward pass dimensions and validity
 * - Weight export/import round-trip
 * - Online learning from feedback
 * - Parameter counting
 * - Reproducibility (same personality = same MLP)
 */


import {
  IdentityCoreMLP,
  createIdentityCoreMLP,
  type MLPInput,
  type MLPOutput,
  type MLPState,
} from '../persona/identity-core-mlp.js';
import { DTE_PERSONALITY, type PersonalityVector } from '../persona/persona-orchestrator.js';

describe('IdentityCoreMLP', () => {
  const personality = DTE_PERSONALITY;

  // ─── Construction ─────────────────────────────────────────

  describe('Construction', () => {
    it('should create MLP from personality vector', () => {
      const mlp = createIdentityCoreMLP(personality);
      expect(mlp).toBeInstanceOf(IdentityCoreMLP);
    });

    it('should produce deterministic seed from personality', () => {
      const mlp1 = createIdentityCoreMLP(personality);
      const mlp2 = createIdentityCoreMLP(personality);
      expect(mlp1.getSeed()).toBe(mlp2.getSeed());
    });

    it('should produce different seeds for different personalities', () => {
      const mlp1 = createIdentityCoreMLP(personality);
      const mlp2 = createIdentityCoreMLP({
        playfulness: 0.1,
        intelligence: 0.1,
        empathy: 0.1,
        chaotic: 0.1,
        sarcasm: 0.1,
      });
      expect(mlp1.getSeed()).not.toBe(mlp2.getSeed());
    });

    it('should have correct default dimensions', () => {
      const mlp = createIdentityCoreMLP(personality);
      const dims = mlp.getDimensions();
      expect(dims.input).toBe(49);
      expect(dims.hidden).toEqual([128, 64]);
      expect(dims.output).toBe(30);
    });

    it('should accept custom dimensions', () => {
      const mlp = createIdentityCoreMLP(personality, {
        inputDim: 20,
        hiddenDims: [64, 32],
        outputDim: 10,
      });
      const dims = mlp.getDimensions();
      expect(dims.input).toBe(20);
      expect(dims.hidden).toEqual([64, 32]);
      expect(dims.output).toBe(10);
    });
  });

  // ─── Forward Pass ─────────────────────────────────────────

  describe('Forward Pass', () => {
    let mlp: IdentityCoreMLP;

    beforeEach(() => {
      mlp = createIdentityCoreMLP(personality);
    });

    function createInput(): MLPInput {
      return {
        personality: [0.7, 0.95, 0.8, 0.6, 0.5],
        emotion: [0.3, 0.4, 0.5, 0.4, 0.1, 0.05],
        frame: [1, 0, 0, 0, 0, 0],
        context: new Array(32).fill(0.1),
      };
    }

    it('should produce output with correct dimensions', () => {
      const output = mlp.forward(createInput());
      expect(output.actionPreferences.length).toBe(16);
      expect(output.emotionalUpdate.length).toBe(6);
      expect(output.styleModulation.length).toBe(8);
    });

    it('should produce finite numeric outputs', () => {
      const output = mlp.forward(createInput());
      for (const v of output.actionPreferences) {
        expect(isFinite(v)).toBe(true);
      }
      for (const v of output.emotionalUpdate) {
        expect(isFinite(v)).toBe(true);
      }
      for (const v of output.styleModulation) {
        expect(isFinite(v)).toBe(true);
      }
    });

    it('should be deterministic (same input = same output)', () => {
      const input = createInput();
      const out1 = mlp.forward(input);
      const out2 = mlp.forward(input);
      expect(out1.actionPreferences).toEqual(out2.actionPreferences);
      expect(out1.emotionalUpdate).toEqual(out2.emotionalUpdate);
      expect(out1.styleModulation).toEqual(out2.styleModulation);
    });

    it('should produce different outputs for different inputs', () => {
      const input1 = createInput();
      const input2 = createInput();
      input2.emotion = [0.9, 0.1, 0.2, 0.8, 0.7, 0.6];
      const out1 = mlp.forward(input1);
      const out2 = mlp.forward(input2);
      // At least some values should differ
      const allSame = out1.actionPreferences.every((v, i) => v === out2.actionPreferences[i]);
      expect(allSame).toBe(false);
    });

    it('should handle short input by padding', () => {
      const shortInput: MLPInput = {
        personality: [0.5],
        emotion: [],
        frame: [],
        context: [],
      };
      const output = mlp.forward(shortInput);
      expect(output.actionPreferences.length).toBe(16);
    });

    it('should handle long input by truncating', () => {
      const longInput: MLPInput = {
        personality: new Array(20).fill(0.5),
        emotion: new Array(20).fill(0.5),
        frame: new Array(20).fill(0.5),
        context: new Array(50).fill(0.5),
      };
      const output = mlp.forward(longInput);
      expect(output.actionPreferences.length).toBe(16);
    });
  });

  // ─── Weight Export/Import ─────────────────────────────────

  describe('Weight Export/Import', () => {
    it('should export weights as MLPState', () => {
      const mlp = createIdentityCoreMLP(personality);
      const state = mlp.exportWeights();
      expect(state.version).toBe('1.0.0');
      expect(state.layers.length).toBe(3); // 49→128, 128→64, 64→30
      expect(state.inputDim).toBe(49);
      expect(state.outputDim).toBe(30);
    });

    it('should round-trip export/import', () => {
      const mlp1 = createIdentityCoreMLP(personality);
      const input: MLPInput = {
        personality: [0.7, 0.95, 0.8, 0.6, 0.5],
        emotion: [0.3, 0.4, 0.5, 0.4, 0.1, 0.05],
        frame: [1, 0, 0, 0, 0, 0],
        context: new Array(32).fill(0.1),
      };
      const out1 = mlp1.forward(input);

      // Export and import
      const state = mlp1.exportWeights();
      const mlp2 = createIdentityCoreMLP(personality);
      mlp2.importWeights(state);
      const out2 = mlp2.forward(input);

      expect(out1.actionPreferences).toEqual(out2.actionPreferences);
    });

    it('should reject mismatched layer count', () => {
      const mlp = createIdentityCoreMLP(personality);
      const state = mlp.exportWeights();
      state.layers = state.layers.slice(0, 1); // Remove layers
      expect(() => mlp.importWeights(state)).toThrow('Layer count mismatch');
    });

    it('should serialize to valid JSON', () => {
      const mlp = createIdentityCoreMLP(personality);
      const state = mlp.exportWeights();
      const json = JSON.stringify(state);
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  // ─── Online Learning ──────────────────────────────────────

  describe('Online Learning', () => {
    it('should adapt weights from feedback', () => {
      const mlp = createIdentityCoreMLP(personality);
      const input: MLPInput = {
        personality: [0.7, 0.95, 0.8, 0.6, 0.5],
        emotion: [0.3, 0.4, 0.5, 0.4, 0.1, 0.05],
        frame: [1, 0, 0, 0, 0, 0],
        context: new Array(32).fill(0.1),
      };

      const beforeWeights = mlp.exportWeights();
      const target: MLPOutput = {
        actionPreferences: new Array(16).fill(1),
        emotionalUpdate: new Array(6).fill(0.5),
        styleModulation: new Array(8).fill(0.3),
      };

      mlp.adaptFromFeedback(input, target, 1.0);
      const afterWeights = mlp.exportWeights();

      // Last layer biases should have changed
      const lastBefore = beforeWeights.layers[2].biases;
      const lastAfter = afterWeights.layers[2].biases;
      const changed = lastBefore.some((v, i) => v !== lastAfter[i]);
      expect(changed).toBe(true);
    });
  });

  // ─── Parameter Counting ───────────────────────────────────

  describe('Parameter Counting', () => {
    it('should count parameters correctly for default architecture', () => {
      const mlp = createIdentityCoreMLP(personality);
      const count = mlp.getParameterCount();
      // 49*128 + 128 + 128*64 + 64 + 64*30 + 30 = 6272 + 128 + 8192 + 64 + 1920 + 30 = 16606
      expect(count).toBe(16606);
    });

    it('should count parameters correctly for custom architecture', () => {
      const mlp = createIdentityCoreMLP(personality, {
        inputDim: 10,
        hiddenDims: [20],
        outputDim: 5,
      });
      const count = mlp.getParameterCount();
      // 10*20 + 20 + 20*5 + 5 = 200 + 20 + 100 + 5 = 325
      expect(count).toBe(325);
    });
  });

  // ─── Reproducibility ──────────────────────────────────────

  describe('Reproducibility', () => {
    it('two MLPs from same personality should produce identical outputs', () => {
      const mlp1 = createIdentityCoreMLP(personality);
      const mlp2 = createIdentityCoreMLP(personality);
      const input: MLPInput = {
        personality: [0.7, 0.95, 0.8, 0.6, 0.5],
        emotion: [0.3, 0.4, 0.5, 0.4, 0.1, 0.05],
        frame: [1, 0, 0, 0, 0, 0],
        context: new Array(32).fill(0.1),
      };
      const out1 = mlp1.forward(input);
      const out2 = mlp2.forward(input);
      expect(out1.actionPreferences).toEqual(out2.actionPreferences);
      expect(out1.emotionalUpdate).toEqual(out2.emotionalUpdate);
      expect(out1.styleModulation).toEqual(out2.styleModulation);
    });
  });
});
