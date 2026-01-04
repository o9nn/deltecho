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
 * APIGateway - Manages external API interactions
 */
export class APIGateway extends EventEmitter {
  private providers: Map<LLMProvider, ProviderConfig>;
  private providerHealth: Map<LLMProvider, ProviderHealth>;
  private stats: GatewayStats;
  private running: boolean = false;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private rateLimitResetInterval?: ReturnType<typeof setInterval>;

  constructor(providerConfigs?: ProviderConfig[]) {
    super();
    this.providers = new Map();
    this.providerHealth = new Map();
    this.stats = this.initializeStats();

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
   * Send a request to an external LLM provider
   */
  public async sendRequest(request: APIRequest): Promise<APIResponse> {
    if (!this.running) {
      throw new Error('Gateway not running');
    }

    this.stats.totalRequests++;

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
    const availableProviders = Array.from(this.providers.entries())
      .filter(([provider, config]) => {
        const health = this.providerHealth.get(provider);
        return config.enabled && health?.available && health.errorRate < 0.8;
      })
      .sort(([, a], [, b]) => a.priority - b.priority);

    if (availableProviders.length === 0) {
      return null;
    }

    return availableProviders[0][0];
  }

  /**
   * Handle fallback to another provider
   */
  private async handleFallback(
    request: APIRequest,
    failedProvider: LLMProvider
  ): Promise<APIResponse> {
    this.stats.fallbacksUsed++;

    // Find next available provider
    const availableProviders = Array.from(this.providers.entries())
      .filter(([provider, config]) => {
        if (provider === failedProvider) return false;
        const health = this.providerHealth.get(provider);
        return config.enabled && health?.available && health.errorRate < 0.8;
      })
      .sort(([, a], [, b]) => a.priority - b.priority);

    if (availableProviders.length === 0) {
      this.emit('all_providers_unavailable', { type: 'all_providers_unavailable' });
      throw new Error('No fallback providers available');
    }

    const [fallbackProvider] = availableProviders[0];
    this.emit('fallback_triggered', {
      type: 'fallback_triggered',
      from: failedProvider,
      to: fallbackProvider,
    });

    // Retry with fallback provider
    return this.sendRequest({
      ...request,
      preferredProvider: fallbackProvider,
      allowFallback: false, // Prevent infinite fallback loop
    });
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
   * Call OpenAI API
   */
  private async callOpenAI(
    config: ProviderConfig,
    request: APIRequest,
    startTime: number
  ): Promise<APIResponse> {
    // In production, this would use the OpenAI SDK
    // For now, simulate the call
    await this.simulateAPICall(200);

    const tokensUsed = Math.ceil(request.prompt.split(/\s+/).length * 1.5);

    return {
      id: request.id,
      text: `[OpenAI ${config.model}] Response to: "${request.prompt.substring(0, 50)}..."`,
      provider: 'openai',
      model: config.model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      cost: tokensUsed * config.costPerToken,
      cached: false,
    };
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(
    config: ProviderConfig,
    request: APIRequest,
    startTime: number
  ): Promise<APIResponse> {
    await this.simulateAPICall(250);

    const tokensUsed = Math.ceil(request.prompt.split(/\s+/).length * 1.5);

    return {
      id: request.id,
      text: `[Anthropic ${config.model}] Response to: "${request.prompt.substring(0, 50)}..."`,
      provider: 'anthropic',
      model: config.model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      cost: tokensUsed * config.costPerToken,
      cached: false,
    };
  }

  /**
   * Call OpenRouter API
   */
  private async callOpenRouter(
    config: ProviderConfig,
    request: APIRequest,
    startTime: number
  ): Promise<APIResponse> {
    await this.simulateAPICall(180);

    const tokensUsed = Math.ceil(request.prompt.split(/\s+/).length * 1.5);

    return {
      id: request.id,
      text: `[OpenRouter ${config.model}] Response to: "${request.prompt.substring(0, 50)}..."`,
      provider: 'openrouter',
      model: config.model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      cost: tokensUsed * config.costPerToken,
      cached: false,
    };
  }

  /**
   * Call local inference (fallback to inner membrane)
   */
  private async callLocal(
    config: ProviderConfig,
    request: APIRequest,
    startTime: number
  ): Promise<APIResponse> {
    await this.simulateAPICall(50);

    const tokensUsed = Math.ceil(request.prompt.split(/\s+/).length * 1.3);

    return {
      id: request.id,
      text: `[Local ${config.model}] Processing: "${request.prompt.substring(0, 50)}..."`,
      provider: 'local',
      model: config.model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      cost: 0,
      cached: false,
    };
  }

  /**
   * Simulate API call latency
   */
  private simulateAPICall(baseMs: number): Promise<void> {
    const variance = Math.random() * 50 - 25;
    return new Promise((resolve) => setTimeout(resolve, baseMs + variance));
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
}

export default APIGateway;
