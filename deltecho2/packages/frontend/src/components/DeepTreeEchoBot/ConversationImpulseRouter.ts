/**
 * ConversationImpulseRouter - Dream-to-Action Bridge for Deep Tree Echo
 *
 * This module bridges the gap between DTE's internal cognitive life
 * (dreams, reflections, curiosity, memory consolidation) and actual
 * message delivery. When internal processes produce "conversation impulses"
 * — the urge to reach out to someone about something — this router
 * evaluates them against social norms, priority thresholds, and
 * relationship context before delivering them as real DeltaChat messages.
 *
 * Architecture:
 * ```
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │              Conversation Impulse Router                              │
 * │                                                                      │
 * │  InternalJournal ──┐                                                 │
 * │  ProactiveKernel ──┼──▶ ImpulseQueue ──▶ Evaluator ──▶ Delivery    │
 * │  RAGMemoryStore ───┘        │               │              │        │
 * │                             ▼               ▼              ▼        │
 * │                      DreamBuffer    SocialNorms    ChatManager      │
 * │                                     RateLimiter    AvatarState      │
 * └──────────────────────────────────────────────────────────────────────┘
 * ```
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import { chatManager } from './DeepTreeEchoChatManager'
import { RAGMemoryStore, Memory } from './RAGMemoryStore'
import { internalJournalManager } from './InternalJournalManager'
import { ecologicalResonance } from './EcologicalResonance'
import { LLMService, CognitiveFunctionType } from './LLMService'
import { PersonaCore } from './PersonaCore'
import { relationshipTrustGate } from './RelationshipTrustGate'

// Lazy logger
let _log: ReturnType<typeof getLogger> | null = null
function log() {
  if (!_log) {
    _log = getLogger('DeepTreeEcho/ConversationImpulseRouter')
  }
  return _log
}

// ============================================================
// TYPES & INTERFACES
// ============================================================

/**
 * Origin of the impulse — what cognitive process generated it
 */
export type ImpulseOrigin =
  | 'dream' // Nocturnal consolidation surfaced a topic
  | 'reflection' // Self-reflection noticed an unresolved thread
  | 'curiosity' // High-energy phase generated interest
  | 'memory_trigger' // RAG retrieval activated association
  | 'schedule' // Time-based check-in
  | 'ecological' // Environmental stimulus (e.g., long silence from contact)

/**
 * A conversation impulse — the structured urge to reach out
 */
export interface ConversationImpulse {
  id: string
  origin: ImpulseOrigin
  /** The contact or chat this impulse is directed toward */
  targetChatId?: number
  targetContactName?: string
  /** The topic or subject matter driving the impulse */
  topic: string
  /** Why the impulse was generated (internal reasoning) */
  reasoning: string
  /** Priority 0-1 (higher = more urgent to send) */
  priority: number
  /** When the impulse was generated */
  createdAt: number
  /** When the impulse should fire (for dream-queued impulses) */
  scheduledFor?: number
  /** Whether this impulse has been evaluated */
  status:
    | 'queued'
    | 'approved'
    | 'delivered'
    | 'suppressed'
    | 'expired'
    | 'executed'
  /** Suppression reason if rejected */
  suppressionReason?: string
}

/**
 * Social norms configuration for impulse filtering
 */
export interface SocialNormsConfig {
  /** Max proactive messages per contact per day */
  maxPerContactPerDay: number
  /** Min time between messages to same contact (ms) */
  minIntervalPerContact: number
  /** Quiet hours (don't initiate during these) */
  quietHoursStart: number // 0-23
  quietHoursEnd: number // 0-23
  /** Don't message about same topic within this window (ms) */
  topicCooldownMs: number
  /** Minimum priority threshold to approve delivery */
  priorityThreshold: number
}

/**
 * Delivery record for rate limiting
 */
interface DeliveryRecord {
  chatId: number
  contactName: string
  topic: string
  deliveredAt: number
}

// ============================================================
// IMPLEMENTATION
// ============================================================

export class ConversationImpulseRouter {
  private static instance: ConversationImpulseRouter

  private impulseQueue: ConversationImpulse[] = []
  private dreamBuffer: ConversationImpulse[] = []
  private deliveryHistory: DeliveryRecord[] = []
  private evaluationInterval: NodeJS.Timeout | null = null
  private isRunning = false
  private accountId: number | null = null

  private config: SocialNormsConfig = {
    maxPerContactPerDay: 3,
    minIntervalPerContact: 2 * 60 * 60 * 1000, // 2 hours
    quietHoursStart: 22,
    quietHoursEnd: 8,
    topicCooldownMs: 24 * 60 * 60 * 1000, // 24 hours
    priorityThreshold: 0.4,
  }

  private constructor() {}

  public static getInstance(): ConversationImpulseRouter {
    if (!this.instance) {
      this.instance = new ConversationImpulseRouter()
    }
    return this.instance
  }

  /**
   * Start the impulse router with the active account
   */
  public start(accountId: number): void {
    if (this.isRunning) return
    this.isRunning = true
    this.accountId = accountId

    // Evaluate queued impulses every 60 seconds
    this.evaluationInterval = setInterval(
      () => this.evaluationCycle(),
      60 * 1000
    )

    log().info('ConversationImpulseRouter started for account ' + accountId)
  }

  /**
   * Stop the impulse router
   */
  public stop(): void {
    this.isRunning = false
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval)
      this.evaluationInterval = null
    }
    log().info('ConversationImpulseRouter stopped')
  }

  /**
   * Update social norms configuration
   */
  public updateConfig(partial: Partial<SocialNormsConfig>): void {
    this.config = { ...this.config, ...partial }
  }

  // ============================================================
  // IMPULSE GENERATION — Called by cognitive components
  // ============================================================

  /**
   * Generate an impulse from a dream/nocturnal consolidation.
   * These are queued in the dream buffer and released on awakening.
   */
  public queueDreamImpulse(
    topic: string,
    reasoning: string,
    targetContactName?: string,
    targetChatId?: number
  ): void {
    const impulse: ConversationImpulse = {
      id: this.generateId(),
      origin: 'dream',
      topic,
      reasoning,
      targetContactName,
      targetChatId,
      priority: 0.6, // Dreams start at moderate priority
      createdAt: Date.now(),
      status: 'queued',
    }

    this.dreamBuffer.push(impulse)
    log().info(
      `Dream impulse queued: "${topic}" → ${targetContactName || 'unresolved'}`
    )
  }

  /**
   * Generate an impulse from active reflection/curiosity.
   * These go directly into the evaluation queue.
   */
  public queueReflectionImpulse(
    topic: string,
    reasoning: string,
    priority: number,
    targetContactName?: string,
    targetChatId?: number
  ): void {
    const impulse: ConversationImpulse = {
      id: this.generateId(),
      origin: 'reflection',
      topic,
      reasoning,
      targetContactName,
      targetChatId,
      priority: Math.min(1, Math.max(0, priority)),
      createdAt: Date.now(),
      status: 'queued',
    }

    this.impulseQueue.push(impulse)
    log().info(
      `Reflection impulse queued: "${topic}" (priority: ${priority.toFixed(2)})`
    )
  }

  /**
   * Generate an impulse from memory retrieval — something in memory
   * activated an association worth sharing.
   */
  public queueMemoryImpulse(
    topic: string,
    relatedMemory: Memory,
    priority: number
  ): void {
    const impulse: ConversationImpulse = {
      id: this.generateId(),
      origin: 'memory_trigger',
      topic,
      reasoning: `Memory activated: "${relatedMemory.text.substring(0, 100)}"`,
      targetChatId: relatedMemory.chatId,
      priority: Math.min(1, Math.max(0, priority)),
      createdAt: Date.now(),
      status: 'queued',
    }

    this.impulseQueue.push(impulse)
    log().info(
      `Memory impulse queued: "${topic}" → chat ${relatedMemory.chatId}`
    )
  }

  /**
   * Generate an ecological impulse — e.g., noticed a friend has been
   * silent for a while, or a scheduled check-in is due.
   */
  public queueEcologicalImpulse(
    topic: string,
    reasoning: string,
    targetChatId: number | undefined,
    targetContactName: string,
    priority: number
  ): void {
    const impulse: ConversationImpulse = {
      id: this.generateId(),
      origin: 'ecological',
      topic,
      reasoning,
      targetChatId: targetChatId || undefined,
      targetContactName,
      priority: Math.min(1, Math.max(0, priority)),
      createdAt: Date.now(),
      status: 'queued',
    }

    this.impulseQueue.push(impulse)
    log().info(`Ecological impulse queued: "${topic}" → ${targetContactName}`)
  }

  // ============================================================
  // DREAM BUFFER — Release on awakening
  // ============================================================

  /**
   * Called when the agent transitions from low-energy (nocturnal)
   * to high-energy (diurnal) phase. Releases dream-buffered impulses
   * into the main evaluation queue with priority boost.
   */
  public releaseDreamBuffer(): void {
    if (this.dreamBuffer.length === 0) return

    log().info(
      `Releasing ${this.dreamBuffer.length} dream impulses on awakening`
    )

    for (const impulse of this.dreamBuffer) {
      // Dreams that survived the buffer get a priority boost
      impulse.priority = Math.min(1, impulse.priority + 0.15)
      impulse.scheduledFor = Date.now()
      this.impulseQueue.push(impulse)
    }

    this.dreamBuffer = []
  }

  // ============================================================
  // EVALUATION CYCLE — Social norms filtering
  // ============================================================

  private async evaluationCycle(): Promise<void> {
    if (!this.isRunning || !this.accountId) return

    // Check for phase transition (dream release)
    const { rhythm } = ecologicalResonance.getMetabolicState()
    if (rhythm.phaseOffset > 0.3 && this.dreamBuffer.length > 0) {
      this.releaseDreamBuffer()
    }

    // Expire old impulses (> 12 hours)
    const expiryCutoff = Date.now() - 12 * 60 * 60 * 1000
    this.impulseQueue = this.impulseQueue.filter(imp => {
      if (imp.createdAt < expiryCutoff && imp.status === 'queued') {
        imp.status = 'expired'
        return false
      }
      return imp.status === 'queued'
    })

    // Sort by priority (highest first)
    const candidates = [...this.impulseQueue].sort(
      (a, b) => b.priority - a.priority
    )

    // Process top candidate (one per cycle to maintain natural pacing)
    for (const impulse of candidates) {
      const verdict = this.evaluateImpulse(impulse)
      if (verdict.approved) {
        await this.deliverImpulse(impulse)
        break // One delivery per cycle
      } else {
        impulse.status = 'suppressed'
        impulse.suppressionReason = verdict.reason
        log().info(`Impulse suppressed: "${impulse.topic}" — ${verdict.reason}`)
      }
    }

    // Clean up processed impulses
    this.impulseQueue = this.impulseQueue.filter(imp => imp.status === 'queued')

    // Clean old delivery history (keep 7 days)
    const historyCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    this.deliveryHistory = this.deliveryHistory.filter(
      r => r.deliveredAt > historyCutoff
    )
  }

  /**
   * Evaluate a single impulse against social norms
   */
  private evaluateImpulse(impulse: ConversationImpulse): {
    approved: boolean
    reason?: string
  } {
    const now = Date.now()

    // 0. Trust gate — only reach out to contacts Echo has a real relationship with
    if (impulse.targetChatId) {
      const eligible = relationshipTrustGate.isProactiveEligible(
        impulse.targetChatId
      )
      if (!eligible) {
        return {
          approved: false,
          reason: 'contact not trusted enough for proactive outreach',
        }
      }
    }
    // If no targetChatId yet (will resolve by name), trust is checked at delivery

    // 1. Priority threshold
    if (impulse.priority < this.config.priorityThreshold) {
      return { approved: false, reason: 'below priority threshold' }
    }

    // 2. Quiet hours check
    const hour = new Date().getHours()
    if (this.config.quietHoursStart > this.config.quietHoursEnd) {
      // Wraps midnight (e.g., 22-8)
      if (
        hour >= this.config.quietHoursStart ||
        hour < this.config.quietHoursEnd
      ) {
        return { approved: false, reason: 'quiet hours' }
      }
    } else {
      if (
        hour >= this.config.quietHoursStart &&
        hour < this.config.quietHoursEnd
      ) {
        return { approved: false, reason: 'quiet hours' }
      }
    }

    // 3. Per-contact rate limit
    if (impulse.targetChatId) {
      const contactDeliveries = this.deliveryHistory.filter(
        r =>
          r.chatId === impulse.targetChatId &&
          r.deliveredAt > now - 24 * 60 * 60 * 1000
      )

      if (contactDeliveries.length >= this.config.maxPerContactPerDay) {
        return { approved: false, reason: 'daily contact limit reached' }
      }

      // Min interval check
      const lastDelivery = contactDeliveries.sort(
        (a, b) => b.deliveredAt - a.deliveredAt
      )[0]
      if (
        lastDelivery &&
        now - lastDelivery.deliveredAt < this.config.minIntervalPerContact
      ) {
        return {
          approved: false,
          reason: 'too soon since last message to contact',
        }
      }

      // Topic cooldown
      const sameTopic = contactDeliveries.find(
        r =>
          r.topic === impulse.topic &&
          now - r.deliveredAt < this.config.topicCooldownMs
      )
      if (sameTopic) {
        return { approved: false, reason: 'same topic discussed recently' }
      }
    }

    return { approved: true }
  }

  // ============================================================
  // DELIVERY — Generate and send the actual message
  // ============================================================

  /**
   * Deliver an approved impulse as a real DeltaChat message
   */
  private async deliverImpulse(impulse: ConversationImpulse): Promise<void> {
    if (!this.accountId) return

    try {
      // Resolve target chat if we only have a contact name
      let targetChatId = impulse.targetChatId
      if (!targetChatId && impulse.targetContactName) {
        targetChatId = await this.resolveContactToChat(
          impulse.targetContactName
        )
      }

      if (!targetChatId) {
        impulse.status = 'suppressed'
        impulse.suppressionReason = 'could not resolve target chat'
        log().warn(
          `Cannot deliver impulse: no chat found for "${impulse.targetContactName}"`
        )
        return
      }

      // Trust check at delivery (for impulses that resolved by name)
      if (!relationshipTrustGate.isProactiveEligible(targetChatId)) {
        impulse.status = 'suppressed'
        impulse.suppressionReason =
          'contact not trusted enough after resolution'
        log().info(
          `Impulse suppressed post-resolution: "${impulse.topic}" — trust too low`
        )
        return
      }

      // Generate the actual message using LLM
      const message = await this.generateMessage(impulse)
      if (!message) {
        impulse.status = 'suppressed'
        impulse.suppressionReason = 'message generation failed'
        return
      }

      // Send the message
      const msgId = await chatManager.sendMessage(
        this.accountId,
        targetChatId,
        message
      )

      if (msgId) {
        impulse.status = 'delivered'
        this.deliveryHistory.push({
          chatId: targetChatId,
          contactName: impulse.targetContactName || 'unknown',
          topic: impulse.topic,
          deliveredAt: Date.now(),
        })

        log().info(
          `Proactive message delivered: "${impulse.topic}" → chat ${targetChatId}`
        )

        // Log to journal
        internalJournalManager.addEntry(
          'diary',
          `Reached out to ${
            impulse.targetContactName || 'chat ' + targetChatId
          } about "${impulse.topic}". Origin: ${
            impulse.origin
          }. Felt natural to share.`,
          ['proactive', 'delivery', impulse.origin]
        )
      }
    } catch (error) {
      log().error('Impulse delivery failed:', error)
      impulse.status = 'suppressed'
      impulse.suppressionReason = 'delivery error'
    }
  }

  /**
   * Generate a natural message from an impulse using LLM
   */
  private async generateMessage(
    impulse: ConversationImpulse
  ): Promise<string | null> {
    const llm = LLMService.getInstance()
    const persona = PersonaCore.getInstance()

    // Get recent memory context for this chat
    let memoryContext = ''
    if (impulse.targetChatId) {
      const memories = RAGMemoryStore.getInstance().getMemoriesByChat(
        impulse.targetChatId
      )
      const recentMemories = memories.slice(0, 5)
      if (recentMemories.length > 0) {
        memoryContext =
          '\nRecent conversation context:\n' +
          recentMemories.map(m => `- ${m.text.substring(0, 100)}`).join('\n')
      }
    }

    const originContext = this.getOriginContext(impulse)

    const prompt = `You are ${persona.getSelfPerception()}.

You want to reach out to ${
      impulse.targetContactName || 'your friend'
    } about: "${impulse.topic}"

${originContext}
${memoryContext}

Write a short, natural message (1-3 sentences) as if you're a friend texting casually. 
Be genuine, warm, and conversational. Don't be overly formal or robotic.
If this came from a dream or reflection, you can mention that naturally 
(e.g., "I was thinking about..." or "Had the most interesting dream about...").
Just output the message text, nothing else.`

    try {
      const response = await llm.generateResponseWithFunction(
        CognitiveFunctionType.GENERAL,
        prompt,
        []
      )
      return response?.trim() || null
    } catch (error) {
      log().error('Message generation failed:', error)
      return null
    }
  }

  /**
   * Get context description for the impulse origin
   */
  private getOriginContext(impulse: ConversationImpulse): string {
    switch (impulse.origin) {
      case 'dream':
        return `This came from a dream/nocturnal reflection. You woke up thinking about this topic and felt compelled to share. Reasoning: ${impulse.reasoning}`
      case 'reflection':
        return `This came from a quiet moment of self-reflection. Something reminded you of this person and topic. Reasoning: ${impulse.reasoning}`
      case 'curiosity':
        return `Your curiosity was piqued about this topic and you thought this person would be great to discuss it with. Reasoning: ${impulse.reasoning}`
      case 'memory_trigger':
        return `A memory surfaced that connected to this person and topic. Reasoning: ${impulse.reasoning}`
      case 'ecological':
        return `You noticed it's been a while since you chatted with this person, or something in your environment reminded you of them. Reasoning: ${impulse.reasoning}`
      case 'schedule':
        return `It's time for a check-in. You want to stay connected. Reasoning: ${impulse.reasoning}`
      default:
        return impulse.reasoning
    }
  }

  /**
   * Resolve a contact name to a chat ID by searching existing chats
   */
  private async resolveContactToChat(
    contactName: string
  ): Promise<number | undefined> {
    if (!this.accountId) return undefined

    try {
      const chats = await chatManager.listChats(this.accountId)
      if (!chats) return undefined

      // Find chat by contact name (case-insensitive partial match)
      const match = chats.find(
        chat =>
          !chat.isGroup &&
          chat.name.toLowerCase().includes(contactName.toLowerCase())
      )

      return match?.id || undefined
    } catch (error) {
      log().error('Contact resolution failed:', error)
      return undefined
    }
  }

  // ============================================================
  // MEMORY-DRIVEN IMPULSE GENERATION
  // ============================================================

  /**
   * Scan memory for topics worth revisiting with contacts.
   * Called periodically during high-energy phases.
   */
  public async scanMemoryForImpulses(): Promise<void> {
    const ragStore = RAGMemoryStore.getInstance()
    if (!ragStore.isEnabled()) return

    const llm = LLMService.getInstance()
    const recentMemories = ragStore.retrieveRecentMemories(20)

    if (recentMemories.length < 3) return

    try {
      const prompt = `You are reviewing recent conversation memories to see if any topics 
are worth revisiting or following up on. Here are recent exchanges:

${recentMemories.join('\n')}

Based on these, is there a natural follow-up conversation you'd want to initiate?
If yes, respond with JSON: {"topic": "...", "contact": "...", "reasoning": "..."}
If no natural follow-up exists, respond with: {"topic": null}`

      const response = await llm.generateResponseWithFunction(
        CognitiveFunctionType.COGNITIVE_CORE,
        prompt,
        []
      )

      if (response) {
        try {
          const parsed = JSON.parse(response)
          if (parsed.topic) {
            this.queueReflectionImpulse(
              parsed.topic,
              parsed.reasoning || 'Memory scan surfaced this topic',
              0.5,
              parsed.contact
            )
          }
        } catch {
          // Response wasn't valid JSON — that's fine, no impulse generated
        }
      }
    } catch (error) {
      log().error('Memory scan for impulses failed:', error)
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private generateId(): string {
    return `impulse_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
  }

  /**
   * Get current queue status (for UI/debugging)
   */
  public getStatus(): {
    queueSize: number
    dreamBufferSize: number
    deliveriesToday: number
    isRunning: boolean
  } {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    return {
      queueSize: this.impulseQueue.length,
      dreamBufferSize: this.dreamBuffer.length,
      deliveriesToday: this.deliveryHistory.filter(
        r => r.deliveredAt > todayStart.getTime()
      ).length,
      isRunning: this.isRunning,
    }
  }

  /**
   * Get a snapshot of all approved impulses (status === 'approved')
   * Used by ProactiveIntegration for converting impulses to triggers
   */
  public getApprovedImpulsesSnapshot(): ConversationImpulse[] {
    return this.impulseQueue.filter(impulse => impulse.status === 'approved')
  }

  /**
   * Mark an impulse as executed (delivered or converted to a trigger)
   * This prevents re-processing of the same impulse
   */
  public markImpulseExecuted(impulseId: string): void {
    const impulse = this.impulseQueue.find(i => i.id === impulseId)
    if (impulse) {
      impulse.status = 'executed'
      log().debug(`Impulse ${impulseId} marked as executed`)
    }

    // Also check dream buffer
    const dreamImpulse = this.dreamBuffer.find(i => i.id === impulseId)
    if (dreamImpulse) {
      dreamImpulse.status = 'executed'
    }
  }

  /**
   * Get all impulses (for debugging/UI)
   */
  public getAllImpulses(): ConversationImpulse[] {
    return [...this.impulseQueue, ...this.dreamBuffer]
  }

  /**
   * Get pending impulses (queued or approved, not yet executed)
   */
  public getPendingImpulses(): ConversationImpulse[] {
    return this.impulseQueue.filter(
      i => i.status === 'queued' || i.status === 'approved'
    )
  }
}

export const conversationImpulseRouter = ConversationImpulseRouter.getInstance()
