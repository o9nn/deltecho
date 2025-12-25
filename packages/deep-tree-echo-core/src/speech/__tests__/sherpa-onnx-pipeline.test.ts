/**
 * Sherpa ONNX Speech Pipeline Tests
 *
 * Comprehensive test suite for the speech pipeline module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SherpaOnnxPipeline,
  ASRModel,
  TTSModel,
  SpeechPipelineConfig,
  SpeechCognitiveAdapter,
  createSpeechPipeline,
} from '../sherpa-onnx-pipeline';

describe('SherpaOnnxPipeline', () => {
  let pipeline: SherpaOnnxPipeline;

  beforeEach(() => {
    pipeline = new SherpaOnnxPipeline();
  });

  afterEach(async () => {
    await pipeline.shutdown();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(pipeline).toBeDefined();
      expect(pipeline.isInitialized()).toBe(false);
    });

    it('should create instance with custom config', () => {
      const customPipeline = new SherpaOnnxPipeline({
        asrModel: ASRModel.WHISPER_SMALL,
        ttsModel: TTSModel.VITS,
        language: 'es',
      });
      expect(customPipeline).toBeDefined();
    });
  });

  describe('createSpeechPipeline factory', () => {
    it('should create pipeline instance', () => {
      const instance = createSpeechPipeline();
      expect(instance).toBeInstanceOf(SherpaOnnxPipeline);
    });

    it('should pass config to pipeline', () => {
      const config: Partial<SpeechPipelineConfig> = {
        asrModel: ASRModel.PARAFORMER,
        language: 'zh',
      };
      const instance = createSpeechPipeline(config);
      expect(instance).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const result = await pipeline.initialize();
      expect(result).toBe(true);
      expect(pipeline.isInitialized()).toBe(true);
    });

    it('should emit initialized event', async () => {
      const handler = vi.fn();
      pipeline.on('initialized', handler);

      await pipeline.initialize();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.any(Object),
        })
      );
    });

    it('should emit asr_initialized event', async () => {
      const handler = vi.fn();
      pipeline.on('asr_initialized', handler);

      await pipeline.initialize();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
        })
      );
    });

    it('should emit tts_initialized event', async () => {
      const handler = vi.fn();
      pipeline.on('tts_initialized', handler);

      await pipeline.initialize();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
        })
      );
    });

    it('should emit vad_initialized event when VAD enabled', async () => {
      const handler = vi.fn();
      pipeline.on('vad_initialized', handler);

      await pipeline.initialize();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('recognize', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should recognize speech from audio', async () => {
      const audioData = new Float32Array(16000); // 1 second of audio
      const result = await pipeline.recognize(audioData);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.isFinal).toBe(true);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should emit recognition_complete event', async () => {
      const handler = vi.fn();
      pipeline.on('recognition_complete', handler);

      const audioData = new Float32Array(16000);
      await pipeline.recognize(audioData);

      expect(handler).toHaveBeenCalled();
    });

    it('should throw if not initialized', async () => {
      const uninitializedPipeline = new SherpaOnnxPipeline();
      const audioData = new Float32Array(16000);

      await expect(uninitializedPipeline.recognize(audioData)).rejects.toThrow(
        'Speech pipeline not initialized'
      );
    });

    it('should include segments with timestamps', async () => {
      const audioData = new Float32Array(16000);
      const result = await pipeline.recognize(audioData);

      expect(result.segments).toBeDefined();
      expect(Array.isArray(result.segments)).toBe(true);
    });
  });

  describe('streaming recognition', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should start streaming recognition', () => {
      expect(() => pipeline.startStreamingRecognition()).not.toThrow();
      expect(pipeline.isASRActive()).toBe(true);
    });

    it('should emit streaming_started event', () => {
      const handler = vi.fn();
      pipeline.on('streaming_started', handler);

      pipeline.startStreamingRecognition();

      expect(handler).toHaveBeenCalled();
    });

    it('should process streaming chunks', async () => {
      pipeline.startStreamingRecognition();

      const chunk = new Float32Array(1600); // 100ms chunk
      const result = await pipeline.processStreamingChunk(chunk);

      // Result may be null if VAD detects no speech
      expect(result === null || result.isFinal === false).toBe(true);
    });

    it('should stop streaming and return final result', async () => {
      pipeline.startStreamingRecognition();

      const chunk = new Float32Array(16000);
      await pipeline.processStreamingChunk(chunk);

      const finalResult = await pipeline.stopStreamingRecognition();

      expect(finalResult).toBeDefined();
      expect(finalResult.isFinal).toBe(true);
      expect(pipeline.isASRActive()).toBe(false);
    });

    it('should emit streaming_stopped event', async () => {
      const handler = vi.fn();
      pipeline.on('streaming_stopped', handler);

      pipeline.startStreamingRecognition();
      await pipeline.stopStreamingRecognition();

      expect(handler).toHaveBeenCalled();
    });

    it('should return empty result if stopped without starting', async () => {
      const result = await pipeline.stopStreamingRecognition();

      expect(result.text).toBe('');
      expect(result.isFinal).toBe(true);
    });
  });

  describe('detectVoiceActivity', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should detect voice activity', async () => {
      const audioChunk = new Float32Array(1600);
      const result = await pipeline.detectVoiceActivity(audioChunk);

      expect(result).toBeDefined();
      expect(typeof result.isSpeech).toBe('boolean');
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
    });

    it('should detect speech in high-energy audio', async () => {
      const audioChunk = new Float32Array(1600);
      // Fill with high-energy signal
      for (let i = 0; i < audioChunk.length; i++) {
        audioChunk[i] = Math.sin(i * 0.1) * 0.5;
      }

      const result = await pipeline.detectVoiceActivity(audioChunk);
      expect(result.probability).toBeGreaterThan(0);
    });
  });

  describe('synthesize', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should synthesize speech from text', async () => {
      const result = await pipeline.synthesize('Hello, world!');

      expect(result.success).toBe(true);
      expect(result.audioData).toBeInstanceOf(Float32Array);
      expect(result.sampleRate).toBe(16000);
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it('should emit synthesis_complete event', async () => {
      const handler = vi.fn();
      pipeline.on('synthesis_complete', handler);

      await pipeline.synthesize('Test text');

      expect(handler).toHaveBeenCalled();
    });

    it('should return error if not initialized', async () => {
      const uninitializedPipeline = new SherpaOnnxPipeline();
      const result = await uninitializedPipeline.synthesize('Test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('streaming synthesis', () => {
    beforeEach(async () => {
      await pipeline.initialize();
    });

    it('should synthesize speech in streaming mode', async () => {
      const chunks: Float32Array[] = [];

      for await (const chunk of pipeline.synthesizeStreaming('Hello. World. Test.')) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should emit streaming_synthesis_complete event', async () => {
      const handler = vi.fn();
      pipeline.on('streaming_synthesis_complete', handler);

      for await (const _ of pipeline.synthesizeStreaming('Hello.')) {
        // Consume iterator
      }

      expect(handler).toHaveBeenCalled();
    });

    it('should stop streaming synthesis', async () => {
      const generator = pipeline.synthesizeStreaming('Hello. World. This is a long text.');

      // Get first chunk
      await generator.next();

      // Stop synthesis
      pipeline.stopStreamingSynthesis();

      expect(pipeline.isTTSActive()).toBe(false);
    });
  });

  describe('voice management', () => {
    it('should get available voices', () => {
      const voices = pipeline.getAvailableVoices();

      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
    });

    it('should set voice', () => {
      const handler = vi.fn();
      pipeline.on('voice_changed', handler);

      pipeline.setVoice('female-1');

      expect(handler).toHaveBeenCalledWith({ voiceId: 'female-1' });
    });

    it('should set speaking rate', () => {
      const handler = vi.fn();
      pipeline.on('speaking_rate_changed', handler);

      pipeline.setSpeakingRate(1.5);

      expect(handler).toHaveBeenCalledWith({ rate: 1.5 });
    });

    it('should clamp speaking rate to valid range', () => {
      const handler = vi.fn();
      pipeline.on('speaking_rate_changed', handler);

      pipeline.setSpeakingRate(3.0); // Above max

      expect(handler).toHaveBeenCalledWith({ rate: 2.0 });
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = pipeline.getMetrics();

      expect(metrics.totalRecognitions).toBe(0);
      expect(metrics.totalSyntheses).toBe(0);
      expect(metrics.averageASRLatencyMs).toBe(0);
      expect(metrics.averageTTSLatencyMs).toBe(0);
    });

    it('should update metrics after operations', async () => {
      await pipeline.initialize();

      await pipeline.recognize(new Float32Array(16000));
      await pipeline.synthesize('Test');

      const metrics = pipeline.getMetrics();

      expect(metrics.totalRecognitions).toBe(1);
      expect(metrics.totalSyntheses).toBe(1);
    });
  });

  describe('shutdown', () => {
    it('should shutdown and clear state', async () => {
      await pipeline.initialize();
      await pipeline.shutdown();

      expect(pipeline.isInitialized()).toBe(false);
      expect(pipeline.isASRActive()).toBe(false);
      expect(pipeline.isTTSActive()).toBe(false);
    });

    it('should emit shutdown event', async () => {
      const handler = vi.fn();
      pipeline.on('shutdown', handler);

      await pipeline.initialize();
      await pipeline.shutdown();

      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('SpeechCognitiveAdapter', () => {
  let pipeline: SherpaOnnxPipeline;
  let adapter: SpeechCognitiveAdapter;

  beforeEach(async () => {
    pipeline = new SherpaOnnxPipeline();
    await pipeline.initialize();
    adapter = new SpeechCognitiveAdapter(pipeline);
  });

  afterEach(async () => {
    await pipeline.shutdown();
  });

  describe('processVoiceInput', () => {
    it('should process voice input and return response', async () => {
      const audioData = new Float32Array(16000);
      const cognitiveProcessor = vi.fn().mockResolvedValue('Response text');

      const result = await adapter.processVoiceInput(audioData, cognitiveProcessor);

      expect(result.inputText).toBeDefined();
      expect(result.responseText).toBe('Response text');
      expect(cognitiveProcessor).toHaveBeenCalled();
    });

    it('should return empty result for low confidence recognition', async () => {
      const audioData = new Float32Array(100); // Very short audio
      const cognitiveProcessor = vi.fn().mockResolvedValue('Response');

      const result = await adapter.processVoiceInput(audioData, cognitiveProcessor);

      expect(result.inputText).toBe('');
      expect(cognitiveProcessor).not.toHaveBeenCalled();
    });

    it('should update conversation history', async () => {
      const audioData = new Float32Array(16000);
      const cognitiveProcessor = vi.fn().mockResolvedValue('Response');

      await adapter.processVoiceInput(audioData, cognitiveProcessor);

      const history = adapter.getConversationHistory();
      expect(history.length).toBe(2);
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
    });
  });

  describe('conversation history', () => {
    it('should get conversation history', () => {
      const history = adapter.getConversationHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should clear conversation history', async () => {
      const audioData = new Float32Array(16000);
      const cognitiveProcessor = vi.fn().mockResolvedValue('Response');

      await adapter.processVoiceInput(audioData, cognitiveProcessor);
      adapter.clearHistory();

      const history = adapter.getConversationHistory();
      expect(history.length).toBe(0);
    });
  });
});

describe('ASRModel enum', () => {
  it('should have all expected models', () => {
    expect(ASRModel.WHISPER_TINY).toBe('whisper-tiny');
    expect(ASRModel.WHISPER_BASE).toBe('whisper-base');
    expect(ASRModel.WHISPER_SMALL).toBe('whisper-small');
    expect(ASRModel.PARAFORMER).toBe('paraformer');
    expect(ASRModel.ZIPFORMER).toBe('zipformer');
    expect(ASRModel.TRANSDUCER).toBe('transducer');
  });
});

describe('TTSModel enum', () => {
  it('should have all expected models', () => {
    expect(TTSModel.PIPER).toBe('piper');
    expect(TTSModel.VITS).toBe('vits');
    expect(TTSModel.MATCHA).toBe('matcha');
    expect(TTSModel.KOKORO).toBe('kokoro');
  });
});
