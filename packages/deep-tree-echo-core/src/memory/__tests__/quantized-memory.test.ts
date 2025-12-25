/**
 * Quantized Memory Manager Tests
 *
 * Comprehensive test suite for the memory optimization module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  QuantizedMemoryManager,
  QuantizationPrecision,
  AllocationStrategy,
  QuantizationConfig,
  createQuantizedMemoryManager,
} from '../quantized-memory';

describe('QuantizedMemoryManager', () => {
  let manager: QuantizedMemoryManager;

  beforeEach(() => {
    manager = new QuantizedMemoryManager();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(manager).toBeDefined();
      expect(manager.isInitialized()).toBe(false);
    });

    it('should create instance with custom config', () => {
      const customConfig: Partial<QuantizationConfig> = {
        precision: QuantizationPrecision.INT4,
        maxMemoryMB: 2048,
        enableKVCache: false,
      };
      const customManager = new QuantizedMemoryManager(customConfig);
      expect(customManager).toBeDefined();
    });
  });

  describe('createQuantizedMemoryManager factory', () => {
    it('should create manager instance', () => {
      const instance = createQuantizedMemoryManager();
      expect(instance).toBeInstanceOf(QuantizedMemoryManager);
    });

    it('should pass config to manager', () => {
      const config = { maxMemoryMB: 1024 };
      const instance = createQuantizedMemoryManager(config);
      expect(instance).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const result = await manager.initialize();
      expect(result).toBe(true);
      expect(manager.isInitialized()).toBe(true);
    });

    it('should emit initialized event', async () => {
      const handler = vi.fn();
      manager.on('initialized', handler);

      await manager.initialize();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.any(Object),
        })
      );
    });

    it('should emit kv_cache_initialized event when KV cache enabled', async () => {
      const handler = vi.fn();
      manager.on('kv_cache_initialized', handler);

      await manager.initialize();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('quantize', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should quantize tensor to INT8', () => {
      const data = new Float32Array([1.0, 2.0, 3.0, 4.0]);
      const shape = [2, 2];

      const tensor = manager.quantize('test_tensor', data, shape, QuantizationPrecision.INT8);

      expect(tensor).toBeDefined();
      expect(tensor.precision).toBe(QuantizationPrecision.INT8);
      expect(tensor.shape).toEqual(shape);
      expect(tensor.memorySizeBytes).toBe(4); // 4 INT8 values
    });

    it('should quantize tensor to INT4', () => {
      const data = new Float32Array([1.0, 2.0, 3.0, 4.0]);
      const shape = [2, 2];

      const tensor = manager.quantize('test_tensor', data, shape, QuantizationPrecision.INT4);

      expect(tensor).toBeDefined();
      expect(tensor.precision).toBe(QuantizationPrecision.INT4);
      expect(tensor.memorySizeBytes).toBe(2); // 4 INT4 values packed into 2 bytes
    });

    it('should quantize tensor to FP16', () => {
      const data = new Float32Array([1.0, 2.0, 3.0, 4.0]);
      const shape = [2, 2];

      const tensor = manager.quantize('test_tensor', data, shape, QuantizationPrecision.FP16);

      expect(tensor).toBeDefined();
      expect(tensor.precision).toBe(QuantizationPrecision.FP16);
      expect(tensor.memorySizeBytes).toBe(8); // 4 FP16 values
    });

    it('should emit tensor_quantized event', () => {
      const handler = vi.fn();
      manager.on('tensor_quantized', handler);

      const data = new Float32Array([1.0, 2.0, 3.0, 4.0]);
      manager.quantize('test_tensor', data, [2, 2]);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test_tensor',
          originalSizeMB: expect.any(Number),
          quantizedSizeMB: expect.any(Number),
        })
      );
    });

    it('should update memory stats', () => {
      const data = new Float32Array(1024 * 1024); // 4MB
      manager.quantize('large_tensor', data, [1024, 1024], QuantizationPrecision.INT8);

      const stats = manager.getStats();
      expect(stats.modelWeightsMB).toBeGreaterThan(0);
      expect(stats.totalAllocatedMB).toBeGreaterThan(0);
      expect(stats.quantizationSavings).toBeGreaterThan(0);
    });

    it('should calculate compression ratio', () => {
      const data = new Float32Array(1024);
      manager.quantize('tensor', data, [1024], QuantizationPrecision.INT8);

      const stats = manager.getStats();
      expect(stats.compressionRatio).toBeGreaterThan(1); // INT8 is 4x smaller than FP32
    });
  });

  describe('dequantize', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should dequantize INT8 tensor', () => {
      const original = new Float32Array([1.0, 2.0, 3.0, 4.0]);
      manager.quantize('test', original, [4], QuantizationPrecision.INT8);

      const dequantized = manager.dequantize('test');

      expect(dequantized).not.toBeNull();
      expect(dequantized?.length).toBe(4);
      // Values should be approximately equal (quantization error)
      for (let i = 0; i < original.length; i++) {
        expect(dequantized![i]).toBeCloseTo(original[i], 1);
      }
    });

    it('should dequantize INT4 tensor', () => {
      const original = new Float32Array([1.0, 2.0, 3.0, 4.0]);
      manager.quantize('test', original, [4], QuantizationPrecision.INT4);

      const dequantized = manager.dequantize('test');

      expect(dequantized).not.toBeNull();
      expect(dequantized?.length).toBe(4);
    });

    it('should dequantize FP16 tensor', () => {
      const original = new Float32Array([1.0, 2.0, 3.0, 4.0]);
      manager.quantize('test', original, [4], QuantizationPrecision.FP16);

      const dequantized = manager.dequantize('test');

      expect(dequantized).not.toBeNull();
      expect(dequantized?.length).toBe(4);
    });

    it('should return null for non-existent tensor', () => {
      const result = manager.dequantize('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('KV cache', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should add entry to KV cache', () => {
      const key = new Float32Array([1, 2, 3, 4]);
      const value = new Float32Array([5, 6, 7, 8]);

      manager.addToKVCache(0, key, value);

      const entry = manager.getFromKVCache(0);
      expect(entry).not.toBeNull();
      expect(entry?.position).toBe(0);
    });

    it('should emit kv_cache_updated event', () => {
      const handler = vi.fn();
      manager.on('kv_cache_updated', handler);

      const key = new Float32Array([1, 2, 3, 4]);
      const value = new Float32Array([5, 6, 7, 8]);

      manager.addToKVCache(0, key, value);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          position: 0,
          sizeMB: expect.any(Number),
        })
      );
    });

    it('should get KV cache range', () => {
      const key = new Float32Array([1, 2, 3, 4]);
      const value = new Float32Array([5, 6, 7, 8]);

      manager.addToKVCache(0, key, value);
      manager.addToKVCache(1, key, value);
      manager.addToKVCache(2, key, value);

      const entries = manager.getKVCacheRange(0, 2);
      expect(entries.length).toBe(3);
    });

    it('should return null for non-existent position', () => {
      const entry = manager.getFromKVCache(999);
      expect(entry).toBeNull();
    });

    it('should clear KV cache', () => {
      const key = new Float32Array([1, 2, 3, 4]);
      const value = new Float32Array([5, 6, 7, 8]);

      manager.addToKVCache(0, key, value);
      manager.clearKVCache();

      const entry = manager.getFromKVCache(0);
      expect(entry).toBeNull();

      const stats = manager.getStats();
      expect(stats.kvCacheUsageMB).toBe(0);
    });

    it('should emit kv_cache_cleared event', () => {
      const handler = vi.fn();
      manager.on('kv_cache_cleared', handler);

      manager.clearKVCache();

      expect(handler).toHaveBeenCalled();
    });

    it('should evict oldest entry when at capacity', async () => {
      const smallManager = new QuantizedMemoryManager({
        kvCacheMaxTokens: 3,
      });
      await smallManager.initialize();

      const key = new Float32Array([1, 2, 3, 4]);
      const value = new Float32Array([5, 6, 7, 8]);

      smallManager.addToKVCache(0, key, value);
      await new Promise((r) => setTimeout(r, 10));
      smallManager.addToKVCache(1, key, value);
      await new Promise((r) => setTimeout(r, 10));
      smallManager.addToKVCache(2, key, value);
      await new Promise((r) => setTimeout(r, 10));
      smallManager.addToKVCache(3, key, value); // Should evict position 0

      const entry0 = smallManager.getFromKVCache(0);
      expect(entry0).toBeNull();

      await smallManager.shutdown();
    });
  });

  describe('tensor management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should get tensor by name', () => {
      const data = new Float32Array([1, 2, 3, 4]);
      manager.quantize('test', data, [4]);

      const tensor = manager.getTensor('test');
      expect(tensor).not.toBeNull();
    });

    it('should return null for non-existent tensor', () => {
      const tensor = manager.getTensor('nonexistent');
      expect(tensor).toBeNull();
    });

    it('should remove tensor', () => {
      const data = new Float32Array([1, 2, 3, 4]);
      manager.quantize('test', data, [4]);

      const result = manager.removeTensor('test');
      expect(result).toBe(true);

      const tensor = manager.getTensor('test');
      expect(tensor).toBeNull();
    });

    it('should emit tensor_removed event', () => {
      const handler = vi.fn();
      manager.on('tensor_removed', handler);

      const data = new Float32Array([1, 2, 3, 4]);
      manager.quantize('test', data, [4]);
      manager.removeTensor('test');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test',
          sizeMB: expect.any(Number),
        })
      );
    });

    it('should return false when removing non-existent tensor', () => {
      const result = manager.removeTensor('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = manager.getStats();

      expect(stats.totalAllocatedMB).toBe(0);
      expect(stats.peakUsageMB).toBe(0);
      expect(stats.kvCacheUsageMB).toBe(0);
      expect(stats.modelWeightsMB).toBe(0);
      expect(stats.compressionRatio).toBe(1.0);
    });

    it('should track peak usage', async () => {
      await manager.initialize();

      const data = new Float32Array(1024);
      manager.quantize('tensor1', data, [1024]);
      manager.quantize('tensor2', data, [1024]);

      const peakBefore = manager.getStats().peakUsageMB;

      manager.removeTensor('tensor1');

      const stats = manager.getStats();
      expect(stats.peakUsageMB).toBe(peakBefore);
    });
  });

  describe('getAvailableMemoryMB', () => {
    it('should return available memory', async () => {
      const customManager = new QuantizedMemoryManager({ maxMemoryMB: 1024 });
      await customManager.initialize();

      const available = customManager.getAvailableMemoryMB();
      expect(available).toBeLessThanOrEqual(1024);

      await customManager.shutdown();
    });

    it('should decrease as memory is allocated', async () => {
      const customManager = new QuantizedMemoryManager({ maxMemoryMB: 1024 });
      await customManager.initialize();

      const initialAvailable = customManager.getAvailableMemoryMB();

      const data = new Float32Array(1024 * 256); // 1MB
      customManager.quantize('tensor', data, [1024 * 256]);

      const newAvailable = customManager.getAvailableMemoryMB();
      expect(newAvailable).toBeLessThan(initialAvailable);

      await customManager.shutdown();
    });
  });

  describe('optimize', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should optimize memory', async () => {
      await expect(manager.optimize()).resolves.not.toThrow();
    });

    it('should emit memory_optimized event', async () => {
      const handler = vi.fn();
      manager.on('memory_optimized', handler);

      await manager.optimize();

      expect(handler).toHaveBeenCalled();
    });

    it('should compact KV cache', async () => {
      const handler = vi.fn();
      manager.on('kv_cache_compacted', handler);

      const key = new Float32Array([1, 2, 3, 4]);
      const value = new Float32Array([5, 6, 7, 8]);

      manager.addToKVCache(0, key, value);
      manager.addToKVCache(5, key, value);
      manager.addToKVCache(10, key, value);

      await manager.optimize();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should shutdown and clear state', async () => {
      await manager.initialize();
      await manager.shutdown();

      expect(manager.isInitialized()).toBe(false);
    });

    it('should emit shutdown event', async () => {
      const handler = vi.fn();
      manager.on('shutdown', handler);

      await manager.initialize();
      await manager.shutdown();

      expect(handler).toHaveBeenCalled();
    });

    it('should clear all tensors and cache', async () => {
      await manager.initialize();

      const data = new Float32Array([1, 2, 3, 4]);
      manager.quantize('test', data, [4]);

      const key = new Float32Array([1, 2, 3, 4]);
      const value = new Float32Array([5, 6, 7, 8]);
      manager.addToKVCache(0, key, value);

      await manager.shutdown();

      const stats = manager.getStats();
      expect(stats.totalAllocatedMB).toBe(0);
      expect(stats.kvCacheUsageMB).toBe(0);
      expect(stats.modelWeightsMB).toBe(0);
    });
  });
});

describe('QuantizationPrecision enum', () => {
  it('should have all expected precisions', () => {
    expect(QuantizationPrecision.FP32).toBe('fp32');
    expect(QuantizationPrecision.FP16).toBe('fp16');
    expect(QuantizationPrecision.BF16).toBe('bf16');
    expect(QuantizationPrecision.INT8).toBe('int8');
    expect(QuantizationPrecision.INT4).toBe('int4');
    expect(QuantizationPrecision.GGML_Q4_0).toBe('ggml_q4_0');
    expect(QuantizationPrecision.GGML_Q4_K_M).toBe('ggml_q4_k_m');
    expect(QuantizationPrecision.GGML_Q5_K_M).toBe('ggml_q5_k_m');
    expect(QuantizationPrecision.GGML_Q8_0).toBe('ggml_q8_0');
  });
});

describe('AllocationStrategy enum', () => {
  it('should have all expected strategies', () => {
    expect(AllocationStrategy.EAGER).toBe('eager');
    expect(AllocationStrategy.LAZY).toBe('lazy');
    expect(AllocationStrategy.MEMORY_MAPPED).toBe('memory_mapped');
    expect(AllocationStrategy.STREAMING).toBe('streaming');
  });
});
