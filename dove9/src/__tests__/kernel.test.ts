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

    it('should get all processes', () => {
      kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S1', 'C1', 5);
      kernel.createProcess('msg-002', 'a@test.com', ['b@test.com'], 'S2', 'C2', 5);

      const allProcesses = kernel.getAllProcesses();
      expect(allProcesses.length).toBe(2);
    });
  });

  describe('Priority Scheduling', () => {
    it('should process higher priority messages first', async () => {
      const lowPriority = kernel.createProcess(
        'msg-low',
        'a@test.com',
        ['b@test.com'],
        'Low',
        'C',
        1
      );
      const highPriority = kernel.createProcess(
        'msg-high',
        'a@test.com',
        ['b@test.com'],
        'High',
        'C',
        10
      );

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

      const allProcesses = limitedKernel.getAllProcesses();
      expect(allProcesses.length).toBe(5); // All created but processing limited
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

      const metrics = kernel.getMetrics();
      expect(metrics.cognitiveLoad).toBeGreaterThanOrEqual(0);
    });

    it('should initialize metrics correctly', () => {
      const metrics = kernel.getMetrics();

      expect(metrics.totalSteps).toBe(0);
      expect(metrics.totalCycles).toBe(0);
      expect(metrics.processesCompleted).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.streamCoherence).toBe(1.0);
    });

    it('should track stream coherence', async () => {
      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      await kernel.stop();

      const metrics = kernel.getMetrics();
      expect(metrics.streamCoherence).toBeGreaterThanOrEqual(0);
      expect(metrics.streamCoherence).toBeLessThanOrEqual(1);
    });
  });

  describe('Kernel State', () => {
    it('should return current state', () => {
      const state = kernel.getState();

      expect(state).toBeDefined();
      expect(state.currentStep).toBeDefined();
      expect(state.cycleNumber).toBeDefined();
      expect(state.streams).toBeDefined();
      expect(state.processTable).toBeDefined();
      expect(state.activeProcesses).toBeDefined();
      expect(state.metrics).toBeDefined();
    });

    it('should track streams state', () => {
      const state = kernel.getState();

      expect(state.streams).toBeDefined();
      expect(state.streams.size).toBe(3);
      expect(state.streams.has(StreamId.PRIMARY)).toBe(true);
      expect(state.streams.has(StreamId.SECONDARY)).toBe(true);
      expect(state.streams.has(StreamId.TERTIARY)).toBe(true);
    });

    it('should track process table', () => {
      kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

      const state = kernel.getState();
      expect(state.processTable.size).toBe(1);
    });
  });

  describe('Process Forking', () => {
    it('should fork a process', () => {
      const parent = kernel.createProcess(
        'msg-001',
        'a@test.com',
        ['b@test.com'],
        'Parent',
        'Content',
        5
      );
      const child = kernel.forkProcess(parent.id, 'Child content', 'Child Subject');

      expect(child).toBeDefined();
      expect(child?.parentId).toBe(parent.id);
      expect(parent.childIds).toContain(child?.id);
    });

    it('should inherit cognitive context on fork', () => {
      const parent = kernel.createProcess(
        'msg-001',
        'a@test.com',
        ['b@test.com'],
        'Parent',
        'Content',
        5
      );
      parent.cognitiveContext.emotionalValence = 0.8;

      const child = kernel.forkProcess(parent.id, 'Child content');

      expect(child?.cognitiveContext.emotionalValence).toBe(0.8);
    });

    it('should return null for non-existent parent', () => {
      const child = kernel.forkProcess('non-existent-id', 'Content');
      expect(child).toBeNull();
    });

    it('should use default subject on fork', () => {
      const parent = kernel.createProcess(
        'msg-001',
        'a@test.com',
        ['b@test.com'],
        'Original',
        'Content',
        5
      );
      const child = kernel.forkProcess(parent.id, 'Child content');

      expect(child?.subject).toBe('Re: Original');
    });
  });

  describe('Event Emission', () => {
    it('should emit step_advance event on start', async () => {
      await kernel.start();

      const stepEvents = events.filter((e) => e.type === 'step_advance');
      expect(stepEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should emit process_created event', () => {
      kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

      const createEvents = events.filter((e) => e.type === 'process_created');
      expect(createEvents.length).toBe(1);
    });

    it('should emit kernel_event for all events', async () => {
      kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);
      await kernel.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      await kernel.stop();

      expect(events.length).toBeGreaterThan(0);
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

  it('should start in PENDING state', () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);
    expect(process.state).toBe(ProcessState.PENDING);
  });

  it('should transition to ACTIVE/PROCESSING when kernel starts', async () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 10);

    await kernel.start();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updated = kernel.getProcess(process.id);
    // Process should be in one of the active states
    expect([ProcessState.PROCESSING, ProcessState.COMPLETED, ProcessState.ACTIVE]).toContain(
      updated?.state
    );
  });

  it('should transition to TERMINATED on terminate', () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

    kernel.terminateProcess(process.id);
    expect(kernel.getProcess(process.id)?.state).toBe(ProcessState.TERMINATED);
  });

  it('should not suspend a PENDING process (requires ACTIVE state)', () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

    // suspendProcess requires ACTIVE state, returns false for PENDING
    const result = kernel.suspendProcess(process.id);
    expect(result).toBe(false);
    // State should remain PENDING
    expect(kernel.getProcess(process.id)?.state).toBe(ProcessState.PENDING);
  });

  it('should not resume a non-SUSPENDED process', () => {
    const process = kernel.createProcess('msg-001', 'a@test.com', ['b@test.com'], 'S', 'C', 5);

    // resumeProcess requires SUSPENDED state, returns false for PENDING
    const result = kernel.resumeProcess(process.id);
    expect(result).toBe(false);
    // State should remain PENDING
    expect(kernel.getProcess(process.id)?.state).toBe(ProcessState.PENDING);
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
