/**
 * Memory Module
 *
 * Provides memory-efficient storage and retrieval capabilities
 * for Deep Tree Echo using quantization and optimization techniques.
 */

export {
  QuantizedMemoryManager,
  QuantizationPrecision,
  AllocationStrategy,
  createQuantizedMemoryManager,
  type QuantizationConfig,
  type QuantizedTensor,
  type KVCacheEntry,
  type MemoryStats,
} from './quantized-memory.js';
