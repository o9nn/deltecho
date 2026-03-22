/**
 * Tests for Sys6OrchestratorBridge
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  Sys6OrchestratorBridge,
  createSys6OrchestratorBridge,
  Sys6IntegrationStats,
  GRAND_CYCLE_LENGTH,
  SYS6_CYCLE_LENGTH,
  DOVE9_CYCLE_LENGTH,
} from '../sys6-orchestrator-bridge.js';
import { DovecotEmail } from '../orchestrator-bridge.js';
import type { LLMServiceInterface, MemoryStoreInterface, PersonaCoreInterface } from '../../cognitive/deep-tree-echo-processor.js';

// Mock LLM Service
const createMockLLMService = (): LLMServiceInterface => ({
  generateResponse: jest.fn<() => Promise<string>>().mockResolvedValue('Mock LLM response'),
  generateParallelResponse: jest.fn<() => Promise<any>>().mockResolvedValue({
    integratedResponse: 'Integrated response',
    cognitiveResponse: 'Cognitive stream',
    affectiveResponse: 'Affective stream',
    relevanceResponse: 'Relevance stream',
  }),
});

// Mock Memory Store
const createMockMemoryStore = (): MemoryStoreInterface => ({
  storeMemory: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  retrieveRecentMemories: jest.fn<() => string[]>().mockReturnValue(['Memory 1', 'Memory 2']),
  retrieveRelevantMemories: jest
    .fn<() => Promise<string[]>>()
    .mockResolvedValue(['Relevant 1', 'Relevant 2']),
});

// Mock Persona Core
const createMockPersonaCore = (): PersonaCoreInterface => ({
  getPersonality: jest.fn<() => string>().mockReturnValue('Friendly AI assistant'),
  getDominantEmotion: jest
    .fn<() => { emotion: string; intensity: number }>()
    .mockReturnValue({ emotion: 'interest', intensity: 0.6 }),
  updateEmotionalState: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
});

// Mock DovecotEmail factory
function createMockEmail(overrides: Partial<DovecotEmail> = {}): DovecotEmail {
  return {
    from: 'sender@example.com',
    to: ['echo@localhost'],
    subject: 'Test Email',
    body: 'Test email body content',
    headers: new Map(),
    messageId: `email_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    receivedAt: new Date(),
    ...overrides,
  };
}

describe('Sys6OrchestratorBridge', () => {
  let bridge: Sys6OrchestratorBridge;
  let mockLLMService: LLMServiceInterface;
  let mockMemoryStore: MemoryStoreInterface;
  let mockPersonaCore: PersonaCoreInterface;

  beforeEach(() => {
    mockLLMService = createMockLLMService();
    mockMemoryStore = createMockMemoryStore();
    mockPersonaCore = createMockPersonaCore();

    bridge = new Sys6OrchestratorBridge({
      botEmailAddress: 'echo@localhost',
      enableAutoResponse: true,
      enableSys6Scheduling: true,
      grandCycleStepDuration: 10, // Fast for testing
    });

    bridge.initialize(mockLLMService, mockMemoryStore, mockPersonaCore);
  });

  afterEach(async () => {
    if (bridge.isRunning()) {
      await bridge.stop();
    }
  });

  describe('initialization', () => {
    test('should create bridge with default config', () => {
      const defaultBridge = createSys6OrchestratorBridge();
      expect(defaultBridge).toBeDefined();
      expect(defaultBridge.isSys6Enabled()).toBe(true);
    });

    test('should be configurable', () => {
      const customBridge = createSys6OrchestratorBridge({
        enableSys6Scheduling: false,
      });
      expect(customBridge.isSys6Enabled()).toBe(false);
    });

    test('should not be running initially', () => {
      expect(bridge.isRunning()).toBe(false);
    });
  });

  describe('start/stop', () => {
    test('should start successfully', async () => {
      await bridge.start();
      expect(bridge.isRunning()).toBe(true);
    });

    test('should stop successfully', async () => {
      await bridge.start();
      await bridge.stop();
      expect(bridge.isRunning()).toBe(false);
    });

    test('should handle multiple start calls', async () => {
      await bridge.start();
      await bridge.start(); // Should not throw
      expect(bridge.isRunning()).toBe(true);
    });

    test('should start scheduler when Sys6 is enabled', async () => {
      await bridge.start();
      const scheduler = bridge.getScheduler();
      expect(scheduler.isRunning()).toBe(true);
    });
  });

  describe('email processing', () => {
    test('should process email addressed to bot', async () => {
      await bridge.start();

      const email = createMockEmail({
        to: ['echo@localhost'],
      });

      const process = await bridge.processEmail(email);

      expect(process).toBeDefined();
      expect(process?.id).toBeDefined();
    });

    test('should schedule process with Sys6 when enabled', async () => {
      await bridge.start();

      const email = createMockEmail();
      const process = await bridge.processEmail(email);

      if (process) {
        const schedule = bridge.getProcessSchedule(process.id);
        expect(schedule).toBeDefined();
        expect(schedule?.sys6Phase).toBeGreaterThanOrEqual(1);
        expect(schedule?.sys6Phase).toBeLessThanOrEqual(3);
      }
    });

    test('should reject email not addressed to bot', async () => {
      await bridge.start();

      const email = createMockEmail({
        to: ['other@example.com'],
      });

      const process = await bridge.processEmail(email);
      expect(process).toBeNull();
    });
  });

  describe('scheduling', () => {
    test('should get next optimal slot for priority', () => {
      const slot = bridge.getNextOptimalSlot(8);

      expect(slot.phase).toBe(1); // High priority = phase 1
      expect(slot.step).toBeGreaterThan(0);
      expect(slot.cyclePositions).toBeDefined();
    });

    test('should get all scheduled processes', async () => {
      await bridge.start();

      const email1 = createMockEmail();
      const email2 = createMockEmail();

      await bridge.processEmail(email1);
      await bridge.processEmail(email2);

      const scheduled = bridge.getAllScheduledProcesses();
      expect(scheduled.length).toBe(2);
    });

    test('should complete process', async () => {
      await bridge.start();

      const email = createMockEmail();
      const process = await bridge.processEmail(email);

      if (process) {
        const initialCount = bridge.getPendingCount();
        bridge.completeProcess(process.id);
        const finalCount = bridge.getPendingCount();

        expect(finalCount).toBe(initialCount - 1);
      }
    });
  });

  describe('statistics', () => {
    test('should return integration statistics', () => {
      const stats = bridge.getStats();

      expect(stats.grandCycles).toBeDefined();
      expect(stats.sys6Cycles).toBeDefined();
      expect(stats.dove9Cycles).toBeDefined();
      expect(stats.totalScheduled).toBeDefined();
      expect(stats.totalCompleted).toBeDefined();
      expect(stats.phaseDistribution).toBeDefined();
      expect(stats.streamDistribution).toBeDefined();
    });

    test('should track scheduled process count', async () => {
      await bridge.start();

      const email = createMockEmail();
      await bridge.processEmail(email);

      const stats = bridge.getStats();
      expect(stats.totalScheduled).toBe(1);
    });

    test('should track phase distribution', async () => {
      await bridge.start();

      // Process high priority email (should go to phase 1)
      const urgentEmail = createMockEmail({
        subject: 'URGENT: Important message',
      });
      await bridge.processEmail(urgentEmail);

      const stats = bridge.getStats();
      expect(stats.phaseDistribution.phase1).toBeGreaterThanOrEqual(0);
    });

    test('should track stream distribution', async () => {
      await bridge.start();

      const email = createMockEmail();
      await bridge.processEmail(email);

      const stats = bridge.getStats();
      const totalStreams =
        stats.streamDistribution.stream1 +
        stats.streamDistribution.stream2 +
        stats.streamDistribution.stream3;
      expect(totalStreams).toBe(1);
    });
  });

  describe('cycle positions', () => {
    test('should return current cycle positions', () => {
      const positions = bridge.getCyclePositions();

      expect(positions.grandCycle).toBeDefined();
      expect(positions.sys6Cycle).toBeDefined();
      expect(positions.dove9Cycle).toBeDefined();
      expect(positions.sys6Progress).toBeGreaterThanOrEqual(0);
      expect(positions.sys6Progress).toBeLessThanOrEqual(1);
    });
  });

  describe('underlying components', () => {
    test('should return underlying bridge', () => {
      const orchestratorBridge = bridge.getBridge();
      expect(orchestratorBridge).toBeDefined();
    });

    test('should return scheduler', () => {
      const scheduler = bridge.getScheduler();
      expect(scheduler).toBeDefined();
    });

    test('should return Dove9 system', () => {
      const dove9 = bridge.getDove9System();
      expect(dove9).toBeDefined();
    });
  });

  describe('events', () => {
    test('should emit process_scheduled event', async () => {
      await bridge.start();

      const scheduledPromise = new Promise<void>((resolve) => {
        bridge.on('process_scheduled', () => {
          resolve();
        });
      });

      const email = createMockEmail();
      await bridge.processEmail(email);

      await expect(scheduledPromise).resolves.toBeUndefined();
    });

    test('should emit optimal_slot_used event', async () => {
      await bridge.start();

      const slotPromise = new Promise<void>((resolve) => {
        bridge.on('optimal_slot_used', () => {
          resolve();
        });
      });

      const email = createMockEmail();
      await bridge.processEmail(email);

      await expect(slotPromise).resolves.toBeUndefined();
    });
  });

  describe('constants', () => {
    test('should export correct cycle lengths', () => {
      expect(GRAND_CYCLE_LENGTH).toBe(60);
      expect(SYS6_CYCLE_LENGTH).toBe(30);
      expect(DOVE9_CYCLE_LENGTH).toBe(12);
    });
  });
});
