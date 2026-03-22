/**
 * LLMGoalPlanner Tests
 *
 * Tests the LLM-driven goal planning that wires function-calling
 * into the cognitive tick processor. Uses mock HTTP to test the
 * planning pipeline without real API calls.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LLMGoalPlanner, type PlanningContext } from '../tools/LLMGoalPlanner.js';
import { ToolExecutionEngine } from '../tools/ToolExecutionEngine.js';

// Mock fetch for LLM API calls
const originalFetch = global.fetch;

function mockFetch(response: unknown, status: number = 200): void {
  (global as Record<string, unknown>).fetch = jest.fn<() => Promise<unknown>>().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(response),
    json: async () => response,
  });
}

function restoreFetch(): void {
  global.fetch = originalFetch;
}

describe('LLMGoalPlanner', () => {
  let planner: LLMGoalPlanner;
  let toolEngine: ToolExecutionEngine;

  const basePlanningContext: PlanningContext = {
    percepts: [
      {
        id: 'p1',
        source: 'message',
        content: 'User asked about TypeScript',
        salience: 0.8,
        emotionalValence: 0.3,
        timestamp: Date.now(),
        metadata: {},
      },
    ],
    activeGoals: [],
    recentMemories: ['Previous conversation about coding'],
    emotionalState: 0.2,
    cognitiveLoad: 0.3,
    availableTools: ['shell_exec', 'fs_read', 'fs_write'],
  };

  beforeEach(() => {
    planner = new LLMGoalPlanner({
      apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'test-key',
      model: 'gpt-4o',
      provider: 'openai',
      enableExecution: false, // Don't execute tools in tests
    });

    toolEngine = new ToolExecutionEngine({
      enableShell: true,
      enableFilesystem: true,
      enableHttp: false,
      enableMcp: false,
      defaultTimeout: 5000,
      maxOutputSize: 1024,
      shellAllowlist: [],
      shellDenylist: [],
      workingDirectory: '/tmp',
      rateLimitPerMinute: 100,
    });

    planner.setToolEngine(toolEngine);
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('Planning with OpenAI', () => {
    it('should plan with tool calls from OpenAI response', async () => {
      mockFetch({
        choices: [{
          message: {
            content: 'I should read the TypeScript documentation.',
            tool_calls: [{
              function: {
                name: 'fs_read',
                arguments: JSON.stringify({ path: '/docs/typescript.md' }),
              },
            }],
          },
        }],
        usage: { total_tokens: 150 },
      });

      const result = await planner.plan(basePlanningContext);

      expect(result.goals).toHaveLength(1);
      expect(result.goals[0].toolCalls).toHaveLength(1);
      expect(result.goals[0].toolCalls[0].toolName).toBe('fs_read');
      expect(result.reasoning).toContain('TypeScript');
      expect(result.tokensUsed).toBe(150);
    });

    it('should handle no-action response', async () => {
      mockFetch({
        choices: [{
          message: {
            content: 'No action needed — the system is idle.',
          },
        }],
        usage: { total_tokens: 50 },
      });

      const result = await planner.plan({
        ...basePlanningContext,
        percepts: [],
      });

      expect(result.goals).toHaveLength(0);
      expect(result.reasoning).toContain('No action');
    });

    it('should handle multiple tool calls', async () => {
      mockFetch({
        choices: [{
          message: {
            content: 'Need to check files and run a command.',
            tool_calls: [
              { function: { name: 'fs_list', arguments: JSON.stringify({ path: '/home' }) } },
              { function: { name: 'shell_exec', arguments: JSON.stringify({ command: 'date' }) } },
            ],
          },
        }],
        usage: { total_tokens: 200 },
      });

      const result = await planner.plan(basePlanningContext);

      expect(result.goals).toHaveLength(1);
      expect(result.goals[0].toolCalls).toHaveLength(2);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch({ error: 'Rate limited' }, 429);

      const result = await planner.plan(basePlanningContext);

      expect(result.goals).toHaveLength(0);
      expect(result.reasoning).toContain('Planning failed');
      expect(result.tokensUsed).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      (global as Record<string, unknown>).fetch = jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('Network error'));

      const result = await planner.plan(basePlanningContext);

      expect(result.goals).toHaveLength(0);
      expect(result.reasoning).toContain('Planning failed');
    });
  });

  describe('Planning with Anthropic', () => {
    beforeEach(() => {
      planner = new LLMGoalPlanner({
        apiEndpoint: 'https://api.anthropic.com/v1/messages',
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
        provider: 'anthropic',
        enableExecution: false,
      });
      planner.setToolEngine(toolEngine);
    });

    it('should plan with Anthropic response format', async () => {
      mockFetch({
        content: [
          { type: 'text', text: 'I will read the file.' },
          { type: 'tool_use', name: 'fs_read', input: { path: '/test.txt' } },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await planner.plan(basePlanningContext);

      expect(result.goals).toHaveLength(1);
      expect(result.goals[0].toolCalls[0].toolName).toBe('fs_read');
      expect(result.reasoning).toContain('read the file');
      expect(result.tokensUsed).toBe(150);
    });
  });

  describe('Execution Integration', () => {
    it('should execute tool calls when enabled', async () => {
      const executingPlanner = new LLMGoalPlanner({
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        apiKey: 'test-key',
        model: 'gpt-4o',
        provider: 'openai',
        enableExecution: true,
      });
      executingPlanner.setToolEngine(toolEngine);

      mockFetch({
        choices: [{
          message: {
            content: 'Running a command.',
            tool_calls: [{
              function: {
                name: 'shell_exec',
                arguments: JSON.stringify({ command: 'echo "executed"' }),
              },
            }],
          },
        }],
        usage: { total_tokens: 100 },
      });

      const result = await executingPlanner.plan(basePlanningContext);

      expect(result.executionResults).toHaveLength(1);
      expect(result.executionResults[0].success).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit planning_complete event', async () => {
      const events: unknown[] = [];
      planner.on('planning_complete', (data) => events.push(data));

      mockFetch({
        choices: [{ message: { content: 'Done.' } }],
        usage: { total_tokens: 30 },
      });

      await planner.plan(basePlanningContext);

      expect(events).toHaveLength(1);
      expect((events[0] as { planningCount: number }).planningCount).toBe(1);
    });

    it('should emit planning_failed event on error', async () => {
      const events: unknown[] = [];
      planner.on('planning_failed', (data) => events.push(data));

      (global as Record<string, unknown>).fetch = jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('fail'));

      await planner.plan(basePlanningContext);

      expect(events).toHaveLength(1);
    });
  });

  describe('Statistics', () => {
    it('should track planning stats', async () => {
      mockFetch({
        choices: [{ message: { content: 'test' } }],
        usage: { total_tokens: 50 },
      });

      await planner.plan(basePlanningContext);
      await planner.plan(basePlanningContext);

      const stats = planner.getStats();
      expect(stats.planningCount).toBe(2);
      expect(stats.totalTokensUsed).toBe(100);
      expect(stats.model).toBe('gpt-4o');
      expect(stats.provider).toBe('openai');
    });
  });

  describe('Tool Definition Export', () => {
    it('should provide tools in LLM-compatible format', () => {
      const tools = toolEngine.getToolsForLLM();
      expect(tools.length).toBeGreaterThan(0);

      for (const tool of tools) {
        expect(tool.type).toBe('function');
        expect(typeof tool.function.name).toBe('string');
        expect(typeof tool.function.description).toBe('string');
        expect(tool.function.parameters.type).toBe('object');
        expect(Array.isArray(tool.function.parameters.required)).toBe(true);
      }
    });
  });
});
