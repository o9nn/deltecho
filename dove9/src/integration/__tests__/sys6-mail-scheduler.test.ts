/**
 * Tests for Sys6MailScheduler
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  Sys6MailScheduler,
  MailScheduleResult,
  SYS6_CYCLE_LENGTH,
  DOVE9_CYCLE_LENGTH,
  GRAND_CYCLE_LENGTH,
} from '../sys6-mail-scheduler.js';
import type { MailMessage } from '../../types/mail.js';
import type { MessageProcess } from '../../types/index.js';

// Mock MailMessage factory
function createMockMail(overrides: Partial<MailMessage> = {}): MailMessage {
  return {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    subject: 'Test Message',
    body: 'Test body content',
    headers: new Map(),
    timestamp: new Date(),
    receivedAt: new Date(),
    mailbox: 'INBOX',
    ...overrides,
  };
}

// Mock MessageProcess factory
function createMockProcess(
  mail: MailMessage,
  overrides: Partial<MessageProcess> = {}
): MessageProcess {
  return {
    id: `proc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    messageId: mail.messageId,
    from: mail.from,
    to: mail.to,
    subject: mail.subject,
    content: mail.body,
    state: 'pending' as any,
    priority: 5,
    createdAt: new Date(),
    currentStep: 0,
    currentStream: 1 as any,
    cognitiveContext: {
      relevantMemories: [],
      emotionalValence: 0,
      emotionalArousal: 0.5,
      salienceScore: 0.5,
      attentionWeight: 1.0,
      activeCouplings: [],
    },
    childIds: [],
    executionHistory: [],
    ...overrides,
  };
}

describe('Sys6MailScheduler', () => {
  let scheduler: Sys6MailScheduler;

  beforeEach(() => {
    scheduler = new Sys6MailScheduler(10, {
      enableOperadicScheduling: true,
      maxProcessesPerGrandCycle: 30,
    });
  });

  afterEach(() => {
    if (scheduler.isRunning()) {
      scheduler.stop();
    }
  });

  describe('constants', () => {
    test('should have correct cycle lengths', () => {
      expect(SYS6_CYCLE_LENGTH).toBe(30);
      expect(DOVE9_CYCLE_LENGTH).toBe(12);
      expect(GRAND_CYCLE_LENGTH).toBe(60);
    });

    test('should verify grand cycle is LCM of Sys6 and Dove9', () => {
      expect(GRAND_CYCLE_LENGTH % SYS6_CYCLE_LENGTH).toBe(0);
      expect(GRAND_CYCLE_LENGTH % DOVE9_CYCLE_LENGTH).toBe(0);
    });
  });

  describe('initialization', () => {
    test('should initialize with default state', () => {
      const state = scheduler.getState();
      expect(state.currentStep).toBe(0);
      expect(state.currentGrandCycle).toBe(0);
      expect(state.sys6Step).toBe(0);
      expect(state.dove9Step).toBe(0);
    });

    test('should not be running initially', () => {
      expect(scheduler.isRunning()).toBe(false);
    });

    test('should have empty process queue initially', () => {
      expect(scheduler.getPendingCount()).toBe(0);
    });
  });

  describe('start/stop', () => {
    test('should start successfully', () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
    });

    test('should stop successfully', () => {
      scheduler.start();
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    test('should handle multiple start calls', () => {
      scheduler.start();
      scheduler.start(); // Should not throw
      expect(scheduler.isRunning()).toBe(true);
    });

    test('should handle multiple stop calls', () => {
      scheduler.start();
      scheduler.stop();
      scheduler.stop(); // Should not throw
      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('scheduling', () => {
    test('should schedule a mail message', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail, { priority: 5 });

      const result = scheduler.scheduleMailMessage(mail, process);

      expect(result.processId).toBe(process.id);
      expect(result.messageId).toBe(mail.messageId);
      expect(result.priority).toBe(5);
      expect(result.scheduledStep).toBeGreaterThan(0);
    });

    test('should track scheduled process', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      scheduler.scheduleMailMessage(mail, process);

      const schedule = scheduler.getSchedule(process.id);
      expect(schedule).toBeDefined();
      expect(schedule?.processId).toBe(process.id);
    });

    test('should return all scheduled processes', () => {
      const mail1 = createMockMail();
      const mail2 = createMockMail();
      const process1 = createMockProcess(mail1);
      const process2 = createMockProcess(mail2);

      scheduler.scheduleMailMessage(mail1, process1);
      scheduler.scheduleMailMessage(mail2, process2);

      const all = scheduler.getAllSchedules();
      expect(all.length).toBe(2);
    });

    test('should increase pending count on schedule', () => {
      expect(scheduler.getPendingCount()).toBe(0);

      const mail = createMockMail();
      const process = createMockProcess(mail);
      scheduler.scheduleMailMessage(mail, process);

      expect(scheduler.getPendingCount()).toBe(1);
    });
  });

  describe('priority handling', () => {
    test('should assign high priority to earlier phases', () => {
      const highPriorityMail = createMockMail();
      const highPriorityProcess = createMockProcess(highPriorityMail, { priority: 9 });

      const lowPriorityMail = createMockMail();
      const lowPriorityProcess = createMockProcess(lowPriorityMail, { priority: 2 });

      const highResult = scheduler.scheduleMailMessage(highPriorityMail, highPriorityProcess);
      const lowResult = scheduler.scheduleMailMessage(lowPriorityMail, lowPriorityProcess);

      // High priority should be in phase 1, low priority in phase 3
      expect(highResult.sys6Phase).toBe(1);
      expect(lowResult.sys6Phase).toBe(3);
    });

    test('should boost priority for urgent messages', () => {
      const urgentMail = createMockMail({ subject: 'URGENT: Please respond' });
      const process = createMockProcess(urgentMail, { priority: 5 });

      const result = scheduler.scheduleMailMessage(urgentMail, process);

      // Priority should be boosted by 3 (urgent boost)
      expect(result.priority).toBe(8);
    });

    test('should boost priority for reply messages', () => {
      const replyMail = createMockMail({ subject: 'Re: Previous message' });
      const process = createMockProcess(replyMail, { priority: 5 });

      const result = scheduler.scheduleMailMessage(replyMail, process);

      // Priority should be boosted by 1 (reply boost)
      expect(result.priority).toBe(6);
    });

    test('should clamp priority to valid range', () => {
      const extremeUrgentMail = createMockMail({
        subject: 'URGENT CRITICAL IMPORTANT ASAP',
      });
      const process = createMockProcess(extremeUrgentMail, { priority: 10 });

      const result = scheduler.scheduleMailMessage(extremeUrgentMail, process);

      // Priority should be clamped to 10
      expect(result.priority).toBe(10);
    });
  });

  describe('operadic scheduling', () => {
    test('should assign valid Sys6 phase (1-3)', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      const result = scheduler.scheduleMailMessage(mail, process);

      expect(result.sys6Phase).toBeGreaterThanOrEqual(1);
      expect(result.sys6Phase).toBeLessThanOrEqual(3);
    });

    test('should assign valid Sys6 stage (1-5)', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      const result = scheduler.scheduleMailMessage(mail, process);

      expect(result.sys6Stage).toBeGreaterThanOrEqual(1);
      expect(result.sys6Stage).toBeLessThanOrEqual(5);
    });

    test('should assign valid Sys6 step (1-2)', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      const result = scheduler.scheduleMailMessage(mail, process);

      expect(result.sys6Step).toBeGreaterThanOrEqual(1);
      expect(result.sys6Step).toBeLessThanOrEqual(2);
    });

    test('should assign valid Dove9 stream (1-3)', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      const result = scheduler.scheduleMailMessage(mail, process);

      expect(result.dove9Stream).toBeGreaterThanOrEqual(1);
      expect(result.dove9Stream).toBeLessThanOrEqual(3);
    });

    test('should assign valid Dove9 triad (0-3)', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      const result = scheduler.scheduleMailMessage(mail, process);

      expect(result.dove9Triad).toBeGreaterThanOrEqual(0);
      expect(result.dove9Triad).toBeLessThanOrEqual(3);
    });

    test('should calculate estimated completion step', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      const result = scheduler.scheduleMailMessage(mail, process);

      expect(result.estimatedCompletionStep).toBeGreaterThan(result.scheduledStep);
    });
  });

  describe('process completion', () => {
    test('should mark process as completed', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      scheduler.scheduleMailMessage(mail, process);
      expect(scheduler.getPendingCount()).toBe(1);

      scheduler.completeProcess(process.id);
      expect(scheduler.getPendingCount()).toBe(0);
    });

    test('should emit process_completed event', (done) => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      scheduler.on('process_completed', (event) => {
        expect(event.processId).toBe(process.id);
        done();
      });

      scheduler.scheduleMailMessage(mail, process);
      scheduler.completeProcess(process.id);
    });

    test('should remove schedule after completion', () => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      scheduler.scheduleMailMessage(mail, process);
      scheduler.completeProcess(process.id);

      const schedule = scheduler.getSchedule(process.id);
      expect(schedule).toBeUndefined();
    });
  });

  describe('cycle positions', () => {
    test('should return current cycle positions', () => {
      const positions = scheduler.getCyclePositions();

      expect(positions.grandCycle).toBe(0);
      expect(positions.grandStep).toBe(0);
      expect(positions.sys6Cycle).toBe(0);
      expect(positions.sys6Step).toBe(0);
      expect(positions.dove9Cycle).toBe(0);
      expect(positions.dove9Step).toBe(0);
    });

    test('should return valid progress values', () => {
      const positions = scheduler.getCyclePositions();

      expect(positions.sys6Progress).toBeGreaterThanOrEqual(0);
      expect(positions.sys6Progress).toBeLessThanOrEqual(1);
      expect(positions.dove9Progress).toBeGreaterThanOrEqual(0);
      expect(positions.dove9Progress).toBeLessThanOrEqual(1);
      expect(positions.grandProgress).toBeGreaterThanOrEqual(0);
      expect(positions.grandProgress).toBeLessThanOrEqual(1);
    });
  });

  describe('next optimal slot', () => {
    test('should return next optimal slot for high priority', () => {
      const slot = scheduler.getNextSlot(9);

      expect(slot.phase).toBe(1); // High priority = phase 1
      expect(slot.step).toBeGreaterThan(0);
      expect(slot.stream).toBeGreaterThanOrEqual(1);
      expect(slot.stream).toBeLessThanOrEqual(3);
    });

    test('should return next optimal slot for medium priority', () => {
      const slot = scheduler.getNextSlot(5);

      expect(slot.phase).toBe(2); // Medium priority = phase 2
    });

    test('should return next optimal slot for low priority', () => {
      const slot = scheduler.getNextSlot(2);

      expect(slot.phase).toBe(3); // Low priority = phase 3
    });
  });

  describe('FIFO fallback', () => {
    test('should use simple FIFO when operadic scheduling is disabled', () => {
      const fifoScheduler = new Sys6MailScheduler(10, {
        enableOperadicScheduling: false,
      });

      const mail1 = createMockMail();
      const mail2 = createMockMail();
      const process1 = createMockProcess(mail1);
      const process2 = createMockProcess(mail2);

      const result1 = fifoScheduler.scheduleMailMessage(mail1, process1);
      const result2 = fifoScheduler.scheduleMailMessage(mail2, process2);

      // FIFO should schedule in order
      expect(result1.scheduledStep).toBe(1);
      expect(result2.scheduledStep).toBe(2);

      // All phase/stage/step/stream should be 1
      expect(result1.sys6Phase).toBe(1);
      expect(result1.sys6Stage).toBe(1);
      expect(result1.sys6Step).toBe(1);
      expect(result1.dove9Stream).toBe(1);
    });
  });

  describe('events', () => {
    test('should emit process_scheduled event', (done) => {
      const mail = createMockMail();
      const process = createMockProcess(mail);

      scheduler.on('process_scheduled', (event) => {
        expect(event.result.processId).toBe(process.id);
        done();
      });

      scheduler.scheduleMailMessage(mail, process);
    });

    test('should emit capacity_warning when limit exceeded', (done) => {
      const smallCapacityScheduler = new Sys6MailScheduler(10, {
        maxProcessesPerGrandCycle: 2,
      });

      smallCapacityScheduler.on('capacity_warning', (event) => {
        expect(event.activeCount).toBe(2);
        expect(event.maxCount).toBe(2);
        done();
      });

      // Schedule 3 processes to trigger warning
      for (let i = 0; i < 3; i++) {
        const mail = createMockMail();
        const process = createMockProcess(mail);
        smallCapacityScheduler.scheduleMailMessage(mail, process);
      }
    });
  });
});
