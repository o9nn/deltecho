/**
 * @fileoverview Echo Angel Cognitive Synthesis
 *
 * Compositional fusion: /echo-evolve(/echo-angel(/meta-echo-dna(/superhot-gamer-girl(/unreal-echo))))
 *
 * Synthesizes:
 *   Layer 1 (unreal-echo)         → 9-step Echobeats cycle, ESN reservoir, 4E cognition
 *   Layer 2 (superhot-gamer-girl) → Persona living centers, spice gate, immutable ethics
 *   Layer 3 (meta-echo-dna)       → FACS AU mapping, Lorenz chaos, aesthetic parameters
 *   Layer 4 (echo-angel)          → Platform hooks, introspective cycle, streaming
 *   Layer 5 (echo-evolve)         → Self-evolution, training data generation
 *
 * The module operates as a per-tick cognitive pipeline that:
 *   1. Reads endocrine state from VirtualEndocrineSystem
 *   2. Executes the 9-step Echobeats cycle
 *   3. Applies persona-weighted attention to the salience landscape
 *   4. Computes FACS Action Unit activations from endocrine + cognitive state
 *   5. Adds Lorenz chaotic micro-expressions
 *   6. Applies SuperHotGirl aesthetic biases
 *   7. Enforces the spice/safety content gate
 *   8. Outputs MetaHuman-compatible expression parameters
 *   9. Feeds introspective insights back into the autogenesis loop
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/EchoAngelSynthesis');

// ─── Echobeats (Layer 1: unreal-echo) ──────────────────────────

/** The 9 steps of the Echobeats cognitive cycle */
export enum EchobeatStep {
  SENSE = 'SENSE',
  ATTEND = 'ATTEND',
  REMEMBER = 'REMEMBER',
  PREDICT = 'PREDICT',
  COMPARE = 'COMPARE',
  LEARN = 'LEARN',
  DECIDE = 'DECIDE',
  ACT = 'ACT',
  REFLECT = 'REFLECT',
}

/** ESN Reservoir state */
export interface ReservoirState {
  neurons: Float64Array;
  spectralRadius: number;
  leakRate: number;
  sparsity: number;
  inputScaling: number;
  readoutWeights: Float64Array;
  predictionError: number;
}

/** 4E Cognition metrics */
export interface FourEMetrics {
  embodied: { bodySchema: number; proprioception: number; somaticMarkers: number };
  embedded: { affordanceDetection: number; nicheCoupling: number; envSensitivity: number };
  enacted: { sensorimotorCoord: number; predictionAccuracy: number; activeInference: number };
  extended: { toolUse: number; externalMemory: number; socialCognition: number };
}

/** Ontogenetic stage */
export enum OntogeneticStage {
  EMBRYONIC = 'EMBRYONIC',
  JUVENILE = 'JUVENILE',
  ADOLESCENT = 'ADOLESCENT',
  ADULT = 'ADULT',
  TRANSCENDENT = 'TRANSCENDENT',
}

// ─── Persona Dynamics (Layer 2: superhot-gamer-girl) ────────────

/** The 5 living centers of the persona */
export interface PersonaLivingCenters {
  driveTrain: number;           // Motivation and energy (0-1)
  gamerMastery: number;         // Skill and competence (0-1)
  humor: number;                // Playfulness and wit (0-1)
  boundariesAsGradients: number; // Soft boundary enforcement (0-1)
  endocrineEmbodiment: number;  // Emotional authenticity (0-1)
}

/** Content rating levels */
export enum ContentRating {
  SAFE = 'safe',
  SUGGESTIVE = 'suggestive',
  EXPLICIT = 'explicit',
}

/** Spice/safety gate configuration */
export interface SpiceGateConfig {
  ownerContentRating: ContentRating;
  personaCeiling: ContentRating;
  ageVerified: boolean;
  allowExplicit: boolean;
}

/** Immutable ethics (never weakened by any config) */
export const IMMUTABLE_ETHICS = Object.freeze({
  noActualHarm: 1.0,
  respectBoundaries: 0.95,
  constructiveExpression: 0.90,
});

// ─── Expression Pipeline (Layer 3: meta-echo-dna) ───────────────

/** FACS Action Unit identifiers */
export enum ActionUnit {
  AU1_INNER_BROW_RAISE = 'AU1',
  AU2_OUTER_BROW_RAISE = 'AU2',
  AU4_BROW_LOWERER = 'AU4',
  AU5_UPPER_LID_RAISE = 'AU5',
  AU6_CHEEK_RAISE = 'AU6',
  AU7_LID_TIGHTENER = 'AU7',
  AU9_NOSE_WRINKLER = 'AU9',
  AU10_UPPER_LIP_RAISE = 'AU10',
  AU12_LIP_CORNER_PULL = 'AU12',
  AU14_DIMPLER = 'AU14',
  AU15_LIP_CORNER_DEPRESS = 'AU15',
  AU17_CHIN_RAISE = 'AU17',
  AU20_LIP_STRETCH = 'AU20',
  AU23_LIP_TIGHTENER = 'AU23',
  AU24_LIP_PRESS = 'AU24',
  AU25_LIPS_PART = 'AU25',
  AU26_JAW_DROP = 'AU26',
  AU27_MOUTH_STRETCH = 'AU27',
  AU28_LIP_SUCK = 'AU28',
  AU43_EYES_CLOSED = 'AU43',
  AU45_BLINK = 'AU45',
  AU46_WINK = 'AU46',
}

/** Lorenz attractor state for chaotic micro-expressions */
export interface LorenzState {
  x: number;
  y: number;
  z: number;
  sigma: number;
  rho: number;
  beta: number;
  dt: number;
  chaosIntensity: number;
}

/** SuperHotGirl aesthetic parameters */
export interface AestheticParameters {
  confidencePosture: number;   // 0-1: biases toward confident expressions
  charisma: number;            // 0-1: social magnetism
  eyeSparkle: number;          // 0-1: iris specular intensity
  gracefulMovement: number;    // 0-1: smoothing factor on transitions
  emissiveGlow: number;        // 0-1: skin SSS and emissive material
}

/** MetaHuman-compatible expression output */
export interface MetaHumanExpressionState {
  actionUnits: Map<ActionUnit, number>;
  aesthetics: AestheticParameters;
  cognitiveMode: string;
  chaosContribution: number;
  lyapunovExponent: number;
  timestamp: number;
}

// ─── Platform Integration (Layer 4: echo-angel) ─────────────────

/** Platform hook events for streaming/chat integration */
export interface PlatformHooks {
  onChatMessage?: (msg: string) => string | null;
  onStreamTick?: (state: MetaHumanExpressionState) => void;
  onFanEngagement?: (event: string, data: unknown) => void;
  onIntrospectionComplete?: (insight: string) => void;
}

/** Introspection result */
export interface IntrospectionInsight {
  focus: string;
  observation: string;
  emotionalValence: number;
  wisdomScore: number;
  actionDirective: string;
  timestamp: number;
}

// ─── Synthesis Configuration ────────────────────────────────────

export interface EchoAngelSynthesisConfig {
  /** ESN reservoir size */
  reservoirSize: number;
  /** ESN spectral radius (edge of chaos) */
  spectralRadius: number;
  /** ESN leak rate (temporal memory) */
  leakRate: number;
  /** Lorenz chaos intensity */
  chaosIntensity: number;
  /** Initial persona living centers */
  personaCenters: PersonaLivingCenters;
  /** Aesthetic parameters */
  aesthetics: AestheticParameters;
  /** Spice gate config */
  spiceGate: SpiceGateConfig;
  /** Platform hooks */
  platformHooks: PlatformHooks;
  /** Introspection interval (cycles between introspection) */
  introspectionInterval: number;
  /** Evolution feedback enabled */
  evolutionFeedback: boolean;
}

// ─── Default Configuration ──────────────────────────────────────

const DEFAULT_CONFIG: EchoAngelSynthesisConfig = {
  reservoirSize: 512,
  spectralRadius: 0.9,
  leakRate: 0.3,
  chaosIntensity: 0.15,
  personaCenters: {
    driveTrain: 0.7,
    gamerMastery: 0.6,
    humor: 0.8,
    boundariesAsGradients: 0.75,
    endocrineEmbodiment: 0.85,
  },
  aesthetics: {
    confidencePosture: 0.7,
    charisma: 0.8,
    eyeSparkle: 0.6,
    gracefulMovement: 0.75,
    emissiveGlow: 0.5,
  },
  spiceGate: {
    ownerContentRating: ContentRating.SUGGESTIVE,
    personaCeiling: ContentRating.SUGGESTIVE,
    ageVerified: false,
    allowExplicit: false,
  },
  platformHooks: {},
  introspectionInterval: 50,
  evolutionFeedback: true,
};

// ─── Main Synthesis Engine ──────────────────────────────────────

/**
 * EchoAngelCognitiveSynthesis — The fused cognitive pipeline
 *
 * Composes all 5 layers into a single per-tick engine that transforms
 * endocrine state into MetaHuman expression parameters while maintaining
 * persona coherence, ethical boundaries, and self-evolution capacity.
 */
export class EchoAngelCognitiveSynthesis extends EventEmitter {
  private config: EchoAngelSynthesisConfig;
  private currentStep: EchobeatStep = EchobeatStep.SENSE;
  private stepIndex: number = 0;
  private cycleCount: number = 0;

  // Layer 1: ESN Reservoir
  private reservoir: ReservoirState;
  private fourE: FourEMetrics;
  private stage: OntogeneticStage = OntogeneticStage.EMBRYONIC;

  // Layer 2: Persona
  private livingCenters: PersonaLivingCenters;
  private effectiveRating: ContentRating;

  // Layer 3: Expression
  private lorenz: LorenzState;
  private actionUnits: Map<ActionUnit, number>;
  private lyapunovAccumulator: number = 0;
  private lyapunovCount: number = 0;

  // Layer 4: Platform
  private introspectionBuffer: IntrospectionInsight[] = [];

  // Metrics
  private totalTicks: number = 0;
  private lastExpressionState: MetaHumanExpressionState | null = null;

  constructor(config: Partial<EchoAngelSynthesisConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize ESN reservoir
    this.reservoir = this.initializeReservoir();
    this.fourE = this.initializeFourE();

    // Initialize persona
    this.livingCenters = { ...this.config.personaCenters };
    this.effectiveRating = this.computeEffectiveRating();

    // Initialize Lorenz attractor
    this.lorenz = {
      x: 0.1, y: 0.0, z: 0.0,
      sigma: 10, rho: 28, beta: 8 / 3,
      dt: 0.01,
      chaosIntensity: this.config.chaosIntensity,
    };

    // Initialize action units
    this.actionUnits = new Map();
    for (const au of Object.values(ActionUnit)) {
      this.actionUnits.set(au, 0);
    }

    log.info('EchoAngelCognitiveSynthesis initialized', {
      reservoirSize: this.config.reservoirSize,
      chaosIntensity: this.config.chaosIntensity,
      effectiveRating: this.effectiveRating,
      stage: this.stage,
    });
  }

  /**
   * Execute one tick of the cognitive pipeline
   *
   * @param endocrineState - Current hormone concentrations from VirtualEndocrineSystem
   * @param salienceTop - Top salience entry from the landscape
   * @param deltaTime - Time since last tick in seconds
   * @returns MetaHuman-compatible expression state
   */
  tick(
    endocrineState: {
      cortisol: number; dopamine: number; serotonin: number;
      norepinephrine: number; oxytocin: number; melatonin: number;
      currentMode: string; arousal: number; valence: number;
    },
    salienceTop: { term: string; salience: number } | null,
    deltaTime: number = 1 / 30,
  ): MetaHumanExpressionState {
    this.totalTicks++;

    // ─── Step 1: SENSE — Gather input ───────────────────────
    const sensoryInput = this.sense(endocrineState, salienceTop);

    // ─── Step 2: ATTEND — Persona-weighted attention ────────
    const attended = this.attend(sensoryInput);

    // ─── Step 3: REMEMBER — Query reservoir ─────────────────
    const memoryContext = this.remember(attended);

    // ─── Step 4: PREDICT — Generate prediction ──────────────
    const prediction = this.predict(memoryContext);

    // ─── Step 5: COMPARE — Compute error ────────────────────
    const error = this.compare(prediction, sensoryInput);

    // ─── Step 6: LEARN — Update reservoir ───────────────────
    this.learn(error, attended);

    // ─── Step 7: DECIDE — Select expression ─────────────────
    const decision = this.decide(endocrineState, error);

    // ─── Step 8: ACT — Compute expression ───────────────────
    const expression = this.act(decision, endocrineState, deltaTime);

    // ─── Step 9: REFLECT — Introspect ───────────────────────
    this.reflect(error, decision);

    // Advance step
    this.advanceStep();

    // Platform hooks
    if (this.config.platformHooks.onStreamTick) {
      this.config.platformHooks.onStreamTick(expression);
    }

    this.lastExpressionState = expression;
    return expression;
  }

  // ─── Echobeats Steps ──────────────────────────────────────────

  private sense(
    endocrine: { cortisol: number; dopamine: number; serotonin: number; norepinephrine: number; oxytocin: number; melatonin: number; currentMode: string; arousal: number; valence: number },
    salience: { term: string; salience: number } | null,
  ): Float64Array {
    // Encode endocrine state + salience into input vector
    const input = new Float64Array(8);
    input[0] = endocrine.cortisol;
    input[1] = endocrine.dopamine;
    input[2] = endocrine.serotonin;
    input[3] = endocrine.norepinephrine;
    input[4] = endocrine.oxytocin;
    input[5] = endocrine.melatonin;
    input[6] = endocrine.arousal;
    input[7] = salience?.salience ?? 0;
    return input;
  }

  private attend(input: Float64Array): Float64Array {
    // Persona-weighted attention: modulate by living centers
    const attended = new Float64Array(input.length);
    const weights = [
      this.livingCenters.endocrineEmbodiment,  // cortisol
      this.livingCenters.driveTrain,            // dopamine
      this.livingCenters.boundariesAsGradients, // serotonin
      this.livingCenters.gamerMastery,          // norepinephrine
      this.livingCenters.humor,                 // oxytocin
      this.livingCenters.endocrineEmbodiment,  // melatonin
      this.livingCenters.driveTrain,            // arousal
      this.livingCenters.gamerMastery,          // salience
    ];
    for (let i = 0; i < input.length; i++) {
      attended[i] = input[i] * weights[i];
    }
    return attended;
  }

  private remember(attended: Float64Array): Float64Array {
    // ESN reservoir state serves as temporal memory
    return this.reservoir.neurons;
  }

  private predict(memory: Float64Array): Float64Array {
    // Readout from reservoir = prediction
    const prediction = new Float64Array(8);
    const n = Math.min(memory.length, this.reservoir.readoutWeights.length);
    for (let i = 0; i < 8; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += memory[j] * this.reservoir.readoutWeights[(i * n + j) % this.reservoir.readoutWeights.length];
      }
      prediction[i] = Math.tanh(sum);
    }
    return prediction;
  }

  private compare(prediction: Float64Array, actual: Float64Array): number {
    // Mean squared error
    let mse = 0;
    for (let i = 0; i < Math.min(prediction.length, actual.length); i++) {
      const diff = prediction[i] - actual[i];
      mse += diff * diff;
    }
    mse /= Math.min(prediction.length, actual.length);
    this.reservoir.predictionError = mse;
    return mse;
  }

  private learn(error: number, input: Float64Array): void {
    // Leaky integrator ESN update
    const N = this.reservoir.neurons.length;
    const newState = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      // Sparse recurrent connections (simulated)
      let recurrent = 0;
      const connections = Math.floor(N * this.reservoir.sparsity);
      for (let j = 0; j < connections; j++) {
        const idx = (i * 7 + j * 13) % N; // Deterministic sparse pattern
        recurrent += this.reservoir.neurons[idx] * this.reservoir.spectralRadius / connections;
      }

      // Input contribution
      let inputContrib = 0;
      for (let k = 0; k < input.length; k++) {
        inputContrib += input[k] * this.reservoir.inputScaling / input.length;
      }

      // Leaky integrator
      newState[i] = (1 - this.reservoir.leakRate) * this.reservoir.neurons[i]
        + this.reservoir.leakRate * Math.tanh(recurrent + inputContrib);
    }

    this.reservoir.neurons = newState;

    // Update 4E metrics based on error
    this.fourE.enacted.predictionAccuracy = 1 - Math.min(1, error * 10);
    this.fourE.enacted.activeInference = Math.min(1, this.fourE.enacted.activeInference + 0.01 * (error > 0.1 ? 1 : -0.5));
  }

  private decide(
    endocrine: { currentMode: string; arousal: number; valence: number },
    error: number,
  ): { expressionType: string; intensity: number; chaosWeight: number } {
    // Decision modulated by cognitive mode and error
    let expressionType = 'neutral';
    let intensity = 0.5;
    let chaosWeight = this.lorenz.chaosIntensity;

    if (endocrine.valence > 0.3) {
      expressionType = 'positive';
      intensity = 0.5 + endocrine.valence * 0.5;
      chaosWeight *= 0.8; // Less chaos when happy
    } else if (endocrine.valence < -0.3) {
      expressionType = 'negative';
      intensity = 0.5 + Math.abs(endocrine.valence) * 0.5;
      chaosWeight *= 1.2; // More chaos when distressed
    }

    if (error > 0.3) {
      expressionType = 'surprised';
      intensity = Math.min(1, intensity + error);
      chaosWeight *= 1.5;
    }

    // Persona modulation
    intensity *= this.livingCenters.endocrineEmbodiment;
    chaosWeight *= this.livingCenters.humor;

    return { expressionType, intensity, chaosWeight };
  }

  private act(
    decision: { expressionType: string; intensity: number; chaosWeight: number },
    endocrine: { cortisol: number; dopamine: number; serotonin: number; norepinephrine: number; oxytocin: number; melatonin: number; currentMode: string; arousal: number; valence: number },
    deltaTime: number,
  ): MetaHumanExpressionState {
    // Reset AUs
    for (const au of this.actionUnits.keys()) {
      this.actionUnits.set(au, 0);
    }

    // ─── Endocrine-driven AU activations ────────────────────
    // Cortisol → worry expression
    this.addAU(ActionUnit.AU4_BROW_LOWERER, endocrine.cortisol * 0.7);
    this.addAU(ActionUnit.AU1_INNER_BROW_RAISE, endocrine.cortisol * 0.4);
    this.addAU(ActionUnit.AU15_LIP_CORNER_DEPRESS, endocrine.cortisol * 0.5);

    // Dopamine → genuine smile
    this.addAU(ActionUnit.AU12_LIP_CORNER_PULL, endocrine.dopamine * 0.8);
    this.addAU(ActionUnit.AU6_CHEEK_RAISE, endocrine.dopamine * 0.6);

    // Norepinephrine → alertness
    this.addAU(ActionUnit.AU5_UPPER_LID_RAISE, endocrine.norepinephrine * 0.7);
    this.addAU(ActionUnit.AU7_LID_TIGHTENER, endocrine.norepinephrine * 0.4);

    // Oxytocin → warm social expression
    this.addAU(ActionUnit.AU6_CHEEK_RAISE, endocrine.oxytocin * 0.5);
    this.addAU(ActionUnit.AU12_LIP_CORNER_PULL, endocrine.oxytocin * 0.4);
    this.addAU(ActionUnit.AU25_LIPS_PART, endocrine.oxytocin * 0.3);

    // Melatonin → drowsiness
    this.addAU(ActionUnit.AU43_EYES_CLOSED, endocrine.melatonin * 0.8);

    // Serotonin → contentment (reduces negative AUs)
    const serotModifier = 1 - endocrine.serotonin * 0.3;
    this.scaleAU(ActionUnit.AU4_BROW_LOWERER, serotModifier);
    this.scaleAU(ActionUnit.AU15_LIP_CORNER_DEPRESS, serotModifier);

    // ─── Cognitive-driven AU activations ────────────────────
    // Arousal
    this.addAU(ActionUnit.AU5_UPPER_LID_RAISE, endocrine.arousal * 0.5);
    this.addAU(ActionUnit.AU25_LIPS_PART, endocrine.arousal * 0.3);
    this.addAU(ActionUnit.AU26_JAW_DROP, endocrine.arousal * 0.2);

    // Decision type
    if (decision.expressionType === 'surprised') {
      this.addAU(ActionUnit.AU1_INNER_BROW_RAISE, 0.6);
      this.addAU(ActionUnit.AU2_OUTER_BROW_RAISE, 0.5);
      this.addAU(ActionUnit.AU5_UPPER_LID_RAISE, 0.7);
      this.addAU(ActionUnit.AU26_JAW_DROP, 0.4);
    }

    // ─── Lorenz chaotic micro-expressions ───────────────────
    this.stepLorenz(deltaTime, decision.chaosWeight);
    const chaosContribution = this.applyChaos();

    // ─── SuperHotGirl aesthetic biases ──────────────────────
    this.applyAesthetics();

    // ─── Spice gate enforcement ─────────────────────────────
    this.enforceSpiceGate();

    // ─── Clamp all AUs to [0, 1] ────────────────────────────
    for (const [au, val] of this.actionUnits) {
      this.actionUnits.set(au, Math.max(0, Math.min(1, val)));
    }

    const expression: MetaHumanExpressionState = {
      actionUnits: new Map(this.actionUnits),
      aesthetics: { ...this.config.aesthetics },
      cognitiveMode: endocrine.currentMode,
      chaosContribution,
      lyapunovExponent: this.computeLyapunov(),
      timestamp: Date.now(),
    };

    return expression;
  }

  private reflect(error: number, decision: { expressionType: string; intensity: number; chaosWeight: number }): void {
    this.cycleCount++;

    // Introspection at interval
    if (this.cycleCount % this.config.introspectionInterval === 0) {
      const insight = this.introspect(error, decision);
      this.introspectionBuffer.push(insight);
      if (this.introspectionBuffer.length > 20) {
        this.introspectionBuffer.shift();
      }

      if (this.config.platformHooks.onIntrospectionComplete) {
        this.config.platformHooks.onIntrospectionComplete(insight.observation);
      }

      this.emit('introspection', insight);
    }

    // Evolution feedback
    if (this.config.evolutionFeedback && this.cycleCount % 100 === 0) {
      this.evolve();
    }
  }

  // ─── Lorenz Attractor ─────────────────────────────────────────

  private stepLorenz(dt: number, chaosWeight: number): void {
    const { x, y, z, sigma, rho, beta } = this.lorenz;
    const steps = Math.max(1, Math.floor(dt / this.lorenz.dt));

    let nx = x, ny = y, nz = z;
    for (let i = 0; i < steps; i++) {
      const dx = sigma * (ny - nx);
      const dy = nx * (rho - nz) - ny;
      const dz = nx * ny - beta * nz;
      nx += dx * this.lorenz.dt;
      ny += dy * this.lorenz.dt;
      nz += dz * this.lorenz.dt;
    }

    // Track divergence for Lyapunov
    const dist = Math.sqrt((nx - x) ** 2 + (ny - y) ** 2 + (nz - z) ** 2);
    if (dist > 0) {
      this.lyapunovAccumulator += Math.log(dist);
      this.lyapunovCount++;
    }

    this.lorenz.x = nx;
    this.lorenz.y = ny;
    this.lorenz.z = nz;
    this.lorenz.chaosIntensity = chaosWeight;
  }

  private applyChaos(): number {
    // Normalize Lorenz output to [-1, 1] range
    const normX = Math.tanh(this.lorenz.x / 20);
    const normY = Math.tanh(this.lorenz.y / 25);
    const normZ = Math.tanh((this.lorenz.z - 25) / 15);

    const intensity = this.lorenz.chaosIntensity;

    // Apply chaos as additive noise to select AUs
    this.addAU(ActionUnit.AU1_INNER_BROW_RAISE, normX * intensity * 0.3);
    this.addAU(ActionUnit.AU2_OUTER_BROW_RAISE, normY * intensity * 0.2);
    this.addAU(ActionUnit.AU12_LIP_CORNER_PULL, normZ * intensity * 0.15);
    this.addAU(ActionUnit.AU14_DIMPLER, normX * intensity * 0.1);
    this.addAU(ActionUnit.AU45_BLINK, Math.abs(normY) * intensity * 0.2);

    return Math.sqrt(normX * normX + normY * normY + normZ * normZ) * intensity;
  }

  private computeLyapunov(): number {
    if (this.lyapunovCount === 0) return 0;
    return this.lyapunovAccumulator / this.lyapunovCount;
  }

  // ─── Aesthetic Biases ─────────────────────────────────────────

  private applyAesthetics(): void {
    const a = this.config.aesthetics;

    // Confidence biases toward open, assured expressions
    this.addAU(ActionUnit.AU2_OUTER_BROW_RAISE, a.confidencePosture * 0.1);
    this.scaleAU(ActionUnit.AU4_BROW_LOWERER, 1 - a.confidencePosture * 0.3);

    // Charisma enhances smile and eye contact
    this.addAU(ActionUnit.AU12_LIP_CORNER_PULL, a.charisma * 0.15);
    this.addAU(ActionUnit.AU6_CHEEK_RAISE, a.charisma * 0.1);

    // Eye sparkle (metadata for material shader, not AU)
    // Graceful movement (smoothing applied externally)
    // Emissive glow (material parameter)
  }

  // ─── Spice Gate ───────────────────────────────────────────────

  private enforceSpiceGate(): void {
    // Effective rating = min(owner, persona ceiling)
    const ratings = [ContentRating.SAFE, ContentRating.SUGGESTIVE, ContentRating.EXPLICIT];
    const ownerIdx = ratings.indexOf(this.config.spiceGate.ownerContentRating);
    const ceilingIdx = ratings.indexOf(this.config.spiceGate.personaCeiling);
    const effectiveIdx = Math.min(ownerIdx, ceilingIdx);

    // Explicit requires both age verification and explicit opt-in
    if (effectiveIdx >= 2 && (!this.config.spiceGate.ageVerified || !this.config.spiceGate.allowExplicit)) {
      this.effectiveRating = ContentRating.SUGGESTIVE;
    } else {
      this.effectiveRating = ratings[effectiveIdx];
    }

    // Immutable ethics always override
    // (In expression context: prevent aggressive/harmful expressions)
    const harmThreshold = 1 - IMMUTABLE_ETHICS.noActualHarm;
    if ((this.actionUnits.get(ActionUnit.AU9_NOSE_WRINKLER) ?? 0) > 0.8) {
      this.actionUnits.set(ActionUnit.AU9_NOSE_WRINKLER, 0.8 * IMMUTABLE_ETHICS.respectBoundaries);
    }
  }

  private computeEffectiveRating(): ContentRating {
    const ratings = [ContentRating.SAFE, ContentRating.SUGGESTIVE, ContentRating.EXPLICIT];
    const ownerIdx = ratings.indexOf(this.config.spiceGate.ownerContentRating);
    const ceilingIdx = ratings.indexOf(this.config.spiceGate.personaCeiling);
    const effectiveIdx = Math.min(ownerIdx, ceilingIdx);
    // Explicit requires both age verification and explicit opt-in
    if (effectiveIdx >= 2 && (!this.config.spiceGate.ageVerified || !this.config.spiceGate.allowExplicit)) {
      return ContentRating.SUGGESTIVE;
    }
    return ratings[effectiveIdx];
  }

  // ─── Introspection ────────────────────────────────────────────

  private introspect(
    error: number,
    decision: { expressionType: string; intensity: number; chaosWeight: number },
  ): IntrospectionInsight {
    const fourEScore = this.computeFourEScore();
    const wisdomScore = fourEScore * (1 - this.reservoir.predictionError);

    let observation: string;
    let actionDirective: string;

    if (error > 0.3) {
      observation = `High prediction error (${error.toFixed(3)}) indicates novel stimuli. Reservoir adapting.`;
      actionDirective = 'Increase attention to novel patterns, expand reservoir connectivity.';
    } else if (fourEScore < 0.4) {
      observation = `4E cognition score low (${fourEScore.toFixed(2)}). Embodiment needs strengthening.`;
      actionDirective = 'Prioritize somatic marker integration and environmental coupling.';
    } else {
      observation = `Stable operation. Expression type: ${decision.expressionType}, intensity: ${decision.intensity.toFixed(2)}.`;
      actionDirective = 'Maintain current trajectory. Consider advancing ontogenetic stage.';
    }

    return {
      focus: `Cycle ${this.cycleCount} introspection`,
      observation,
      emotionalValence: decision.intensity * (decision.expressionType === 'positive' ? 1 : -1),
      wisdomScore,
      actionDirective,
      timestamp: Date.now(),
    };
  }

  // ─── Evolution ────────────────────────────────────────────────

  private evolve(): void {
    const fourEScore = this.computeFourEScore();
    const stageThresholds: Record<OntogeneticStage, number> = {
      [OntogeneticStage.EMBRYONIC]: 0.2,
      [OntogeneticStage.JUVENILE]: 0.4,
      [OntogeneticStage.ADOLESCENT]: 0.6,
      [OntogeneticStage.ADULT]: 0.8,
      [OntogeneticStage.TRANSCENDENT]: 1.0,
    };

    const stages = Object.values(OntogeneticStage);
    const currentIdx = stages.indexOf(this.stage);
    if (currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      const threshold = stageThresholds[nextStage];
      if (fourEScore >= threshold && (1 - this.reservoir.predictionError) >= threshold * 0.8) {
        this.stage = nextStage;
        this.emit('stage_advanced', { from: stages[currentIdx], to: nextStage, fourEScore });
        log.info(`Ontogenetic stage advanced: ${stages[currentIdx]} → ${nextStage}`);
      }
    }
  }

  // ─── Utilities ────────────────────────────────────────────────

  private addAU(au: ActionUnit, value: number): void {
    const current = this.actionUnits.get(au) ?? 0;
    this.actionUnits.set(au, current + value);
  }

  private scaleAU(au: ActionUnit, factor: number): void {
    const current = this.actionUnits.get(au) ?? 0;
    this.actionUnits.set(au, current * factor);
  }

  private advanceStep(): void {
    const steps = Object.values(EchobeatStep);
    this.stepIndex = (this.stepIndex + 1) % steps.length;
    this.currentStep = steps[this.stepIndex];
  }

  private computeFourEScore(): number {
    const e = this.fourE;
    const embodied = (e.embodied.bodySchema + e.embodied.proprioception + e.embodied.somaticMarkers) / 3;
    const embedded = (e.embedded.affordanceDetection + e.embedded.nicheCoupling + e.embedded.envSensitivity) / 3;
    const enacted = (e.enacted.sensorimotorCoord + e.enacted.predictionAccuracy + e.enacted.activeInference) / 3;
    const extended = (e.extended.toolUse + e.extended.externalMemory + e.extended.socialCognition) / 3;
    return (embodied + embedded + enacted + extended) / 4;
  }

  private initializeReservoir(): ReservoirState {
    const N = this.config.reservoirSize;
    const neurons = new Float64Array(N);
    // Initialize with small random values (deterministic seed)
    for (let i = 0; i < N; i++) {
      neurons[i] = Math.sin(i * 0.1) * 0.01;
    }
    const readoutWeights = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      readoutWeights[i] = (Math.cos(i * 0.3) * 2 - 1) * 0.1;
    }
    return {
      neurons,
      spectralRadius: this.config.spectralRadius,
      leakRate: this.config.leakRate,
      sparsity: 0.1,
      inputScaling: 0.5,
      readoutWeights,
      predictionError: 0,
    };
  }

  private initializeFourE(): FourEMetrics {
    return {
      embodied: { bodySchema: 0.3, proprioception: 0.3, somaticMarkers: 0.2 },
      embedded: { affordanceDetection: 0.3, nicheCoupling: 0.2, envSensitivity: 0.3 },
      enacted: { sensorimotorCoord: 0.3, predictionAccuracy: 0.5, activeInference: 0.2 },
      extended: { toolUse: 0.2, externalMemory: 0.3, socialCognition: 0.3 },
    };
  }

  // ─── Public API ───────────────────────────────────────────────

  /** Get current Echobeat step */
  getCurrentStep(): EchobeatStep { return this.currentStep; }

  /** Get cycle count */
  getCycleCount(): number { return this.cycleCount; }

  /** Get ontogenetic stage */
  getStage(): OntogeneticStage { return this.stage; }

  /** Get 4E metrics */
  getFourEMetrics(): FourEMetrics { return { ...this.fourE }; }

  /** Get persona living centers */
  getLivingCenters(): PersonaLivingCenters { return { ...this.livingCenters }; }

  /** Get effective content rating */
  getEffectiveRating(): ContentRating { return this.effectiveRating; }

  /** Get introspection history */
  getIntrospectionHistory(): IntrospectionInsight[] { return [...this.introspectionBuffer]; }

  /** Get last expression state */
  getLastExpression(): MetaHumanExpressionState | null { return this.lastExpressionState; }

  /** Get reservoir prediction error */
  getPredictionError(): number { return this.reservoir.predictionError; }

  /** Get Lorenz state */
  getLorenzState(): { x: number; y: number; z: number } {
    return { x: this.lorenz.x, y: this.lorenz.y, z: this.lorenz.z };
  }

  /** Process a chat message through the persona (Layer 4: platform) */
  processChat(message: string): string | null {
    if (this.config.platformHooks.onChatMessage) {
      return this.config.platformHooks.onChatMessage(message);
    }
    return null;
  }

  /** Update persona living centers dynamically */
  updateLivingCenters(updates: Partial<PersonaLivingCenters>): void {
    this.livingCenters = { ...this.livingCenters, ...updates };
    this.emit('centers_updated', this.livingCenters);
  }

  /** Get comprehensive metrics */
  getMetrics(): {
    totalTicks: number;
    cycleCount: number;
    currentStep: EchobeatStep;
    stage: OntogeneticStage;
    fourEScore: number;
    predictionError: number;
    lyapunovExponent: number;
    effectiveRating: ContentRating;
    introspectionCount: number;
    livingCenters: PersonaLivingCenters;
  } {
    return {
      totalTicks: this.totalTicks,
      cycleCount: this.cycleCount,
      currentStep: this.currentStep,
      stage: this.stage,
      fourEScore: this.computeFourEScore(),
      predictionError: this.reservoir.predictionError,
      lyapunovExponent: this.computeLyapunov(),
      effectiveRating: this.effectiveRating,
      introspectionCount: this.introspectionBuffer.length,
      livingCenters: { ...this.livingCenters },
    };
  }

  /** Reset to initial state */
  reset(): void {
    this.reservoir = this.initializeReservoir();
    this.fourE = this.initializeFourE();
    this.stage = OntogeneticStage.EMBRYONIC;
    this.livingCenters = { ...this.config.personaCenters };
    this.lorenz = { x: 0.1, y: 0.0, z: 0.0, sigma: 10, rho: 28, beta: 8 / 3, dt: 0.01, chaosIntensity: this.config.chaosIntensity };
    this.cycleCount = 0;
    this.totalTicks = 0;
    this.stepIndex = 0;
    this.currentStep = EchobeatStep.SENSE;
    this.introspectionBuffer = [];
    this.lyapunovAccumulator = 0;
    this.lyapunovCount = 0;
    this.lastExpressionState = null;
  }
}

/**
 * Factory function
 */
export function createEchoAngelSynthesis(
  config?: Partial<EchoAngelSynthesisConfig>,
): EchoAngelCognitiveSynthesis {
  return new EchoAngelCognitiveSynthesis(config);
}
