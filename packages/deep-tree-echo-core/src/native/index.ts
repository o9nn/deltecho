/**
 * Native Module
 *
 * Provides native inference capabilities for Deep Tree Echo
 * using platform-specific libraries (LLaMA, GGML, etc.).
 */

export {
  LlamaReactNativeBridge,
  MockNativeLlamaModule,
  createLlamaReactNativeBridge,
  createMockNativeModule,
  type LlamaModelConfig,
  type GenerationParams,
  type TokenResult,
  type CompletionResult,
  type ModelInfo,
  type NativeLlamaModule,
} from './llama-react-native.js';
