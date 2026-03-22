/**
 * Tests for Sys6Dove9Synchronizer - Grand Cycle Synchronization
 */

import {
  Sys6Dove9Synchronizer,
  SYS6_CYCLE_LENGTH,
  DOVE9_CYCLE_LENGTH,
  GRAND_CYCLE_LENGTH,
  type Dove9KernelInterface,
  type Dove9Metrics,
} from '../integration/Sys6Dove9Synchronizer.js';
import { Sys6CycleEngine } from '../engine/Sys6CycleEngine.js';

describe('Sys6Dove9Synchronizer', () => {
  let synchronizer: Sys6Dove9Synchronizer;
  let mockSys6Engine: Sys6CycleEngine;
  let mockDove9Kernel: Dove9KernelInterface;

  // Create mock Dove9 metrics
  const createMockMetrics = (): Dove9Metrics => ({
    totalSteps: 0,
    totalCycles: 0,
    processesCompleted: 0,
    averageLatency: 0,
    streamCoherence: 1.0,
    cognitiveLoad: 0,
    activeCouplings: [],
  });

  beforeEach(() => {
    // Create minimal Sys6 engine
    mockSys6Engine = new Sys6CycleEngine({ dim: 64 });

    // Create mock Dove9 kernel
    const eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();
    mockDove9Kernel = {
      isRunning: jest.fn().mockReturnValue(true),
      getMetrics: jest.fn().mockReturnValue(createMockMetrics()),
      on: jest.fn((event: string, handler: (...args: any[]) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, []);
        }
        eventHandlers.get(event)!.push(handler);
      }),
      off: jest.fn((event: string, handler: (...args: any[]) => void) => {
        const handlers = eventHandlers.get(event);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index !== -1) {
            handlers.splice(index, 1);
          }
        }
      }),
    };

    synchronizer = new Sys6Dove9Synchronizer(mockSys6Engine, mockDove9Kernel, {
      enableGrandCycle: true,
      stepDuration: 10, // Fast for testing
      enableOperadicScheduling: true,
      syncTolerance: 2,
      enableTelemetry: false,
    });
  });

  afterEach(async () => {
    if (synchronizer.isRunning()) {
      await synchronizer.stop();
    }
  });

  describe('constants', () => {
    test('should have correct cycle lengths', () => {
      expect(SYS6_CYCLE_LENGTH).toBe(30);
      expect(DOVE9_CYCLE_LENGTH).toBe(12);
      expect(GRAND_CYCLE_LENGTH).toBe(60);
    });

    test('should verify grand cycle is LCM of Sys6 and Dove9 cycles', () => {
      // LCM(30, 12) = 60
      expect(GRAND_CYCLE_LENGTH % SYS6_CYCLE_LENGTH).toBe(0);
      expect(GRAND_CYCLE_LENGTH % DOVE9_CYCLE_LENGTH).toBe(0);
    });
  });

  describe('initialization', () => {
    test('should initialize with default state', () => {
      const state = synchronizer.getState();
      expect(state.currentStep).toBe(0);
      expect(state.currentGrandCycle).toBe(0);
      expect(state.sys6Step).toBe(0);
      expect(state.dove9Step).toBe(0);
    });

    test('should not be running initially', () => {
      expect(synchronizer.isRunning()).toBe(false);
    });
  });

  describe('start/stop', () => {
    test('should start successfully', async () => {
      await synchronizer.start();
      expect(synchronizer.isRunning()).toBe(true);
    });

    test('should stop successfully', async () => {
      await synchronizer.start();
      await synchronizer.stop();
      expect(synchronizer.isRunning()).toBe(false);
    });

    test('should handle multiple start calls', async () => {
      await synchronizer.start();
      await synchronizer.start(); // Should not throw
      expect(synchronizer.isRunning()).toBe(true);
    });
  });

  describe('cycle progress', () => {
    test('should report grand cycle progress', () => {
      const progress = synchronizer.getGrandCycleProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    test('should report Sys6 cycle progress', () => {
      const progress = synchronizer.getSys6CycleProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    test('should report Dove9 cycle progress', () => {
      const progress = synchronizer.getDove9CycleProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });
  });

  describe('sync points', () => {
    test('should detect sync points at cycle boundaries', () => {
      // At step 0, we're at a sync point
      expect(synchronizer.isAtSyncPoint()).toBe(true);
    });

    test('should calculate next sync point', () => {
      const nextSync = synchronizer.getNextSyncPoint();
      expect(nextSync.stepsUntil).toBeGreaterThan(0);
      expect(['sys6', 'dove9', 'grand']).toContain(nextSync.type);
    });
  });

  describe('operadic scheduling', () => {
    test('should schedule a process', () => {
      const result = synchronizer.scheduleProcess('test-process-1', 5);
      expect(result.processId).toBe('test-process-1');
      expect(result.priority).toBe(5);
      expect(result.scheduledStep).toBeGreaterThan(0);
      expect(result.phase).toBeGreaterThanOrEqual(1);
      expect(result.phase).toBeLessThanOrEqual(3);
      expect(result.stage).toBeGreaterThanOrEqual(1);
      expect(result.stage).toBeLessThanOrEqual(5);
      expect(result.stream).toBeGreaterThanOrEqual(1);
      expect(result.stream).toBeLessThanOrEqual(3);
    });

    test('should retrieve scheduled process', () => {
      synchronizer.scheduleProcess('test-process-2', 7);
      const result = synchronizer.getProcessSchedule('test-process-2');
      expect(result).toBeDefined();
      expect(result?.processId).toBe('test-process-2');
    });

    test('should return all scheduled processes', () => {
      synchronizer.scheduleProcess('proc-1', 5);
      synchronizer.scheduleProcess('proc-2', 8);
      const all = synchronizer.getAllScheduledProcesses();
      expect(all.length).toBe(2);
    });

    test('should clear completed process', () => {
      synchronizer.scheduleProcess('proc-to-clear', 5);
      const cleared = synchronizer.clearCompletedProcess('proc-to-clear');
      expect(cleared).toBe(true);
      const result = synchronizer.getProcessSchedule('proc-to-clear');
      expect(result).toBeUndefined();
    });

    test('should assign higher priority to earlier phases', () => {
      const lowPriority = synchronizer.scheduleProcess('low', 3);
      const highPriority = synchronizer.scheduleProcess('high', 9);
      // High priority should be in phase 1, low priority in phase 3
      expect(highPriority.phase).toBeLessThanOrEqual(lowPriority.phase);
    });
  });

  describe('statistics', () => {
    test('should return sync statistics', () => {
      const stats = synchronizer.getSyncStats();
      expect(stats.grandCycles).toBeDefined();
      expect(stats.sys6Cycles).toBeDefined();
      expect(stats.dove9Cycles).toBeDefined();
      expect(stats.totalSteps).toBeDefined();
      expect(stats.averageDriftMs).toBeDefined();
      expect(stats.syncPointCount).toBeDefined();
    });
  });
});
