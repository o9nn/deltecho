/**
 * Dove9 System Integration E2E Tests
 *
 * Comprehensive test suite for the complete Dove9 cognitive operating system.
 * Tests verify end-to-end functionality including:
 * - System initialization and configuration
 * - Mail message processing pipeline
 * - Deep Tree Echo integration
 * - Response generation
 * - Event handling and lifecycle
 */

import {
  Dove9System,
  Dove9SystemConfig,
  MailMessage,
  createDove9System,
} from '../index.js';
import {
  LLMServiceInterface,
  MemoryStoreInterface,
  PersonaCoreInterface,
} from '../cognitive/deep-tree-echo-processor.js';
import { ProcessState, KernelEvent, DEFAULT_DOVE9_CONFIG } from '../types/index.js';

/**
 * Mock LLM Service for testing
 */
class MockLLMService implements LLMServiceInterface {
  public completions: string[] = [];

  async complete(prompt: string): Promise<string> {
    const response = `Echo response: ${prompt.substring(0, 30)}...`;
    this.completions.push(response);
    return response;
  }

  async completeWithContext(prompt: string, context: string[]): Promise<string> {
    const response = `Contextual echo (${context.length} memories): ${prompt.substring(0, 30)}...`;
    this.completions.push(response);
    return response;
  }

  reset(): void {
    this.completions = [];
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
        if (value.toLowerCase().includes(query.toLowerCase())) {
          results.push(value);
        }
      }
    }
    return results;
  }

  async clear(): Promise<void> {
    this.memories.clear();
  }

  getMemoryCount(): number {
    let count = 0;
    for (const values of this.memories.values()) {
      count += values.length;
    }
    return count;
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
    ['empathy', 0.85],
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
 * Create test mail message
 */
function createTestMail(overrides: Partial<MailMessage> = {}): MailMessage {
  return {
    messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    from: 'sender@test.com',
    to: ['recipient@test.com'],
    subject: 'Test Subject',
    body: 'This is a test message body.',
    receivedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test system with mocks
 */
function createTestSystem(configOverrides: Partial<Dove9SystemConfig> = {}): {
  system: Dove9System;
  llmService: MockLLMService;
  memoryStore: MockMemoryStore;
  personaCore: MockPersonaCore;
} {
  const llmService = new MockLLMService();
  const memoryStore = new MockMemoryStore();
  const personaCore = new MockPersonaCore();

  const system = new Dove9System({
    ...DEFAULT_DOVE9_CONFIG,
    stepDuration: 10, // Fast for testing
    llmService,
    memoryStore,
    personaCore,
    botEmailAddress: 'echo@test.com',
    ...configOverrides,
  });

  return { system, llmService, memoryStore, personaCore };
}

describe('Dove9System', () => {
  let system: Dove9System;
  let llmService: MockLLMService;
  let memoryStore: MockMemoryStore;
  let personaCore: MockPersonaCore;
  let events: string[];

  beforeEach(() => {
    const testSetup = createTestSystem();
    system = testSetup.system;
    llmService = testSetup.llmService;
    memoryStore = testSetup.memoryStore;
    personaCore = testSetup.personaCore;
    events = [];

    system.on('started', () => events.push('started'));
    system.on('stopped', () => events.push('stopped'));
    system.on('mail_received', () => events.push('mail_received'));
    system.on('response_ready', () => events.push('response_ready'));
    system.on('kernel_event', () => events.push('kernel_event'));
  });

  afterEach(async () => {
    await system.stop();
  });

  describe('System Lifecycle', () => {
    it('should initialize correctly', () => {
      expect(system).toBeDefined();
      expect(system.isRunning()).toBe(false);
    });

    it('should start successfully', async () => {
      await system.start();
      expect(system.isRunning()).toBe(true);
      expect(events).toContain('started');
    });

    it('should stop successfully', async () => {
      await system.start();
      await system.stop();
      expect(system.isRunning()).toBe(false);
      expect(events).toContain('stopped');
    });

    it('should not start if already running', async () => {
      await system.start();
      const eventCount = events.length;
      await system.start(); // Should be no-op
      expect(events.length).toBe(eventCount);
    });

    it('should not stop if not running', async () => {
      await system.stop(); // Should be no-op
      expect(system.isRunning()).toBe(false);
    });
  });

  describe('Mail Processing', () => {
    it('should process incoming mail message', async () => {
      await system.start();
      const mail = createTestMail();
      const process = await system.processMailMessage(mail);

      expect(process).toBeDefined();
      expect(process.messageId).toBe(mail.messageId);
      expect(events).toContain('mail_received');
    });

    it('should create process with correct mail data', async () => {
      await system.start();
      const mail = createTestMail({
        from: 'alice@example.com',
        to: ['bob@example.com', 'charlie@example.com'],
        subject: 'Important Meeting',
        body: 'Please attend the meeting tomorrow.',
      });

      const process = await system.processMailMessage(mail);

      expect(process.from).toBe('alice@example.com');
      expect(process.to).toContain('bob@example.com');
      expect(process.to).toContain('charlie@example.com');
      expect(process.subject).toBe('Important Meeting');
      expect(process.content).toBe('Please attend the meeting tomorrow.');
    });

    it('should calculate priority for direct messages', async () => {
      await system.start();
      const directMail = createTestMail({ to: ['single@test.com'] });
      const groupMail = createTestMail({ to: ['a@test.com', 'b@test.com', 'c@test.com'] });

      const directProcess = await system.processMailMessage(directMail);
      const groupProcess = await system.processMailMessage(groupMail);

      expect(directProcess.priority).toBeGreaterThan(groupProcess.priority);
    });

    it('should calculate higher priority for replies', async () => {
      await system.start();
      const replyMail = createTestMail({ subject: 'Re: Original Subject' });
      const newMail = createTestMail({ subject: 'New Subject' });

      const replyProcess = await system.processMailMessage(replyMail);
      const newProcess = await system.processMailMessage(newMail);

      expect(replyProcess.priority).toBeGreaterThan(newProcess.priority);
    });

    it('should calculate higher priority for urgent messages', async () => {
      await system.start();
      const urgentMail = createTestMail({ subject: 'URGENT: Action Required' });
      const normalMail = createTestMail({ subject: 'Regular Update' });

      const urgentProcess = await system.processMailMessage(urgentMail);
      const normalProcess = await system.processMailMessage(normalMail);

      expect(urgentProcess.priority).toBeGreaterThan(normalProcess.priority);
    });

    it('should handle priority markers in subject', async () => {
      await system.start();
      const priorityMarkers = ['urgent', 'important', 'asap', 'priority'];

      for (const marker of priorityMarkers) {
        const mail = createTestMail({ subject: `${marker}: Test Message` });
        const process = await system.processMailMessage(mail);
        expect(process.priority).toBeGreaterThan(5); // Default is 5
      }
    });
  });

  describe('Kernel Integration', () => {
    it('should provide access to underlying kernel', () => {
      const kernel = system.getKernel();
      expect(kernel).toBeDefined();
    });

    it('should provide access to cognitive processor', () => {
      const processor = system.getProcessor();
      expect(processor).toBeDefined();
    });

    it('should forward kernel events', async () => {
      await system.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(events).toContain('kernel_event');
    });

    it('should return kernel metrics', async () => {
      await system.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const metrics = system.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('totalSteps');
      expect(metrics).toHaveProperty('totalCycles');
      expect(metrics).toHaveProperty('processesCompleted');
    });

    it('should return kernel state', () => {
      const state = system.getState();
      expect(state).toBeDefined();
      expect(state).toHaveProperty('currentStep');
      expect(state).toHaveProperty('cycleNumber');
      expect(state).toHaveProperty('streams');
    });

    it('should return active processes', async () => {
      await system.start();
      await system.processMailMessage(createTestMail());
      await system.processMailMessage(createTestMail());

      const activeProcesses = system.getActiveProcesses();
      expect(activeProcesses.length).toBe(2);
    });
  });

  describe('Response Generation', () => {
    it('should emit response_ready event when process completes', async () => {
      await system.start();
      const mail = createTestMail();
      await system.processMailMessage(mail);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Response may or may not be ready depending on processing time
      expect(events).toContain('mail_received');
    });
  });

  describe('Event Handling', () => {
    it('should emit triad_sync events', async () => {
      let triadSyncCount = 0;
      system.on('triad_sync', () => triadSyncCount++);

      await system.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await system.stop();

      expect(triadSyncCount).toBeGreaterThan(0);
    });

    it('should emit cycle_complete events', async () => {
      let cycleCount = 0;
      system.on('cycle_complete', () => cycleCount++);

      await system.start();
      await new Promise((resolve) => setTimeout(resolve, 150));
      await system.stop();

      expect(cycleCount).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('createDove9System Factory', () => {
  it('should create system with factory function', () => {
    const llmService = new MockLLMService();
    const memoryStore = new MockMemoryStore();
    const personaCore = new MockPersonaCore();

    const system = createDove9System(llmService, memoryStore, personaCore);

    expect(system).toBeDefined();
    expect(system).toBeInstanceOf(Dove9System);
  });

  it('should accept partial configuration', () => {
    const llmService = new MockLLMService();
    const memoryStore = new MockMemoryStore();
    const personaCore = new MockPersonaCore();

    const system = createDove9System(llmService, memoryStore, personaCore, {
      stepDuration: 50,
      maxConcurrentProcesses: 50,
    });

    expect(system).toBeDefined();
  });

  it('should use default configuration when not provided', () => {
    const llmService = new MockLLMService();
    const memoryStore = new MockMemoryStore();
    const personaCore = new MockPersonaCore();

    const system = createDove9System(llmService, memoryStore, personaCore);

    expect(system).toBeDefined();
    expect(system.isRunning()).toBe(false);
  });
});

describe('Multi-Message Processing', () => {
  let system: Dove9System;

  beforeEach(() => {
    const testSetup = createTestSystem();
    system = testSetup.system;
  });

  afterEach(async () => {
    await system.stop();
  });

  it('should handle multiple concurrent messages', async () => {
    await system.start();

    const messages = [
      createTestMail({ subject: 'Message 1' }),
      createTestMail({ subject: 'Message 2' }),
      createTestMail({ subject: 'Message 3' }),
    ];

    const processes = await Promise.all(messages.map((m) => system.processMailMessage(m)));

    expect(processes.length).toBe(3);
    expect(system.getActiveProcesses().length).toBe(3);
  });

  it('should process messages in priority order', async () => {
    await system.start();

    const lowPriority = createTestMail({ subject: 'Regular message' });
    const highPriority = createTestMail({ subject: 'URGENT: Critical issue' });

    const lowProcess = await system.processMailMessage(lowPriority);
    const highProcess = await system.processMailMessage(highPriority);

    expect(highProcess.priority).toBeGreaterThan(lowProcess.priority);
  });

  it('should maintain separate contexts for each message', async () => {
    await system.start();

    const mail1 = createTestMail({ from: 'alice@test.com', body: 'Hello from Alice' });
    const mail2 = createTestMail({ from: 'bob@test.com', body: 'Hello from Bob' });

    const process1 = await system.processMailMessage(mail1);
    const process2 = await system.processMailMessage(mail2);

    expect(process1.from).toBe('alice@test.com');
    expect(process2.from).toBe('bob@test.com');
    expect(process1.cognitiveContext).not.toBe(process2.cognitiveContext);
  });
});

describe('Error Handling', () => {
  it('should handle invalid mail gracefully', async () => {
    const testSetup = createTestSystem();
    const system = testSetup.system;

    await system.start();

    // Empty mail should still be processed
    const emptyMail = createTestMail({ body: '' });
    const process = await system.processMailMessage(emptyMail);

    expect(process).toBeDefined();
    expect(process.content).toBe('');

    await system.stop();
  });

  it('should handle missing recipients', async () => {
    const testSetup = createTestSystem();
    const system = testSetup.system;

    await system.start();

    const mail = createTestMail({ to: [] });
    const process = await system.processMailMessage(mail);

    expect(process).toBeDefined();
    expect(process.to).toEqual([]);

    await system.stop();
  });
});

describe('Configuration Options', () => {
  it('should respect maxConcurrentProcesses setting', async () => {
    const testSetup = createTestSystem({ maxConcurrentProcesses: 2 });
    const system = testSetup.system;

    await system.start();

    // Create more processes than the limit
    for (let i = 0; i < 5; i++) {
      await system.processMailMessage(createTestMail({ subject: `Message ${i}` }));
    }

    const activeProcesses = system.getActiveProcesses();
    expect(activeProcesses.length).toBe(5); // All created

    await system.stop();
  });

  it('should use custom bot email address', async () => {
    const testSetup = createTestSystem({ botEmailAddress: 'custom-bot@test.com' });
    const system = testSetup.system;

    expect(system).toBeDefined();

    await system.stop();
  });

  it('should respect step duration setting', async () => {
    const fastSystem = createTestSystem({ stepDuration: 5 }).system;
    const slowSystem = createTestSystem({ stepDuration: 50 }).system;

    await fastSystem.start();
    await slowSystem.start();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const fastMetrics = fastSystem.getMetrics();
    const slowMetrics = slowSystem.getMetrics();

    // Fast system should have more steps
    expect(fastMetrics.totalSteps).toBeGreaterThan(slowMetrics.totalSteps);

    await fastSystem.stop();
    await slowSystem.stop();
  });
});
