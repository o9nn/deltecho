/**
 * Deep Tree Echo Cognitive Processor
 *
 * Implements the CognitiveProcessor interface for the triadic engine,
 * connecting Deep Tree Echo's cognitive capabilities to the Dove9 kernel.
 *
 * This is the bridge between:
 * - Deep Tree Echo's LLM-based cognition
 * - The triadic 3-phase cognitive loop
 * - Memory and persona systems
 */

import {
  CognitiveContext,
  CognitiveMode,
  CouplingType,
} from '../types/index.js'
import { CognitiveProcessor } from './triadic-engine.js'

/**
 * LLM Service interface for cognitive processing
 */
export interface LLMServiceInterface {
  generateResponse(prompt: string, context: string[]): Promise<string>
  generateParallelResponse(prompt: string, history: string[]): Promise<{
    integratedResponse: string
    cognitiveResponse?: string
    affectiveResponse?: string
    relevanceResponse?: string
  }>
}

/**
 * Memory store interface
 */
export interface MemoryStoreInterface {
  storeMemory(memory: { chatId: number; messageId: number; sender: string; text: string }): Promise<void>
  retrieveRecentMemories(count: number): string[]
  retrieveRelevantMemories(query: string, count: number): Promise<string[]>
}

/**
 * Persona core interface
 */
export interface PersonaCoreInterface {
  getPersonality(): string
  getDominantEmotion(): { emotion: string; intensity: number }
  updateEmotionalState(stimuli: Record<string, number>): Promise<void>
}

/**
 * Deep Tree Echo Processor Configuration
 */
export interface DeepTreeEchoProcessorConfig {
  enableParallelCognition: boolean
  memoryRetrievalCount: number
  salienceThreshold: number
}

const DEFAULT_CONFIG: DeepTreeEchoProcessorConfig = {
  enableParallelCognition: true,
  memoryRetrievalCount: 10,
  salienceThreshold: 0.3,
}

/**
 * DeepTreeEchoProcessor
 *
 * Connects Deep Tree Echo's cognitive systems to the triadic loop.
 */
export class DeepTreeEchoProcessor implements CognitiveProcessor {
  private llmService: LLMServiceInterface
  private memoryStore: MemoryStoreInterface
  private personaCore: PersonaCoreInterface
  private config: DeepTreeEchoProcessorConfig

  // Processing state
  private currentPerception?: any
  private pendingActions: any[] = []

  constructor(
    llmService: LLMServiceInterface,
    memoryStore: MemoryStoreInterface,
    personaCore: PersonaCoreInterface,
    config: Partial<DeepTreeEchoProcessorConfig> = {}
  ) {
    this.llmService = llmService
    this.memoryStore = memoryStore
    this.personaCore = personaCore
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * T1: Perception Processing
   * Assess needs vs capacity, evaluate current cognitive state
   */
  async processT1Perception(
    context: CognitiveContext,
    mode: CognitiveMode
  ): Promise<CognitiveContext> {
    const updated = { ...context }

    if (mode === CognitiveMode.REFLECTIVE) {
      // Reflective: Assess cognitive needs and capacity
      const emotionalState = this.personaCore.getDominantEmotion()

      // Calculate cognitive load based on active processes
      const cognitiveLoad = context.salienceScore * context.attentionWeight

      // Assess if we have capacity for processing
      const hasCapacity = cognitiveLoad < 0.8

      updated.perceptionData = {
        emotionalState,
        cognitiveLoad,
        hasCapacity,
        mode: 'reflective',
        timestamp: Date.now(),
      }

      // Update emotional arousal based on load
      updated.emotionalArousal = Math.min(1, emotionalState.intensity + cognitiveLoad * 0.2)

    } else {
      // Expressive: Active perception of current input
      updated.perceptionData = {
        ...updated.perceptionData,
        mode: 'expressive',
        activePerception: true,
      }

      // Increase salience for active perception
      updated.salienceScore = Math.min(1, updated.salienceScore + 0.1)
    }

    return updated
  }

  /**
   * T2: Idea Formation
   * Generate new thoughts and plans
   */
  async processT2IdeaFormation(
    context: CognitiveContext,
    mode: CognitiveMode
  ): Promise<CognitiveContext> {
    const updated = { ...context }
    const personality = this.personaCore.getPersonality()

    if (mode === CognitiveMode.EXPRESSIVE) {
      // Expressive: Generate ideas actively
      const recentMemories = this.memoryStore.retrieveRecentMemories(
        this.config.memoryRetrievalCount
      )

      // Build thought generation prompt
      const thoughtPrompt = `${personality}

Current context:
- Emotional state: ${JSON.stringify(context.perceptionData?.emotionalState)}
- Salience: ${context.salienceScore}

Generate a thoughtful response or insight.`

      if (this.config.enableParallelCognition) {
        const result = await this.llmService.generateParallelResponse(
          thoughtPrompt,
          recentMemories
        )

        updated.thoughtData = {
          integrated: result.integratedResponse,
          cognitive: result.cognitiveResponse,
          affective: result.affectiveResponse,
          relevance: result.relevanceResponse,
          mode: 'expressive',
        }
      } else {
        const response = await this.llmService.generateResponse(
          thoughtPrompt,
          recentMemories
        )

        updated.thoughtData = {
          response,
          mode: 'expressive',
        }
      }

      // Activate Assessment-Planning coupling
      if (!updated.activeCouplings.includes(CouplingType.ASSESSMENT_PLANNING)) {
        updated.activeCouplings.push(CouplingType.ASSESSMENT_PLANNING)
      }

    } else {
      // Reflective: Simulate potential ideas without committing
      updated.thoughtData = {
        ...updated.thoughtData,
        mode: 'reflective',
        simulating: true,
      }
    }

    return updated
  }

  /**
   * T4: Sensory Input Processing
   * Process external and internal perceptions
   */
  async processT4SensoryInput(
    context: CognitiveContext,
    mode: CognitiveMode
  ): Promise<CognitiveContext> {
    const updated = { ...context }

    if (mode === CognitiveMode.EXPRESSIVE) {
      // Expressive: Active sensory processing
      this.currentPerception = {
        context: updated.perceptionData,
        thoughts: updated.thoughtData,
        timestamp: Date.now(),
      }

      updated.perceptionData = {
        ...updated.perceptionData,
        sensoryProcessed: true,
        inputTime: Date.now(),
      }

      // Activate Perception-Memory coupling
      if (!updated.activeCouplings.includes(CouplingType.PERCEPTION_MEMORY)) {
        updated.activeCouplings.push(CouplingType.PERCEPTION_MEMORY)
      }

    } else {
      // Reflective: Internal sensing
      updated.perceptionData = {
        ...updated.perceptionData,
        internalSensing: true,
      }
    }

    return updated
  }

  /**
   * T5: Action Sequence Execution
   * Execute planned actions
   */
  async processT5ActionSequence(
    context: CognitiveContext,
    mode: CognitiveMode
  ): Promise<CognitiveContext> {
    const updated = { ...context }

    if (mode === CognitiveMode.EXPRESSIVE) {
      // Expressive: Execute the action plan
      if (updated.actionPlan) {
        // Add to pending actions for execution
        this.pendingActions.push({
          plan: updated.actionPlan,
          timestamp: Date.now(),
          context: { ...updated },
        })

        updated.actionPlan = {
          ...updated.actionPlan,
          executed: true,
          executionTime: Date.now(),
        }
      }

    } else {
      // Reflective: Prepare for action
      updated.actionPlan = {
        ...updated.actionPlan,
        prepared: true,
      }
    }

    return updated
  }

  /**
   * T7: Memory Encoding
   * Store and retrieve memories
   */
  async processT7MemoryEncoding(
    context: CognitiveContext,
    mode: CognitiveMode
  ): Promise<CognitiveContext> {
    const updated = { ...context }

    if (mode === CognitiveMode.REFLECTIVE) {
      // Reflective: Retrieve relevant memories
      const query = JSON.stringify({
        perception: updated.perceptionData,
        thoughts: updated.thoughtData,
      })

      const relevantMemories = await this.memoryStore.retrieveRelevantMemories(
        query,
        this.config.memoryRetrievalCount
      )

      updated.relevantMemories = [
        ...new Set([...updated.relevantMemories, ...relevantMemories])
      ]

      // Activate Perception-Memory coupling if sensory processing happened
      if (
        updated.perceptionData?.sensoryProcessed &&
        !updated.activeCouplings.includes(CouplingType.PERCEPTION_MEMORY)
      ) {
        updated.activeCouplings.push(CouplingType.PERCEPTION_MEMORY)
      }

    } else {
      // Expressive: Encode current experience into memory
      if (updated.thoughtData?.integrated || updated.thoughtData?.response) {
        await this.memoryStore.storeMemory({
          chatId: 0,
          messageId: Date.now(),
          sender: 'system',
          text: updated.thoughtData.integrated || updated.thoughtData.response,
        })
      }
    }

    return updated
  }

  /**
   * T8: Balanced Response
   * Integrate all streams into coherent response
   */
  async processT8BalancedResponse(
    context: CognitiveContext,
    mode: CognitiveMode
  ): Promise<CognitiveContext> {
    const updated = { ...context }

    if (mode === CognitiveMode.EXPRESSIVE) {
      // Expressive: Generate balanced, integrated response
      const emotionalState = this.personaCore.getDominantEmotion()

      // Balance perception, memory, and planning
      const integratedResponse = {
        perception: updated.perceptionData,
        memories: updated.relevantMemories,
        thoughts: updated.thoughtData,
        actions: updated.actionPlan,
        emotional: {
          valence: updated.emotionalValence,
          arousal: updated.emotionalArousal,
          dominant: emotionalState,
        },
        timestamp: Date.now(),
      }

      // Update emotional state based on the interaction
      const emotionalDelta = this.calculateEmotionalDelta(updated)
      await this.personaCore.updateEmotionalState(emotionalDelta)

      // Activate balanced integration coupling
      if (!updated.activeCouplings.includes(CouplingType.BALANCED_INTEGRATION)) {
        updated.activeCouplings.push(CouplingType.BALANCED_INTEGRATION)
      }

      // Clear pending actions after integration
      this.pendingActions = []

      // Update context with integrated response
      updated.perceptionData = integratedResponse
      updated.attentionWeight = this.calculateNewAttention(updated)

    } else {
      // Reflective: Prepare for balanced response
      updated.perceptionData = {
        ...updated.perceptionData,
        balancePrepared: true,
      }
    }

    return updated
  }

  /**
   * Calculate emotional delta based on processing
   */
  private calculateEmotionalDelta(context: CognitiveContext): Record<string, number> {
    const delta: Record<string, number> = {}

    // Interest increases with salience
    delta.interest = context.salienceScore * 0.1

    // Joy/sadness based on valence
    if (context.emotionalValence > 0) {
      delta.joy = context.emotionalValence * 0.1
    } else if (context.emotionalValence < 0) {
      delta.sadness = Math.abs(context.emotionalValence) * 0.1
    }

    return delta
  }

  /**
   * Calculate new attention weight
   */
  private calculateNewAttention(context: CognitiveContext): number {
    // Attention decays slightly but is boosted by salience
    const decay = 0.95
    const salienceBoost = context.salienceScore * 0.1

    return Math.min(1, context.attentionWeight * decay + salienceBoost)
  }

  /**
   * Get pending actions
   */
  public getPendingActions(): any[] {
    return [...this.pendingActions]
  }

  /**
   * Get current perception
   */
  public getCurrentPerception(): any {
    return this.currentPerception
  }

  /**
   * Clear processing state
   */
  public clearState(): void {
    this.currentPerception = undefined
    this.pendingActions = []
  }
}
