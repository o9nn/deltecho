/**
 * Deep Tree Echo Processor Tests
 *
 * Comprehensive test suite for the DeepTreeEchoProcessor class,
 * covering all T-step processing methods and cognitive operations.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  DeepTreeEchoProcessor,
  DeepTreeEchoProcessorConfig,
  LLMServiceInterface,
  MemoryStoreInterface,
  PersonaCoreInterface,
} from '../deep-tree-echo-processor.js';
import { CognitiveContext, CognitiveMode, CouplingType } from '../../types/index.js';

// Mock implementations
const createMockLLMService = (): LLMServiceInterface => ({
  generateResponse: jest.fn<() => Promise<string>>().mockResolvedValue('Generated response'),
  generateParallelResponse: jest.fn<() => Promise<any>>().mockResolvedValue({
    integratedResponse: 'Integrated response',
    cognitiveResponse: 'Cognitive stream',
    affectiveResponse: 'Affective stream',
    relevanceResponse: 'Relevance stream',
  }),
});

const createMockMemoryStore = (): MemoryStoreInterface => ({
  storeMemory: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  retrieveRecentMemories: jest.fn<() => string[]>().mockReturnValue(['Memory 1', 'Memory 2']),
  retrieveRelevantMemories: jest
    .fn<() => Promise<string[]>>()
    .mockResolvedValue(['Relevant 1', 'Relevant 2']),
});

const createMockPersonaCore = (): PersonaCoreInterface => ({
  getPersonality: jest.fn<() => string>().mockReturnValue('Friendly and helpful AI assistant'),
  getDominantEmotion: jest
    .fn<() => { emotion: string; intensity: number }>()
    .mockReturnValue({ emotion: 'interest', intensity: 0.6 }),
  updateEmotionalState: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
});

const createDefaultContext = (): CognitiveContext => ({
  salienceScore: 0.5,
  attentionWeight: 0.7,
  emotionalValence: 0.3,
  emotionalArousal: 0.4,
  activeCouplings: [],
  relevantMemories: [],
  perceptionData: {},
  thoughtData: {},
  actionPlan: {},
});

describe('DeepTreeEchoProcessor', () => {
  let processor: DeepTreeEchoProcessor;
  let mockLLM: LLMServiceInterface;
  let mockMemory: MemoryStoreInterface;
  let mockPersona: PersonaCoreInterface;

  beforeEach(() => {
    mockLLM = createMockLLMService();
    mockMemory = createMockMemoryStore();
    mockPersona = createMockPersonaCore();
    processor = new DeepTreeEchoProcessor(mockLLM, mockMemory, mockPersona);
  });

  describe('constructor', () => {
    it('should create processor with default config', () => {
      expect(processor).toBeDefined();
    });

    it('should create processor with custom config', () => {
      const customConfig: Partial<DeepTreeEchoProcessorConfig> = {
        enableParallelCognition: false,
        memoryRetrievalCount: 20,
        salienceThreshold: 0.5,
      };
      const customProcessor = new DeepTreeEchoProcessor(
        mockLLM,
        mockMemory,
        mockPersona,
        customConfig
      );
      expect(customProcessor).toBeDefined();
    });
  });

  describe('processT1Perception', () => {
    it('should process reflective perception', async () => {
      const context = createDefaultContext();
      const result = await processor.processT1Perception(context, CognitiveMode.REFLECTIVE);

      expect(result.perceptionData).toBeDefined();
      expect(result.perceptionData.mode).toBe('reflective');
      expect(result.perceptionData.emotionalState).toBeDefined();
      expect(result.perceptionData.cognitiveLoad).toBeDefined();
      expect(result.perceptionData.hasCapacity).toBeDefined();
      expect(mockPersona.getDominantEmotion).toHaveBeenCalled();
    });

    it('should process expressive perception', async () => {
      const context = createDefaultContext();
      const result = await processor.processT1Perception(context, CognitiveMode.EXPRESSIVE);

      expect(result.perceptionData).toBeDefined();
      expect(result.perceptionData.mode).toBe('expressive');
      expect(result.perceptionData.activePerception).toBe(true);
      expect(result.salienceScore).toBeGreaterThan(context.salienceScore);
    });

    it('should calculate cognitive load correctly', async () => {
      const context = createDefaultContext();
      context.salienceScore = 0.9;
      context.attentionWeight = 0.9;

      const result = await processor.processT1Perception(context, CognitiveMode.REFLECTIVE);

      expect(result.perceptionData.cognitiveLoad).toBeCloseTo(0.81, 2);
      expect(result.perceptionData.hasCapacity).toBe(false);
    });

    it('should update emotional arousal based on load', async () => {
      const context = createDefaultContext();
      context.salienceScore = 0.5;
      context.attentionWeight = 0.5;

      const result = await processor.processT1Perception(context, CognitiveMode.REFLECTIVE);

      expect(result.emotionalArousal).toBeGreaterThan(0);
      expect(result.emotionalArousal).toBeLessThanOrEqual(1);
    });
  });

  describe('processT2IdeaFormation', () => {
    it('should generate ideas in expressive mode with parallel cognition', async () => {
      const context = createDefaultContext();
      const result = await processor.processT2IdeaFormation(context, CognitiveMode.EXPRESSIVE);

      expect(result.thoughtData).toBeDefined();
      expect(result.thoughtData.mode).toBe('expressive');
      expect(result.thoughtData.integrated).toBe('Integrated response');
      expect(result.thoughtData.cognitive).toBe('Cognitive stream');
      expect(result.thoughtData.affective).toBe('Affective stream');
      expect(result.thoughtData.relevance).toBe('Relevance stream');
      expect(mockLLM.generateParallelResponse).toHaveBeenCalled();
      expect(mockMemory.retrieveRecentMemories).toHaveBeenCalled();
    });

    it('should generate ideas in expressive mode without parallel cognition', async () => {
      const customProcessor = new DeepTreeEchoProcessor(mockLLM, mockMemory, mockPersona, {
        enableParallelCognition: false,
      });

      const context = createDefaultContext();
      const result = await customProcessor.processT2IdeaFormation(
        context,
        CognitiveMode.EXPRESSIVE
      );

      expect(result.thoughtData).toBeDefined();
      expect(result.thoughtData.mode).toBe('expressive');
      expect(result.thoughtData.response).toBe('Generated response');
      expect(mockLLM.generateResponse).toHaveBeenCalled();
    });

    it('should simulate ideas in reflective mode', async () => {
      const context = createDefaultContext();
      context.thoughtData = { existing: 'data' };

      const result = await processor.processT2IdeaFormation(context, CognitiveMode.REFLECTIVE);

      expect(result.thoughtData.mode).toBe('reflective');
      expect(result.thoughtData.simulating).toBe(true);
      expect(result.thoughtData.existing).toBe('data');
    });

    it('should activate Assessment-Planning coupling in expressive mode', async () => {
      const context = createDefaultContext();
      const result = await processor.processT2IdeaFormation(context, CognitiveMode.EXPRESSIVE);

      expect(result.activeCouplings).toContain(CouplingType.ASSESSMENT_PLANNING);
    });

    it('should not duplicate coupling if already active', async () => {
      const context = createDefaultContext();
      context.activeCouplings = [CouplingType.ASSESSMENT_PLANNING];

      const result = await processor.processT2IdeaFormation(context, CognitiveMode.EXPRESSIVE);

      const couplingCount = result.activeCouplings.filter(
        (c) => c === CouplingType.ASSESSMENT_PLANNING
      ).length;
      expect(couplingCount).toBe(1);
    });
  });

  describe('processT4SensoryInput', () => {
    it('should process sensory input in expressive mode', async () => {
      const context = createDefaultContext();
      context.perceptionData = { existing: 'perception' };
      context.thoughtData = { existing: 'thought' };

      const result = await processor.processT4SensoryInput(context, CognitiveMode.EXPRESSIVE);

      expect(result.perceptionData.sensoryProcessed).toBe(true);
      expect(result.perceptionData.inputTime).toBeDefined();
      expect(result.activeCouplings).toContain(CouplingType.PERCEPTION_MEMORY);
    });

    it('should store current perception in expressive mode', async () => {
      const context = createDefaultContext();
      await processor.processT4SensoryInput(context, CognitiveMode.EXPRESSIVE);

      const currentPerception = processor.getCurrentPerception();
      expect(currentPerception).toBeDefined();
      expect(currentPerception.timestamp).toBeDefined();
    });

    it('should process internal sensing in reflective mode', async () => {
      const context = createDefaultContext();
      const result = await processor.processT4SensoryInput(context, CognitiveMode.REFLECTIVE);

      expect(result.perceptionData.internalSensing).toBe(true);
    });
  });

  describe('processT5ActionSequence', () => {
    it('should execute action plan in expressive mode', async () => {
      const context = createDefaultContext();
      context.actionPlan = { action: 'test', priority: 1 };

      const result = await processor.processT5ActionSequence(context, CognitiveMode.EXPRESSIVE);

      expect(result.actionPlan.executed).toBe(true);
      expect(result.actionPlan.executionTime).toBeDefined();
    });

    it('should add to pending actions in expressive mode', async () => {
      const context = createDefaultContext();
      context.actionPlan = { action: 'test' };

      await processor.processT5ActionSequence(context, CognitiveMode.EXPRESSIVE);

      const pendingActions = processor.getPendingActions();
      expect(pendingActions.length).toBe(1);
      expect(pendingActions[0].plan.action).toBe('test');
    });

    it('should prepare action in reflective mode', async () => {
      const context = createDefaultContext();
      context.actionPlan = { action: 'test' };

      const result = await processor.processT5ActionSequence(context, CognitiveMode.REFLECTIVE);

      expect(result.actionPlan.prepared).toBe(true);
    });

    it('should handle missing action plan gracefully', async () => {
      const context = createDefaultContext();
      context.actionPlan = undefined;

      const result = await processor.processT5ActionSequence(context, CognitiveMode.EXPRESSIVE);

      expect(result).toBeDefined();
      expect(processor.getPendingActions().length).toBe(0);
    });
  });

  describe('processT7MemoryEncoding', () => {
    it('should retrieve relevant memories in reflective mode', async () => {
      const context = createDefaultContext();
      const result = await processor.processT7MemoryEncoding(context, CognitiveMode.REFLECTIVE);

      expect(mockMemory.retrieveRelevantMemories).toHaveBeenCalled();
      expect(result.relevantMemories).toContain('Relevant 1');
      expect(result.relevantMemories).toContain('Relevant 2');
    });

    it('should activate Perception-Memory coupling when sensory processed', async () => {
      const context = createDefaultContext();
      context.perceptionData = { sensoryProcessed: true };

      const result = await processor.processT7MemoryEncoding(context, CognitiveMode.REFLECTIVE);

      expect(result.activeCouplings).toContain(CouplingType.PERCEPTION_MEMORY);
    });

    it('should store memory in expressive mode with integrated response', async () => {
      const context = createDefaultContext();
      context.thoughtData = { integrated: 'Test integrated response' };

      await processor.processT7MemoryEncoding(context, CognitiveMode.EXPRESSIVE);

      expect(mockMemory.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test integrated response',
          sender: 'system',
        })
      );
    });

    it('should store memory in expressive mode with simple response', async () => {
      const context = createDefaultContext();
      context.thoughtData = { response: 'Test simple response' };

      await processor.processT7MemoryEncoding(context, CognitiveMode.EXPRESSIVE);

      expect(mockMemory.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test simple response',
        })
      );
    });

    it('should deduplicate memories', async () => {
      const context = createDefaultContext();
      context.relevantMemories = ['Relevant 1'];

      const result = await processor.processT7MemoryEncoding(context, CognitiveMode.REFLECTIVE);

      const relevantCount = result.relevantMemories.filter((m) => m === 'Relevant 1').length;
      expect(relevantCount).toBe(1);
    });
  });

  describe('processT8BalancedResponse', () => {
    it('should generate balanced response in expressive mode', async () => {
      const context = createDefaultContext();
      context.perceptionData = { test: 'perception' };
      context.relevantMemories = ['memory'];
      context.thoughtData = { test: 'thought' };
      context.actionPlan = { test: 'action' };

      const result = await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);

      expect(result.perceptionData.perception).toBeDefined();
      expect(result.perceptionData.memories).toBeDefined();
      expect(result.perceptionData.thoughts).toBeDefined();
      expect(result.perceptionData.actions).toBeDefined();
      expect(result.perceptionData.emotional).toBeDefined();
      expect(result.perceptionData.timestamp).toBeDefined();
    });

    it('should update emotional state in expressive mode', async () => {
      const context = createDefaultContext();
      await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);

      expect(mockPersona.updateEmotionalState).toHaveBeenCalled();
    });

    it('should activate Balanced Integration coupling', async () => {
      const context = createDefaultContext();
      const result = await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);

      expect(result.activeCouplings).toContain(CouplingType.BALANCED_INTEGRATION);
    });

    it('should clear pending actions after integration', async () => {
      const context = createDefaultContext();
      context.actionPlan = { test: 'action' };

      // First add some pending actions
      await processor.processT5ActionSequence(context, CognitiveMode.EXPRESSIVE);
      expect(processor.getPendingActions().length).toBeGreaterThan(0);

      // Then process balanced response
      await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);
      expect(processor.getPendingActions().length).toBe(0);
    });

    it('should update attention weight', async () => {
      const context = createDefaultContext();
      const originalAttention = context.attentionWeight;

      const result = await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);

      expect(result.attentionWeight).toBeDefined();
      expect(result.attentionWeight).not.toBe(originalAttention);
    });

    it('should prepare for balanced response in reflective mode', async () => {
      const context = createDefaultContext();
      const result = await processor.processT8BalancedResponse(context, CognitiveMode.REFLECTIVE);

      expect(result.perceptionData.balancePrepared).toBe(true);
    });
  });

  describe('emotional delta calculation', () => {
    it('should increase interest based on salience', async () => {
      const context = createDefaultContext();
      context.salienceScore = 0.8;

      await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);

      expect(mockPersona.updateEmotionalState).toHaveBeenCalledWith(
        expect.objectContaining({
          interest: expect.any(Number),
        })
      );
    });

    it('should increase joy for positive valence', async () => {
      const context = createDefaultContext();
      context.emotionalValence = 0.5;

      await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);

      expect(mockPersona.updateEmotionalState).toHaveBeenCalledWith(
        expect.objectContaining({
          joy: expect.any(Number),
        })
      );
    });

    it('should increase sadness for negative valence', async () => {
      const context = createDefaultContext();
      context.emotionalValence = -0.5;

      await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);

      expect(mockPersona.updateEmotionalState).toHaveBeenCalledWith(
        expect.objectContaining({
          sadness: expect.any(Number),
        })
      );
    });
  });

  describe('state management', () => {
    it('should clear state', async () => {
      const context = createDefaultContext();
      context.actionPlan = { test: 'action' };

      await processor.processT4SensoryInput(context, CognitiveMode.EXPRESSIVE);
      await processor.processT5ActionSequence(context, CognitiveMode.EXPRESSIVE);

      expect(processor.getCurrentPerception()).toBeDefined();
      expect(processor.getPendingActions().length).toBeGreaterThan(0);

      processor.clearState();

      expect(processor.getCurrentPerception()).toBeUndefined();
      expect(processor.getPendingActions().length).toBe(0);
    });

    it('should return copy of pending actions', async () => {
      const context = createDefaultContext();
      context.actionPlan = { test: 'action' };

      await processor.processT5ActionSequence(context, CognitiveMode.EXPRESSIVE);

      const actions1 = processor.getPendingActions();
      const actions2 = processor.getPendingActions();

      expect(actions1).not.toBe(actions2);
      expect(actions1).toEqual(actions2);
    });
  });

  describe('full cognitive cycle', () => {
    it('should process complete cognitive cycle', async () => {
      let context = createDefaultContext();

      // T1: Perception
      context = await processor.processT1Perception(context, CognitiveMode.REFLECTIVE);
      expect(context.perceptionData.mode).toBe('reflective');

      // T2: Idea Formation
      context = await processor.processT2IdeaFormation(context, CognitiveMode.EXPRESSIVE);
      expect(context.thoughtData.integrated).toBeDefined();

      // T4: Sensory Input
      context = await processor.processT4SensoryInput(context, CognitiveMode.EXPRESSIVE);
      expect(context.perceptionData.sensoryProcessed).toBe(true);

      // T5: Action Sequence
      context.actionPlan = { action: 'respond' };
      context = await processor.processT5ActionSequence(context, CognitiveMode.EXPRESSIVE);
      expect(context.actionPlan.executed).toBe(true);

      // T7: Memory Encoding
      context = await processor.processT7MemoryEncoding(context, CognitiveMode.REFLECTIVE);
      expect(context.relevantMemories.length).toBeGreaterThan(0);

      // T8: Balanced Response
      context = await processor.processT8BalancedResponse(context, CognitiveMode.EXPRESSIVE);
      expect(context.perceptionData.timestamp).toBeDefined();

      // Verify all couplings activated
      expect(context.activeCouplings).toContain(CouplingType.ASSESSMENT_PLANNING);
      expect(context.activeCouplings).toContain(CouplingType.PERCEPTION_MEMORY);
      expect(context.activeCouplings).toContain(CouplingType.BALANCED_INTEGRATION);
    });
  });
});
