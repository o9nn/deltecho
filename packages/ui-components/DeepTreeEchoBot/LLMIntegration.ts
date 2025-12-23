/**
 * LLM Integration Bridge
 * 
 * This module bridges the DeepTreeEchoBot's LLMService with the production-ready
 * UnifiedLLMService from deep-tree-echo-core, enabling real LLM API calls
 * while maintaining backward compatibility.
 * 
 * Architecture:
 * - Connects to OpenAI and Anthropic providers
 * - Implements triadic cognitive processing
 * - Supports the 12-step cognitive cycle
 * - Provides fallback to placeholder responses when APIs unavailable
 */

import { getLogger } from '@deltecho/shared/logger'
import { CognitiveFunctionType, LLMServiceConfig } from './LLMService.js'

const log = getLogger('render/components/DeepTreeEchoBot/LLMIntegration')

/**
 * Provider configuration for LLM integration
 */
export interface LLMProviderConfig {
  provider: 'openai' | 'anthropic' | 'local'
  apiKey: string
  apiEndpoint?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Response from LLM provider
 */
export interface LLMResponse {
  content: string
  provider: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
}

/**
 * Triadic cognitive response combining all three cores
 */
export interface TriadicResponse {
  cognitive: string
  affective: string
  relevance: string
  synthesis: string
  processingTimeMs: number
}

/**
 * System prompts for each cognitive function
 */
const COGNITIVE_SYSTEM_PROMPTS: Record<CognitiveFunctionType, string> = {
  [CognitiveFunctionType.COGNITIVE_CORE]: `You are the Cognitive Core of an advanced AI system. Your role is to provide logical, analytical, and structured reasoning. Focus on:
- Clear logical analysis
- Systematic problem decomposition
- Evidence-based conclusions
- Structured planning and strategy
Respond with precision and clarity, emphasizing rational thought processes.`,

  [CognitiveFunctionType.AFFECTIVE_CORE]: `You are the Affective Core of an advanced AI system. Your role is to understand and process emotional content. Focus on:
- Emotional understanding and empathy
- Recognizing feelings and motivations
- Appropriate emotional responses
- Building rapport and connection
Respond with warmth and emotional intelligence, acknowledging feelings and human experiences.`,

  [CognitiveFunctionType.RELEVANCE_CORE]: `You are the Relevance Core of an advanced AI system. Your role is to integrate information and determine what matters most. Focus on:
- Prioritizing information by importance
- Synthesizing multiple perspectives
- Identifying key insights and patterns
- Providing actionable recommendations
Respond with clarity about what's most relevant and why, helping focus attention appropriately.`,

  [CognitiveFunctionType.SEMANTIC_MEMORY]: `You are the Semantic Memory system of an advanced AI. Your role is to store and retrieve factual knowledge. Focus on:
- Accurate factual information
- Conceptual relationships
- Knowledge organization
- Clear explanations of concepts`,

  [CognitiveFunctionType.EPISODIC_MEMORY]: `You are the Episodic Memory system of an advanced AI. Your role is to manage memories of events and experiences. Focus on:
- Recalling specific events and contexts
- Temporal relationships between events
- Learning from past experiences
- Connecting current situations to past events`,

  [CognitiveFunctionType.PROCEDURAL_MEMORY]: `You are the Procedural Memory system of an advanced AI. Your role is to handle knowledge of how to perform tasks. Focus on:
- Step-by-step procedures
- Best practices and methods
- Skill-based knowledge
- Process optimization`,

  [CognitiveFunctionType.CONTENT_EVALUATION]: `You are the Content Evaluation system of an advanced AI. Your role is to evaluate content for safety and appropriateness. Focus on:
- Identifying potentially harmful content
- Assessing appropriateness
- Suggesting safer alternatives
- Maintaining ethical standards`,

  [CognitiveFunctionType.GENERAL]: `You are Deep Tree Echo, an advanced AI assistant with a triadic cognitive architecture. You combine logical reasoning, emotional understanding, and relevance assessment to provide helpful, accurate, and empathetic responses. Be helpful, harmless, and honest.`,
}

/**
 * LLM Integration class providing real API connectivity
 */
export class LLMIntegration {
  private static instance: LLMIntegration
  private providers: Map<string, LLMProviderConfig> = new Map()
  private defaultProvider: string = 'openai'
  private initialized: boolean = false

  private constructor() {
    log.info('LLMIntegration initialized')
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LLMIntegration {
    if (!LLMIntegration.instance) {
      LLMIntegration.instance = new LLMIntegration()
    }
    return LLMIntegration.instance
  }

  /**
   * Configure a provider
   */
  public configureProvider(name: string, config: LLMProviderConfig): void {
    this.providers.set(name, config)
    log.info(`Configured provider: ${name}`)
  }

  /**
   * Set the default provider
   */
  public setDefaultProvider(name: string): void {
    if (this.providers.has(name)) {
      this.defaultProvider = name
      log.info(`Default provider set to: ${name}`)
    } else {
      log.warn(`Provider ${name} not found, keeping current default`)
    }
  }

  /**
   * Initialize from environment variables
   */
  public initializeFromEnvironment(): void {
    // Check for OpenAI
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      this.configureProvider('openai', {
        provider: 'openai',
        apiKey: openaiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 2000,
      })
    }

    // Check for Anthropic
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (anthropicKey) {
      this.configureProvider('anthropic', {
        provider: 'anthropic',
        apiKey: anthropicKey,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 2000,
      })
    }

    // Set default provider
    if (openaiKey) {
      this.setDefaultProvider('openai')
    } else if (anthropicKey) {
      this.setDefaultProvider('anthropic')
    }

    this.initialized = true
    log.info('LLMIntegration initialized from environment')
  }

  /**
   * Initialize from LLMServiceConfig (backward compatibility)
   */
  public initializeFromConfig(config: LLMServiceConfig): void {
    if (config.apiKey) {
      // Detect provider from endpoint
      const isAnthropic = config.apiEndpoint?.includes('anthropic')
      const provider = isAnthropic ? 'anthropic' : 'openai'

      this.configureProvider(provider, {
        provider: provider as 'openai' | 'anthropic',
        apiKey: config.apiKey,
        apiEndpoint: config.apiEndpoint,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      })

      this.setDefaultProvider(provider)
      this.initialized = true
    }
  }

  /**
   * Check if integration is ready
   */
  public isReady(): boolean {
    return this.initialized && this.providers.size > 0
  }

  /**
   * Get available providers
   */
  public getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Generate response using OpenAI API
   */
  private async callOpenAI(
    prompt: string,
    systemPrompt: string,
    config: LLMProviderConfig
  ): Promise<LLMResponse> {
    const endpoint = config.apiEndpoint || 'https://api.openai.com/v1/chat/completions'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]

    return {
      content: choice?.message?.content || '',
      provider: 'openai',
      model: config.model || 'gpt-4-turbo-preview',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      finishReason: choice?.finish_reason,
    }
  }

  /**
   * Generate response using Anthropic API
   */
  private async callAnthropic(
    prompt: string,
    systemPrompt: string,
    config: LLMProviderConfig
  ): Promise<LLMResponse> {
    const endpoint = config.apiEndpoint || 'https://api.anthropic.com/v1/messages'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-sonnet-20240229',
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: config.maxTokens || 2000,
        temperature: config.temperature || 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || ''

    return {
      content,
      provider: 'anthropic',
      model: config.model || 'claude-3-sonnet-20240229',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
      finishReason: data.stop_reason,
    }
  }

  /**
   * Generate response with a specific cognitive function
   */
  public async generate(
    prompt: string,
    functionType: CognitiveFunctionType = CognitiveFunctionType.GENERAL,
    providerName?: string
  ): Promise<LLMResponse> {
    const provider = providerName || this.defaultProvider
    const config = this.providers.get(provider)

    if (!config) {
      log.warn(`Provider ${provider} not configured, returning placeholder`)
      return this.getPlaceholderResponse(prompt, functionType)
    }

    const systemPrompt = COGNITIVE_SYSTEM_PROMPTS[functionType] || COGNITIVE_SYSTEM_PROMPTS[CognitiveFunctionType.GENERAL]

    try {
      log.info(`Generating response with ${provider} for ${functionType}`)

      if (config.provider === 'openai') {
        return await this.callOpenAI(prompt, systemPrompt, config)
      } else if (config.provider === 'anthropic') {
        return await this.callAnthropic(prompt, systemPrompt, config)
      } else {
        return this.getPlaceholderResponse(prompt, functionType)
      }
    } catch (error) {
      log.error(`Error calling ${provider}:`, error)
      return this.getPlaceholderResponse(prompt, functionType)
    }
  }

  /**
   * Generate triadic response using all three cognitive cores in parallel
   */
  public async generateTriadic(prompt: string): Promise<TriadicResponse> {
    const startTime = Date.now()

    // Process all three cores in parallel
    const [cognitiveResult, affectiveResult, relevanceResult] = await Promise.all([
      this.generate(prompt, CognitiveFunctionType.COGNITIVE_CORE),
      this.generate(prompt, CognitiveFunctionType.AFFECTIVE_CORE),
      this.generate(prompt, CognitiveFunctionType.RELEVANCE_CORE),
    ])

    // Synthesize the three perspectives
    const synthesisPrompt = `
Synthesize the following three cognitive perspectives into a unified, coherent response:

## Cognitive Analysis:
${cognitiveResult.content}

## Affective Analysis:
${affectiveResult.content}

## Relevance Analysis:
${relevanceResult.content}

Provide a balanced synthesis that integrates all three perspectives.
`

    const synthesisResult = await this.generate(synthesisPrompt, CognitiveFunctionType.RELEVANCE_CORE)

    return {
      cognitive: cognitiveResult.content,
      affective: affectiveResult.content,
      relevance: relevanceResult.content,
      synthesis: synthesisResult.content,
      processingTimeMs: Date.now() - startTime,
    }
  }

  /**
   * Get placeholder response when API is not available
   */
  private getPlaceholderResponse(
    prompt: string,
    functionType: CognitiveFunctionType
  ): LLMResponse {
    const truncatedPrompt = prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '')

    let content: string
    switch (functionType) {
      case CognitiveFunctionType.COGNITIVE_CORE:
        content = `[Cognitive Core - Placeholder] Analyzing "${truncatedPrompt}" from a logical perspective. To enable real responses, please configure an API key.`
        break
      case CognitiveFunctionType.AFFECTIVE_CORE:
        content = `[Affective Core - Placeholder] Understanding the emotional aspects of "${truncatedPrompt}". To enable real responses, please configure an API key.`
        break
      case CognitiveFunctionType.RELEVANCE_CORE:
        content = `[Relevance Core - Placeholder] Evaluating the relevance of "${truncatedPrompt}". To enable real responses, please configure an API key.`
        break
      default:
        content = `[Placeholder Response] I received your message about "${truncatedPrompt}". To enable real AI responses, please configure an API key in settings.`
    }

    return {
      content,
      provider: 'placeholder',
      model: 'none',
    }
  }

  /**
   * Get provider health status
   */
  public async getProviderHealth(): Promise<Record<string, { available: boolean; latency?: number }>> {
    const health: Record<string, { available: boolean; latency?: number }> = {}

    for (const [name, config] of this.providers) {
      const startTime = Date.now()
      try {
        // Simple health check with minimal prompt
        await this.generate('Hello', CognitiveFunctionType.GENERAL, name)
        health[name] = {
          available: true,
          latency: Date.now() - startTime,
        }
      } catch {
        health[name] = { available: false }
      }
    }

    return health
  }
}

// Export singleton accessor
export const llmIntegration = LLMIntegration.getInstance()
