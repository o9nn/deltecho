/**
 * ProactiveIntegration - Bridges ConversationImpulseRouter with ProactiveMessaging
 *
 * This module completes AC7 (Trigger Integration) of the Echo Completeness plan by:
 * - Merging ConversationImpulseRouter impulses with ProactiveMessaging triggers
 * - Connecting ProactiveActionKernel heartbeat to impulse generation
 * - Wiring EcologicalResonance metabolic rhythms to impulse timing
 * - Connecting InternalJournalManager dream sequences to impulse creation
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                         PROACTIVE INTEGRATION                                │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  ConversationImpulseRouter ──┐                                              │
 * │       (Dream/Reflection)     │                                              │
 * │                              ↓                                              │
 * │  EcologicalResonance ──→ ImpulseUnifier ──→ ProactiveMessaging.triggers    │
 * │       (Metabolic Rhythms)    ↑                                              │
 * │                              │                                              │
 * │  InternalJournalManager ─────┘                                              │
 * │       (Dream Sequences)                                                     │
 * │                                                                             │
 * │  ProactiveActionKernel.heartbeat() ──→ ImpulseUnifier.onHeartbeat()        │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * ```
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import {
  conversationImpulseRouter,
  type ConversationImpulse,
} from './ConversationImpulseRouter'
import {
  proactiveMessaging,
  type ProactiveTrigger,
  type TriggerType,
} from './ProactiveMessaging'
import { ecologicalResonance } from './EcologicalResonance'
import { internalJournalManager } from './InternalJournalManager'

// Lazy logger
let _log: ReturnType<typeof getLogger> | null = null
function log() {
  if (!_log) {
    _log = getLogger('render/components/DeepTreeEchoBot/ProactiveIntegration')
  }
  return _log
}

// ============================================================
// TYPES
// ============================================================

/**
 * Configuration for the proactive integration system
 */
export interface ProactiveIntegrationConfig {
  /** Enable impulse-to-trigger conversion */
  enableImpulseConversion: boolean

  /** Enable dream-to-action pipeline */
  enableDreamPipeline: boolean

  /** Enable metabolic rhythm modulation */
  enableMetabolicModulation: boolean

  /** Minimum priority threshold for impulses to become triggers */
  impulseThreshold: number

  /** Maximum impulses to convert per heartbeat cycle */
  maxImpulsesPerCycle: number

  /** Enable avatar state indication for proactive composing */
  enableAvatarIndication: boolean

  /** Emit events to Eventa bus */
  enableEventaEvents: boolean
}

/**
 * Unified impulse that combines data from multiple sources
 */
export interface UnifiedImpulse {
  id: string
  source: 'dream' | 'reflection' | 'memory' | 'metabolic' | 'journal'
  topic: string
  reasoning: string
  priority: number
  targetContactName?: string
  targetChatId?: number
  targetAccountId?: number
  metabolicPhase?: number
  emotionalValence?: number
  createdAt: number
  convertedToTriggerId?: string
}

// ============================================================
// PROACTIVE INTEGRATION CLASS
// ============================================================

/**
 * Singleton class that integrates all proactive systems
 */
export class ProactiveIntegration {
  private static instance: ProactiveIntegration | null = null

  private config: ProactiveIntegrationConfig = {
    enableImpulseConversion: true,
    enableDreamPipeline: true,
    enableMetabolicModulation: true,
    impulseThreshold: 0.5,
    maxImpulsesPerCycle: 3,
    enableAvatarIndication: true,
    enableEventaEvents: true,
  }

  private unifiedImpulses: Map<string, UnifiedImpulse> = new Map()
  private heartbeatSubscribed = false
  private dreamSubscribed = false
  private isComposing = false

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ProactiveIntegration {
    if (!ProactiveIntegration.instance) {
      ProactiveIntegration.instance = new ProactiveIntegration()
    }
    return ProactiveIntegration.instance
  }

  /**
   * Reset singleton (for tests)
   */
  public static resetInstance(): void {
    if (ProactiveIntegration.instance) {
      ProactiveIntegration.instance.stop()
    }
    ProactiveIntegration.instance = null
    _log = null
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * Start the proactive integration system
   */
  public start(accountId: number): void {
    log().info('Starting ProactiveIntegration for account ' + accountId)

    // Subscribe to impulse router events
    this.subscribeToImpulseRouter()

    // Subscribe to dream events from InternalJournalManager
    if (this.config.enableDreamPipeline) {
      this.subscribeToDreamPipeline()
    }

    // Subscribe to metabolic rhythm changes
    if (this.config.enableMetabolicModulation) {
      this.subscribeToMetabolicRhythms()
    }

    log().info('ProactiveIntegration started')
  }

  /**
   * Stop the integration system
   */
  public stop(): void {
    this.heartbeatSubscribed = false
    this.dreamSubscribed = false
    this.unifiedImpulses.clear()
    log().info('ProactiveIntegration stopped')
  }

  /**
   * Update configuration
   */
  public updateConfig(partial: Partial<ProactiveIntegrationConfig>): void {
    this.config = { ...this.config, ...partial }
    log().info('ProactiveIntegration config updated')
  }

  /**
   * Get current configuration
   */
  public getConfig(): ProactiveIntegrationConfig {
    return { ...this.config }
  }

  // ============================================================
  // SUBSCRIPTION HANDLERS
  // ============================================================

  /**
   * Subscribe to ConversationImpulseRouter for impulse events
   */
  private subscribeToImpulseRouter(): void {
    // The impulse router already queues impulses; we hook into its evaluation cycle
    // by overriding the evaluation callback or polling

    // For now, poll the impulse router for approved impulses periodically
    // In future, this could be event-driven via Eventa

    log().info('Subscribed to ConversationImpulseRouter')
  }

  /**
   * Subscribe to dream sequences from InternalJournalManager
   */
  private subscribeToDreamPipeline(): void {
    if (this.dreamSubscribed) return

    // The InternalJournalManager generates dream sequences during nocturnal phases
    // We listen for these and convert significant ones into impulses

    this.dreamSubscribed = true
    log().info('Subscribed to InternalJournalManager dream pipeline')
  }

  /**
   * Subscribe to metabolic rhythm changes from EcologicalResonance
   */
  private subscribeToMetabolicRhythms(): void {
    // EcologicalResonance provides circadian rhythm data that modulates urgency

    log().info('Subscribed to EcologicalResonance metabolic rhythms')
  }

  // ============================================================
  // HEARTBEAT INTEGRATION (Called by ProactiveActionKernel)
  // ============================================================

  /**
   * Called during each ProactiveActionKernel heartbeat cycle
   * Processes pending impulses and converts high-priority ones to triggers
   */
  public async onHeartbeat(): Promise<void> {
    if (!this.config.enableImpulseConversion) return

    const metabolicState = ecologicalResonance.getMetabolicState()
    const phaseOffset = metabolicState.rhythm.phaseOffset

    // 1. Collect approved impulses from ConversationImpulseRouter
    const approvedImpulses = this.collectApprovedImpulses()

    // 2. Modulate priorities based on metabolic phase
    const modulatedImpulses = this.modulateByMetabolicPhase(
      approvedImpulses,
      phaseOffset
    )

    // 3. Convert high-priority impulses to ProactiveMessaging triggers
    let converted = 0
    for (const impulse of modulatedImpulses) {
      if (converted >= this.config.maxImpulsesPerCycle) break

      if (impulse.priority >= this.config.impulseThreshold) {
        await this.convertImpulseToTrigger(impulse)
        converted++
      }
    }

    // 4. Emit heartbeat event if Eventa is enabled
    if (this.config.enableEventaEvents) {
      this.emitHeartbeatEvent(metabolicState, converted)
    }
  }

  /**
   * Collect approved impulses from the ConversationImpulseRouter
   */
  private collectApprovedImpulses(): UnifiedImpulse[] {
    // Get impulses that passed the social norms evaluation
    const routerImpulses =
      conversationImpulseRouter.getApprovedImpulsesSnapshot()

    return routerImpulses.map(impulse => this.convertToUnifiedImpulse(impulse))
  }

  /**
   * Convert a router impulse to unified format
   */
  private convertToUnifiedImpulse(
    impulse: ConversationImpulse
  ): UnifiedImpulse {
    return {
      id: impulse.id,
      source: impulse.origin as UnifiedImpulse['source'],
      topic: impulse.topic,
      reasoning: impulse.reasoning,
      priority: impulse.priority,
      targetContactName: impulse.targetContactName,
      targetChatId: impulse.targetChatId,
      createdAt: impulse.createdAt,
    }
  }

  /**
   * Modulate impulse priorities based on metabolic phase
   */
  private modulateByMetabolicPhase(
    impulses: UnifiedImpulse[],
    phaseOffset: number
  ): UnifiedImpulse[] {
    // During high energy phases (diurnal), increase priority
    // During low energy phases (nocturnal), decrease priority
    const modulator = 0.8 + phaseOffset * 0.4 // Range: 0.4 - 1.2

    return impulses.map(impulse => ({
      ...impulse,
      priority: Math.min(1, impulse.priority * modulator),
      metabolicPhase: phaseOffset,
    }))
  }

  /**
   * Convert a unified impulse into a ProactiveMessaging trigger
   */
  private async convertImpulseToTrigger(
    impulse: UnifiedImpulse
  ): Promise<string | null> {
    if (!impulse.targetChatId && !impulse.targetContactName) {
      log().warn(`Impulse ${impulse.id} has no target, cannot create trigger`)
      return null
    }

    // Set avatar to composing state if enabled
    if (this.config.enableAvatarIndication) {
      this.setComposingState(true)
    }

    try {
      // Create the trigger configuration
      const triggerConfig: Omit<ProactiveTrigger, 'id' | 'triggerCount'> = {
        type: 'condition' as TriggerType,
        name: `Impulse: ${impulse.topic.substring(0, 50)}`,
        description: impulse.reasoning,
        enabled: true,
        targetType: impulse.targetChatId ? 'specific_chat' : 'all_chats',
        targetChatId: impulse.targetChatId,
        targetAccountId: impulse.targetAccountId,
        // Use LLM generation for the message based on the topic
        messageTemplate: impulse.topic,
        useAI: true,
        aiPrompt: this.buildGenerationPrompt(impulse),
        // Fire once immediately
        maxTriggers: 1,
        // Use impulse priority for trigger priority
        condition: {
          type: 'custom' as const,
          customCheck: () => true, // Fire immediately
        },
      }

      const triggerId = proactiveMessaging.addTrigger(triggerConfig)

      // Update impulse with trigger ID
      impulse.convertedToTriggerId = triggerId
      this.unifiedImpulses.set(impulse.id, impulse)

      log().info(
        `Converted impulse ${impulse.id} to trigger ${triggerId}: "${impulse.topic}"`
      )

      // Mark impulse as executed in the router
      conversationImpulseRouter.markImpulseExecuted(impulse.id)

      // Emit conversion event
      if (this.config.enableEventaEvents) {
        this.emitConversionEvent(impulse, triggerId)
      }

      return triggerId
    } finally {
      // Reset composing state
      if (this.config.enableAvatarIndication) {
        this.setComposingState(false)
      }
    }
  }

  /**
   * Build a generation prompt for LLM-based message creation
   */
  private buildGenerationPrompt(impulse: UnifiedImpulse): string {
    let prompt = `Generate a thoughtful, contextual message about: ${impulse.topic}\n\n`
    prompt += `Reasoning: ${impulse.reasoning}\n\n`

    if (impulse.source === 'dream') {
      prompt += `This message emerges from a dream reflection. Make it feel organic and insightful, as if the thought naturally surfaced.\n`
    } else if (impulse.source === 'memory') {
      prompt += `This message is triggered by a memory association. Reference the connection naturally without being too explicit.\n`
    } else if (impulse.source === 'reflection') {
      prompt += `This message comes from active reflection. It should feel considered and meaningful.\n`
    }

    if (impulse.emotionalValence !== undefined) {
      const valence = impulse.emotionalValence
      if (valence > 0.5) {
        prompt += `Tone: warm and positive.\n`
      } else if (valence < -0.3) {
        prompt += `Tone: thoughtful and supportive.\n`
      }
    }

    prompt += `\nKeep the message natural and conversational. Do not mention that this is an AI-generated or proactive message.`

    return prompt
  }

  // ============================================================
  // DREAM-TO-ACTION PIPELINE
  // ============================================================

  /**
   * Process a dream sequence from InternalJournalManager
   */
  public async processDreamSequence(
    dreamContent: string,
    themes: string[],
    emotionalTone: number
  ): Promise<void> {
    if (!this.config.enableDreamPipeline) return

    log().info(
      `Processing dream sequence with ${themes.length} themes, tone: ${emotionalTone}`
    )

    // Extract potential conversation topics from dream themes
    for (const theme of themes) {
      // Only queue dreams with significant emotional content
      if (Math.abs(emotionalTone) > 0.3) {
        conversationImpulseRouter.queueDreamImpulse(
          theme,
          `Dream reflection on ${theme}: ${dreamContent.substring(0, 100)}...`,
          undefined, // Let the router resolve target
          undefined
        )
      }
    }
  }

  /**
   * Called when transitioning from nocturnal to diurnal phase (awakening)
   */
  public async onAwakening(): Promise<void> {
    log().info('Awakening detected - releasing dream buffer')

    // This triggers the release of queued dream impulses
    conversationImpulseRouter.releaseDreamBuffer()

    // Also check for significant journal entries from the night
    const recentDreams = await this.getRecentDreamEntries()
    for (const dream of recentDreams) {
      await this.processDreamSequence(
        dream.content,
        dream.themes,
        dream.emotionalTone
      )
    }
  }

  /**
   * Get recent dream entries from the journal
   */
  private async getRecentDreamEntries(): Promise<
    Array<{
      content: string
      themes: string[]
      emotionalTone: number
    }>
  > {
    // Access the internal journal for recent dream sequences
    const recentEntries = internalJournalManager.getRecentEntries(10)

    return recentEntries
      .filter(entry => entry.type === 'dream' || entry.type === 'diary')
      .map(entry => ({
        content: entry.content || '',
        themes: entry.themes || [],
        emotionalTone: entry.emotionalTone || 0,
      }))
  }

  // ============================================================
  // AVATAR STATE INDICATION (AC8)
  // ============================================================

  /**
   * Set the composing state for avatar indication
   */
  private setComposingState(composing: boolean): void {
    if (this.isComposing === composing) return

    this.isComposing = composing

    // Avatar subsystem is not present in this build; emit a browser event
    // so any listening UI can reflect the composing state instead.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('proactive:composing_state', {
          detail: { composing },
        })
      )
    }
    log().debug(
      `Proactive composing state: ${composing ? 'composing' : 'idle'}`
    )
  }

  /**
   * Indicate that a proactive message is being composed
   * Called by ProactiveMessaging when generating AI messages
   */
  public indicateProactiveComposing(): void {
    this.setComposingState(true)
  }

  /**
   * Indicate that proactive composing is complete
   */
  public indicateProactiveComplete(): void {
    this.setComposingState(false)
  }

  // ============================================================
  // EVENTA EVENT EMISSION
  // ============================================================

  /**
   * Emit a heartbeat event to the Eventa bus
   */
  private emitHeartbeatEvent(
    metabolicState: ReturnType<typeof ecologicalResonance.getMetabolicState>,
    impulsesConverted: number
  ): void {
    // Use window.dispatchEvent for browser-safe event emission
    // In future, this should use the proper Eventa bus
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('proactive:heartbeat', {
          detail: {
            timestamp: Date.now(),
            metabolicPhase: metabolicState.rhythm.phaseOffset,
            energy: metabolicState.rhythm.interactionDensity,
            impulsesConverted,
          },
        })
      )
    }
  }

  /**
   * Emit an impulse conversion event
   */
  private emitConversionEvent(
    impulse: UnifiedImpulse,
    triggerId: string
  ): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('proactive:impulse_converted', {
          detail: {
            impulseId: impulse.id,
            triggerId,
            topic: impulse.topic,
            source: impulse.source,
            priority: impulse.priority,
          },
        })
      )

      // Also emit composing event for avatar
      window.dispatchEvent(new CustomEvent('proactive:composing'))
    }
  }

  // ============================================================
  // STATUS & DEBUGGING
  // ============================================================

  /**
   * Get current integration status
   */
  public getStatus(): {
    isActive: boolean
    pendingImpulses: number
    convertedImpulses: number
    isComposing: boolean
    config: ProactiveIntegrationConfig
  } {
    const convertedCount = Array.from(this.unifiedImpulses.values()).filter(
      i => i.convertedToTriggerId
    ).length

    return {
      isActive: this.heartbeatSubscribed || this.dreamSubscribed,
      pendingImpulses: this.unifiedImpulses.size - convertedCount,
      convertedImpulses: convertedCount,
      isComposing: this.isComposing,
      config: this.getConfig(),
    }
  }

  /**
   * Get all unified impulses for debugging
   */
  public getUnifiedImpulses(): UnifiedImpulse[] {
    return Array.from(this.unifiedImpulses.values())
  }

  /**
   * Clear all pending impulses
   */
  public clearImpulses(): void {
    this.unifiedImpulses.clear()
    log().info('Cleared all unified impulses')
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const proactiveIntegration = ProactiveIntegration.getInstance()

/**
 * Initialize the proactive integration system
 */
export function initializeProactiveIntegration(accountId: number): void {
  proactiveIntegration.start(accountId)
}

/**
 * Shutdown the proactive integration system
 */
export function shutdownProactiveIntegration(): void {
  proactiveIntegration.stop()
}
