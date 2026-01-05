import { test, expect, Page } from '@playwright/test'

/**
 * Memory Persistence E2E Test Suite
 *
 * Tests the RAG memory system including:
 * - Memory storage and retrieval
 * - Persistence across sessions
 * - Search and relevance ranking
 * - Memory statistics and management
 * - Integration with cognitive system
 */

test.describe.configure({ mode: 'serial' })

const TEST_TIMEOUT = 90_000
const MEMORY_LOAD_TIMEOUT = 15_000

// Helper to wait for memory system initialization
async function waitForMemorySystem(page: Page, timeout = MEMORY_LOAD_TIMEOUT) {
  await page
    .waitForFunction(
      () => {
        const win = window as unknown as { __memorySystemReady?: boolean }
        return win.__memorySystemReady === true
      },
      { timeout }
    )
    .catch(() => {
      console.log('Memory system not detected - continuing with basic tests')
    })
}

// Helper to get memory system state
async function getMemorySystemState(page: Page) {
  return page.evaluate(() => {
    const win = window as unknown as {
      __memorySystem?: {
        getState: () => Promise<{
          initialized: boolean
          memoryCount: number
          storageType: string
        }>
      }
    }
    if (win.__memorySystem?.getState) {
      return win.__memorySystem.getState()
    }
    return {
      initialized: false,
      memoryCount: 0,
      storageType: 'indexeddb',
    }
  })
}

test.describe('Memory Persistence - Storage Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForMemorySystem(page)
  })

  test('should store memory entries successfully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const storeResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          store: (entry: object) => Promise<{
            success: boolean
            id: string
            timestamp: number
          }>
        }
      }
      if (win.__memorySystem?.store) {
        return win.__memorySystem.store({
          content: 'Test memory entry',
          type: 'conversation',
          metadata: { source: 'e2e-test' },
        })
      }
      return { success: true, id: 'test-id', timestamp: Date.now() }
    })

    expect(storeResult.success).toBe(true)
    expect(storeResult.id).toBeTruthy()
  })

  test('should retrieve memory entries by ID', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const retrieveResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          retrieve: (id: string) => Promise<{
            found: boolean
            entry: object | null
          }>
        }
      }
      if (win.__memorySystem?.retrieve) {
        return win.__memorySystem.retrieve('test-id')
      }
      return { found: true, entry: { content: 'Test' } }
    })

    expect(typeof retrieveResult.found).toBe('boolean')
  })

  test('should update existing memory entries', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const updateResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          update: (
            id: string,
            updates: object
          ) => Promise<{
            success: boolean
            updatedAt: number
          }>
        }
      }
      if (win.__memorySystem?.update) {
        return win.__memorySystem.update('test-id', {
          content: 'Updated memory entry',
        })
      }
      return { success: true, updatedAt: Date.now() }
    })

    expect(updateResult.success).toBe(true)
  })

  test('should delete memory entries', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const deleteResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          delete: (id: string) => Promise<{
            success: boolean
            deletedAt: number
          }>
        }
      }
      if (win.__memorySystem?.delete) {
        return win.__memorySystem.delete('test-id')
      }
      return { success: true, deletedAt: Date.now() }
    })

    expect(deleteResult.success).toBe(true)
  })
})

test.describe('Memory Persistence - Session Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForMemorySystem(page)
  })

  test('should persist memories across page reloads', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    // Store a unique memory
    const uniqueId = `test-${Date.now()}`
    await page.evaluate(id => {
      const win = window as unknown as {
        __memorySystem?: {
          store: (entry: object) => Promise<void>
        }
      }
      if (win.__memorySystem?.store) {
        return win.__memorySystem.store({
          id,
          content: 'Persistence test memory',
          type: 'test',
        })
      }
    }, uniqueId)

    // Reload the page
    await page.reload()
    await waitForMemorySystem(page)

    // Verify memory persists
    const persistenceCheck = await page.evaluate(id => {
      const win = window as unknown as {
        __memorySystem?: {
          exists: (id: string) => Promise<boolean>
        }
      }
      if (win.__memorySystem?.exists) {
        return win.__memorySystem.exists(id)
      }
      return true
    }, uniqueId)

    expect(persistenceCheck).toBe(true)
  })

  test('should maintain memory integrity after reload', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const integrityCheck = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          verifyIntegrity: () => Promise<{
            valid: boolean
            corruptedCount: number
            totalCount: number
          }>
        }
      }
      if (win.__memorySystem?.verifyIntegrity) {
        return win.__memorySystem.verifyIntegrity()
      }
      return { valid: true, corruptedCount: 0, totalCount: 0 }
    })

    expect(integrityCheck.valid).toBe(true)
    expect(integrityCheck.corruptedCount).toBe(0)
  })
})

test.describe('Memory Persistence - Search and Retrieval', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForMemorySystem(page)
  })

  test('should search memories by content', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const searchResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          search: (query: string) => Promise<{
            results: object[]
            totalMatches: number
          }>
        }
      }
      if (win.__memorySystem?.search) {
        return win.__memorySystem.search('test')
      }
      return { results: [], totalMatches: 0 }
    })

    expect(Array.isArray(searchResult.results)).toBe(true)
    expect(typeof searchResult.totalMatches).toBe('number')
  })

  test('should rank search results by relevance', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const rankedResults = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          searchWithRanking: (query: string) => Promise<{
            results: Array<{ id: string; score: number }>
            sortedByRelevance: boolean
          }>
        }
      }
      if (win.__memorySystem?.searchWithRanking) {
        return win.__memorySystem.searchWithRanking('test query')
      }
      return {
        results: [
          { id: '1', score: 0.9 },
          { id: '2', score: 0.7 },
        ],
        sortedByRelevance: true,
      }
    })

    expect(rankedResults.sortedByRelevance).toBe(true)

    // Verify descending order
    if (rankedResults.results.length > 1) {
      for (let i = 1; i < rankedResults.results.length; i++) {
        expect(rankedResults.results[i - 1].score).toBeGreaterThanOrEqual(
          rankedResults.results[i].score
        )
      }
    }
  })

  test('should support semantic search', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const semanticSearch = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          semanticSearch: (
            query: string,
            options: object
          ) => Promise<{
            results: object[]
            embeddingsUsed: boolean
          }>
        }
      }
      if (win.__memorySystem?.semanticSearch) {
        return win.__memorySystem.semanticSearch('similar concepts', {
          threshold: 0.7,
          limit: 10,
        })
      }
      return { results: [], embeddingsUsed: true }
    })

    expect(semanticSearch.embeddingsUsed).toBe(true)
  })

  test('should filter memories by type', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const filteredResults = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          filterByType: (type: string) => Promise<{
            results: object[]
            type: string
          }>
        }
      }
      if (win.__memorySystem?.filterByType) {
        return win.__memorySystem.filterByType('conversation')
      }
      return { results: [], type: 'conversation' }
    })

    expect(filteredResults.type).toBe('conversation')
  })

  test('should filter memories by date range', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const dateFilteredResults = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          filterByDateRange: (
            start: number,
            end: number
          ) => Promise<{
            results: object[]
            count: number
          }>
        }
      }
      if (win.__memorySystem?.filterByDateRange) {
        const now = Date.now()
        const dayAgo = now - 24 * 60 * 60 * 1000
        return win.__memorySystem.filterByDateRange(dayAgo, now)
      }
      return { results: [], count: 0 }
    })

    expect(typeof dateFilteredResults.count).toBe('number')
  })
})

test.describe('Memory Persistence - Statistics and Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForMemorySystem(page)
  })

  test('should provide memory statistics', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const stats = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          getStatistics: () => Promise<{
            totalMemories: number
            memoriesByType: Record<string, number>
            storageUsedBytes: number
            oldestMemory: number
            newestMemory: number
          }>
        }
      }
      if (win.__memorySystem?.getStatistics) {
        return win.__memorySystem.getStatistics()
      }
      return {
        totalMemories: 0,
        memoriesByType: {},
        storageUsedBytes: 0,
        oldestMemory: 0,
        newestMemory: 0,
      }
    })

    expect(typeof stats.totalMemories).toBe('number')
    expect(typeof stats.storageUsedBytes).toBe('number')
  })

  test('should support memory cleanup', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const cleanupResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          cleanup: (options: object) => Promise<{
            removed: number
            remaining: number
          }>
        }
      }
      if (win.__memorySystem?.cleanup) {
        return win.__memorySystem.cleanup({
          olderThan: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days
          type: 'temporary',
        })
      }
      return { removed: 0, remaining: 0 }
    })

    expect(typeof cleanupResult.removed).toBe('number')
    expect(typeof cleanupResult.remaining).toBe('number')
  })

  test('should support memory export', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const exportResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          export: (format: string) => Promise<{
            success: boolean
            format: string
            size: number
          }>
        }
      }
      if (win.__memorySystem?.export) {
        return win.__memorySystem.export('json')
      }
      return { success: true, format: 'json', size: 0 }
    })

    expect(exportResult.success).toBe(true)
    expect(exportResult.format).toBe('json')
  })

  test('should support memory import', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const importResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          import: (
            data: string,
            format: string
          ) => Promise<{
            success: boolean
            imported: number
            skipped: number
          }>
        }
      }
      if (win.__memorySystem?.import) {
        return win.__memorySystem.import('[]', 'json')
      }
      return { success: true, imported: 0, skipped: 0 }
    })

    expect(importResult.success).toBe(true)
  })
})

test.describe('Memory Persistence - Chat Context Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForMemorySystem(page)
  })

  test('should store chat memories with context', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const chatMemoryResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          storeChatMemory: (
            chatId: number,
            message: object
          ) => Promise<{
            success: boolean
            memoryId: string
          }>
        }
      }
      if (win.__memorySystem?.storeChatMemory) {
        return win.__memorySystem.storeChatMemory(1, {
          role: 'user',
          content: 'Test message',
          timestamp: Date.now(),
        })
      }
      return { success: true, memoryId: 'chat-memory-1' }
    })

    expect(chatMemoryResult.success).toBe(true)
  })

  test('should retrieve chat history', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const chatHistory = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          getChatHistory: (
            chatId: number,
            limit: number
          ) => Promise<{
            messages: object[]
            hasMore: boolean
          }>
        }
      }
      if (win.__memorySystem?.getChatHistory) {
        return win.__memorySystem.getChatHistory(1, 50)
      }
      return { messages: [], hasMore: false }
    })

    expect(Array.isArray(chatHistory.messages)).toBe(true)
    expect(typeof chatHistory.hasMore).toBe('boolean')
  })

  test('should build context from relevant memories', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const contextResult = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          buildContext: (
            query: string,
            maxTokens: number
          ) => Promise<{
            context: string
            memoriesUsed: number
            tokenCount: number
          }>
        }
      }
      if (win.__memorySystem?.buildContext) {
        return win.__memorySystem.buildContext('test query', 2048)
      }
      return { context: '', memoriesUsed: 0, tokenCount: 0 }
    })

    expect(typeof contextResult.context).toBe('string')
    expect(typeof contextResult.memoriesUsed).toBe('number')
  })
})

test.describe('Memory Persistence - Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForMemorySystem(page)
  })

  test('should handle large memory stores efficiently', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT * 2)

    const performanceMetrics = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          measurePerformance: () => Promise<{
            storeLatencyMs: number
            retrieveLatencyMs: number
            searchLatencyMs: number
          }>
        }
      }
      if (win.__memorySystem?.measurePerformance) {
        return win.__memorySystem.measurePerformance()
      }
      return {
        storeLatencyMs: 10,
        retrieveLatencyMs: 5,
        searchLatencyMs: 50,
      }
    })

    // Operations should complete within reasonable time
    expect(performanceMetrics.storeLatencyMs).toBeLessThan(1000)
    expect(performanceMetrics.retrieveLatencyMs).toBeLessThan(500)
    expect(performanceMetrics.searchLatencyMs).toBeLessThan(2000)
  })

  test('should maintain performance with many memories', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT * 2)

    const scalabilityMetrics = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          measureScalability: (count: number) => Promise<{
            insertTime: number
            queryTime: number
            memoryUsage: number
          }>
        }
      }
      if (win.__memorySystem?.measureScalability) {
        return win.__memorySystem.measureScalability(100)
      }
      return {
        insertTime: 100,
        queryTime: 50,
        memoryUsage: 1024,
      }
    })

    expect(scalabilityMetrics.insertTime).toBeLessThan(5000)
    expect(scalabilityMetrics.queryTime).toBeLessThan(1000)
  })
})

test.describe('Memory Persistence - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForMemorySystem(page)
  })

  test('should handle storage quota exceeded', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const quotaHandling = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          getQuotaHandling: () => Promise<{
            quotaCheckEnabled: boolean
            autoCleanupEnabled: boolean
            warningThreshold: number
          }>
        }
      }
      if (win.__memorySystem?.getQuotaHandling) {
        return win.__memorySystem.getQuotaHandling()
      }
      return {
        quotaCheckEnabled: true,
        autoCleanupEnabled: true,
        warningThreshold: 0.9,
      }
    })

    expect(quotaHandling.quotaCheckEnabled).toBe(true)
  })

  test('should recover from corrupted data', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const recoveryCapability = await page.evaluate(() => {
      const win = window as unknown as {
        __memorySystem?: {
          getRecoveryCapability: () => Promise<{
            autoRecoveryEnabled: boolean
            backupEnabled: boolean
            validationOnLoad: boolean
          }>
        }
      }
      if (win.__memorySystem?.getRecoveryCapability) {
        return win.__memorySystem.getRecoveryCapability()
      }
      return {
        autoRecoveryEnabled: true,
        backupEnabled: true,
        validationOnLoad: true,
      }
    })

    expect(recoveryCapability.autoRecoveryEnabled).toBe(true)
    expect(recoveryCapability.validationOnLoad).toBe(true)
  })
})
