/**
 * Triadic Cognitive Engine
 *
 * Implements the 3-Phase Concurrent Cognitive Loop from the EchoBeats design.
 * Inspired by the Kawaii Hexapod's tripod gait - three parallel consciousness
 * streams running 4 steps out of phase, creating continuous cognitive flow.
 *
 * Architecture:
 * - 3 concurrent streams with 120° phase offsets
 * - 12-step cognitive cycle (3 phases × 4 steps)
 * - 7 Expressive : 5 Reflective step ratio
 * - Tensional couplings between cognitive functions
 */

import {
  StreamId,
  StreamConfig,
  StreamState,
  StepConfig,
  StepType,
  CognitiveTerm,
  CognitiveMode,
  CouplingType,
  TriadPoint,
  CognitiveContext,
  MessageProcess,
} from '../types/index.js'

/**
 * Stream configurations for the triadic system
 */
export const STREAM_CONFIGS: StreamConfig[] = [
  {
    id: StreamId.PRIMARY,
    name: 'Primary',
    phaseOffset: 0,
    startStep: 1,
  },
  {
    id: StreamId.SECONDARY,
    name: 'Secondary',
    phaseOffset: 120,
    startStep: 5,
  },
  {
    id: StreamId.TERTIARY,
    name: 'Tertiary',
    phaseOffset: 240,
    startStep: 9,
  },
]

/**
 * The 12-step cognitive loop configuration
 * Based on the triadic cognitive loop timing diagram
 */
export const STEP_CONFIGS: StepConfig[] = [
  // Time Point 0: TRIAD 1-5-9
  { stepNumber: 1, streamId: StreamId.PRIMARY, term: CognitiveTerm.T1_PERCEPTION, mode: CognitiveMode.REFLECTIVE, stepType: StepType.PIVOTAL_RR, phaseDegrees: 0 },
  { stepNumber: 5, streamId: StreamId.SECONDARY, term: CognitiveTerm.T1_PERCEPTION, mode: CognitiveMode.REFLECTIVE, stepType: StepType.PIVOTAL_RR, phaseDegrees: 120 },
  { stepNumber: 9, streamId: StreamId.TERTIARY, term: CognitiveTerm.T7_MEMORY_ENCODING, mode: CognitiveMode.REFLECTIVE, stepType: StepType.REFLECTIVE, phaseDegrees: 240 },

  // Time Point 1: TRIAD 2-6-10
  { stepNumber: 2, streamId: StreamId.PRIMARY, term: CognitiveTerm.T2_IDEA_FORMATION, mode: CognitiveMode.EXPRESSIVE, stepType: StepType.EXPRESSIVE, phaseDegrees: 30 },
  { stepNumber: 6, streamId: StreamId.SECONDARY, term: CognitiveTerm.T2_IDEA_FORMATION, mode: CognitiveMode.EXPRESSIVE, stepType: StepType.TRANSITION, phaseDegrees: 150 },
  { stepNumber: 10, streamId: StreamId.TERTIARY, term: CognitiveTerm.T5_ACTION_SEQUENCE, mode: CognitiveMode.EXPRESSIVE, stepType: StepType.REFLECTIVE, phaseDegrees: 270 },

  // Time Point 2: TRIAD 3-7-11
  { stepNumber: 3, streamId: StreamId.PRIMARY, term: CognitiveTerm.T4_SENSORY_INPUT, mode: CognitiveMode.EXPRESSIVE, stepType: StepType.EXPRESSIVE, phaseDegrees: 60 },
  { stepNumber: 7, streamId: StreamId.SECONDARY, term: CognitiveTerm.T1_PERCEPTION, mode: CognitiveMode.REFLECTIVE, stepType: StepType.TRANSITION, phaseDegrees: 180 },
  { stepNumber: 11, streamId: StreamId.TERTIARY, term: CognitiveTerm.T7_MEMORY_ENCODING, mode: CognitiveMode.REFLECTIVE, stepType: StepType.REFLECTIVE, phaseDegrees: 300 },

  // Time Point 3: TRIAD 4-8-12
  { stepNumber: 4, streamId: StreamId.PRIMARY, term: CognitiveTerm.T2_IDEA_FORMATION, mode: CognitiveMode.EXPRESSIVE, stepType: StepType.EXPRESSIVE, phaseDegrees: 90 },
  { stepNumber: 8, streamId: StreamId.SECONDARY, term: CognitiveTerm.T2_IDEA_FORMATION, mode: CognitiveMode.EXPRESSIVE, stepType: StepType.TRANSITION, phaseDegrees: 210 },
  { stepNumber: 12, streamId: StreamId.TERTIARY, term: CognitiveTerm.T5_ACTION_SEQUENCE, mode: CognitiveMode.EXPRESSIVE, stepType: StepType.REFLECTIVE, phaseDegrees: 330 },
]

/**
 * Triadic convergence points - where all 3 streams synchronize
 */
export const TRIAD_POINTS: TriadPoint[] = [
  { timePoint: 0, steps: [1, 5, 9], streams: [STREAM_CONFIGS[0], STREAM_CONFIGS[1], STREAM_CONFIGS[2]] },
  { timePoint: 1, steps: [2, 6, 10], streams: [STREAM_CONFIGS[0], STREAM_CONFIGS[1], STREAM_CONFIGS[2]] },
  { timePoint: 2, steps: [3, 7, 11], streams: [STREAM_CONFIGS[0], STREAM_CONFIGS[1], STREAM_CONFIGS[2]] },
  { timePoint: 3, steps: [4, 8, 12], streams: [STREAM_CONFIGS[0], STREAM_CONFIGS[1], STREAM_CONFIGS[2]] },
]

/**
 * Processor interface for cognitive functions
 */
export interface CognitiveProcessor {
  processT1Perception(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext>
  processT2IdeaFormation(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext>
  processT4SensoryInput(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext>
  processT5ActionSequence(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext>
  processT7MemoryEncoding(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext>
  processT8BalancedResponse(context: CognitiveContext, mode: CognitiveMode): Promise<CognitiveContext>
}

/**
 * Event handler for triadic engine events
 */
export type TriadicEventHandler = (event: TriadicEvent) => void

export type TriadicEvent =
  | { type: 'step_start'; step: StepConfig }
  | { type: 'step_complete'; step: StepConfig; duration: number }
  | { type: 'triad_sync'; triad: TriadPoint }
  | { type: 'coupling_active'; coupling: CouplingType; terms: CognitiveTerm[] }
  | { type: 'cycle_complete'; cycleNumber: number }

/**
 * TriadicCognitiveEngine
 *
 * The core cognitive processor implementing the 3-phase concurrent loop.
 * Each phase runs in parallel, synchronized by the step counter.
 */
export class TriadicCognitiveEngine {
  private streams: Map<StreamId, StreamState> = new Map()
  private currentStep: number = 0
  private cycleNumber: number = 0
  private running: boolean = false
  private stepDuration: number
  private processor: CognitiveProcessor
  private eventHandlers: TriadicEventHandler[] = []
  private stepTimer?: ReturnType<typeof setInterval>

  constructor(processor: CognitiveProcessor, stepDuration: number = 100) {
    this.processor = processor
    this.stepDuration = stepDuration
    this.initializeStreams()
  }

  /**
   * Initialize all three cognitive streams
   */
  private initializeStreams(): void {
    for (const config of STREAM_CONFIGS) {
      this.streams.set(config.id, {
        id: config.id,
        currentTerm: CognitiveTerm.T1_PERCEPTION,
        mode: CognitiveMode.REFLECTIVE,
        stepInCycle: 0,
        isActive: false,
      })
    }
  }

  /**
   * Start the triadic engine
   */
  public start(): void {
    if (this.running) return

    this.running = true
    this.stepTimer = setInterval(() => this.advanceStep(), this.stepDuration)

    // Activate all streams
    for (const stream of this.streams.values()) {
      stream.isActive = true
    }
  }

  /**
   * Stop the triadic engine
   */
  public stop(): void {
    if (!this.running) return

    this.running = false
    if (this.stepTimer) {
      clearInterval(this.stepTimer)
      this.stepTimer = undefined
    }

    // Deactivate all streams
    for (const stream of this.streams.values()) {
      stream.isActive = false
    }
  }

  /**
   * Advance to the next step in the cognitive cycle
   */
  private advanceStep(): void {
    this.currentStep = (this.currentStep % 12) + 1

    // Check for cycle completion
    if (this.currentStep === 1) {
      this.cycleNumber++
      this.emit({ type: 'cycle_complete', cycleNumber: this.cycleNumber })
    }

    // Check for triadic convergence
    const triad = this.getTriadAtStep(this.currentStep)
    if (triad) {
      this.emit({ type: 'triad_sync', triad })
    }

    // Detect and activate couplings
    const couplings = this.detectCouplings(this.currentStep)
    for (const coupling of couplings) {
      this.emit({
        type: 'coupling_active',
        coupling: coupling.type,
        terms: coupling.terms,
      })
    }
  }

  /**
   * Process a message through the cognitive loop
   */
  public async processMessage(process: MessageProcess): Promise<CognitiveContext> {
    let context = process.cognitiveContext

    // Get the active step configurations for current step
    const activeSteps = this.getActiveStepsForTimePoint(this.currentStep)

    // Process through each active stream in parallel
    const results = await Promise.all(
      activeSteps.map(async (step) => {
        this.emit({ type: 'step_start', step })
        const startTime = Date.now()

        const result = await this.executeStep(step, context)

        const duration = Date.now() - startTime
        this.emit({ type: 'step_complete', step, duration })

        return result
      })
    )

    // Integrate results from parallel streams
    context = this.integrateStreamResults(context, results)

    return context
  }

  /**
   * Execute a single cognitive step
   */
  private async executeStep(step: StepConfig, context: CognitiveContext): Promise<CognitiveContext> {
    const stream = this.streams.get(step.streamId)!
    stream.currentTerm = step.term
    stream.mode = step.mode
    stream.lastProcessed = new Date()

    switch (step.term) {
      case CognitiveTerm.T1_PERCEPTION:
        return this.processor.processT1Perception(context, step.mode)
      case CognitiveTerm.T2_IDEA_FORMATION:
        return this.processor.processT2IdeaFormation(context, step.mode)
      case CognitiveTerm.T4_SENSORY_INPUT:
        return this.processor.processT4SensoryInput(context, step.mode)
      case CognitiveTerm.T5_ACTION_SEQUENCE:
        return this.processor.processT5ActionSequence(context, step.mode)
      case CognitiveTerm.T7_MEMORY_ENCODING:
        return this.processor.processT7MemoryEncoding(context, step.mode)
      case CognitiveTerm.T8_BALANCED_RESPONSE:
        return this.processor.processT8BalancedResponse(context, step.mode)
      default:
        return context
    }
  }

  /**
   * Get the triadic convergence point at a given step, if any
   */
  private getTriadAtStep(step: number): TriadPoint | null {
    for (const triad of TRIAD_POINTS) {
      if (triad.steps.includes(step)) {
        return triad
      }
    }
    return null
  }

  /**
   * Get active step configurations for the current time point
   */
  private getActiveStepsForTimePoint(step: number): StepConfig[] {
    // Find the triad containing this step
    const triad = this.getTriadAtStep(step)
    if (!triad) {
      // Return just the single step
      return STEP_CONFIGS.filter(s => s.stepNumber === step)
    }

    // Return all steps in the triad
    return STEP_CONFIGS.filter(s => triad.steps.includes(s.stepNumber))
  }

  /**
   * Detect active tensional couplings at a given step
   */
  private detectCouplings(step: number): Array<{ type: CouplingType; terms: CognitiveTerm[] }> {
    const couplings: Array<{ type: CouplingType; terms: CognitiveTerm[] }> = []
    const activeSteps = this.getActiveStepsForTimePoint(step)

    const hasTermMode = (term: CognitiveTerm, mode: CognitiveMode): boolean =>
      activeSteps.some(s => s.term === term && s.mode === mode)

    // T4E <-> T7R: Perception-Memory Coupling
    if (
      hasTermMode(CognitiveTerm.T4_SENSORY_INPUT, CognitiveMode.EXPRESSIVE) &&
      hasTermMode(CognitiveTerm.T7_MEMORY_ENCODING, CognitiveMode.REFLECTIVE)
    ) {
      couplings.push({
        type: CouplingType.PERCEPTION_MEMORY,
        terms: [CognitiveTerm.T4_SENSORY_INPUT, CognitiveTerm.T7_MEMORY_ENCODING],
      })
    }

    // T1R <-> T2E: Assessment-Planning Coupling
    if (
      hasTermMode(CognitiveTerm.T1_PERCEPTION, CognitiveMode.REFLECTIVE) &&
      hasTermMode(CognitiveTerm.T2_IDEA_FORMATION, CognitiveMode.EXPRESSIVE)
    ) {
      couplings.push({
        type: CouplingType.ASSESSMENT_PLANNING,
        terms: [CognitiveTerm.T1_PERCEPTION, CognitiveTerm.T2_IDEA_FORMATION],
      })
    }

    // T8E: Balanced Integration
    if (hasTermMode(CognitiveTerm.T8_BALANCED_RESPONSE, CognitiveMode.EXPRESSIVE)) {
      couplings.push({
        type: CouplingType.BALANCED_INTEGRATION,
        terms: [CognitiveTerm.T8_BALANCED_RESPONSE],
      })
    }

    return couplings
  }

  /**
   * Integrate results from parallel stream processing
   */
  private integrateStreamResults(
    baseContext: CognitiveContext,
    results: CognitiveContext[]
  ): CognitiveContext {
    // Merge all results into a unified context
    const integrated: CognitiveContext = {
      ...baseContext,
      relevantMemories: [...new Set(results.flatMap(r => r.relevantMemories))],
      emotionalValence: results.reduce((sum, r) => sum + r.emotionalValence, 0) / results.length,
      emotionalArousal: results.reduce((sum, r) => sum + r.emotionalArousal, 0) / results.length,
      salienceScore: Math.max(...results.map(r => r.salienceScore)),
      attentionWeight: results.reduce((sum, r) => sum + r.attentionWeight, 0) / results.length,
      activeCouplings: [...new Set(results.flatMap(r => r.activeCouplings))],
    }

    // Merge perception data
    if (results.some(r => r.perceptionData)) {
      integrated.perceptionData = results
        .filter(r => r.perceptionData)
        .map(r => r.perceptionData)
    }

    // Merge thought data
    if (results.some(r => r.thoughtData)) {
      integrated.thoughtData = results
        .filter(r => r.thoughtData)
        .map(r => r.thoughtData)
    }

    // Merge action plans
    if (results.some(r => r.actionPlan)) {
      integrated.actionPlan = results
        .filter(r => r.actionPlan)
        .reduce((merged, r) => ({ ...merged, ...r.actionPlan }), {})
    }

    return integrated
  }

  /**
   * Add event handler
   */
  public on(handler: TriadicEventHandler): void {
    this.eventHandlers.push(handler)
  }

  /**
   * Emit event to all handlers
   */
  private emit(event: TriadicEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event)
    }
  }

  /**
   * Get current state
   */
  public getState(): {
    currentStep: number
    cycleNumber: number
    streams: Map<StreamId, StreamState>
    running: boolean
  } {
    return {
      currentStep: this.currentStep,
      cycleNumber: this.cycleNumber,
      streams: new Map(this.streams),
      running: this.running,
    }
  }

  /**
   * Get metrics
   */
  public getMetrics(): {
    totalCycles: number
    currentStep: number
    streamStates: StreamState[]
  } {
    return {
      totalCycles: this.cycleNumber,
      currentStep: this.currentStep,
      streamStates: Array.from(this.streams.values()),
    }
  }
}
