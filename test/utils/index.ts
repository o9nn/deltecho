/**
 * Shared test utilities for Deltecho monorepo
 * Provides common mocks, fixtures, and helpers for testing
 */

// ============================================
// Mock Factories
// ============================================

/**
 * Create a mock message for testing
 */
export function createMockMessage(overrides: Partial<MockMessage> = {}): MockMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    content: 'Test message content',
    role: 'user',
    timestamp: Date.now(),
    metadata: {},
    ...overrides,
  };
}

export interface MockMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Create a mock cognitive state
 */
export function createMockCognitiveState(
  overrides: Partial<MockCognitiveState> = {}
): MockCognitiveState {
  return {
    persona: {
      name: 'Test Echo',
      traits: ['helpful', 'curious'],
      currentMood: 'neutral',
      interactionStyle: 'casual',
      lastUpdated: Date.now(),
    },
    memories: {
      shortTerm: [],
      longTerm: {
        episodic: 0,
        semantic: 0,
        procedural: 0,
      },
      reflections: [],
    },
    reasoning: {
      atomspaceSize: 0,
      activeGoals: [],
      attentionFocus: [],
      confidenceLevel: 0.5,
    },
    cognitiveContext: {
      relevantMemories: [],
      emotionalValence: 0,
      emotionalArousal: 0,
      salienceScore: 0.5,
      attentionWeight: 0.5,
      activeCouplings: [],
    },
    ...overrides,
  };
}

export interface MockCognitiveState {
  persona: {
    name: string;
    traits: string[];
    currentMood: string;
    interactionStyle: string;
    lastUpdated: number;
  };
  memories: {
    shortTerm: Array<{ content: string; timestamp: number; type: string }>;
    longTerm: {
      episodic: number;
      semantic: number;
      procedural: number;
    };
    reflections: string[];
  };
  reasoning: {
    atomspaceSize: number;
    activeGoals: string[];
    attentionFocus: string[];
    confidenceLevel: number;
  };
  cognitiveContext: {
    relevantMemories: string[];
    emotionalValence: number;
    emotionalArousal: number;
    salienceScore: number;
    attentionWeight: number;
    activeCouplings: string[];
  };
}

/**
 * Create mock LLM response
 */
export function createMockLLMResponse(content: string = 'Test response'): MockLLMResponse {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 30,
      total_tokens: 80,
    },
  };
}

export interface MockLLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================
// Mock Services
// ============================================

/**
 * Create a mock fetch function for testing
 */
export function createMockFetch(responses: Map<string, unknown> = new Map()): jest.Mock {
  return jest.fn().mockImplementation((url: string) => {
    const response = responses.get(url) || createMockLLMResponse();
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    });
  });
}

/**
 * Create a mock timer that can be controlled in tests
 */
export class MockTimer {
  private time = 0;
  private timers: Array<{ callback: () => void; time: number }> = [];

  now(): number {
    return this.time;
  }

  advance(ms: number): void {
    this.time += ms;
    const readyTimers = this.timers.filter((t) => t.time <= this.time);
    this.timers = this.timers.filter((t) => t.time > this.time);
    readyTimers.forEach((t) => t.callback());
  }

  setTimeout(callback: () => void, delay: number): number {
    const id = this.timers.length;
    this.timers.push({ callback, time: this.time + delay });
    return id;
  }

  reset(): void {
    this.time = 0;
    this.timers = [];
  }
}

// ============================================
// Test Helpers
// ============================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise that can be resolved/rejected externally
 */
export function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

/**
 * Assert that a promise rejects with a specific error
 */
export async function expectToReject(
  promise: Promise<unknown>,
  errorMatch?: string | RegExp
): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject, but it resolved');
  } catch (error) {
    if (errorMatch) {
      const message = error instanceof Error ? error.message : String(error);
      if (typeof errorMatch === 'string') {
        expect(message).toContain(errorMatch);
      } else {
        expect(message).toMatch(errorMatch);
      }
    }
  }
}

// ============================================
// Atom Space Test Utilities
// ============================================

/**
 * Create a sample knowledge graph for testing
 */
export function createSampleKnowledgeGraph(): SampleKnowledgeGraph {
  const nodes = {
    animal: { id: 'n1', type: 'ConceptNode' as const, name: 'animal' },
    mammal: { id: 'n2', type: 'ConceptNode' as const, name: 'mammal' },
    cat: { id: 'n3', type: 'ConceptNode' as const, name: 'cat' },
    dog: { id: 'n4', type: 'ConceptNode' as const, name: 'dog' },
  };

  const links = [
    { from: 'mammal', to: 'animal', type: 'InheritanceLink' },
    { from: 'cat', to: 'mammal', type: 'InheritanceLink' },
    { from: 'dog', to: 'mammal', type: 'InheritanceLink' },
    { from: 'cat', to: 'dog', type: 'SimilarityLink' },
  ];

  return { nodes, links };
}

export interface SampleKnowledgeGraph {
  nodes: Record<string, { id: string; type: 'ConceptNode'; name: string }>;
  links: Array<{ from: string; to: string; type: string }>;
}

// ============================================
// Event Testing
// ============================================

/**
 * Create an event recorder for testing event emissions
 */
export function createEventRecorder<T>(): EventRecorder<T> {
  const events: T[] = [];

  return {
    record: (event: T) => {
      events.push(event);
    },
    getEvents: () => [...events],
    getLastEvent: () => events[events.length - 1],
    clear: () => {
      events.length = 0;
    },
    waitForEvent: async (timeout = 1000) => {
      const start = Date.now();
      while (events.length === 0 && Date.now() - start < timeout) {
        await sleep(10);
      }
      return events[events.length - 1];
    },
  };
}

export interface EventRecorder<T> {
  record: (event: T) => void;
  getEvents: () => T[];
  getLastEvent: () => T | undefined;
  clear: () => void;
  waitForEvent: (timeout?: number) => Promise<T | undefined>;
}

// ============================================
// Performance Testing
// ============================================

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Run a benchmark and return statistics
 */
export async function benchmark(
  fn: () => void | Promise<void>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);

  return {
    iterations,
    min: times[0],
    max: times[times.length - 1],
    mean: times.reduce((a, b) => a + b, 0) / times.length,
    median: times[Math.floor(times.length / 2)],
    p95: times[Math.floor(times.length * 0.95)],
    p99: times[Math.floor(times.length * 0.99)],
  };
}

export interface BenchmarkResult {
  iterations: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}
