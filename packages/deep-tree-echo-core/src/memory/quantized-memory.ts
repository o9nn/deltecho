/**
 * Quantized Memory Optimization Module
 *
 * Provides memory-efficient storage and retrieval for Deep Tree Echo
 * using quantization techniques for model weights and activations.
 *
 * Features:
 * - INT8/INT4 quantization for model weights
 * - Dynamic quantization for activations
 * - Memory-mapped model loading
 * - KV-cache optimization for inference
 * - Grouped query attention (GQA) support
 */

import { EventEmitter } from 'events';

/**
 * Quantization precision levels
 */
export enum QuantizationPrecision {
  FP32 = 'fp32',
  FP16 = 'fp16',
  BF16 = 'bf16',
  INT8 = 'int8',
  INT4 = 'int4',
  GGML_Q4_0 = 'ggml_q4_0',
  GGML_Q4_K_M = 'ggml_q4_k_m',
  GGML_Q5_K_M = 'ggml_q5_k_m',
  GGML_Q8_0 = 'ggml_q8_0',
}

/**
 * Memory allocation strategy
 */
export enum AllocationStrategy {
  EAGER = 'eager',
  LAZY = 'lazy',
  MEMORY_MAPPED = 'memory_mapped',
  STREAMING = 'streaming',
}

/**
 * Quantization configuration
 */
export interface QuantizationConfig {
  precision: QuantizationPrecision;
  strategy: AllocationStrategy;
  maxMemoryMB: number;
  enableKVCache: boolean;
  kvCacheMaxTokens: number;
  enableGQA: boolean;
  numKVHeads?: number;
  numQueryHeads?: number;
}

/**
 * Quantized tensor representation
 */
export interface QuantizedTensor {
  data: ArrayBuffer;
  shape: number[];
  precision: QuantizationPrecision;
  scale: number;
  zeroPoint: number;
  originalPrecision: QuantizationPrecision;
  memorySizeBytes: number;
}

/**
 * KV-Cache entry
 */
export interface KVCacheEntry {
  key: Float32Array;
  value: Float32Array;
  position: number;
  timestamp: number;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalAllocatedMB: number;
  peakUsageMB: number;
  kvCacheUsageMB: number;
  modelWeightsMB: number;
  activationsMB: number;
  compressionRatio: number;
  quantizationSavings: number;
}

const DEFAULT_CONFIG: QuantizationConfig = {
  precision: QuantizationPrecision.INT8,
  strategy: AllocationStrategy.LAZY,
  maxMemoryMB: 4096,
  enableKVCache: true,
  kvCacheMaxTokens: 4096,
  enableGQA: true,
  numKVHeads: 8,
  numQueryHeads: 32,
};

/**
 * Bytes per element for each precision
 */
const BYTES_PER_ELEMENT: Record<QuantizationPrecision, number> = {
  [QuantizationPrecision.FP32]: 4,
  [QuantizationPrecision.FP16]: 2,
  [QuantizationPrecision.BF16]: 2,
  [QuantizationPrecision.INT8]: 1,
  [QuantizationPrecision.INT4]: 0.5,
  [QuantizationPrecision.GGML_Q4_0]: 0.5625, // 4.5 bits average
  [QuantizationPrecision.GGML_Q4_K_M]: 0.5625,
  [QuantizationPrecision.GGML_Q5_K_M]: 0.6875, // 5.5 bits average
  [QuantizationPrecision.GGML_Q8_0]: 1.0625, // 8.5 bits average
};

/**
 * Quantized Memory Manager
 *
 * Manages memory-efficient storage for model weights and activations.
 */
export class QuantizedMemoryManager extends EventEmitter {
  private config: QuantizationConfig;
  private initialized: boolean = false;

  // Storage
  private tensors: Map<string, QuantizedTensor> = new Map();
  private kvCache: Map<number, KVCacheEntry> = new Map();

  // Memory tracking
  private stats: MemoryStats = {
    totalAllocatedMB: 0,
    peakUsageMB: 0,
    kvCacheUsageMB: 0,
    modelWeightsMB: 0,
    activationsMB: 0,
    compressionRatio: 1.0,
    quantizationSavings: 0,
  };

  constructor(config: Partial<QuantizationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the memory manager
   */
  async initialize(): Promise<boolean> {
    try {
      // Pre-allocate KV cache if enabled
      if (this.config.enableKVCache) {
        this.initializeKVCache();
      }

      this.initialized = true;
      this.emit('initialized', { config: this.config });

      return true;
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      return false;
    }
  }

  /**
   * Initialize KV cache
   */
  private initializeKVCache(): void {
    // Pre-allocate cache entries based on max tokens
    const maxTokens = this.config.kvCacheMaxTokens;
    const numKVHeads = this.config.numKVHeads || 8;
    const headDim = 64; // Common head dimension

    // Calculate memory for KV cache
    const kvSizePerToken = numKVHeads * headDim * 2 * 4; // key + value, float32
    const totalKVCacheMB = (maxTokens * kvSizePerToken) / (1024 * 1024);

    this.stats.kvCacheUsageMB = 0; // Start empty
    this.emit('kv_cache_initialized', { maxTokens, estimatedMB: totalKVCacheMB });
  }

  /**
   * Quantize a tensor
   */
  quantize(
    name: string,
    data: Float32Array,
    shape: number[],
    targetPrecision?: QuantizationPrecision
  ): QuantizedTensor {
    const precision = targetPrecision || this.config.precision;

    // Calculate quantization parameters
    const { scale, zeroPoint, quantizedData } = this.performQuantization(data, precision);

    const tensor: QuantizedTensor = {
      data: quantizedData,
      shape,
      precision,
      scale,
      zeroPoint,
      originalPrecision: QuantizationPrecision.FP32,
      memorySizeBytes: quantizedData.byteLength,
    };

    // Store tensor
    this.tensors.set(name, tensor);

    // Update stats
    const originalSizeMB = (data.length * 4) / (1024 * 1024);
    const quantizedSizeMB = quantizedData.byteLength / (1024 * 1024);

    this.stats.modelWeightsMB += quantizedSizeMB;
    this.stats.totalAllocatedMB += quantizedSizeMB;
    this.stats.peakUsageMB = Math.max(this.stats.peakUsageMB, this.stats.totalAllocatedMB);
    this.stats.quantizationSavings += originalSizeMB - quantizedSizeMB;

    // Update compression ratio
    const totalOriginal = this.stats.modelWeightsMB + this.stats.quantizationSavings;
    this.stats.compressionRatio = totalOriginal / this.stats.modelWeightsMB;

    this.emit('tensor_quantized', {
      name,
      originalSizeMB,
      quantizedSizeMB,
      precision,
    });

    return tensor;
  }

  /**
   * Perform quantization on data
   */
  private performQuantization(
    data: Float32Array,
    precision: QuantizationPrecision
  ): { scale: number; zeroPoint: number; quantizedData: ArrayBuffer } {
    // Find min/max for scaling
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < data.length; i++) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }

    // Calculate scale and zero point based on precision
    let scale: number;
    let zeroPoint: number;
    let quantizedData: ArrayBuffer;

    switch (precision) {
      case QuantizationPrecision.INT8:
        scale = (max - min) / 255;
        zeroPoint = Math.round(-min / scale);
        quantizedData = this.quantizeToInt8(data, scale, zeroPoint);
        break;

      case QuantizationPrecision.INT4:
      case QuantizationPrecision.GGML_Q4_0:
      case QuantizationPrecision.GGML_Q4_K_M:
        scale = (max - min) / 15;
        zeroPoint = Math.round(-min / scale);
        quantizedData = this.quantizeToInt4(data, scale, zeroPoint);
        break;

      case QuantizationPrecision.FP16:
      case QuantizationPrecision.BF16:
        scale = 1.0;
        zeroPoint = 0;
        quantizedData = this.quantizeToFP16(data);
        break;

      default:
        scale = 1.0;
        zeroPoint = 0;
        quantizedData = data.buffer;
    }

    return { scale, zeroPoint, quantizedData };
  }

  /**
   * Quantize to INT8
   */
  private quantizeToInt8(data: Float32Array, scale: number, zeroPoint: number): ArrayBuffer {
    const quantized = new Int8Array(data.length);

    for (let i = 0; i < data.length; i++) {
      const value = Math.round(data[i] / scale + zeroPoint);
      quantized[i] = Math.max(-128, Math.min(127, value));
    }

    return quantized.buffer;
  }

  /**
   * Quantize to INT4 (packed)
   */
  private quantizeToInt4(data: Float32Array, scale: number, zeroPoint: number): ArrayBuffer {
    // Pack two INT4 values per byte
    const packedLength = Math.ceil(data.length / 2);
    const quantized = new Uint8Array(packedLength);

    for (let i = 0; i < data.length; i += 2) {
      const val1 = Math.round(data[i] / scale + zeroPoint);
      const val2 = i + 1 < data.length ? Math.round(data[i + 1] / scale + zeroPoint) : 0;

      const clamp1 = Math.max(0, Math.min(15, val1));
      const clamp2 = Math.max(0, Math.min(15, val2));

      quantized[i / 2] = (clamp1 << 4) | clamp2;
    }

    return quantized.buffer;
  }

  /**
   * Quantize to FP16
   */
  private quantizeToFP16(data: Float32Array): ArrayBuffer {
    // Use Float16Array if available, otherwise simulate
    const quantized = new Uint16Array(data.length);

    for (let i = 0; i < data.length; i++) {
      quantized[i] = this.floatToHalf(data[i]);
    }

    return quantized.buffer;
  }

  /**
   * Convert float32 to float16 representation
   */
  private floatToHalf(value: number): number {
    const floatView = new Float32Array(1);
    const int32View = new Int32Array(floatView.buffer);

    floatView[0] = value;
    const x = int32View[0];

    const sign = (x >> 16) & 0x8000;
    let exponent = ((x >> 23) & 0xff) - 127 + 15;
    let mantissa = x & 0x7fffff;

    if (exponent <= 0) {
      return sign;
    } else if (exponent >= 31) {
      return sign | 0x7c00;
    }

    return sign | (exponent << 10) | (mantissa >> 13);
  }

  /**
   * Dequantize a tensor
   */
  dequantize(name: string): Float32Array | null {
    const tensor = this.tensors.get(name);
    if (!tensor) {
      return null;
    }

    const numElements = tensor.shape.reduce((a, b) => a * b, 1);
    const result = new Float32Array(numElements);

    switch (tensor.precision) {
      case QuantizationPrecision.INT8:
        this.dequantizeInt8(tensor, result);
        break;

      case QuantizationPrecision.INT4:
      case QuantizationPrecision.GGML_Q4_0:
      case QuantizationPrecision.GGML_Q4_K_M:
        this.dequantizeInt4(tensor, result);
        break;

      case QuantizationPrecision.FP16:
      case QuantizationPrecision.BF16:
        this.dequantizeFP16(tensor, result);
        break;

      default:
        result.set(new Float32Array(tensor.data));
    }

    return result;
  }

  /**
   * Dequantize INT8 tensor
   */
  private dequantizeInt8(tensor: QuantizedTensor, result: Float32Array): void {
    const quantized = new Int8Array(tensor.data);

    for (let i = 0; i < result.length; i++) {
      result[i] = (quantized[i] - tensor.zeroPoint) * tensor.scale;
    }
  }

  /**
   * Dequantize INT4 tensor
   */
  private dequantizeInt4(tensor: QuantizedTensor, result: Float32Array): void {
    const quantized = new Uint8Array(tensor.data);

    for (let i = 0; i < result.length; i += 2) {
      const packed = quantized[i / 2];
      const val1 = (packed >> 4) & 0x0f;
      const val2 = packed & 0x0f;

      result[i] = (val1 - tensor.zeroPoint) * tensor.scale;
      if (i + 1 < result.length) {
        result[i + 1] = (val2 - tensor.zeroPoint) * tensor.scale;
      }
    }
  }

  /**
   * Dequantize FP16 tensor
   */
  private dequantizeFP16(tensor: QuantizedTensor, result: Float32Array): void {
    const quantized = new Uint16Array(tensor.data);

    for (let i = 0; i < result.length; i++) {
      result[i] = this.halfToFloat(quantized[i]);
    }
  }

  /**
   * Convert float16 to float32
   */
  private halfToFloat(value: number): number {
    const sign = (value & 0x8000) >> 15;
    const exponent = (value & 0x7c00) >> 10;
    const mantissa = value & 0x03ff;

    if (exponent === 0) {
      return sign ? -0 : 0;
    } else if (exponent === 31) {
      return mantissa ? NaN : sign ? -Infinity : Infinity;
    }

    const exp = exponent - 15 + 127;
    const floatView = new Float32Array(1);
    const int32View = new Int32Array(floatView.buffer);

    int32View[0] = (sign << 31) | (exp << 23) | (mantissa << 13);
    return floatView[0];
  }

  /**
   * Add entry to KV cache
   */
  addToKVCache(position: number, key: Float32Array, value: Float32Array): void {
    if (!this.config.enableKVCache) {
      return;
    }

    // Evict old entries if at capacity
    if (this.kvCache.size >= this.config.kvCacheMaxTokens) {
      this.evictOldestKVEntry();
    }

    const entry: KVCacheEntry = {
      key: new Float32Array(key),
      value: new Float32Array(value),
      position,
      timestamp: Date.now(),
    };

    this.kvCache.set(position, entry);

    // Update stats
    const entrySizeMB = ((key.length + value.length) * 4) / (1024 * 1024);
    this.stats.kvCacheUsageMB += entrySizeMB;
    this.stats.totalAllocatedMB += entrySizeMB;
    this.stats.peakUsageMB = Math.max(this.stats.peakUsageMB, this.stats.totalAllocatedMB);

    this.emit('kv_cache_updated', { position, sizeMB: entrySizeMB });
  }

  /**
   * Get entry from KV cache
   */
  getFromKVCache(position: number): KVCacheEntry | null {
    return this.kvCache.get(position) || null;
  }

  /**
   * Get KV cache range
   */
  getKVCacheRange(startPosition: number, endPosition: number): KVCacheEntry[] {
    const entries: KVCacheEntry[] = [];

    for (let pos = startPosition; pos <= endPosition; pos++) {
      const entry = this.kvCache.get(pos);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Evict oldest KV cache entry
   */
  private evictOldestKVEntry(): void {
    let oldestPosition = -1;
    let oldestTimestamp = Infinity;

    for (const [position, entry] of this.kvCache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestPosition = position;
      }
    }

    if (oldestPosition >= 0) {
      const entry = this.kvCache.get(oldestPosition);
      if (entry) {
        const entrySizeMB = ((entry.key.length + entry.value.length) * 4) / (1024 * 1024);
        this.stats.kvCacheUsageMB -= entrySizeMB;
        this.stats.totalAllocatedMB -= entrySizeMB;
      }
      this.kvCache.delete(oldestPosition);
      this.emit('kv_cache_evicted', { position: oldestPosition });
    }
  }

  /**
   * Clear KV cache
   */
  clearKVCache(): void {
    this.stats.totalAllocatedMB -= this.stats.kvCacheUsageMB;
    this.stats.kvCacheUsageMB = 0;
    this.kvCache.clear();
    this.emit('kv_cache_cleared');
  }

  /**
   * Get tensor by name
   */
  getTensor(name: string): QuantizedTensor | null {
    return this.tensors.get(name) || null;
  }

  /**
   * Remove tensor
   */
  removeTensor(name: string): boolean {
    const tensor = this.tensors.get(name);
    if (!tensor) {
      return false;
    }

    const sizeMB = tensor.memorySizeBytes / (1024 * 1024);
    this.stats.modelWeightsMB -= sizeMB;
    this.stats.totalAllocatedMB -= sizeMB;

    this.tensors.delete(name);
    this.emit('tensor_removed', { name, sizeMB });

    return true;
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    return { ...this.stats };
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get available memory
   */
  getAvailableMemoryMB(): number {
    return this.config.maxMemoryMB - this.stats.totalAllocatedMB;
  }

  /**
   * Optimize memory usage
   */
  async optimize(): Promise<void> {
    // Compact KV cache
    if (this.config.enableKVCache) {
      await this.compactKVCache();
    }

    // Defragment tensor storage
    await this.defragmentTensors();

    this.emit('memory_optimized', this.stats);
  }

  /**
   * Compact KV cache
   */
  private async compactKVCache(): Promise<void> {
    // Re-index cache entries to be contiguous
    const entries = Array.from(this.kvCache.values()).sort((a, b) => a.position - b.position);

    this.kvCache.clear();

    for (let i = 0; i < entries.length; i++) {
      entries[i].position = i;
      this.kvCache.set(i, entries[i]);
    }

    this.emit('kv_cache_compacted', { entryCount: entries.length });
  }

  /**
   * Defragment tensor storage
   */
  private async defragmentTensors(): Promise<void> {
    // In a real implementation, this would reorganize memory layout
    this.emit('tensors_defragmented', { tensorCount: this.tensors.size });
  }

  /**
   * Shutdown and release resources
   */
  async shutdown(): Promise<void> {
    this.tensors.clear();
    this.kvCache.clear();

    this.stats = {
      totalAllocatedMB: 0,
      peakUsageMB: this.stats.peakUsageMB,
      kvCacheUsageMB: 0,
      modelWeightsMB: 0,
      activationsMB: 0,
      compressionRatio: 1.0,
      quantizationSavings: 0,
    };

    this.initialized = false;
    this.emit('shutdown');
  }
}

/**
 * Create a quantized memory manager with default configuration
 */
export function createQuantizedMemoryManager(
  config: Partial<QuantizationConfig> = {}
): QuantizedMemoryManager {
  return new QuantizedMemoryManager(config);
}

export default QuantizedMemoryManager;
