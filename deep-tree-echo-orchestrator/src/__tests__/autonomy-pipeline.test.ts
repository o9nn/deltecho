import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AutonomyPipeline, AutonomyPipelineConfig } from '../autonomy-pipeline.js';

// Mock deep-tree-echo-core
jest.unstable_mockModule('deep-tree-echo-core', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  LLMService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn<(input: string, context: string[]) => Promise<string>>()
      .mockResolvedValue('Consolidated memory summary'),
    setConfig: jest.fn(),
  })),
  VectorMemoryStore: jest.fn().mockImplementation(() => ({
    setEnabled: jest.fn(),
    ready: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    storeMemory: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    storeReflection: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    searchMemoriesWithScores: jest.fn<() => Promise<Array<{ memory: { text: string }; score: number }>>>()
      .mockResolvedValue([]),
    retrieveRecentMemories: jest.fn<() => string[]>().mockReturnValue([]),
    flush: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    destroy: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    getStats: jest.fn().mockReturnValue({ memoryCount: 0, reflectionCount: 0 }),
  })),
  VectorMemoryStoreConfig: {},
  EmbeddingService: jest.fn().mockImplementation(() => ({
    embed: jest.fn<() => Promise<number[]>>().mockResolvedValue(new Array(384).fill(0)),
    getDimension: jest.fn().mockReturnValue(384),
  })),
  EmbeddingServiceConfig: {},
  FileSystemStorage: jest.fn().mockImplementation(() => ({
    get: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
    set: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    delete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    keys: jest.fn<() => Promise<string[]>>().mockResolvedValue([]),
  })),
  FileSystemStorageConfig: {},
}));

describe('AutonomyPipeline', () => {
  let pipeline: AutonomyPipeline;

  afterEach(async () => {
    if (pipeline?.isRunning()) {
      await pipeline.stop();
    }
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      pipeline = new AutonomyPipeline();
      expect(pipeline.isRunning()).toBe(false);
    });

    it('should create with custom config', () => {
      pipeline = new AutonomyPipeline({
        enabled: true,
        enablePerception: false,
        enablePlanning: false,
        enableExecution: true,
        enableVectorMemory: false,
        storagePath: '/tmp/test-memory',
      });
      expect(pipeline.isRunning()).toBe(false);
    });

    it('should not start when disabled', async () => {
      pipeline = new AutonomyPipeline({ enabled: false });
      await pipeline.start();
      expect(pipeline.isRunning()).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('should start and stop cleanly with minimal config', async () => {
      pipeline = new AutonomyPipeline({
        enablePerception: false,
        enablePlanning: false,
        enableExecution: false,
        enableVectorMemory: false,
        enableEchobeats: false,
      });

      await pipeline.start();
      expect(pipeline.isRunning()).toBe(true);

      await pipeline.stop();
      expect(pipeline.isRunning()).toBe(false);
    });

    it('should start with vector memory enabled', async () => {
      pipeline = new AutonomyPipeline({
        enablePerception: false,
        enablePlanning: false,
        enableExecution: false,
        enableVectorMemory: true,
        enableEchobeats: false,
        storagePath: '/tmp/test-dte-memory',
      });

      await pipeline.start();
      expect(pipeline.isRunning()).toBe(true);
      expect(pipeline.getVectorMemory()).not.toBeNull();

      await pipeline.stop();
    });

    it('should start with tool execution enabled', async () => {
      pipeline = new AutonomyPipeline({
        enablePerception: false,
        enablePlanning: false,
        enableExecution: true,
        enableVectorMemory: false,
        enableEchobeats: false,
      });

      await pipeline.start();
      expect(pipeline.isRunning()).toBe(true);
      expect(pipeline.getToolEngine()).not.toBeNull();

      await pipeline.stop();
    });

    it('should emit pipeline_started and pipeline_stopped events', async () => {
      pipeline = new AutonomyPipeline({
        enablePerception: false,
        enablePlanning: false,
        enableExecution: false,
        enableVectorMemory: false,
        enableEchobeats: false,
      });

      const events: string[] = [];
      pipeline.on('pipeline_started', () => events.push('started'));
      pipeline.on('pipeline_stopped', () => events.push('stopped'));

      await pipeline.start();
      await pipeline.stop();

      expect(events).toEqual(['started', 'stopped']);
    });
  });

  describe('dependency injection', () => {
    it('should accept LLMService injection', () => {
      pipeline = new AutonomyPipeline();
      const mockLLM = { generateResponse: jest.fn() } as any;
      pipeline.setLLMService(mockLLM);
      // Should not throw
    });

    it('should accept ProactiveLoop injection', () => {
      pipeline = new AutonomyPipeline();
      const mockLoop = {
        registerPerceptionHandler: jest.fn(),
        registerActionHandler: jest.fn(),
        on: jest.fn(),
      } as any;
      pipeline.setProactiveLoop(mockLoop);
      // Should not throw
    });
  });

  describe('cognitive processor', () => {
    it('should expose the cognitive tick processor', () => {
      pipeline = new AutonomyPipeline();
      const processor = pipeline.getCognitiveProcessor();
      expect(processor).toBeDefined();
      expect(typeof processor.processTick).toBe('function');
    });
  });

  describe('statistics', () => {
    it('should return comprehensive stats', async () => {
      pipeline = new AutonomyPipeline({
        enablePerception: false,
        enablePlanning: false,
        enableExecution: true,
        enableVectorMemory: false,
        enableEchobeats: false,
      });

      await pipeline.start();
      const stats = pipeline.getStats();

      expect(stats).toHaveProperty('perceptsReceived');
      expect(stats).toHaveProperty('planningCycles');
      expect(stats).toHaveProperty('toolsExecuted');
      expect(stats).toHaveProperty('memoriesConsolidated');
      expect(stats).toHaveProperty('echobeatTicks');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('cognitiveState');
      expect(stats).toHaveProperty('toolEngineStats');

      await pipeline.stop();
    });

    it('should track errors', () => {
      pipeline = new AutonomyPipeline();
      const stats = pipeline.getStats();
      expect(stats.errors).toBe(0);
    });
  });

  describe('memory operations', () => {
    it('should store messages when vector memory is available', async () => {
      pipeline = new AutonomyPipeline({
        enablePerception: false,
        enablePlanning: false,
        enableExecution: false,
        enableVectorMemory: true,
        enableEchobeats: false,
        storagePath: '/tmp/test-dte-store',
      });

      await pipeline.start();

      await pipeline.storeMessage({
        chatId: 1,
        messageId: 1,
        sender: 'user',
        text: 'Hello DTE',
      });

      // Should not throw
      await pipeline.stop();
    });

    it('should search memory when vector memory is available', async () => {
      pipeline = new AutonomyPipeline({
        enablePerception: false,
        enablePlanning: false,
        enableExecution: false,
        enableVectorMemory: true,
        enableEchobeats: false,
        storagePath: '/tmp/test-dte-search',
      });

      await pipeline.start();
      const results = await pipeline.searchMemory('test query');
      expect(Array.isArray(results)).toBe(true);

      await pipeline.stop();
    });

    it('should return empty array when vector memory is not available', async () => {
      pipeline = new AutonomyPipeline({
        enablePerception: false,
        enablePlanning: false,
        enableExecution: false,
        enableVectorMemory: false,
        enableEchobeats: false,
      });

      await pipeline.start();
      const results = await pipeline.searchMemory('test');
      expect(results).toEqual([]);

      await pipeline.stop();
    });
  });
});
