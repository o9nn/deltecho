/**
 * QNN Integration Tests
 *
 * Comprehensive test suite for the Qualcomm QNN integration module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  QNNIntegration,
  QNNBackend,
  HTPVersion,
  QNNModelConfig,
  QNNCognitiveAdapter,
  createQNNIntegration,
} from '../qnn-integration';

describe('QNNIntegration', () => {
  let qnn: QNNIntegration;

  beforeEach(() => {
    qnn = new QNNIntegration();
  });

  afterEach(async () => {
    await qnn.shutdown();
  });

  describe('constructor', () => {
    it('should create instance with default state', () => {
      expect(qnn).toBeDefined();
      expect(qnn.isInitialized()).toBe(false);
      expect(qnn.getBackend()).toBe(QNNBackend.CPU);
    });
  });

  describe('createQNNIntegration factory', () => {
    it('should create QNNIntegration instance', () => {
      const instance = createQNNIntegration();
      expect(instance).toBeInstanceOf(QNNIntegration);
    });
  });

  describe('initialize', () => {
    it('should initialize with default backend', async () => {
      const result = await qnn.initialize();
      expect(result).toBe(true);
      expect(qnn.isInitialized()).toBe(true);
    });

    it('should initialize with specified backend', async () => {
      const result = await qnn.initialize({ backend: QNNBackend.GPU });
      expect(result).toBe(true);
      expect(qnn.getBackend()).toBe(QNNBackend.GPU);
    });

    it('should emit initialized event', async () => {
      const handler = vi.fn();
      qnn.on('initialized', handler);

      await qnn.initialize();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.any(String),
        })
      );
    });

    it('should set HTP version when using HTP backend', async () => {
      await qnn.initialize({
        backend: QNNBackend.HTP,
        htpVersion: HTPVersion.V75,
      });

      expect(qnn.getHTPVersion()).toBe(HTPVersion.V75);
    });
  });

  describe('loadModel', () => {
    beforeEach(async () => {
      await qnn.initialize();
    });

    it('should load model successfully', async () => {
      const config: QNNModelConfig = {
        modelPath: '/path/to/model.bin',
        backend: QNNBackend.CPU,
      };

      const result = await qnn.loadModel(config);
      expect(result).toBe(true);
    });

    it('should emit model_loaded event', async () => {
      const handler = vi.fn();
      qnn.on('model_loaded', handler);

      const config: QNNModelConfig = {
        modelPath: '/path/to/model.bin',
        backend: QNNBackend.CPU,
      };

      await qnn.loadModel(config);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          modelKey: expect.any(String),
          config: expect.objectContaining({
            modelPath: '/path/to/model.bin',
          }),
        })
      );
    });

    it('should cache loaded models', async () => {
      const config: QNNModelConfig = {
        modelPath: '/path/to/model.bin',
        backend: QNNBackend.CPU,
      };

      await qnn.loadModel(config);
      const result = await qnn.loadModel(config); // Load again

      expect(result).toBe(true); // Should succeed from cache
    });

    it('should throw if not initialized', async () => {
      const uninitializedQnn = new QNNIntegration();
      const config: QNNModelConfig = {
        modelPath: '/path/to/model.bin',
        backend: QNNBackend.CPU,
      };

      await expect(uninitializedQnn.loadModel(config)).rejects.toThrow(
        'QNN runtime not initialized'
      );
    });
  });

  describe('runInference', () => {
    beforeEach(async () => {
      await qnn.initialize();
    });

    it('should run inference successfully', async () => {
      const inputs = new Map<string, Float32Array>();
      inputs.set('input', new Float32Array([1, 2, 3, 4]));

      const result = await qnn.runInference('/path/to/model.bin', inputs);

      expect(result.success).toBe(true);
      expect(result.outputs.size).toBeGreaterThan(0);
      expect(result.inferenceTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.backend).toBe(qnn.getBackend());
    });

    it('should emit inference_complete event', async () => {
      const handler = vi.fn();
      qnn.on('inference_complete', handler);

      const inputs = new Map<string, Float32Array>();
      inputs.set('input', new Float32Array([1, 2, 3, 4]));

      await qnn.runInference('/path/to/model.bin', inputs);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          backend: expect.any(String),
        })
      );
    });

    it('should return error if not initialized', async () => {
      const uninitializedQnn = new QNNIntegration();
      const inputs = new Map<string, Float32Array>();
      inputs.set('input', new Float32Array([1, 2, 3, 4]));

      const result = await uninitializedQnn.runInference('/path/to/model.bin', inputs);

      expect(result.success).toBe(false);
      expect(result.error).toBe('QNN runtime not initialized');
    });

    it('should update metrics after inference', async () => {
      const inputs = new Map<string, Float32Array>();
      inputs.set('input', new Float32Array([1, 2, 3, 4]));

      await qnn.runInference('/path/to/model.bin', inputs);
      await qnn.runInference('/path/to/model.bin', inputs);

      const metrics = qnn.getMetrics();
      expect(metrics.totalInferences).toBe(2);
      expect(metrics.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runParallelInference', () => {
    beforeEach(async () => {
      await qnn.initialize();
    });

    it('should run parallel inference for multiple streams', async () => {
      const inputStreams = [
        new Map([['input', new Float32Array([1, 2, 3, 4])]]),
        new Map([['input', new Float32Array([5, 6, 7, 8])]]),
        new Map([['input', new Float32Array([9, 10, 11, 12])]]),
      ];

      const results = await qnn.runParallelInference('/path/to/model.bin', inputStreams);

      expect(results.length).toBe(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should emit parallel_inference_complete event', async () => {
      const handler = vi.fn();
      qnn.on('parallel_inference_complete', handler);

      const inputStreams = [
        new Map([['input', new Float32Array([1, 2, 3, 4])]]),
        new Map([['input', new Float32Array([5, 6, 7, 8])]]),
      ];

      await qnn.runParallelInference('/path/to/model.bin', inputStreams);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          streamCount: 2,
          results: expect.any(Array),
        })
      );
    });

    it('should return errors for all streams if not initialized', async () => {
      const uninitializedQnn = new QNNIntegration();
      const inputStreams = [
        new Map([['input', new Float32Array([1, 2, 3, 4])]]),
        new Map([['input', new Float32Array([5, 6, 7, 8])]]),
      ];

      const results = await uninitializedQnn.runParallelInference(
        '/path/to/model.bin',
        inputStreams
      );

      expect(results.every((r) => !r.success)).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = qnn.getMetrics();

      expect(metrics.totalInferences).toBe(0);
      expect(metrics.averageLatencyMs).toBe(0);
      expect(metrics.backend).toBe(QNNBackend.CPU);
    });

    it('should return copy of metrics', () => {
      const metrics1 = qnn.getMetrics();
      const metrics2 = qnn.getMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('unloadModel', () => {
    beforeEach(async () => {
      await qnn.initialize();
    });

    it('should unload model from cache', async () => {
      const config: QNNModelConfig = {
        modelPath: '/path/to/model.bin',
        backend: QNNBackend.CPU,
      };

      await qnn.loadModel(config);
      const result = qnn.unloadModel('/path/to/model.bin');

      expect(result).toBe(true);
    });

    it('should emit model_unloaded event', async () => {
      const handler = vi.fn();
      qnn.on('model_unloaded', handler);

      const config: QNNModelConfig = {
        modelPath: '/path/to/model.bin',
        backend: QNNBackend.CPU,
      };

      await qnn.loadModel(config);
      qnn.unloadModel('/path/to/model.bin');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          modelPath: '/path/to/model.bin',
          keysRemoved: expect.any(Number),
        })
      );
    });

    it('should return false if model not found', () => {
      const result = qnn.unloadModel('/nonexistent/model.bin');
      expect(result).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('should shutdown and clear state', async () => {
      await qnn.initialize();
      await qnn.shutdown();

      expect(qnn.isInitialized()).toBe(false);
    });

    it('should emit shutdown event', async () => {
      const handler = vi.fn();
      qnn.on('shutdown', handler);

      await qnn.initialize();
      await qnn.shutdown();

      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('QNNCognitiveAdapter', () => {
  let qnn: QNNIntegration;
  let adapter: QNNCognitiveAdapter;

  beforeEach(async () => {
    qnn = new QNNIntegration();
    await qnn.initialize();
    adapter = new QNNCognitiveAdapter(qnn);
  });

  afterEach(async () => {
    await qnn.shutdown();
  });

  describe('registerModel', () => {
    it('should register cognitive model', () => {
      const config: QNNModelConfig = {
        modelPath: '/path/to/cognitive.bin',
        backend: QNNBackend.CPU,
      };

      expect(() => adapter.registerModel('cognitive', config)).not.toThrow();
    });
  });

  describe('processCognitiveStream', () => {
    it('should process registered stream', async () => {
      const config: QNNModelConfig = {
        modelPath: '/path/to/cognitive.bin',
        backend: QNNBackend.CPU,
      };

      adapter.registerModel('cognitive', config);

      const input = new Float32Array([1, 2, 3, 4]);
      const result = await adapter.processCognitiveStream('cognitive', input);

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Float32Array);
    });

    it('should return null for unregistered stream', async () => {
      const input = new Float32Array([1, 2, 3, 4]);
      const result = await adapter.processCognitiveStream('unknown', input);

      expect(result).toBeNull();
    });
  });

  describe('processTriadicStreams', () => {
    it('should process all three triadic streams', async () => {
      const cognitiveConfig: QNNModelConfig = {
        modelPath: '/path/to/cognitive.bin',
        backend: QNNBackend.CPU,
      };
      const affectiveConfig: QNNModelConfig = {
        modelPath: '/path/to/affective.bin',
        backend: QNNBackend.CPU,
      };
      const relevanceConfig: QNNModelConfig = {
        modelPath: '/path/to/relevance.bin',
        backend: QNNBackend.CPU,
      };

      adapter.registerModel('cognitive', cognitiveConfig);
      adapter.registerModel('affective', affectiveConfig);
      adapter.registerModel('relevance', relevanceConfig);

      const cognitiveInput = new Float32Array([1, 2, 3, 4]);
      const affectiveInput = new Float32Array([5, 6, 7, 8]);
      const relevanceInput = new Float32Array([9, 10, 11, 12]);

      const result = await adapter.processTriadicStreams(
        cognitiveInput,
        affectiveInput,
        relevanceInput
      );

      expect(result.cognitive).not.toBeNull();
      expect(result.affective).not.toBeNull();
      expect(result.relevance).not.toBeNull();
    });

    it('should return nulls if models not registered', async () => {
      const cognitiveInput = new Float32Array([1, 2, 3, 4]);
      const affectiveInput = new Float32Array([5, 6, 7, 8]);
      const relevanceInput = new Float32Array([9, 10, 11, 12]);

      const result = await adapter.processTriadicStreams(
        cognitiveInput,
        affectiveInput,
        relevanceInput
      );

      expect(result.cognitive).toBeNull();
      expect(result.affective).toBeNull();
      expect(result.relevance).toBeNull();
    });
  });
});

describe('QNNBackend enum', () => {
  it('should have all expected backends', () => {
    expect(QNNBackend.CPU).toBe('cpu');
    expect(QNNBackend.GPU).toBe('gpu');
    expect(QNNBackend.HTP).toBe('htp');
    expect(QNNBackend.DSP).toBe('dsp');
  });
});

describe('HTPVersion enum', () => {
  it('should have all expected HTP versions', () => {
    expect(HTPVersion.V68).toBe('v68');
    expect(HTPVersion.V69).toBe('v69');
    expect(HTPVersion.V73).toBe('v73');
    expect(HTPVersion.V75).toBe('v75');
    expect(HTPVersion.V79).toBe('v79');
  });
});
