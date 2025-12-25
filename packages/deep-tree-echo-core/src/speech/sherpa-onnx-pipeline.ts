/**
 * Sherpa ONNX Speech Pipeline
 *
 * Provides speech-to-text (ASR) and text-to-speech (TTS) capabilities
 * for Deep Tree Echo voice interaction using Sherpa ONNX.
 *
 * Features:
 * - Streaming speech recognition
 * - Voice activity detection (VAD)
 * - Text-to-speech synthesis
 * - Speaker diarization
 * - Multi-language support
 */

import { EventEmitter } from 'events';

/**
 * Supported speech recognition models
 */
export enum ASRModel {
  WHISPER_TINY = 'whisper-tiny',
  WHISPER_BASE = 'whisper-base',
  WHISPER_SMALL = 'whisper-small',
  PARAFORMER = 'paraformer',
  ZIPFORMER = 'zipformer',
  TRANSDUCER = 'transducer',
}

/**
 * Supported TTS models
 */
export enum TTSModel {
  PIPER = 'piper',
  VITS = 'vits',
  MATCHA = 'matcha',
  KOKORO = 'kokoro',
}

/**
 * Speech recognition result
 */
export interface ASRResult {
  text: string;
  confidence: number;
  language?: string;
  segments: ASRSegment[];
  processingTimeMs: number;
  isFinal: boolean;
}

/**
 * ASR segment with timing
 */
export interface ASRSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
}

/**
 * TTS synthesis result
 */
export interface TTSResult {
  audioData: Float32Array;
  sampleRate: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * Voice activity detection result
 */
export interface VADResult {
  isSpeech: boolean;
  probability: number;
  startTime?: number;
  endTime?: number;
}

/**
 * Speech pipeline configuration
 */
export interface SpeechPipelineConfig {
  // ASR configuration
  asrModel: ASRModel;
  asrModelPath?: string;
  language?: string;
  enablePunctuation?: boolean;
  enableTimestamps?: boolean;

  // TTS configuration
  ttsModel: TTSModel;
  ttsModelPath?: string;
  voiceId?: string;
  speakingRate?: number;

  // VAD configuration
  enableVAD?: boolean;
  vadThreshold?: number;
  vadMinSpeechDuration?: number;
  vadMinSilenceDuration?: number;

  // General configuration
  sampleRate?: number;
  numThreads?: number;
}

const DEFAULT_CONFIG: SpeechPipelineConfig = {
  asrModel: ASRModel.WHISPER_BASE,
  ttsModel: TTSModel.PIPER,
  language: 'en',
  enablePunctuation: true,
  enableTimestamps: true,
  enableVAD: true,
  vadThreshold: 0.5,
  vadMinSpeechDuration: 250,
  vadMinSilenceDuration: 500,
  sampleRate: 16000,
  numThreads: 4,
  speakingRate: 1.0,
};

/**
 * Sherpa ONNX Speech Pipeline
 *
 * Manages speech recognition and synthesis for voice interaction.
 */
export class SherpaOnnxPipeline extends EventEmitter {
  private config: SpeechPipelineConfig;
  private initialized: boolean = false;
  private asrActive: boolean = false;
  private ttsActive: boolean = false;

  // Streaming state
  private streamBuffer: Float32Array[] = [];
  private partialTranscript: string = '';

  // Metrics
  private metrics = {
    totalRecognitions: 0,
    totalSyntheses: 0,
    averageASRLatencyMs: 0,
    averageTTSLatencyMs: 0,
  };

  constructor(config: Partial<SpeechPipelineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the speech pipeline
   */
  async initialize(): Promise<boolean> {
    try {
      // Initialize ASR
      await this.initializeASR();

      // Initialize TTS
      await this.initializeTTS();

      // Initialize VAD if enabled
      if (this.config.enableVAD) {
        await this.initializeVAD();
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
   * Initialize ASR model
   */
  private async initializeASR(): Promise<void> {
    // In production, this would:
    // 1. Load the ONNX model file
    // 2. Create the recognizer with appropriate config
    // 3. Set up streaming if supported

    this.emit('asr_initialized', { model: this.config.asrModel });
  }

  /**
   * Initialize TTS model
   */
  private async initializeTTS(): Promise<void> {
    // In production, this would:
    // 1. Load the TTS model (Piper, VITS, etc.)
    // 2. Load voice configuration
    // 3. Set up audio synthesis pipeline

    this.emit('tts_initialized', { model: this.config.ttsModel });
  }

  /**
   * Initialize VAD
   */
  private async initializeVAD(): Promise<void> {
    // In production, this would:
    // 1. Load the Silero VAD model
    // 2. Configure thresholds

    this.emit('vad_initialized', { threshold: this.config.vadThreshold });
  }

  /**
   * Recognize speech from audio buffer
   */
  async recognize(audioData: Float32Array): Promise<ASRResult> {
    if (!this.initialized) {
      throw new Error('Speech pipeline not initialized');
    }

    const startTime = performance.now();

    try {
      // In production, this would:
      // 1. Preprocess audio (resample if needed)
      // 2. Run through ASR model
      // 3. Post-process results (punctuation, formatting)

      // Simulate recognition
      const result: ASRResult = {
        text: this.simulateRecognition(audioData),
        confidence: 0.95,
        language: this.config.language,
        segments: [
          {
            text: 'Simulated transcription',
            startTime: 0,
            endTime: audioData.length / (this.config.sampleRate || 16000),
            confidence: 0.95,
          },
        ],
        processingTimeMs: performance.now() - startTime,
        isFinal: true,
      };

      this.updateASRMetrics(result.processingTimeMs);
      this.emit('recognition_complete', result);

      return result;
    } catch (error) {
      const errorResult: ASRResult = {
        text: '',
        confidence: 0,
        segments: [],
        processingTimeMs: performance.now() - startTime,
        isFinal: true,
      };

      this.emit('error', { type: 'recognition', error });
      return errorResult;
    }
  }

  /**
   * Start streaming recognition
   */
  startStreamingRecognition(): void {
    if (!this.initialized) {
      throw new Error('Speech pipeline not initialized');
    }

    this.asrActive = true;
    this.streamBuffer = [];
    this.partialTranscript = '';

    this.emit('streaming_started');
  }

  /**
   * Process streaming audio chunk
   */
  async processStreamingChunk(audioChunk: Float32Array): Promise<ASRResult | null> {
    if (!this.asrActive) {
      return null;
    }

    this.streamBuffer.push(audioChunk);

    // Run VAD if enabled
    if (this.config.enableVAD) {
      const vadResult = await this.detectVoiceActivity(audioChunk);
      this.emit('vad_result', vadResult);

      if (!vadResult.isSpeech) {
        return null;
      }
    }

    // Process accumulated buffer
    const combinedBuffer = this.combineBuffers(this.streamBuffer);

    // In production, this would run incremental recognition
    const partialResult: ASRResult = {
      text: this.partialTranscript + '...',
      confidence: 0.8,
      segments: [],
      processingTimeMs: 0,
      isFinal: false,
    };

    this.emit('partial_result', partialResult);
    return partialResult;
  }

  /**
   * Stop streaming recognition and get final result
   */
  async stopStreamingRecognition(): Promise<ASRResult> {
    if (!this.asrActive) {
      return {
        text: '',
        confidence: 0,
        segments: [],
        processingTimeMs: 0,
        isFinal: true,
      };
    }

    this.asrActive = false;

    // Process final buffer
    const combinedBuffer = this.combineBuffers(this.streamBuffer);
    const finalResult = await this.recognize(combinedBuffer);

    this.streamBuffer = [];
    this.partialTranscript = '';

    this.emit('streaming_stopped', finalResult);
    return finalResult;
  }

  /**
   * Detect voice activity in audio chunk
   */
  async detectVoiceActivity(audioChunk: Float32Array): Promise<VADResult> {
    // In production, this would run Silero VAD
    // Simulate VAD based on audio energy
    const energy = this.calculateEnergy(audioChunk);
    const threshold = this.config.vadThreshold || 0.5;

    return {
      isSpeech: energy > threshold * 0.01,
      probability: Math.min(1, energy / 0.1),
    };
  }

  /**
   * Synthesize speech from text
   */
  async synthesize(text: string): Promise<TTSResult> {
    if (!this.initialized) {
      return {
        audioData: new Float32Array(0),
        sampleRate: this.config.sampleRate || 16000,
        durationMs: 0,
        success: false,
        error: 'Speech pipeline not initialized',
      };
    }

    const startTime = performance.now();

    try {
      // In production, this would:
      // 1. Preprocess text (normalize, expand abbreviations)
      // 2. Run through TTS model
      // 3. Apply speaking rate and other modifications

      // Simulate synthesis
      const sampleRate = this.config.sampleRate || 16000;
      const durationMs = text.length * 50; // ~50ms per character
      const numSamples = Math.floor((durationMs / 1000) * sampleRate);

      const audioData = this.generateSilence(numSamples);

      const processingTime = performance.now() - startTime;
      this.updateTTSMetrics(processingTime);

      const result: TTSResult = {
        audioData,
        sampleRate,
        durationMs,
        success: true,
      };

      this.emit('synthesis_complete', result);
      return result;
    } catch (error) {
      return {
        audioData: new Float32Array(0),
        sampleRate: this.config.sampleRate || 16000,
        durationMs: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Synthesize speech with streaming output
   */
  async *synthesizeStreaming(text: string): AsyncGenerator<Float32Array> {
    if (!this.initialized) {
      return;
    }

    this.ttsActive = true;

    // Split text into sentences for streaming
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

    for (const sentence of sentences) {
      if (!this.ttsActive) break;

      const result = await this.synthesize(sentence.trim());
      if (result.success) {
        yield result.audioData;
      }
    }

    this.ttsActive = false;
    this.emit('streaming_synthesis_complete');
  }

  /**
   * Stop streaming synthesis
   */
  stopStreamingSynthesis(): void {
    this.ttsActive = false;
    this.emit('streaming_synthesis_stopped');
  }

  /**
   * Get available voices for TTS
   */
  getAvailableVoices(): string[] {
    // In production, this would query the TTS model for available voices
    return ['default', 'female-1', 'male-1', 'neutral-1'];
  }

  /**
   * Set TTS voice
   */
  setVoice(voiceId: string): void {
    this.config.voiceId = voiceId;
    this.emit('voice_changed', { voiceId });
  }

  /**
   * Set speaking rate
   */
  setSpeakingRate(rate: number): void {
    this.config.speakingRate = Math.max(0.5, Math.min(2.0, rate));
    this.emit('speaking_rate_changed', { rate: this.config.speakingRate });
  }

  /**
   * Get pipeline metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if ASR is active
   */
  isASRActive(): boolean {
    return this.asrActive;
  }

  /**
   * Check if TTS is active
   */
  isTTSActive(): boolean {
    return this.ttsActive;
  }

  /**
   * Shutdown the pipeline
   */
  async shutdown(): Promise<void> {
    this.asrActive = false;
    this.ttsActive = false;
    this.streamBuffer = [];
    this.initialized = false;

    this.emit('shutdown');
  }

  // Private helper methods

  private simulateRecognition(audioData: Float32Array): string {
    // Simulate recognition based on audio length
    const durationSec = audioData.length / (this.config.sampleRate || 16000);
    if (durationSec < 0.5) {
      return '';
    }
    return 'Simulated transcription of audio input';
  }

  private combineBuffers(buffers: Float32Array[]): Float32Array {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const combined = new Float32Array(totalLength);

    let offset = 0;
    for (const buffer of buffers) {
      combined.set(buffer, offset);
      offset += buffer.length;
    }

    return combined;
  }

  private calculateEnergy(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  private generateSilence(numSamples: number): Float32Array {
    return new Float32Array(numSamples);
  }

  private updateASRMetrics(latencyMs: number): void {
    this.metrics.totalRecognitions++;
    const prevTotal = this.metrics.averageASRLatencyMs * (this.metrics.totalRecognitions - 1);
    this.metrics.averageASRLatencyMs = (prevTotal + latencyMs) / this.metrics.totalRecognitions;
  }

  private updateTTSMetrics(latencyMs: number): void {
    this.metrics.totalSyntheses++;
    const prevTotal = this.metrics.averageTTSLatencyMs * (this.metrics.totalSyntheses - 1);
    this.metrics.averageTTSLatencyMs = (prevTotal + latencyMs) / this.metrics.totalSyntheses;
  }
}

/**
 * Create a speech pipeline with default configuration
 */
export function createSpeechPipeline(
  config: Partial<SpeechPipelineConfig> = {}
): SherpaOnnxPipeline {
  return new SherpaOnnxPipeline(config);
}

/**
 * Speech-enabled cognitive adapter
 *
 * Bridges speech I/O with the Deep Tree Echo cognitive loop
 */
export class SpeechCognitiveAdapter {
  private pipeline: SherpaOnnxPipeline;
  private conversationHistory: Array<{ role: string; text: string }> = [];

  constructor(pipeline: SherpaOnnxPipeline) {
    this.pipeline = pipeline;
  }

  /**
   * Process voice input and return cognitive response
   */
  async processVoiceInput(
    audioData: Float32Array,
    cognitiveProcessor: (text: string) => Promise<string>
  ): Promise<{
    inputText: string;
    responseText: string;
    responseAudio: Float32Array | null;
  }> {
    // Recognize speech
    const asrResult = await this.pipeline.recognize(audioData);

    if (!asrResult.text || asrResult.confidence < 0.5) {
      return {
        inputText: '',
        responseText: '',
        responseAudio: null,
      };
    }

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', text: asrResult.text });

    // Process through cognitive system
    const responseText = await cognitiveProcessor(asrResult.text);

    // Add response to history
    this.conversationHistory.push({ role: 'assistant', text: responseText });

    // Synthesize response
    const ttsResult = await this.pipeline.synthesize(responseText);

    return {
      inputText: asrResult.text,
      responseText,
      responseAudio: ttsResult.success ? ttsResult.audioData : null,
    };
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): Array<{ role: string; text: string }> {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}

export default SherpaOnnxPipeline;
