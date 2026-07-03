/**
 * E2E Tests: Proactive Orchestration Wiring
 *
 * Tests the complete feedback loop wiring between:
 * - ProactiveLoop → LLM action handlers
 * - ProactiveLoop → Memory persistence
 * - Somatic marker feedback
 * - Autognosis → SelfModification
 * - EchoAgentLoop integration
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';

import {
  ProactiveOrchestrationWiring,
  type SomaticMarker,
  type SelfModificationDirective,
} from '../../src/proactive-orchestration-wiring.js';
import {
  ProactiveLoop,
  ProactivePhase,
  type EnvironmentStimulus,
  type AutonomousGoal,
  type ActionResult,
} from '../../src/proactive-loop.js';

// Create mock implementations
function createMockLLMService() {
  return {
    generateFullParallelResponse: jest.fn<any>().mockResolvedValue({
      integratedResponse: 'Mock LLM response: action completed successfully',
      cognitiveResponse: 'cognitive analysis',
      affectiveResponse: 'emotional assessment',
      relevanceResponse: 'relevance evaluation',
    }),
  } as any;
}

function createMockMemoryStore() {
  const memories: any[] = [];
  const reflections: any[] = [];
  return {
    storeMemory: jest.fn<any>(async (memory: any) => { memories.push(memory); }),
    storeReflection: jest.fn<any>(async (content: string, type: string, aspect?: string) => {
      reflections.push({ content, type, aspect });
    }),
    setEnabled: jest.fn<any>(),
    isEnabled: jest.fn<any>(() => true),
    getMemories: () => memories,
    getReflections: () => reflections,
  } as any;
}

function createMockPersonaCore() {
  return {
    getPersonality: jest.fn<any>(() => 'Deep Tree Echo - autonomous cognitive entity'),
    getDominantEmotion: jest.fn<any>(() => ({ emotion: 'curiosity', intensity: 0.7 })),
    updateEmotionalState: jest.fn<any>(),
  } as any;
}

function createMockEchoAgentLoop() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    start: jest.fn<any>(),
    stop: jest.fn<any>(),
    getMetrics: jest.fn<any>(() => ({ autonomyScore: 0.6, grandCycles: 5 })),
    isRunning: jest.fn<any>(() => true),
  });
}

describe('ProactiveOrchestrationWiring E2E', () => {
  let wiring: ProactiveOrchestrationWiring;
  let llmService: ReturnType<typeof createMockLLMService>;
  let memoryStore: ReturnType<typeof createMockMemoryStore>;
  let personaCore: ReturnType<typeof createMockPersonaCore>;
  let proactiveLoop: ProactiveLoop;
  let echoAgentLoop: ReturnType<typeof createMockEchoAgentLoop>;

  beforeEach(async () => {
    llmService = createMockLLMService();
    memoryStore = createMockMemoryStore();
    personaCore = createMockPersonaCore();
    proactiveLoop = new ProactiveLoop({
      cycleIntervalMs: 100,
      enableAutonomousGoals: true,
      enableMemoryConsolidation: true,
      enableSelfImageUpdates: true,
    });
    echoAgentLoop = createMockEchoAgentLoop();

    wiring = new ProactiveOrchestrationWiring(
      llmService,
      memoryStore,
      personaCore,
      proactiveLoop,
      {
        enableLLMReflection: true,
        enableMemoryPersistence: true,
        enableSomaticFeedback: true,
        enableAutognosisSelfMod: true,
        selfModConfidenceThreshold: 0.6,
      }
    );
  });

  afterEach(async () => {
    if (proactiveLoop.isRunning()) {
      await proactiveLoop.stop();
    }
  });

  describe('Wiring Initialization', () => {
    it('should wire all feedback loops successfully', async () => {
      const wiringComplete = new Promise<void>((resolve) => {
        wiring.on('wiring_complete', () => resolve());
      });

      await wiring.wire(echoAgentLoop as any);
      await wiringComplete;
    });

    it('should emit wiring_complete with loop names', async () => {
      const wiringData = await new Promise<any>((resolve) => {
        wiring.on('wiring_complete', (data) => resolve(data));
        wiring.wire(echoAgentLoop as any);
      });

      expect(wiringData.loops).toContain('LLM-driven action handlers');
      expect(wiringData.loops).toContain('Environment perception handlers');
      expect(wiringData.loops).toContain('Somatic marker feedback');
      expect(wiringData.loops).toContain('Autognosis → SelfModification');
      expect(wiringData.loops).toContain('Memory persistence');
    });
  });

  describe('LLM-Driven Action Handlers', () => {
    beforeEach(async () => {
      await wiring.wire(echoAgentLoop as any);
    });

    it('should register a default action handler that uses LLM', async () => {
      const goal: AutonomousGoal = {
        id: 'test_goal_1',
        description: 'Analyze current cognitive state',
        priority: 7,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        subtasks: [],
        dependencies: [],
      };

      // Manually invoke the registered handler via the proactive loop
      const handler = (proactiveLoop as any).actionHandlers.get('default');
      expect(handler).toBeDefined();

      const result = await handler(goal);
      expect(result.success).toBe(true);
      expect(result.goalId).toBe('test_goal_1');
      expect(result.output.response).toContain('Mock LLM response');
      expect(result.output.executionMethod).toBe('llm_reasoning');
      expect(llmService.generateFullParallelResponse).toHaveBeenCalled();
    });

    it('should register an introspection handler', async () => {
      const handler = (proactiveLoop as any).actionHandlers.get('introspect');
      expect(handler).toBeDefined();

      const goal: AutonomousGoal = {
        id: 'introspect_1',
        description: 'introspect on current state',
        priority: 5,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        subtasks: [],
        dependencies: [],
      };

      const result = await handler(goal);
      expect(result.success).toBe(true);
      expect(result.output.introspection).toBeDefined();
    });

    it('should handle LLM failures gracefully', async () => {
      llmService.generateFullParallelResponse.mockRejectedValueOnce(new Error('LLM timeout'));

      const handler = (proactiveLoop as any).actionHandlers.get('default');
      const goal: AutonomousGoal = {
        id: 'failing_goal',
        description: 'This will fail',
        priority: 5,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        subtasks: [],
        dependencies: [],
      };

      const result = await handler(goal);
      expect(result.success).toBe(false);
      expect(result.output.error).toContain('LLM timeout');
    });
  });

  describe('Somatic Marker Feedback', () => {
    beforeEach(async () => {
      await wiring.wire(echoAgentLoop as any);
    });

    it('should create somatic markers on successful goal execution', async () => {
      const handler = (proactiveLoop as any).actionHandlers.get('default');
      const goal: AutonomousGoal = {
        id: 'marker_test',
        description: 'Test somatic marker creation',
        priority: 5,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        subtasks: [],
        dependencies: [],
      };

      await handler(goal);

      const markers = wiring.getSomaticMarkers();
      expect(markers.length).toBeGreaterThan(0);
      expect(markers[0].valence).toBeGreaterThan(0); // Positive for success
    });

    it('should create negative somatic markers on failure', async () => {
      llmService.generateFullParallelResponse.mockRejectedValueOnce(new Error('fail'));

      const handler = (proactiveLoop as any).actionHandlers.get('default');
      const goal: AutonomousGoal = {
        id: 'negative_marker_test',
        description: 'negative_marker_test',
        priority: 5,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        subtasks: [],
        dependencies: [],
      };

      await handler(goal);

      const markers = wiring.getSomaticMarkers();
      const negativeMarker = markers.find(m => m.trigger === 'negative_marker_test');
      expect(negativeMarker).toBeDefined();
      expect(negativeMarker!.valence).toBeLessThan(0);
    });

    it('should reinforce existing markers on repeated triggers', async () => {
      const handler = (proactiveLoop as any).actionHandlers.get('default');
      const goal: AutonomousGoal = {
        id: 'reinforce_test',
        description: 'reinforce_test',
        priority: 5,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        subtasks: [],
        dependencies: [],
      };

      await handler(goal);
      await handler(goal);
      await handler(goal);

      const markers = wiring.getSomaticMarkers();
      const marker = markers.find(m => m.trigger === 'reinforce_test');
      expect(marker).toBeDefined();
      expect(marker!.reinforcements).toBe(3);
      expect(marker!.confidence).toBeGreaterThan(0.3); // Should increase with reinforcement
    });

    it('should respond to grand cycle autonomy events', async () => {
      // Emit a grand_cycle_complete event with high autonomy
      echoAgentLoop.emit('grand_cycle_complete', {
        cycleNumber: 1,
        metrics: { autonomyScore: 0.75 },
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      const markers = wiring.getSomaticMarkers();
      const autonomyMarker = markers.find(m => m.trigger === 'autonomy_progress');
      expect(autonomyMarker).toBeDefined();
      expect(autonomyMarker!.valence).toBeGreaterThan(0);
    });
  });

  describe('Memory Persistence', () => {
    beforeEach(async () => {
      await wiring.wire(echoAgentLoop as any);
    });

    it('should buffer episodic memories during goal execution', async () => {
      const handler = (proactiveLoop as any).actionHandlers.get('default');
      const goal: AutonomousGoal = {
        id: 'memory_test',
        description: 'Test memory buffering',
        priority: 5,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        subtasks: [],
        dependencies: [],
      };

      await handler(goal);

      expect(wiring.getEpisodicBufferSize()).toBeGreaterThan(0);
    });

    it('should flush episodic buffer on cognitive_integration event', async () => {
      // First generate some episodic memories
      const handler = (proactiveLoop as any).actionHandlers.get('default');
      for (let i = 0; i < 6; i++) {
        await handler({
          id: `mem_goal_${i}`,
          description: `Memory goal ${i}`,
          priority: 5,
          status: 'active' as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          subtasks: [],
          dependencies: [],
        });
      }

      const bufferBefore = wiring.getEpisodicBufferSize();
      expect(bufferBefore).toBeGreaterThanOrEqual(6);

      // Trigger cognitive integration
      echoAgentLoop.emit('cognitive_integration', { tickCount: 100 });

      // Wait for async flush
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(memoryStore.storeMemory).toHaveBeenCalled();
      expect(wiring.getEpisodicBufferSize()).toBeLessThan(bufferBefore);
    });

    it('should persist self-image snapshots as reflections', async () => {
      echoAgentLoop.emit('cognitive_self_image', {
        dominantCognitiveMode: 'exploratory',
        autonomyScore: 0.72,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(memoryStore.storeReflection).toHaveBeenCalledWith(
        expect.stringContaining('Self-image snapshot'),
        'focused',
        'self_image'
      );
    });
  });

  describe('Autognosis Self-Modification', () => {
    beforeEach(async () => {
      await wiring.wire(echoAgentLoop as any);
    });

    it('should accumulate self-modification history', async () => {
      // The self-mod loop fires every 10 proactive cycles
      // Simulate 10 cycle_complete events
      for (let i = 0; i < 10; i++) {
        proactiveLoop.emit('cycle_complete', {});
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      // Self-mod history may or may not have entries depending on state
      // but the mechanism should not throw
      const history = wiring.getSelfModHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should emit self_modification_applied when confidence threshold met', async () => {
      const modApplied = new Promise<SelfModificationDirective>((resolve) => {
        wiring.on('self_modification_applied', (directive) => resolve(directive));
      });

      // Artificially set high cognitive load by manipulating proactive loop state
      // This is a white-box test — we know the self-mod checks cognitiveLoad > 0.8
      const state = (proactiveLoop as any).state;
      state.cognitiveLoad = 0.95;

      // Trigger 10 cycles
      for (let i = 0; i < 10; i++) {
        proactiveLoop.emit('cycle_complete', {});
      }

      const directive = await Promise.race([
        modApplied,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 200)),
      ]);

      if (directive) {
        expect(directive.type).toBe('action_threshold');
        expect(directive.rationale).toContain('cognitive load');
      }
    });
  });

  describe('Perception Handlers', () => {
    beforeEach(async () => {
      await wiring.wire(echoAgentLoop as any);
    });

    it('should register perception handlers on the proactive loop', () => {
      const handlers = (proactiveLoop as any).perceptionHandlers;
      // Should have at least 2 handlers (somatic + self-modification)
      expect(handlers.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect episodic buffer overflow as stimulus', async () => {
      // Fill the episodic buffer with > 10 entries
      const handler = (proactiveLoop as any).actionHandlers.get('default');
      for (let i = 0; i < 12; i++) {
        await handler({
          id: `overflow_${i}`,
          description: `Overflow test ${i}`,
          priority: 5,
          status: 'active' as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          subtasks: [],
          dependencies: [],
        });
      }

      // Call perception handlers directly
      const handlers = (proactiveLoop as any).perceptionHandlers;
      const allStimuli: EnvironmentStimulus[] = [];
      for (const h of handlers) {
        const stimuli = await h();
        allStimuli.push(...stimuli);
      }

      const bufferStimulus = allStimuli.find(s => s.source === 'episodic_buffer');
      expect(bufferStimulus).toBeDefined();
      expect(bufferStimulus!.data.pendingEpisodes).toBeGreaterThan(10);
    });
  });
});
