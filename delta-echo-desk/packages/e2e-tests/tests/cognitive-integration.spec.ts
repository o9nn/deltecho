import { test, expect, Page } from '@playwright/test'

/**
 * Cognitive Integration E2E Test Suite.
 *
 * These tests drive the real browser-safe cognitive system through the
 * `window.__*` hooks installed by the cognitive harness
 * (`cognitive-harness/`). Run them with the dedicated config:
 *
 *   pnpm exec playwright test --config playwright.cognitive.config.ts
 *
 * When the hooks are absent (e.g. run against the full app that hasn't booted
 * the cognitive system), each test SKIPS honestly rather than passing on a
 * fallback — a green run means the assertions actually executed.
 */

test.describe.configure({ mode: 'serial' })

const TEST_TIMEOUT = 60_000
const COGNITIVE_LOAD_TIMEOUT = 15_000

/**
 * Navigate to the app and wait for the cognitive system to install its hooks.
 * Returns true when the system is ready; false otherwise (the caller skips).
 */
async function cognitiveReady(page: Page): Promise<boolean> {
  await page.goto('/')
  try {
    await page.waitForFunction(
      () =>
        (window as unknown as { __deepTreeEchoReady?: boolean })
          .__deepTreeEchoReady === true,
      { timeout: COGNITIVE_LOAD_TIMEOUT }
    )
    return true
  } catch {
    return false
  }
}

test.describe('Cognitive System Initialization', () => {
  test('should initialize Deep Tree Echo cognitive system', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const hasCognitiveSystem = await page.evaluate(
      () =>
        typeof (window as unknown as { DeepTreeEcho?: unknown })
          .DeepTreeEcho !== 'undefined'
    )
    expect(hasCognitiveSystem).toBe(true)

    const state = await page.evaluate(
      () =>
        (
          window as unknown as {
            __deepTreeEchoState?: {
              initialized: boolean
              memoryEnabled: boolean
              activeStreams: number
              currentPhase: number
            }
          }
        ).__deepTreeEchoState
    )
    expect(state?.initialized).toBe(true)
    expect(state?.activeStreams).toBe(3)
    expect(state?.memoryEnabled).toBe(true)
  })
})

test.describe('Memory System Integration', () => {
  test('should persist memory across page reloads', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const testMemory = `test-memory-${Date.now()}`
    await page.evaluate(async memory => {
      await (
        window as unknown as {
          __deepTreeEchoMemory: { store: (t: string) => Promise<void> }
        }
      ).__deepTreeEchoMemory.store(memory)
    }, testMemory)

    await page.reload()
    await page.waitForFunction(
      () =>
        (window as unknown as { __deepTreeEchoReady?: boolean })
          .__deepTreeEchoReady === true,
      { timeout: COGNITIVE_LOAD_TIMEOUT }
    )

    const memories = await page.evaluate(() =>
      (
        window as unknown as {
          __deepTreeEchoMemory: { getAll: () => Promise<string[]> }
        }
      ).__deepTreeEchoMemory.getAll()
    )
    expect(Array.isArray(memories)).toBe(true)
    expect(memories).toContain(testMemory)
  })

  test('should retrieve relevant memories for context', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const results = await page.evaluate(() =>
      (
        window as unknown as {
          __deepTreeEchoMemory: { search: (q: string) => Promise<string[]> }
        }
      ).__deepTreeEchoMemory.search('test')
    )
    expect(Array.isArray(results)).toBe(true)
  })
})

test.describe('Triadic Cognitive Loop', () => {
  test('should execute 12-step cognitive cycle', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT * 2)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const cycleResult = await page.evaluate(() =>
      (
        window as unknown as {
          __dove9: {
            executeCycle: () => Promise<{
              steps: number
              streams: number
              completed: boolean
            }>
          }
        }
      ).__dove9.executeCycle()
    )
    expect(cycleResult.completed).toBe(true)
    expect(cycleResult.steps).toBe(12)
    expect(cycleResult.streams).toBe(3)
  })

  test('should maintain 120-degree phase offset between streams', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const phases = await page.evaluate(() =>
      (
        window as unknown as {
          __dove9: { getStreamPhases: () => Promise<number[]> }
        }
      ).__dove9.getStreamPhases()
    )
    expect(phases).toHaveLength(3)
    // 120° of a 12-step cycle == a 4-step offset between adjacent streams.
    expect((phases[1] - phases[0] + 12) % 12).toBe(4)
    expect((phases[2] - phases[1] + 12) % 12).toBe(4)
  })

  test('should process salience landscape updates', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const salience = await page.evaluate(() =>
      (
        window as unknown as {
          __dove9: {
            getSalienceLandscape: () => Promise<{
              dimensions: number
              peaks: number[]
              valleys: number[]
            }>
          }
        }
      ).__dove9.getSalienceLandscape()
    )
    expect(salience.dimensions).toBeGreaterThan(0)
    expect(Array.isArray(salience.peaks)).toBe(true)
  })
})

test.describe('LLM Service Integration', () => {
  test('should expose LLM availability', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const llmAvailable = await page.evaluate(() =>
      (
        window as unknown as {
          __llmService: { isAvailable: () => Promise<boolean> }
        }
      ).__llmService.isAvailable()
    )
    expect(typeof llmAvailable).toBe('boolean')
  })

  test('should respect token limits', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const tokenConfig = await page.evaluate(() =>
      (
        window as unknown as {
          __llmService: {
            getTokenLimits: () => Promise<{
              maxInput: number
              maxOutput: number
            }>
          }
        }
      ).__llmService.getTokenLimits()
    )
    expect(tokenConfig.maxInput).toBeGreaterThan(0)
    expect(tokenConfig.maxOutput).toBeGreaterThan(0)
  })
})

test.describe('Orchestrator Communication', () => {
  test('should report IPC connection status', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const ipcStatus = await page.evaluate(() =>
      (
        window as unknown as {
          __orchestrator: {
            getConnectionStatus: () => Promise<{
              connected: boolean
              latency: number
            }>
          }
        }
      ).__orchestrator.getConnectionStatus()
    )
    expect(typeof ipcStatus.connected).toBe('boolean')
    expect(typeof ipcStatus.latency).toBe('number')
  })

  test('should report scheduler status', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const schedulerStatus = await page.evaluate(() =>
      (
        window as unknown as {
          __orchestrator: {
            getSchedulerStatus: () => Promise<{
              active: boolean
              pendingTasks: number
            }>
          }
        }
      ).__orchestrator.getSchedulerStatus()
    )
    expect(typeof schedulerStatus.active).toBe('boolean')
    expect(typeof schedulerStatus.pendingTasks).toBe('number')
  })
})

test.describe('Sys6 Bridge Functionality', () => {
  test('should initialize Sys6 triality bridge', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const sys6Status = await page.evaluate(() =>
      (
        window as unknown as {
          __sys6Bridge: {
            getStatus: () => { initialized: boolean; trialityMode: string }
          }
        }
      ).__sys6Bridge.getStatus()
    )
    expect(sys6Status.initialized).toBe(true)
    expect(typeof sys6Status.trialityMode).toBe('string')
  })

  test('should process triality transformations', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const transformResult = await page.evaluate(() =>
      (
        window as unknown as {
          __sys6Bridge: {
            transform: (input: string) => {
              universal: string
              particular: string
              synthesis: string
            }
          }
        }
      ).__sys6Bridge.transform('test input')
    )
    expect(transformResult).toHaveProperty('universal')
    expect(transformResult).toHaveProperty('particular')
    expect(transformResult).toHaveProperty('synthesis')
  })
})

test.describe('Error Handling and Recovery', () => {
  test('should handle cognitive system errors gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const errorHandled = await page.evaluate(() =>
      (
        window as unknown as {
          __deepTreeEcho: { simulateError: () => Promise<boolean> }
        }
      ).__deepTreeEcho.simulateError()
    )
    expect(errorHandled).toBe(true)
  })

  test('should recover from memory system failures', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const recovered = await page.evaluate(() =>
      (
        window as unknown as {
          __deepTreeEchoMemory: { testRecovery: () => Promise<boolean> }
        }
      ).__deepTreeEchoMemory.testRecovery()
    )
    expect(recovered).toBe(true)
  })
})

test.describe('Performance Benchmarks', () => {
  test('should complete cognitive cycle within time limit', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT * 3)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const startTime = Date.now()
    await page.evaluate(() =>
      (
        window as unknown as {
          __dove9: { executeCycle: () => Promise<unknown> }
        }
      ).__dove9.executeCycle()
    )
    expect(Date.now() - startTime).toBeLessThan(30000)
  })

  test('should maintain memory retrieval performance', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)
    test.skip(!(await cognitiveReady(page)), 'cognitive hooks not present')

    const startTime = Date.now()
    await page.evaluate(() =>
      (
        window as unknown as {
          __deepTreeEchoMemory: { search: (q: string) => Promise<string[]> }
        }
      ).__deepTreeEchoMemory.search('performance test query')
    )
    expect(Date.now() - startTime).toBeLessThan(5000)
  })
})
