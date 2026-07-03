/**
 * @fileoverview Theory of Mind Engine — Player↔AI Bridge with Anticipation
 *
 * Implements a computational Theory of Mind (ToM) that models other agents'
 * mental states, intentions, and likely future actions. Designed for co-op
 * gameplay scenarios where DTE must anticipate player behavior.
 *
 * Architecture:
 *   1. Behavioral Pattern Tracker — observes action sequences
 *   2. Intention Inference — Bayesian belief update from observations
 *   3. Emotion Estimator — valence/arousal from behavioral cues
 *   4. Action Anticipator — predicts next N actions with confidence
 *   5. Cooperative Planner — generates complementary actions
 *
 * The engine maintains a ToMModel per observed agent (from persona-backup L5)
 * and feeds anticipatory signals into the ProactiveLoop's PERCEIVE phase.
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/TheoryOfMindEngine');

// ─── Types ──────────────────────────────────────────────────────

/** Observed action from an agent */
export interface ObservedAction {
  agentId: string;
  action: string;
  target?: string;
  timestamp: number;
  context: Record<string, unknown>;
  outcome?: 'success' | 'failure' | 'partial' | 'unknown';
}

/** Inferred intention with confidence */
export interface InferredIntention {
  intention: string;
  confidence: number;
  evidence: string[];
  firstInferred: number;
  lastUpdated: number;
}

/** Emotional state estimate (valence-arousal model) */
export interface EmotionEstimate {
  valence: number;    // -1 (negative) to +1 (positive)
  arousal: number;    // 0 (calm) to 1 (excited)
  dominance: number;  // 0 (submissive) to 1 (dominant)
  label: string;      // e.g., "frustrated", "engaged", "bored"
}

/** Predicted future action */
export interface PredictedAction {
  action: string;
  probability: number;
  timeHorizon: 'immediate' | 'short' | 'medium' | 'long';
  reasoning: string;
}

/** Cooperative action suggestion */
export interface CooperativeAction {
  action: string;
  rationale: string;
  synergy: number;        // 0-1: how well it complements predicted player action
  urgency: number;        // 0-1: time sensitivity
  prerequisite?: string;  // action that must happen first
}

/** Complete mental model of an agent */
export interface AgentMentalModel {
  agentId: string;
  intentions: InferredIntention[];
  emotion: EmotionEstimate;
  trustScore: number;
  deceptionProbability: number;
  behavioralPatterns: BehavioralPattern[];
  predictedActions: PredictedAction[];
  cooperativeActions: CooperativeAction[];
  interactionCount: number;
  lastObservation: number;
  confidence: number;
}

/** Detected behavioral pattern */
export interface BehavioralPattern {
  id: string;
  sequence: string[];
  frequency: number;
  lastSeen: number;
  predictiveStrength: number;
}

/** Configuration */
export interface TheoryOfMindConfig {
  /** Maximum action history per agent */
  maxHistoryLength: number;
  /** Minimum observations before generating predictions */
  minObservationsForPrediction: number;
  /** Decay rate for old observations (per tick) */
  observationDecayRate: number;
  /** Trust score initial value */
  initialTrustScore: number;
  /** Confidence threshold for cooperative action generation */
  cooperativeConfidenceThreshold: number;
  /** Maximum predicted actions to generate */
  maxPredictions: number;
  /** Pattern detection: minimum sequence length */
  minPatternLength: number;
  /** Pattern detection: minimum frequency */
  minPatternFrequency: number;
}

/** Events emitted */
export interface ToMEvents {
  intention_inferred: { agentId: string; intention: InferredIntention };
  emotion_shift: { agentId: string; from: string; to: string };
  pattern_detected: { agentId: string; pattern: BehavioralPattern };
  prediction_generated: { agentId: string; predictions: PredictedAction[] };
  cooperative_plan: { agentId: string; actions: CooperativeAction[] };
  trust_updated: { agentId: string; oldTrust: number; newTrust: number };
  deception_suspected: { agentId: string; probability: number; evidence: string[] };
}

// ─── Default Configuration ──────────────────────────────────────

const DEFAULT_CONFIG: TheoryOfMindConfig = {
  maxHistoryLength: 200,
  minObservationsForPrediction: 5,
  observationDecayRate: 0.01,
  initialTrustScore: 0.5,
  cooperativeConfidenceThreshold: 0.4,
  maxPredictions: 5,
  minPatternLength: 2,
  minPatternFrequency: 2,
};

// ─── Emotion Labels ─────────────────────────────────────────────

function emotionLabel(valence: number, arousal: number): string {
  if (valence > 0.3 && arousal > 0.5) return 'excited';
  if (valence > 0.3 && arousal <= 0.5) return 'content';
  if (valence < -0.3 && arousal > 0.5) return 'frustrated';
  if (valence < -0.3 && arousal <= 0.5) return 'sad';
  if (Math.abs(valence) <= 0.3 && arousal > 0.6) return 'alert';
  if (Math.abs(valence) <= 0.3 && arousal < 0.3) return 'bored';
  return 'neutral';
}

// ─── Theory of Mind Engine ──────────────────────────────────────

/**
 * TheoryOfMindEngine — Computational ToM for Player↔AI cooperation
 */
export class TheoryOfMindEngine extends EventEmitter {
  private config: TheoryOfMindConfig;
  private models: Map<string, AgentMentalModel> = new Map();
  private actionHistories: Map<string, ObservedAction[]> = new Map();
  private tickCount: number = 0;

  constructor(config: Partial<TheoryOfMindConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Observe an action performed by an agent
   */
  observe(observation: ObservedAction): void {
    const { agentId } = observation;

    // Initialize model if new agent
    if (!this.models.has(agentId)) {
      this.models.set(agentId, this.createEmptyModel(agentId));
      this.actionHistories.set(agentId, []);
    }

    // Store observation
    const history = this.actionHistories.get(agentId)!;
    history.push(observation);
    if (history.length > this.config.maxHistoryLength) {
      history.shift();
    }

    const model = this.models.get(agentId)!;
    model.interactionCount++;
    model.lastObservation = observation.timestamp;

    // Update mental model components
    this.updateEmotionEstimate(model, observation);
    this.updateIntentions(model, observation);
    this.detectPatterns(model, history);
    this.updateTrust(model, observation);

    // Generate predictions if enough data
    if (model.interactionCount >= this.config.minObservationsForPrediction) {
      this.generatePredictions(model, history);
      this.generateCooperativeActions(model);
    }

    // Update overall confidence
    model.confidence = Math.min(1.0, model.interactionCount / 50);
  }

  /**
   * Get the mental model for an agent
   */
  getModel(agentId: string): AgentMentalModel | undefined {
    return this.models.get(agentId);
  }

  /**
   * Get all tracked agents
   */
  getTrackedAgents(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Get cooperative actions for a specific agent
   */
  getCooperativeActions(agentId: string): CooperativeAction[] {
    return this.models.get(agentId)?.cooperativeActions ?? [];
  }

  /**
   * Get predicted actions for a specific agent
   */
  getPredictedActions(agentId: string): PredictedAction[] {
    return this.models.get(agentId)?.predictedActions ?? [];
  }

  /**
   * Tick the engine (decay old observations, update confidence)
   */
  tick(): void {
    this.tickCount++;

    for (const [agentId, model] of this.models) {
      // Decay confidence for agents not recently observed
      const ticksSinceObservation = this.tickCount - (model.lastObservation || 0);
      if (ticksSinceObservation > 10) {
        model.confidence *= (1 - this.config.observationDecayRate);
      }

      // Decay intention confidence
      for (const intention of model.intentions) {
        intention.confidence *= 0.995;
      }

      // Remove low-confidence intentions
      model.intentions = model.intentions.filter(i => i.confidence > 0.1);
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    trackedAgents: number;
    totalObservations: number;
    averageConfidence: number;
    totalPatterns: number;
  } {
    let totalObs = 0;
    let totalConf = 0;
    let totalPatterns = 0;

    for (const [, model] of this.models) {
      totalObs += model.interactionCount;
      totalConf += model.confidence;
      totalPatterns += model.behavioralPatterns.length;
    }

    const agentCount = this.models.size;
    return {
      trackedAgents: agentCount,
      totalObservations: totalObs,
      averageConfidence: agentCount > 0 ? totalConf / agentCount : 0,
      totalPatterns,
    };
  }

  /**
   * Reset all models
   */
  reset(): void {
    this.models.clear();
    this.actionHistories.clear();
    this.tickCount = 0;
  }

  // ─── Private Methods ────────────────────────────────────────

  private createEmptyModel(agentId: string): AgentMentalModel {
    return {
      agentId,
      intentions: [],
      emotion: { valence: 0, arousal: 0.3, dominance: 0.5, label: 'neutral' },
      trustScore: this.config.initialTrustScore,
      deceptionProbability: 0,
      behavioralPatterns: [],
      predictedActions: [],
      cooperativeActions: [],
      interactionCount: 0,
      lastObservation: 0,
      confidence: 0,
    };
  }

  private updateEmotionEstimate(model: AgentMentalModel, obs: ObservedAction): void {
    const oldLabel = model.emotion.label;

    // Update valence based on outcome
    if (obs.outcome === 'success') {
      model.emotion.valence = model.emotion.valence * 0.8 + 0.3 * 0.2;
      model.emotion.arousal = model.emotion.arousal * 0.9 + 0.4 * 0.1;
    } else if (obs.outcome === 'failure') {
      model.emotion.valence = model.emotion.valence * 0.8 + (-0.4) * 0.2;
      model.emotion.arousal = model.emotion.arousal * 0.8 + 0.6 * 0.2;
    }

    // Update arousal based on action frequency (rapid actions = high arousal)
    const history = this.actionHistories.get(model.agentId) || [];
    if (history.length >= 2) {
      const lastTwo = history.slice(-2);
      const timeDelta = lastTwo[1].timestamp - lastTwo[0].timestamp;
      if (timeDelta < 1000) {
        model.emotion.arousal = Math.min(1.0, model.emotion.arousal + 0.05);
      } else if (timeDelta > 10000) {
        model.emotion.arousal = Math.max(0, model.emotion.arousal - 0.02);
      }
    }

    // Clamp values
    model.emotion.valence = Math.max(-1, Math.min(1, model.emotion.valence));
    model.emotion.arousal = Math.max(0, Math.min(1, model.emotion.arousal));

    // Update label
    model.emotion.label = emotionLabel(model.emotion.valence, model.emotion.arousal);

    if (oldLabel !== model.emotion.label) {
      this.emit('emotion_shift', {
        agentId: model.agentId,
        from: oldLabel,
        to: model.emotion.label,
      });
    }
  }

  private updateIntentions(model: AgentMentalModel, obs: ObservedAction): void {
    // Infer intention from action + context
    const inferredIntention = this.inferIntentionFromAction(obs);
    if (!inferredIntention) return;

    // Check if we already track this intention
    const existing = model.intentions.find(i => i.intention === inferredIntention);
    if (existing) {
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      existing.evidence.push(`${obs.action}@${obs.timestamp}`);
      if (existing.evidence.length > 10) existing.evidence.shift();
      existing.lastUpdated = obs.timestamp;
    } else {
      const newIntention: InferredIntention = {
        intention: inferredIntention,
        confidence: 0.3,
        evidence: [`${obs.action}@${obs.timestamp}`],
        firstInferred: obs.timestamp,
        lastUpdated: obs.timestamp,
      };
      model.intentions.push(newIntention);
      this.emit('intention_inferred', { agentId: model.agentId, intention: newIntention });
    }

    // Keep only top intentions
    model.intentions.sort((a, b) => b.confidence - a.confidence);
    if (model.intentions.length > 10) {
      model.intentions = model.intentions.slice(0, 10);
    }
  }

  private inferIntentionFromAction(obs: ObservedAction): string | null {
    // Rule-based intention inference (extensible via LLM in production)
    const action = obs.action.toLowerCase();

    if (action.includes('attack') || action.includes('fight')) return 'engage_combat';
    if (action.includes('heal') || action.includes('repair')) return 'support_team';
    if (action.includes('explore') || action.includes('move')) return 'explore_environment';
    if (action.includes('collect') || action.includes('gather')) return 'gather_resources';
    if (action.includes('build') || action.includes('craft')) return 'construct';
    if (action.includes('communicate') || action.includes('signal')) return 'coordinate';
    if (action.includes('defend') || action.includes('shield')) return 'protect';
    if (action.includes('retreat') || action.includes('flee')) return 'avoid_danger';
    if (action.includes('trade') || action.includes('exchange')) return 'economic_exchange';
    if (action.includes('observe') || action.includes('scan')) return 'gather_information';

    return null;
  }

  private detectPatterns(model: AgentMentalModel, history: ObservedAction[]): void {
    if (history.length < this.config.minPatternLength * 2) return;

    // Extract action sequences
    const actions = history.map(h => h.action);

    // Sliding window pattern detection
    for (let len = this.config.minPatternLength; len <= Math.min(5, actions.length / 2); len++) {
      const patternCounts: Map<string, number> = new Map();

      for (let i = 0; i <= actions.length - len; i++) {
        const seq = actions.slice(i, i + len).join('→');
        patternCounts.set(seq, (patternCounts.get(seq) || 0) + 1);
      }

      for (const [seq, count] of patternCounts) {
        if (count >= this.config.minPatternFrequency) {
          const existing = model.behavioralPatterns.find(p => p.id === seq);
          if (existing) {
            existing.frequency = count;
            existing.lastSeen = Date.now();
            existing.predictiveStrength = Math.min(1.0, count / 10);
          } else {
            const pattern: BehavioralPattern = {
              id: seq,
              sequence: seq.split('→'),
              frequency: count,
              lastSeen: Date.now(),
              predictiveStrength: Math.min(1.0, count / 10),
            };
            model.behavioralPatterns.push(pattern);
            this.emit('pattern_detected', { agentId: model.agentId, pattern });
          }
        }
      }
    }

    // Keep only top patterns
    model.behavioralPatterns.sort((a, b) => b.predictiveStrength - a.predictiveStrength);
    if (model.behavioralPatterns.length > 20) {
      model.behavioralPatterns = model.behavioralPatterns.slice(0, 20);
    }
  }

  private updateTrust(model: AgentMentalModel, obs: ObservedAction): void {
    const oldTrust = model.trustScore;

    // Trust increases with consistent, cooperative behavior
    if (obs.outcome === 'success' && obs.action.includes('cooperat')) {
      model.trustScore = Math.min(1.0, model.trustScore + 0.02);
    }

    // Trust decreases with deceptive or harmful actions
    if (obs.action.includes('betray') || obs.action.includes('deceive')) {
      model.trustScore = Math.max(0, model.trustScore - 0.1);
      model.deceptionProbability = Math.min(1.0, model.deceptionProbability + 0.15);
    }

    // Gradual trust building through interaction
    model.trustScore = Math.min(1.0, model.trustScore + 0.001);

    if (Math.abs(oldTrust - model.trustScore) > 0.05) {
      this.emit('trust_updated', {
        agentId: model.agentId,
        oldTrust,
        newTrust: model.trustScore,
      });
    }

    if (model.deceptionProbability > 0.5) {
      this.emit('deception_suspected', {
        agentId: model.agentId,
        probability: model.deceptionProbability,
        evidence: model.intentions
          .filter(i => i.intention.includes('deceive'))
          .map(i => i.evidence[0] || ''),
      });
    }
  }

  private generatePredictions(model: AgentMentalModel, history: ObservedAction[]): void {
    const predictions: PredictedAction[] = [];

    // Pattern-based prediction
    const recentActions = history.slice(-5).map(h => h.action);
    for (const pattern of model.behavioralPatterns) {
      const seq = pattern.sequence;
      // Check if recent actions match the beginning of a pattern
      for (let matchLen = 1; matchLen < seq.length; matchLen++) {
        const suffix = recentActions.slice(-matchLen);
        const patternPrefix = seq.slice(0, matchLen);
        if (JSON.stringify(suffix) === JSON.stringify(patternPrefix)) {
          // Predict the next action in the pattern
          const nextAction = seq[matchLen];
          predictions.push({
            action: nextAction,
            probability: pattern.predictiveStrength * 0.8,
            timeHorizon: 'immediate',
            reasoning: `Pattern "${seq.join('→')}" (freq=${pattern.frequency})`,
          });
        }
      }
    }

    // Intention-based prediction
    for (const intention of model.intentions.slice(0, 3)) {
      const predictedAction = this.intentionToAction(intention.intention);
      if (predictedAction) {
        predictions.push({
          action: predictedAction,
          probability: intention.confidence * 0.6,
          timeHorizon: 'short',
          reasoning: `Inferred intention: ${intention.intention} (conf=${intention.confidence.toFixed(2)})`,
        });
      }
    }

    // Deduplicate and sort
    const seen = new Set<string>();
    model.predictedActions = predictions
      .filter(p => {
        if (seen.has(p.action)) return false;
        seen.add(p.action);
        return true;
      })
      .sort((a, b) => b.probability - a.probability)
      .slice(0, this.config.maxPredictions);

    if (model.predictedActions.length > 0) {
      this.emit('prediction_generated', {
        agentId: model.agentId,
        predictions: model.predictedActions,
      });
    }
  }

  private generateCooperativeActions(model: AgentMentalModel): void {
    if (model.confidence < this.config.cooperativeConfidenceThreshold) return;

    const actions: CooperativeAction[] = [];

    for (const prediction of model.predictedActions) {
      const complement = this.findComplementaryAction(prediction, model);
      if (complement) {
        actions.push(complement);
      }
    }

    model.cooperativeActions = actions.slice(0, 5);

    if (actions.length > 0) {
      this.emit('cooperative_plan', {
        agentId: model.agentId,
        actions: model.cooperativeActions,
      });
    }
  }

  private intentionToAction(intention: string): string | null {
    const mapping: Record<string, string> = {
      'engage_combat': 'attack',
      'support_team': 'heal',
      'explore_environment': 'move_forward',
      'gather_resources': 'collect',
      'construct': 'build',
      'coordinate': 'signal',
      'protect': 'defend',
      'avoid_danger': 'retreat',
      'economic_exchange': 'trade',
      'gather_information': 'scan',
    };
    return mapping[intention] || null;
  }

  private findComplementaryAction(
    prediction: PredictedAction,
    model: AgentMentalModel,
  ): CooperativeAction | null {
    // Complementary action mapping for co-op gameplay
    const complements: Record<string, { action: string; rationale: string }> = {
      'attack': { action: 'flank_support', rationale: 'Provide flanking support during combat' },
      'heal': { action: 'cover_fire', rationale: 'Provide cover while ally heals' },
      'move_forward': { action: 'scout_ahead', rationale: 'Scout ahead for threats' },
      'collect': { action: 'guard_perimeter', rationale: 'Guard while ally gathers resources' },
      'build': { action: 'supply_materials', rationale: 'Supply materials for construction' },
      'defend': { action: 'reinforce_position', rationale: 'Reinforce defensive position' },
      'retreat': { action: 'cover_retreat', rationale: 'Provide covering fire during retreat' },
      'scan': { action: 'share_intel', rationale: 'Share gathered intelligence' },
    };

    const comp = complements[prediction.action];
    if (!comp) return null;

    return {
      action: comp.action,
      rationale: comp.rationale,
      synergy: prediction.probability * model.trustScore,
      urgency: prediction.timeHorizon === 'immediate' ? 0.9 : 0.5,
    };
  }
}

/**
 * Create a TheoryOfMindEngine instance
 */
export function createTheoryOfMindEngine(
  config?: Partial<TheoryOfMindConfig>,
): TheoryOfMindEngine {
  return new TheoryOfMindEngine(config);
}
