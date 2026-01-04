/**
 * Tests for NativeInferenceEngine module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NativeInferenceEngine } from '../src/inner-membrane/NativeInferenceEngine.js';

describe('NativeInferenceEngine', () => {
  let engine: NativeInferenceEngine;

  beforeEach(() => {
    engine = new NativeInferenceEngine();
    engine.start();
  });

  afterEach(() => {
    if (engine.isRunning()) {
      engine.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with empty stats', () => {
      const newEngine = new NativeInferenceEngine();
      const stats = newEngine.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.patternMatches).toBe(0);
    });

    it('should start and stop correctly', () => {
      const newEngine = new NativeInferenceEngine();
      expect(newEngine.isRunning()).toBe(false);
      newEngine.start();
      expect(newEngine.isRunning()).toBe(true);
      newEngine.stop();
      expect(newEngine.isRunning()).toBe(false);
    });
  });

  describe('pattern matching', () => {
    it('should match greeting patterns', async () => {
      const response = await engine.infer({
        id: 'test-1',
        prompt: 'Hello there!',
      });
      expect(response.source).toBe('pattern');
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it('should match identity patterns', async () => {
      const response = await engine.infer({
        id: 'test-2',
        prompt: 'Who are you?',
      });
      expect(response.source).toBe('pattern');
      expect(response.text).toContain('Deep Tree Echo');
    });

    it('should match farewell patterns', async () => {
      const response = await engine.infer({
        id: 'test-3',
        prompt: 'Goodbye!',
      });
      expect(response.source).toBe('pattern');
      expect(response.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('caching', () => {
    it('should cache responses', async () => {
      const prompt = 'What is the meaning of life?';

      // First request
      const response1 = await engine.infer({ id: 'test-4', prompt });
      expect(response1.source).not.toBe('cached');

      // Second request with same prompt
      const response2 = await engine.infer({ id: 'test-5', prompt });
      expect(response2.source).toBe('cached');
    });

    it('should track cache hits in stats', async () => {
      const prompt = 'Test prompt for caching';

      await engine.infer({ id: 'test-6', prompt });
      await engine.infer({ id: 'test-7', prompt });

      const stats = engine.getStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      await engine.infer({ id: 'test-8', prompt: 'Cache test' });
      expect(engine.getCacheSize()).toBeGreaterThan(0);

      engine.clearCache();
      expect(engine.getCacheSize()).toBe(0);
    });
  });

  describe('complexity estimation', () => {
    it('should estimate low complexity for simple prompts', () => {
      const complexity = engine.estimateComplexity('Hello');
      expect(complexity).toBeLessThan(0.3);
    });

    it('should estimate higher complexity for longer prompts', () => {
      const longPrompt =
        'Can you explain the intricate details of how neural networks process information through multiple layers of abstraction and how this relates to human cognition?';
      const complexity = engine.estimateComplexity(longPrompt);
      expect(complexity).toBeGreaterThan(0.3);
    });

    it('should estimate higher complexity for technical prompts', () => {
      const technicalPrompt =
        'What algorithm should I use for this data processing system?';
      const complexity = engine.estimateComplexity(technicalPrompt);
      expect(complexity).toBeGreaterThan(0.2);
    });
  });

  describe('statistics', () => {
    it('should track total requests', async () => {
      await engine.infer({ id: 'test-9', prompt: 'Request 1' });
      await engine.infer({ id: 'test-10', prompt: 'Request 2' });
      await engine.infer({ id: 'test-11', prompt: 'Request 3' });

      const stats = engine.getStats();
      expect(stats.totalRequests).toBe(3);
    });

    it('should calculate average latency', async () => {
      await engine.infer({ id: 'test-12', prompt: 'Latency test' });

      const stats = engine.getStats();
      expect(stats.averageLatency).toBeGreaterThan(0);
    });

    it('should track energy consumption', async () => {
      await engine.infer({ id: 'test-13', prompt: 'Energy test' });

      const stats = engine.getStats();
      expect(stats.energyConsumed).toBeGreaterThan(0);
    });
  });

  describe('custom patterns', () => {
    it('should allow adding custom patterns', async () => {
      engine.addPattern(
        /custom test pattern/i,
        ['Custom response!'],
        0.95
      );

      const response = await engine.infer({
        id: 'test-14',
        prompt: 'This is a custom test pattern',
      });

      expect(response.text).toBe('Custom response!');
      expect(response.source).toBe('pattern');
    });
  });
});
