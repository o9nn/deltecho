import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * @fileoverview Tests for AgentCoordinator ToolExecutionEngine Integration
 *
 * Verifies that AgentCoordinator properly delegates tasks through
 * ToolExecutionEngine when available, and falls back to structural
 * delegation when no engine is set.
 */
import {
  AgentCoordinator,
  type Agent,
  type Task,
} from '../agents/index.js';
import { ToolExecutionEngine } from '../tools/ToolExecutionEngine.js';

describe('AgentCoordinator ToolEngine Integration', () => {
  let coordinator: AgentCoordinator;

  beforeEach(async () => {
    coordinator = new AgentCoordinator({
      maxConcurrentTasks: 5,
      taskTimeoutMs: 5000,
      enableDynamicAgents: true,
      enableParallelDelegation: true,
      maxAgentDepth: 3,
    });
    await coordinator.start();
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.stop();
    }
  });

  describe('structural delegation (no tool engine)', () => {
    it('should create and process tasks without tool engine', async () => {
      const task = coordinator.createTask(
        'analysis',
        'Analyze test data',
        { data: 'test' },
        'medium'
      );

      expect(task).toBeDefined();
      expect(task.type).toBe('analysis');
      expect(task.status).toBe('pending');
    });

    it('should process tasks through queue', async () => {
      const task = coordinator.createTask(
        'analysis',
        'Analyze data',
        { data: [1, 2, 3] },
        'high'
      );

      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 300));

      const updated = coordinator.getTask(task.id);
      expect(updated).toBeDefined();
      // Task should have been processed
      expect(['in_progress', 'completed', 'failed']).toContain(updated!.status);
    });
  });

  describe('tool engine integration', () => {
    it('should accept a tool engine via setToolEngine', () => {
      const engine = new ToolExecutionEngine();
      expect(() => coordinator.setToolEngine(engine)).not.toThrow();
    });

    it('should process tasks with tool engine set', async () => {
      const engine = new ToolExecutionEngine();
      coordinator.setToolEngine(engine);

      const task = coordinator.createTask(
        'analysis',
        'Analyze with tools',
        { data: 'test' },
        'high'
      );

      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 300));

      const updated = coordinator.getTask(task.id);
      expect(updated).toBeDefined();
    });
  });

  describe('agent registration and selection', () => {
    it('should have default agents registered', () => {
      const agents = coordinator.getAllAgents();
      expect(agents.length).toBeGreaterThan(0);

      const agentNames = agents.map(a => a.name);
      expect(agentNames).toContain('Nested Agency Coordinator');
    });

    it('should register custom agents', () => {
      const initialCount = coordinator.getAllAgents().length;

      coordinator.registerAgent({
        id: `custom-test-agent-${Date.now()}`,
        name: 'custom-test',
        description: 'A custom test agent',
        specialization: 'testing',
        capabilities: [
          { name: 'testing', description: 'Can test', priority: 5 },
        ],
        tools: ['shell'],
        isActive: true,
        childIds: [],
        metadata: {},
        createdAt: Date.now(),
      });

      expect(coordinator.getAllAgents().length).toBeGreaterThanOrEqual(initialCount + 1);
    });

    it('should get agent by ID', () => {
      const agent = coordinator.getAgent('coordinator');
      expect(agent).toBeDefined();
      expect(agent!.id).toBe('coordinator');
    });
  });

  describe('task lifecycle', () => {
    it('should track task status through lifecycle', async () => {
      const task = coordinator.createTask(
        'analysis',
        'Test lifecycle',
        { data: 'test' },
        'medium'
      );

      expect(task.status).toBe('pending');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      const updated = coordinator.getTask(task.id);
      expect(updated).toBeDefined();
      // Should have progressed past pending
      expect(updated!.status).not.toBe('pending');
    });

    it('should list all tasks', () => {
      coordinator.createTask('analysis', 'Task 1', {}, 'low');
      coordinator.createTask('analysis', 'Task 2', {}, 'high');

      const tasks = coordinator.getAllTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should create subtasks with parent reference', () => {
      const parent = coordinator.createTask('parent', 'Parent task', {});
      const child = coordinator.createTask('child', 'Child task', {}, 'medium', parent.id);

      expect(child.parentTaskId).toBe(parent.id);
      const updatedParent = coordinator.getTask(parent.id);
      expect(updatedParent?.subtaskIds).toContain(child.id);
    });
  });

  describe('coordinator state', () => {
    it('should report running state', () => {
      const state = coordinator.getState();
      expect(state.running).toBe(true);
      expect(state.agentCount).toBeGreaterThan(0);
    });

    it('should report stopped state after stop', async () => {
      await coordinator.stop();
      const state = coordinator.getState();
      expect(state.running).toBe(false);
    });
  });
});
