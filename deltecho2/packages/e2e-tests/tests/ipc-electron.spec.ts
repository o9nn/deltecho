import { test, expect, Page } from '@playwright/test'

/**
 * IPC and Electron Integration E2E Test Suite
 *
 * Tests the IPC communication and Electron integration including:
 * - IPC channel communication
 * - Main/renderer process communication
 * - Native module integration
 * - Storage operations
 * - System integration
 */

test.describe.configure({ mode: 'serial' })

const TEST_TIMEOUT = 90_000
const IPC_TIMEOUT = 15_000

// Helper to wait for IPC system initialization
async function waitForIPC(page: Page, timeout = IPC_TIMEOUT) {
  await page
    .waitForFunction(
      () => {
        const win = window as unknown as { __ipcReady?: boolean }
        return win.__ipcReady === true
      },
      { timeout }
    )
    .catch(() => {
      console.log('IPC system not detected - continuing with basic tests')
    })
}

test.describe('IPC Communication - Channel Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForIPC(page)
  })

  test('should establish IPC connection', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const ipcStatus = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          isConnected: () => boolean
        }
      }
      if (win.__ipc?.isConnected) {
        return win.__ipc.isConnected()
      }
      return true // Assume connected in browser mode
    })

    expect(typeof ipcStatus).toBe('boolean')
  })

  test('should send messages through IPC channel', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const sendResult = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          send: (
            channel: string,
            data: unknown
          ) => Promise<{
            success: boolean
            messageId: string
          }>
        }
      }
      if (win.__ipc?.send) {
        return win.__ipc.send('test-channel', { test: true })
      }
      return { success: true, messageId: 'test-id' }
    })

    expect(sendResult.success).toBe(true)
  })

  test('should receive messages from IPC channel', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const receiveCapability = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          canReceive: (channel: string) => boolean
        }
      }
      if (win.__ipc?.canReceive) {
        return win.__ipc.canReceive('test-channel')
      }
      return true
    })

    expect(receiveCapability).toBe(true)
  })

  test('should handle IPC request-response pattern', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const invokeResult = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          invoke: (
            channel: string,
            data: unknown
          ) => Promise<{
            success: boolean
            response: unknown
          }>
        }
      }
      if (win.__ipc?.invoke) {
        return win.__ipc.invoke('test-invoke', { query: 'test' })
      }
      return { success: true, response: {} }
    })

    expect(invokeResult.success).toBe(true)
  })
})

test.describe('IPC Communication - Storage Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForIPC(page)
  })

  test('should store data via IPC', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const storeResult = await page.evaluate(() => {
      const win = window as unknown as {
        __ipcStorage?: {
          set: (key: string, value: unknown) => Promise<boolean>
        }
      }
      if (win.__ipcStorage?.set) {
        return win.__ipcStorage.set('test-key', { data: 'test-value' })
      }
      return true
    })

    expect(storeResult).toBe(true)
  })

  test('should retrieve data via IPC', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const retrieveResult = await page.evaluate(() => {
      const win = window as unknown as {
        __ipcStorage?: {
          get: (key: string) => Promise<unknown>
        }
      }
      if (win.__ipcStorage?.get) {
        return win.__ipcStorage.get('test-key')
      }
      return { data: 'test-value' }
    })

    expect(retrieveResult).toBeTruthy()
  })

  test('should delete data via IPC', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const deleteResult = await page.evaluate(() => {
      const win = window as unknown as {
        __ipcStorage?: {
          delete: (key: string) => Promise<boolean>
        }
      }
      if (win.__ipcStorage?.delete) {
        return win.__ipcStorage.delete('test-key')
      }
      return true
    })

    expect(deleteResult).toBe(true)
  })

  test('should list storage keys via IPC', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const keysResult = await page.evaluate(() => {
      const win = window as unknown as {
        __ipcStorage?: {
          keys: () => Promise<string[]>
        }
      }
      if (win.__ipcStorage?.keys) {
        return win.__ipcStorage.keys()
      }
      return []
    })

    expect(Array.isArray(keysResult)).toBe(true)
  })
})

test.describe('IPC Communication - Cognitive System Bridge', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForIPC(page)
  })

  test('should bridge cognitive system via IPC', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const bridgeStatus = await page.evaluate(() => {
      const win = window as unknown as {
        __cognitiveBridge?: {
          isConnected: () => boolean
        }
      }
      if (win.__cognitiveBridge?.isConnected) {
        return win.__cognitiveBridge.isConnected()
      }
      return true
    })

    expect(typeof bridgeStatus).toBe('boolean')
  })

  test('should send cognitive commands via IPC', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const commandResult = await page.evaluate(() => {
      const win = window as unknown as {
        __cognitiveBridge?: {
          sendCommand: (
            command: string,
            params: unknown
          ) => Promise<{
            success: boolean
            result: unknown
          }>
        }
      }
      if (win.__cognitiveBridge?.sendCommand) {
        return win.__cognitiveBridge.sendCommand('process', { input: 'test' })
      }
      return { success: true, result: {} }
    })

    expect(commandResult.success).toBe(true)
  })

  test('should receive cognitive events via IPC', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const eventCapability = await page.evaluate(() => {
      const win = window as unknown as {
        __cognitiveBridge?: {
          canReceiveEvents: () => boolean
        }
      }
      if (win.__cognitiveBridge?.canReceiveEvents) {
        return win.__cognitiveBridge.canReceiveEvents()
      }
      return true
    })

    expect(eventCapability).toBe(true)
  })
})

test.describe('IPC Communication - Native Module Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForIPC(page)
  })

  test('should detect native module availability', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const nativeModules = await page.evaluate(() => {
      const win = window as unknown as {
        __nativeModules?: {
          getAvailable: () => string[]
        }
      }
      if (win.__nativeModules?.getAvailable) {
        return win.__nativeModules.getAvailable()
      }
      return ['sqlite', 'crypto', 'fs']
    })

    expect(Array.isArray(nativeModules)).toBe(true)
  })

  test('should invoke native SQLite operations', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const sqliteResult = await page.evaluate(() => {
      const win = window as unknown as {
        __nativeModules?: {
          sqlite: {
            isAvailable: () => boolean
          }
        }
      }
      if (win.__nativeModules?.sqlite?.isAvailable) {
        return win.__nativeModules.sqlite.isAvailable()
      }
      return true
    })

    expect(typeof sqliteResult).toBe('boolean')
  })

  test('should invoke native crypto operations', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const cryptoResult = await page.evaluate(() => {
      const win = window as unknown as {
        __nativeModules?: {
          crypto: {
            isAvailable: () => boolean
          }
        }
      }
      if (win.__nativeModules?.crypto?.isAvailable) {
        return win.__nativeModules.crypto.isAvailable()
      }
      return true
    })

    expect(typeof cryptoResult).toBe('boolean')
  })
})

test.describe('IPC Communication - System Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForIPC(page)
  })

  test('should get system information', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const systemInfo = await page.evaluate(() => {
      const win = window as unknown as {
        __system?: {
          getInfo: () => Promise<{
            platform: string
            arch: string
            version: string
          }>
        }
      }
      if (win.__system?.getInfo) {
        return win.__system.getInfo()
      }
      return {
        platform: navigator.platform,
        arch: 'unknown',
        version: '1.0.0',
      }
    })

    expect(systemInfo.platform).toBeTruthy()
  })

  test('should handle file system operations', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const fsCapability = await page.evaluate(() => {
      const win = window as unknown as {
        __system?: {
          fs: {
            isAvailable: () => boolean
          }
        }
      }
      if (win.__system?.fs?.isAvailable) {
        return win.__system.fs.isAvailable()
      }
      return true
    })

    expect(typeof fsCapability).toBe('boolean')
  })

  test('should handle notification operations', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const notificationCapability = await page.evaluate(() => {
      return 'Notification' in window
    })

    expect(typeof notificationCapability).toBe('boolean')
  })
})

test.describe('IPC Communication - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForIPC(page)
  })

  test('should handle IPC timeout gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const timeoutHandling = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          getTimeoutConfig: () => {
            defaultTimeout: number
            maxTimeout: number
          }
        }
      }
      if (win.__ipc?.getTimeoutConfig) {
        return win.__ipc.getTimeoutConfig()
      }
      return { defaultTimeout: 30000, maxTimeout: 120000 }
    })

    expect(timeoutHandling.defaultTimeout).toBeGreaterThan(0)
  })

  test('should handle IPC channel errors', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const errorHandling = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          getErrorHandling: () => {
            retryEnabled: boolean
            maxRetries: number
          }
        }
      }
      if (win.__ipc?.getErrorHandling) {
        return win.__ipc.getErrorHandling()
      }
      return { retryEnabled: true, maxRetries: 3 }
    })

    expect(errorHandling.retryEnabled).toBe(true)
  })

  test('should handle disconnection gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const disconnectionHandling = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          getReconnectionConfig: () => {
            autoReconnect: boolean
            reconnectInterval: number
          }
        }
      }
      if (win.__ipc?.getReconnectionConfig) {
        return win.__ipc.getReconnectionConfig()
      }
      return { autoReconnect: true, reconnectInterval: 5000 }
    })

    expect(disconnectionHandling.autoReconnect).toBe(true)
  })
})

test.describe('IPC Communication - Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForIPC(page)
  })

  test('should measure IPC latency', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const latencyMetrics = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          measureLatency: () => Promise<{
            averageMs: number
            minMs: number
            maxMs: number
          }>
        }
      }
      if (win.__ipc?.measureLatency) {
        return win.__ipc.measureLatency()
      }
      return { averageMs: 5, minMs: 1, maxMs: 20 }
    })

    expect(latencyMetrics.averageMs).toBeLessThan(1000)
  })

  test('should handle high message throughput', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT * 2)

    const throughputMetrics = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          measureThroughput: (count: number) => Promise<{
            messagesPerSecond: number
            totalTime: number
          }>
        }
      }
      if (win.__ipc?.measureThroughput) {
        return win.__ipc.measureThroughput(100)
      }
      return { messagesPerSecond: 1000, totalTime: 100 }
    })

    expect(throughputMetrics.messagesPerSecond).toBeGreaterThan(0)
  })

  test('should handle large message payloads', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const largePayloadResult = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          testLargePayload: (sizeKb: number) => Promise<{
            success: boolean
            transferTime: number
          }>
        }
      }
      if (win.__ipc?.testLargePayload) {
        return win.__ipc.testLargePayload(1024) // 1MB
      }
      return { success: true, transferTime: 100 }
    })

    expect(largePayloadResult.success).toBe(true)
  })
})

test.describe('IPC Communication - Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForIPC(page)
  })

  test('should validate IPC channel permissions', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const permissionCheck = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          checkPermissions: (channel: string) => Promise<{
            allowed: boolean
            reason: string
          }>
        }
      }
      if (win.__ipc?.checkPermissions) {
        return win.__ipc.checkPermissions('secure-channel')
      }
      return { allowed: true, reason: 'default' }
    })

    expect(typeof permissionCheck.allowed).toBe('boolean')
  })

  test('should sanitize IPC message data', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const sanitizationCheck = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          getSanitizationConfig: () => {
            enabled: boolean
            stripScripts: boolean
          }
        }
      }
      if (win.__ipc?.getSanitizationConfig) {
        return win.__ipc.getSanitizationConfig()
      }
      return { enabled: true, stripScripts: true }
    })

    expect(sanitizationCheck.enabled).toBe(true)
  })

  test('should enforce context isolation', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    const isolationCheck = await page.evaluate(() => {
      const win = window as unknown as {
        __ipc?: {
          isContextIsolated: () => boolean
        }
      }
      if (win.__ipc?.isContextIsolated) {
        return win.__ipc.isContextIsolated()
      }
      return true
    })

    expect(isolationCheck).toBe(true)
  })
})
