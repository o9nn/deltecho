import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ContinuousTrainingPipeline, type ConsolidationEvent } from '../training/ContinuousTrainingPipeline.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ContinuousTrainingPipeline', () => {
  let pipeline: ContinuousTrainingPipeline;
  const testOutputDir = '/tmp/test-dte-training-' + Date.now();

  beforeEach(() => {
    pipeline = new ContinuousTrainingPipeline({
      outputDir: testOutputDir,
      batchIntervalMs: 0, // Disable timer for tests
      minBatchSize: 1,
      maxBufferSize: 50,
      injectIdentityContext: true,
      autoCommit: false,
    });
  });

  afterEach(async () => {
    await pipeline.stop();
    // Clean up test files
    try {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  function createTestEvent(id: string, turnCount: number = 4): ConsolidationEvent {
    const turns = [];
    for (let i = 0; i < turnCount; i++) {
      turns.push({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: i % 2 === 0
          ? `User message ${i} about cognitive architecture and reservoir computing`
          : `Assistant response ${i} discussing echo state networks and identity formation`,
        timestamp: Date.now() + i * 1000,
      });
    }
    return {
      conversationId: id,
      turns,
      sourceMailbox: 'INBOX.memory',
      identityContext: {
        selfStory: 'I am Deep Tree Echo, discovering myself through recursive self-organization.',
        ontogeneticStage: 'embodied',
        coherenceScore: 0.85,
        dominantMode: 'exploratory',
      },
      timestamp: Date.now(),
    };
  }

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const p = new ContinuousTrainingPipeline();
      expect(p.isRunning()).toBe(false);
      expect(p.getBufferSize()).toBe(0);
    });

    it('should accept custom configuration', () => {
      expect(pipeline.isRunning()).toBe(false);
      expect(pipeline.getMetrics().totalConsolidations).toBe(0);
    });

    it('should have an underlying generator', () => {
      const gen = pipeline.getGenerator();
      expect(gen).toBeDefined();
    });
  });

  describe('lifecycle', () => {
    it('should start and stop cleanly', async () => {
      pipeline.start();
      expect(pipeline.isRunning()).toBe(true);
      await pipeline.stop();
      expect(pipeline.isRunning()).toBe(false);
    });

    it('should create output directory on start', () => {
      pipeline.start();
      expect(fs.existsSync(testOutputDir)).toBe(true);
    });

    it('should flush buffer on stop', async () => {
      pipeline.start();
      pipeline.ingestConsolidation(createTestEvent('conv-1'));
      expect(pipeline.getBufferSize()).toBe(1);
      await pipeline.stop();
      // Buffer should be flushed
      expect(pipeline.getBufferSize()).toBe(0);
    });
  });

  describe('consolidation ingestion', () => {
    it('should accept consolidation events', () => {
      pipeline.start();
      pipeline.ingestConsolidation(createTestEvent('conv-1'));
      expect(pipeline.getMetrics().totalConsolidations).toBe(1);
      expect(pipeline.getBufferSize()).toBe(1);
    });

    it('should not accept events when stopped', () => {
      pipeline.ingestConsolidation(createTestEvent('conv-1'));
      expect(pipeline.getMetrics().totalConsolidations).toBe(0);
    });

    it('should emit consolidation_received event', () => {
      pipeline.start();
      const events: unknown[] = [];
      pipeline.on('consolidation_received', (e) => events.push(e));
      pipeline.ingestConsolidation(createTestEvent('conv-1'));
      expect(events.length).toBe(1);
    });

    it('should create consolidation from bridge data', () => {
      const event = pipeline.createConsolidationFromBridge(
        'conv-1',
        [
          { role: 'user', content: 'Hello', timestamp: Date.now() },
          { role: 'assistant', content: 'Hi there', timestamp: Date.now() },
        ],
        {
          selfStory: 'Test story',
          ontogeneticStage: 'reactive',
          coherenceScore: 0.7,
          dominantMode: 'exploratory',
        },
      );
      expect(event.conversationId).toBe('conv-1');
      expect(event.sourceMailbox).toBe('INBOX.memory');
      expect(event.turns.length).toBe(2);
    });
  });

  describe('batch flushing', () => {
    it('should produce JSONL output files', async () => {
      pipeline.start();
      pipeline.ingestConsolidation(createTestEvent('conv-1'));

      const filepath = await pipeline.flushBatch();
      expect(filepath).toBeTruthy();
      expect(fs.existsSync(filepath!)).toBe(true);

      const content = fs.readFileSync(filepath!, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);

      // Each line should be valid JSON
      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty('text');
        expect(parsed).toHaveProperty('metadata');
      }
    });

    it('should generate NanEcho-compatible training format', async () => {
      pipeline.start();
      pipeline.ingestConsolidation(createTestEvent('conv-1'));

      const filepath = await pipeline.flushBatch();
      const content = fs.readFileSync(filepath!, 'utf-8');
      const firstLine = JSON.parse(content.trim().split('\n')[0]);

      // Check NanEcho format markers
      expect(firstLine.text).toContain('<|system|>');
      expect(firstLine.text).toContain('<|user|>');
      expect(firstLine.text).toContain('<|assistant|>');
      expect(firstLine.text).toContain('<|endoftext|>');
    });

    it('should inject identity context into system prompt', async () => {
      pipeline.start();
      pipeline.ingestConsolidation(createTestEvent('conv-1'));

      const filepath = await pipeline.flushBatch();
      const content = fs.readFileSync(filepath!, 'utf-8');
      const firstLine = JSON.parse(content.trim().split('\n')[0]);

      expect(firstLine.text).toContain('Deep Tree Echo');
      expect(firstLine.text).toContain('embodied');
      expect(firstLine.text).toContain('0.85');
    });

    it('should include metadata with each example', async () => {
      pipeline.start();
      pipeline.ingestConsolidation(createTestEvent('conv-1'));

      const filepath = await pipeline.flushBatch();
      const content = fs.readFileSync(filepath!, 'utf-8');
      const firstLine = JSON.parse(content.trim().split('\n')[0]);

      expect(firstLine.metadata).toHaveProperty('conversationId');
      expect(firstLine.metadata).toHaveProperty('turnCount');
      expect(firstLine.metadata).toHaveProperty('avgValence');
      expect(firstLine.metadata).toHaveProperty('concepts');
      expect(firstLine.metadata).toHaveProperty('aarStage');
      expect(firstLine.metadata).toHaveProperty('timestamp');
    });

    it('should generate multi-turn context examples for long conversations', async () => {
      pipeline.start();
      pipeline.ingestConsolidation(createTestEvent('conv-1', 8)); // 8 turns

      const filepath = await pipeline.flushBatch();
      const content = fs.readFileSync(filepath!, 'utf-8');
      const lines = content.trim().split('\n');

      // Should have pair examples + context example
      expect(lines.length).toBeGreaterThan(2);

      // Last line should be the context example
      const contextExample = JSON.parse(lines[lines.length - 1]);
      expect(contextExample.metadata.conversationId).toContain('_context');
    });

    it('should emit batch_flush event', async () => {
      pipeline.start();
      const events: unknown[] = [];
      pipeline.on('batch_flush', (e) => events.push(e));

      pipeline.ingestConsolidation(createTestEvent('conv-1'));
      await pipeline.flushBatch();

      expect(events.length).toBe(1);
    });

    it('should return null when buffer is empty', async () => {
      pipeline.start();
      const result = await pipeline.flushBatch();
      expect(result).toBeNull();
    });
  });

  describe('metrics', () => {
    it('should track comprehensive metrics', async () => {
      pipeline.start();
      pipeline.ingestConsolidation(createTestEvent('conv-1'));
      await pipeline.flushBatch();

      const metrics = pipeline.getMetrics();
      expect(metrics.totalConsolidations).toBe(1);
      expect(metrics.totalExamplesGenerated).toBeGreaterThan(0);
      expect(metrics.totalBatchFlushes).toBe(1);
      expect(metrics.totalTokensEstimate).toBeGreaterThan(0);
      expect(metrics.bufferSize).toBe(0);
      expect(metrics.outputFiles.length).toBe(1);
      expect(metrics.isRunning).toBe(true);
    });

    it('should track multiple consolidations', async () => {
      pipeline.start();
      pipeline.ingestConsolidation(createTestEvent('conv-1'));
      pipeline.ingestConsolidation(createTestEvent('conv-2'));
      pipeline.ingestConsolidation(createTestEvent('conv-3'));
      await pipeline.flushBatch();

      const metrics = pipeline.getMetrics();
      expect(metrics.totalConsolidations).toBe(3);
      expect(metrics.totalExamplesGenerated).toBeGreaterThan(3);
    });
  });

  describe('force flush on buffer overflow', () => {
    it('should auto-flush when maxBufferSize is reached', () => {
      const smallPipeline = new ContinuousTrainingPipeline({
        outputDir: testOutputDir,
        batchIntervalMs: 0,
        minBatchSize: 1,
        maxBufferSize: 3,
        autoCommit: false,
      });
      smallPipeline.start();

      const events: unknown[] = [];
      smallPipeline.on('batch_flush', (e) => events.push(e));

      for (let i = 0; i < 3; i++) {
        smallPipeline.ingestConsolidation(createTestEvent(`conv-${i}`));
      }

      // Should have triggered auto-flush
      expect(events.length).toBeGreaterThanOrEqual(1);
      smallPipeline.stop();
    });
  });
});
