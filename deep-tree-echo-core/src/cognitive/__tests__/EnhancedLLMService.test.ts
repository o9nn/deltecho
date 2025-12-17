import { EnhancedLLMService, LLMConfig, LLMMessage } from '../EnhancedLLMService';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('EnhancedLLMService', () => {
  let llmService: EnhancedLLMService;
  const defaultConfig: LLMConfig = {
    provider: 'openai',
    apiKey: 'test-api-key',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  };

  beforeEach(() => {
    mockFetch.mockClear();
    llmService = new EnhancedLLMService(defaultConfig);
  });

  describe('initialization', () => {
    it('should initialize with provided config', () => {
      expect(llmService).toBeDefined();
    });

    it('should use default values for optional config', () => {
      const minimalConfig: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
      };
      const service = new EnhancedLLMService(minimalConfig);
      expect(service).toBeDefined();
    });
  });

  describe('OpenAI completion', () => {
    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' },
    ];

    it('should call OpenAI API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello! How can I help?' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          model: 'gpt-4',
        }),
      });

      await llmService.complete(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should return formatted response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          model: 'gpt-4',
        }),
      });

      const response = await llmService.complete(messages);

      expect(response.content).toBe('Test response');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
      expect(response.model).toBe('gpt-4');
      expect(response.finishReason).toBe('stop');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      });

      await expect(llmService.complete(messages)).rejects.toThrow('OpenAI API error');
    });

    it('should throw error when API key missing', async () => {
      const noKeyService = new EnhancedLLMService({
        provider: 'openai',
        model: 'gpt-4',
      });

      await expect(noKeyService.complete(messages)).rejects.toThrow('API key is required');
    });
  });

  describe('Anthropic completion', () => {
    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are Claude.' },
      { role: 'user', content: 'Hello!' },
    ];

    beforeEach(() => {
      llmService = new EnhancedLLMService({
        provider: 'anthropic',
        apiKey: 'anthropic-key',
        model: 'claude-3-opus-20240229',
      });
    });

    it('should call Anthropic API with correct format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Hello from Claude!' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          model: 'claude-3-opus-20240229',
          stop_reason: 'end_turn',
        }),
      });

      await llmService.complete(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'anthropic-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      );
    });

    it('should extract system message for Anthropic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          model: 'claude-3-opus-20240229',
          stop_reason: 'end_turn',
        }),
      });

      await llmService.complete(messages);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.system).toBe('You are Claude.');
      expect(callBody.messages).toHaveLength(1); // Only user message
    });
  });

  describe('OpenRouter completion', () => {
    beforeEach(() => {
      llmService = new EnhancedLLMService({
        provider: 'openrouter',
        apiKey: 'openrouter-key',
        model: 'anthropic/claude-3-opus',
      });
    });

    it('should call OpenRouter API with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          model: 'anthropic/claude-3-opus',
        }),
      });

      await llmService.complete([{ role: 'user', content: 'Hello' }]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer openrouter-key',
            'HTTP-Referer': 'https://deltecho.ai',
            'X-Title': 'Deltecho',
          }),
        })
      );
    });
  });

  describe('Ollama completion', () => {
    beforeEach(() => {
      llmService = new EnhancedLLMService({
        provider: 'ollama',
        model: 'llama2',
        baseURL: 'http://localhost:11434',
      });
    });

    it('should call Ollama API with correct format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: 'Ollama response' },
        }),
      });

      await llmService.complete([{ role: 'user', content: 'Hello' }]);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not require API key for Ollama', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: 'Response' },
        }),
      });

      const response = await llmService.complete([{ role: 'user', content: 'Hello' }]);
      expect(response.content).toBe('Response');
    });
  });

  describe('streaming', () => {
    it('should yield content from stream generator', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Streamed content' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          model: 'gpt-4',
        }),
      });

      const chunks: string[] = [];
      for await (const chunk of llmService.completeStream([{ role: 'user', content: 'Hello' }])) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBe('Streamed content');
    });
  });

  describe('token estimation', () => {
    it('should estimate tokens for text', () => {
      const text = 'Hello, this is a test message.';
      const estimate = llmService.estimateTokens(text);
      
      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBeLessThan(text.length); // Tokens < characters
    });

    it('should return 0 for empty text', () => {
      const estimate = llmService.estimateTokens('');
      expect(estimate).toBe(0);
    });
  });

  describe('config update', () => {
    it('should update configuration', () => {
      llmService.updateConfig({
        temperature: 0.9,
        maxTokens: 4000,
      });

      // Config is private, so we test indirectly through API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          model: 'gpt-4',
        }),
      });

      llmService.complete([{ role: 'user', content: 'Test' }]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.temperature).toBe(0.9);
      expect(callBody.max_tokens).toBe(4000);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        llmService.complete([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Network error');
    });

    it('should handle invalid provider', async () => {
      const invalidService = new EnhancedLLMService({
        provider: 'invalid' as any,
        apiKey: 'key',
        model: 'model',
      });

      await expect(
        invalidService.complete([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Unsupported provider');
    });
  });
});
