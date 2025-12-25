/**
 * Electron Module
 *
 * Provides native GGML/LLaMA inference capabilities
 * for Electron desktop applications.
 */

export {
  LlamaElectronMain,
  LlamaElectronRenderer,
  GGMLBackend,
  GGMLQuantization,
  IPCMessageType,
  createLlamaElectronMain,
  createLlamaElectronRenderer,
  type ElectronLlamaConfig,
  type ElectronGenerationConfig,
  type GGMLModelMetadata,
  type ElectronInferenceResult,
  type SystemInfo,
} from './llama-electron.js';
