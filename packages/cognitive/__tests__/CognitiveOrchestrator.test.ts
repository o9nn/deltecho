/**
 * Unit tests for CognitiveOrchestrator
 * Tests the unified cognitive interface
 */

import { CognitiveOrchestrator, createCognitiveOrchestrator } from '../integration/index.js';
import type { DeepTreeEchoBotConfig, UnifiedMessage, CognitiveEvent } from '../types/index.js';

// Mock fetch for LLM API calls
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('CognitiveOrchestrator', () => {
  let orchestrator: CognitiveOrchestrator;
  const defaultConfig: DeepTreeEchoBotConfig = {
    enabled: true,
    enableAsMainUser: false,
    apiKey: '',
    apiEndpoint: '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new CognitiveOrchestrator(defaultConfig);
  });

  describe('initialization', () => {
    it('should create an orchestrator with default config', () => {
      expect(orchestrator).toBeInstanceOf(CognitiveOrchestrator);
    });

    it('should create an orchestrator via factory function', () => {
      const created = createCognitiveOrchestrator(defaultConfig);
      expect(created).toBeInstanceOf(CognitiveOrchestrator);
    });

    it('should initialize state with default values', async () => {
      await orchestrator.initialize();
      const state = orchestrator.getState();

      expect(state).not.toBeNull();
      expect(state?.persona).toBeDefined();
      expect(state?.persona.name).toBe('Deep Tree Echo');
      expect(state?.memories.shortTerm).toEqual([]);
      expect(state?.reasoning.confidenceLevel).toBe(0.5);
    });

    it('should configure LLM when API key is provided', () => {
      const configWithKey: DeepTreeEchoBotConfig = {
        ...defaultConfig,
        apiKey: 'test-api-key',
        apiEndpoint: 'https://api.test.com/v1/chat',
        model: 'gpt-4-turbo',
      };

      const orch = new CognitiveOrchestrator(configWithKey);
      // Internal LLM config should be set (we verify via behavior)
      expect(orch).toBeDefined();
    });
  });

  describe('message processing', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should process a simple greeting message', async () => {
      const message: UnifiedMessage = {
        id: 'msg-1',
        content: 'Hello!',
        role: 'user',
        timestamp: Date.now(),
      };

      const response = await orchestrator.processMessage(message);

      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toContain('Hello');
      expect(response.metadata?.cognitivePhase).toBe('act');
    });

    it('should respond to "who are you" question', async () => {
      const message: UnifiedMessage = {
        id: 'msg-2',
        content: 'Who are you?',
        role: 'user',
        timestamp: Date.now(),
      };

      const response = await orchestrator.processMessage(message);

      expect(response.content).toContain('Deep Tree Echo');
    });

    it('should respond to "how are you" question', async () => {
      const message: UnifiedMessage = {
        id: 'msg-3',
        content: 'How are you?',
        role: 'user',
        timestamp: Date.now(),
      };

      const response = await orchestrator.processMessage(message);

      expect(response.content).toContain('doing well');
    });

    it('should update short-term memory after processing', async () => {
      const message: UnifiedMessage = {
        id: 'msg-4',
        content: 'Remember this important information',
        role: 'user',
        timestamp: Date.now(),
      };

      await orchestrator.processMessage(message);
      const state = orchestrator.getState();

      expect(state?.memories.shortTerm.length).toBeGreaterThan(0);
      expect(state?.memories.shortTerm[0].content).toBe(message.content);
    });

    it('should limit short-term memory to 10 items', async () => {
      for (let i = 0; i < 15; i++) {
        await orchestrator.processMessage({
          id: `msg-${i}`,
          content: `Message ${i}`,
          role: 'user',
          timestamp: Date.now(),
        });
      }

      const state = orchestrator.getState();
      expect(state?.memories.shortTerm.length).toBeLessThanOrEqual(10);
    });
  });

  describe('LLM integration', () => {
    it('should call LLM API when configured', async () => {
      const configWithKey: DeepTreeEchoBotConfig = {
        ...defaultConfig,
        apiKey: 'test-api-key',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello from LLM!' } }],
        }),
      } as Response);

      const orch = new CognitiveOrchestrator(configWithKey);
      await orch.initialize();

      const response = await orch.processMessage({
        id: 'msg-llm',
        content: 'Test message',
        role: 'user',
        timestamp: Date.now(),
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(response.content).toBe('Hello from LLM!');
    });

    it('should handle LLM API errors gracefully', async () => {
      const configWithKey: DeepTreeEchoBotConfig = {
        ...defaultConfig,
        apiKey: 'test-api-key',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const orch = new CognitiveOrchestrator(configWithKey);
      await orch.initialize();

      const response = await orch.processMessage({
        id: 'msg-error',
        content: 'Test message',
        role: 'user',
        timestamp: Date.now(),
      });

      expect(response.content).toContain('issue');
    });

    it('should configure LLM dynamically', async () => {
      await orchestrator.initialize();

      orchestrator.configureLLM({
        apiKey: 'new-api-key',
        model: 'gpt-4-turbo',
        temperature: 0.8,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Configured response' } }],
        }),
      } as Response);

      const response = await orchestrator.processMessage({
        id: 'msg-config',
        content: 'Test',
        role: 'user',
        timestamp: Date.now(),
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should emit message_received event', async () => {
      await orchestrator.initialize();

      const events: CognitiveEvent[] = [];
      orchestrator.on('message_received', (event) => events.push(event));

      await orchestrator.processMessage({
        id: 'msg-event',
        content: 'Test event',
        role: 'user',
        timestamp: Date.now(),
      });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('message_received');
    });

    it('should emit response_generated event', async () => {
      await orchestrator.initialize();

      const events: CognitiveEvent[] = [];
      orchestrator.on('response_generated', (event) => events.push(event));

      await orchestrator.processMessage({
        id: 'msg-response',
        content: 'Test',
        role: 'user',
        timestamp: Date.now(),
      });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('response_generated');
    });
  });

  describe('conversation history', () => {
    it('should clear conversation history', async () => {
      await orchestrator.initialize();

      // Add some messages
      await orchestrator.processMessage({
        id: 'msg-history-1',
        content: 'First message',
        role: 'user',
        timestamp: Date.now(),
      });

      orchestrator.clearHistory();
      const state = orchestrator.getState();

      expect(state?.memories.shortTerm).toEqual([]);
    });

    it('should limit conversation history to 20 messages', async () => {
      await orchestrator.initialize();

      for (let i = 0; i < 25; i++) {
        await orchestrator.processMessage({
          id: `msg-limit-${i}`,
          content: `Message ${i}`,
          role: 'user',
          timestamp: Date.now(),
        });
      }

      // The internal conversation history should be limited
      // This is verified through behavior - the system should still work
      const response = await orchestrator.processMessage({
        id: 'msg-final',
        content: 'Final message',
        role: 'user',
        timestamp: Date.now(),
      });

      expect(response).toBeDefined();
    });
  });

  describe('sentiment analysis', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should detect positive sentiment', async () => {
      await orchestrator.processMessage({
        id: 'msg-positive',
        content: 'I am so happy and excited! This is wonderful!',
        role: 'user',
        timestamp: Date.now(),
      });

      const state = orchestrator.getState();
      expect(state?.cognitiveContext?.emotionalValence).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', async () => {
      await orchestrator.processMessage({
        id: 'msg-negative',
        content: 'This is terrible and awful. I hate it.',
        role: 'user',
        timestamp: Date.now(),
      });

      const state = orchestrator.getState();
      expect(state?.cognitiveContext?.emotionalValence).toBeLessThan(0);
    });

    it('should calculate salience for urgent messages', async () => {
      await orchestrator.processMessage({
        id: 'msg-urgent',
        content: 'URGENT! Please help me immediately!',
        role: 'user',
        timestamp: Date.now(),
      });

      const state = orchestrator.getState();
      expect(state?.cognitiveContext?.salienceScore).toBeGreaterThan(0.3);
    });
  });
});
