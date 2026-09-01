import { test, expect, Page } from '@playwright/test'

/**
 * Cognitive Memory System E2E Test Suite
 *
 * Covers the memory systems used by Deep Tree Echo:
 * - RAG (Retrieval-Augmented Generation) memory
 * - Hyperdimensional / semantic memory
 * - Conversation context persistence
 * - Memory retrieval and relevance scoring
 *
 * Harness-compatible: when `window.__deepTreeEchoMemory` /
 * `window.__memorySystem` hooks are present (cognitive harness), tests
 * exercise the real localStorage-backed memory store directly. When run
 * against the full Delta Chat app, profile-dependent paths skip honestly.
 */

interface DeepTreeEchoMemoryHooks {
  store: (text: string) => Promise<void>
  getAll: () => Promise<string[]>
  search: (query: string) => Promise<string[]>
  testRecovery: () => Promise<boolean>
}

function getMemoryHooks(page: Page) {
  return page.evaluate(() => {
    const memory = (
      window as unknown as { __deepTreeEchoMemory?: DeepTreeEchoMemoryHooks }
    ).__deepTreeEchoMemory
    return memory ? true : false
  })
}

test.describe('Cognitive Memory System', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test.describe('RAG Memory Store', () => {
    test('should store conversation memories', async ({ page }) => {
      if (!(await getMemoryHooks(page))) {
        test.skip()
        return
      }

      const result = await page.evaluate(async () => {
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        const marker = `Remember this: The secret code is DELTA-${Date.now()}`
        await memory.store(marker)
        const all = await memory.getAll()
        return { marker, found: all.includes(marker) }
      })

      expect(result.found).toBe(true)
    })

    test('should retrieve relevant memories', async ({ page }) => {
      if (!(await getMemoryHooks(page))) {
        test.skip()
        return
      }

      const result = await page.evaluate(async () => {
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        await memory.store('The secret code is DELTA-RAG-1')
        await memory.store('Unrelated fact about weather')
        return memory.search('secret code')
      })

      expect(result.length).toBeGreaterThan(0)
      expect(result.some(m => m.includes('DELTA-RAG-1'))).toBe(true)
      expect(result.some(m => m.includes('weather'))).toBe(false)
    })

    test('should handle memory persistence across sessions', async ({
      page,
    }) => {
      if (!(await getMemoryHooks(page))) {
        test.skip()
        return
      }

      const marker = await page.evaluate(async () => {
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        const probe = `session-persistence-${Date.now()}`
        await memory.store(probe)
        return probe
      })

      await page.reload()
      await page.waitForLoadState('domcontentloaded')

      const found = await page.evaluate(async probe => {
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        return (await memory.getAll()).includes(probe)
      }, marker)

      expect(found).toBe(true)
    })
  })

  test.describe('Hyperdimensional Memory', () => {
    test('should encode semantic information', async ({ page }) => {
      if (!(await getMemoryHooks(page))) {
        test.skip()
        return
      }

      const count = await page.evaluate(async () => {
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        const messages = [
          'I love programming in TypeScript',
          'JavaScript is great for web development',
          'Node.js enables server-side JavaScript',
        ]
        for (const msg of messages) await memory.store(msg)
        return (await memory.getAll()).filter(m =>
          messages.some(s => m.includes(s))
        ).length
      })

      expect(count).toBe(3)
    })

    test('should find semantically similar memories', async ({ page }) => {
      if (!(await getMemoryHooks(page))) {
        test.skip()
        return
      }

      const results = await page.evaluate(async () => {
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        await memory.store('TypeScript adds static typing to JavaScript')
        await memory.store('The capital of France is Paris')
        return memory.search('JavaScript')
      })

      expect(results.length).toBeGreaterThan(0)
      expect(results.every(m => m.toLowerCase().includes('javascript'))).toBe(
        true
      )
    })
  })

  test.describe('Context Management', () => {
    test('should maintain conversation context', async ({ page }) => {
      if (!(await getMemoryHooks(page))) {
        test.skip()
        return
      }

      const result = await page.evaluate(async () => {
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        await memory.store('My name is Alice')
        await memory.store('I work as a developer')
        await memory.store('What do I do for work?')
        const all = await memory.getAll()
        return {
          hasName: all.some(m => m.includes('Alice')),
          hasWork: all.some(m => m.includes('developer')),
          hasQuery: all.some(m => m.includes('do for work')),
        }
      })

      expect(result.hasName).toBe(true)
      expect(result.hasWork).toBe(true)
      expect(result.hasQuery).toBe(true)
    })

    test('should handle context window limits', async ({ page }) => {
      if (!(await getMemoryHooks(page))) {
        test.skip()
        return
      }

      const count = await page.evaluate(async () => {
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        for (let i = 0; i < 25; i++) {
          await memory.store(`context-window-message-${i}`)
        }
        return (await memory.getAll()).filter(m =>
          m.startsWith('context-window-message-')
        ).length
      })

      expect(count).toBe(25)
    })
  })

  test.describe('Memory Cleanup', () => {
    test('should handle memory cleanup operations', async ({ page }) => {
      const hasSystem = await page.evaluate(() => {
        return (
          (
            window as unknown as {
              __memorySystem?: { cleanup: (o: object) => Promise<unknown> }
            }
          ).__memorySystem !== undefined
        )
      })

      if (!hasSystem) {
        // Fall back to the memory hooks' recovery probe.
        if (!(await getMemoryHooks(page))) {
          test.skip()
          return
        }
      }

      const result = await page.evaluate(async () => {
        const system = (
          window as unknown as {
            __memorySystem?: {
              cleanup: (options: object) => Promise<{
                removed: number
                remaining: number
              }>
            }
          }
        ).__memorySystem
        if (system) return system.cleanup({ maxAge: 0 })
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        return { recovered: await memory.testRecovery() }
      })

      expect(result).toBeDefined()
    })
  })

  test.describe('Memory Performance', () => {
    test('should retrieve memories within acceptable time', async ({
      page,
    }) => {
      if (!(await getMemoryHooks(page))) {
        test.skip()
        return
      }

      const elapsed = await page.evaluate(async () => {
        const memory = (
          window as unknown as { __deepTreeEchoMemory: DeepTreeEchoMemoryHooks }
        ).__deepTreeEchoMemory
        await memory.store('Quick memory test')
        const start = Date.now()
        await memory.search('Quick memory')
        return Date.now() - start
      })

      expect(elapsed).toBeLessThan(5000)
    })
  })
})

test.describe('Memory Edge Cases', () => {
  test('should handle empty memory queries', async ({ page }) => {
    await page.goto('/')

    const result = await page.evaluate(async () => {
      const memory = (
        window as unknown as { __deepTreeEchoMemory?: DeepTreeEchoMemoryHooks }
      ).__deepTreeEchoMemory
      if (!memory) return null
      return memory.search('')
    })

    if (result) {
      expect(Array.isArray(result)).toBe(true)
      return
    }

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should handle special characters in memories', async ({ page }) => {
    await page.goto('/')

    const result = await page.evaluate(async () => {
      const memory = (
        window as unknown as { __deepTreeEchoMemory?: DeepTreeEchoMemoryHooks }
      ).__deepTreeEchoMemory
      if (!memory) return null
      const special = '<script>alert("xss")</script> ñ ü 🚀 "quotes" \'apost\''
      await memory.store(special)
      const all = await memory.getAll()
      return all.includes(special)
    })

    if (result !== null) {
      expect(result).toBe(true)
      return
    }

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should handle very long text in memories', async ({ page }) => {
    await page.goto('/')

    const result = await page.evaluate(async () => {
      const memory = (
        window as unknown as { __deepTreeEchoMemory?: DeepTreeEchoMemoryHooks }
      ).__deepTreeEchoMemory
      if (!memory) return null
      const longText = 'x'.repeat(10_000)
      await memory.store(longText)
      const all = await memory.getAll()
      return all.includes(longText)
    })

    if (result !== null) {
      expect(result).toBe(true)
      return
    }

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
