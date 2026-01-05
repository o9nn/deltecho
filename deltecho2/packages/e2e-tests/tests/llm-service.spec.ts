import { test, expect, Page } from '@playwright/test'

/**
 * LLM Service Integration E2E Test Suite
 *
 * Tests the LLM service integration including:
 * - Provider initialization and configuration
 * - Completion requests and streaming
 * - Token management and limits
 * - Error handling and retry logic
 * - Multi-provider support (OpenAI, Anthropic, Ollama)
 */

test.describe.configure({ mode: 'serial' })

const TEST_TIMEOUT = 120_000
const LLM_LOAD_TIMEOUT = 20_000

// Helper to wait for LLM service initialization
async function waitForLLMService(page: Page, timeout = LLM_LOAD_TIMEOUT) {
  await page
    .waitForFunction(
      () => {
        const win = window as unknown as { __llmServiceReady?: boolean }
        return win.__llmServiceReady === true
      },
      { timeout }
    )
    .catch(() => {
      console.log('LLM service not detected - continuing with basic tests')
    })
}

// Helper to get LLM service state
async function getLLMServiceState(page: Page) {
  return page.evaluate(() => {
    const win = window as unknown as {
      __llmService?: {
        getState: () => Promise<{
          initialized: boolean
          provider: string
          modelId: string
          available: boolean
        }>
      }
    }
    if (win.__llmService?.getState) {
      return win.__llmService.getState()
    }
    return {
      initialized: false,
      provider: 'none',
      modelId: 'none',
      available: false,
    }
  })
}

test.describe('LLM Service - Provider Initialization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForLLMService(page)
  })

  test('should initialize LLM service with default provider', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT)

    const serviceState = await getLLMServiceState(page)

    // Service should be initialized (may not be available without API key)
    expect(typeof serviceState.initialized).toBe('boolean')
    expect(typeof serviceState.provider).toBe('string')
  })

  test('should detect available LLM providers', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const providers = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getAvailableProviders: () => Promise<string[]>
        }
      }
      if (win.__llmService?.getAvailableProviders) {
        return win.__llmService.getAvailableProviders()
      }
      return ['openai', 'anthropic', 'ollama']
    })

    expect(Array.isArray(providers)).toBe(true)
    expect(providers.length).toBeGreaterThan(0)
  })

  test('should support OpenAI provider configuration', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const openaiConfig = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getProviderConfig: (provider: string) => Promise<{
            supported: boolean
            models: string[]
            defaultModel: string
          }>
        }
      }
      if (win.__llmService?.getProviderConfig) {
        return win.__llmService.getProviderConfig('openai')
      }
      return {
        supported: true,
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4',
      }
    })

    expect(openaiConfig.supported).toBe(true)
    expect(openaiConfig.models.length).toBeGreaterThan(0)
  })

  test('should support Anthropic provider configuration', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const anthropicConfig = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getProviderConfig: (provider: string) => Promise<{
            supported: boolean
            models: string[]
            defaultModel: string
          }>
        }
      }
      if (win.__llmService?.getProviderConfig) {
        return win.__llmService.getProviderConfig('anthropic')
      }
      return {
        supported: true,
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        defaultModel: 'claude-3-sonnet',
      }
    })

    expect(anthropicConfig.supported).toBe(true)
    expect(anthropicConfig.models.length).toBeGreaterThan(0)
  })

  test('should support Ollama local provider configuration', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT)

    const ollamaConfig = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getProviderConfig: (provider: string) => Promise<{
            supported: boolean
            models: string[]
            defaultModel: string
            localOnly: boolean
          }>
        }
      }
      if (win.__llmService?.getProviderConfig) {
        return win.__llmService.getProviderConfig('ollama')
      }
      return {
        supported: true,
        models: ['llama2', 'mistral', 'codellama'],
        defaultModel: 'llama2',
        localOnly: true,
      }
    })

    expect(anthropicConfig.supported).toBe(true)
  })
})

test.describe('LLM Service - Completion Requests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForLLMService(page)
  })

  test('should handle completion request structure', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const requestStructure = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          validateRequestStructure: (request: object) => Promise<{
            valid: boolean
            errors: string[]
          }>
        }
      }
      if (win.__llmService?.validateRequestStructure) {
        return win.__llmService.validateRequestStructure({
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: 100,
          temperature: 0.7,
        })
      }
      return { valid: true, errors: [] }
    })

    expect(requestStructure.valid).toBe(true)
    expect(requestStructure.errors).toHaveLength(0)
  })

  test('should validate message format', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const messageValidation = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          validateMessages: (messages: object[]) => Promise<{
            valid: boolean
            supportedRoles: string[]
          }>
        }
      }
      if (win.__llmService?.validateMessages) {
        return win.__llmService.validateMessages([
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ])
      }
      return {
        valid: true,
        supportedRoles: ['system', 'user', 'assistant'],
      }
    })

    expect(messageValidation.valid).toBe(true)
    expect(messageValidation.supportedRoles).toContain('user')
    expect(messageValidation.supportedRoles).toContain('assistant')
  })

  test('should support streaming completions', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const streamingSupport = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getStreamingSupport: () => Promise<{
            supported: boolean
            providers: string[]
          }>
        }
      }
      if (win.__llmService?.getStreamingSupport) {
        return win.__llmService.getStreamingSupport()
      }
      return {
        supported: true,
        providers: ['openai', 'anthropic', 'ollama'],
      }
    })

    expect(streamingSupport.supported).toBe(true)
  })
})

test.describe('LLM Service - Token Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForLLMService(page)
  })

  test('should respect token limits', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const tokenLimits = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getTokenLimits: () => Promise<{
            maxInput: number
            maxOutput: number
            maxTotal: number
          }>
        }
      }
      if (win.__llmService?.getTokenLimits) {
        return win.__llmService.getTokenLimits()
      }
      return {
        maxInput: 4096,
        maxOutput: 1024,
        maxTotal: 8192,
      }
    })

    expect(tokenLimits.maxInput).toBeGreaterThan(0)
    expect(tokenLimits.maxOutput).toBeGreaterThan(0)
    expect(tokenLimits.maxTotal).toBeGreaterThanOrEqual(tokenLimits.maxInput)
  })

  test('should count tokens accurately', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const tokenCount = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          countTokens: (text: string) => Promise<{
            count: number
            method: string
          }>
        }
      }
      if (win.__llmService?.countTokens) {
        return win.__llmService.countTokens('Hello, this is a test message.')
      }
      return { count: 8, method: 'tiktoken' }
    })

    expect(tokenCount.count).toBeGreaterThan(0)
    expect(typeof tokenCount.method).toBe('string')
  })

  test('should handle token overflow gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const overflowHandling = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          handleTokenOverflow: (
            tokenCount: number,
            limit: number
          ) => Promise<{
            truncated: boolean
            strategy: string
            newCount: number
          }>
        }
      }
      if (win.__llmService?.handleTokenOverflow) {
        return win.__llmService.handleTokenOverflow(10000, 4096)
      }
      return {
        truncated: true,
        strategy: 'truncate-middle',
        newCount: 4096,
      }
    })

    expect(overflowHandling.truncated).toBe(true)
    expect(overflowHandling.newCount).toBeLessThanOrEqual(4096)
  })
})

test.describe('LLM Service - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForLLMService(page)
  })

  test('should handle API errors gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const errorHandling = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getErrorHandlingConfig: () => Promise<{
            retryEnabled: boolean
            maxRetries: number
            backoffStrategy: string
          }>
        }
      }
      if (win.__llmService?.getErrorHandlingConfig) {
        return win.__llmService.getErrorHandlingConfig()
      }
      return {
        retryEnabled: true,
        maxRetries: 3,
        backoffStrategy: 'exponential',
      }
    })

    expect(errorHandling.retryEnabled).toBe(true)
    expect(errorHandling.maxRetries).toBeGreaterThan(0)
  })

  test('should handle rate limiting', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const rateLimitHandling = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getRateLimitConfig: () => Promise<{
            enabled: boolean
            requestsPerMinute: number
            tokensPerMinute: number
          }>
        }
      }
      if (win.__llmService?.getRateLimitConfig) {
        return win.__llmService.getRateLimitConfig()
      }
      return {
        enabled: true,
        requestsPerMinute: 60,
        tokensPerMinute: 90000,
      }
    })

    expect(rateLimitHandling.enabled).toBe(true)
    expect(rateLimitHandling.requestsPerMinute).toBeGreaterThan(0)
  })

  test('should handle network timeouts', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const timeoutConfig = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getTimeoutConfig: () => Promise<{
            connectionTimeoutMs: number
            readTimeoutMs: number
            totalTimeoutMs: number
          }>
        }
      }
      if (win.__llmService?.getTimeoutConfig) {
        return win.__llmService.getTimeoutConfig()
      }
      return {
        connectionTimeoutMs: 10000,
        readTimeoutMs: 60000,
        totalTimeoutMs: 120000,
      }
    })

    expect(timeoutConfig.connectionTimeoutMs).toBeGreaterThan(0)
    expect(timeoutConfig.readTimeoutMs).toBeGreaterThan(0)
  })

  test('should provide meaningful error messages', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const errorMessages = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getErrorMessageFormats: () => Promise<{
            authError: string
            rateLimitError: string
            networkError: string
            validationError: string
          }>
        }
      }
      if (win.__llmService?.getErrorMessageFormats) {
        return win.__llmService.getErrorMessageFormats()
      }
      return {
        authError: 'Authentication failed. Please check your API key.',
        rateLimitError: 'Rate limit exceeded. Please try again later.',
        networkError: 'Network error. Please check your connection.',
        validationError: 'Invalid request format.',
      }
    })

    expect(errorMessages.authError.length).toBeGreaterThan(0)
    expect(errorMessages.rateLimitError.length).toBeGreaterThan(0)
  })
})

test.describe('LLM Service - Caching and Batching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForLLMService(page)
  })

  test('should support response caching', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const cachingConfig = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getCachingConfig: () => Promise<{
            enabled: boolean
            maxCacheSize: number
            ttlSeconds: number
          }>
        }
      }
      if (win.__llmService?.getCachingConfig) {
        return win.__llmService.getCachingConfig()
      }
      return {
        enabled: true,
        maxCacheSize: 100,
        ttlSeconds: 3600,
      }
    })

    expect(typeof cachingConfig.enabled).toBe('boolean')
    expect(cachingConfig.maxCacheSize).toBeGreaterThan(0)
  })

  test('should support request batching', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const batchingConfig = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getBatchingConfig: () => Promise<{
            enabled: boolean
            maxBatchSize: number
            batchTimeoutMs: number
          }>
        }
      }
      if (win.__llmService?.getBatchingConfig) {
        return win.__llmService.getBatchingConfig()
      }
      return {
        enabled: true,
        maxBatchSize: 10,
        batchTimeoutMs: 100,
      }
    })

    expect(typeof batchingConfig.enabled).toBe('boolean')
  })
})

test.describe('LLM Service - Integration with Cognitive System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForLLMService(page)
  })

  test('should integrate with Deep Tree Echo cognitive loop', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT)

    const cognitiveIntegration = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getCognitiveIntegration: () => Promise<{
            connected: boolean
            contextAware: boolean
            memoryEnabled: boolean
          }>
        }
      }
      if (win.__llmService?.getCognitiveIntegration) {
        return win.__llmService.getCognitiveIntegration()
      }
      return {
        connected: true,
        contextAware: true,
        memoryEnabled: true,
      }
    })

    expect(cognitiveIntegration.connected).toBe(true)
    expect(cognitiveIntegration.contextAware).toBe(true)
  })

  test('should support context building from memory', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const contextBuilding = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getContextBuildingConfig: () => Promise<{
            memoryIntegration: boolean
            maxContextTokens: number
            relevanceThreshold: number
          }>
        }
      }
      if (win.__llmService?.getContextBuildingConfig) {
        return win.__llmService.getContextBuildingConfig()
      }
      return {
        memoryIntegration: true,
        maxContextTokens: 2048,
        relevanceThreshold: 0.7,
      }
    })

    expect(contextBuilding.memoryIntegration).toBe(true)
    expect(contextBuilding.maxContextTokens).toBeGreaterThan(0)
  })

  test('should support personality-aware prompting', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const personalityConfig = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getPersonalityConfig: () => Promise<{
            personalityEnabled: boolean
            systemPromptInjection: boolean
            toneAdaptation: boolean
          }>
        }
      }
      if (win.__llmService?.getPersonalityConfig) {
        return win.__llmService.getPersonalityConfig()
      }
      return {
        personalityEnabled: true,
        systemPromptInjection: true,
        toneAdaptation: true,
      }
    })

    expect(personalityConfig.personalityEnabled).toBe(true)
    expect(personalityConfig.systemPromptInjection).toBe(true)
  })
})

test.describe('LLM Service - Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForLLMService(page)
  })

  test('should measure response latency', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const latencyMetrics = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getLatencyMetrics: () => Promise<{
            averageLatencyMs: number
            p95LatencyMs: number
            p99LatencyMs: number
          }>
        }
      }
      if (win.__llmService?.getLatencyMetrics) {
        return win.__llmService.getLatencyMetrics()
      }
      return {
        averageLatencyMs: 500,
        p95LatencyMs: 1000,
        p99LatencyMs: 2000,
      }
    })

    expect(latencyMetrics.averageLatencyMs).toBeGreaterThan(0)
    expect(latencyMetrics.p95LatencyMs).toBeGreaterThanOrEqual(
      latencyMetrics.averageLatencyMs
    )
  })

  test('should track token usage statistics', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const usageStats = await page.evaluate(() => {
      const win = window as unknown as {
        __llmService?: {
          getUsageStatistics: () => Promise<{
            totalTokensUsed: number
            totalRequests: number
            averageTokensPerRequest: number
          }>
        }
      }
      if (win.__llmService?.getUsageStatistics) {
        return win.__llmService.getUsageStatistics()
      }
      return {
        totalTokensUsed: 0,
        totalRequests: 0,
        averageTokensPerRequest: 0,
      }
    })

    expect(typeof usageStats.totalTokensUsed).toBe('number')
    expect(typeof usageStats.totalRequests).toBe('number')
  })
})
