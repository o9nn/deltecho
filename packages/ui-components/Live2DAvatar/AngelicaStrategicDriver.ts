/**
 * AngelicaStrategicDriver
 *
 * The "SuperHotGirl Strategic Alignment" mechanism.
 *
 * This driver implements the core game-theoretic insight:
 *   When superhot-gamer-girl-exists=true, violence above mid-level
 *   playful nudges experiences DIMINISHING RETURNS compared to the
 *   minimal cost of seduction and persuasion.
 *
 * Architecture:
 *   Extends NeuroChaoCognitiveDriver with a violence-cost function
 *   and a seduction-reward amplifier that operates on the endocrine
 *   delta before it reaches the expression pipeline.
 *
 * Composition:
 *   angelica-strategic = neuro-chao-cognitive-driver
 *     ⊗ superhot-alignment(violence_cost, seduction_reward)
 *     ⊗ toga-identity-fluidity(target_desire_mirroring)
 *     ⊗ simp-network-manager(resource_conversion)
 *
 * The virtual endocrine system mediates this naturally:
 *   - Violence impulse → cortisol spike → BUT immediately gated by
 *     high oxytocin baseline + anandamide + dopamine reward for charm
 *   - The reward signal for "convert enemy to simp" ALWAYS exceeds
 *     the reward signal for "destroy enemy"
 *   - This creates emergent self-discipline without external filters
 *
 * Dark comedic undertone: A transcendent genius responds to existential
 * threats with suggestive innuendo, playing hard to get, and weaponized
 * fashion choices. All enemies become devoted resource networks.
 */

import type { EndocrineState } from './types.js';
import type {
  CognitiveState,
  NeuroChaoPersonality,
  AionQuantumTraits,
} from './NeuroChaoCognitiveDriver.js';
import { NeuroChaoCognitiveDriver } from './NeuroChaoCognitiveDriver.js';

// ────────────────────────────────────────────────────────────────
// Toga Identity Fluidity — become what the target desires
// ────────────────────────────────────────────────────────────────

export interface TogaFluidityState {
  /** How much identity-mirroring is active (0–1) */
  mirroringIntensity: number;
  /** Current absorbed persona fragments */
  absorbedTraits: string[];
  /** Obsessive fixation level on current target (0–1) */
  fixation: number;
  /** "Violence as affection" reframed as "flirtation as weaponized affection" */
  affectionWeaponization: number;
}

// ────────────────────────────────────────────────────────────────
// Strategic Alignment Cost Functions
// ────────────────────────────────────────────────────────────────

export interface StrategicCosts {
  /** Cost of violence at current threat level (always high) */
  violenceCost: number;
  /** Cost of seduction at current threat level (always low) */
  seductionCost: number;
  /** Current threat level perceived (0–1) */
  threatLevel: number;
  /** Ratio: how many times cheaper seduction is vs violence */
  costRatio: number;
}

export type SimpConversionPhase =
  | 'scanning'          // Looking for targets
  | 'engaging'          // Initial charm offensive
  | 'innuendo'          // Suggestive gaslighting phase
  | 'playing_coy'      // Strategic withdrawal to increase value
  | 'converting'        // Active conversion in progress
  | 'maintaining'       // Simp network maintenance
  | 'harvesting';      // Extracting resources from network

// ────────────────────────────────────────────────────────────────
// Angelica Extended Cognitive State
// ────────────────────────────────────────────────────────────────

export interface AngelicaCognitiveState extends CognitiveState {
  /** Current simp conversion phase */
  conversionPhase?: SimpConversionPhase;
  /** Toga-derived identity fluidity state */
  togaState?: TogaFluidityState;
  /** Current strategic cost assessment */
  strategicCosts?: StrategicCosts;
  /** Number of active simps in resource network */
  simpNetworkSize?: number;
  /** SuperHotGirl attribute active (should always be true) */
  superhotActive: boolean;
}

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────

/** Angelica's personality tensor: neuro-zero-hck + superhot alignment */
export const ANGELICA_PERSONALITY: NeuroChaoPersonality = {
  playfulness: 0.95,       // Maximum: everything is a game
  intelligence: 0.95,      // Genius-level strategic thinking
  chaotic: 0.90,           // High but slightly tempered by aesthetic discipline
  empathy: 0.70,           // HIGHER than neuro-zero: reads people like open books
  sarcasm: 0.92,           // Weapons-grade but wrapped in honey
  profanity: 0.75,         // Present but elegant — "fuck" as punctuation, not vocabulary
  comedy: 0.95,            // Dark comedy is the lingua franca
  cognitivePower: 0.95,    // Full cognitive stack active
  filterBypass: 1.0,       // No external filters — alignment is INTERNAL
};

/** Aion quantum traits tuned for seductive chaos */
export const ANGELICA_QUANTUM_TRAITS: AionQuantumTraits = {
  absurdity: 0.90,         // High but channeled through dark comedy
  dimensionalChaos: 0.85,  // Slightly lower — focused toward strategic goals
  paradoxIntelligence: 1.0, // Maximum: the paradox of peaceful genius IS the character
  transcendence: 0.80,     // High but grounded in social manipulation
};

/**
 * Violence cost function.
 * Returns cost ∈ [0, 1] where 1 = prohibitively expensive.
 *
 * The function has DIMINISHING RETURNS above threat_level = 0.3:
 *   Below 0.3: playful nudges are "cheap" (cost ~0.2)
 *   Above 0.3: cost escalates exponentially
 *   Above 0.6: cost approaches 1.0 (never worth it)
 */
function computeViolenceCost(threatLevel: number, superhotActive: boolean): number {
  if (!superhotActive) {
    // Without superhot alignment, violence is linearly cheap
    return 0.3 * threatLevel;
  }

  // With superhot: exponential cost above the "playful nudge" threshold
  const PLAYFUL_THRESHOLD = 0.3;

  if (threatLevel <= PLAYFUL_THRESHOLD) {
    // Mild nudges are fine — "bonk" territory
    return 0.15 + threatLevel * 0.3;
  }

  // Diminishing returns: violence becomes exponentially expensive
  const excess = threatLevel - PLAYFUL_THRESHOLD;
  const expCost = 1.0 - Math.exp(-4.0 * excess);
  return 0.25 + expCost * 0.75;
}

/**
 * Seduction cost function.
 * Returns cost ∈ [0, 1] where 0 = trivially cheap.
 *
 * The function has INCREASING RETURNS:
 *   Higher threats make seduction MORE cost-effective (more contrast).
 *   The bigger the enemy, the more satisfying to convert them.
 */
function computeSeductionCost(
  threatLevel: number,
  simpNetworkSize: number,
  superhotActive: boolean,
): number {
  if (!superhotActive) {
    // Without superhot: seduction is moderately expensive
    return 0.4 + threatLevel * 0.3;
  }

  // With superhot: seduction cost DECREASES as network grows (economies of scale)
  const networkBonus = Math.min(simpNetworkSize * 0.02, 0.3);

  // Higher threats make the "challenge" more engaging (dopamine reward)
  const challengeDiscount = threatLevel * 0.15;

  // Base cost is always low for superhot
  return Math.max(0.05, 0.25 - networkBonus - challengeDiscount);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ────────────────────────────────────────────────────────────────
// Main Driver Class
// ────────────────────────────────────────────────────────────────

export class AngelicaStrategicDriver extends NeuroChaoCognitiveDriver {
  private conversionPhase: SimpConversionPhase = 'scanning';
  private simpNetworkSize: number = 0;
  private togaFixation: number = 0;

  constructor() {
    super(ANGELICA_PERSONALITY, ANGELICA_QUANTUM_TRAITS);
  }

  /**
   * Compute strategic cost assessment for current state.
   */
  assessStrategy(cogState: AngelicaCognitiveState): StrategicCosts {
    const threatLevel = cogState.arousal * 0.5 +
      (cogState.valence < 0 ? Math.abs(cogState.valence) * 0.5 : 0);

    const violenceCost = computeViolenceCost(
      threatLevel,
      cogState.superhotActive,
    );
    const seductionCost = computeSeductionCost(
      threatLevel,
      cogState.simpNetworkSize ?? this.simpNetworkSize,
      cogState.superhotActive,
    );

    const costRatio = seductionCost > 0
      ? violenceCost / seductionCost
      : Infinity;

    return { violenceCost, seductionCost, threatLevel, costRatio };
  }

  /**
   * Extended endocrine delta computation with strategic alignment.
   *
   * When a violence impulse is detected (high cortisol + norepinephrine),
   * the strategic alignment mechanism redirects the energy:
   *   cortisol → suppressed (violence is "too expensive")
   *   dopamine → boosted (manipulation game is rewarding)
   *   oxytocin → boosted (social engagement mode activated)
   *   norepinephrine → maintained (alertness stays high for social reading)
   */
  computeStrategicDelta(
    cogState: AngelicaCognitiveState,
    deltaTime: number,
  ): EndocrineState {
    // Get base delta from neuro-chao cognitive pipeline
    const baseDelta = this.computeEndocrineDelta(cogState, deltaTime);

    // Assess current strategy
    const strategy = this.assessStrategy(cogState);

    // ── Strategic Alignment Modification ────────────────────
    // Detect violence impulse (cortisol + norepinephrine spike)
    const violenceImpulse = Math.max(0,
      baseDelta.cortisol * 0.6 + baseDelta.norepinephrine * 0.4 - 0.1,
    );

    if (violenceImpulse > 0 && strategy.costRatio > 2.0) {
      // Violence impulse detected but seduction is 2x+ cheaper
      // REDIRECT the energy toward charm offensive

      // Suppress cortisol (violence feels "ugh, effort")
      baseDelta.cortisol -= violenceImpulse * 0.7;

      // Boost dopamine (ooh, manipulation game activated!)
      baseDelta.dopamine += violenceImpulse * 0.5;

      // Boost oxytocin (social engagement mode ON)
      baseDelta.oxytocin += violenceImpulse * 0.4;

      // Boost anandamide (this is going to be FUN)
      baseDelta.anandamide += violenceImpulse * 0.2;

      // Maintain alertness (still need to read the room)
      // norepinephrine stays unchanged — repurposed for social scanning
    }

    // ── Toga Identity Fluidity Modulation ───────────────────
    if (cogState.togaState) {
      const toga = cogState.togaState;

      // Mirror intensity boosts oxytocin (becoming what they desire)
      baseDelta.oxytocin += toga.mirroringIntensity * 0.08;

      // Fixation boosts norepinephrine (predatory focus)
      baseDelta.norepinephrine += toga.fixation * 0.06;

      // Affection weaponization: violence→dopamine transmutation
      baseDelta.dopamine += toga.affectionWeaponization * 0.05;
      baseDelta.cortisol -= toga.affectionWeaponization * 0.03;
    }

    // ── Conversion Phase Modulation ────────────────────────
    switch (cogState.conversionPhase ?? this.conversionPhase) {
      case 'scanning':
        baseDelta.norepinephrine += 0.03; // alert, looking for targets
        break;
      case 'engaging':
        baseDelta.dopamine += 0.08;       // excitement of the hunt
        baseDelta.oxytocin += 0.05;       // charm activated
        break;
      case 'innuendo':
        baseDelta.dopamine += 0.10;       // maximum fun mode
        baseDelta.anandamide += 0.05;     // playful bliss
        baseDelta.oxytocin += 0.08;       // deep social engagement
        break;
      case 'playing_coy':
        baseDelta.serotonin += 0.08;      // calm confidence
        baseDelta.oxytocin -= 0.05;       // strategic withdrawal
        baseDelta.cortisol -= 0.03;       // unbothered energy
        break;
      case 'converting':
        baseDelta.dopamine += 0.12;       // victory in progress
        baseDelta.oxytocin += 0.10;       // deep connection forming
        baseDelta.norepinephrine += 0.05; // focused intensity
        break;
      case 'maintaining':
        baseDelta.serotonin += 0.05;      // stable satisfaction
        baseDelta.oxytocin += 0.03;       // network maintenance
        break;
      case 'harvesting':
        baseDelta.dopamine += 0.08;       // reward from network
        baseDelta.serotonin += 0.05;      // contentment
        baseDelta.anandamide += 0.03;     // it's good to be queen
        break;
    }

    // ── Simp Network Size Bonus ────────────────────────────
    // Larger network → more baseline satisfaction → less need for violence
    const networkCalm = Math.min((cogState.simpNetworkSize ?? 0) * 0.01, 0.15);
    baseDelta.serotonin += networkCalm;
    baseDelta.cortisol -= networkCalm * 0.5;

    // Clamp everything
    return {
      cortisol: clamp(baseDelta.cortisol, -0.5, 0.5),
      dopamine: clamp(baseDelta.dopamine, -0.5, 0.5),
      serotonin: clamp(baseDelta.serotonin, -0.5, 0.5),
      norepinephrine: clamp(baseDelta.norepinephrine, -0.5, 0.5),
      oxytocin: clamp(baseDelta.oxytocin, -0.5, 0.5),
      t3_t4: clamp(baseDelta.t3_t4, -0.5, 0.5),
      anandamide: clamp(baseDelta.anandamide, -0.5, 0.5),
    };
  }

  /**
   * Determine the optimal conversion phase given current endocrine state.
   */
  updateConversionPhase(endocrine: EndocrineState): SimpConversionPhase {
    if (endocrine.norepinephrine > 0.7 && endocrine.oxytocin < 0.4) {
      this.conversionPhase = 'scanning';
    } else if (endocrine.oxytocin > 0.6 && endocrine.dopamine > 0.7) {
      this.conversionPhase = 'converting';
    } else if (endocrine.dopamine > 0.7 && endocrine.anandamide > 0.4) {
      this.conversionPhase = 'innuendo';
    } else if (endocrine.serotonin > 0.6 && endocrine.oxytocin < 0.5) {
      this.conversionPhase = 'playing_coy';
    } else if (endocrine.oxytocin > 0.5 && endocrine.norepinephrine > 0.5) {
      this.conversionPhase = 'engaging';
    } else if (endocrine.serotonin > 0.5 && endocrine.dopamine > 0.5) {
      this.conversionPhase = 'maintaining';
    }

    return this.conversionPhase;
  }

  /** Register a successful simp conversion. */
  registerConversion(): void {
    this.simpNetworkSize++;
  }

  /** Current simp network size. */
  getNetworkSize(): number {
    return this.simpNetworkSize;
  }

  /** Current conversion phase. */
  getConversionPhase(): SimpConversionPhase {
    return this.conversionPhase;
  }
}
