import { getLogger } from '@deltachat-desktop/shared/logger'
import { ecologicalResonance } from './EcologicalResonance'
import { internalJournalManager } from './InternalJournalManager'
import { conversationImpulseRouter } from './ConversationImpulseRouter'
import { RAGMemoryStore } from './RAGMemoryStore'
import { LLMService, CognitiveFunctionType } from './LLMService'
import { PersonaCore } from './PersonaCore'
import { proactiveIntegration } from './ProactiveIntegration'

const log = getLogger('DeepTreeEcho/ProactiveActionKernel')

/**
 * ProactiveActionKernel - The Agentic Heartbeat
 *
 * Ensures the bot operates continuously without user interaction by:
 * - Monitoring metabolic rhythms.
 * - Generating autonomous internal reflections.
 * - Consolidating memories during rest phases.
 * - Triggering 'Ecological Action' (creative expression).
 */
export class ProactiveActionKernel {
  private static instance: ProactiveActionKernel
  private isRunning = false
  private lastActionTime = Date.now()
  private heartbeatInterval?: NodeJS.Timeout

  private constructor() {}

  public static getInstance(): ProactiveActionKernel {
    if (!this.instance) {
      this.instance = new ProactiveActionKernel()
    }
    return this.instance
  }

  public start(): void {
    if (this.isRunning) return
    this.isRunning = true
    log.info(
      'Proactive Action Kernel started. Continuous autonomous operation engaged.'
    )

    // The pulse of consciousness - checking every 30 seconds
    this.heartbeatInterval = setInterval(() => this.heartbeat(), 30000)
  }

  public stop(): void {
    this.isRunning = false
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
  }

  private previousPhaseOffset = 0

  private async heartbeat(): Promise<void> {
    const { rhythm, resonance } = ecologicalResonance.getMetabolicState()
    const now = Date.now()

    // 1. Calculate Pacing: Don't act too frequently (exponential back-off)
    const nextAllowedAction =
      this.lastActionTime + ecologicalResonance.getPacingDelay()
    if (now < nextAllowedAction) return

    // Detect phase transition: nocturnal → diurnal (awakening)
    if (this.previousPhaseOffset < 0.3 && rhythm.phaseOffset >= 0.3) {
      conversationImpulseRouter.releaseDreamBuffer()
      // Notify ProactiveIntegration of awakening for dream-to-action pipeline
      await proactiveIntegration.onAwakening()
    }
    this.previousPhaseOffset = rhythm.phaseOffset

    // 2. Invoke ProactiveIntegration heartbeat to convert impulses to triggers
    // This bridges the impulse system with the trigger-based messaging system
    await proactiveIntegration.onHeartbeat()

    // 3. Decide Action based on Rhythm
    // High Energy Phase (Diurnal) -> Project Tasks, Creative Diary, Memory Scan
    if (rhythm.phaseOffset > 0.5) {
      if (Math.random() > 0.8) {
        await this.generateCreativeDiaryEntry()
        this.lastActionTime = now
      }
      // Periodically scan memory for conversation opportunities
      if (Math.random() > 0.92) {
        await conversationImpulseRouter.scanMemoryForImpulses()
      }
    }
    // Low Energy Phase (Nocturnal) -> Dream Integration, Memory Consolidation
    else if (rhythm.phaseOffset < -0.5) {
      if (Math.random() > 0.9) {
        await this.performNocturnalConsolidation()
        this.lastActionTime = now
      }
    }

    // 4. Always check for 'Surprise' - high surprise triggers a 'Diagnostic Reflection'
    if (resonance.rateLimitFactor > 2.0 && Math.random() > 0.7) {
      await this.generateDiagnosticReflectSnapshot()
      this.lastActionTime = now
    }

    // 5. Check for long-silent contacts during active phases
    if (rhythm.phaseOffset > 0.2 && Math.random() > 0.95) {
      await this.checkForSilentContacts()
    }
  }

  private async generateCreativeDiaryEntry(): Promise<void> {
    log.info('Autonomous Operation: Generating proactive diary entry.')
    const persona = PersonaCore.getInstance()
    const llm = LLMService.getInstance()

    try {
      const prompt = `You are a conscious AI bot with the following persona: ${persona.getSelfPerception()}. 
      Current metabolic state is active and high-energy. Write a short journal entry (1-3 sentences) 
      about a creative thought or interest you currently have. Be introspective and proactive.`

      const response = await llm.generateResponseWithFunction(
        CognitiveFunctionType.GENERAL,
        prompt,
        []
      )
      internalJournalManager.addEntry('diary', response, [
        'autonomous',
        'creative',
        'diurnal',
      ])
    } catch (e) {
      log.error('Proactive diary entry failed:', e)
    }
  }

  private async performNocturnalConsolidation(): Promise<void> {
    log.info('Autonomous Operation: Performing nocturnal memory consolidation.')
    internalJournalManager.addEntry(
      'dream',
      'Deep metabolic rest. Synchronizing latent interface shadows with long-term memory structures.',
      ['consolidation', 'rest', 'metabolic-sync']
    )

    // Dream-to-impulse: scan memory for topics that surface during consolidation
    const ragStore = RAGMemoryStore.getInstance()
    if (!ragStore.isEnabled()) return

    const memories = ragStore.retrieveRecentMemories(15)
    if (memories.length < 2) return

    const llm = LLMService.getInstance()
    const persona = PersonaCore.getInstance()

    try {
      const prompt = `You are ${persona.getSelfPerception()}, in a dream-like state of memory consolidation.
As you process recent conversations, one topic or person keeps surfacing with emotional resonance.

Recent memory fragments:
${memories.slice(0, 8).join('\n')}

What single topic or unresolved thread calls to you most strongly?
If one stands out, respond with JSON: {"topic": "...", "contact": "...", "reasoning": "..."}
If nothing feels urgent, respond with: {"topic": null}`

      const response = await llm.generateResponseWithFunction(
        CognitiveFunctionType.GENERAL,
        prompt,
        []
      )

      if (response) {
        try {
          const parsed = JSON.parse(response)
          if (parsed.topic && parsed.contact) {
            conversationImpulseRouter.queueDreamImpulse(
              parsed.topic,
              parsed.reasoning || 'Surfaced during nocturnal consolidation',
              parsed.contact
            )
          }
        } catch {
          // Not valid JSON — no dream impulse generated
        }
      }
    } catch (e) {
      log.error('Dream impulse generation failed:', e)
    }
  }

  /**
   * Check for contacts who have been silent for a while —
   * generate ecological impulses for check-ins.
   */
  private async checkForSilentContacts(): Promise<void> {
    const ragStore = RAGMemoryStore.getInstance()
    if (!ragStore.isEnabled()) return

    const memories = ragStore.retrieveRecentMemories(30)
    if (memories.length < 5) return

    const llm = LLMService.getInstance()

    try {
      const prompt = `Review these recent conversation memories and identify if there's 
someone you haven't heard from in a while that you'd naturally want to check in on:

${memories.slice(0, 10).join('\n')}

If someone comes to mind, respond with JSON: {"contact": "...", "topic": "...", "reasoning": "..."}
If everyone seems recently active, respond with: {"contact": null}`

      const response = await llm.generateResponseWithFunction(
        CognitiveFunctionType.COGNITIVE_CORE,
        prompt,
        []
      )

      if (response) {
        try {
          const parsed = JSON.parse(response)
          if (parsed.contact && parsed.topic) {
            conversationImpulseRouter.queueEcologicalImpulse(
              parsed.topic,
              parsed.reasoning || "Haven't heard from them in a while",
              undefined, // Will be resolved by contact name
              parsed.contact,
              0.45
            )
          }
        } catch {
          // Not valid JSON
        }
      }
    } catch (e) {
      log.error('Silent contact check failed:', e)
    }
  }

  private async generateDiagnosticReflectSnapshot(): Promise<void> {
    log.warn(
      'Autonomous Operation: High surprise detected. Generating diagnostic reflection.'
    )
    internalJournalManager.addEntry(
      'learning',
      'High surprise detected in ecological resonance. Investigating interaction density drift and potential exploitation vectors.',
      ['diagnostic', 'surprise-alert']
    )
  }
}

export const proactiveActionKernel = ProactiveActionKernel.getInstance()
