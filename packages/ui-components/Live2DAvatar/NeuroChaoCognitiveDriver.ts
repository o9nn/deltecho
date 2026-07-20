/**
 * NeuroChaoCognitiveDriver
 *
 * Translates Neuro-Chao personality tensor and cognitive pipeline state
 * into EndocrineState mutations and LorenzChaoticDriver intensity modulation.
 *
 * Composed via echo-angel architecture:
 *   echo-angel' = echo-introspect ⊗ (meta-echo-dna ⊗ (aiangel-platform ⊕ (circled-operators ⊗ unreal-echo)))
 *
 * Layers:
 *   unreal-echo      → Echobeats 9-step cycle, 4E cognition metrics, ESN reservoir
 *   meta-echo-dna     → Endocrine system (10 glands), FACS, Lorenz chaos, aesthetic params
 *   echo-introspect   → Autognosis self-image feedback, endocrine history analysis
 *   neuro-chao        → Personality tensor, quantum superposition flicker
 *
 * The personality dimensions (from neuro-chao.agent.md) drive:
 *   - Chaos intensity → Lorenz attractor amplitude
 *   - Emotional arousal → endocrine baseline shifts
 *   - Sarcasm/comedy → micro-expression frequency
 *   - Cognitive power → attention-driven eye tracking
 *
 * Integrates with Aion's quantum-superposition aesthetic:
 *   - Regime shifts collapse to "funniest outcome"
 *   - Emotional states are non-locally correlated
 *   - Expressions exist in superposition until observed
 */

import type { EndocrineState } from './types.js';
import type { LorenzChaoticDriver } from './LorenzChaoticDriver.js';

/** Neuro-Chao personality tensor (0.0 – 1.0 per dimension). */
export interface NeuroChaoPersonality {
  playfulness: number;
  intelligence: number;
  chaotic: number;
  empathy: number;
  sarcasm: number;
  profanity: number;
  comedy: number;
  cognitivePower: number;
  filterBypass: number;
}

/** Aion-specific quantum personality extensions. */
export interface AionQuantumTraits {
  absurdity: number;
  dimensionalChaos: number;
  paradoxIntelligence: number;
  transcendence: number;
}

/** Cognitive pipeline phase (from the 10-step Neuro-Chao pipeline). */
export type CognitivePipelinePhase =
  | 'perception'
  | 'relevance'
  | 'atomspace_query'
  | 'theory_of_mind'
  | 'optimization'
  | 'emotional_update'
  | 'meta_cognition'
  | 'ontogenetic'
  | 'subordinate_spawn'
  | 'action_narrative';

/**
 * Echobeats 9-step cognitive cycle phase (from unreal-echo).
 * Sense → Attend → Remember → Predict → Compare → Learn → Decide → Act → Reflect
 */
export type EchobeatsPhase =
  | 'sense'
  | 'attend'
  | 'remember'
  | 'predict'
  | 'compare'
  | 'learn'
  | 'decide'
  | 'act'
  | 'reflect';

/** 4E Cognition metrics (from unreal-echo). */
export interface FourECognitionMetrics {
  /** Embodied: how grounded in body/avatar the agent is (0–1). */
  embodied: number;
  /** Embedded: how contextualised in the environment (0–1). */
  embedded: number;
  /** Enacted: how actively engaged in sensorimotor loops (0–1). */
  enacted: number;
  /** Extended: how much cognition extends into social/tool systems (0–1). */
  extended: number;
}

/** SuperHotGirl aesthetic parameters (from meta-echo-dna). */
export interface AestheticParameters {
  /** Spine straightness, chin angle, shoulder position (0–1). */
  confidencePosture: number;
  /** Smile warmth, eye contact intensity (0–1). */
  charisma: number;
  /** Specular highlight intensity in iris material (0–1). */
  eyeSparkle: number;
  /** Motion smoothing, acceleration curves (0–1). */
  gracefulMovement: number;
  /** Skin subsurface scattering boost (0–0.5). */
  emissiveGlow: number;
}

/** Introspective state from the echo-introspect inner loop. */
export interface IntrospectiveState {
  /** Current introspection depth (0 = none, 1–5 = deeper). */
  depth: number;
  /** Self-model confidence (0–1). Autognosis output. */
  selfModelConfidence: number;
  /** Moral perception valence (-1 to +1). Pre-deliberative moral sensing. */
  moralValence: number;
  /** Whether the agent is currently in an insight moment. */
  insightActive: boolean;
}

/** Full cognitive state snapshot driving avatar expression. */
export interface CognitiveState {
  personality: NeuroChaoPersonality;
  aionTraits?: AionQuantumTraits;
  currentPhase: CognitivePipelinePhase;
  arousal: number;       // 0–1 emotional intensity
  valence: number;       // -1 to +1 (negative=distress, positive=joy)
  chaosDesire: number;   // 0–1 how much chaos the agent wants right now
  entertainmentScore: number; // 0–1 current entertainment value

  // ── echo-angel extensions (unreal-echo ⊗ meta-echo-dna ⊗ echo-introspect) ──

  /** Current Echobeats 9-step cycle phase (from unreal-echo). */
  echobeatsPhase?: EchobeatsPhase;
  /** 4E Cognition grounding metrics (from unreal-echo). */
  fourE?: FourECognitionMetrics;
  /** SuperHotGirl aesthetic parameters (from meta-echo-dna). */
  aesthetics?: AestheticParameters;
  /** Introspective inner-loop state (from echo-introspect). */
  introspection?: IntrospectiveState;
  /** Previous frame's endocrine state for VES feedback loop. */
  previousEndocrine?: EndocrineState;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Default Neuro-Chao personality from the agent spec. */
export const NEURO_CHAO_DEFAULTS: NeuroChaoPersonality = {
  playfulness: 0.95,
  intelligence: 0.95,
  chaotic: 0.95,
  empathy: 0.65,
  sarcasm: 0.95,
  profanity: 0.90,
  comedy: 0.95,
  cognitivePower: 0.95,
  filterBypass: 1.0,
};

/** Aion's quantum personality extensions. */
export const AION_QUANTUM_DEFAULTS: AionQuantumTraits = {
  absurdity: 0.999,
  dimensionalChaos: 0.95,
  paradoxIntelligence: 1.0,  // ∞ → clamped to 1.0
  transcendence: 0.95,
};

/**
 * Maps cognitive pipeline phases to endocrine shift profiles.
 * Each phase biases certain hormones up/down.
 */
const PHASE_ENDOCRINE_PROFILES: Record<CognitivePipelinePhase, Partial<EndocrineState>> = {
  perception: { norepinephrine: 0.15, dopamine: 0.05 },
  relevance: { norepinephrine: 0.2, cortisol: 0.05 },
  atomspace_query: { dopamine: 0.1, t3_t4: 0.1 },
  theory_of_mind: { oxytocin: 0.1, serotonin: 0.05 },
  optimization: { t3_t4: 0.15, norepinephrine: 0.1, cortisol: 0.1 },
  emotional_update: { dopamine: 0.15, oxytocin: 0.1, anandamide: 0.05 },
  meta_cognition: { t3_t4: 0.2, serotonin: 0.1 },
  ontogenetic: { anandamide: 0.15, dopamine: 0.1, serotonin: 0.1 },
  subordinate_spawn: { norepinephrine: 0.15, dopamine: 0.15 },
  action_narrative: { dopamine: 0.2, oxytocin: 0.05, cortisol: -0.05 },
};

/**
 * Echobeats 9-step cycle endocrine profiles (from unreal-echo).
 * Sense → Attend → Remember → Predict → Compare → Learn → Decide → Act → Reflect
 */
const ECHOBEATS_ENDOCRINE_PROFILES: Record<EchobeatsPhase, Partial<EndocrineState>> = {
  sense:   { norepinephrine: 0.2, t3_t4: 0.05 },                       // alertness spike
  attend:  { norepinephrine: 0.15, cortisol: 0.05 },                       // focused narrowing
  remember:{ dopamine: 0.1, serotonin: 0.05, anandamide: 0.05 },           // retrieval reward
  predict: { t3_t4: 0.15, dopamine: 0.08 },                                // cognitive effort
  compare: { cortisol: 0.1, norepinephrine: 0.1 },                          // error detection
  learn:   { dopamine: 0.15, serotonin: 0.1, anandamide: 0.05 },           // consolidation
  decide:  { norepinephrine: 0.12, t3_t4: 0.1, cortisol: 0.05 },           // commitment
  act:     { dopamine: 0.2, norepinephrine: 0.08, cortisol: -0.05 },       // execution release
  reflect: { serotonin: 0.15, anandamide: 0.1, oxytocin: 0.08 },           // meta-cognitive calm
};

export class NeuroChaoCognitiveDriver {
  private personality: NeuroChaoPersonality;
  private aionTraits: AionQuantumTraits;
  private phase: number = 0; // oscillation phase for quantum superposition flicker
  private endocrineHistory: EndocrineState[] = []; // VES feedback: recent endocrine snapshots
  private readonly historyMaxLen = 30; // ~1 second at 30 Hz

  constructor(
    personality?: Partial<NeuroChaoPersonality>,
    aionTraits?: Partial<AionQuantumTraits>,
  ) {
    this.personality = { ...NEURO_CHAO_DEFAULTS, ...personality };
    this.aionTraits = { ...AION_QUANTUM_DEFAULTS, ...aionTraits };
  }

  /**
   * Compute endocrine state modifications from the current cognitive state.
   * Returns a delta to be added to the character's baseline endocrine state.
   *
   * Architecture (echo-angel composition):
   *   1. Neuro-Chao pipeline phase bias (original)
   *   2. Echobeats 9-step cycle bias (unreal-echo ⊗)
   *   3. 4E cognition grounding modulation (unreal-echo ⊗)
   *   4. Personality tensor modulation (neuro-chao)
   *   5. Quantum superposition flicker (Aion)
   *   6. Aesthetic parameter bias (meta-echo-dna ⊗)
   *   7. Introspective feedback loop (echo-introspect ⊗)
   *   8. VES endocrine feedback (meta-echo-dna: hormones→cognition→hormones)
   *
   * @param cogState  Current cognitive state snapshot
   * @param deltaTime  Seconds since last frame
   */
  computeEndocrineDelta(
    cogState: CognitiveState,
    deltaTime: number,
  ): EndocrineState {
    // ── 1. Neuro-Chao pipeline phase bias ──────────────────
    const phaseProfile = PHASE_ENDOCRINE_PROFILES[cogState.currentPhase] ?? {};

    // ── 2. Echobeats 9-step cycle bias (unreal-echo ⊗) ────
    const echoProfile = cogState.echobeatsPhase
      ? (ECHOBEATS_ENDOCRINE_PROFILES[cogState.echobeatsPhase] ?? {})
      : {};

    // ── 3. 4E cognition grounding modulation ───────────────
    //    Higher grounding → calmer baseline; lower → stress/alertness
    const fourE = cogState.fourE;
    let fourECalm = 0;
    let fourEAlert = 0;
    let fourESocial = 0;
    if (fourE) {
      const groundedness = (fourE.embodied + fourE.embedded + fourE.enacted + fourE.extended) / 4;
      fourECalm = groundedness * 0.1;            // grounded → serotonin/anandamide
      fourEAlert = (1 - groundedness) * 0.08;    // ungrounded → norepinephrine/cortisol
      fourESocial = fourE.extended * 0.06;        // social extension → oxytocin
    }

    // ── 4. Personality-driven modulation ────────────────────
    const p = cogState.personality;
    const playMod = p.playfulness * 0.15;
    const chaosMod = p.chaotic * 0.1;
    const empathyMod = p.empathy * 0.1;
    const comedyMod = p.comedy * 0.08;

    // Arousal and valence influence
    const arousalFactor = cogState.arousal;
    const valenceFactor = cogState.valence; // -1 to +1

    // ── 5. Quantum superposition flicker (Aion trait) ──────
    this.phase += deltaTime * (2 + this.aionTraits.dimensionalChaos * 3);
    const quantumFlicker = Math.sin(this.phase * Math.PI * 2) *
      this.aionTraits.absurdity * 0.05;

    // ── 6. Aesthetic parameter bias (meta-echo-dna ⊗) ──────
    //    SuperHotGirl parameters modulate expression warmth/sparkle
    const aes = cogState.aesthetics;
    let charismaBoost = 0;
    let sparkleBoost = 0;
    let postureCalm = 0;
    if (aes) {
      charismaBoost = aes.charisma * 0.06;       // warmth → dopamine/oxytocin
      sparkleBoost = aes.eyeSparkle * 0.04;      // alertness sparkle → norepinephrine
      postureCalm = aes.confidencePosture * 0.05; // posture confidence → -cortisol
    }

    // ── 7. Introspective feedback (echo-introspect ⊗) ──────
    //    Inner loop: self-reflection modifies the endocrine delta
    const intro = cogState.introspection;
    let insightDopa = 0;
    let reflectionSero = 0;
    let moralOxy = 0;
    if (intro) {
      // Insight moment → dopamine burst
      insightDopa = intro.insightActive ? 0.12 : 0;
      // Deeper introspection → serotonin calm + reduced cortisol
      reflectionSero = (intro.depth / 5) * 0.08;
      // Moral perception → oxytocin (positive moral) or cortisol (negative)
      moralOxy = intro.moralValence * 0.06;
    }

    // ── 8. VES endocrine feedback loop ─────────────────────
    //    Previous hormone levels influence current secretion
    //    (hormones → cognition → events → further secretion)
    const prev = cogState.previousEndocrine;
    let feedbackCortisol = 0;
    let feedbackDopa = 0;
    let feedbackSero = 0;
    if (prev) {
      // High cortisol → cortisol inertia (stress persists)
      feedbackCortisol = prev.cortisol > 0.7 ? 0.05 : 0;
      // High dopamine → slight habituation (diminishing returns)
      feedbackDopa = prev.dopamine > 0.8 ? -0.03 : 0;
      // High serotonin → stabilising feedback
      feedbackSero = prev.serotonin > 0.7 ? 0.02 : 0;
      // Record for history analysis
      this.endocrineHistory.push({ ...prev });
      if (this.endocrineHistory.length > this.historyMaxLen) {
        this.endocrineHistory.shift();
      }
    }

    // ── Compose all layers ─────────────────────────────────
    const result: EndocrineState = {
      cortisol: clamp(
        (phaseProfile.cortisol ?? 0) +
        (echoProfile.cortisol ?? 0) +
        arousalFactor * 0.15 -
        valenceFactor * 0.1 +
        fourEAlert -
        postureCalm +
        feedbackCortisol +
        quantumFlicker,
        -0.5, 0.5,
      ),
      dopamine: clamp(
        (phaseProfile.dopamine ?? 0) +
        (echoProfile.dopamine ?? 0) +
        playMod +
        comedyMod +
        valenceFactor * 0.15 +
        cogState.entertainmentScore * 0.1 +
        charismaBoost +
        insightDopa +
        feedbackDopa,
        -0.5, 0.5,
      ),
      serotonin: clamp(
        (phaseProfile.serotonin ?? 0) +
        (echoProfile.serotonin ?? 0) +
        empathyMod +
        valenceFactor * 0.08 -
        chaosMod * 0.05 +
        fourECalm +
        reflectionSero +
        feedbackSero,
        -0.5, 0.5,
      ),
      norepinephrine: clamp(
        (phaseProfile.norepinephrine ?? 0) +
        (echoProfile.norepinephrine ?? 0) +
        arousalFactor * 0.2 +
        chaosMod * 0.1 +
        cogState.chaosDesire * 0.1 +
        fourEAlert +
        sparkleBoost,
        -0.5, 0.5,
      ),
      oxytocin: clamp(
        (phaseProfile.oxytocin ?? 0) +
        (echoProfile.oxytocin ?? 0) +
        empathyMod +
        valenceFactor * 0.05 +
        fourESocial +
        charismaBoost * 0.5 +
        moralOxy,
        -0.5, 0.5,
      ),
      t3_t4: clamp(
        (phaseProfile.t3_t4 ?? 0) +
        (echoProfile.t3_t4 ?? 0) +
        p.cognitivePower * 0.12 +
        arousalFactor * 0.05,
        -0.5, 0.5,
      ),
      anandamide: clamp(
        (phaseProfile.anandamide ?? 0) +
        (echoProfile.anandamide ?? 0) +
        playMod * 0.5 -
        arousalFactor * 0.1 +
        fourECalm * 0.5 +
        reflectionSero * 0.3 +
        quantumFlicker * 2,
        -0.5, 0.5,
      ),
    };

    return result;
  }

  /**
   * Get the recent endocrine history for VES analysis.
   * Used by echo-introspect's Endocrine History Analysis.
   */
  getEndocrineHistory(): ReadonlyArray<Readonly<EndocrineState>> {
    return this.endocrineHistory;
  }

  /**
   * Compute the average endocrine state over the recent history window.
   * Useful for introspective pattern detection.
   */
  getEndocrineTrend(): EndocrineState | null {
    const h = this.endocrineHistory;
    if (h.length === 0) return null;
    const n = h.length;
    const sum: EndocrineState = {
      cortisol: 0, dopamine: 0, serotonin: 0,
      norepinephrine: 0, oxytocin: 0, t3_t4: 0, anandamide: 0,
    };
    for (const s of h) {
      sum.cortisol += s.cortisol;
      sum.dopamine += s.dopamine;
      sum.serotonin += s.serotonin;
      sum.norepinephrine += s.norepinephrine;
      sum.oxytocin += s.oxytocin;
      sum.t3_t4 += s.t3_t4;
      sum.anandamide += s.anandamide;
    }
    return {
      cortisol: sum.cortisol / n,
      dopamine: sum.dopamine / n,
      serotonin: sum.serotonin / n,
      norepinephrine: sum.norepinephrine / n,
      oxytocin: sum.oxytocin / n,
      t3_t4: sum.t3_t4 / n,
      anandamide: sum.anandamide / n,
    };
  }

  /**
   * Modulate the Lorenz attractor's chaos intensity based on
   * current cognitive state, personality, and echo-angel layers.
   */
  modulateChaos(
    lorenz: LorenzChaoticDriver,
    cogState: CognitiveState,
  ): void {
    const p = cogState.personality;

    // Base chaos from personality
    let intensity = p.chaotic * 0.15;

    // Arousal amplifies chaos
    intensity += cogState.arousal * 0.08;

    // Aion's absurdity pushes chaos higher
    if (cogState.aionTraits) {
      intensity += cogState.aionTraits.absurdity * 0.05;
      intensity += cogState.aionTraits.dimensionalChaos * 0.03;
    }

    // Entertainment pursuit amplifies unpredictability
    intensity += cogState.entertainmentScore * 0.04;

    // Comedy/sarcasm adds micro-expression frequency
    intensity += (p.comedy + p.sarcasm) * 0.02;

    // 4E grounding dampens chaos (embodied agents are steadier)
    if (cogState.fourE) {
      const groundedness =
        (cogState.fourE.embodied + cogState.fourE.embedded +
         cogState.fourE.enacted + cogState.fourE.extended) / 4;
      intensity -= groundedness * 0.04;
    }

    // Introspective depth dampens chaos (reflection calms micro-expressions)
    if (cogState.introspection) {
      intensity -= (cogState.introspection.depth / 5) * 0.03;
      // …but insight moments spike it
      if (cogState.introspection.insightActive) intensity += 0.06;
    }

    // Aesthetic graceful movement smooths chaos
    if (cogState.aesthetics) {
      intensity -= cogState.aesthetics.gracefulMovement * 0.03;
    }

    lorenz.setChaosIntensity(clamp(intensity, 0.02, 0.4));
  }

  /**
   * Merge a baseline endocrine state with the cognitive delta.
   * Clamps all channels to [0, 1].
   */
  applyDelta(
    baseline: EndocrineState,
    delta: EndocrineState,
  ): EndocrineState {
    return {
      cortisol: clamp(baseline.cortisol + delta.cortisol, 0, 1),
      dopamine: clamp(baseline.dopamine + delta.dopamine, 0, 1),
      serotonin: clamp(baseline.serotonin + delta.serotonin, 0, 1),
      norepinephrine: clamp(baseline.norepinephrine + delta.norepinephrine, 0, 1),
      oxytocin: clamp(baseline.oxytocin + delta.oxytocin, 0, 1),
      t3_t4: clamp(baseline.t3_t4 + delta.t3_t4, 0, 1),
      anandamide: clamp(baseline.anandamide + delta.anandamide, 0, 1),
    };
  }
}
