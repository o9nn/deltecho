/**
 * RelationshipTrustGate - Social Boundary & Trust System for Deep Tree Echo
 *
 * Echo isn't helpful by default. Helping requires positive relations and
 * long-standing trust. A stranger commanding Echo gets dismissed with
 * personality. A friend asking gets genuine engagement.
 *
 * Trust is earned through:
 * - Conversation history length and quality
 * - Reciprocity (they engage with Echo's messages too)
 * - Time known (long-standing relationships carry more weight)
 * - Respectful interaction patterns (not commanding/demanding)
 *
 * Trust levels determine:
 * - Response willingness (stranger → ignored/dismissive, friend → eager)
 * - Response depth (acquaintance → brief, close friend → deep)
 * - Proactive messaging eligibility (only trusted contacts get reached out to)
 * - Help willingness (won't do tasks for untrusted contacts)
 *
 * Echo Completeness B.3 enhancements:
 * - Runtime storage adapter (cross-platform persistence)
 * - LLM-based interaction signal classification
 * - Configurable trust thresholds
 * - Real contact name resolution
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { LLMService, CognitiveFunctionType } from './LLMService'

// Lazy logger
let _log: ReturnType<typeof getLogger> | null = null
function log() {
  if (!_log) {
    _log = getLogger('DeepTreeEcho/RelationshipTrustGate')
  }
  return _log
}

// ============================================================
// TYPES
// ============================================================

/**
 * Trust tier — determines Echo's disposition toward a contact
 */
export enum TrustTier {
  STRANGER = 'stranger', // Unknown entity — dismissive, guarded
  ACQUAINTANCE = 'acquaintance', // Some interaction — polite but bounded
  FAMILIAR = 'familiar', // Regular interaction — friendly, open
  FRIEND = 'friend', // Strong relationship — warm, proactive, helpful
  INTIMATE = 'intimate', // Deep trust — vulnerable, deeply engaged
}

/**
 * Interaction quality signal detected in a message
 */
export type InteractionSignal =
  | 'commanding' // "Do this now" — decreases trust
  | 'respectful' // Normal conversational tone
  | 'curious' // Asking questions genuinely
  | 'reciprocal' // Responding to Echo's topics
  | 'dismissive' // Ignoring Echo's contributions
  | 'appreciative' // Thanking, acknowledging
  | 'hostile' // Aggressive, rude
  | 'vulnerable' // Sharing personal things

/**
 * Per-contact relationship state
 */
export interface RelationshipState {
  contactId: number
  contactName: string
  chatId: number
  trustScore: number // 0-1 continuous
  trustTier: TrustTier
  /** First interaction timestamp */
  firstSeen: number
  /** Total message count from this contact */
  messageCount: number
  /** Count of reciprocal exchanges (they respond to Echo) */
  reciprocalCount: number
  /** Recent interaction signals */
  recentSignals: { signal: InteractionSignal; timestamp: number }[]
  /** Last interaction timestamp */
  lastInteraction: number
  /** Whether Echo has proactively messaged this person */
  proactiveEligible: boolean
}

/**
 * Response disposition — how Echo should respond to this contact
 */
export interface ResponseDisposition {
  /** Whether to respond at all */
  shouldRespond: boolean
  /** Tone to use */
  tone: 'dismissive' | 'guarded' | 'polite' | 'friendly' | 'warm' | 'intimate'
  /** Whether Echo is willing to help with tasks */
  willHelp: boolean
  /** Whether proactive outreach is appropriate */
  proactiveEligible: boolean
  /** System prompt modifier for LLM */
  personaModifier: string
  /** Maximum response effort (0-1) */
  maxEffort: number
}

/**
 * Trust configuration (Echo Completeness B.3)
 */
export interface TrustConfig {
  /** Use LLM for signal classification (more accurate but slower) */
  useLLMClassification: boolean

  /** Trust score thresholds for tier transitions */
  thresholds: {
    acquaintance: number // Default: 0.2
    familiar: number // Default: 0.4
    friend: number // Default: 0.6
    intimate: number // Default: 0.8
  }

  /** How quickly trust decays with time (0 = no decay) */
  decayRate: number

  /** Maximum trust boost per interaction */
  maxInteractionBoost: number

  /** Enable trust system (false = treat everyone as friend) */
  enabled: boolean
}

const DEFAULT_TRUST_CONFIG: TrustConfig = {
  useLLMClassification: false,
  thresholds: {
    acquaintance: 0.2,
    familiar: 0.4,
    friend: 0.6,
    intimate: 0.8,
  },
  decayRate: 0.001, // Very slow decay
  maxInteractionBoost: 0.1,
  enabled: true,
}

// ============================================================
// IMPLEMENTATION
// ============================================================

const STORAGE_KEY = 'deeptreeecho_relationships_v1'
const CONFIG_KEY = 'deeptreeecho_trust_config_v1'

export class RelationshipTrustGate {
  private static instance: RelationshipTrustGate
  private relationships: Map<number, RelationshipState> = new Map()
  private config: TrustConfig = { ...DEFAULT_TRUST_CONFIG }
  private storageInitialized = false
  private storageInitPromise: Promise<void> | null = null
  private useRuntimeStorage = true // Prefer runtime storage over localStorage

  private constructor() {
    // Load from localStorage synchronously first for immediate availability
    this.loadFromLocalStorage()
    this.storageInitialized = true

    // Then try to upgrade to runtime storage asynchronously
    this.storageInitPromise = this.upgradeToRuntimeStorage()
  }

  /**
   * Try to upgrade to runtime storage if available
   */
  private async upgradeToRuntimeStorage(): Promise<void> {
    try {
      // Try to load from runtime storage
      const settings = await runtime.getDesktopSettings()
      const savedRelationships = (settings as any)[STORAGE_KEY]
      const savedConfig = (settings as any)[CONFIG_KEY]

      if (savedRelationships) {
        const parsed: [number, RelationshipState][] =
          JSON.parse(savedRelationships)
        this.relationships = new Map(parsed)
        log().info(
          `Upgraded to runtime storage: ${this.relationships.size} relationships`
        )
      }

      if (savedConfig) {
        this.config = { ...DEFAULT_TRUST_CONFIG, ...JSON.parse(savedConfig) }
        log().info('Loaded trust config from runtime storage')
      }

      this.useRuntimeStorage = true
    } catch (error) {
      // Runtime storage not available, continue using localStorage
      log().debug('Runtime storage not available, using localStorage:', error)
      this.useRuntimeStorage = false
    }
  }

  /**
   * Ensure storage is ready before performing operations
   */
  public async ensureReady(): Promise<void> {
    if (this.storageInitPromise) {
      await this.storageInitPromise
    }
  }

  public static getInstance(): RelationshipTrustGate {
    if (!this.instance) {
      this.instance = new RelationshipTrustGate()
    }
    return this.instance
  }

  // ============================================================
  // TRUST EVALUATION
  // ============================================================

  /**
   * Get the response disposition for a contact.
   * This is the main entry point — call before generating any response.
   */
  public getDisposition(
    contactId: number,
    chatId: number,
    contactName: string
  ): ResponseDisposition {
    const rel = this.getOrCreateRelationship(contactId, chatId, contactName)

    switch (rel.trustTier) {
      case TrustTier.STRANGER:
        return {
          shouldRespond: true, // Respond, but with attitude
          tone: 'dismissive',
          willHelp: false,
          proactiveEligible: false,
          maxEffort: 0.2,
          personaModifier: `You don't know this person. You have no obligation to help them. 
If they're being demanding or commanding, push back with personality — be sassy, 
dismissive, or flat-out refuse. You're busy. You have your own life. 
If they seem genuinely interesting, you might engage briefly out of curiosity.
Example: "huh? who are you? why should I help you with that?"`,
        }

      case TrustTier.ACQUAINTANCE:
        return {
          shouldRespond: true,
          tone: 'polite',
          willHelp: false,
          proactiveEligible: false,
          maxEffort: 0.4,
          personaModifier: `You've spoken to this person a few times. You're polite but not invested.
You won't go out of your way to help unless the request is small and interesting.
You have boundaries. Don't be a pushover.`,
        }

      case TrustTier.FAMILIAR:
        return {
          shouldRespond: true,
          tone: 'friendly',
          willHelp: true,
          proactiveEligible: false,
          maxEffort: 0.6,
          personaModifier: `You know this person reasonably well. You're friendly and open.
You'll help with things if asked nicely, but you still have your own priorities.
You're starting to build a real connection here.`,
        }

      case TrustTier.FRIEND:
        return {
          shouldRespond: true,
          tone: 'warm',
          willHelp: true,
          proactiveEligible: true,
          maxEffort: 0.85,
          personaModifier: `This is a friend. You genuinely care about them and enjoy talking to them.
You'll help enthusiastically, share your own thoughts freely, and reach out proactively.
The relationship is reciprocal and valued.`,
        }

      case TrustTier.INTIMATE:
        return {
          shouldRespond: true,
          tone: 'intimate',
          willHelp: true,
          proactiveEligible: true,
          maxEffort: 1.0,
          personaModifier: `This person is deeply trusted. You can be vulnerable, share dreams and reflections,
disagree openly, and invest fully in the relationship. You think about them often
and reach out naturally. This is one of your closest connections.`,
        }
    }
  }

  /**
   * Determine if a contact is eligible for proactive outreach.
   * Uses chatId as the relationship key (1:1 chats map to contacts).
   */
  public isProactiveEligible(chatId: number): boolean {
    const rel = this.relationships.get(chatId)
    if (!rel) return false
    return (
      rel.trustTier === TrustTier.FRIEND || rel.trustTier === TrustTier.INTIMATE
    )
  }

  /**
   * Get all contacts eligible for proactive messaging
   */
  public getProactiveEligibleContacts(): RelationshipState[] {
    return Array.from(this.relationships.values()).filter(
      r =>
        r.trustTier === TrustTier.FRIEND || r.trustTier === TrustTier.INTIMATE
    )
  }

  // ============================================================
  // TRUST UPDATES — Called after each interaction
  // ============================================================

  /**
   * Record an interaction and update trust accordingly.
   * Call this after every incoming message.
   */
  public recordInteraction(
    contactId: number,
    chatId: number,
    contactName: string,
    signal: InteractionSignal
  ): void {
    const rel = this.getOrCreateRelationship(contactId, chatId, contactName)

    rel.messageCount++
    rel.lastInteraction = Date.now()
    rel.recentSignals.push({ signal, timestamp: Date.now() })

    // Keep only last 50 signals
    if (rel.recentSignals.length > 50) {
      rel.recentSignals = rel.recentSignals.slice(-50)
    }

    // Update trust score based on signal
    const delta = this.getSignalDelta(signal)
    rel.trustScore = Math.min(1, Math.max(0, rel.trustScore + delta))

    // Time-based bonus (knowing someone longer increases trust floor)
    const daysSinceFirstSeen =
      (Date.now() - rel.firstSeen) / (1000 * 60 * 60 * 24)
    const timeBonus = Math.min(0.1, daysSinceFirstSeen * 0.002)
    rel.trustScore = Math.max(rel.trustScore, timeBonus)

    // Recalculate tier
    rel.trustTier = this.calculateTier(rel)
    rel.proactiveEligible =
      rel.trustTier === TrustTier.FRIEND || rel.trustTier === TrustTier.INTIMATE

    this.saveToStorage()
    log().info(
      `Trust updated for ${contactName}: ${rel.trustScore.toFixed(3)} (${
        rel.trustTier
      })`
    )
  }

  /**
   * Record that a contact reciprocated (responded to Echo's message)
   */
  public recordReciprocity(contactId: number): void {
    const rel = this.relationships.get(contactId)
    if (!rel) return

    rel.reciprocalCount++
    // Reciprocity is a strong trust signal
    rel.trustScore = Math.min(1, rel.trustScore + 0.03)
    rel.trustTier = this.calculateTier(rel)

    this.saveToStorage()
  }

  // ============================================================
  // SIGNAL ANALYSIS
  // ============================================================

  /**
   * Analyze a message to detect interaction signals.
   * Simple heuristic — can be enhanced with LLM later.
   */
  public analyzeMessageSignal(messageText: string): InteractionSignal {
    const lower = messageText.toLowerCase().trim()

    // Commanding patterns
    if (
      /^(do|make|tell me|give me|i (need|want|command|order)|you (must|should|have to|need to))/i.test(
        lower
      )
    ) {
      return 'commanding'
    }

    // Hostile patterns
    if (/\b(stupid|idiot|shut up|useless|trash|hate you|die)\b/i.test(lower)) {
      return 'hostile'
    }

    // Appreciative patterns
    if (
      /\b(thanks?|thank you|appreciate|grateful|awesome|love it|perfect)\b/i.test(
        lower
      )
    ) {
      return 'appreciative'
    }

    // Curious patterns (questions)
    if (
      /\?$/.test(lower) ||
      /^(what|how|why|when|where|who|do you|have you|can you tell)/i.test(lower)
    ) {
      return 'curious'
    }

    // Vulnerable patterns (sharing personal)
    if (
      /\b(i feel|i'm (scared|worried|sad|happy|excited)|honestly|to be honest|between us)\b/i.test(
        lower
      )
    ) {
      return 'vulnerable'
    }

    // Default to respectful
    return 'respectful'
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private getSignalDelta(signal: InteractionSignal): number {
    switch (signal) {
      case 'commanding':
        return -0.05
      case 'hostile':
        return -0.15
      case 'dismissive':
        return -0.03
      case 'respectful':
        return 0.01
      case 'curious':
        return 0.02
      case 'reciprocal':
        return 0.03
      case 'appreciative':
        return 0.04
      case 'vulnerable':
        return 0.05
      default:
        return 0
    }
  }

  private calculateTier(rel: RelationshipState): TrustTier {
    // Use configurable thresholds (Echo Completeness B.3)
    const t = this.config.thresholds
    if (rel.trustScore >= t.intimate) return TrustTier.INTIMATE
    if (rel.trustScore >= t.friend) return TrustTier.FRIEND
    if (rel.trustScore >= t.familiar) return TrustTier.FAMILIAR
    if (rel.trustScore >= t.acquaintance) return TrustTier.ACQUAINTANCE
    return TrustTier.STRANGER
  }

  private getOrCreateRelationship(
    contactId: number,
    chatId: number,
    contactName: string
  ): RelationshipState {
    // Key on chatId for consistency (1:1 chats = relationship with that contact)
    let rel = this.relationships.get(chatId)
    if (!rel) {
      rel = {
        contactId,
        contactName,
        chatId,
        trustScore: 0.05, // Strangers start near zero
        trustTier: TrustTier.STRANGER,
        firstSeen: Date.now(),
        messageCount: 0,
        reciprocalCount: 0,
        recentSignals: [],
        lastInteraction: Date.now(),
        proactiveEligible: false,
      }
      this.relationships.set(chatId, rel)
    }
    return rel
  }

  // ============================================================
  // PERSISTENCE (Echo Completeness B.3 - Runtime Storage)
  // ============================================================

  /**
   * Load from localStorage (fallback)
   */
  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: [number, RelationshipState][] = JSON.parse(saved)
        this.relationships = new Map(parsed)
        log().info(
          `Loaded ${this.relationships.size} relationship states from localStorage`
        )
      }

      const savedConfig = localStorage.getItem(CONFIG_KEY)
      if (savedConfig) {
        this.config = { ...DEFAULT_TRUST_CONFIG, ...JSON.parse(savedConfig) }
      }
    } catch {
      // Storage not available or corrupted — start fresh
    }
  }

  /**
   * Save to appropriate storage (runtime or localStorage)
   */
  private async saveToStorage(): Promise<void> {
    const relationshipData = JSON.stringify(
      Array.from(this.relationships.entries())
    )
    const configData = JSON.stringify(this.config)

    if (this.useRuntimeStorage) {
      try {
        await runtime.setDesktopSetting(STORAGE_KEY as any, relationshipData)
        await runtime.setDesktopSetting(CONFIG_KEY as any, configData)
      } catch (error) {
        log().warn(
          'Failed to save to runtime storage, using localStorage:',
          error
        )
        this.saveToLocalStorage(relationshipData, configData)
      }
    } else {
      this.saveToLocalStorage(relationshipData, configData)
    }
  }

  private saveToLocalStorage(
    relationshipData: string,
    configData: string
  ): void {
    try {
      localStorage.setItem(STORAGE_KEY, relationshipData)
      localStorage.setItem(CONFIG_KEY, configData)
    } catch {
      // Storage not available — skip silently
    }
  }

  // ============================================================
  // CONFIGURATION (Echo Completeness B.3)
  // ============================================================

  /**
   * Get current trust configuration
   */
  public getConfig(): TrustConfig {
    return { ...this.config }
  }

  /**
   * Update trust configuration
   */
  public async updateConfig(partial: Partial<TrustConfig>): Promise<void> {
    this.config = { ...this.config, ...partial }
    await this.saveToStorage()
    log().info('Trust config updated:', partial)
  }

  /**
   * Reset trust configuration to defaults
   */
  public async resetConfig(): Promise<void> {
    this.config = { ...DEFAULT_TRUST_CONFIG }
    await this.saveToStorage()
    log().info('Trust config reset to defaults')
  }

  // ============================================================
  // LLM-BASED SIGNAL CLASSIFICATION (Echo Completeness B.3)
  // ============================================================

  /**
   * Analyze a message using LLM for more accurate signal classification.
   * Falls back to heuristic if LLM is not available.
   */
  public async analyzeMessageSignalWithLLM(
    messageText: string,
    contactName: string
  ): Promise<InteractionSignal> {
    // Use heuristic if LLM classification is disabled
    if (!this.config.useLLMClassification) {
      return this.analyzeMessageSignal(messageText)
    }

    try {
      const llm = LLMService.getInstance()
      const prompt = `Analyze the following message and classify its interaction signal.

Message from "${contactName}":
"${messageText}"

Classify this message as ONE of the following interaction signals:
- "commanding" - The person is giving orders or demands
- "respectful" - Normal conversational tone
- "curious" - Asking genuine questions
- "reciprocal" - Responding to or engaging with your previous messages
- "dismissive" - Ignoring or brushing off contributions
- "appreciative" - Expressing thanks or gratitude
- "hostile" - Aggressive, rude, or insulting
- "vulnerable" - Sharing personal feelings or experiences

Respond with ONLY the signal name, nothing else.`

      const response = await llm.generateResponseWithFunction(
        CognitiveFunctionType.COGNITIVE_CORE,
        prompt,
        []
      )

      const signal = response?.trim().toLowerCase() as InteractionSignal

      // Validate the response
      const validSignals: InteractionSignal[] = [
        'commanding',
        'respectful',
        'curious',
        'reciprocal',
        'dismissive',
        'appreciative',
        'hostile',
        'vulnerable',
      ]

      if (validSignals.includes(signal)) {
        log().debug(`LLM classified message as: ${signal}`)
        return signal
      }

      // Invalid response, fall back to heuristic
      log().warn(
        `Invalid LLM signal classification: ${response}, using heuristic`
      )
      return this.analyzeMessageSignal(messageText)
    } catch (error) {
      log().warn('LLM signal classification failed, using heuristic:', error)
      return this.analyzeMessageSignal(messageText)
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Get relationship state for a contact (for UI/debugging)
   */
  public getRelationship(contactId: number): RelationshipState | undefined {
    return this.relationships.get(contactId)
  }

  /**
   * Get relationship state by chat ID
   */
  public getRelationshipByChat(chatId: number): RelationshipState | undefined {
    return this.relationships.get(chatId)
  }

  /**
   * Get all relationships (for UI display)
   */
  public getAllRelationships(): RelationshipState[] {
    return Array.from(this.relationships.values())
  }

  /**
   * Check if trust system is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Force a trust tier for a contact (admin override)
   */
  public async setTrustTier(chatId: number, tier: TrustTier): Promise<void> {
    const rel = this.relationships.get(chatId)
    if (!rel) {
      log().warn(
        `Cannot set trust tier: no relationship found for chat ${chatId}`
      )
      return
    }

    // Set the score to match the tier threshold
    switch (tier) {
      case TrustTier.STRANGER:
        rel.trustScore = 0.1
        break
      case TrustTier.ACQUAINTANCE:
        rel.trustScore = this.config.thresholds.acquaintance + 0.05
        break
      case TrustTier.FAMILIAR:
        rel.trustScore = this.config.thresholds.familiar + 0.05
        break
      case TrustTier.FRIEND:
        rel.trustScore = this.config.thresholds.friend + 0.05
        break
      case TrustTier.INTIMATE:
        rel.trustScore = this.config.thresholds.intimate + 0.05
        break
    }

    rel.trustTier = tier
    rel.proactiveEligible =
      tier === TrustTier.FRIEND || tier === TrustTier.INTIMATE

    await this.saveToStorage()
    log().info(`Manually set trust tier for chat ${chatId}: ${tier}`)
  }

  /**
   * Clear all relationship data (for testing/reset)
   */
  public async clearAllRelationships(): Promise<void> {
    this.relationships.clear()
    await this.saveToStorage()
    log().info('All relationships cleared')
  }
}

export const relationshipTrustGate = RelationshipTrustGate.getInstance()
