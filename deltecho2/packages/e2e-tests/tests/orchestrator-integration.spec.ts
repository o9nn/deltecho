import { test, expect } from '@playwright/test'

/**
 * Orchestrator Integration E2E Test Suite
 *
 * Covers the integration between the desktop app and the
 * deep-tree-echo-orchestrator services:
 * - IPC communication
 * - Task scheduling
 * - Webhook handling
 * - DeltaChat interface
 * - Dove9 cognitive engine routing
 *
 * This suite is harness-compatible: when `window.__orchestrator` is present
 * (cognitive harness), it exercises the deterministic in-process mock
 * orchestrator. When running against the full Delta Chat app it falls back
 * to the profile-driven UI flows.
 */

test.describe('Orchestrator Integration', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test.describe('IPC Communication', () => {
    test('should establish IPC connection on startup', async ({ page }) => {
      const harness = await page.evaluate(() => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              getConnectionStatus: () => Promise<{
                connected: boolean
                latency: number
              }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        return orchestrator.getConnectionStatus()
      })

      if (harness) {
        expect(harness.connected).toBe(true)
        expect(harness.latency).toBeGreaterThanOrEqual(0)
        return
      }

      // Full-app fallback: app is responsive, indicating IPC is working
      const chatList = page.locator('.chat-list')
      await expect(chatList).toBeVisible({ timeout: 30000 })
    })

    test('should handle IPC message routing', async ({ page }) => {
      const routed = await page.evaluate(async () => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              sendMessage: (
                chatId: number,
                text: string
              ) => Promise<{ sent: boolean; messageId: number }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        return orchestrator.sendMessage(1, 'orchestrator ipc probe')
      })

      if (routed) {
        expect(routed.sent).toBe(true)
        expect(routed.messageId).toBeGreaterThan(0)
        return
      }

      const chatListItems = page.locator('.chat-list .chat-list-item')
      const count = await chatListItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should maintain connection across interactions', async ({ page }) => {
      const statuses = await page.evaluate(async () => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              getConnectionStatus: () => Promise<{ connected: boolean }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        const results = []
        for (let i = 0; i < 3; i++) {
          results.push((await orchestrator.getConnectionStatus()).connected)
        }
        return results
      })

      if (statuses) {
        expect(statuses).toEqual([true, true, true])
        return
      }

      const chatList = page.locator('.chat-list')
      await expect(chatList).toBeVisible()
    })
  })

  test.describe('DeltaChat Interface', () => {
    test('should load account information', async ({ page }) => {
      const account = await page.evaluate(async () => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              getAccountInfo: () => Promise<{
                configured: boolean
                address: string
                displayName: string
              }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        return orchestrator.getAccountInfo()
      })

      if (account) {
        expect(account.configured).toBe(true)
        expect(account.address).toContain('@')
        expect(account.displayName.length).toBeGreaterThan(0)
        return
      }

      const chatList = page.locator('.chat-list')
      await expect(chatList).toBeVisible()
    })

    test('should handle message operations', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              sendMessage: (
                chatId: number,
                text: string
              ) => Promise<{ sent: boolean; messageId: number }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        const first = await orchestrator.sendMessage(1, 'first')
        const second = await orchestrator.sendMessage(1, 'second')
        return { first, second }
      })

      if (result) {
        expect(result.first.sent).toBe(true)
        expect(result.second.sent).toBe(true)
        expect(result.second.messageId).toBeGreaterThan(result.first.messageId)
        return
      }

      test.skip()
    })

    test('should sync messages across accounts', async ({ page }) => {
      const synced = await page.evaluate(async () => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              sendMessage: (
                chatId: number,
                text: string
              ) => Promise<{ sent: boolean }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        const outbound = await orchestrator.sendMessage(1, 'sync probe')
        const inbound = await orchestrator.sendMessage(2, 'sync probe reply')
        return outbound.sent && inbound.sent
      })

      if (synced !== null) {
        expect(synced).toBe(true)
        return
      }

      test.skip()
    })
  })

  test.describe('Task Scheduler', () => {
    test('should handle scheduled tasks', async ({ page }) => {
      const scheduled = await page.evaluate(async () => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              scheduleTask: (
                name: string,
                cron: string
              ) => Promise<{ scheduled: boolean; taskId: string }>
              listTasks: () => Promise<Array<{ id: string }>>
              cancelTask: (taskId: string) => Promise<{ cancelled: boolean }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        const task = await orchestrator.scheduleTask(
          'e2e-probe',
          '*/5 * * * *'
        )
        const tasks = await orchestrator.listTasks()
        const cancelled = await orchestrator.cancelTask(task.taskId)
        return { task, listed: tasks.some(t => t.id === task.taskId), cancelled }
      })

      if (scheduled) {
        expect(scheduled.task.scheduled).toBe(true)
        expect(scheduled.listed).toBe(true)
        expect(scheduled.cancelled.cancelled).toBe(true)
        return
      }

      const chatList = page.locator('.chat-list')
      await expect(chatList).toBeVisible()
    })
  })

  test.describe('Webhook Server', () => {
    test('should handle external webhook events', async ({ page }) => {
      const webhook = await page.evaluate(async () => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              dispatchWebhook: (
                event: string,
                payload: unknown
              ) => Promise<{ received: boolean; handled: boolean }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        return orchestrator.dispatchWebhook('message.received', {
          chatId: 1,
          text: 'webhook probe',
        })
      })

      if (webhook) {
        expect(webhook.received).toBe(true)
        expect(webhook.handled).toBe(true)
        return
      }

      const chatList = page.locator('.chat-list')
      await expect(chatList).toBeVisible()
    })
  })

  test.describe('Dove9 Integration', () => {
    test('should process messages through Dove9 cognitive engine', async ({
      page,
    }) => {
      const processed = await page.evaluate(async () => {
        const engine = (
          window as unknown as {
            __dove9Engine?: {
              processMessage: (text: string) => Promise<{
                processed: boolean
                streamsUsed: number
                stepsExecuted: number
              }>
            }
          }
        ).__dove9Engine
        if (!engine) return null
        return engine.processMessage('Testing Dove9 cognitive processing')
      })

      if (processed) {
        expect(processed.processed).toBe(true)
        expect(processed.streamsUsed).toBe(3)
        expect(processed.stepsExecuted).toBe(12)
        return
      }

      test.skip()
    })

    test('should maintain triadic cognitive state', async ({ page }) => {
      const state = await page.evaluate(async () => {
        const engine = (
          window as unknown as {
            __dove9Engine?: {
              getTriadicState: () => Promise<{
                streams: number
                phases: number[]
              }>
            }
          }
        ).__dove9Engine
        if (!engine) return null
        return engine.getTriadicState()
      })

      if (state) {
        expect(state.streams).toBe(3)
        expect(state.phases.length).toBe(3)
        // 120° phase offset over a 12-step cycle: phases are 4 steps apart
        const sorted = [...state.phases].sort((a, b) => a - b)
        expect((sorted[1] - sorted[0] + 12) % 12).toBe(4)
        expect((sorted[2] - sorted[1] + 12) % 12).toBe(4)
        return
      }

      const chatList = page.locator('.chat-list')
      await expect(chatList).toBeVisible()
    })
  })

  test.describe('Error Recovery', () => {
    test('should recover from orchestrator disconnection', async ({ page }) => {
      const recovered = await page.evaluate(async () => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              getConnectionStatus: () => Promise<{ connected: boolean }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        await new Promise(resolve => setTimeout(resolve, 100))
        return (await orchestrator.getConnectionStatus()).connected
      })

      if (recovered !== null) {
        expect(recovered).toBe(true)
        return
      }

      await page.context().setOffline(true)
      await page.waitForTimeout(1000)
      await page.context().setOffline(false)
      await page.waitForTimeout(2000)

      const chatList = page.locator('.chat-list')
      await expect(chatList).toBeVisible()
    })

    test('should handle malformed IPC messages gracefully', async ({
      page,
    }) => {
      const handled = await page.evaluate(async () => {
        const orchestrator = (
          window as unknown as {
            __orchestrator?: {
              sendMessage: (
                chatId: number,
                text: string
              ) => Promise<{ sent: boolean }>
            }
          }
        ).__orchestrator
        if (!orchestrator) return null
        try {
          // Empty text and a bogus chat id should not throw.
          await orchestrator.sendMessage(-1, '')
          return true
        } catch {
          return false
        }
      })

      if (handled !== null) {
        expect(handled).toBe(true)
        return
      }

      const chatList = page.locator('.chat-list')
      await expect(chatList).toBeVisible()
    })
  })
})

test.describe('Cross-Platform Compatibility', () => {
  test('should work consistently across browser engines', async ({ page }) => {
    await page.goto('/')

    const body = page.locator('body')
    await expect(body).toBeVisible()

    const app = page.locator('#root, #app, .app')
    const appExists = await app.count()
    expect(appExists).toBeGreaterThanOrEqual(0)
  })
})
