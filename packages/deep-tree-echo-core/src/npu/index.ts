/**
 * NPU Integration Module
 *
 * Provides hardware acceleration for Deep Tree Echo cognitive processing
 * using Qualcomm QNN SDK and other NPU backends.
 */

export {
  QNNIntegration,
  QNNBackend,
  HTPVersion,
  QNNCognitiveAdapter,
  createQNNIntegration,
  type QNNModelConfig,
  type QNNInferenceResult,
  type QNNMetrics,
} from './qnn-integration.js';
