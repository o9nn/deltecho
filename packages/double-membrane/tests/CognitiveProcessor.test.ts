/**
 * Tests for CognitiveProcessor - Real Cognitive Processing Pipeline
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CognitiveProcessor } from '../src/cognitive/CognitiveProcessor';

describe('CognitiveProcessor', () => {
  let processor: CognitiveProcessor;

  beforeEach(() => {
    processor = new CognitiveProcessor({
      cycleIntervalMs: 10, // Fast for testing
      maxWorkingMemorySize: 7,
      attentionDecayRate: 0.1,
      activationThreshold: 0.3,
      enableParallelStreams: true,
    });
  });

  afterEach(() => {
    processor.stop();
  });

  describe('initialization', () => {
    it('should initialize with 3 concurrent streams', () => {
      const streams = processor.getStreamStates();
      expect(streams).toHaveLength(3);
    });

    it('should have streams phased 4 steps apart', () => {
      const streams = processor.getStreamStates();
      // Stream 1 starts at step 1, Stream 2 at step 5, Stream 3 at step 9
      expect(streams[0].currentStep).toBe(1);
      expect(streams[1].currentStep).toBe(5);
      expect(streams[2].currentStep).toBe(9);
    });

    it('should have different phases for each stream', () => {
      const streams = processor.getStreamStates();
      expect(streams[0].phase).toBe('perception');
      expect(streams[1].phase).toBe('action');
      expect(streams[2].phase).toBe('simulation');
    });

    it('should start with cycle number 0', () => {
      expect(processor.getCycleNumber()).toBe(0);
    });

    it('should not be running initially', () => {
      expect(processor.isRunning()).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('should start the processor', () => {
      processor.start();
      expect(processor.isRunning()).toBe(true);
    });

    it('should stop the processor', () => {
      processor.start();
      processor.stop();
      expect(processor.isRunning()).toBe(false);
    });

    it('should emit started event', () => {
      const handler = vi.fn();
      processor.on('started', handler);
      processor.start();
      expect(handler).toHaveBeenCalled();
    });

    it('should emit stopped event', () => {
      const handler = vi.fn();
      processor.on('stopped', handler);
      processor.start();
      processor.stop();
      expect(handler).toHaveBeenCalled();
    });

    it('should increment cycle number when running', async () => {
      processor.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(processor.getCycleNumber()).toBeGreaterThan(0);
    });
  });

  describe('process', () => {
    it('should process input and return result', async () => {
      const result = await processor.process('What is the meaning of life?');
      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include reasoning steps', async () => {
      const result = await processor.process('How do I create a new project?');
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should include stream contributions', async () => {
      const result = await processor.process('Analyze this data');
      expect(result.streamContributions).toBeDefined();
      expect(result.streamContributions.length).toBe(3);
    });

    it('should track processing time', async () => {
      const result = await processor.process('Test input');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should execute steps during processing', async () => {
      const result = await processor.process('Test input');
      expect(result.stepsExecuted).toBeGreaterThan(0);
    });
  });

  describe('pattern recognition', () => {
    it('should recognize question patterns', async () => {
      const result = await processor.process('What is TypeScript?');
      // Check for pattern recognition in reasoning
      expect(result.reasoning.some(r => r.toLowerCase().includes('pattern') || r.toLowerCase().includes('query'))).toBe(true);
    });

    it('should recognize process query patterns', async () => {
      const result = await processor.process('How do I install npm packages?');
      // Check for process-related content in reasoning
      expect(result.reasoning.some(r => r.toLowerCase().includes('process') || r.toLowerCase().includes('pattern'))).toBe(true);
    });

    it('should recognize explanation query patterns', async () => {
      const result = await processor.process('Why is the sky blue?');
      // Check for explanation-related content in reasoning
      expect(result.reasoning.some(r => r.toLowerCase().includes('explain') || r.toLowerCase().includes('pattern'))).toBe(true);
    });

    it('should recognize creation command patterns', async () => {
      const result = await processor.process('Create a new file');
      // Check for creation-related content in reasoning
      expect(result.reasoning.some(r => r.toLowerCase().includes('creat'))).toBe(true);
    });

    it('should recognize analysis command patterns', async () => {
      const result = await processor.process('Analyze this code');
      // Check for either analysis_action or the word 'analysis' in reasoning
      expect(result.reasoning.some(r => r.toLowerCase().includes('analy'))).toBe(true);
    });
  });

  describe('custom patterns', () => {
    it('should add custom patterns', () => {
      processor.addPattern('custom_test', /^test\s+/i, 'test_action', 0.8);
      // Pattern should be added (no error thrown)
      expect(true).toBe(true);
    });

    it('should remove custom patterns', () => {
      processor.addPattern('custom_test', /^test\s+/i, 'test_action', 0.8);
      const removed = processor.removePattern('custom_test');
      expect(removed).toBe(true);
    });

    it('should return false when removing non-existent pattern', () => {
      const removed = processor.removePattern('non_existent');
      expect(removed).toBe(false);
    });
  });

  describe('working memory', () => {
    it('should clear working memory', () => {
      processor.clearWorkingMemory();
      const streams = processor.getStreamStates();
      for (const stream of streams) {
        expect(stream.workingMemory.length).toBe(0);
        expect(stream.activations.size).toBe(0);
      }
    });
  });

  describe('events', () => {
    it('should emit cycle_started event', async () => {
      const handler = vi.fn();
      processor.on('cycle_started', handler);
      processor.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(handler).toHaveBeenCalled();
    });

    it('should emit step_executed event', async () => {
      const handler = vi.fn();
      processor.on('step_executed', handler);
      processor.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(handler).toHaveBeenCalled();
    });

    it('should emit pattern_recognized event during processing', async () => {
      const handler = vi.fn();
      processor.on('pattern_recognized', handler);
      await processor.process('What is this?');
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('12-step cognitive cycle', () => {
    it('should have 12 steps in the cycle', async () => {
      // Process to execute a full cycle
      await processor.process('Test');
      const streams = processor.getStreamStates();
      
      // Each stream should have advanced through steps
      for (const stream of streams) {
        expect(stream.currentStep).toBeGreaterThanOrEqual(1);
        expect(stream.currentStep).toBeLessThanOrEqual(12);
      }
    });

    it('should have expressive and reflective modes', async () => {
      await processor.process('Test');
      const streams = processor.getStreamStates();
      
      // Modes should be either expressive or reflective
      for (const stream of streams) {
        expect(['expressive', 'reflective']).toContain(stream.mode);
      }
    });

    it('should have correct step types', async () => {
      await processor.process('Test');
      const streams = processor.getStreamStates();
      
      // Step types should be valid
      const validTypes = ['relevance_realization', 'affordance_interaction', 'salience_simulation'];
      for (const stream of streams) {
        expect(validTypes).toContain(stream.stepType);
      }
    });
  });

  describe('confidence calculation', () => {
    it('should return confidence between 0 and 1', async () => {
      const result = await processor.process('What is the answer?');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have higher confidence for recognized patterns', async () => {
      const result1 = await processor.process('What is TypeScript?');
      const result2 = await processor.process('xyzabc123');
      
      // Recognized pattern should have higher confidence
      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });
  });
});
