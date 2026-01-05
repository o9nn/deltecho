/**
 * Global Jest Setup for Deltecho Test Suite
 *
 * Provides:
 * - Global test utilities
 * - Mock factories
 * - Custom matchers
 * - Environment configuration
 */

import { jest } from '@jest/globals';

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: TestUtilities;
    }
  }
}

interface TestUtilities {
  createMockMemory: (overrides?: Partial<MockMemory>) => MockMemory;
  createMockPersonality: (overrides?: Partial<MockPersonality>) => MockPersonality;
  createMockCognitiveState: (overrides?: Partial<MockCognitiveState>) => MockCognitiveState;
  waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
  delay: (ms: number) => Promise<void>;
}

interface MockMemory {
  id: string;
  text: string;
  timestamp: number;
  chatId: number;
  sender: 'user' | 'bot';
  embedding?: number[];
}

interface MockPersonality {
  mood: string;
  traits: string[];
  interactionStyle: string;
  lastUpdated: number;
}

interface MockCognitiveState {
  memories: MockMemory[];
  personality: MockPersonality;
  currentPhase: number;
  activeStreams: number;
}

// Test utility implementations
const testUtils: TestUtilities = {
  createMockMemory: (overrides = {}) => ({
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    text: 'Test memory content',
    timestamp: Date.now(),
    chatId: 123,
    sender: 'user',
    ...overrides,
  }),

  createMockPersonality: (overrides = {}) => ({
    mood: 'neutral',
    traits: ['helpful', 'curious', 'thoughtful'],
    interactionStyle: 'casual',
    lastUpdated: Date.now(),
    ...overrides,
  }),

  createMockCognitiveState: (overrides = {}) => ({
    memories: [],
    personality: testUtils.createMockPersonality(),
    currentPhase: 0,
    activeStreams: 3,
    ...overrides,
  }),

  waitFor: async (condition, timeout = 5000) => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error(`Timeout waiting for condition after ${timeout}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },

  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// Make utilities available globally
(global as unknown as { testUtils: TestUtilities }).testUtils = testUtils;

// Custom Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveValidTimestamp(received: { timestamp?: number }) {
    const pass =
      typeof received.timestamp === 'number' &&
      received.timestamp > 0 &&
      received.timestamp <= Date.now();
    if (pass) {
      return {
        message: () => `expected object not to have valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected object to have valid timestamp`,
        pass: false,
      };
    }
  },

  toBeValidCognitivePhase(received: number) {
    const pass = Number.isInteger(received) && received >= 0 && received < 12;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid cognitive phase (0-11)`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid cognitive phase (0-11)`,
        pass: false,
      };
    }
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveValidTimestamp(): R;
      toBeValidCognitivePhase(): R;
    }
  }
}

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.log and console.debug in tests
  console.log = jest.fn();
  console.debug = jest.fn();

  // Keep console.warn and console.error for debugging
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
});

export { testUtils, MockMemory, MockPersonality, MockCognitiveState };
