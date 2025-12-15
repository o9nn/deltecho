/**
 * Integration utilities for connecting cognitive subsystems
 */

import type {
  UnifiedMessage,
  UnifiedCognitiveState,
  DeepTreeEchoBotConfig,
  CognitiveEvent
} from '../types/index.js'

/**
 * CognitiveOrchestrator - Unified interface for all cognitive operations
 *
 * This class provides a single entry point for all cognitive functionality,
 * coordinating between LLM services, memory systems, personality management,
 * and the triadic cognitive loop.
 */
export class CognitiveOrchestrator {
  private config: DeepTreeEchoBotConfig
  private state: UnifiedCognitiveState | null = null
  private eventListeners: Map<string, Array<(event: CognitiveEvent) => void>> = new Map()

  constructor(config: DeepTreeEchoBotConfig) {
    this.config = config
  }

  /**
   * Initialize all cognitive subsystems
   */
  async initialize(): Promise<void> {
    // Initialize state with defaults
    this.state = {
      persona: {
        name: 'Deep Tree Echo',
        traits: ['helpful', 'curious', 'thoughtful'],
        currentMood: 'neutral',
        interactionStyle: 'casual',
        lastUpdated: Date.now()
      },
      memories: {
        shortTerm: [],
        longTerm: {
          episodic: 0,
          semantic: 0,
          procedural: 0
        },
        reflections: []
      },
      reasoning: {
        atomspaceSize: 0,
        activeGoals: [],
        attentionFocus: [],
        confidenceLevel: 0.5
      },
      // CognitiveState from dove9
      currentPhase: 'sense',
      phaseHistory: [],
      processingQueue: [],
      activeThreads: new Map()
    }
  }

  /**
   * Process an incoming message through the cognitive pipeline
   */
  async processMessage(message: UnifiedMessage): Promise<UnifiedMessage> {
    this.emit({ type: 'message_received', payload: message })

    // The triadic loop: sense -> process -> act
    const sensed = await this.sense(message)
    const processed = await this.process(sensed)
    const response = await this.act(processed)

    this.emit({ type: 'response_generated', payload: response })
    return response
  }

  /**
   * Sense phase - perceive and encode input
   */
  private async sense(message: UnifiedMessage): Promise<UnifiedMessage> {
    return { ...message, metadata: { ...message.metadata, cognitivePhase: 'sense' } }
  }

  /**
   * Process phase - reason and deliberate
   */
  private async process(message: UnifiedMessage): Promise<UnifiedMessage> {
    return { ...message, metadata: { ...message.metadata, cognitivePhase: 'process' } }
  }

  /**
   * Act phase - generate response
   */
  private async act(message: UnifiedMessage): Promise<UnifiedMessage> {
    const response: UnifiedMessage = {
      id: `response-${Date.now()}`,
      content: 'Response placeholder - implement with LLM service',
      role: 'assistant',
      timestamp: Date.now(),
      metadata: { ...message.metadata, cognitivePhase: 'act' }
    }
    return response
  }

  /**
   * Get current cognitive state
   */
  getState(): UnifiedCognitiveState | null {
    return this.state
  }

  /**
   * Subscribe to cognitive events
   */
  on(type: CognitiveEvent['type'], listener: (event: CognitiveEvent) => void): void {
    const listeners = this.eventListeners.get(type) || []
    listeners.push(listener)
    this.eventListeners.set(type, listeners)
  }

  /**
   * Emit a cognitive event
   */
  private emit(event: CognitiveEvent): void {
    const listeners = this.eventListeners.get(event.type) || []
    listeners.forEach(listener => listener(event))
  }
}

/**
 * Factory function for creating a configured orchestrator
 */
export function createCognitiveOrchestrator(
  config: DeepTreeEchoBotConfig
): CognitiveOrchestrator {
  return new CognitiveOrchestrator(config)
}
