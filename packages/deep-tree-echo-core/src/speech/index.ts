/**
 * Speech Module
 *
 * Provides speech-to-text and text-to-speech capabilities
 * for Deep Tree Echo voice interaction.
 */

export {
  SherpaOnnxPipeline,
  ASRModel,
  TTSModel,
  SpeechCognitiveAdapter,
  createSpeechPipeline,
  type SpeechPipelineConfig,
  type ASRResult,
  type ASRSegment,
  type TTSResult,
  type VADResult,
} from './sherpa-onnx-pipeline.js';
