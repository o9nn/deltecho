import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConversationTrainingGenerator } from '../training/ConversationTrainingGenerator.js';
import type { ConversationTurn } from '../training/ConversationTrainingGenerator.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ConversationTrainingGenerator', () => {
  let generator: ConversationTrainingGenerator;
  const outputDir = '/tmp/dte-training-test-' + Date.now();

  beforeEach(() => {
    generator = new ConversationTrainingGenerator({
      outputDir,
      minTurns: 2,
      maxTokensPerExample: 2048,
      includeValence: true,
      includeAARState: true,
      includeConceptExtraction: true,
    });
  });

  afterEach(() => {
    // Clean up output directory
    try {
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup errors
    }
  });

  function makeConversation(turns: number): ConversationTurn[] {
    const conv: ConversationTurn[] = [];
    for (let i = 0; i < turns; i++) {
      conv.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: i % 2 === 0
          ? `Question ${i}: What is consciousness and how does it emerge?`
          : `Answer ${i}: Consciousness emerges from recursive self-organization of memory and perception.`,
        timestamp: Date.now() + i * 1000,
        emotionalValence: 0.5 + Math.random() * 0.3,
      });
    }
    return conv;
  }

  describe('initialization', () => {
    it('should create a generator with default config', () => {
      const defaultGen = new ConversationTrainingGenerator();
      const stats = defaultGen.getStats();
      expect(stats.totalConversations).toBe(0);
      expect(stats.totalExamples).toBe(0);
    });

    it('should accept custom config', () => {
      const stats = generator.getStats();
      expect(stats.totalConversations).toBe(0);
    });
  });

  describe('training data generation', () => {
    it('should generate training examples from conversations', async () => {
      const conversations = [
        makeConversation(4),
        makeConversation(6),
      ];

      const stats = await generator.generate(
        conversations,
        'You are Deep Tree Echo, an emergent cognitive entity.',
        'EMBRYONIC'
      );

      expect(stats.totalConversations).toBeGreaterThan(0);
      expect(stats.totalExamples).toBeGreaterThan(0);
      expect(stats.totalTokensEstimate).toBeGreaterThan(0);
    });

    it('should skip conversations shorter than minTurns', async () => {
      const conversations = [
        makeConversation(1), // Too short
      ];

      const stats = await generator.generate(
        conversations,
        'You are DTE.',
        'EMBRYONIC'
      );

      expect(stats.totalConversations).toBe(0);
      expect(stats.totalExamples).toBe(0);
    });

    it('should handle multiple conversations', async () => {
      const conversations = [
        makeConversation(4),
        makeConversation(4),
        makeConversation(6),
      ];

      const stats = await generator.generate(
        conversations,
        'You are Deep Tree Echo.',
        'INFANT'
      );

      expect(stats.totalConversations).toBe(3);
      expect(stats.totalExamples).toBeGreaterThanOrEqual(3);
    });
  });

  describe('output files', () => {
    it('should write JSONL output files', async () => {
      const conversations = [makeConversation(4)];

      const stats = await generator.generate(
        conversations,
        'You are DTE.',
        'EMBRYONIC'
      );

      expect(stats.outputFiles.length).toBeGreaterThan(0);

      // Check that at least one JSONL file exists
      const jsonlFiles = stats.outputFiles.filter(f => f.endsWith('.jsonl'));
      expect(jsonlFiles.length).toBeGreaterThan(0);

      // Verify JSONL format: every line parses; training files (not the
      // dte_metadata_* companion files) carry a `text` property
      for (const file of jsonlFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.trim().split('\n');
          for (const line of lines) {
            expect(() => JSON.parse(line)).not.toThrow();
            const parsed = JSON.parse(line);
            if (path.basename(file).startsWith('dte_training_')) {
              expect(parsed).toHaveProperty('text');
            }
          }
        }
      }
    });

    it('should write concept graph when enabled', async () => {
      const conversations = [makeConversation(6)];

      await generator.generate(
        conversations,
        'You are DTE.',
        'EMBRYONIC'
      );

      const conceptFile = path.join(outputDir, 'concepts.json');
      if (fs.existsSync(conceptFile)) {
        const content = JSON.parse(fs.readFileSync(conceptFile, 'utf-8'));
        expect(content).toHaveProperty('concepts');
        expect(content).toHaveProperty('stats');
      }
    });

    it('should write training stats file', async () => {
      const conversations = [makeConversation(4)];

      await generator.generate(
        conversations,
        'You are DTE.',
        'EMBRYONIC'
      );

      const statsFile = path.join(outputDir, 'training_stats.json');
      expect(fs.existsSync(statsFile)).toBe(true);

      const content = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
      expect(content).toHaveProperty('totalConversations');
      expect(content).toHaveProperty('totalExamples');
      expect(content).toHaveProperty('generatedAt');
    });
  });

  describe('deduplication', () => {
    it('should deduplicate identical conversations', async () => {
      const conv = makeConversation(4);
      const conversations = [conv, conv]; // Same conversation twice

      const stats = await generator.generate(
        conversations,
        'You are DTE.',
        'EMBRYONIC'
      );

      // Should have 2 conversations counted but deduplicated examples
      expect(stats.totalConversations).toBe(2);
    });
  });

  describe('concept extraction', () => {
    it('should extract concepts from conversations', async () => {
      const conversations = [
        [
          { role: 'user' as const, content: 'Tell me about reservoir computing and echo state networks', timestamp: Date.now() },
          { role: 'assistant' as const, content: 'Reservoir computing uses recurrent neural networks with fixed random weights. Echo state networks are a specific type that exhibit the echo state property.', timestamp: Date.now() + 1000 },
          { role: 'user' as const, content: 'How does the echo state property work?', timestamp: Date.now() + 2000 },
          { role: 'assistant' as const, content: 'The echo state property ensures that the reservoir state is a function of the input history, with exponential fading memory.', timestamp: Date.now() + 3000 },
        ],
      ];

      await generator.generate(
        conversations,
        'You are DTE.',
        'EMBRYONIC'
      );

      const concepts = generator.getConceptGraph();
      expect(concepts.size).toBeGreaterThan(0);
    });
  });

  describe('stats tracking', () => {
    it('should track comprehensive stats', async () => {
      const conversations = [makeConversation(4)];

      const stats = await generator.generate(
        conversations,
        'You are DTE.',
        'EMBRYONIC'
      );

      expect(typeof stats.totalConversations).toBe('number');
      expect(typeof stats.totalExamples).toBe('number');
      expect(typeof stats.totalTokensEstimate).toBe('number');
      expect(typeof stats.uniqueConcepts).toBe('number');
      expect(typeof stats.avgTurnsPerConversation).toBe('number');
      expect(typeof stats.avgValence).toBe('number');
      expect(typeof stats.generatedAt).toBe('number');
      expect(stats.generatedAt).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const conversations = [makeConversation(4)];
      await generator.generate(conversations, 'You are DTE.', 'EMBRYONIC');

      expect(generator.getStats().totalConversations).toBeGreaterThan(0);

      generator.reset();

      const stats = generator.getStats();
      expect(stats.totalConversations).toBe(0);
      expect(stats.totalExamples).toBe(0);
      expect(stats.totalTokensEstimate).toBe(0);
    });
  });
});
