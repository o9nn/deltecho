/**
 * ToolExecutionEngine Tests
 *
 * Tests the real tool execution engine that replaces setTimeout(100) mock.
 * Covers shell execution, filesystem ops, HTTP requests, custom tools,
 * rate limiting, safety checks, and statistics.
 */
import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import { ToolExecutionEngine, type ToolCall, type ToolDefinition } from '../tools/ToolExecutionEngine.js';

describe('ToolExecutionEngine', () => {
  let engine: ToolExecutionEngine;

  beforeEach(() => {
    engine = new ToolExecutionEngine({
      defaultTimeout: 5000,
      maxOutputSize: 1024 * 100,
      enableShell: true,
      enableFilesystem: true,
      enableHttp: true,
      enableMcp: false, // Disable MCP for tests (no manus-mcp-cli in test env)
      rateLimitPerMinute: 100,
      workingDirectory: '/tmp',
    });
  });

  describe('Tool Registration', () => {
    it('should register builtin tools', () => {
      const tools = engine.getToolDefinitions();
      const names = tools.map(t => t.name);
      expect(names).toContain('shell_exec');
      expect(names).toContain('fs_read');
      expect(names).toContain('fs_write');
      expect(names).toContain('fs_list');
      expect(names).toContain('http_request');
    });

    it('should register custom tools', () => {
      engine.registerCustomTool(
        'my_tool',
        'A custom tool',
        [{ name: 'input', type: 'string', description: 'Input', required: true }],
        async (args) => ({ result: `processed: ${args.input}` })
      );

      const tools = engine.getToolDefinitions();
      expect(tools.find(t => t.name === 'my_tool')).toBeDefined();
    });

    it('should generate LLM-compatible tool definitions', () => {
      const llmTools = engine.getToolsForLLM();
      expect(llmTools.length).toBeGreaterThan(0);

      for (const tool of llmTools) {
        expect(tool.type).toBe('function');
        expect(tool.function.name).toBeDefined();
        expect(tool.function.description).toBeDefined();
        expect(tool.function.parameters.type).toBe('object');
      }
    });
  });

  describe('Shell Execution', () => {
    it('should execute shell commands', async () => {
      const call: ToolCall = {
        id: 'test-1',
        toolName: 'shell_exec',
        arguments: { command: 'echo "hello world"' },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(true);
      expect((result.output as { stdout: string }).stdout).toBe('hello world');
    });

    it('should capture stderr', async () => {
      const call: ToolCall = {
        id: 'test-2',
        toolName: 'shell_exec',
        arguments: { command: 'echo "error" >&2' },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(true);
      expect((result.output as { stderr: string }).stderr).toBe('error');
    });

    it('should deny dangerous commands', async () => {
      const call: ToolCall = {
        id: 'test-3',
        toolName: 'shell_exec',
        arguments: { command: 'rm -rf /' },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(false);
      expect(result.error).toContain('denied by security policy');
    });

    it('should timeout long-running commands', async () => {
      const call: ToolCall = {
        id: 'test-4',
        toolName: 'shell_exec',
        arguments: { command: 'sleep 60', timeout: 100 },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(false);
    }, 10000);

    it('should handle command failures', async () => {
      const call: ToolCall = {
        id: 'test-5',
        toolName: 'shell_exec',
        arguments: { command: 'false' },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(false);
    });
  });

  describe('Filesystem Operations', () => {
    const testFile = '/tmp/dte-test-' + Date.now() + '.txt';

    afterAll(async () => {
      try {
        const fs = await import('node:fs/promises');
        await fs.unlink(testFile);
      } catch { /* ignore */ }
    });

    it('should write files', async () => {
      const call: ToolCall = {
        id: 'fs-1',
        toolName: 'fs_write',
        arguments: { path: testFile, content: 'Hello from DTE' },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(true);
      expect((result.output as { bytesWritten: number }).bytesWritten).toBe(14);
    });

    it('should read files', async () => {
      // First write
      await engine.execute({
        id: 'fs-2a',
        toolName: 'fs_write',
        arguments: { path: testFile, content: 'Read test content' },
        timestamp: Date.now(),
      });

      const call: ToolCall = {
        id: 'fs-2b',
        toolName: 'fs_read',
        arguments: { path: testFile },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(true);
      expect((result.output as { content: string }).content).toBe('Read test content');
    });

    it('should list directories', async () => {
      const call: ToolCall = {
        id: 'fs-3',
        toolName: 'fs_list',
        arguments: { path: '/tmp' },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(true);
      expect((result.output as { entries: unknown[] }).entries.length).toBeGreaterThan(0);
    });

    it('should handle non-existent files', async () => {
      const call: ToolCall = {
        id: 'fs-4',
        toolName: 'fs_read',
        arguments: { path: '/tmp/nonexistent-file-' + Date.now() },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(false);
    });
  });

  describe('Custom Tool Execution', () => {
    it('should execute custom tools', async () => {
      engine.registerCustomTool(
        'echo_tool',
        'Echoes input',
        [{ name: 'message', type: 'string', description: 'Message', required: true }],
        async (args) => ({ echoed: args.message })
      );

      const call: ToolCall = {
        id: 'custom-1',
        toolName: 'echo_tool',
        arguments: { message: 'hello' },
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(true);
      expect((result.output as { echoed: string }).echoed).toBe('hello');
    });

    it('should handle custom tool errors', async () => {
      engine.registerCustomTool(
        'error_tool',
        'Always fails',
        [],
        async () => { throw new Error('Custom error'); }
      );

      const call: ToolCall = {
        id: 'custom-2',
        toolName: 'error_tool',
        arguments: {},
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Custom error');
    });
  });

  describe('Unknown Tools', () => {
    it('should handle unknown tool names', async () => {
      const call: ToolCall = {
        id: 'unknown-1',
        toolName: 'nonexistent_tool',
        arguments: {},
        timestamp: Date.now(),
      };

      const result = await engine.execute(call);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });
  });

  describe('Sequence Execution', () => {
    it('should execute tools in sequence', async () => {
      const calls: ToolCall[] = [
        { id: 'seq-1', toolName: 'shell_exec', arguments: { command: 'echo "step 1"' }, timestamp: Date.now() },
        { id: 'seq-2', toolName: 'shell_exec', arguments: { command: 'echo "step 2"' }, timestamp: Date.now() },
      ];

      const results = await engine.executeSequence(calls);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should stop sequence on failure', async () => {
      const calls: ToolCall[] = [
        { id: 'seq-3', toolName: 'shell_exec', arguments: { command: 'echo "ok"' }, timestamp: Date.now() },
        { id: 'seq-4', toolName: 'shell_exec', arguments: { command: 'false' }, timestamp: Date.now() },
        { id: 'seq-5', toolName: 'shell_exec', arguments: { command: 'echo "should not run"' }, timestamp: Date.now() },
      ];

      const results = await engine.executeSequence(calls);
      expect(results).toHaveLength(2); // Stops after failure
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit tool_call_start and tool_call_complete events', async () => {
      const events: string[] = [];
      engine.on('tool_call_start', () => events.push('start'));
      engine.on('tool_call_complete', () => events.push('complete'));

      await engine.execute({
        id: 'event-1',
        toolName: 'shell_exec',
        arguments: { command: 'echo "test"' },
        timestamp: Date.now(),
      });

      expect(events).toEqual(['start', 'complete']);
    });
  });

  describe('Statistics', () => {
    it('should track call history', async () => {
      await engine.execute({
        id: 'stat-1',
        toolName: 'shell_exec',
        arguments: { command: 'echo "test"' },
        timestamp: Date.now(),
      });

      const history = engine.getCallHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
      expect(history[0].duration).toBeGreaterThan(0);
    });

    it('should report aggregate stats', async () => {
      await engine.execute({
        id: 'stat-2a',
        toolName: 'shell_exec',
        arguments: { command: 'echo "ok"' },
        timestamp: Date.now(),
      });
      await engine.execute({
        id: 'stat-2b',
        toolName: 'shell_exec',
        arguments: { command: 'false' },
        timestamp: Date.now(),
      });

      const stats = engine.getStats();
      expect(stats.totalCalls).toBe(2);
      expect(stats.successfulCalls).toBe(1);
      expect(stats.failedCalls).toBe(1);
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.registeredTools).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const limitedEngine = new ToolExecutionEngine({
        rateLimitPerMinute: 2,
        enableShell: true,
        enableFilesystem: false,
        enableHttp: false,
        enableMcp: false,
        defaultTimeout: 5000,
        maxOutputSize: 1024,
        shellAllowlist: [],
        shellDenylist: [],
        workingDirectory: '/tmp',
      });

      // First two should succeed
      const r1 = await limitedEngine.execute({
        id: 'rl-1', toolName: 'shell_exec',
        arguments: { command: 'echo 1' }, timestamp: Date.now(),
      });
      const r2 = await limitedEngine.execute({
        id: 'rl-2', toolName: 'shell_exec',
        arguments: { command: 'echo 2' }, timestamp: Date.now(),
      });
      // Third should be rate limited
      const r3 = await limitedEngine.execute({
        id: 'rl-3', toolName: 'shell_exec',
        arguments: { command: 'echo 3' }, timestamp: Date.now(),
      });

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r3.success).toBe(false);
      expect(r3.error).toContain('Rate limit');
    });
  });
});
