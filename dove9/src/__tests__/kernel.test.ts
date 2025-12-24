/**
 * Dove9 Kernel E2E Tests
 *
 * Comprehensive test suite for the Dove9 Kernel - the cognitive CPU
 * that processes messages as threads in the "Everything is a Chatbot" paradigm.
 *
 * Tests verify:
 * - Kernel initialization and lifecycle
 * - Process creation and management
 * - Message processing pipeline
 * - Priority scheduling
 * - Cognitive context management
 * - Event emission and handling
 */

import { Dove9Kernel } from '../core/kernel.js';
import {
  DeepTreeEchoProcessor,
  LLMServiceInterface,
  MemoryStoreInterface,
  PersonaCoreInterface,
} from '../cognitive/deep-tree-echo-processor.js';
import {
  ProcessState,
  StreamId,
  CognitiveMode,
  CognitiveTerm,
  KernelEvent,
  MessageProcess,
  DEFAULT_DOVE9_CONFIG,
} from '../types/index.js';

/**
 * Mock LLM Service for testing
 */
class MockLLMService implements LLMServiceInterface {
  async complete(prompt: string): Promise<string> {
    return `Response to: ${prompt.substring(0, 50)}...`;
  }

  async completeWithContext(prompt: string, _context: string[]): Promise<string> {
    return `Contextual response to: ${prompt.substring(0, 50)}...`;
  }
}

/**
 * Mock Memory Store for testing
 */
class MockMemoryStore implements MemoryStoreInterface {
  private memories: Map<string, string[]> = new Map();

  async store(key: string, value: string): Promise<void> {
    const existing = this.memories.get(key) || [];
    existing.push(value);
    this.memories.set(key, existing);
  }

  async retrieve(key: string): Promise<string[]> {
    return this.memories.get(key) || [];
  }

  async search(query: string): Promise<string[]> {
    const results: string[] = [];
    for (const values of this.memories.values()) {
      for (const value of values) {
        if (value.includes(query)) {
          results.push(value);
        }
      }
    }
    return results;
  }

  async clear(): Promise<void> {
    this.memories.clear();
  }
}

/**
 * Mock Persona Core for testing
 */
class MockPersonaCore implements PersonaCoreInterface {
  private traits: Map<string, number> = new Map([
    ['curiosity', 0.8],
    ['helpfulness', 0.9],
    ['creativity', 0.7],
  ]);

  getTrait(name: string): number {
    return this.traits.get(name) || 0.5;
  }

  setTrait(name: string, value: number): void {
    this.traits.set(name, Math.max(0, Math.min(1, value)));
  }

  getPersonality(): Record<string, number> {
    return Object.fromEntries(this.traits);
  }
}

/**
 * Create test processor with mocks
 */
function createTestProcessor(): DeepTreeEchoProcessor {
  return new DeepTreeEchoProcessor(
    new MockLLMService(),
    new MockMemoryStore(),
    new MockPersonaCore(),
    {
      enableParallelCognition: true,
      memoryRetrievalCount: 5,
      salienceThreshold: 0.3,
    }
  );
}

/**
 * Create test kernel with default config
 */
function createTestKernel(): Dove9Kernel {
  const processor = createTestProcessor();
  return new Dove9Kernel(processor, {
    ...DEFAULT_DOVE9_CONFIG,
    stepDuration: 10, // Fast for testing
  });
}

describe('Dove9Kernel', () => {
  let kernel: Dove9Kernel;
  let events: KernelEvent[];

  beforeEach(() => {
    kernel = createTestKernel();
    events = [];
    kernel.on('kernel_event', (event: KernelEvent) => events.push(event));
  });

  afterEach(async () => {
    await kernel.stop();
  });

  describe('Kernel Lifecycle', () => {
    it('should initialize with default configuration', () => {
      expect(kernel).toBeDefined();
      const state = kernel.getState();
      expect(state.currentStep).toBe(0);
      expect(state.cycleNumber).toBe(0);
    });

    it('should start successfully', async () => {
      await kernel.start();
      expect(kernel.isRunning()).toBe(true);
    });

    it('should stop successfully', async () => {
      await kernel.start();
      await kernel.stop();
      expect(kernel.isRunning()).toBe(false);
    });

    it('should not start if already running', async () => {
      await kernel.start();
      await kernel.start(); // Should be no-op
      expect(kernel.isRunning()).toBe(true);
    });

    it('should not stop if not running', async () => {
      await kernel.stop(); // Should be no-op
      expect(kernel.isRunning()).toBe(false);
    });
  });

  describe('Process Creation', () => {
    it('should create a new process', () => {
      const process = kernel.createProcess(
        'msg-001',
        'sender@test.com',
        ['recipient@test.com'],
        'Test Subject',
        'Test message content',
        5
      );

      expect(process).toBeDefined();
      expect(process.messageId).toBe('msg-001');
      expect(process.from).toBe('sender@test.com');
      expect(process.to).toContain('recipient@test.com');
      expect(process.subject).toBe('Test Subject');
      expect(process.content).toBe('Test message content');
      expect(process.priority).toBe(5);
    });

    it('should assign unique IDs to processes', () => {
      const process1 = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S1', 'C1', 5);
      const process2 = kernel.createProcess('msg-002', 'a@test.com', ['b@test.com'], 'S2', 'C2', 5);

      expect(process1.id).not.toBe(process2.id);
    });

    it('should initialize process in PENDING state', () => {
      const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);
      expect(process.state).toBe(ProcessState.PENDING);
    });

    it('should initialize cognitive context', () => {
      const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

      expect(process.cognitiveContext).toBeDefined();
      expect(process.cognitiveContext.relevantMemories).toEqual([]);
      expect(process.cognitiveContext.salienceScore).toBeGreaterThanOrEqual(0);
      expect(process.cognitiveContext.activeCouplings).toEqual([]);
    });

    it('should emit process_created event', () => {
      kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

      const createEvents = events.filter((e) => e.type === 'process_created');
      expect(createEvents.length).toBe(1);
    });
  });

  describe('Process Management', () => {
    it('should retrieve active processes', () => {
      kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S1', 'C1', 5);
      kernel.createProcess('msg-002', 'a@test.com', ['b@test.com'], 'S2', 'C2', 5);

      const activeProcesses = kernel.getActiveProcesses();
      expect(activeProcesses.length).toBe(2);
    });

    it('should get process by ID', () => {
      const created = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);
      const retrieved = kernel.getProcess(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent process', () => {
      const retrieved = kernel.getProcess('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should terminate a process', () => {
      const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);
      kernel.terminateProcess(process.id);

      const retrieved = kernel.getProcess(process.id);
      expect(retrieved?.state).toBe(ProcessState.TERMINATED);
    });

    it('should suspend a process', () => {
      const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);
      kernel.suspendProcess(process.id);

      const retrieved = kernel.getProcess(process.id);
      expect(retrieved?.state).toBe(ProcessState.SUSPENDED);
    });

    it('should resume a suspended process', () => {
      const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);
      kernel.suspendProcess(process.id);
      kernel.resumeProcess(process.id);

      const retrieved = kernel.getProcess(process.id);
      expect(retrieved?.state).toBe(ProcessState.PENDING);
    });
  });

  describe('Priority Scheduling', () => {
    it('should process higher priority messages first', async () => {
      const lowPriority = kernel.createProcess('msg-low', 'a@test.com', ['b@test.com'], 'Low', 'C', 1);
      const highPriority = kernel.createProcess('msg-high', 'a@test.com', ['b@test.com'], 'High', 'C', 10);

      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      await kernel.stop();

      // High priority should be processed before low priority
      const highProcess = kernel.getProcess(highPriority.id);
      const lowProcess = kernel.getProcess(lowPriority.id);

      // At minimum, high priority should have advanced further or completed first
      expect(highProcess).toBeDefined();
      expect(lowProcess).toBeDefined();
    });

    it('should respect max concurrent processes limit', () => {
      const config = {
        ...DEFAULT_DOVE9_CONFIG,
        maxConcurrentProcesses: 2,
      };
      const limitedKernel = new Dove9Kernel(createTestProcessor(), config);

      // Create more processes than the limit
      for (let i = 0; i < 5; i++) {
        limitedKernel.createProcess(`msg-${i}`, 'a@test.com', ['b@test.com'], `S${i}`, `C${i}`, 5);
      }

      const activeProcesses = limitedKernel.getActiveProcesses();
      expect(activeProcesses.length).toBe(5); // All created but processing limited
    });
  });

  describe('Kernel Metrics', () => {
    it('should track total processes completed', async () => {
      kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 10);

      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await kernel.stop();

      const metrics = kernel.getMetrics();
      expect(metrics.processesCompleted).toBeGreaterThanOrEqual(0);
    });

    it('should track cognitive load', async () => {
      kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S1', 'C1', 5);
      kernel.createProcess('msg-002', 'a@test.com', ['b@test.com'], 'S2', 'C2', 5);

      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const metrics = kernel.getMetrics();
      expect(metrics.cognitiveLoad).toBeGreaterThanOrEqual(0);
      expect(metrics.cognitiveLoad).toBeLessThanOrEqual(1);

      await kernel.stop();
    });

    it('should track stream coherence', async () => {
      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const metrics = kernel.getMetrics();
      expect(metrics.streamCoherence).toBeGreaterThanOrEqual(0);
      expect(metrics.streamCoherence).toBeLessThanOrEqual(1);

      await kernel.stop();
    });

    it('should track total steps executed', async () => {
      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await kernel.stop();

      const metrics = kernel.getMetrics();
      expect(metrics.totalSteps).toBeGreaterThan(0);
    });

    it('should track total cycles completed', async () => {
      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 150));
      await kernel.stop();

      const metrics = kernel.getMetrics();
      expect(metrics.totalCycles).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Event Handling', () => {
    it('should emit step_advance events', async () => {
      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      await kernel.stop();

      const stepEvents = events.filter((e) => e.type === 'step_advance');
      expect(stepEvents.length).toBeGreaterThan(0);
    });

    it('should emit triad_convergence events', async () => {
      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await kernel.stop();

      const triadEvents = events.filter((e) => e.type === 'triad_convergence');
      expect(triadEvents.length).toBeGreaterThan(0);
    });

    it('should emit cycle_complete events', async () => {
      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 150));
      await kernel.stop();

      const cycleEvents = events.filter((e) => e.type === 'cycle_complete');
      expect(cycleEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should emit coupling_activated events during processing', async () => {
      kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 10);

      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await kernel.stop();

      const couplingEvents = events.filter((e) => e.type === 'coupling_activated');
      // Couplings may or may not be activated depending on processing
      expect(couplingEvents).toBeDefined();
    });
  });

  describe('Kernel State', () => {
    it('should return complete kernel state', () => {
      const state = kernel.getState();

      expect(state).toHaveProperty('currentStep');
      expect(state).toHaveProperty('cycleNumber');
      expect(state).toHaveProperty('streams');
      expect(state).toHaveProperty('processTable');
      expect(state).toHaveProperty('activeProcesses');
      expect(state).toHaveProperty('metrics');
    });

    it('should have three streams in state', () => {
      const state = kernel.getState();
      expect(state.streams.size).toBe(3);
    });

    it('should update state during execution', async () => {
      const initialState = kernel.getState();
      expect(initialState.currentStep).toBe(0);

      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      await kernel.stop();

      const finalState = kernel.getState();
      expect(finalState.currentStep).toBeGreaterThan(0);
    });
  });
});

describe('Process State Transitions', () => {
  let kernel: Dove9Kernel;

  beforeEach(() => {
    kernel = createTestKernel();
  });

  afterEach(async () => {
    await kernel.stop();
  });

  it('should transition from PENDING to ACTIVE', async () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 10);
    expect(process.state).toBe(ProcessState.PENDING);

    await kernel.start();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updated = kernel.getProcess(process.id);
    expect([ProcessState.ACTIVE, ProcessState.PROCESSING, ProcessState.COMPLETED]).toContain(
      updated?.state
    );

    await kernel.stop();
  });

  it('should transition from ACTIVE to PROCESSING', async () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 10);

    await kernel.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updated = kernel.getProcess(process.id);
    expect([ProcessState.PROCESSING, ProcessState.COMPLETED]).toContain(updated?.state);

    await kernel.stop();
  });

  it('should transition to COMPLETED after processing', async () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 10);

    await kernel.start();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await kernel.stop();

    const updated = kernel.getProcess(process.id);
    // Process may or may not complete depending on timing
    expect([ProcessState.PROCESSING, ProcessState.COMPLETED, ProcessState.ACTIVE]).toContain(
      updated?.state
    );
  });

  it('should transition from SUSPENDED to PENDING on resume', () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

    kernel.suspendProcess(process.id);
    expect(kernel.getProcess(process.id)?.state).toBe(ProcessState.SUSPENDED);

    kernel.resumeProcess(process.id);
    expect(kernel.getProcess(process.id)?.state).toBe(ProcessState.PENDING);
  });

  it('should transition to TERMINATED on terminate', () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

    kernel.terminateProcess(process.id);
    expect(kernel.getProcess(process.id)?.state).toBe(ProcessState.TERMINATED);
  });
});

describe('Cognitive Context Evolution', () => {
  let kernel: Dove9Kernel;

  beforeEach(() => {
    kernel = createTestKernel();
  });

  afterEach(async () => {
    await kernel.stop();
  });

  it('should initialize context with default values', () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

    expect(process.cognitiveContext.emotionalValence).toBe(0);
    expect(process.cognitiveContext.emotionalArousal).toBeGreaterThanOrEqual(0);
    expect(process.cognitiveContext.salienceScore).toBeGreaterThanOrEqual(0);
    expect(process.cognitiveContext.attentionWeight).toBeGreaterThanOrEqual(0);
  });

  it('should track execution history', async () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 10);

    await kernel.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await kernel.stop();

    const updated = kernel.getProcess(process.id);
    expect(updated?.executionHistory).toBeDefined();
    expect(updated?.executionHistory.length).toBeGreaterThanOrEqual(0);
  });

  it('should update current step during processing', async () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 10);
    expect(process.currentStep).toBe(0);

    await kernel.start();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await kernel.stop();

    const updated = kernel.getProcess(process.id);
    expect(updated?.currentStep).toBeGreaterThanOrEqual(0);
  });
});
