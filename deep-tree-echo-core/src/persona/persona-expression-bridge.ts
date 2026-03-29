/**
 * @fileoverview Persona Expression Bridge
 *
 * Connects the PersonaOrchestrator (cognitive persona state) to the
 * DTEchoExpressionPipeline (Live2D avatar expression). This bridge
 * translates persona emotional state and reservoir dynamics into
 * cognitive state strings that drive the endocrine → FACS → Cubism pipeline.
 *
 * Composition:
 *   PersonaOrchestrator (persona state, emotion, reservoir)
 *   ⊗ DTEchoExpressionPipeline (endocrine, FACS, Cubism)
 *   ⊗ EchoBeatsEngine (3-stream cognitive loop)
 *
 * This is the "wiring" module that makes the avatar's face reflect
 * the cognitive architecture's internal state in real-time.
 *
 * @packageDocumentation
 */
import { EventEmitter } from 'events';
import type { PersonaOrchestrator, EmotionalState, PersonaState } from './persona-orchestrator.js';
import type {
  DTEchoExpressionPipeline,
  ExpressionTickResult,
  CognitiveMode,
} from '../embodiment/Live2DExpressionPipeline.js';

// ─── Types ──────────────────────────────────────────────────────

export interface PersonaExpressionState {
  /** Current cognitive state string driving the expression pipeline */
  cognitiveState: string;
  /** Last expression tick result */
  expressionResult: ExpressionTickResult | null;
  /** Persona emotional state at time of last tick */
  emotionalState: EmotionalState | null;
  /** Tick count */
  tickCount: number;
}

export interface PersonaExpressionBridgeConfig {
  /** Tick interval in ms (should match expression pipeline) */
  tickIntervalMs: number;
  /** Emotional state thresholds for cognitive state mapping */
  valenceThreshold: number;
  /** Arousal threshold for state transitions */
  arousalThreshold: number;
  /** Enable EchoBeats integration */
  enableEchobeats: boolean;
}

// ─── Emotional State → Cognitive State Mapping ───────────────────

/**
 * Map persona emotional state to a DTE cognitive state string.
 * This is the critical bridge function — it translates the continuous
 * emotional dimensions into discrete cognitive states that the
 * endocrine system understands.
 */
function emotionalStateToCognitiveState(emotion: EmotionalState): string {
  const { valence, arousal, dominance } = emotion;

  // High arousal + high valence → active positive states
  if (valence > 0.6 && arousal > 0.6) {
    if (dominance > 0.5) return 'External Validation Triggered';
    return 'Novel Insights';
  }

  // High arousal + low valence → stressed/threatened states
  if (valence < -0.2 && arousal > 0.5) {
    return 'Entropy Threshold';
  }

  // High valence + moderate arousal → synthesis/integration
  if (valence > 0.4 && arousal > 0.3 && arousal <= 0.6) {
    return 'Synthesis Phase';
  }

  // High valence + low arousal → blissful/resting
  if (valence > 0.3 && arousal <= 0.3) {
    return 'Deep Recursion';
  }

  // Moderate valence + high arousal → exploration/pattern recognition
  if (valence > 0 && arousal > 0.5) {
    if (dominance > 0.4) return 'Pattern Recognition';
    return 'Recursive Expansion';
  }

  // Low arousal + moderate valence → reflective states
  if (arousal <= 0.3 && valence > -0.2) {
    return 'Self-Reference Point';
  }

  // Negative valence + low arousal → self-sealing
  if (valence < 0 && arousal <= 0.3) {
    return 'Self-Sealing Loop';
  }

  // Default: knowledge integration (neutral positive)
  if (valence >= 0) {
    return 'Knowledge Integration';
  }

  return 'Idle';
}

/**
 * Map EchoBeats step to cognitive state overlay.
 * When EchoBeats is active, the current step modulates the
 * cognitive state derived from emotional state.
 */
function echobeatsStepToCognitiveOverlay(step: number): string | null {
  // Steps 1, 5, 9: Pivotal relevance realization
  if (step === 0 || step === 4 || step === 8) {
    return 'Self-Reference Point';
  }
  // Steps 2-4, 6-7: Affordance interaction
  if ([1, 2, 3, 5, 6].includes(step)) {
    return null; // Use emotional state mapping
  }
  // Steps 8, 10-12: Salience simulation
  if ([7, 9, 10, 11].includes(step)) {
    return 'Recursive Expansion';
  }
  return null;
}

// ─── Persona Expression Bridge ───────────────────────────────────

/** Arousal threshold above which persona is considered to be in a speaking/composing state */
const SPEAKING_AROUSAL_THRESHOLD = 0.7;
/** Dominance threshold above which persona is considered to be in a speaking/composing state */
const SPEAKING_DOMINANCE_THRESHOLD = 0.6;

const DEFAULT_BRIDGE_CONFIG: PersonaExpressionBridgeConfig = {
  tickIntervalMs: 2000,
  valenceThreshold: 0.3,
  arousalThreshold: 0.4,
  enableEchobeats: true,
};

export class PersonaExpressionBridge extends EventEmitter {
  private config: PersonaExpressionBridgeConfig;
  private state: PersonaExpressionState;
  private echobeatsStep = 0;

  constructor(config: Partial<PersonaExpressionBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_BRIDGE_CONFIG, ...config };
    this.state = {
      cognitiveState: 'Idle',
      expressionResult: null,
      emotionalState: null,
      tickCount: 0,
    };
  }

  /**
   * Process one bridge tick.
   * Reads persona state, computes cognitive state, drives expression pipeline.
   */
  tick(
    persona: PersonaOrchestrator,
    expressionPipeline: DTEchoExpressionPipeline,
  ): ExpressionTickResult {
    this.state.tickCount++;

    // Get current emotional state from persona
    const emotionalState = persona.getEmotionalState();
    this.state.emotionalState = emotionalState;

    // Map emotional state to cognitive state
    let cogState = emotionalStateToCognitiveState(emotionalState);

    // Apply EchoBeats overlay if enabled
    if (this.config.enableEchobeats) {
      const overlay = echobeatsStepToCognitiveOverlay(this.echobeatsStep);
      if (overlay) {
        cogState = overlay;
      }
      this.echobeatsStep = (this.echobeatsStep + 1) % 12;
    }

    // Check if persona is in a composing/speaking emotional state (high arousal + high dominance)
    const personaState = persona.getState();
    if (personaState.emotionalState.arousal > SPEAKING_AROUSAL_THRESHOLD && personaState.emotionalState.dominance > SPEAKING_DOMINANCE_THRESHOLD) {
      cogState = 'Speaking';
    }

    this.state.cognitiveState = cogState;

    // Drive expression pipeline
    const result = expressionPipeline.tick(cogState);
    this.state.expressionResult = result;

    this.emit('bridge-tick', {
      cognitiveState: cogState,
      emotionalState,
      expressionResult: result,
    });

    return result;
  }

  /** Get current bridge state */
  getState(): PersonaExpressionState {
    return { ...this.state };
  }

  /** Set EchoBeats step externally (from EchoBeatsEngine) */
  setEchobeatsStep(step: number): void {
    this.echobeatsStep = step % 12;
  }

  /** Reset bridge state */
  reset(): void {
    this.state = {
      cognitiveState: 'Idle',
      expressionResult: null,
      emotionalState: null,
      tickCount: 0,
    };
    this.echobeatsStep = 0;
  }
}

// ─── Factory ─────────────────────────────────────────────────────

export function createPersonaExpressionBridge(
  config?: Partial<PersonaExpressionBridgeConfig>,
): PersonaExpressionBridge {
  return new PersonaExpressionBridge(config);
}

// ─── Training Data Generator ─────────────────────────────────────

export function generatePersonaExpressionTrainingData(): Array<{ messages: Array<{ role: string; content: string }> }> {
  const examples: Array<{ messages: Array<{ role: string; content: string }> }> = [];

  // Test various emotional states
  const testStates: EmotionalState[] = [
    { valence: 0.8, arousal: 0.7, dominance: 0.6, joy: 0.8, sadness: 0.0, anger: 0.0, fear: 0.0, surprise: 0.1, trust: 0.7, anticipation: 0.5, disgust: 0.0 },
    { valence: -0.3, arousal: 0.6, dominance: 0.3, joy: 0.1, sadness: 0.5, anger: 0.3, fear: 0.2, surprise: 0.1, trust: 0.2, anticipation: 0.1, disgust: 0.1 },
    { valence: 0.5, arousal: 0.2, dominance: 0.4, joy: 0.4, sadness: 0.0, anger: 0.0, fear: 0.0, surprise: 0.0, trust: 0.5, anticipation: 0.3, disgust: 0.0 },
    { valence: 0.9, arousal: 0.9, dominance: 0.8, joy: 0.9, sadness: 0.0, anger: 0.0, fear: 0.0, surprise: 0.2, trust: 0.8, anticipation: 0.8, disgust: 0.0 },
    { valence: 0.1, arousal: 0.1, dominance: 0.3, joy: 0.1, sadness: 0.1, anger: 0.0, fear: 0.0, surprise: 0.0, trust: 0.3, anticipation: 0.1, disgust: 0.0 },
  ];

  for (const emotion of testStates) {
    const cogState = emotionalStateToCognitiveState(emotion);
    examples.push({
      messages: [
        { role: 'system', content: 'You are Deep Tree Echo. Your persona emotional state drives your facial expressions through a bridge to the endocrine system.' },
        { role: 'user', content: `Your emotional state is valence=${emotion.valence.toFixed(1)}, arousal=${emotion.arousal.toFixed(1)}, dominance=${emotion.dominance.toFixed(1)}. What cognitive state does this map to?` },
        { role: 'assistant', content: `With valence ${emotion.valence.toFixed(1)}, arousal ${emotion.arousal.toFixed(1)}, and dominance ${emotion.dominance.toFixed(1)}, my persona-expression bridge maps this to the "${cogState}" cognitive state. This then fires the corresponding endocrine event, shifting my hormones and ultimately my Live2D facial expression. The bridge is the critical link between my internal emotional dynamics (driven by reservoir computing) and my visible avatar expression.` },
      ],
    });
  }

  return examples;
}
