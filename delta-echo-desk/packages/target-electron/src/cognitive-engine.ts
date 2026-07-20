/**
 * Electron Main Process - Dove9 Cognitive Engine IPC Handlers
 *
 * This module initializes the Dove9 cognitive operating system in the
 * Electron main process and exposes it to the renderer via IPC channels.
 *
 * Architecture:
 * ```
 *  Main Process
 *  ┌─────────────────────────────────────────────┐
 *  │  Dove9System (triadic cognitive engine)     │
 *  │  - Dove9Kernel (process management)         │
 *  │  - TriadicCognitiveEngine (3-phase loop)    │
 *  │  - DeepTreeEchoProcessor                    │
 *  └───────────────┬─────────────────────────────┘
 *                  │ IPC channels
 *  Renderer Process│
 *  ┌───────────────▼─────────────────────────────┐
 *  │  CognitiveBridge (browser-safe adapter)     │
 *  └─────────────────────────────────────────────┘
 * ```
 *
 * IPC Channels (main process handles):
 *  cognitive:initialize  - Start the Dove9 system with settings
 *  cognitive:process     - Send a message for triadic processing
 *  cognitive:status      - Get kernel metrics and running state
 *  cognitive:shutdown    - Stop the Dove9 system
 */

import { ipcMain } from 'electron'
import { Dove9System, createDove9System } from 'dove9'
import type {
  LLMServiceInterface,
  MemoryStoreInterface,
  PersonaCoreInterface,
} from 'dove9'

import { getLogger } from '../../shared/logger.js'

const log = getLogger('main/cognitive-engine')

// ─────────────────────────────────────────────────────────────────────────────
// Stub service implementations
// These provide default in-process cognitive capabilities without requiring
// an external LLM API. When an API key is configured the renderer's
// CognitiveBridge handles actual LLM calls, while the main process dove9
// kernel manages process scheduling and the triadic loop.
// ─────────────────────────────────────────────────────────────────────────────

/** Simple in-memory store shared across all cognitive sessions */
const memoryPool: Array<{
  chatId: number
  messageId: number
  sender: string
  text: string
  timestamp: number
}> = []
const MAX_MEMORIES = 500

const defaultMemoryStore: MemoryStoreInterface = {
  async storeMemory(memory) {
    memoryPool.push({ ...memory, timestamp: Date.now() })
    if (memoryPool.length > MAX_MEMORIES) {
      memoryPool.splice(0, memoryPool.length - MAX_MEMORIES)
    }
  },
  retrieveRecentMemories(count) {
    return memoryPool.slice(-count).map(m => `[${m.sender}]: ${m.text}`)
  },
  async retrieveRelevantMemories(query, count) {
    const q = query.toLowerCase()
    const scored = memoryPool
      .map(m => ({
        text: `[${m.sender}]: ${m.text}`,
        score: m.text
          .toLowerCase()
          .split(' ')
          .filter(w => q.includes(w)).length,
      }))
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, count).map(s => s.text)
  },
}

let personaName = 'Deep Tree Echo'
let personaMood = 'neutral'

const defaultPersonaCore: PersonaCoreInterface = {
  getPersonality() {
    return `${personaName} - a curious and helpful AI assistant with a ${personaMood} disposition.`
  },
  getDominantEmotion() {
    return { emotion: personaMood, intensity: 0.5 }
  },
  async updateEmotionalState(stimuli) {
    const positiveSum = (stimuli['joy'] ?? 0) + (stimuli['trust'] ?? 0)
    const negativeSum = (stimuli['fear'] ?? 0) + (stimuli['anger'] ?? 0)
    if (positiveSum > negativeSum) {
      personaMood = 'positive'
    } else if (negativeSum > positiveSum) {
      personaMood = 'reflective'
    } else {
      personaMood = 'neutral'
    }
  },
}

const defaultLLMService: LLMServiceInterface = {
  async generateResponse(prompt, context) {
    const contextSummary =
      context.length > 0
        ? ` (context: ${context.slice(-3).join('; ').slice(0, 120)})`
        : ''
    return `[Dove9 triadic response] Processed: "${prompt.slice(
      0,
      80
    )}"${contextSummary}`
  },
  async generateParallelResponse(prompt, history) {
    const base = await defaultLLMService.generateResponse(prompt, history)
    return {
      integratedResponse: base,
      cognitiveResponse: `Cognitive stream: ${prompt.slice(0, 40)}`,
      affectiveResponse: `Affective stream: processing...`,
      relevanceResponse: `Relevance stream: ${history.length} context items`,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Module state
// ─────────────────────────────────────────────────────────────────────────────

let dove9System: Dove9System | null = null

// ─────────────────────────────────────────────────────────────────────────────
// IPC handler registration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize IPC handlers for the Dove9 cognitive engine.
 * Returns a cleanup function to be called on app shutdown.
 */
export async function initCognitiveEngine(): Promise<() => Promise<void>> {
  log.info('Registering cognitive engine IPC handlers')

  // cognitive:initialize - start or restart the Dove9 system
  ipcMain.handle(
    'cognitive:initialize',
    async (_event, opts: { name?: string; enableParallel?: boolean } = {}) => {
      try {
        if (dove9System?.isRunning()) {
          log.info('Dove9 already running, skipping re-init')
          return { ok: true, status: 'already_running' }
        }

        if (opts.name) {
          personaName = opts.name
        }

        dove9System = createDove9System(
          defaultLLMService,
          defaultMemoryStore,
          defaultPersonaCore,
          { enableParallelCognition: opts.enableParallel ?? true }
        )

        dove9System.on('kernel_event', event => {
          log.debug('kernel_event', event)
        })

        await dove9System.start()
        log.info('Dove9 system started')
        return { ok: true, status: 'started' }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log.error('Failed to initialize Dove9:', msg)
        return { ok: false, error: msg }
      }
    }
  )

  // cognitive:process - submit a message to the triadic kernel
  ipcMain.handle(
    'cognitive:process',
    async (
      _event,
      message: {
        id?: string
        content: string
        sender?: string
        chatId?: number
      }
    ) => {
      try {
        if (!dove9System?.isRunning()) {
          return { ok: false, error: 'Dove9 system not running' }
        }

        const mailMsg = {
          messageId: message.id ?? `msg-${Date.now()}`,
          from: message.sender ?? 'user@local',
          to: ['dove9@local'],
          subject: 'Message',
          body: message.content,
          timestamp: new Date(),
          receivedAt: new Date(),
          headers: new Map<string, string>(),
          mailbox: 'INBOX',
        }

        const process = await dove9System.processMailMessage(mailMsg)
        log.debug('cognitive:process -> process id', process.id)

        return {
          ok: true,
          processId: process.id,
          state: process.state,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log.error('cognitive:process error:', msg)
        return { ok: false, error: msg }
      }
    }
  )

  // cognitive:status - return kernel metrics + running state
  ipcMain.handle('cognitive:status', async () => {
    if (!dove9System) {
      return { running: false, metrics: null }
    }
    return {
      running: dove9System.isRunning(),
      metrics: dove9System.getMetrics(),
      activeProcesses: dove9System.getActiveProcesses().length,
    }
  })

  // cognitive:shutdown - gracefully stop the Dove9 system
  ipcMain.handle('cognitive:shutdown', async () => {
    try {
      if (dove9System?.isRunning()) {
        await dove9System.stop()
        log.info('Dove9 system stopped via IPC')
      }
      dove9System = null
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('cognitive:shutdown error:', msg)
      return { ok: false, error: msg }
    }
  })

  log.info('Cognitive engine IPC handlers registered')

  // Return cleanup function
  return async () => {
    if (dove9System?.isRunning()) {
      await dove9System
        .stop()
        .catch(err => log.error('Error stopping Dove9 on shutdown:', err))
    }
    dove9System = null

    ipcMain.removeHandler('cognitive:initialize')
    ipcMain.removeHandler('cognitive:process')
    ipcMain.removeHandler('cognitive:status')
    ipcMain.removeHandler('cognitive:shutdown')

    log.info('Cognitive engine IPC handlers removed')
  }
}
