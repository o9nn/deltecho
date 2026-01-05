/**
 * LLaMA Electron Integration Tests
 *
 * Comprehensive test suite for the Electron GGML/LLaMA integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LlamaElectronMain,
  LlamaElectronRenderer,
  GGMLBackend,
  GGMLQuantization,
  IPCMessageType,
  createLlamaElectronMain,
  createLlamaElectronRenderer,
} from '../llama-electron';

describe('LlamaElectronMain', () => {
  let main: LlamaElectronMain;

  beforeEach(() => {
    main = new LlamaElectronMain();
  });

  afterEach(async () => {
    if (main.isModelLoaded()) {
      await main.unloadModel();
    }
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(main).toBeDefined();
      expect(main.isModelLoaded()).toBe(false);
    });
  });

  describe('createLlamaElectronMain factory', () => {
    it('should create main instance', () => {
      const instance = createLlamaElectronMain();
      expect(instance).toBeInstanceOf(LlamaElectronMain);
    });
  });

  describe('loadModel', () => {
    it('should load model successfully', async () => {
      const result = await main.loadModel({
        modelPath: '/path/to/model-q4_k_m.gguf',
      });

      expect(result).toBe(true);
      expect(main.isModelLoaded()).toBe(true);
    });

    it('should emit model_loading event', async () => {
      const handler = vi.fn();
      main.on('model_loading', handler);

      await main.loadModel({ modelPath: '/path/to/model.gguf' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/path/to/model.gguf',
        })
      );
    });

    it('should emit model_loaded event', async () => {
      const handler = vi.fn();
      main.on('model_loaded', handler);

      await main.loadModel({ modelPath: '/path/to/model.gguf' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.any(Object),
        })
      );
    });

    it('should detect quantization from path', async () => {
      await main.loadModel({ modelPath: '/path/to/model-q5_k_m.gguf' });

      const metadata = main.getModelMetadata();
      expect(metadata?.quantization).toBe(GGMLQuantization.Q5_K_M);
    });

    it('should use custom config values', async () => {
      await main.loadModel({
        modelPath: '/path/to/model.gguf',
        contextSize: 8192,
        numThreads: 8,
      });

      const metadata = main.getModelMetadata();
      expect(metadata?.contextLength).toBe(8192);
    });
  });

  describe('unloadModel', () => {
    it('should unload model', async () => {
      await main.loadModel({ modelPath: '/path/to/model.gguf' });
      await main.unloadModel();

      expect(main.isModelLoaded()).toBe(false);
    });

    it('should emit model_unloaded event', async () => {
      const handler = vi.fn();
      main.on('model_unloaded', handler);

      await main.loadModel({ modelPath: '/path/to/model.gguf' });
      await main.unloadModel();

      expect(handler).toHaveBeenCalled();
    });

    it('should do nothing if not loaded', async () => {
      await expect(main.unloadModel()).resolves.not.toThrow();
    });
  });

  describe('generate', () => {
    beforeEach(async () => {
      await main.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should generate completion', async () => {
      const result = await main.generate('Hello, world!');

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.completionTokens).toBeGreaterThan(0);
      expect(result.tokensPerSecond).toBeGreaterThan(0);
    });

    it('should emit generation_started event', async () => {
      const handler = vi.fn();
      main.on('generation_started', handler);

      await main.generate('Hello');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Hello',
          config: expect.any(Object),
        })
      );
    });

    it('should emit generation_complete event', async () => {
      const handler = vi.fn();
      main.on('generation_complete', handler);

      await main.generate('Hello');

      expect(handler).toHaveBeenCalled();
    });

    it('should throw if model not loaded', async () => {
      await main.unloadModel();

      await expect(main.generate('Hello')).rejects.toThrow('Model not loaded');
    });

    it('should throw if generation in progress', async () => {
      const promise1 = main.generate('Hello');

      await expect(main.generate('World')).rejects.toThrow('Generation already in progress');

      await promise1;
    });

    it('should respect maxTokens parameter', async () => {
      const result = await main.generate('Hello', { maxTokens: 5 });

      expect(result.tokens.length).toBeLessThanOrEqual(5);
    });

    it('should update metrics', async () => {
      await main.generate('Hello');
      await main.generate('World');

      const metrics = main.getMetrics();
      expect(metrics.totalGenerations).toBe(2);
      expect(metrics.totalTokensGenerated).toBeGreaterThan(0);
    });
  });

  describe('generateStream', () => {
    beforeEach(async () => {
      await main.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should stream tokens', async () => {
      const tokens: string[] = [];

      const generator = main.generateStream('Hello');

      for await (const token of generator) {
        tokens.push(token);
      }

      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should return final result', async () => {
      const generator = main.generateStream('Hello');

      let result;
      for await (const _ of generator) {
        // Consume tokens
      }
      result = (await generator.next()).value;

      expect(result).toBeDefined();
    });

    it('should throw if model not loaded', async () => {
      await main.unloadModel();

      const generator = main.generateStream('Hello');

      await expect(generator.next()).rejects.toThrow('Model not loaded');
    });
  });

  describe('cancelGeneration', () => {
    beforeEach(async () => {
      await main.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should cancel generation', async () => {
      const handler = vi.fn();
      main.on('generation_cancelled', handler);

      const promise = main.generate('Hello', { maxTokens: 100 });

      // Cancel after a short delay
      setTimeout(() => main.cancelGeneration(), 100);

      const result = await promise;

      // Generation should complete (possibly early)
      expect(result).toBeDefined();
    });
  });

  describe('tokenize', () => {
    beforeEach(async () => {
      await main.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should tokenize text', async () => {
      const tokens = await main.tokenize('Hello, world!');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should throw if model not loaded', async () => {
      await main.unloadModel();

      await expect(main.tokenize('Hello')).rejects.toThrow('Model not loaded');
    });
  });

  describe('detokenize', () => {
    beforeEach(async () => {
      await main.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should detokenize tokens', async () => {
      const text = await main.detokenize([1000, 1001, 1002]);

      expect(typeof text).toBe('string');
    });

    it('should throw if model not loaded', async () => {
      await main.unloadModel();

      await expect(main.detokenize([1000])).rejects.toThrow('Model not loaded');
    });
  });

  describe('getModelMetadata', () => {
    it('should return null when not loaded', () => {
      const metadata = main.getModelMetadata();
      expect(metadata).toBeNull();
    });

    it('should return metadata when loaded', async () => {
      await main.loadModel({ modelPath: '/path/to/model.gguf' });

      const metadata = main.getModelMetadata();

      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBeDefined();
      expect(metadata?.architecture).toBe('llama');
      expect(metadata?.vocabSize).toBeDefined();
    });
  });

  describe('getSystemInfo', () => {
    it('should return system info', () => {
      const info = main.getSystemInfo();

      expect(info.platform).toBeDefined();
      expect(info.arch).toBeDefined();
      expect(info.cpuCores).toBeGreaterThan(0);
      expect(info.totalMemoryMB).toBeGreaterThan(0);
    });
  });

  describe('clearContext', () => {
    beforeEach(async () => {
      await main.loadModel({ modelPath: '/path/to/model.gguf' });
    });

    it('should clear context', () => {
      const handler = vi.fn();
      main.on('context_cleared', handler);

      main.clearContext();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = main.getMetrics();

      expect(metrics.totalGenerations).toBe(0);
      expect(metrics.totalTokensGenerated).toBe(0);
      expect(metrics.averageTokensPerSecond).toBe(0);
    });
  });
});

describe('LlamaElectronRenderer', () => {
  let renderer: LlamaElectronRenderer;
  let mockIpcRenderer: any;

  beforeEach(() => {
    mockIpcRenderer = {
      invoke: vi.fn(),
      send: vi.fn(),
      on: vi.fn(),
    };
    renderer = new LlamaElectronRenderer(mockIpcRenderer);
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(renderer).toBeDefined();
    });

    it('should set up IPC listeners', () => {
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('llama:token', expect.any(Function));
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('llama:error', expect.any(Function));
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'llama:generation_complete',
        expect.any(Function)
      );
    });
  });

  describe('createLlamaElectronRenderer factory', () => {
    it('should create renderer instance', () => {
      const instance = createLlamaElectronRenderer(mockIpcRenderer);
      expect(instance).toBeInstanceOf(LlamaElectronRenderer);
    });
  });

  describe('loadModel', () => {
    it('should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(true);

      await renderer.loadModel({ modelPath: '/path/to/model.gguf' });

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        IPCMessageType.LOAD_MODEL,
        expect.objectContaining({ modelPath: '/path/to/model.gguf' })
      );
    });
  });

  describe('unloadModel', () => {
    it('should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await renderer.unloadModel();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPCMessageType.UNLOAD_MODEL);
    });
  });

  describe('generate', () => {
    it('should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({
        text: 'Hello',
        tokens: [1000],
        promptTokens: 5,
        completionTokens: 1,
        generationTimeMs: 100,
        tokensPerSecond: 10,
        stopReason: 'eos',
      });

      const result = await renderer.generate('Hello');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        IPCMessageType.GENERATE,
        'Hello',
        expect.any(Object)
      );
      expect(result.text).toBe('Hello');
    });
  });

  describe('generateStream', () => {
    it('should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await renderer.generateStream('Hello');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        IPCMessageType.GENERATE_STREAM,
        'Hello',
        expect.any(Object)
      );
    });
  });

  describe('cancelGeneration', () => {
    it('should send IPC message', () => {
      renderer.cancelGeneration();

      expect(mockIpcRenderer.send).toHaveBeenCalledWith(IPCMessageType.CANCEL_GENERATION);
    });
  });

  describe('tokenize', () => {
    it('should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue([1000, 1001]);

      const tokens = await renderer.tokenize('Hello');

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPCMessageType.TOKENIZE, 'Hello');
      expect(tokens).toEqual([1000, 1001]);
    });
  });

  describe('detokenize', () => {
    it('should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue('Hello');

      const text = await renderer.detokenize([1000, 1001]);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPCMessageType.DETOKENIZE, [1000, 1001]);
      expect(text).toBe('Hello');
    });
  });

  describe('getModelInfo', () => {
    it('should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ name: 'test-model' });

      const info = await renderer.getModelInfo();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPCMessageType.GET_MODEL_INFO);
      expect(info?.name).toBe('test-model');
    });
  });

  describe('getSystemInfo', () => {
    it('should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ platform: 'linux' });

      const info = await renderer.getSystemInfo();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPCMessageType.GET_SYSTEM_INFO);
      expect(info.platform).toBe('linux');
    });
  });

  describe('clearContext', () => {
    it('should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await renderer.clearContext();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPCMessageType.CLEAR_CONTEXT);
    });
  });
});

describe('GGMLBackend enum', () => {
  it('should have all expected backends', () => {
    expect(GGMLBackend.CPU).toBe('cpu');
    expect(GGMLBackend.OPENCL).toBe('opencl');
    expect(GGMLBackend.VULKAN).toBe('vulkan');
    expect(GGMLBackend.CUDA).toBe('cuda');
    expect(GGMLBackend.METAL).toBe('metal');
  });
});

describe('GGMLQuantization enum', () => {
  it('should have all expected quantizations', () => {
    expect(GGMLQuantization.F32).toBe('f32');
    expect(GGMLQuantization.F16).toBe('f16');
    expect(GGMLQuantization.Q8_0).toBe('q8_0');
    expect(GGMLQuantization.Q5_K_M).toBe('q5_k_m');
    expect(GGMLQuantization.Q4_K_M).toBe('q4_k_m');
    expect(GGMLQuantization.Q4_0).toBe('q4_0');
    expect(GGMLQuantization.Q3_K_M).toBe('q3_k_m');
    expect(GGMLQuantization.Q2_K).toBe('q2_k');
  });
});

describe('IPCMessageType enum', () => {
  it('should have all expected message types', () => {
    expect(IPCMessageType.LOAD_MODEL).toBe('llama:load_model');
    expect(IPCMessageType.UNLOAD_MODEL).toBe('llama:unload_model');
    expect(IPCMessageType.GENERATE).toBe('llama:generate');
    expect(IPCMessageType.GENERATE_STREAM).toBe('llama:generate_stream');
    expect(IPCMessageType.TOKENIZE).toBe('llama:tokenize');
    expect(IPCMessageType.DETOKENIZE).toBe('llama:detokenize');
    expect(IPCMessageType.GET_MODEL_INFO).toBe('llama:get_model_info');
    expect(IPCMessageType.GET_SYSTEM_INFO).toBe('llama:get_system_info');
    expect(IPCMessageType.CLEAR_CONTEXT).toBe('llama:clear_context');
    expect(IPCMessageType.CANCEL_GENERATION).toBe('llama:cancel_generation');
  });
});
