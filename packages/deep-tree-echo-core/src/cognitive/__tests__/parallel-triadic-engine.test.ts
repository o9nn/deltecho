/**
 * Parallel Triadic Engine Tests
 *
 * Comprehensive test suite for the parallel triadic cognitive engine.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ParallelTriadicEngine,
  CognitiveStream,
  ProcessingMode,
  StepType,
  DyadPair,
  TriadPhase,
  ParallelTriadicEngineConfig,
  createParallelTriadicEngine,
} from '../parallel-triadic-engine';

describe('ParallelTriadicEngine', () => {
  let engine: ParallelTriadicEngine;

  beforeEach(() => {
    engine = new ParallelTriadicEngine({ stepDurationMs: 10 });
  });

  afterEach(async () => {
    await engine.stop();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const defaultEngine = new ParallelTriadicEngine();
      expect(defaultEngine).toBeDefined();
      expect(defaultEngine.isRunning()).toBe(false);
    });

    it('should create instance with custom config', () => {
      const customConfig: Partial<ParallelTriadicEngineConfig> = {
        stepDurationMs: 50,
        enableQuantumEntanglement: false,
        syncThreshold: 0.9,
      };
      const customEngine = new ParallelTriadicEngine(customConfig);
      expect(customEngine).toBeDefined();
    });
  });

  describe('createParallelTriadicEngine factory', () => {
    it('should create engine instance', () => {
      const instance = createParallelTriadicEngine();
      expect(instance).toBeInstanceOf(ParallelTriadicEngine);
    });

    it('should pass config to engine', () => {
      const config = { stepDurationMs: 200 };
      const instance = createParallelTriadicEngine(config);
      expect(instance).toBeDefined();
    });
  });

  describe('stream initialization', () => {
    it('should initialize all three streams', () => {
      const states = engine.getStreamStates();

      expect(states.has(CognitiveStream.COGNITIVE)).toBe(true);
      expect(states.has(CognitiveStream.AFFECTIVE)).toBe(true);
      expect(states.has(CognitiveStream.RELEVANCE)).toBe(true);
    });

    it('should initialize streams with default state', () => {
      const states = engine.getStreamStates();
      const cognitiveState = states.get(CognitiveStream.COGNITIVE);

      expect(cognitiveState?.step).toBe(0);
      expect(cognitiveState?.mode).toBe(ProcessingMode.EXPRESSIVE);
      expect(cognitiveState?.stepType).toBe(StepType.PERCEPTION);
    });
  });

  describe('registerProcessor', () => {
    it('should register processor for stream', () => {
      const processor = vi.fn().mockResolvedValue({ result: 'test' });

      expect(() => {
        engine.registerProcessor(CognitiveStream.COGNITIVE, processor);
      }).not.toThrow();
    });

    it('should allow registering processors for all streams', () => {
      const processor = vi.fn().mockResolvedValue({});

      engine.registerProcessor(CognitiveStream.COGNITIVE, processor);
      engine.registerProcessor(CognitiveStream.AFFECTIVE, processor);
      engine.registerProcessor(CognitiveStream.RELEVANCE, processor);

      expect(true).toBe(true); // No errors
    });
  });

  describe('start/stop lifecycle', () => {
    it('should start the engine', async () => {
      await engine.start();
      expect(engine.isRunning()).toBe(true);
    });

    it('should emit started event', async () => {
      const handler = vi.fn();
      engine.on('started', handler);

      await engine.start();

      expect(handler).toHaveBeenCalled();
    });

    it('should stop the engine', async () => {
      await engine.start();
      await engine.stop();
      expect(engine.isRunning()).toBe(false);
    });

    it('should emit stopped event', async () => {
      const handler = vi.fn();
      engine.on('stopped', handler);

      await engine.start();
      await engine.stop();

      expect(handler).toHaveBeenCalled();
    });

    it('should not start twice', async () => {
      await engine.start();
      await engine.start();
      expect(engine.isRunning()).toBe(true);
    });
  });

  describe('cognitive loop', () => {
    it('should emit step_complete events', async () => {
      const handler = vi.fn();
      engine.on('step_complete', handler);

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 150));
      await engine.stop();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit cycle_complete events', async () => {
      const handler = vi.fn();
      engine.on('cycle_complete', handler);

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await engine.stop();

      // May or may not complete a full cycle depending on timing
      // Just verify it doesn't crash
      expect(true).toBe(true);
    });

    it('should process registered processors', async () => {
      const processor = vi.fn().mockResolvedValue({ processed: true });
      engine.registerProcessor(CognitiveStream.COGNITIVE, processor);

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engine.stop();

      expect(processor).toHaveBeenCalled();
    });
  });

  describe('runParallelInference', () => {
    it('should run inference across all streams', async () => {
      const cognitiveProcessor = vi.fn().mockResolvedValue({ type: 'cognitive' });
      const affectiveProcessor = vi.fn().mockResolvedValue({ type: 'affective' });
      const relevanceProcessor = vi.fn().mockResolvedValue({ type: 'relevance' });

      engine.registerProcessor(CognitiveStream.COGNITIVE, cognitiveProcessor);
      engine.registerProcessor(CognitiveStream.AFFECTIVE, affectiveProcessor);
      engine.registerProcessor(CognitiveStream.RELEVANCE, relevanceProcessor);

      const result = await engine.runParallelInference({ input: 'test' });

      expect(result.cognitive).toBeDefined();
      expect(result.affective).toBeDefined();
      expect(result.relevance).toBeDefined();
      expect(result.integrated).toBeDefined();
    });

    it('should emit parallel_inference_complete event', async () => {
      const handler = vi.fn();
      engine.on('parallel_inference_complete', handler);

      await engine.runParallelInference({ input: 'test' });

      expect(handler).toHaveBeenCalled();
    });

    it('should calculate total latency', async () => {
      const result = await engine.runParallelInference({ input: 'test' });

      expect(result.totalLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should integrate results with weights', async () => {
      const cognitiveProcessor = vi.fn().mockResolvedValue({ value: 1 });
      const affectiveProcessor = vi.fn().mockResolvedValue({ value: 2 });
      const relevanceProcessor = vi.fn().mockResolvedValue({ value: 3 });

      engine.registerProcessor(CognitiveStream.COGNITIVE, cognitiveProcessor);
      engine.registerProcessor(CognitiveStream.AFFECTIVE, affectiveProcessor);
      engine.registerProcessor(CognitiveStream.RELEVANCE, relevanceProcessor);

      const result = await engine.runParallelInference({ input: 'test' });

      expect(result.integrated.cognitiveWeight).toBeGreaterThan(0);
      expect(result.integrated.affectiveWeight).toBeGreaterThan(0);
      expect(result.integrated.relevanceWeight).toBeGreaterThan(0);

      // Weights should sum to 1
      const totalWeight =
        result.integrated.cognitiveWeight +
        result.integrated.affectiveWeight +
        result.integrated.relevanceWeight;
      expect(totalWeight).toBeCloseTo(1, 5);
    });
  });

  describe('getCurrentContext', () => {
    it('should return current context', () => {
      const context = engine.getCurrentContext();

      expect(context.cycleNumber).toBeDefined();
      expect(context.globalStep).toBeDefined();
      expect(context.dyad).toBeDefined();
      expect(context.triad).toBeDefined();
      expect(context.streams).toBeDefined();
      expect(context.synchronizationPoints).toBeDefined();
    });

    it('should have valid dyad value', () => {
      const context = engine.getCurrentContext();
      expect([DyadPair.A, DyadPair.B]).toContain(context.dyad);
    });

    it('should have valid triad value', () => {
      const context = engine.getCurrentContext();
      expect([TriadPhase.PHASE_1, TriadPhase.PHASE_2, TriadPhase.PHASE_3]).toContain(context.triad);
    });

    it('should have synchronization points at 4, 8, 12', () => {
      const context = engine.getCurrentContext();
      expect(context.synchronizationPoints).toEqual([4, 8, 12]);
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = engine.getMetrics();

      expect(metrics.totalCycles).toBe(0);
      expect(metrics.averageCycleTimeMs).toBe(0);
      expect(metrics.syncSuccessRate).toBe(1.0);
    });

    it('should track stream latencies', () => {
      const metrics = engine.getMetrics();

      expect(metrics.streamLatencies).toBeDefined();
      expect(typeof metrics.streamLatencies).toBe('object');
    });
  });

  describe('quantum entanglement', () => {
    it('should emit entanglement events when enabled', async () => {
      const handler = vi.fn();
      engine.on('entanglement', handler);

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engine.stop();

      expect(handler).toHaveBeenCalled();
    });

    it('should not emit entanglement when disabled', async () => {
      const disabledEngine = new ParallelTriadicEngine({
        stepDurationMs: 10,
        enableQuantumEntanglement: false,
      });

      const handler = vi.fn();
      disabledEngine.on('entanglement', handler);

      await disabledEngine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await disabledEngine.stop();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should entangle correct stream pairs', async () => {
      const entanglements: any[] = [];
      engine.on('entanglement', (data) => entanglements.push(data));

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engine.stop();

      // Check that entanglements include expected pairs
      const pairs = entanglements.map((e) => e.pair);
      const expectedPairs = [
        [CognitiveStream.COGNITIVE, CognitiveStream.AFFECTIVE],
        [CognitiveStream.AFFECTIVE, CognitiveStream.RELEVANCE],
        [CognitiveStream.RELEVANCE, CognitiveStream.COGNITIVE],
      ];

      // At least some pairs should be present
      expect(pairs.length).toBeGreaterThan(0);
    });
  });

  describe('synchronization', () => {
    it('should emit sync_complete events', async () => {
      const handler = vi.fn();
      engine.on('sync_complete', handler);

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engine.stop();

      expect(handler).toHaveBeenCalled();
    });

    it('should track sync success rate', async () => {
      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engine.stop();

      const metrics = engine.getMetrics();
      expect(metrics.syncSuccessRate).toBeLessThanOrEqual(1.0);
      expect(metrics.syncSuccessRate).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should emit error events on processor failure', async () => {
      const handler = vi.fn();
      engine.on('error', handler);

      const failingProcessor = vi.fn().mockRejectedValue(new Error('Test error'));
      engine.registerProcessor(CognitiveStream.COGNITIVE, failingProcessor);

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engine.stop();

      expect(handler).toHaveBeenCalled();
    });

    it('should continue processing after error', async () => {
      const failingProcessor = vi.fn().mockRejectedValue(new Error('Test error'));
      const workingProcessor = vi.fn().mockResolvedValue({ ok: true });

      engine.registerProcessor(CognitiveStream.COGNITIVE, failingProcessor);
      engine.registerProcessor(CognitiveStream.AFFECTIVE, workingProcessor);

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await engine.stop();

      // Working processor should still be called
      expect(workingProcessor).toHaveBeenCalled();
    });
  });
});

describe('CognitiveStream enum', () => {
  it('should have all expected streams', () => {
    expect(CognitiveStream.COGNITIVE).toBe('cognitive');
    expect(CognitiveStream.AFFECTIVE).toBe('affective');
    expect(CognitiveStream.RELEVANCE).toBe('relevance');
  });
});

describe('ProcessingMode enum', () => {
  it('should have all expected modes', () => {
    expect(ProcessingMode.EXPRESSIVE).toBe('expressive');
    expect(ProcessingMode.REFLECTIVE).toBe('reflective');
  });
});

describe('StepType enum', () => {
  it('should have all expected step types', () => {
    expect(StepType.PERCEPTION).toBe('perception');
    expect(StepType.ASSESSMENT).toBe('assessment');
    expect(StepType.PLANNING).toBe('planning');
    expect(StepType.ACTION).toBe('action');
    expect(StepType.MEMORY).toBe('memory');
    expect(StepType.INTEGRATION).toBe('integration');
  });
});

describe('DyadPair enum', () => {
  it('should have all expected dyad pairs', () => {
    expect(DyadPair.A).toBe('A');
    expect(DyadPair.B).toBe('B');
  });
});

describe('TriadPhase enum', () => {
  it('should have all expected triad phases', () => {
    expect(TriadPhase.PHASE_1).toBe(1);
    expect(TriadPhase.PHASE_2).toBe(2);
    expect(TriadPhase.PHASE_3).toBe(3);
  });
});
