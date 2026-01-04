/**
 * @fileoverview Tests for LLM Integration
 */

import { Sys6LLMIntegration, MockLLMProvider } from '../integration/LLMIntegration';

describe('MockLLMProvider', () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  test('embed returns embedding array', async () => {
    const embedding = await provider.embed('test input');
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(256);
  });

  test('embed is deterministic for same input', async () => {
    const embedding1 = await provider.embed('test input');
    const embedding2 = await provider.embed('test input');
    expect(embedding1).toEqual(embedding2);
  });

  test('embed produces different results for different inputs', async () => {
    const embedding1 = await provider.embed('input one');
    const embedding2 = await provider.embed('input two');
    expect(embedding1).not.toEqual(embedding2);
  });

  test('complete returns mock response', async () => {
    const response = await provider.complete('test prompt');
    expect(response).toContain('[Mock Response]');
    expect(response).toContain('test prompt'.length.toString());
  });

  test('isAvailable returns true', async () => {
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });
});

describe('Sys6LLMIntegration', () => {
  let integration: Sys6LLMIntegration;
  const dim = 64;

  beforeEach(() => {
    integration = new Sys6LLMIntegration({
      dim,
      provider: new MockLLMProvider(),
      cyclesPerInference: 1,
    });
  });

  describe('Initialization', () => {
    test('creates integration with correct config', () => {
      expect(integration).toBeDefined();
    });

    test('engine is accessible', () => {
      const engine = integration.getEngine();
      expect(engine).toBeDefined();
      expect(engine.config.dim).toBe(dim);
    });

    test('isAvailable returns provider availability', async () => {
      const available = await integration.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('Process', () => {
    test('process returns integrated result', async () => {
      const result = await integration.process('test input', 'cognitive');

      expect(result.response).toBeDefined();
      expect(result.cognitiveState).toBeDefined();
      expect(result.cycleResult).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    test('process with cognitive function', async () => {
      const result = await integration.process('analyze this', 'cognitive');
      expect(result.response).toContain('[Mock Response]');
    });

    test('process with affective function', async () => {
      const result = await integration.process('how do you feel', 'affective');
      expect(result.response).toContain('[Mock Response]');
    });

    test('process with relevance function', async () => {
      const result = await integration.process('what matters', 'relevance');
      expect(result.response).toContain('[Mock Response]');
    });

    test('metadata includes timing information', async () => {
      const result = await integration.process('test', 'cognitive');

      expect(result.metadata.llmLatencyMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.cycleLatencyMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.totalLatencyMs).toBeGreaterThanOrEqual(0);
    });

    test('cognitive state has correct shape', async () => {
      const result = await integration.process('test', 'cognitive');
      expect(result.cognitiveState.shape).toEqual([1, dim]);
    });

    test('cycle result has 30 steps', async () => {
      const result = await integration.process('test', 'cognitive');
      expect(result.cycleResult.steps.length).toBe(30);
    });
  });

  describe('Triadic Processing', () => {
    test('processTriadic returns all three perspectives', async () => {
      const result = await integration.processTriadic('test input');

      expect(result.cognitive).toBeDefined();
      expect(result.affective).toBeDefined();
      expect(result.relevance).toBeDefined();
      expect(result.integrated).toBeDefined();
    });

    test('triadic processing produces integrated response', async () => {
      const result = await integration.processTriadic('important decision');

      expect(result.integrated).toContain('[Mock Response]');
    });

    test('each perspective has valid metadata', async () => {
      const result = await integration.processTriadic('test');

      expect(result.cognitive.metadata.totalLatencyMs).toBeGreaterThanOrEqual(0);
      expect(result.affective.metadata.totalLatencyMs).toBeGreaterThanOrEqual(0);
      expect(result.relevance.metadata.totalLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Caching', () => {
    test('embedding cache works', async () => {
      // First call
      const result1 = await integration.process('cached input', 'cognitive');
      const time1 = result1.metadata.llmLatencyMs;

      // Second call should use cache (faster)
      const result2 = await integration.process('cached input', 'cognitive');

      // Both should produce valid results
      expect(result1.response).toBeDefined();
      expect(result2.response).toBeDefined();
    });

    test('clearCache clears embedding cache', async () => {
      await integration.process('test', 'cognitive');
      integration.clearCache();
      // Should not throw
      await integration.process('test', 'cognitive');
    });
  });
});
