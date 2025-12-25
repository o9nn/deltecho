/**
 * LLaMA React Native Module Tests
 *
 * Comprehensive test suite for the React Native LLaMA bridge.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LlamaReactNativeBridge,
  MockNativeLlamaModule,
  LlamaModelConfig,
  GenerationParams,
  createLlamaReactNativeBridge,
  createMockNativeModule,
} from '../llama-react-native';

describe('LlamaReactNativeBridge', () => {
  let bridge: LlamaReactNativeBridge;
  let mockModule: MockNativeLlamaModule;

  beforeEach(() => {
    bridge = new LlamaReactNativeBridge();
    mockModule = new MockNativeLlamaModule();
    bridge.setNativeModule(mockModule);
  });

  afterEach(async () => {
    if (bridge.isModelLoaded()) {
      await bridge.unloadModel();
    }
  });

  describe('constructor', () => {
    it('should create instance', () => {
      const instance = new LlamaReactNativeBridge();
      expect(instance).toBeDefined();
      expect(instance.isModelLoaded()).toBe(false);
    });
  });

  describe('createLlamaReactNativeBridge factory', () => {
    it('should create bridge instance', () => {
      const instance = createLlamaReactNativeBridge();
      expect(instance).toBeInstanceOf(LlamaReactNativeBridge);
    });
  });

  describe('createMockNativeModule factory', () => {
    it('should create mock module instance', () => {
      const instance = createMockNativeModule();
      expect(instance).toBeInstanceOf(MockNativeLlamaModule);
    });
  });

  describe('setNativeModule', () => {
    it('should set native module', () => {
      const newBridge = new LlamaReactNativeBridge();
      const handler = vi.fn();
      newBridge.on('native_module_set', handler);

      newBridge.setNativeModule(mockModule);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('loadModel', () => {
    it('should load model successfully', async () => {
      const result = await bridge.loadModel({
        modelPath: '/path/to/model.gguf',
      });

      expect(result).toBe(true);
      expect(bridge.isModelLoaded()).toBe(true);
    });

    it('should emit model_loading event', async () => {
      const handler = vi.fn();
      bridge.on('model_loading', handler);

      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/path/to/model.gguf',
        })
      );
    });

    it('should emit model_loaded event', async () => {
      const handler = vi.fn();
      bridge.on('model_loaded', handler);

      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          info: expect.any(Object),
        })
      );
    });

    it('should throw if native module not set', async () => {
      const newBridge = new LlamaReactNativeBridge();

      await expect(
        newBridge.loadModel({ modelPath: '/path/to/model.gguf' })
      ).rejects.toThrow('Native module not set');
    });

    it('should use default config values', async () => {
      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });

      const info = bridge.getModelInfo();
      expect(info).not.toBeNull();
    });
  });

  describe('unloadModel', () => {
    it('should unload model', async () => {
      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });
      await bridge.unloadModel();

      expect(bridge.isModelLoaded()).toBe(false);
    });

    it('should emit model_unloaded event', async () => {
      const handler = vi.fn();
      bridge.on('model_unloaded', handler);

      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });
      await bridge.unloadModel();

      expect(handler).toHaveBeenCalled();
    });

    it('should do nothing if model not loaded', async () => {
      await expect(bridge.unloadModel()).resolves.not.toThrow();
    });
  });

  describe('generate', () => {
    beforeEach(async () => {
      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should generate completion', async () => {
      const result = await bridge.generate('Hello, world!');

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.completionTokens).toBeGreaterThan(0);
    });

    it('should emit generation_started event', async () => {
      const handler = vi.fn();
      bridge.on('generation_started', handler);

      await bridge.generate('Hello');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Hello',
          params: expect.any(Object),
        })
      );
    });

    it('should emit generation_complete event', async () => {
      const handler = vi.fn();
      bridge.on('generation_complete', handler);

      await bridge.generate('Hello');

      expect(handler).toHaveBeenCalled();
    });

    it('should respect maxTokens parameter', async () => {
      const result = await bridge.generate('Hello', { maxTokens: 5 });

      expect(result.tokens.length).toBeLessThanOrEqual(5);
    });

    it('should throw if model not loaded', async () => {
      await bridge.unloadModel();

      await expect(bridge.generate('Hello')).rejects.toThrow('Model not loaded');
    });

    it('should update metrics', async () => {
      await bridge.generate('Hello');
      await bridge.generate('World');

      const metrics = bridge.getMetrics();
      expect(metrics.totalGenerations).toBe(2);
      expect(metrics.totalTokensGenerated).toBeGreaterThan(0);
    });
  });

  describe('generateStream', () => {
    beforeEach(async () => {
      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should generate with streaming', async () => {
      const tokens: any[] = [];
      const onToken = vi.fn((token) => tokens.push(token));

      bridge.on('token', onToken);

      const result = await bridge.generateStream('Hello', {}, onToken);

      expect(result).toBeDefined();
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should emit token events', async () => {
      const handler = vi.fn();
      bridge.on('token', handler);

      await bridge.generate('Hello', { stream: true });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('tokenize', () => {
    beforeEach(async () => {
      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should tokenize text', async () => {
      const tokens = await bridge.tokenize('Hello, world!');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should throw if model not loaded', async () => {
      await bridge.unloadModel();

      await expect(bridge.tokenize('Hello')).rejects.toThrow('Model not loaded');
    });
  });

  describe('detokenize', () => {
    beforeEach(async () => {
      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should detokenize tokens', async () => {
      const text = await bridge.detokenize([1000, 1001, 1002]);

      expect(typeof text).toBe('string');
    });

    it('should throw if model not loaded', async () => {
      await bridge.unloadModel();

      await expect(bridge.detokenize([1000])).rejects.toThrow('Model not loaded');
    });
  });

  describe('getModelInfo', () => {
    it('should return null when model not loaded', () => {
      const info = bridge.getModelInfo();
      expect(info).toBeNull();
    });

    it('should return model info when loaded', async () => {
      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });

      const info = bridge.getModelInfo();

      expect(info).not.toBeNull();
      expect(info?.name).toBeDefined();
      expect(info?.architecture).toBeDefined();
      expect(info?.contextLength).toBeDefined();
    });
  });

  describe('context management', () => {
    beforeEach(async () => {
      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should get context size', () => {
      const size = bridge.getContextSize();
      expect(size).toBeGreaterThan(0);
    });

    it('should get used context size', async () => {
      await bridge.generate('Hello');

      const used = bridge.getUsedContextSize();
      expect(used).toBeGreaterThan(0);
    });

    it('should clear context', async () => {
      await bridge.generate('Hello');
      bridge.clearContext();

      const used = bridge.getUsedContextSize();
      expect(used).toBe(0);
    });

    it('should emit context_cleared event', () => {
      const handler = vi.fn();
      bridge.on('context_cleared', handler);

      bridge.clearContext();

      expect(handler).toHaveBeenCalled();
    });

    it('should return 0 for context size when not loaded', async () => {
      await bridge.unloadModel();

      expect(bridge.getContextSize()).toBe(0);
      expect(bridge.getUsedContextSize()).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = bridge.getMetrics();

      expect(metrics.totalGenerations).toBe(0);
      expect(metrics.totalTokensGenerated).toBe(0);
      expect(metrics.averageTokensPerSecond).toBe(0);
    });

    it('should track generation metrics', async () => {
      await bridge.loadModel({ modelPath: '/path/to/model.gguf' });
      await bridge.generate('Hello');

      const metrics = bridge.getMetrics();

      expect(metrics.totalGenerations).toBe(1);
      expect(metrics.totalTokensGenerated).toBeGreaterThan(0);
      expect(metrics.totalGenerationTimeMs).toBeGreaterThan(0);
    });
  });
});

describe('MockNativeLlamaModule', () => {
  let mockModule: MockNativeLlamaModule;

  beforeEach(() => {
    mockModule = new MockNativeLlamaModule();
  });

  describe('loadModel', () => {
    it('should load model', async () => {
      const result = await mockModule.loadModel({
        modelPath: '/path/to/model.gguf',
        contextSize: 2048,
        batchSize: 512,
        numThreads: 4,
        gpuLayers: 0,
        useMmap: true,
        useMlock: false,
        vocabOnly: false,
        seed: -1,
      });

      expect(result).toBe(true);
      expect(mockModule.isModelLoaded()).toBe(true);
    });
  });

  describe('unloadModel', () => {
    it('should unload model', async () => {
      await mockModule.loadModel({
        modelPath: '/path/to/model.gguf',
        contextSize: 2048,
        batchSize: 512,
        numThreads: 4,
        gpuLayers: 0,
        useMmap: true,
        useMlock: false,
        vocabOnly: false,
        seed: -1,
      });
      await mockModule.unloadModel();

      expect(mockModule.isModelLoaded()).toBe(false);
    });
  });

  describe('getModelInfo', () => {
    it('should return null when not loaded', async () => {
      const info = await mockModule.getModelInfo();
      expect(info).toBeNull();
    });

    it('should return info when loaded', async () => {
      await mockModule.loadModel({
        modelPath: '/path/to/model.gguf',
        contextSize: 2048,
        batchSize: 512,
        numThreads: 4,
        gpuLayers: 0,
        useMmap: true,
        useMlock: false,
        vocabOnly: false,
        seed: -1,
      });

      const info = await mockModule.getModelInfo();

      expect(info).not.toBeNull();
      expect(info?.name).toBe('mock-llama-7b');
      expect(info?.architecture).toBe('llama');
    });
  });

  describe('generate', () => {
    beforeEach(async () => {
      await mockModule.loadModel({
        modelPath: '/path/to/model.gguf',
        contextSize: 2048,
        batchSize: 512,
        numThreads: 4,
        gpuLayers: 0,
        useMmap: true,
        useMlock: false,
        vocabOnly: false,
        seed: -1,
      });
    });

    it('should generate completion', async () => {
      const result = await mockModule.generate('Hello', {
        maxTokens: 10,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        repeatPenalty: 1.1,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
        stopSequences: [],
        stream: false,
      });

      expect(result.text).toBeDefined();
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.tokensPerSecond).toBeGreaterThan(0);
    });

    it('should update context usage', async () => {
      await mockModule.generate('Hello', {
        maxTokens: 10,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        repeatPenalty: 1.1,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
        stopSequences: [],
        stream: false,
      });

      expect(mockModule.getUsedContextSize()).toBeGreaterThan(0);
    });
  });

  describe('generateStream', () => {
    beforeEach(async () => {
      await mockModule.loadModel({
        modelPath: '/path/to/model.gguf',
        contextSize: 2048,
        batchSize: 512,
        numThreads: 4,
        gpuLayers: 0,
        useMmap: true,
        useMlock: false,
        vocabOnly: false,
        seed: -1,
      });
    });

    it('should stream tokens', async () => {
      const tokens: any[] = [];

      await mockModule.generateStream(
        'Hello',
        {
          maxTokens: 5,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          repeatPenalty: 1.1,
          presencePenalty: 0.0,
          frequencyPenalty: 0.0,
          stopSequences: [],
          stream: true,
        },
        (token) => tokens.push(token)
      );

      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('tokenize/detokenize', () => {
    beforeEach(async () => {
      await mockModule.loadModel({
        modelPath: '/path/to/model.gguf',
        contextSize: 2048,
        batchSize: 512,
        numThreads: 4,
        gpuLayers: 0,
        useMmap: true,
        useMlock: false,
        vocabOnly: false,
        seed: -1,
      });
    });

    it('should tokenize text', async () => {
      const tokens = await mockModule.tokenize('Hello');
      expect(tokens.length).toBe(5);
    });

    it('should detokenize tokens', async () => {
      const text = await mockModule.detokenize([1000, 1001, 1002]);
      expect(typeof text).toBe('string');
    });
  });

  describe('context management', () => {
    beforeEach(async () => {
      await mockModule.loadModel({
        modelPath: '/path/to/model.gguf',
        contextSize: 2048,
        batchSize: 512,
        numThreads: 4,
        gpuLayers: 0,
        useMmap: true,
        useMlock: false,
        vocabOnly: false,
        seed: -1,
      });
    });

    it('should get context size', () => {
      expect(mockModule.getContextSize()).toBe(2048);
    });

    it('should clear context', async () => {
      await mockModule.generate('Hello', {
        maxTokens: 10,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        repeatPenalty: 1.1,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
        stopSequences: [],
        stream: false,
      });

      mockModule.clearContext();

      expect(mockModule.getUsedContextSize()).toBe(0);
    });
  });
});
