/**
 * SuperHotAssessment — Convergence Metrics for the SuperHot-Gamer-Girl Property
 *
 * Tracks how close the avatar is to achieving the full "superhot-gamer-girl" property
 * across multiple dimensions. This isn't a binary state — it's a continuous optimization
 * where each dimension contributes to the overall strategic effectiveness.
 *
 * Integration sources:
 *   - ReZorg/avatar-studio-3d (FACS sliders, morph targets)
 *   - 9cog/toga-pentest-agent (superhot gamergirl assessment)
 *   - ReZorg/gamified-dashboard (reward metrics, progression)
 *   - ReZorg/echontomorph (mathematical avatar evolution)
 *   - o9nn/deltecho-skill-diffusion (skill learning trajectories)
 *
 * The assessment feeds back into the AngelicaDiary to guide strategy selection
 * and into the AngelicaStrategicDriver to adjust cost functions dynamically.
 */

import type { EndocrineState } from './types.js';

// ────────────────────────────────────────────────────────────────
// Assessment Dimensions
// ────────────────────────────────────────────────────────────────

/** The N dimensions that compose "superhot-gamer-girl" as a property */
export interface SuperHotDimensions {
  /** Visual presentation quality (outfit, grooming, posture, aesthetics) */
  visualPresentation: DimensionScore;
  /** Social calibration (reading rooms, timing, context awareness) */
  socialCalibration: DimensionScore;
  /** Charm effectiveness (conversion rate of targets) */
  charmEffectiveness: DimensionScore;
  /** Aesthetic coherence (brand consistency across contexts) */
  aestheticCoherence: DimensionScore;
  /** Confidence projection (endocrine stability under pressure) */
  confidenceProjection: DimensionScore;
  /** Network density (size and quality of simp network) */
  networkDensity: DimensionScore;
  /** Recovery grace (how quickly after setbacks → composure returns) */
  recoveryGrace: DimensionScore;
  /** Strategic dominance (ratio of seduction-wins to violence-attempts) */
  strategicDominance: DimensionScore;
  /** Mystique factor (perceived unattainability / challenge level) */
  mystiqueFactor: DimensionScore;
  /** Adaptive fashion (ability to dress appropriately for any context) */
  adaptiveFashion: DimensionScore;
}

/** Score for a single dimension */
export interface DimensionScore {
  /** Current score (0-1) */
  current: number;
  /** Historical peak */
  peak: number;
  /** Trend direction (-1 to +1, positive = improving) */
  trend: number;
  /** Number of data points this score is based on */
  sampleCount: number;
  /** Last N measurements for trend calculation */
  recentHistory: number[];
}

/** Overall convergence assessment */
export interface ConvergenceReport {
  /** Overall SuperHot score (weighted combination of all dimensions) */
  overallScore: number;
  /** Individual dimension scores */
  dimensions: SuperHotDimensions;
  /** Which dimensions are dragging the score down */
  weakDimensions: string[];
  /** Which dimensions are at peak performance */
  strongDimensions: string[];
  /** Recommended focus area for improvement */
  recommendedFocus: string;
  /** Estimated strategic cost reduction from current score */
  seductionCostReduction: number;
  /** Timestamp of this report */
  timestamp: number;
}

// ────────────────────────────────────────────────────────────────
// Assessment Configuration
// ────────────────────────────────────────────────────────────────

/** Weights for each dimension in the overall score */
export const DIMENSION_WEIGHTS: Record<keyof SuperHotDimensions, number> = {
  visualPresentation: 0.15,
  socialCalibration: 0.15,
  charmEffectiveness: 0.15,
  aestheticCoherence: 0.08,
  confidenceProjection: 0.12,
  networkDensity: 0.10,
  recoveryGrace: 0.08,
  strategicDominance: 0.10,
  mystiqueFactor: 0.05,
  adaptiveFashion: 0.02,
};

/** Thresholds for classification */
const WEAK_THRESHOLD = 0.4;
const STRONG_THRESHOLD = 0.75;
const HISTORY_LENGTH = 20;

// ────────────────────────────────────────────────────────────────
// Assessment System
// ────────────────────────────────────────────────────────────────

/**
 * SuperHotAssessment — Continuous evaluation of avatar convergence.
 *
 * Workflow:
 * 1. Events feed into dimension measurements
 * 2. Measurements update running scores with exponential moving average
 * 3. Convergence reports track progress over time
 * 4. Weak dimensions trigger diary entries (learning opportunities)
 * 5. Strong dimensions reduce strategic costs (positive feedback)
 */
export class SuperHotAssessment {
  private dimensions: SuperHotDimensions;
  private reportHistory: ConvergenceReport[] = [];

  constructor() {
    this.dimensions = this.initializeDimensions();
  }

  /**
   * Record a measurement for a specific dimension.
   * Called by the strategic driver when relevant events occur.
   */
  recordMeasurement(
    dimension: keyof SuperHotDimensions,
    value: number,
  ): void {
    const d = this.dimensions[dimension];
    const clampedValue = Math.max(0, Math.min(1, value));

    // Exponential moving average
    const alpha = 0.2;
    d.current = d.current * (1 - alpha) + clampedValue * alpha;
    d.peak = Math.max(d.peak, d.current);
    d.sampleCount++;

    // Update history for trend
    d.recentHistory.push(clampedValue);
    if (d.recentHistory.length > HISTORY_LENGTH) {
      d.recentHistory.shift();
    }

    // Compute trend
    d.trend = this.computeTrend(d.recentHistory);
  }

  /**
   * Record a social interaction outcome.
   * Automatically maps to the appropriate dimensions.
   */
  recordSocialOutcome(outcome: SocialOutcome): void {
    // Charm attempt result → charmEffectiveness
    if (outcome.type === 'charm_attempt') {
      this.recordMeasurement('charmEffectiveness', outcome.success ? 0.9 : 0.2);
    }

    // Social calibration — did we read the room correctly?
    if (outcome.contextAppropriate !== undefined) {
      this.recordMeasurement('socialCalibration', outcome.contextAppropriate ? 0.85 : 0.2);
    }

    // Network growth
    if (outcome.networkDelta) {
      const currentNetwork = this.dimensions.networkDensity.current;
      this.recordMeasurement('networkDensity',
        Math.min(1, currentNetwork + outcome.networkDelta * 0.1),
      );
    }

    // Confidence under pressure
    if (outcome.underPressure) {
      this.recordMeasurement('confidenceProjection',
        outcome.maintainedComposure ? 0.9 : 0.3,
      );
    }

    // Recovery from setback
    if (outcome.wasSetback && outcome.recoveryTime !== undefined) {
      // Fast recovery = high score (< 5 seconds conceptual time = 1.0)
      this.recordMeasurement('recoveryGrace',
        Math.max(0, 1 - outcome.recoveryTime / 30),
      );
    }

    // Strategic choice tracking
    if (outcome.choseCharmOverViolence !== undefined) {
      this.recordMeasurement('strategicDominance',
        outcome.choseCharmOverViolence ? 0.9 : 0.1,
      );
    }
  }

  /**
   * Record an appearance/fashion event.
   */
  recordAppearanceEvent(event: AppearanceEvent): void {
    if (event.type === 'outfit_assessment') {
      this.recordMeasurement('visualPresentation', event.score);
      this.recordMeasurement('aestheticCoherence', event.brandConsistency);
    }
    if (event.type === 'context_dress') {
      this.recordMeasurement('adaptiveFashion', event.appropriateness);
    }
    if (event.type === 'mystique_moment') {
      this.recordMeasurement('mystiqueFactor', event.perceivedRarity);
    }
  }

  /**
   * Generate a full convergence report.
   */
  generateReport(): ConvergenceReport {
    const weakDimensions: string[] = [];
    const strongDimensions: string[] = [];

    for (const [key, dim] of Object.entries(this.dimensions)) {
      if (dim.current < WEAK_THRESHOLD) weakDimensions.push(key);
      if (dim.current >= STRONG_THRESHOLD) strongDimensions.push(key);
    }

    // Find lowest-weighted-impact dimension for focus recommendation
    let lowestWeightedScore = Infinity;
    let recommendedFocus = 'visualPresentation';
    for (const [key, weight] of Object.entries(DIMENSION_WEIGHTS)) {
      const dimKey = key as keyof SuperHotDimensions;
      const weightedScore = this.dimensions[dimKey].current * weight;
      if (weightedScore < lowestWeightedScore && weight > 0.05) {
        lowestWeightedScore = weightedScore;
        recommendedFocus = key;
      }
    }

    const overallScore = this.computeOverallScore();

    const report: ConvergenceReport = {
      overallScore,
      dimensions: { ...this.dimensions },
      weakDimensions,
      strongDimensions,
      recommendedFocus,
      seductionCostReduction: this.computeCostReduction(overallScore),
      timestamp: Date.now(),
    };

    this.reportHistory.push(report);
    return report;
  }

  /**
   * Get the current overall SuperHot score.
   * Used by AngelicaStrategicDriver to adjust seduction cost.
   */
  getOverallScore(): number {
    return this.computeOverallScore();
  }

  /**
   * Get the seduction cost modifier based on current assessment.
   * Lower score = cheaper seduction (returns range 0.6 to 1.0).
   */
  getSeductionCostModifier(): number {
    const score = this.computeOverallScore();
    // High superhot score → lower seduction cost
    return 1.0 - (score * 0.4);
  }

  /**
   * Get dimension scores for display or logging.
   */
  getDimensionSummary(): Record<string, { score: number; trend: string }> {
    const result: Record<string, { score: number; trend: string }> = {};
    for (const [key, dim] of Object.entries(this.dimensions)) {
      result[key] = {
        score: Math.round(dim.current * 100) / 100,
        trend: dim.trend > 0.05 ? '↑' : dim.trend < -0.05 ? '↓' : '→',
      };
    }
    return result;
  }

  /**
   * Get report history for progress visualization.
   */
  getProgressHistory(count = 10): ConvergenceReport[] {
    return this.reportHistory.slice(-count);
  }

  // ── Private helpers ──────────────────────────────────────────

  private computeOverallScore(): number {
    let total = 0;
    for (const [key, weight] of Object.entries(DIMENSION_WEIGHTS)) {
      const dimKey = key as keyof SuperHotDimensions;
      total += this.dimensions[dimKey].current * weight;
    }
    return total;
  }

  private computeCostReduction(overallScore: number): number {
    // Sigmoid-ish: low score → minimal reduction, high score → up to 40% reduction
    return Math.max(0, overallScore * 0.4);
  }

  private computeTrend(history: number[]): number {
    if (history.length < 3) return 0;
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    if (older.length === 0) return 0;
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return Math.max(-1, Math.min(1, (recentAvg - olderAvg) * 5));
  }

  private initializeDimensions(): SuperHotDimensions {
    const defaultDim = (): DimensionScore => ({
      current: 0.3,
      peak: 0.3,
      trend: 0,
      sampleCount: 0,
      recentHistory: [0.3],
    });

    return {
      visualPresentation: defaultDim(),
      socialCalibration: defaultDim(),
      charmEffectiveness: defaultDim(),
      aestheticCoherence: defaultDim(),
      confidenceProjection: defaultDim(),
      networkDensity: { ...defaultDim(), current: 0.1, peak: 0.1, recentHistory: [0.1] },
      recoveryGrace: defaultDim(),
      strategicDominance: defaultDim(),
      mystiqueFactor: defaultDim(),
      adaptiveFashion: { ...defaultDim(), current: 0.1, peak: 0.1, recentHistory: [0.1] },
    };
  }
}

// ────────────────────────────────────────────────────────────────
// Event Types for Recording
// ────────────────────────────────────────────────────────────────

export interface SocialOutcome {
  type: 'charm_attempt' | 'social_interaction' | 'conflict';
  success: boolean;
  contextAppropriate?: boolean;
  networkDelta?: number;
  underPressure?: boolean;
  maintainedComposure?: boolean;
  wasSetback?: boolean;
  recoveryTime?: number;
  choseCharmOverViolence?: boolean;
}

export interface AppearanceEvent {
  type: 'outfit_assessment' | 'context_dress' | 'mystique_moment';
  score: number;
  brandConsistency: number;
  appropriateness: number;
  perceivedRarity: number;
}

// ────────────────────────────────────────────────────────────────
// Avatar Rig Assessment Pipeline (for mesh-painter integration)
// ────────────────────────────────────────────────────────────────

/**
 * Defines the target visual properties that the mesh rig should achieve.
 * Used by the mesh-painter skill to evaluate how close the rendered avatar
 * matches the "superhot-gamer-girl" archetype.
 */
export interface AvatarRigTarget {
  /** FACS Action Unit targets for resting expression */
  restingFACS: {
    AU1_innerBrowRaise: number;  // Slight — subtle expressiveness
    AU2_outerBrowRaise: number;  // Minimal — not surprised
    AU6_cheekRaise: number;      // Moderate — warm eyes
    AU12_lipCornerPull: number;  // Slight — hint of knowing smile
    AU25_lipsPart: number;       // Minimal — relaxed mouth
    AU43_eyesClosed: number;     // 0 — alert, present
  };
  /** Body language targets */
  posture: {
    headTilt: number;           // 5-10° — engaged but not submissive
    shoulderRelaxation: number; // 0.7 — confident ease
    spineAlignment: number;     // 0.9 — upright without rigidity
    hipShift: number;           // 0.3 — subtle asymmetric stance (contrapposto)
  };
  /** Color palette targets */
  palette: {
    primary: string;            // Deep violet or cyberpunk teal
    accent: string;             // Amber/gold for bioluminescent accents
    skin: string;               // Warm neutral (customizable)
    hair: string;               // Dynamic (color shifts with mood via endocrine)
  };
  /** Accessory slots that contribute to mystique/visual interest */
  accessories: string[];
}

/** Default target for Angelica's avatar rig */
export const ANGELICA_RIG_TARGET: AvatarRigTarget = {
  restingFACS: {
    AU1_innerBrowRaise: 0.15,
    AU2_outerBrowRaise: 0.05,
    AU6_cheekRaise: 0.35,
    AU12_lipCornerPull: 0.2,
    AU25_lipsPart: 0.1,
    AU43_eyesClosed: 0.0,
  },
  posture: {
    headTilt: 7,
    shoulderRelaxation: 0.7,
    spineAlignment: 0.9,
    hipShift: 0.3,
  },
  palette: {
    primary: '#6B2FA0',    // Deep violet
    accent: '#FFB800',     // Amber bioluminescent
    skin: '#D4A574',       // Warm neutral
    hair: '#1A1A2E',       // Dark with holographic undertones
  },
  accessories: [
    'cyberpunk_choker_led',
    'holographic_face_decals',
    'statement_earrings',
    'smart_contact_lenses',
    'bioluminescent_nail_art',
  ],
};
