/**
 * Dove9 Core Types
 *
 * "Everything is a chatbot" - The fundamental types for the Dove9 paradigm
 * where the mail server acts as a cognitive CPU and messages are process threads.
 */

/**
 * Cognitive modes based on the triadic architecture
 */
export enum CognitiveMode {
  EXPRESSIVE = 'expressive',   // Reactive, action-oriented (feedforward)
  REFLECTIVE = 'reflective',   // Anticipatory, simulation-oriented (feedback)
}

/**
 * Stream identity in the triadic system
 */
export enum StreamId {
  PRIMARY = 0,    // Starts at Step 1, 0° phase offset
  SECONDARY = 1,  // Starts at Step 5, +120° phase offset
  TERTIARY = 2,   // Starts at Step 9, +240° phase offset
}

/**
 * Cognitive function types mapped from System 4
 */
export enum CognitiveTerm {
  T1_PERCEPTION = 1,          // Need vs Capacity assessment
  T2_IDEA_FORMATION = 2,      // Thought generation
  T4_SENSORY_INPUT = 4,       // Perception processing
  T5_ACTION_SEQUENCE = 5,     // Action execution
  T7_MEMORY_ENCODING = 7,     // Memory consolidation
  T8_BALANCED_RESPONSE = 8,   // Integrated response
}

/**
 * Step types from the triadic cognitive loop diagram
 */
export enum StepType {
  PIVOTAL_RR = 'pivotal_rr',           // Pivotal Relevance Realization
  EXPRESSIVE = 'expressive',            // Expressive processing
  TRANSITION = 'transition',            // Transition state
  REFLECTIVE = 'reflective',            // Reflective processing
}

/**
 * A single step configuration in the 12-step cognitive loop
 */
export interface StepConfig {
  stepNumber: number
  streamId: StreamId
  term: CognitiveTerm
  mode: CognitiveMode
  stepType: StepType
  phaseDegrees: number  // 0°, 30°, 60°... up to 330°
}

/**
 * Configuration for a cognitive stream
 */
export interface StreamConfig {
  id: StreamId
  name: string
  phaseOffset: number  // In degrees (0, 120, 240)
  startStep: number    // Step where this stream begins (1, 5, 9)
}

/**
 * A triadic convergence point where all 3 streams synchronize
 */
export interface TriadPoint {
  timePoint: number    // 0, 1, 2, 3
  steps: [number, number, number]  // The three steps that converge
  streams: [StreamConfig, StreamConfig, StreamConfig]
}

/**
 * Message as a process thread in the Dove9 paradigm
 */
export interface MessageProcess {
  id: string
  messageId: string
  from: string
  to: string[]
  subject: string
  content: string

  // Process state
  state: ProcessState
  priority: number
  createdAt: Date

  // Cognitive context
  currentStep: number
  currentStream: StreamId
  cognitiveContext: CognitiveContext

  // Thread relationships
  parentId?: string
  childIds: string[]

  // Execution metadata
  executionHistory: ExecutionRecord[]
}

/**
 * Process states in the Dove9 kernel
 */
export enum ProcessState {
  PENDING = 'pending',
  ACTIVE = 'active',
  PROCESSING = 'processing',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

/**
 * Cognitive context carried by a message process
 */
export interface CognitiveContext {
  // Memory references
  relevantMemories: string[]

  // Emotional state
  emotionalValence: number  // -1 to 1
  emotionalArousal: number  // 0 to 1

  // Salience
  salienceScore: number
  attentionWeight: number

  // Integration state
  perceptionData?: any
  thoughtData?: any
  actionPlan?: any

  // Coupling activations
  activeCouplings: CouplingType[]
}

/**
 * Types of tensional couplings between cognitive functions
 */
export enum CouplingType {
  PERCEPTION_MEMORY = 'T4E_T7R',    // Sensory-Memory coupling
  ASSESSMENT_PLANNING = 'T1R_T2E',  // Simulation-Planning coupling
  BALANCED_INTEGRATION = 'T8E',     // Balanced motor response
}

/**
 * Record of a process execution step
 */
export interface ExecutionRecord {
  timestamp: Date
  step: number
  stream: StreamId
  term: CognitiveTerm
  mode: CognitiveMode
  duration: number
  result: 'success' | 'partial' | 'failed'
  output?: any
}

/**
 * The Dove9 Kernel state
 */
export interface KernelState {
  // Clock
  currentStep: number
  cycleNumber: number

  // Streams
  streams: Map<StreamId, StreamState>

  // Process table
  processTable: Map<string, MessageProcess>
  activeProcesses: Set<string>

  // Metrics
  metrics: KernelMetrics
}

/**
 * State of a single cognitive stream
 */
export interface StreamState {
  id: StreamId
  currentTerm: CognitiveTerm
  mode: CognitiveMode
  stepInCycle: number
  isActive: boolean
  lastProcessed?: Date
}

/**
 * Kernel performance metrics
 */
export interface KernelMetrics {
  totalSteps: number
  totalCycles: number
  processesCompleted: number
  averageLatency: number
  streamCoherence: number
  cognitiveLoad: number
  activeCouplings: CouplingType[]
}

/**
 * Event types emitted by the Dove9 kernel
 */
export type KernelEvent =
  | { type: 'step_advance'; step: number; cycle: number }
  | { type: 'triad_convergence'; triad: TriadPoint }
  | { type: 'process_created'; process: MessageProcess }
  | { type: 'process_completed'; processId: string; result: any }
  | { type: 'coupling_activated'; coupling: CouplingType }
  | { type: 'stream_sync'; streams: StreamId[] }
  | { type: 'cycle_complete'; cycle: number; metrics: KernelMetrics }

/**
 * Configuration for the Dove9 kernel
 */
export interface Dove9Config {
  // Timing
  stepDuration: number  // milliseconds per step

  // Capacity
  maxConcurrentProcesses: number
  maxQueueDepth: number

  // Integration
  enableMilter: boolean
  enableLMTP: boolean
  enableDeltaChat: boolean

  // Deep Tree Echo connection
  orchestratorUrl?: string

  // Cognitive settings
  enableParallelCognition: boolean
  defaultSalienceThreshold: number
}

/**
 * Default configuration
 */
export const DEFAULT_DOVE9_CONFIG: Dove9Config = {
  stepDuration: 100,  // 100ms per step = 1.2 seconds per full cycle
  maxConcurrentProcesses: 100,
  maxQueueDepth: 1000,
  enableMilter: true,
  enableLMTP: true,
  enableDeltaChat: true,
  enableParallelCognition: true,
  defaultSalienceThreshold: 0.3,
}
