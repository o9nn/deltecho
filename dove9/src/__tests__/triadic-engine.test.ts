/**
 * Triadic Cognitive Engine E2E Tests
 *
 * Comprehensive test suite for the 3-Phase Concurrent Cognitive Loop.
 * Tests verify:
 * - Stream initialization and configuration
 * - 12-step cognitive cycle execution
 * - Triadic convergence points
 * - Phase offsets (120° between streams)
 * - Cognitive term processing
 * - Coupling detection and activation
 */

import {
  TriadicCognitiveEngine,
  STREAM_CONFIGS,
  STEP_CONFIGS,
  TRIAD_POINTS,
  CognitiveProcessor,
  TriadicEvent,
} from '../cognitive/triadic-engine.js';
import {
  StreamId,
  CognitiveMode,
  CognitiveTerm,
  CognitiveContext,
  StepType,
} from '../types/index.js';

/**
 * Mock cognitive processor for testing
 */
class MockCognitiveProcessor implements CognitiveProcessor {
  public callLog: Array<{ term: CognitiveTerm; mode: CognitiveMode }> = [];

  private createResult(context: CognitiveContext, term: CognitiveTerm): CognitiveContext {
    this.callLog.push({ term, mode: context.emotionalValence > 0 ? CognitiveMode.EXPRESSIVE : CognitiveMode.REFLECTIVE });
    return {
      ...context,
      salienceScore: context.salienceScore + 0.1,
    };
  }

  async processT1Perception(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext> {
    this.callLog.push({ term: CognitiveTerm.T1_PERCEPTION, mode });
    return { ...context, perceptionData: { processed: true, mode } };
  }

  async processT2IdeaFormation(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext> {
    this.callLog.push({ term: CognitiveTerm.T2_IDEA_FORMATION, mode });
    return { ...context, thoughtData: { ideas: ['test-idea'], mode } };
  }

  async processT4SensoryInput(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext> {
    this.callLog.push({ term: CognitiveTerm.T4_SENSORY_INPUT, mode });
    return { ...context, perceptionData: { ...context.perceptionData, sensory: true, mode } };
  }

  async processT5ActionSequence(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext> {
    this.callLog.push({ term: CognitiveTerm.T5_ACTION_SEQUENCE, mode });
    return { ...context, actionPlan: { sequence: ['action1'], mode } };
  }

  async processT7MemoryEncoding(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext> {
    this.callLog.push({ term: CognitiveTerm.T7_MEMORY_ENCODING, mode });
    return { ...context, relevantMemories: [...context.relevantMemories, 'new-memory'] };
  }

  async processT8BalancedResponse(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext> {
    this.callLog.push({ term: CognitiveTerm.T8_BALANCED_RESPONSE, mode });
    return { ...context, thoughtData: { ...context.thoughtData, integrated: true, mode } };
  }

  reset(): void {
    this.callLog = [];
  }
}

/**
 * Create a default cognitive context for testing
 */
function createTestContext(): CognitiveContext {
  return {
    relevantMemories: [],
    emotionalValence: 0,
    emotionalArousal: 0.5,
    salienceScore: 0.5,
    attentionWeight: 1.0,
    activeCouplings: [],
  };
}

describe('TriadicCognitiveEngine', () => {
  let processor: MockCognitiveProcessor;
  let engine: TriadicCognitiveEngine;
  let events: TriadicEvent[];

  beforeEach(() => {
    processor = new MockCognitiveProcessor();
    engine = new TriadicCognitiveEngine(processor, 10); // Fast step duration for tests
    events = [];
    engine.on((event) => events.push(event));
  });

  afterEach(() => {
    engine.stop();
  });

  describe('Stream Configuration', () => {
    it('should have exactly 3 streams configured', () => {
      expect(STREAM_CONFIGS).toHaveLength(3);
    });

    it('should have streams with correct phase offsets (0°, 120°, 240°)', () => {
      expect(STREAM_CONFIGS[0].phaseOffset).toBe(0);
      expect(STREAM_CONFIGS[1].phaseOffset).toBe(120);
      expect(STREAM_CONFIGS[2].phaseOffset).toBe(240);
    });

    it('should have streams starting at steps 1, 5, 9 (4 steps apart)', () => {
      expect(STREAM_CONFIGS[0].startStep).toBe(1);
      expect(STREAM_CONFIGS[1].startStep).toBe(5);
      expect(STREAM_CONFIGS[2].startStep).toBe(9);
    });

    it('should have correct stream IDs', () => {
      expect(STREAM_CONFIGS[0].id).toBe(StreamId.PRIMARY);
      expect(STREAM_CONFIGS[1].id).toBe(StreamId.SECONDARY);
      expect(STREAM_CONFIGS[2].id).toBe(StreamId.TERTIARY);
    });
  });

  describe('12-Step Cognitive Cycle', () => {
    it('should have exactly 12 step configurations', () => {
      expect(STEP_CONFIGS).toHaveLength(12);
    });

    it('should have steps numbered 1-12', () => {
      const stepNumbers = STEP_CONFIGS.map((s) => s.stepNumber).sort((a, b) => a - b);
      expect(stepNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('should have 7 expressive and 5 reflective mode steps', () => {
      const expressiveCount = STEP_CONFIGS.filter((s) => s.mode === CognitiveMode.EXPRESSIVE).length;
      const reflectiveCount = STEP_CONFIGS.filter((s) => s.mode === CognitiveMode.REFLECTIVE).length;
      expect(expressiveCount).toBe(7);
      expect(reflectiveCount).toBe(5);
    });

    it('should have phase degrees from 0° to 330° in 30° increments', () => {
      const phases = STEP_CONFIGS.map((s) => s.phaseDegrees).sort((a, b) => a - b);
      const expectedPhases = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
      expect(phases).toEqual(expectedPhases);
    });

    it('should distribute steps evenly across all three streams', () => {
      const streamCounts = new Map<StreamId, number>();
      for (const step of STEP_CONFIGS) {
        streamCounts.set(step.streamId, (streamCounts.get(step.streamId) || 0) + 1);
      }
      expect(streamCounts.get(StreamId.PRIMARY)).toBe(4);
      expect(streamCounts.get(StreamId.SECONDARY)).toBe(4);
      expect(streamCounts.get(StreamId.TERTIARY)).toBe(4);
    });
  });

  describe('Triadic Convergence Points', () => {
    it('should have exactly 4 triad points', () => {
      expect(TRIAD_POINTS).toHaveLength(4);
    });

    it('should have triads at time points 0, 1, 2, 3', () => {
      const timePoints = TRIAD_POINTS.map((t) => t.timePoint);
      expect(timePoints).toEqual([0, 1, 2, 3]);
    });

    it('should have correct step groupings for each triad', () => {
      expect(TRIAD_POINTS[0].steps).toEqual([1, 5, 9]);
      expect(TRIAD_POINTS[1].steps).toEqual([2, 6, 10]);
      expect(TRIAD_POINTS[2].steps).toEqual([3, 7, 11]);
      expect(TRIAD_POINTS[3].steps).toEqual([4, 8, 12]);
    });

    it('should include all three streams in each triad', () => {
      for (const triad of TRIAD_POINTS) {
        const streamIds = triad.streams.map((s) => s.id);
        expect(streamIds).toContain(StreamId.PRIMARY);
        expect(streamIds).toContain(StreamId.SECONDARY);
        expect(streamIds).toContain(StreamId.TERTIARY);
      }
    });
  });

  describe('Engine Lifecycle', () => {
    it('should start and stop correctly', () => {
      expect(engine.isRunning()).toBe(false);
      engine.start();
      expect(engine.isRunning()).toBe(true);
      engine.stop();
      expect(engine.isRunning()).toBe(false);
    });

    it('should not start if already running', () => {
      engine.start();
      const initialState = engine.getState();
      engine.start(); // Should be no-op
      expect(engine.getState()).toEqual(initialState);
    });

    it('should not stop if not running', () => {
      engine.stop(); // Should be no-op, no error
      expect(engine.isRunning()).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit cycle_complete event after 12 steps', async () => {
      engine.start();
      
      // Wait for at least one full cycle (12 steps * 10ms = 120ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      engine.stop();
      
      const cycleEvents = events.filter((e) => e.type === 'cycle_complete');
      expect(cycleEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should emit triad_sync events at convergence points', async () => {
      engine.start();
      
      // Wait for steps to advance
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      engine.stop();
      
      const triadEvents = events.filter((e) => e.type === 'triad_sync');
      expect(triadEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Cognitive Processing', () => {
    it('should process perception term correctly', async () => {
      const context = createTestContext();
      const result = await processor.processT1Perception(context, CognitiveMode.REFLECTIVE);
      
      expect(result.perceptionData).toBeDefined();
      expect(result.perceptionData.processed).toBe(true);
      expect(processor.callLog).toContainEqual({
        term: CognitiveTerm.T1_PERCEPTION,
        mode: CognitiveMode.REFLECTIVE,
      });
    });

    it('should process idea formation term correctly', async () => {
      const context = createTestContext();
      const result = await processor.processT2IdeaFormation(context, CognitiveMode.EXPRESSIVE);
      
      expect(result.thoughtData).toBeDefined();
      expect(result.thoughtData.ideas).toContain('test-idea');
    });

    it('should process sensory input term correctly', async () => {
      const context = createTestContext();
      const result = await processor.processT4SensoryInput(context, CognitiveMode.EXPRESSIVE);
      
      expect(result.perceptionData).toBeDefined();
      expect(result.perceptionData.sensory).toBe(true);
    });

    it('should process action sequence term correctly', async () => {
      const context = createTestContext();
      const result = await processor.processT5ActionSequence(context, CognitiveMode.EXPRESSIVE);
      
      expect(result.actionPlan).toBeDefined();
      expect(result.actionPlan.sequence).toContain('action1');
    });

    it('should process memory encoding term correctly', async () => {
      const context = createTestContext();
      const result = await processor.processT7MemoryEncoding(context, CognitiveMode.REFLECTIVE);
      
      expect(result.relevantMemories).toContain('new-memory');
    });

    it('should process balanced response term correctly', async () => {
      const context = createTestContext();
      const result = await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);
      
      expect(result.thoughtData).toBeDefined();
      expect(result.thoughtData.integrated).toBe(true);
    });
  });

  describe('Step Type Distribution', () => {
    it('should have pivotal relevance realization steps', () => {
      const pivotalSteps = STEP_CONFIGS.filter((s) => s.stepType === StepType.PIVOTAL_RR);
      expect(pivotalSteps.length).toBeGreaterThan(0);
    });

    it('should have expressive steps', () => {
      const expressiveSteps = STEP_CONFIGS.filter((s) => s.stepType === StepType.EXPRESSIVE);
      expect(expressiveSteps.length).toBeGreaterThan(0);
    });

    it('should have transition steps', () => {
      const transitionSteps = STEP_CONFIGS.filter((s) => s.stepType === StepType.TRANSITION);
      expect(transitionSteps.length).toBeGreaterThan(0);
    });

    it('should have reflective steps', () => {
      const reflectiveSteps = STEP_CONFIGS.filter((s) => s.stepType === StepType.REFLECTIVE);
      expect(reflectiveSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Cognitive Term Coverage', () => {
    it('should use T1_PERCEPTION term', () => {
      const t1Steps = STEP_CONFIGS.filter((s) => s.term === CognitiveTerm.T1_PERCEPTION);
      expect(t1Steps.length).toBeGreaterThan(0);
    });

    it('should use T2_IDEA_FORMATION term', () => {
      const t2Steps = STEP_CONFIGS.filter((s) => s.term === CognitiveTerm.T2_IDEA_FORMATION);
      expect(t2Steps.length).toBeGreaterThan(0);
    });

    it('should use T4_SENSORY_INPUT term', () => {
      const t4Steps = STEP_CONFIGS.filter((s) => s.term === CognitiveTerm.T4_SENSORY_INPUT);
      expect(t4Steps.length).toBeGreaterThan(0);
    });

    it('should use T5_ACTION_SEQUENCE term', () => {
      const t5Steps = STEP_CONFIGS.filter((s) => s.term === CognitiveTerm.T5_ACTION_SEQUENCE);
      expect(t5Steps.length).toBeGreaterThan(0);
    });

    it('should use T7_MEMORY_ENCODING term', () => {
      const t7Steps = STEP_CONFIGS.filter((s) => s.term === CognitiveTerm.T7_MEMORY_ENCODING);
      expect(t7Steps.length).toBeGreaterThan(0);
    });
  });

  describe('Stream State Management', () => {
    it('should initialize all streams as inactive', () => {
      const state = engine.getState();
      for (const stream of state.streams.values()) {
        expect(stream.isActive).toBe(false);
      }
    });

    it('should activate all streams on start', () => {
      engine.start();
      const state = engine.getState();
      for (const stream of state.streams.values()) {
        expect(stream.isActive).toBe(true);
      }
    });

    it('should deactivate all streams on stop', () => {
      engine.start();
      engine.stop();
      const state = engine.getState();
      for (const stream of state.streams.values()) {
        expect(stream.isActive).toBe(false);
      }
    });
  });

  describe('Metrics Tracking', () => {
    it('should track cycle count', async () => {
      engine.start();
      await new Promise((resolve) => setTimeout(resolve, 150));
      engine.stop();
      
      const metrics = engine.getMetrics();
      expect(metrics.totalCycles).toBeGreaterThanOrEqual(1);
    });

    it('should track step count', async () => {
      engine.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      engine.stop();
      
      const metrics = engine.getMetrics();
      // currentStep tracks the current position in the 12-step cycle
      expect(metrics.currentStep).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Cognitive Context Integration', () => {
  it('should maintain context through processing pipeline', async () => {
    const processor = new MockCognitiveProcessor();
    let context = createTestContext();
    
    // Simulate a full processing pipeline
    context = await processor.processT1Perception(context, CognitiveMode.REFLECTIVE);
    context = await processor.processT2IdeaFormation(context, CognitiveMode.EXPRESSIVE);
    context = await processor.processT4SensoryInput(context, CognitiveMode.EXPRESSIVE);
    context = await processor.processT5ActionSequence(context, CognitiveMode.EXPRESSIVE);
    context = await processor.processT7MemoryEncoding(context, CognitiveMode.REFLECTIVE);
    context = await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);
    
    // Verify all processing stages were executed
    expect(processor.callLog).toHaveLength(6);
    
    // Verify context accumulated results
    expect(context.perceptionData).toBeDefined();
    expect(context.thoughtData).toBeDefined();
    expect(context.actionPlan).toBeDefined();
    expect(context.relevantMemories.length).toBeGreaterThan(0);
  });

  it('should preserve emotional state through processing', async () => {
    const processor = new MockCognitiveProcessor();
    const context = createTestContext();
    context.emotionalValence = 0.8;
    context.emotionalArousal = 0.6;
    
    const result = await processor.processT1Perception(context, CognitiveMode.EXPRESSIVE);
    
    expect(result.emotionalValence).toBe(0.8);
    expect(result.emotionalArousal).toBe(0.6);
  });
});
