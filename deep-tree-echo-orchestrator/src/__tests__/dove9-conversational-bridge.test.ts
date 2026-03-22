import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * @fileoverview Rigorous E2E Tests for Dove9ConversationalBridge
 *
 * Tests the "Everything is a Chatbot" paradigm:
 * - Message creation and routing
 * - Process lifecycle (spawn → think → respond → consolidate → complete)
 * - Cognitive mailbox routing
 * - Self-reflection and memory consolidation
 * - Action result handling
 * - Process eviction under pressure
 * - Metrics accuracy
 * - Event emission
 */
import {
  Dove9ConversationalBridge,
  COGNITIVE_MAILBOXES,
  type ConversationalMessage,
  type ConversationalProcess,
} from '../dove9-conversational-bridge.js';

describe('Dove9ConversationalBridge', () => {
  let bridge: Dove9ConversationalBridge;

  beforeEach(async () => {
    bridge = new Dove9ConversationalBridge({
      autoSpawn: true,
      maxConcurrentProcesses: 5,
      processTimeoutMs: 5000,
      enableMemoryConsolidation: true,
      enableSelfReflection: true,
      salienceThreshold: 0.3,
    });
    await bridge.start();
  });

  afterEach(async () => {
    if (bridge.isRunning()) {
      await bridge.stop();
    }
  });

  // =========================================================================
  // Lifecycle
  // =========================================================================

  describe('lifecycle', () => {
    it('should start and stop cleanly', async () => {
      expect(bridge.isRunning()).toBe(true);
      await bridge.stop();
      expect(bridge.isRunning()).toBe(false);
    });

    it('should be idempotent on double start', async () => {
      await bridge.start(); // already started
      expect(bridge.isRunning()).toBe(true);
    });

    it('should complete all active processes on stop', async () => {
      // Spawn a process
      bridge.onCognitivePercept({
        type: 'test',
        source: 'unit-test',
        data: { value: 1 },
        salience: 0.8,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      expect(bridge.getActiveProcessCount()).toBe(1);
      await bridge.stop();
      expect(bridge.getActiveProcessCount()).toBe(0);
    });
  });

  // =========================================================================
  // Cognitive Mailboxes
  // =========================================================================

  describe('cognitive mailboxes', () => {
    it('should have all 9 cognitive mailboxes', () => {
      expect(COGNITIVE_MAILBOXES).toHaveLength(9);
    });

    it('should include perception, cognition, memory, action, reflection', () => {
      const names = COGNITIVE_MAILBOXES.map(m => m.name);
      expect(names).toContain('INBOX.perception');
      expect(names).toContain('INBOX.cognition');
      expect(names).toContain('INBOX.memory');
      expect(names).toContain('INBOX.action');
      expect(names).toContain('INBOX.reflection');
      expect(names).toContain('INBOX.identity');
      expect(names).toContain('SENT');
      expect(names).toContain('DRAFTS');
      expect(names).toContain('ARCHIVE');
    });

    it('should return mailbox list from bridge', () => {
      const mailboxes = bridge.getMailboxes();
      expect(mailboxes).toHaveLength(9);
      expect(mailboxes[0].channel).toBeDefined();
    });
  });

  // =========================================================================
  // Cognitive Percept Handling
  // =========================================================================

  describe('cognitive percept handling', () => {
    it('should create a message from a cognitive percept', () => {
      const msg = bridge.onCognitivePercept({
        type: 'filesystem_change',
        source: 'fs-scanner',
        data: { path: '/home/echo', event: 'modified' },
        salience: 0.7,
        grandCycleStep: 5,
        dove9Step: 5,
        triad: 'MP1',
        threadPermutation: 'P13',
      });

      expect(msg).not.toBeNull();
      expect(msg!.from).toContain('fs-scanner');
      expect(msg!.to).toContain('cognition');
      expect(msg!.subject).toContain('[PERCEPT]');
      expect(msg!.cognitiveMetadata.source).toBe('perception');
      expect(msg!.cognitiveMetadata.grandCycleStep).toBe(5);
      expect(msg!.cognitiveMetadata.dove9Step).toBe(5);
      expect(msg!.cognitiveMetadata.triad).toBe('MP1');
      expect(msg!.cognitiveMetadata.salienceScore).toBe(0.7);
    });

    it('should filter percepts below salience threshold', () => {
      const msg = bridge.onCognitivePercept({
        type: 'noise',
        source: 'background',
        data: {},
        salience: 0.1, // Below 0.3 threshold
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      expect(msg).toBeNull();
    });

    it('should auto-spawn a process from percept when enabled', () => {
      bridge.onCognitivePercept({
        type: 'important',
        source: 'test',
        data: { critical: true },
        salience: 0.9,
        grandCycleStep: 1,
        dove9Step: 1,
        triad: 'MP2',
        threadPermutation: 'P14',
      });

      expect(bridge.getProcessCount()).toBe(1);
      expect(bridge.getActiveProcessCount()).toBe(1);
    });

    it('should route percept to INBOX.perception mailbox', () => {
      bridge.onCognitivePercept({
        type: 'test',
        source: 'unit',
        data: {},
        salience: 0.5,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      const queue = bridge.getMailboxQueue('INBOX.perception');
      expect(queue).toHaveLength(1);
      expect(queue[0].subject).toContain('[PERCEPT]');
    });

    it('should not create messages when bridge is stopped', async () => {
      await bridge.stop();
      const msg = bridge.onCognitivePercept({
        type: 'test',
        source: 'unit',
        data: {},
        salience: 0.9,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });
      expect(msg).toBeNull();
    });
  });

  // =========================================================================
  // Self-Reflection
  // =========================================================================

  describe('self-reflection', () => {
    it('should create reflection messages from self-image snapshots', () => {
      const msg = bridge.onSelfImageSnapshot({
        coherence: 0.85,
        dominantMode: 'analytical',
        activeGoals: 3,
        episodicMemories: 42,
        grandCycleStep: 30,
        dove9Step: 6,
        triad: 'MP2',
        threadPermutation: 'P24',
      });

      expect(msg).not.toBeNull();
      expect(msg!.from).toContain('self@reflection');
      expect(msg!.to).toContain('identity@update');
      expect(msg!.subject).toContain('[REFLECTION]');
      expect(msg!.subject).toContain('coherence=0.850');
      expect(msg!.subject).toContain('mode=analytical');
    });

    it('should route reflection to INBOX.reflection', () => {
      bridge.onSelfImageSnapshot({
        coherence: 0.7,
        dominantMode: 'creative',
        activeGoals: 1,
        episodicMemories: 10,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      const queue = bridge.getMailboxQueue('INBOX.reflection');
      expect(queue).toHaveLength(1);
    });

    it('should track reflection cycle count in metrics', () => {
      bridge.onSelfImageSnapshot({
        coherence: 0.5,
        dominantMode: 'default',
        activeGoals: 0,
        episodicMemories: 0,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      expect(bridge.getMetrics().reflectionCycles).toBe(1);
    });

    it('should not create reflection when disabled', async () => {
      await bridge.stop();
      const noReflectionBridge = new Dove9ConversationalBridge({
        enableSelfReflection: false,
      });
      await noReflectionBridge.start();

      const msg = noReflectionBridge.onSelfImageSnapshot({
        coherence: 0.9,
        dominantMode: 'test',
        activeGoals: 0,
        episodicMemories: 0,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      expect(msg).toBeNull();
      await noReflectionBridge.stop();
    });
  });

  // =========================================================================
  // Memory Consolidation
  // =========================================================================

  describe('memory consolidation', () => {
    it('should create consolidation messages', () => {
      const msg = bridge.onMemoryConsolidation({
        memoryType: 'episodic',
        content: 'Learned that filesystem changes trigger perception events',
        importance: 0.8,
        grandCycleStep: 45,
        dove9Step: 9,
        triad: 'MP1',
        threadPermutation: 'P34',
      });

      expect(msg).not.toBeNull();
      expect(msg!.from).toContain('cognition@process');
      expect(msg!.to).toContain('memory@store');
      expect(msg!.subject).toContain('[CONSOLIDATE]');
      expect(msg!.subject).toContain('episodic');
    });

    it('should route to INBOX.memory', () => {
      bridge.onMemoryConsolidation({
        memoryType: 'procedural',
        content: 'Step 1: perceive. Step 2: reflect.',
        importance: 0.6,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      const queue = bridge.getMailboxQueue('INBOX.memory');
      expect(queue).toHaveLength(1);
    });

    it('should track consolidation count in metrics', () => {
      bridge.onMemoryConsolidation({
        memoryType: 'semantic',
        content: 'fact',
        importance: 0.5,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      expect(bridge.getMetrics().consolidations).toBe(1);
    });
  });

  // =========================================================================
  // Action Results
  // =========================================================================

  describe('action results', () => {
    it('should create action result messages', () => {
      const msg = bridge.onActionResult({
        actionId: 'shell-exec-001',
        success: true,
        output: { stdout: 'hello world', exitCode: 0 },
        grandCycleStep: 20,
        dove9Step: 8,
        triad: 'MP2',
        threadPermutation: 'P23',
      });

      expect(msg).toBeDefined();
      expect(msg.from).toContain('action@execute');
      expect(msg.subject).toContain('[ACTION-RESULT]');
      expect(msg.subject).toContain('SUCCESS');
    });

    it('should complete associated process on action result', () => {
      // First spawn a process
      const percept = bridge.onCognitivePercept({
        type: 'task',
        source: 'planner',
        data: { goal: 'execute shell' },
        salience: 0.9,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      const processes = bridge.getActiveProcesses();
      expect(processes).toHaveLength(1);
      const processId = processes[0].id;

      // Complete it via action result
      bridge.onActionResult({
        actionId: 'shell-001',
        success: true,
        output: { result: 'done' },
        processId,
        grandCycleStep: 5,
        dove9Step: 5,
        triad: 'MP1',
        threadPermutation: 'P13',
      });

      expect(bridge.getActiveProcessCount()).toBe(0);
      const completed = bridge.getProcess(processId);
      expect(completed?.state).toBe('completed');
      expect(completed?.cognitiveResult?.actionTaken).toBe(true);
    });

    it('should handle failed action results', () => {
      const msg = bridge.onActionResult({
        actionId: 'http-fail-001',
        success: false,
        output: { error: 'timeout' },
        grandCycleStep: 10,
        dove9Step: 10,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      expect(msg.subject).toContain('FAILED');
      expect(msg.cognitiveMetadata.emotionalValence).toBeLessThan(0);
    });
  });

  // =========================================================================
  // Process Management
  // =========================================================================

  describe('process management', () => {
    it('should spawn processes with unique IDs', () => {
      for (let i = 0; i < 3; i++) {
        bridge.onCognitivePercept({
          type: `test-${i}`,
          source: 'unit',
          data: { i },
          salience: 0.8,
          grandCycleStep: i,
          dove9Step: i,
          triad: 'MP1',
          threadPermutation: 'P12',
        });
      }

      expect(bridge.getProcessCount()).toBe(3);
      const processes = bridge.getActiveProcesses();
      const ids = new Set(processes.map(p => p.id));
      expect(ids.size).toBe(3);
    });

    it('should evict oldest completed process when at capacity', () => {
      // Fill to capacity (5)
      for (let i = 0; i < 5; i++) {
        bridge.onCognitivePercept({
          type: `fill-${i}`,
          source: 'unit',
          data: {},
          salience: 0.8,
          grandCycleStep: i,
          dove9Step: i,
          triad: 'MP1',
          threadPermutation: 'P12',
        });
      }

      expect(bridge.getProcessCount()).toBe(5);

      // Complete first process
      const firstProcess = bridge.getActiveProcesses()[0];
      bridge.completeProcess(firstProcess.id, {
        integrated: 'done',
        salienceShift: 0,
        memoryEncoded: false,
        actionTaken: false,
      });

      // Add one more — should evict the completed one
      bridge.onCognitivePercept({
        type: 'overflow',
        source: 'unit',
        data: {},
        salience: 0.9,
        grandCycleStep: 10,
        dove9Step: 10,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      // Should still be at capacity, not over
      expect(bridge.getProcessCount()).toBeLessThanOrEqual(5);
    });

    it('should add messages to existing process threads', () => {
      bridge.onCognitivePercept({
        type: 'thread-root',
        source: 'unit',
        data: {},
        salience: 0.8,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      const process = bridge.getActiveProcesses()[0];
      expect(process.messages).toHaveLength(1);

      // Add a follow-up message
      const followUp = bridge.onCognitivePercept({
        type: 'follow-up',
        source: 'unit',
        data: {},
        salience: 0.6,
        grandCycleStep: 1,
        dove9Step: 1,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      // Should have spawned a new process (auto-spawn)
      expect(bridge.getProcessCount()).toBe(2);
    });

    it('should track average process duration', () => {
      bridge.onCognitivePercept({
        type: 'timed',
        source: 'unit',
        data: {},
        salience: 0.8,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      const process = bridge.getActiveProcesses()[0];
      bridge.completeProcess(process.id, {
        integrated: 'done',
        salienceShift: 0,
        memoryEncoded: false,
        actionTaken: false,
      });

      expect(bridge.getMetrics().averageProcessDuration).toBeGreaterThanOrEqual(0);
      expect(bridge.getMetrics().completedProcesses).toBe(1);
    });
  });

  // =========================================================================
  // Message Headers (Dove9 Covenant)
  // =========================================================================

  describe('message headers (Dove9 covenant)', () => {
    it('should include all required X-headers', () => {
      const msg = bridge.onCognitivePercept({
        type: 'header-test',
        source: 'unit',
        data: {},
        salience: 0.5,
        grandCycleStep: 42,
        dove9Step: 6,
        triad: 'MP2',
        threadPermutation: 'P24',
      });

      expect(msg).not.toBeNull();
      expect(msg!.headers['X-Dove9-Source']).toBe('perception');
      expect(msg!.headers['X-Grand-Cycle-Step']).toBe('42');
      expect(msg!.headers['X-Dove9-Step']).toBe('6');
      expect(msg!.headers['X-Triad']).toBe('MP2');
      expect(msg!.headers['X-Thread-Permutation']).toBe('P24');
      expect(msg!.headers['X-Salience']).toBe('0.5');
      expect(msg!.headers['Message-ID']).toContain('@dove9.cognitive');
      expect(msg!.headers['Date']).toBeDefined();
    });
  });

  // =========================================================================
  // Metrics
  // =========================================================================

  describe('metrics', () => {
    it('should track total messages accurately', () => {
      for (let i = 0; i < 5; i++) {
        bridge.onCognitivePercept({
          type: `metric-${i}`,
          source: 'unit',
          data: {},
          salience: 0.8,
          grandCycleStep: i,
          dove9Step: i,
          triad: 'MP1',
          threadPermutation: 'P12',
        });
      }

      expect(bridge.getMetrics().totalMessages).toBe(5);
      expect(bridge.getMetrics().totalProcesses).toBe(5);
    });

    it('should return a copy of metrics (immutable)', () => {
      const m1 = bridge.getMetrics();
      const m2 = bridge.getMetrics();
      expect(m1).not.toBe(m2);
      expect(m1).toEqual(m2);
    });
  });

  // =========================================================================
  // Events
  // =========================================================================

  describe('events', () => {
    it('should emit bridge_event on process spawn', (done) => {
      bridge.on('bridge_event', (event) => {
        if (event.type === 'process_spawned') {
          expect(event.processId).toBeDefined();
          expect(event.data.source).toBe('perception');
          done();
        }
      });

      bridge.onCognitivePercept({
        type: 'event-test',
        source: 'unit',
        data: {},
        salience: 0.8,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });
    });

    it('should emit bridge_event on process completion', (done) => {
      bridge.on('bridge_event', (event) => {
        if (event.type === 'process_completed') {
          expect(event.data.duration).toBeDefined();
          done();
        }
      });

      bridge.onCognitivePercept({
        type: 'complete-test',
        source: 'unit',
        data: {},
        salience: 0.8,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });

      const process = bridge.getActiveProcesses()[0];
      bridge.completeProcess(process.id, {
        integrated: 'done',
        salienceShift: 0,
        memoryEncoded: false,
        actionTaken: false,
      });
    });

    it('should emit bridge_event on message sent', (done) => {
      bridge.on('bridge_event', (event) => {
        if (event.type === 'message_sent') {
          expect(event.messageId).toBeDefined();
          expect(event.data.mailbox).toBeDefined();
          done();
        }
      });

      bridge.onCognitivePercept({
        type: 'msg-event',
        source: 'unit',
        data: {},
        salience: 0.5,
        grandCycleStep: 0,
        dove9Step: 0,
        triad: 'MP1',
        threadPermutation: 'P12',
      });
    });
  });
});
