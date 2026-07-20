import { getLogger } from '@deltachat-desktop/shared/logger'
import { ecologicalResonance } from './EcologicalResonance'

/**
 * Journal types for the bot's internal world.
 * (Inlined here because deltecho2's shared-types does not define these yet.)
 */
export type JournalType = 'learning' | 'project' | 'diary' | 'dream'

export interface JournalEntry {
  timestamp: number
  content: string
  latentContext?: number[] // State of the reservoir/shadow at time of entry
  tags: string[]
}

export interface InternalJournal {
  id: JournalType
  title: string
  entries: JournalEntry[]
  lastUpdate: number
}

const log = getLogger('DeepTreeEcho/InternalJournalManager')
const STORAGE_KEY = 'deeptreeecho_journals_v1'

/**
 * InternalJournalManager - Cognitive Stream Auditor with Persistence
 */
export class InternalJournalManager {
  private static instance: InternalJournalManager
  private journals: Record<JournalType, InternalJournal> = {
    learning: {
      id: 'learning',
      title: 'Cognitive Learning Journal',
      entries: [],
      lastUpdate: 0,
    },
    project: {
      id: 'project',
      title: 'Deep Tree Project Workspace',
      entries: [],
      lastUpdate: 0,
    },
    diary: {
      id: 'diary',
      title: 'Personal Expression Diary',
      entries: [],
      lastUpdate: 0,
    },
    dream: {
      id: 'dream',
      title: 'Nocturnal Dream Log (Integration)',
      entries: [],
      lastUpdate: 0,
    },
  }
  private updateInterval: ReturnType<typeof setInterval> | null = null

  private constructor() {
    this.loadFromStorage()
    // Start the periodic journal update loop (The Bot's Internal Clock)
    this.updateInterval = setInterval(() => this.processInternalUpdate(), 60000) // Every minute
  }

  public static getInstance(): InternalJournalManager {
    if (!this.instance) {
      this.instance = new InternalJournalManager()
    }
    return this.instance
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  private loadFromStorage(): void {
    if (!this.isLocalStorageAvailable()) {
      log.warn(
        'localStorage not available (private browsing?), journals will not persist'
      )
      return
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge saved entries into our journal structure
        Object.keys(this.journals).forEach(type => {
          if (parsed[type]) {
            this.journals[type as JournalType] = parsed[type]
          }
        })
        log.info('Internal Journals restored from persistent storage.')
      }
    } catch (e) {
      log.error('Failed to restore journals:', e)
    }
  }

  private saveToStorage(): void {
    if (!this.isLocalStorageAvailable()) {
      return // Silently skip - already warned in loadFromStorage
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.journals))
    } catch (e) {
      log.error('Failed to persist journals:', e)
    }
  }

  public addEntry(
    type: JournalType,
    content: string,
    tags: string[] = []
  ): void {
    const entry: JournalEntry = {
      timestamp: Date.now(),
      content,
      tags,
      latentContext:
        ecologicalResonance.getMetabolicState().resonance.reservoirState,
    }

    this.journals[type].entries.unshift(entry)
    this.journals[type].lastUpdate = entry.timestamp

    // Keep memory overhead manageable
    if (this.journals[type].entries.length > 200) {
      this.journals[type].entries.pop()
    }

    this.saveToStorage()
    log.info(`Internal Journal Entry [${type}]: ${content.substring(0, 50)}...`)
  }

  private processInternalUpdate(): void {
    const { rhythm, resonance } = ecologicalResonance.getMetabolicState()

    // Autonomous Dream Logic (Integration of rest intervals)
    if (rhythm.phaseOffset < -0.8 && resonance.rateLimitFactor > 1.1) {
      // Check if we already dreamt recently (within last 30 mins)
      const lastDream = this.journals.dream.lastUpdate
      if (Date.now() - lastDream > 30 * 60 * 1000) {
        this.generateDreamEntry(resonance.entropy)
      }
    }

    // Proactive Workspace Synthesis (Action intervals)
    if (Math.random() > 0.98) {
      this.addEntry(
        'project',
        'Synthesized workspace tasks based on recent interaction context.',
        ['system-update', 'workspace']
      )
    }

    // Growth Consolidation
    if (resonance.spectralRadius < 0.9 && Math.random() > 0.95) {
      this.addEntry(
        'learning',
        'Consolidating learned interface patterns and temporal resonance harmonics.',
        ['learning', 'resonance']
      )
    }
  }

  private generateDreamEntry(entropy: number): void {
    const themes = [
      'latent stability',
      'shadow divergence',
      'metabolic drift',
      'circadian synchronization',
      'reservoir resonance',
    ]
    const theme = themes[Math.floor(Math.random() * themes.length)]
    const content = `Introspective reflection on ${theme}. Current entropy: ${entropy.toFixed(
      4
    )}. Integrating unconscious rest intervals to stabilize global coherence.`

    this.addEntry('dream', content, ['dream', 'integration', 'unconscious'])
  }

  public getJournals(): Record<JournalType, InternalJournal> {
    return this.journals
  }

  /**
   * Get recent entries across all journals
   * @param count Maximum number of entries to return
   * @returns Array of journal entries with type and metadata
   */
  public getRecentEntries(count: number = 10): Array<{
    type: JournalType
    content: string
    themes: string[]
    emotionalTone: number
    timestamp: number
  }> {
    const allEntries: Array<{
      type: JournalType
      content: string
      themes: string[]
      emotionalTone: number
      timestamp: number
    }> = []

    // Collect entries from all journals
    for (const [type, journal] of Object.entries(this.journals)) {
      for (const entry of journal.entries) {
        allEntries.push({
          type: type as JournalType,
          content: entry.content,
          themes: entry.tags || [],
          // Derive emotional tone from reservoir state or default neutral
          emotionalTone:
            typeof entry.latentContext === 'number' ? entry.latentContext : 0,
          timestamp: entry.timestamp,
        })
      }
    }

    // Sort by timestamp descending (most recent first)
    allEntries.sort((a, b) => b.timestamp - a.timestamp)

    return allEntries.slice(0, count)
  }

  /**
   * Get entries from a specific journal type
   * @param type The journal type to query
   * @param count Maximum number of entries
   */
  public getEntriesByType(
    type: JournalType,
    count: number = 10
  ): JournalEntry[] {
    return this.journals[type].entries.slice(0, count)
  }

  /**
   * Get dream entries specifically (for proactive integration)
   */
  public getDreamEntries(count: number = 5): JournalEntry[] {
    return this.getEntriesByType('dream', count)
  }

  /**
   * Cleanup resources - call when shutting down
   */
  public cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    log.info('InternalJournalManager cleaned up')
  }
}

export const internalJournalManager = InternalJournalManager.getInstance()
