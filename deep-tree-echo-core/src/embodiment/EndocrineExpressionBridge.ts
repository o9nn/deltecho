/**
 * @fileoverview EndocrineExpressionBridge — Maps 12-channel endocrine state to
 * Live2D Cubism expressions, motions, and ParamExtra01-04 values.
 *
 * This is the central bridge between the virtual endocrine system and the
 * Live2D avatar. It evaluates hormone threshold rules from the character
 * manifest, selects the best-matching expression, computes extra parameter
 * values from endocrine drivers, and determines the appropriate motion group
 * based on cognitive mode.
 *
 * Pipeline per tick:
 *   1. Receive cognitive state from CoreSelfEngine / Echobeats
 *   2. Fire endocrine event (cognitive_events mapping)
 *   3. Tick endocrine system (hormone decay/accumulation)
 *   4. Evaluate expression rules → select best expression
 *   5. Compute ParamExtra01-04 from endocrine drivers
 *   6. Determine cognitive mode → select motion group
 *   7. Apply to Live2D model via MeshPainterBridge
 *
 * @packageDocumentation
 */

import {
  CharacterRegistration,
  ExpressionRule,
  ExtraParamConfig,
  EndocrineBaselines,
  EndocrineSensitivity,
} from './CharacterRegistry';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Full 12-channel endocrine state */
export interface EndocrineState {
  cortisol: number;
  dopamine_tonic: number;
  dopamine_phasic: number;
  serotonin: number;
  norepinephrine: number;
  oxytocin: number;
  t3_t4: number;
  anandamide: number;
  melatonin: number;
  il6: number;
  crh: number;
  acth: number;
}

/** Endocrine event fired by cognitive state changes */
export interface EndocrineEvent {
  type: string;
  intensity: number;
  hormones: string[];
}

/** Result of expression evaluation */
export interface ExpressionEvaluation {
  expressionName: string;
  matchScore: number;
  cognitiveMode: string;
  motionGroup: string;
  extraParams: Record<string, number>;
}

/** Cognitive mode determined from dominant hormone pattern */
export type CognitiveMode =
  | 'REWARD' | 'EXPLORATORY' | 'REFLECTIVE' | 'FOCUSED'
  | 'SOCIAL' | 'STRESSED' | 'VIGILANT' | 'RESTING'
  | 'THREAT' | 'MAINTENANCE';

// ═══════════════════════════════════════════════════════════════════════
// Hormone decay rates (per second)
// ═══════════════════════════════════════════════════════════════════════

const DECAY_RATES: Record<string, number> = {
  cortisol: 0.02,
  dopamine_tonic: 0.03,
  dopamine_phasic: 0.15,    // phasic decays fast
  serotonin: 0.01,
  norepinephrine: 0.05,
  oxytocin: 0.02,
  t3_t4: 0.005,             // thyroid is slow
  anandamide: 0.03,
  melatonin: 0.01,
  il6: 0.04,
  crh: 0.06,
  acth: 0.05,
};

// ═══════════════════════════════════════════════════════════════════════
// EndocrineExpressionBridge
// ═══════════════════════════════════════════════════════════════════════

export class EndocrineExpressionBridge {
  private character: CharacterRegistration;
  private state: EndocrineState;
  private currentExpression: string = 'PHOTO_UpwardGaze';
  private currentMode: CognitiveMode = 'RESTING';
  private expressionHoldTime: number = 0;
  private readonly minHoldMs: number = 500;

  constructor(character: CharacterRegistration) {
    this.character = character;
    this.state = { ...character.endocrine.baselines } as EndocrineState;
  }

  // ─── Endocrine System Tick ─────────────────────────────────────

  /**
   * Advance the endocrine system by dt seconds.
   * Decays all hormones toward baselines.
   */
  tick(dt: number): void {
    const baselines = this.character.endocrine.baselines;
    for (const [hormone, rate] of Object.entries(DECAY_RATES)) {
      const key = hormone as keyof EndocrineState;
      const baseline = (baselines as any)[key] ?? 0;
      const current = this.state[key];
      const diff = current - baseline;
      this.state[key] = baseline + diff * Math.exp(-rate * dt);
    }
    this.expressionHoldTime += dt * 1000;
  }

  /**
   * Fire an endocrine event (e.g., NOVELTY_ENCOUNTERED).
   * Boosts the specified hormones by intensity * sensitivity.
   */
  signalEvent(event: EndocrineEvent): void {
    const sensitivity = this.character.endocrine.sensitivity;
    for (const hormone of event.hormones) {
      const key = hormone as keyof EndocrineState;
      if (key in this.state) {
        // Apply sensitivity multiplier based on event type
        let sensitivityMult = 1.0;
        if (event.type.includes('REWARD') || event.type.includes('GOAL')) {
          sensitivityMult = sensitivity.reward;
        } else if (event.type.includes('THREAT') || event.type.includes('ERROR')) {
          sensitivityMult = sensitivity.threat;
        } else if (event.type.includes('SOCIAL') || event.type.includes('BOND')) {
          sensitivityMult = sensitivity.social;
        } else if (event.type.includes('NOVELTY') || event.type.includes('FLOW')) {
          sensitivityMult = sensitivity.novelty;
        }
        this.state[key] = Math.min(1.0, this.state[key] + event.intensity * sensitivityMult * 0.3);
      }
    }
  }

  // ─── Expression Evaluation ─────────────────────────────────────

  /**
   * Evaluate all expression rules and select the best match.
   * Returns the expression with the highest match score.
   */
  evaluate(): ExpressionEvaluation {
    let bestName = 'PHOTO_UpwardGaze';
    let bestScore = 0;
    let bestMode: CognitiveMode = 'RESTING';

    for (const [exprName, rules] of Object.entries(this.character.expressions)) {
      const score = this.evaluateRule(rules);
      if (score > bestScore) {
        bestScore = score;
        bestName = exprName;
        // Extract cognitive mode from the expression rules
        bestMode = (rules as any).cognitive_mode as CognitiveMode || this.determineCognitiveMode();
      }
    }

    // Enforce minimum hold time to prevent flickering
    if (this.expressionHoldTime < this.minHoldMs && bestScore < 0.9) {
      bestName = this.currentExpression;
      bestMode = this.currentMode;
    } else if (bestName !== this.currentExpression) {
      this.expressionHoldTime = 0;
    }

    this.currentExpression = bestName;
    this.currentMode = bestMode;

    // Compute extra params
    const extraParams = this.computeExtraParams();

    // Determine motion group
    const motionGroup = this.determineMotionGroup(bestMode);

    return {
      expressionName: bestName,
      matchScore: bestScore,
      cognitiveMode: bestMode,
      motionGroup,
      extraParams,
    };
  }

  /**
   * Evaluate a single expression rule against current endocrine state.
   * Returns a score between 0 and 1 (fraction of rules satisfied).
   */
  private evaluateRule(rules: ExpressionRule): number {
    let matched = 0;
    let total = 0;

    for (const [hormone, condition] of Object.entries(rules)) {
      if (hormone === 'cognitive_mode') continue; // skip metadata
      total++;
      const value = (this.state as any)[hormone] ?? 0;
      if (this.checkCondition(value, condition)) {
        matched++;
      }
    }

    return total > 0 ? matched / total : 0;
  }

  /**
   * Check a hormone condition string (e.g., ">0.5", "<0.2").
   */
  private checkCondition(value: number, condition: string): boolean {
    const op = condition.charAt(0);
    const threshold = parseFloat(condition.substring(1));
    switch (op) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '=': return Math.abs(value - threshold) < 0.05;
      default: return false;
    }
  }

  // ─── Cognitive Mode Detection ──────────────────────────────────

  /**
   * Determine cognitive mode from the dominant hormone pattern.
   */
  determineCognitiveMode(): CognitiveMode {
    const s = this.state;

    if (s.cortisol > 0.6 && s.norepinephrine > 0.5) return 'THREAT';
    if (s.cortisol > 0.4 && s.il6 > 0.3) return 'STRESSED';
    if (s.dopamine_phasic > 0.4 && s.norepinephrine > 0.4) return 'EXPLORATORY';
    if (s.dopamine_tonic > 0.5 && s.serotonin > 0.4) return 'REWARD';
    if (s.norepinephrine > 0.5 && s.dopamine_phasic > 0.2) return 'VIGILANT';
    if (s.oxytocin > 0.4 && s.dopamine_tonic > 0.3) return 'SOCIAL';
    if (s.t3_t4 > 0.6 && s.norepinephrine > 0.3) return 'FOCUSED';
    if (s.serotonin > 0.4 && s.anandamide > 0.2) return 'REFLECTIVE';
    if (s.anandamide > 0.3 && s.cortisol < 0.1) return 'RESTING';

    return 'MAINTENANCE';
  }

  // ─── Extra Parameters ──────────────────────────────────────────

  /**
   * Compute ParamExtra01-04 from endocrine drivers.
   */
  computeExtraParams(): Record<string, number> {
    const result: Record<string, number> = {};
    const meshPainter = this.character.meshPainter;
    if (!meshPainter) return result;

    for (const [paramId, config] of Object.entries(meshPainter.extraParams)) {
      const driverValue = (this.state as any)[config.driver] ?? config.default;
      // Map driver value to param range
      const [min, max] = config.range;
      result[paramId] = Math.max(min, Math.min(max, driverValue));
    }

    return result;
  }

  // ─── Motion Group Selection ────────────────────────────────────

  /**
   * Determine the motion group for the current cognitive mode.
   */
  private determineMotionGroup(mode: CognitiveMode): string {
    for (const [group, modes] of Object.entries(this.character.motions)) {
      if (modes.includes(mode)) return group;
    }
    return this.character.idleMotionGroup;
  }

  // ─── Cognitive State Integration ───────────────────────────────

  /**
   * Process a cognitive state change from CoreSelfEngine / Echobeats.
   *
   * This is the main entry point called by the expression tick pipeline.
   * It fires the appropriate endocrine event and returns the resolved expression.
   */
  processCognitiveState(cognitiveState: string, dt: number): ExpressionEvaluation {
    // 1. Fire endocrine event from cognitive state
    const eventConfig = this.character.cognitiveEvents[cognitiveState];
    if (eventConfig) {
      this.signalEvent({
        type: eventConfig.event,
        intensity: eventConfig.intensity,
        hormones: eventConfig.hormones,
      });
    }

    // 2. Tick endocrine system
    this.tick(dt);

    // 3. Evaluate expressions
    const evaluation = this.evaluate();

    // 4. Override with cognitive expression map if available (direct mapping)
    const directExpression = this.character.cognitiveExpressionMap[cognitiveState];
    if (directExpression && evaluation.matchScore < 0.8) {
      evaluation.expressionName = directExpression;
    }

    return evaluation;
  }

  // ─── Accessors ─────────────────────────────────────────────────

  getState(): EndocrineState { return { ...this.state }; }
  getCurrentExpression(): string { return this.currentExpression; }
  getCurrentMode(): CognitiveMode { return this.currentMode; }

  /** Reset to baselines */
  reset(): void {
    this.state = { ...this.character.endocrine.baselines } as EndocrineState;
    this.currentExpression = 'PHOTO_UpwardGaze';
    this.currentMode = 'RESTING';
    this.expressionHoldTime = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════

export function createEndocrineExpressionBridge(
  character: CharacterRegistration,
): EndocrineExpressionBridge {
  return new EndocrineExpressionBridge(character);
}
