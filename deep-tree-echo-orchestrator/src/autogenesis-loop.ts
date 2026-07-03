/**
 * @fileoverview Autogenesis Loop — 6-Step KSM Cycle with Alexander's 15 Properties
 *
 * Implements the self-generating evolution cycle that scores the agent's
 * structural wholeness using Christopher Alexander's 15 Properties of
 * Living Structure, then feeds scores back as evolution directives.
 *
 * The 6-step KSM (Knowledge Sharing Mechanism) cycle:
 *   1. OBSERVE    — Gather state from all cognitive subsystems
 *   2. DIAGNOSE   — Score each of the 15 Properties (0-1)
 *   3. SELECT     — Identify the weakest center for strengthening
 *   4. TRANSFORM  — Apply structure-preserving transformation
 *   5. EVALUATE   — Re-score to verify improvement (Δ > 0)
 *   6. INTEGRATE  — Commit successful transformation to identity
 *
 * Alexander's 15 Properties:
 *   1.  Levels of Scale          9.  Contrast
 *   2.  Strong Centers          10.  Gradients
 *   3.  Boundaries              11.  Roughness
 *   4.  Alternating Repetition  12.  Echoes
 *   5.  Positive Space          13.  The Void
 *   6.  Good Shape              14.  Simplicity & Inner Calm
 *   7.  Local Symmetries        15.  Not-Separateness
 *   8.  Deep Interlock & Ambiguity
 *
 * Each property is scored against the agent's current cognitive state:
 *   - Memory structure (episodic, semantic, procedural)
 *   - Behavioral patterns (from ToM engine)
 *   - Endocrine homeostasis (from VES)
 *   - Salience landscape coherence
 *   - Identity MLP weight distribution
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/AutogenesisLoop');

// ─── Types ──────────────────────────────────────────────────────

/** Alexander's 15 Properties */
export enum AlexanderProperty {
  LEVELS_OF_SCALE = 'LEVELS_OF_SCALE',
  STRONG_CENTERS = 'STRONG_CENTERS',
  BOUNDARIES = 'BOUNDARIES',
  ALTERNATING_REPETITION = 'ALTERNATING_REPETITION',
  POSITIVE_SPACE = 'POSITIVE_SPACE',
  GOOD_SHAPE = 'GOOD_SHAPE',
  LOCAL_SYMMETRIES = 'LOCAL_SYMMETRIES',
  DEEP_INTERLOCK = 'DEEP_INTERLOCK',
  CONTRAST = 'CONTRAST',
  GRADIENTS = 'GRADIENTS',
  ROUGHNESS = 'ROUGHNESS',
  ECHOES = 'ECHOES',
  THE_VOID = 'THE_VOID',
  SIMPLICITY_INNER_CALM = 'SIMPLICITY_INNER_CALM',
  NOT_SEPARATENESS = 'NOT_SEPARATENESS',
}

/** Score for a single property */
export interface PropertyScore {
  property: AlexanderProperty;
  score: number;         // 0-1
  evidence: string[];    // What contributed to this score
  subsystem: string;     // Which subsystem was evaluated
}

/** Complete wholeness assessment */
export interface WholenessAssessment {
  scores: PropertyScore[];
  overallWholeness: number;  // Geometric mean of all 15 scores
  weakestCenter: AlexanderProperty;
  strongestCenter: AlexanderProperty;
  timestamp: number;
  cycleNumber: number;
}

/** KSM cycle phase */
export enum KSMPhase {
  OBSERVE = 'OBSERVE',
  DIAGNOSE = 'DIAGNOSE',
  SELECT = 'SELECT',
  TRANSFORM = 'TRANSFORM',
  EVALUATE = 'EVALUATE',
  INTEGRATE = 'INTEGRATE',
}

/** Evolution directive generated from diagnosis */
export interface EvolutionDirective {
  targetProperty: AlexanderProperty;
  currentScore: number;
  targetScore: number;
  transformation: string;
  subsystem: string;
  priority: number;
}

/** Cognitive state snapshot for scoring */
export interface CognitiveStateSnapshot {
  /** Memory metrics */
  memory: {
    episodicCount: number;
    semanticCount: number;
    proceduralCount: number;
    recentRetrievals: number;
    consolidationRate: number;
  };
  /** Endocrine state */
  endocrine: {
    currentMode: string;
    stressLevel: number;
    rewardLevel: number;
    arousalLevel: number;
    homeostatic: boolean;
  };
  /** Salience landscape */
  salience: {
    entryCount: number;
    topSalience: number;
    entropy: number;
    monopolyRatio: number;
  };
  /** Behavioral patterns */
  behavior: {
    patternCount: number;
    averagePredictiveStrength: number;
    intentionDiversity: number;
    cooperativeActionCount: number;
  };
  /** Identity MLP */
  identity: {
    parameterCount: number;
    weightVariance: number;
    biasRange: number;
    adaptationCount: number;
  };
  /** Orchestration */
  orchestration: {
    proactivePhase: string;
    grandCycleStep: number;
    actionHandlerCount: number;
    feedbackLoopActive: boolean;
  };
}

/** Configuration */
export interface AutogenesisConfig {
  /** Minimum cycles between evolution attempts */
  minCycleInterval: number;
  /** Minimum improvement delta to accept transformation */
  minImprovementDelta: number;
  /** Maximum consecutive failed transformations before backoff */
  maxConsecutiveFailures: number;
  /** Backoff multiplier after failures */
  backoffMultiplier: number;
  /** Enable automatic evolution directives */
  autoEvolve: boolean;
  /** Target wholeness score (stop evolving when reached) */
  targetWholeness: number;
}

/** Events */
export interface AutogenesisEvents {
  cycle_started: { cycleNumber: number; phase: KSMPhase };
  assessment_complete: { assessment: WholenessAssessment };
  directive_generated: { directive: EvolutionDirective };
  transformation_applied: { property: AlexanderProperty; delta: number; success: boolean };
  evolution_milestone: { wholeness: number; cycleNumber: number };
}

// ─── Default Configuration ──────────────────────────────────────

const DEFAULT_CONFIG: AutogenesisConfig = {
  minCycleInterval: 5,
  minImprovementDelta: 0.01,
  maxConsecutiveFailures: 3,
  backoffMultiplier: 2,
  autoEvolve: true,
  targetWholeness: 0.85,
};

// ─── Autogenesis Loop ───────────────────────────────────────────

/**
 * AutogenesisLoop — Self-generating evolution with Alexander's 15 Properties
 */
export class AutogenesisLoop extends EventEmitter {
  private config: AutogenesisConfig;
  private currentPhase: KSMPhase = KSMPhase.OBSERVE;
  private cycleCount: number = 0;
  private assessmentHistory: WholenessAssessment[] = [];
  private pendingDirective: EvolutionDirective | null = null;
  private consecutiveFailures: number = 0;
  private backoffCycles: number = 0;
  private lastCycleTimestamp: number = 0;

  constructor(config: Partial<AutogenesisConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute one full KSM cycle
   */
  executeCycle(state: CognitiveStateSnapshot): WholenessAssessment | null {
    // Check backoff
    if (this.backoffCycles > 0) {
      this.backoffCycles--;
      return null;
    }

    this.cycleCount++;
    this.lastCycleTimestamp = Date.now();

    // Phase 1: OBSERVE
    this.currentPhase = KSMPhase.OBSERVE;
    this.emit('cycle_started', { cycleNumber: this.cycleCount, phase: this.currentPhase });

    // Phase 2: DIAGNOSE
    this.currentPhase = KSMPhase.DIAGNOSE;
    const assessment = this.diagnose(state);
    this.emit('assessment_complete', { assessment });

    // Phase 3: SELECT
    this.currentPhase = KSMPhase.SELECT;
    const directive = this.selectTransformation(assessment);
    if (directive) {
      this.pendingDirective = directive;
      this.emit('directive_generated', { directive });
    }

    // Phase 4: TRANSFORM (generates the directive for external application)
    this.currentPhase = KSMPhase.TRANSFORM;

    // Phase 5: EVALUATE (will be called externally after transformation)
    this.currentPhase = KSMPhase.EVALUATE;

    // Phase 6: INTEGRATE
    this.currentPhase = KSMPhase.INTEGRATE;
    this.assessmentHistory.push(assessment);
    if (this.assessmentHistory.length > 50) {
      this.assessmentHistory.shift();
    }

    // Check for milestone
    if (assessment.overallWholeness >= this.config.targetWholeness) {
      this.emit('evolution_milestone', {
        wholeness: assessment.overallWholeness,
        cycleNumber: this.cycleCount,
      });
    }

    return assessment;
  }

  /**
   * Report transformation result (called after external application)
   */
  reportTransformationResult(
    property: AlexanderProperty,
    newScore: number,
    previousScore: number,
  ): void {
    const delta = newScore - previousScore;
    const success = delta >= this.config.minImprovementDelta;

    this.emit('transformation_applied', { property, delta, success });

    if (success) {
      this.consecutiveFailures = 0;
      log.info(`Transformation SUCCESS: ${property} improved by ${delta.toFixed(3)}`);
    } else {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
        this.backoffCycles = this.config.backoffMultiplier * this.consecutiveFailures;
        log.warn(`Transformation FAILED ${this.consecutiveFailures}x, backing off ${this.backoffCycles} cycles`);
      }
    }

    this.pendingDirective = null;
  }

  /**
   * Get the current pending directive
   */
  getPendingDirective(): EvolutionDirective | null {
    return this.pendingDirective;
  }

  /**
   * Get the latest assessment
   */
  getLatestAssessment(): WholenessAssessment | undefined {
    return this.assessmentHistory[this.assessmentHistory.length - 1];
  }

  /**
   * Get assessment history
   */
  getHistory(): WholenessAssessment[] {
    return [...this.assessmentHistory];
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    cycleCount: number;
    currentPhase: KSMPhase;
    overallWholeness: number;
    weakestCenter: string;
    consecutiveFailures: number;
    backoffCycles: number;
    improvementTrend: number;
  } {
    const latest = this.getLatestAssessment();
    const trend = this.computeImprovementTrend();

    return {
      cycleCount: this.cycleCount,
      currentPhase: this.currentPhase,
      overallWholeness: latest?.overallWholeness ?? 0,
      weakestCenter: latest?.weakestCenter ?? 'UNKNOWN',
      consecutiveFailures: this.consecutiveFailures,
      backoffCycles: this.backoffCycles,
      improvementTrend: trend,
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.currentPhase = KSMPhase.OBSERVE;
    this.cycleCount = 0;
    this.assessmentHistory = [];
    this.pendingDirective = null;
    this.consecutiveFailures = 0;
    this.backoffCycles = 0;
  }

  // ─── Private: Diagnosis ─────────────────────────────────────

  private diagnose(state: CognitiveStateSnapshot): WholenessAssessment {
    const scores: PropertyScore[] = [
      this.scoreLevelsOfScale(state),
      this.scoreStrongCenters(state),
      this.scoreBoundaries(state),
      this.scoreAlternatingRepetition(state),
      this.scorePositiveSpace(state),
      this.scoreGoodShape(state),
      this.scoreLocalSymmetries(state),
      this.scoreDeepInterlock(state),
      this.scoreContrast(state),
      this.scoreGradients(state),
      this.scoreRoughness(state),
      this.scoreEchoes(state),
      this.scoreTheVoid(state),
      this.scoreSimplicityInnerCalm(state),
      this.scoreNotSeparateness(state),
    ];

    // Geometric mean for overall wholeness
    const product = scores.reduce((acc, s) => acc * Math.max(0.01, s.score), 1);
    const overallWholeness = Math.pow(product, 1 / scores.length);

    // Find weakest and strongest
    const sorted = [...scores].sort((a, b) => a.score - b.score);
    const weakestCenter = sorted[0].property;
    const strongestCenter = sorted[sorted.length - 1].property;

    return {
      scores,
      overallWholeness,
      weakestCenter,
      strongestCenter,
      timestamp: Date.now(),
      cycleNumber: this.cycleCount,
    };
  }

  // ─── Property Scorers ─────────────────────────────────────────

  private scoreLevelsOfScale(state: CognitiveStateSnapshot): PropertyScore {
    // Levels of Scale: Are there distinct hierarchical levels in the system?
    // Scored by: memory type diversity, orchestration depth, identity layers
    const memoryLevels = [
      state.memory.episodicCount > 0 ? 1 : 0,
      state.memory.semanticCount > 0 ? 1 : 0,
      state.memory.proceduralCount > 0 ? 1 : 0,
    ].reduce((a, b) => a + b, 0) / 3;

    const orchestrationDepth = state.orchestration.actionHandlerCount > 0 ? 0.5 : 0;
    const identityPresence = state.identity.parameterCount > 0 ? 0.5 : 0;

    return {
      property: AlexanderProperty.LEVELS_OF_SCALE,
      score: Math.min(1, (memoryLevels + orchestrationDepth + identityPresence) / 2),
      evidence: [`memory_types=${memoryLevels.toFixed(2)}`, `orch_depth=${orchestrationDepth}`],
      subsystem: 'memory+orchestration',
    };
  }

  private scoreStrongCenters(state: CognitiveStateSnapshot): PropertyScore {
    // Strong Centers: Are there well-defined focal points of activity?
    const salienceStrength = state.salience.topSalience;
    const patternStrength = state.behavior.averagePredictiveStrength;
    const identityStrength = state.identity.adaptationCount > 0 ? 0.7 : 0.3;

    return {
      property: AlexanderProperty.STRONG_CENTERS,
      score: (salienceStrength + patternStrength + identityStrength) / 3,
      evidence: [`salience=${salienceStrength.toFixed(2)}`, `patterns=${patternStrength.toFixed(2)}`],
      subsystem: 'salience+behavior',
    };
  }

  private scoreBoundaries(state: CognitiveStateSnapshot): PropertyScore {
    // Boundaries: Are there clear demarcations between subsystems?
    const modeClarity = state.endocrine.homeostatic ? 0.8 : 0.4;
    const phaseClarity = state.orchestration.proactivePhase !== '' ? 0.7 : 0.3;
    const memoryBoundary = (state.memory.episodicCount > 0 && state.memory.semanticCount > 0) ? 0.8 : 0.4;

    return {
      property: AlexanderProperty.BOUNDARIES,
      score: (modeClarity + phaseClarity + memoryBoundary) / 3,
      evidence: [`mode_clarity=${modeClarity}`, `phase=${state.orchestration.proactivePhase}`],
      subsystem: 'endocrine+orchestration',
    };
  }

  private scoreAlternatingRepetition(state: CognitiveStateSnapshot): PropertyScore {
    // Alternating Repetition: Regular rhythmic patterns in behavior
    const patternRegularity = Math.min(1, state.behavior.patternCount / 10);
    const cycleRegularity = state.orchestration.grandCycleStep > 0 ? 0.7 : 0.3;

    return {
      property: AlexanderProperty.ALTERNATING_REPETITION,
      score: (patternRegularity + cycleRegularity) / 2,
      evidence: [`patterns=${state.behavior.patternCount}`, `cycle_step=${state.orchestration.grandCycleStep}`],
      subsystem: 'behavior+orchestration',
    };
  }

  private scorePositiveSpace(state: CognitiveStateSnapshot): PropertyScore {
    // Positive Space: Every part of the system serves a purpose
    const memoryUtilization = state.memory.recentRetrievals > 0 ? 0.8 : 0.3;
    const salienceUtilization = state.salience.entryCount > 0 ? 0.7 : 0.2;
    const handlerUtilization = state.orchestration.actionHandlerCount > 0 ? 0.8 : 0.2;

    return {
      property: AlexanderProperty.POSITIVE_SPACE,
      score: (memoryUtilization + salienceUtilization + handlerUtilization) / 3,
      evidence: [`retrievals=${state.memory.recentRetrievals}`, `handlers=${state.orchestration.actionHandlerCount}`],
      subsystem: 'memory+salience+orchestration',
    };
  }

  private scoreGoodShape(state: CognitiveStateSnapshot): PropertyScore {
    // Good Shape: The overall form is coherent and well-proportioned
    const weightBalance = 1 - Math.min(1, state.identity.weightVariance * 2);
    const entropyBalance = 1 - Math.abs(state.salience.entropy - 0.5) * 2;
    const modeStability = state.endocrine.homeostatic ? 0.9 : 0.4;

    return {
      property: AlexanderProperty.GOOD_SHAPE,
      score: (weightBalance + entropyBalance + modeStability) / 3,
      evidence: [`weight_var=${state.identity.weightVariance.toFixed(3)}`, `entropy=${state.salience.entropy.toFixed(2)}`],
      subsystem: 'identity+salience+endocrine',
    };
  }

  private scoreLocalSymmetries(state: CognitiveStateSnapshot): PropertyScore {
    // Local Symmetries: Balanced sub-structures within the whole
    const memoryBalance = this.computeBalance([
      state.memory.episodicCount,
      state.memory.semanticCount,
      state.memory.proceduralCount,
    ]);
    const monopolyFree = 1 - state.salience.monopolyRatio;

    return {
      property: AlexanderProperty.LOCAL_SYMMETRIES,
      score: (memoryBalance + monopolyFree) / 2,
      evidence: [`memory_balance=${memoryBalance.toFixed(2)}`, `monopoly_free=${monopolyFree.toFixed(2)}`],
      subsystem: 'memory+salience',
    };
  }

  private scoreDeepInterlock(state: CognitiveStateSnapshot): PropertyScore {
    // Deep Interlock & Ambiguity: Subsystems are deeply interconnected
    const feedbackActive = state.orchestration.feedbackLoopActive ? 0.9 : 0.2;
    const cooperativeActions = Math.min(1, state.behavior.cooperativeActionCount / 5);
    const consolidationActive = state.memory.consolidationRate > 0 ? 0.7 : 0.3;

    return {
      property: AlexanderProperty.DEEP_INTERLOCK,
      score: (feedbackActive + cooperativeActions + consolidationActive) / 3,
      evidence: [`feedback=${feedbackActive}`, `coop=${cooperativeActions.toFixed(2)}`],
      subsystem: 'orchestration+behavior+memory',
    };
  }

  private scoreContrast(state: CognitiveStateSnapshot): PropertyScore {
    // Contrast: Clear differentiation between active and passive states
    const stressContrast = Math.abs(state.endocrine.stressLevel - 0.1);
    const arousalContrast = Math.abs(state.endocrine.arousalLevel - 0.2);
    const salienceContrast = state.salience.topSalience - (1 / Math.max(1, state.salience.entryCount));

    return {
      property: AlexanderProperty.CONTRAST,
      score: Math.min(1, (stressContrast + arousalContrast + Math.max(0, salienceContrast)) / 2),
      evidence: [`stress_contrast=${stressContrast.toFixed(2)}`, `salience_contrast=${salienceContrast.toFixed(2)}`],
      subsystem: 'endocrine+salience',
    };
  }

  private scoreGradients(state: CognitiveStateSnapshot): PropertyScore {
    // Gradients: Smooth transitions between states
    const modeTransitionSmooth = state.endocrine.homeostatic ? 0.8 : 0.5;
    const salienceGradient = state.salience.entropy > 0.3 && state.salience.entropy < 0.8 ? 0.8 : 0.4;

    return {
      property: AlexanderProperty.GRADIENTS,
      score: (modeTransitionSmooth + salienceGradient) / 2,
      evidence: [`homeostatic=${state.endocrine.homeostatic}`, `entropy=${state.salience.entropy.toFixed(2)}`],
      subsystem: 'endocrine+salience',
    };
  }

  private scoreRoughness(state: CognitiveStateSnapshot): PropertyScore {
    // Roughness: Healthy imperfection and organic variation
    const biasVariation = Math.min(1, state.identity.biasRange * 5);
    const patternVariation = state.behavior.intentionDiversity > 2 ? 0.8 : 0.4;

    return {
      property: AlexanderProperty.ROUGHNESS,
      score: (biasVariation + patternVariation) / 2,
      evidence: [`bias_range=${state.identity.biasRange.toFixed(3)}`, `intent_diversity=${state.behavior.intentionDiversity}`],
      subsystem: 'identity+behavior',
    };
  }

  private scoreEchoes(state: CognitiveStateSnapshot): PropertyScore {
    // Echoes: Self-similar patterns at different scales
    const patternEchoes = Math.min(1, state.behavior.patternCount / 5);
    const memoryEchoes = state.memory.consolidationRate > 0 ? 0.7 : 0.3;

    return {
      property: AlexanderProperty.ECHOES,
      score: (patternEchoes + memoryEchoes) / 2,
      evidence: [`patterns=${state.behavior.patternCount}`, `consolidation=${state.memory.consolidationRate}`],
      subsystem: 'behavior+memory',
    };
  }

  private scoreTheVoid(state: CognitiveStateSnapshot): PropertyScore {
    // The Void: Presence of emptiness that gives meaning to fullness
    // "Only the void sums to one" — the unmarked state is computationally significant
    const restingPresence = state.endocrine.currentMode === 'RESTING' ? 0.9 : 0.4;
    const spaceAvailable = 1 - Math.min(1, state.salience.entryCount / 100);

    return {
      property: AlexanderProperty.THE_VOID,
      score: (restingPresence + spaceAvailable) / 2,
      evidence: [`mode=${state.endocrine.currentMode}`, `space=${spaceAvailable.toFixed(2)}`],
      subsystem: 'endocrine+salience',
    };
  }

  private scoreSimplicityInnerCalm(state: CognitiveStateSnapshot): PropertyScore {
    // Simplicity & Inner Calm: Absence of unnecessary complexity
    const lowStress = 1 - state.endocrine.stressLevel;
    const lowMonopoly = 1 - state.salience.monopolyRatio;
    const homeostatic = state.endocrine.homeostatic ? 0.9 : 0.3;

    return {
      property: AlexanderProperty.SIMPLICITY_INNER_CALM,
      score: (lowStress + lowMonopoly + homeostatic) / 3,
      evidence: [`stress=${state.endocrine.stressLevel.toFixed(2)}`, `homeostatic=${state.endocrine.homeostatic}`],
      subsystem: 'endocrine+salience',
    };
  }

  private scoreNotSeparateness(state: CognitiveStateSnapshot): PropertyScore {
    // Not-Separateness: The system is connected to its environment
    const feedbackConnected = state.orchestration.feedbackLoopActive ? 0.9 : 0.2;
    const cooperativeConnected = state.behavior.cooperativeActionCount > 0 ? 0.8 : 0.3;
    const memoryConnected = state.memory.recentRetrievals > 0 ? 0.7 : 0.3;

    return {
      property: AlexanderProperty.NOT_SEPARATENESS,
      score: (feedbackConnected + cooperativeConnected + memoryConnected) / 3,
      evidence: [`feedback=${feedbackConnected}`, `coop=${state.behavior.cooperativeActionCount}`],
      subsystem: 'orchestration+behavior+memory',
    };
  }

  // ─── Private: Selection & Transformation ──────────────────────

  private selectTransformation(assessment: WholenessAssessment): EvolutionDirective | null {
    if (!this.config.autoEvolve) return null;
    if (assessment.overallWholeness >= this.config.targetWholeness) return null;

    const weakest = assessment.scores.reduce((a, b) => a.score < b.score ? a : b);

    // Generate transformation directive
    const transformation = this.getTransformationForProperty(weakest.property);

    return {
      targetProperty: weakest.property,
      currentScore: weakest.score,
      targetScore: Math.min(1, weakest.score + 0.1),
      transformation,
      subsystem: weakest.subsystem,
      priority: 1 - weakest.score, // Lower score = higher priority
    };
  }

  private getTransformationForProperty(property: AlexanderProperty): string {
    const transformations: Record<AlexanderProperty, string> = {
      [AlexanderProperty.LEVELS_OF_SCALE]: 'Add hierarchical memory consolidation layer',
      [AlexanderProperty.STRONG_CENTERS]: 'Increase salience for dominant cognitive terms',
      [AlexanderProperty.BOUNDARIES]: 'Strengthen mode transition thresholds',
      [AlexanderProperty.ALTERNATING_REPETITION]: 'Regularize grand cycle timing',
      [AlexanderProperty.POSITIVE_SPACE]: 'Prune unused action handlers and stale memories',
      [AlexanderProperty.GOOD_SHAPE]: 'Rebalance MLP weight distribution via He reinit',
      [AlexanderProperty.LOCAL_SYMMETRIES]: 'Balance memory type ratios',
      [AlexanderProperty.DEEP_INTERLOCK]: 'Wire additional feedback loops between subsystems',
      [AlexanderProperty.CONTRAST]: 'Increase endocrine sensitivity for clearer mode signals',
      [AlexanderProperty.GRADIENTS]: 'Smooth salience decay curves',
      [AlexanderProperty.ROUGHNESS]: 'Inject controlled noise into identity MLP biases',
      [AlexanderProperty.ECHOES]: 'Propagate successful patterns to adjacent subsystems',
      [AlexanderProperty.THE_VOID]: 'Schedule deliberate rest periods in proactive loop',
      [AlexanderProperty.SIMPLICITY_INNER_CALM]: 'Reduce cortisol baseline, simplify action space',
      [AlexanderProperty.NOT_SEPARATENESS]: 'Strengthen environment perception handlers',
    };
    return transformations[property];
  }

  // ─── Private: Utilities ───────────────────────────────────────

  private computeBalance(values: number[]): number {
    if (values.length === 0) return 0;
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const normalized = values.map(v => v / total);
    const ideal = 1 / values.length;
    const deviation = normalized.reduce((acc, v) => acc + Math.abs(v - ideal), 0);
    return 1 - (deviation / 2); // Normalize to 0-1
  }

  private computeImprovementTrend(): number {
    if (this.assessmentHistory.length < 2) return 0;
    const recent = this.assessmentHistory.slice(-5);
    if (recent.length < 2) return 0;

    let totalDelta = 0;
    for (let i = 1; i < recent.length; i++) {
      totalDelta += recent[i].overallWholeness - recent[i - 1].overallWholeness;
    }
    return totalDelta / (recent.length - 1);
  }
}

/**
 * Create an AutogenesisLoop instance
 */
export function createAutogenesisLoop(
  config?: Partial<AutogenesisConfig>,
): AutogenesisLoop {
  return new AutogenesisLoop(config);
}
