/**
 * Desktop Integration Example
 *
 * This example shows how to integrate Deep Tree Echo cognitive services
 * into an Electron or desktop application using the unified packages.
 *
 * The architecture:
 *   Desktop App (UI) <-> IPC Client <-> Orchestrator Daemon <-> Cognitive Services
 */

import {
  CognitiveOrchestrator,
  createCognitiveOrchestrator,
  type UnifiedMessage,
} from '@deltecho/cognitive'

import { OrchestratorStorageAdapter } from 'deep-tree-echo-core/adapters'

/**
 * Example: Initialize Deep Tree Echo in a desktop app
 */
export async function initializeDeepTreeEcho(settings: {
  apiKey?: string
  apiEndpoint?: string
  enabled: boolean
  memoryEnabled: boolean
}) {
  // Create storage adapter that connects to orchestrator IPC
  const storage = new OrchestratorStorageAdapter({
    socketPath: '/tmp/deep-tree-echo.sock',
    storagePrefix: 'deltecho:desktop',
  })

  // Connect to orchestrator (must be running)
  try {
    await storage.connect()
    console.log('Connected to Deep Tree Echo orchestrator')
  } catch (error) {
    console.warn('Orchestrator not running, using local mode:', error)
  }

  // Create cognitive orchestrator
  const cognitive = createCognitiveOrchestrator({
    enabled: settings.enabled,
    apiKey: settings.apiKey,
    apiEndpoint: settings.apiEndpoint,
  })

  // Initialize cognitive subsystems
  await cognitive.initialize()

  // Configure LLM if API key is provided
  if (settings.apiKey) {
    cognitive.configureLLM({
      apiKey: settings.apiKey,
      apiEndpoint: settings.apiEndpoint,
    })
  }

  // Subscribe to cognitive events
  cognitive.on('message_received', (event) => {
    console.log('Processing message:', event.payload.content)
  })

  cognitive.on('response_generated', (event) => {
    console.log('Response ready:', event.payload.content)
  })

  return { cognitive, storage }
}

/**
 * Example: Process a user message
 */
export async function processUserMessage(
  cognitive: CognitiveOrchestrator,
  userInput: string
): Promise<string> {
  const message: UnifiedMessage = {
    id: `msg-${Date.now()}`,
    content: userInput,
    role: 'user',
    timestamp: Date.now(),
    metadata: {},
  }

  const response = await cognitive.processMessage(message)
  return response.content
}

/**
 * Example: React hook for Deep Tree Echo integration
 */
export function useDeepTreeEcho() {
  // This would be a React hook in a real implementation
  // Using pseudo-code for illustration

  /*
  const [cognitive, setCognitive] = useState<CognitiveOrchestrator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const settings = await loadSettings()
        const { cognitive } = await initializeDeepTreeEcho(settings)
        setCognitive(cognitive)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!cognitive) throw new Error('Not initialized')
    return processUserMessage(cognitive, text)
  }, [cognitive])

  const getState = useCallback(() => {
    return cognitive?.getState() || null
  }, [cognitive])

  return { cognitive, loading, error, sendMessage, getState }
  */
}

/**
 * Example: Electron main process IPC handlers for storage
 */
export function setupElectronStorageHandlers() {
  // This would be in the Electron main process
  // Using pseudo-code for illustration

  /*
  import { ipcMain } from 'electron'
  import Store from 'electron-store'

  const store = new Store({ name: 'deep-tree-echo' })

  ipcMain.handle('storage:get', async (_event, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('storage:set', async (_event, key: string, value: string) => {
    store.set(key, value)
  })

  ipcMain.handle('storage:delete', async (_event, key: string) => {
    store.delete(key)
  })

  ipcMain.handle('storage:clear', async (_event, prefix: string) => {
    const allKeys = Object.keys(store.store)
    for (const key of allKeys) {
      if (key.startsWith(prefix)) {
        store.delete(key)
      }
    }
  })

  ipcMain.handle('storage:keys', async (_event, prefix: string) => {
    const allKeys = Object.keys(store.store)
    return allKeys.filter(k => k.startsWith(prefix))
  })
  */
}

/**
 * Example: Full desktop app integration
 */
export class DesktopDeepTreeEcho {
  private cognitive: CognitiveOrchestrator | null = null
  private storage: OrchestratorStorageAdapter | null = null
  private initialized = false

  async initialize(settings: {
    apiKey?: string
    apiEndpoint?: string
    enabled: boolean
    memoryEnabled: boolean
    orchestratorSocket?: string
  }): Promise<void> {
    if (this.initialized) return

    // Connect to orchestrator for storage
    this.storage = new OrchestratorStorageAdapter({
      socketPath: settings.orchestratorSocket || '/tmp/deep-tree-echo.sock',
    })

    try {
      await this.storage.connect()
    } catch (error) {
      console.warn('Running without orchestrator connection')
    }

    // Initialize cognitive orchestrator
    this.cognitive = createCognitiveOrchestrator({
      enabled: settings.enabled,
      apiKey: settings.apiKey,
      apiEndpoint: settings.apiEndpoint,
    })

    await this.cognitive.initialize()

    if (settings.apiKey) {
      this.cognitive.configureLLM({
        apiKey: settings.apiKey,
        apiEndpoint: settings.apiEndpoint,
      })
    }

    this.initialized = true
  }

  async sendMessage(text: string): Promise<string> {
    if (!this.cognitive) {
      throw new Error('Deep Tree Echo not initialized')
    }

    const message: UnifiedMessage = {
      id: `msg-${Date.now()}`,
      content: text,
      role: 'user',
      timestamp: Date.now(),
      metadata: {},
    }

    const response = await this.cognitive.processMessage(message)
    return response.content
  }

  getState() {
    return this.cognitive?.getState() || null
  }

  clearHistory(): void {
    this.cognitive?.clearHistory()
  }

  async cleanup(): Promise<void> {
    if (this.storage) {
      await this.storage.disconnect()
    }
    this.initialized = false
  }
}

// Export singleton instance for convenience
export const deepTreeEcho = new DesktopDeepTreeEcho()
