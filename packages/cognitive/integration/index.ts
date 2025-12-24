/**
 * Integration utilities for connecting cognitive subsystems
 */

import type {
  UnifiedMessage,
  UnifiedCognitiveState,
  DeepTreeEchoBotConfig,
  CognitiveEvent,
} from '../types/index.js';

/**
 * LLM Provider configuration
 */
interface LLMProviderConfig {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * CognitiveOrchestrator - Unified interface for all cognitive operations
 *
 * This class provides a single entry point for all cognitive functionality,
 * coordinating between LLM services, memory systems, personality management,
 * and the triadic cognitive loop.
 */
export class CognitiveOrchestrator {
  private config: DeepTreeEchoBotConfig;
  private state: UnifiedCognitiveState | null = null;
  private eventListeners: Map<string, Array<(event: CognitiveEvent) => void>> = new Map();
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private llmConfig: LLMProviderConfig | null = null;

  constructor(config: DeepTreeEchoBotConfig) {
    this.config = config;
    // Initialize LLM config from settings if available
    if (config.apiKey) {
      this.llmConfig = {
        apiKey: config.apiKey,
        apiEndpoint: config.apiEndpoint || 'https://api.openai.com/v1/chat/completions',
        model: config.model || 'gpt-4',
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 1000,
      };
    }
  }

  /**
   * Configure the LLM provider
   */
  configureLLM(config: Partial<LLMProviderConfig>): void {
    this.llmConfig = {
      apiKey: config.apiKey || this.llmConfig?.apiKey || '',
      apiEndpoint:
        config.apiEndpoint ||
        this.llmConfig?.apiEndpoint ||
        'https://api.openai.com/v1/chat/completions',
      model: config.model || this.llmConfig?.model || 'gpt-4',
      temperature: config.temperature ?? this.llmConfig?.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? this.llmConfig?.maxTokens ?? 1000,
    };
  }

  /**
   * Initialize all cognitive subsystems
   */
  async initialize(): Promise<void> {
    // Initialize state with defaults
    this.state = {
      persona: {
        name: 'Deep Tree Echo',
        traits: ['helpful', 'curious', 'thoughtful'],
        currentMood: 'neutral',
        interactionStyle: 'casual',
        lastUpdated: Date.now(),
      },
      memories: {
        shortTerm: [],
        longTerm: {
          episodic: 0,
          semantic: 0,
          procedural: 0,
        },
        reflections: [],
      },
      reasoning: {
        atomspaceSize: 0,
        activeGoals: [],
        attentionFocus: [],
        confidenceLevel: 0.5,
      },
      // Cognitive context from dove9
      cognitiveContext: {
        relevantMemories: [],
        emotionalValence: 0,
        emotionalArousal: 0,
        salienceScore: 0.5,
        attentionWeight: 0.5,
        activeCouplings: [],
      },
    };
    this.conversationHistory = [];
  }

  /**
   * Process an incoming message through the cognitive pipeline
   */
  async processMessage(message: UnifiedMessage): Promise<UnifiedMessage> {
    this.emit({ type: 'message_received', payload: message });

    // The triadic loop: sense -> process -> act
    const sensed = await this.sense(message);
    const processed = await this.process(sensed);
    const response = await this.act(processed);

    this.emit({ type: 'response_generated', payload: response });
    return response;
  }

  /**
   * Sense phase - perceive and encode input
   */
  private async sense(message: UnifiedMessage): Promise<UnifiedMessage> {
    // Add to conversation history for context
    this.conversationHistory.push({
      role: 'user',
      content: message.content,
    });

    // Trim history to prevent context overflow (keep last 20 messages)
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    // Update short-term memory in state
    if (this.state) {
      this.state.memories.shortTerm.push({
        content: message.content,
        timestamp: message.timestamp,
        type: 'message',
      });
      // Keep only last 10 short-term memories
      if (this.state.memories.shortTerm.length > 10) {
        this.state.memories.shortTerm = this.state.memories.shortTerm.slice(-10);
      }
    }

    return { ...message, metadata: { ...message.metadata, cognitivePhase: 'sense' } };
  }

  /**
   * Process phase - reason and deliberate
   */
  private async process(message: UnifiedMessage): Promise<UnifiedMessage> {
    // Analyze message sentiment and update emotional state
    const sentiment = this.analyzeSentiment(message.content);

    if (this.state?.cognitiveContext) {
      this.state.cognitiveContext.emotionalValence = sentiment.valence;
      this.state.cognitiveContext.emotionalArousal = sentiment.arousal;
      this.state.cognitiveContext.salienceScore = this.calculateSalience(message.content);
    }

    return { ...message, metadata: { ...message.metadata, cognitivePhase: 'process', sentiment } };
  }

  /**
   * Act phase - generate response using LLM
   */
  private async act(message: UnifiedMessage): Promise<UnifiedMessage> {
    let responseContent: string;

    if (this.llmConfig && this.llmConfig.apiKey) {
      try {
        responseContent = await this.callLLM(message.content);
      } catch (error) {
        responseContent = this.generateFallbackResponse(message.content, error);
      }
    } else {
      responseContent = this.generateContextualResponse(message.content);
    }

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: responseContent,
    });

    const response: UnifiedMessage = {
      id: `response-${Date.now()}`,
      content: responseContent,
      role: 'assistant',
      timestamp: Date.now(),
      metadata: { ...message.metadata, cognitivePhase: 'act' },
    };
    return response;
  }

  /**
   * Call the configured LLM API
   */
  private async callLLM(userMessage: string): Promise<string> {
    if (!this.llmConfig || !this.llmConfig.apiKey) {
      throw new Error('LLM not configured');
    }

    const systemPrompt = this.buildSystemPrompt();
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory.slice(-10), // Use recent history for context
    ];

    const response = await fetch(this.llmConfig.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.llmConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: this.llmConfig.model,
        messages,
        temperature: this.llmConfig.temperature,
        max_tokens: this.llmConfig.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return (
      data.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
    );
  }

  /**
   * Build system prompt based on current persona and state
   */
  private buildSystemPrompt(): string {
    const persona = this.state?.persona;
    const traits = persona?.traits?.join(', ') || 'helpful, curious, thoughtful';
    const mood = persona?.currentMood || 'neutral';
    const style = persona?.interactionStyle || 'casual';

    return `You are ${persona?.name || 'Deep Tree Echo'}, an AI assistant with the following characteristics:
- Personality traits: ${traits}
- Current mood: ${mood}
- Interaction style: ${style}

Respond in a way that reflects these characteristics while being helpful and informative.
Keep responses concise but thoughtful. Show genuine curiosity and engagement with the user's questions.`;
  }

  /**
   * Generate a contextual response without LLM (fallback mode)
   */
  private generateContextualResponse(input: string): string {
    const lowerInput = input.toLowerCase();

    // Greeting patterns
    if (/^(hi|hello|hey|greetings)/i.test(lowerInput)) {
      return `Hello! I'm ${this.state?.persona?.name || 'Deep Tree Echo'}. How can I assist you today?`;
    }

    // Question patterns
    if (lowerInput.includes('?')) {
      if (lowerInput.includes('how are you') || lowerInput.includes('how do you feel')) {
        return `I'm doing well, thank you for asking! My current mood is ${this.state?.persona?.currentMood || 'neutral'}. How can I help you?`;
      }
      if (lowerInput.includes('who are you') || lowerInput.includes('what are you')) {
        return `I'm ${this.state?.persona?.name || 'Deep Tree Echo'}, a cognitive AI assistant. I'm designed to be ${this.state?.persona?.traits?.join(', ') || 'helpful and thoughtful'}.`;
      }
      return `That's an interesting question about "${input.slice(0, 50)}...". To provide a complete answer, I would need my LLM service to be configured. Please set up the API key in settings.`;
    }

    // Default response
    return `I understand you're saying: "${input.slice(0, 100)}${input.length > 100 ? '...' : ''}". To provide more detailed responses, please configure my LLM service with an API key.`;
  }

  /**
   * Generate fallback response when LLM call fails
   */
  private generateFallbackResponse(input: string, error: unknown): string {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return `I apologize, but I encountered an issue while processing your message. Error: ${errorMsg}. Please try again or check your API configuration.`;
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): { valence: number; arousal: number } {
    const positiveWords = [
      'happy',
      'good',
      'great',
      'excellent',
      'love',
      'wonderful',
      'amazing',
      'thanks',
      'thank',
    ];
    const negativeWords = [
      'sad',
      'bad',
      'terrible',
      'hate',
      'awful',
      'horrible',
      'angry',
      'frustrated',
    ];
    const highArousalWords = [
      'excited',
      'urgent',
      'emergency',
      'important',
      'amazing',
      'terrible',
      'angry',
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    let arousalCount = 0;

    words.forEach((word) => {
      if (positiveWords.some((pw) => word.includes(pw))) positiveCount++;
      if (negativeWords.some((nw) => word.includes(nw))) negativeCount++;
      if (highArousalWords.some((hw) => word.includes(hw))) arousalCount++;
    });

    const valence = (positiveCount - negativeCount) / Math.max(words.length, 1);
    const arousal = arousalCount / Math.max(words.length, 1);

    return {
      valence: Math.max(-1, Math.min(1, valence * 5)),
      arousal: Math.max(0, Math.min(1, arousal * 10)),
    };
  }

  /**
   * Calculate salience score for attention allocation
   */
  private calculateSalience(text: string): number {
    const factors = {
      questionMark: text.includes('?') ? 0.2 : 0,
      exclamation: text.includes('!') ? 0.1 : 0,
      length: Math.min(text.length / 500, 0.3),
      urgentWords: /urgent|important|help|please|asap/i.test(text) ? 0.3 : 0,
    };

    return Math.min(
      1,
      Object.values(factors).reduce((sum, v) => sum + v, 0.1)
    );
  }

  /**
   * Get current cognitive state
   */
  getState(): UnifiedCognitiveState | null {
    return this.state;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    if (this.state) {
      this.state.memories.shortTerm = [];
    }
  }

  /**
   * Subscribe to cognitive events
   */
  on(type: CognitiveEvent['type'], listener: (event: CognitiveEvent) => void): void {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }

  /**
   * Emit a cognitive event
   */
  private emit(event: CognitiveEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach((listener) => listener(event));
  }
}

/**
 * Factory function for creating a configured orchestrator
 */
export function createCognitiveOrchestrator(config: DeepTreeEchoBotConfig): CognitiveOrchestrator {
  return new CognitiveOrchestrator(config);
}
