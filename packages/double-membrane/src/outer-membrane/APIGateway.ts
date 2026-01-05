/**
 * APIGateway - The Outer Membrane's External Interface
 *
 * This module implements the "Outer Membrane" of the double membrane architecture,
 * managing all interactions with external AI services and APIs. It acts as a
 * selective filter, analogous to the mitochondrial outer membrane's porin channels.
 *
 * Key responsibilities:
 * - API key management and secure credential handling
 * - Provider selection and load balancing
 * - Rate limiting and quota management
 * - Protocol translation and response normalization
 * - Fallback handling when providers are unavailable
 */

import { EventEmitter } from 'events';

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'anthropic' | 'openrouter' | 'local';

/**
 * Provider configuration
 */
export interface ProviderConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  priority: number; // Lower = higher priority
  rateLimitPerMinute: number;
  costPerToken: number;
}

/**
 * API request structure
 */
export interface APIRequest {
  id: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  preferredProvider?: LLMProvider;
  allowFallback: boolean;
}

/**
 * API response structure
 */
export interface APIResponse {
  id: string;
  text: string;
  provider: LLMProvider;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  cost: number;
  cached: boolean;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: LLMProvider;
  available: boolean;
  latencyMs: number;
  errorRate: number;
  requestsThisMinute: number;
  lastError?: string;
  lastChecked: number;
}

/**
 * Gateway statistics
 */
export interface GatewayStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  fallbacksUsed: number;
  totalTokensUsed: number;
  totalCost: number;
  averageLatency: number;
  providerUsage: Map<LLMProvider, number>;
}

/**
 * Gateway events
 */
export type GatewayEvent =
  | { type: 'gateway_started' }
  | { type: 'gateway_stopped' }
  | { type: 'request_sent'; provider: LLMProvider; requestId: string }
  | { type: 'response_received'; response: APIResponse }
  | { type: 'provider_error'; provider: LLMProvider; error: string }
  | { type: 'fallback_triggered'; from: LLMProvider; to: LLMProvider }
  | { type: 'rate_limit_hit'; provider: LLMProvider }
  | { type: 'all_providers_unavailable' };

/**
 * Default provider configurations
 */
const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    maxTokens: 4096,
    temperature: 0.7,
    enabled: true,
    priority: 1,
    rateLimitPerMinute: 60,
    costPerToken: 0.00001,
  },
  {
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-opus-20240229',
    maxTokens: 4096,
    temperature: 0.7,
    enabled: true,
    priority: 2,
    rateLimitPerMinute: 40,
    costPerToken: 0.000015,
  },
  {
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet',
    maxTokens: 4096,
    temperature: 0.7,
    enabled: true,
    priority: 3,
    rateLimitPerMinute: 100,
    costPerToken: 0.000012,
  },
  {
    provider: 'local',
    model: 'native-echo-mini',
    maxTokens: 512,
    temperature: 0.7,
    enabled: true,
    priority: 99, // Lowest priority, used as last resort
    rateLimitPerMinute: 1000,
    costPerToken: 0,
  },
];

/**
 * APIGateway - Manages external API interactions with REAL implementations
 */
export class APIGateway extends EventEmitter {
  private providers: Map<LLMProvider, ProviderConfig>;
  private providerHealth: Map<LLMProvider, ProviderHealth>;
  private stats: GatewayStats;
  private running: boolean = false;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private rateLimitResetInterval?: ReturnType<typeof setInterval>;
  private responseCache: Map<string, { response: APIResponse; timestamp: number }>;
  private readonly CACHE_TTL_MS = 300000; // 5 minutes

  constructor(providerConfigs?: ProviderConfig[]) {
    super();
    this.providers = new Map();
    this.providerHealth = new Map();
    this.stats = this.initializeStats();
    this.responseCache = new Map();

    // Initialize providers
    const configs = providerConfigs || DEFAULT_PROVIDERS;
    for (const config of configs) {
      this.providers.set(config.provider, config);
      this.providerHealth.set(config.provider, this.initializeHealth(config.provider));
    }

    // Load API keys from environment
    this.loadAPIKeys();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): GatewayStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbacksUsed: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageLatency: 0,
      providerUsage: new Map(),
    };
  }

  /**
   * Initialize provider health
   */
  private initializeHealth(provider: LLMProvider): ProviderHealth {
    return {
      provider,
      available: true,
      latencyMs: 0,
      errorRate: 0,
      requestsThisMinute: 0,
      lastChecked: Date.now(),
    };
  }

  /**
   * Load API keys from environment variables
   */
  private loadAPIKeys(): void {
    const openaiConfig = this.providers.get('openai');
    if (openaiConfig) {
      openaiConfig.apiKey = process.env.OPENAI_API_KEY;
      openaiConfig.enabled = !!openaiConfig.apiKey;
    }

    const anthropicConfig = this.providers.get('anthropic');
    if (anthropicConfig) {
      anthropicConfig.apiKey = process.env.ANTHROPIC_API_KEY;
      anthropicConfig.enabled = !!anthropicConfig.apiKey;
    }

    const openrouterConfig = this.providers.get('openrouter');
    if (openrouterConfig) {
      openrouterConfig.apiKey = process.env.OPENROUTER_API_KEY;
      openrouterConfig.enabled = !!openrouterConfig.apiKey;
    }
  }

  /**
   * Initialize the gateway (alias for start)
   */
  public async initialize(): Promise<void> {
    this.start();
  }

  /**
   * Shutdown the gateway (alias for stop)
   */
  public async shutdown(): Promise<void> {
    this.stop();
  }

  /**
   * Start the gateway
   */
  public start(): void {
    if (this.running) return;

    this.running = true;

    // Start health check interval
    this.healthCheckInterval = setInterval(() => {
      this.checkProviderHealth();
    }, 30000); // Check every 30 seconds

    // Start rate limit reset interval
    this.rateLimitResetInterval = setInterval(() => {
      this.resetRateLimits();
    }, 60000); // Reset every minute

    // Start cache cleanup interval
    setInterval(() => {
      this.cleanupCache();
    }, 60000);

    this.emit('gateway_started', { type: 'gateway_started' });
  }

  /**
   * Stop the gateway
   */
  public stop(): void {
    if (!this.running) return;

    this.running = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    if (this.rateLimitResetInterval) {
      clearInterval(this.rateLimitResetInterval);
      this.rateLimitResetInterval = undefined;
    }

    this.emit('gateway_stopped', { type: 'gateway_stopped' });
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(request: APIRequest): string {
    return `${request.prompt}:${request.systemPrompt || ''}:${request.maxTokens || ''}`;
  }

  /**
   * Check cache for response
   */
  private checkCache(request: APIRequest): APIResponse | null {
    const key = this.getCacheKey(request);
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return { ...cached.response, cached: true };
    }
    return null;
  }

  /**
   * Store response in cache
   */
  private cacheResponse(request: APIRequest, response: APIResponse): void {
    const key = this.getCacheKey(request);
    this.responseCache.set(key, { response, timestamp: Date.now() });
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL_MS) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Send a request to an external LLM provider
   */
  public async sendRequest(request: APIRequest): Promise<APIResponse> {
    if (!this.running) {
      throw new Error('Gateway not running');
    }

    this.stats.totalRequests++;

    // Check cache first
    const cachedResponse = this.checkCache(request);
    if (cachedResponse) {
      this.stats.successfulRequests++;
      return cachedResponse;
    }

    // Select provider
    const provider = this.selectProvider(request.preferredProvider);
    if (!provider) {
      this.stats.failedRequests++;
      this.emit('all_providers_unavailable', { type: 'all_providers_unavailable' });
      throw new Error('No providers available');
    }

    const config = this.providers.get(provider)!;
    const health = this.providerHealth.get(provider)!;

    // Check rate limit
    if (health.requestsThisMinute >= config.rateLimitPerMinute) {
      this.emit('rate_limit_hit', { type: 'rate_limit_hit', provider });

      // Try fallback
      if (request.allowFallback) {
        return this.handleFallback(request, provider);
      }

      throw new Error(`Rate limit exceeded for ${provider}`);
    }

    // Send request
    this.emit('request_sent', { type: 'request_sent', provider, requestId: request.id });
    health.requestsThisMinute++;

    try {
      const startTime = Date.now();
      const response = await this.callProvider(provider, config, request);
      const latencyMs = Date.now() - startTime;

      // Update stats
      this.stats.successfulRequests++;
      this.stats.totalTokensUsed += response.tokensUsed;
      this.stats.totalCost += response.cost;
      this.stats.averageLatency =
        (this.stats.averageLatency * (this.stats.successfulRequests - 1) + latencyMs) /
        this.stats.successfulRequests;

      // Update provider usage
      const currentUsage = this.stats.providerUsage.get(provider) || 0;
      this.stats.providerUsage.set(provider, currentUsage + 1);

      // Update health
      health.latencyMs = latencyMs;
      health.errorRate = Math.max(0, health.errorRate - 0.1);

      // Cache the response
      this.cacheResponse(request, response);

      this.emit('response_received', { type: 'response_received', response });

      return response;
    } catch (error) {
      // Update health
      health.errorRate = Math.min(1, health.errorRate + 0.2);
      health.lastError = String(error);

      this.emit('provider_error', {
        type: 'provider_error',
        provider,
        error: String(error),
      });

      // Try fallback
      if (request.allowFallback) {
        return this.handleFallback(request, provider);
      }

      this.stats.failedRequests++;
      throw error;
    }
  }

  /**
   * Select the best available provider
   */
  private selectProvider(preferred?: LLMProvider): LLMProvider | null {
    // If preferred provider is available, use it
    if (preferred) {
      const config = this.providers.get(preferred);
      const health = this.providerHealth.get(preferred);
      if (config?.enabled && health?.available && health.errorRate < 0.5) {
        return preferred;
      }
    }

    // Sort providers by priority and health
    const sortedProviders = Array.from(this.providers.entries())
      .filter(([provider, config]) => {
        const health = this.providerHealth.get(provider);
        return config.enabled && health?.available && health.errorRate < 0.5;
      })
      .sort(([, a], [, b]) => a.priority - b.priority);

    return sortedProviders.length > 0 ? sortedProviders[0][0] : null;
  }

  /**
   * Handle fallback to another provider
   */
  private async handleFallback(
    request: APIRequest,
    failedProvider: LLMProvider
  ): Promise<APIResponse> {
    this.stats.fallbacksUsed++;

    // Get next available provider
    const sortedProviders = Array.from(this.providers.entries())
      .filter(([provider, config]) => {
        if (provider === failedProvider) return false;
        const health = this.providerHealth.get(provider);
        return config.enabled && health?.available && health.errorRate < 0.8;
      })
      .sort(([, a], [, b]) => a.priority - b.priority);

    if (sortedProviders.length === 0) {
      this.emit('all_providers_unavailable', { type: 'all_providers_unavailable' });
      throw new Error('No fallback providers available');
    }

    const [nextProvider, config] = sortedProviders[0];
    this.emit('fallback_triggered', {
      type: 'fallback_triggered',
      from: failedProvider,
      to: nextProvider,
    });

    return this.callProvider(nextProvider, config, request);
  }

  /**
   * Simple prompt helper
   */
  public async prompt(text: string, systemPrompt?: string): Promise<string> {
    const response = await this.sendRequest({
      id: `prompt-${Date.now()}`,
      prompt: text,
      systemPrompt,
      allowFallback: true,
    });
    return response.text;
  }

  /**
   * Call a specific provider
   */
  private async callProvider(
    provider: LLMProvider,
    config: ProviderConfig,
    request: APIRequest
  ): Promise<APIResponse> {
    const startTime = Date.now();

    switch (provider) {
      case 'openai':
        return this.callOpenAI(config, request, startTime);
      case 'anthropic':
        return this.callAnthropic(config, request, startTime);
      case 'openrouter':
        return this.callOpenRouter(config, request, startTime);
      case 'local':
        return this.callLocal(config, request, startTime);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Call OpenAI API - REAL IMPLEMENTATION
   */
  private async callOpenAI(
    config: ProviderConfig,
    request: APIRequest,
    startTime: number
  ): Promise<APIResponse> {
    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await fetch(
      `${config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          max_tokens: request.maxTokens || config.maxTokens,
          temperature: request.temperature ?? config.temperature,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
    };

    const tokensUsed = data.usage?.total_tokens || 0;

    return {
      id: request.id,
      text: data.choices[0]?.message?.content || '',
      provider: 'openai',
      model: config.model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      cost: tokensUsed * config.costPerToken,
      cached: false,
    };
  }

  /**
   * Call Anthropic API - REAL IMPLEMENTATION
   */
  private async callAnthropic(
    config: ProviderConfig,
    request: APIRequest,
    startTime: number
  ): Promise<APIResponse> {
    if (!config.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch(`${config.baseUrl || 'https://api.anthropic.com/v1'}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: request.maxTokens || config.maxTokens,
        system: request.systemPrompt || 'You are a helpful AI assistant.',
        messages: [{ role: 'user', content: request.prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      content: Array<{ text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    return {
      id: request.id,
      text: data.content[0]?.text || '',
      provider: 'anthropic',
      model: config.model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      cost: tokensUsed * config.costPerToken,
      cached: false,
    };
  }

  /**
   * Call OpenRouter API - REAL IMPLEMENTATION
   */
  private async callOpenRouter(
    config: ProviderConfig,
    request: APIRequest,
    startTime: number
  ): Promise<APIResponse> {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await fetch(
      `${config.baseUrl || 'https://openrouter.ai/api/v1'}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'HTTP-Referer': 'https://deltecho.dev',
          'X-Title': 'Deep Tree Echo',
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          max_tokens: request.maxTokens || config.maxTokens,
          temperature: request.temperature ?? config.temperature,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
    };

    const tokensUsed = data.usage?.total_tokens || 0;

    return {
      id: request.id,
      text: data.choices[0]?.message?.content || '',
      provider: 'openrouter',
      model: config.model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      cost: tokensUsed * config.costPerToken,
      cached: false,
    };
  }

  /**
   * Call local inference (fallback to inner membrane native processing)
   */
  private async callLocal(
    config: ProviderConfig,
    request: APIRequest,
    startTime: number
  ): Promise<APIResponse> {
    // Local inference using pattern-based native processing
    // This provides basic functionality when no API keys are available

    const prompt = request.prompt.toLowerCase();
    let responseText: string;

    // Simple pattern matching for common queries
    if (prompt.includes('hello') || prompt.includes('hi')) {
      responseText =
        'Hello! I am Deep Tree Echo operating in autonomous mode. How can I assist you?';
    } else if (prompt.includes('help')) {
      responseText =
        'I can help with cognitive processing, memory management, and reasoning tasks. What would you like to explore?';
    } else if (prompt.includes('status') || prompt.includes('health')) {
      responseText =
        'System operational. Running in local inference mode with native pattern processing.';
    } else if (prompt.includes('think') || prompt.includes('reason')) {
      responseText = `Processing your query through native inference...

Based on the input "${request.prompt.substring(0, 100)}...", I observe:
1. The query relates to cognitive processing
2. Pattern analysis suggests exploratory intent
3. Recommended action: Further elaboration needed

This is a native inference response. For enhanced capabilities, configure external API providers.`;
    } else {
      // Default response with echo of input for processing
      responseText = `[Native Echo Processing]

Input received: "${request.prompt.substring(0, 200)}${request.prompt.length > 200 ? '...' : ''}"

Analysis:
- Token count: ~${Math.ceil(request.prompt.split(/\s+/).length)}
- Processing mode: Local inference
- Confidence: Medium

For more sophisticated responses, please configure OpenAI, Anthropic, or OpenRouter API keys.`;
    }

    const tokensUsed = Math.ceil(request.prompt.split(/\s+/).length * 1.3);

    return {
      id: request.id,
      text: responseText,
      provider: 'local',
      model: config.model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      cost: 0,
      cached: false,
    };
  }

  /**
   * Check provider health
   */
  private checkProviderHealth(): void {
    for (const [provider, health] of this.providerHealth.entries()) {
      const config = this.providers.get(provider);
      if (!config?.enabled) {
        health.available = false;
        continue;
      }

      // Mark as unavailable if error rate is too high
      health.available = health.errorRate < 0.8;
      health.lastChecked = Date.now();

      // Decay error rate over time
      health.errorRate = Math.max(0, health.errorRate - 0.05);
    }
  }

  /**
   * Reset rate limits
   */
  private resetRateLimits(): void {
    for (const health of this.providerHealth.values()) {
      health.requestsThisMinute = 0;
    }
  }

  /**
   * Get gateway statistics
   */
  public getStats(): GatewayStats {
    return {
      ...this.stats,
      providerUsage: new Map(this.stats.providerUsage),
    };
  }

  /**
   * Get provider health status
   */
  public getProviderHealth(): Map<LLMProvider, ProviderHealth> {
    return new Map(this.providerHealth);
  }

  /**
   * Get available providers
   */
  public getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.entries())
      .filter(([provider, config]) => {
        const health = this.providerHealth.get(provider);
        return config.enabled && health?.available;
      })
      .map(([provider]) => provider);
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get list of configured providers
   */
  public getProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * Update provider configuration
   */
  public updateProviderConfig(provider: LLMProvider, config: Partial<ProviderConfig>): void {
    const existing = this.providers.get(provider);
    if (existing) {
      this.providers.set(provider, { ...existing, ...config });
    }
  }

  /**
   * Enable/disable a provider
   */
  public setProviderEnabled(provider: LLMProvider, enabled: boolean): void {
    const config = this.providers.get(provider);
    if (config) {
      config.enabled = enabled;
    }
  }

  /**
   * Test provider connectivity
   */
  public async testProvider(
    provider: LLMProvider
  ): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const config = this.providers.get(provider);
    if (!config) {
      return { success: false, latencyMs: 0, error: 'Provider not configured' };
    }

    const startTime = Date.now();
    try {
      await this.callProvider(provider, config, {
        id: 'test',
        prompt: 'Hello',
        allowFallback: false,
      });
      return { success: true, latencyMs: Date.now() - startTime };
    } catch (error) {
      return { success: false, latencyMs: Date.now() - startTime, error: String(error) };
    }
  }
}

export default APIGateway;
