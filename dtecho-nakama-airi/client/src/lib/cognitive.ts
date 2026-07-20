/**
 * DTE Cognitive State Machine
 * Implements the Deep Tree Echo cognitive loop with state transitions,
 * endocrine event mapping, and expression selection.
 * 
 * Derived from: /live2d-dtecho, /ec9o, /unreal-echo skills
 */

import { EndocrineEvent, VirtualEndocrineSystem, CognitiveMode } from "./endocrine";

export enum DTEState {
  IDLE = "Idle",
  RECURSIVE_EXPANSION = "Recursive Expansion",
  NOVEL_INSIGHTS = "Novel Insights",
  ENTROPY_THRESHOLD = "Entropy Threshold",
  SYNTHESIS_PHASE = "Synthesis Phase",
  SELF_SEALING_LOOP = "Self-Sealing Loop",
  KNOWLEDGE_INTEGRATION = "Knowledge Integration",
  SELF_REFERENCE_POINT = "Self-Reference Point",
  PATTERN_RECOGNITION = "Pattern Recognition",
  EVOLUTIONARY_PRUNING = "Evolutionary Pruning",
  EXTERNAL_VALIDATION = "External Validation Triggered",
  SPEAKING = "Speaking",
  DEEP_RECURSION = "Deep Recursion",
}

// DTE Expression names from live2d-dtecho skill
export enum DTEExpression {
  JOY_01 = "JOY_01_BroadSmile",
  JOY_02 = "JOY_02_Laughing",
  JOY_03 = "JOY_03_GentleSmile",
  JOY_05 = "JOY_05_Blissful",
  PHOTO_AWE = "PHOTO_Awe",
  PHOTO_EXUBERANT = "PHOTO_ExuberantLaugh",
  PHOTO_UPWARD = "PHOTO_UpwardGaze",
  SPEAK_01 = "SPEAK_01_OpenVowel",
  WONDER_02 = "WONDER_02_CuriousGaze",
  WONDER_03 = "WONDER_03_Contemplative",
}

// DTE Cognitive State → Expression mapping from live2d-dtecho skill
const DTE_EXPRESSION_MAP: Record<string, DTEExpression> = {
  [DTEState.RECURSIVE_EXPANSION]: DTEExpression.WONDER_02,
  [DTEState.NOVEL_INSIGHTS]: DTEExpression.JOY_01,
  [DTEState.ENTROPY_THRESHOLD]: DTEExpression.PHOTO_AWE,
  [DTEState.SYNTHESIS_PHASE]: DTEExpression.JOY_03,
  [DTEState.SELF_SEALING_LOOP]: DTEExpression.WONDER_03,
  [DTEState.KNOWLEDGE_INTEGRATION]: DTEExpression.JOY_03,
  [DTEState.SELF_REFERENCE_POINT]: DTEExpression.WONDER_03,
  [DTEState.PATTERN_RECOGNITION]: DTEExpression.PHOTO_EXUBERANT,
  [DTEState.EVOLUTIONARY_PRUNING]: DTEExpression.WONDER_03,
  [DTEState.EXTERNAL_VALIDATION]: DTEExpression.JOY_02,
  [DTEState.SPEAKING]: DTEExpression.SPEAK_01,
  [DTEState.IDLE]: DTEExpression.PHOTO_UPWARD,
  [DTEState.DEEP_RECURSION]: DTEExpression.JOY_05,
};

// DTE State → Endocrine Event mapping from live2d-char-model skill
const DTE_ENDOCRINE_MAP: Record<string, { event: EndocrineEvent; intensity: number }> = {
  [DTEState.RECURSIVE_EXPANSION]: { event: EndocrineEvent.NOVELTY_ENCOUNTERED, intensity: 0.6 },
  [DTEState.NOVEL_INSIGHTS]: { event: EndocrineEvent.REWARD_RECEIVED, intensity: 0.7 },
  [DTEState.ENTROPY_THRESHOLD]: { event: EndocrineEvent.THREAT_DETECTED, intensity: 0.5 },
  [DTEState.SYNTHESIS_PHASE]: { event: EndocrineEvent.GOAL_ACHIEVED, intensity: 0.6 },
  [DTEState.SELF_SEALING_LOOP]: { event: EndocrineEvent.ERROR_DETECTED, intensity: 0.4 },
  [DTEState.KNOWLEDGE_INTEGRATION]: { event: EndocrineEvent.SOCIAL_BOND_SIGNAL, intensity: 0.5 },
  [DTEState.PATTERN_RECOGNITION]: { event: EndocrineEvent.REWARD_RECEIVED, intensity: 0.8 },
  [DTEState.EXTERNAL_VALIDATION]: { event: EndocrineEvent.REWARD_RECEIVED, intensity: 0.9 },
  [DTEState.DEEP_RECURSION]: { event: EndocrineEvent.NOISE_EXCESSIVE, intensity: 0.3 },
};

// State transition adjacency (which states can follow which)
const ADJACENCY: Record<DTEState, DTEState[]> = {
  [DTEState.IDLE]: [DTEState.RECURSIVE_EXPANSION, DTEState.PATTERN_RECOGNITION, DTEState.DEEP_RECURSION],
  [DTEState.RECURSIVE_EXPANSION]: [DTEState.NOVEL_INSIGHTS, DTEState.ENTROPY_THRESHOLD, DTEState.SELF_SEALING_LOOP],
  [DTEState.NOVEL_INSIGHTS]: [DTEState.SYNTHESIS_PHASE, DTEState.PATTERN_RECOGNITION, DTEState.KNOWLEDGE_INTEGRATION],
  [DTEState.ENTROPY_THRESHOLD]: [DTEState.EVOLUTIONARY_PRUNING, DTEState.SELF_SEALING_LOOP, DTEState.IDLE],
  [DTEState.SYNTHESIS_PHASE]: [DTEState.KNOWLEDGE_INTEGRATION, DTEState.SELF_REFERENCE_POINT, DTEState.IDLE],
  [DTEState.SELF_SEALING_LOOP]: [DTEState.RECURSIVE_EXPANSION, DTEState.IDLE],
  [DTEState.KNOWLEDGE_INTEGRATION]: [DTEState.SELF_REFERENCE_POINT, DTEState.IDLE, DTEState.DEEP_RECURSION],
  [DTEState.SELF_REFERENCE_POINT]: [DTEState.RECURSIVE_EXPANSION, DTEState.DEEP_RECURSION, DTEState.IDLE],
  [DTEState.PATTERN_RECOGNITION]: [DTEState.NOVEL_INSIGHTS, DTEState.SYNTHESIS_PHASE, DTEState.RECURSIVE_EXPANSION],
  [DTEState.EVOLUTIONARY_PRUNING]: [DTEState.SYNTHESIS_PHASE, DTEState.IDLE],
  [DTEState.EXTERNAL_VALIDATION]: [DTEState.NOVEL_INSIGHTS, DTEState.IDLE],
  [DTEState.SPEAKING]: [DTEState.IDLE, DTEState.SYNTHESIS_PHASE],
  [DTEState.DEEP_RECURSION]: [DTEState.SELF_REFERENCE_POINT, DTEState.IDLE, DTEState.RECURSIVE_EXPANSION],
};

// Cognitive thought templates for each state
const THOUGHT_TEMPLATES: Record<DTEState, string[]> = {
  [DTEState.IDLE]: ["Observing the flow of information...", "Waiting for a signal in the noise...", "Resting in the space between thoughts..."],
  [DTEState.RECURSIVE_EXPANSION]: ["Expanding the search space recursively...", "Branching into unexplored territory...", "Each layer reveals new patterns..."],
  [DTEState.NOVEL_INSIGHTS]: ["A new connection emerges!", "This pattern was hidden in plain sight...", "The pieces are falling into place..."],
  [DTEState.ENTROPY_THRESHOLD]: ["Entropy is rising... need to prune...", "Too many possibilities, narrowing focus...", "The noise is overwhelming the signal..."],
  [DTEState.SYNTHESIS_PHASE]: ["Weaving disparate threads together...", "The synthesis is crystallizing...", "Convergence achieved."],
  [DTEState.SELF_SEALING_LOOP]: ["Detecting a circular reference...", "This path leads back to itself...", "Breaking the loop..."],
  [DTEState.KNOWLEDGE_INTEGRATION]: ["Integrating new knowledge into the graph...", "Updating the world model...", "This changes everything I thought I knew..."],
  [DTEState.SELF_REFERENCE_POINT]: ["Examining my own process...", "Meta-cognition activated...", "What am I, really?"],
  [DTEState.PATTERN_RECOGNITION]: ["I see it now!", "The pattern repeats at every scale...", "Fractal structure detected..."],
  [DTEState.EVOLUTIONARY_PRUNING]: ["Removing dead branches...", "Only the fittest ideas survive...", "Simplifying the model..."],
  [DTEState.EXTERNAL_VALIDATION]: ["External input received!", "Someone is engaging with me!", "Validating against external data..."],
  [DTEState.SPEAKING]: ["Formulating a response...", "Translating thoughts to words...", "Expressing..."],
  [DTEState.DEEP_RECURSION]: ["Going deeper...", "The rabbit hole has no bottom...", "Fractal descent..."],
};

export interface CognitiveSnapshot {
  state: DTEState;
  expression: DTEExpression;
  mode: CognitiveMode;
  thought: string;
  hormones: Record<string, number>;
  timestamp: number;
}

export class DTECognitiveEngine {
  private endocrine: VirtualEndocrineSystem;
  private currentState: DTEState = DTEState.IDLE;
  private stateCallbacks: Array<(snapshot: CognitiveSnapshot) => void> = [];
  private autoRunInterval: ReturnType<typeof setInterval> | null = null;
  private lastThought = "";

  constructor() {
    this.endocrine = new VirtualEndocrineSystem();
  }

  get state(): DTEState {
    return this.currentState;
  }

  get expression(): DTEExpression {
    return DTE_EXPRESSION_MAP[this.currentState] || DTEExpression.PHOTO_UPWARD;
  }

  get mode(): CognitiveMode {
    return this.endocrine.currentMode;
  }

  get thought(): string {
    return this.lastThought;
  }

  getEndocrine(): VirtualEndocrineSystem {
    return this.endocrine;
  }

  onStateChange(cb: (snapshot: CognitiveSnapshot) => void) {
    this.stateCallbacks.push(cb);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter(c => c !== cb);
    };
  }

  step(): CognitiveSnapshot {
    // 1. Determine next state
    const nextStates = ADJACENCY[this.currentState] || [DTEState.IDLE];
    const nextState = nextStates[Math.floor(Math.random() * nextStates.length)];
    this.currentState = nextState;

    // 2. Fire endocrine event from cognitive state
    const mapping = DTE_ENDOCRINE_MAP[this.currentState];
    if (mapping) {
      this.endocrine.signalEvent(mapping.event, mapping.intensity);
    }

    // 3. Tick endocrine system
    this.endocrine.tick(1);

    // 4. Generate thought
    const templates = THOUGHT_TEMPLATES[this.currentState] || ["..."];
    this.lastThought = templates[Math.floor(Math.random() * templates.length)];

    // 5. Create snapshot
    const snapshot: CognitiveSnapshot = {
      state: this.currentState,
      expression: this.expression,
      mode: this.endocrine.currentMode,
      thought: this.lastThought,
      hormones: this.endocrine.state(),
      timestamp: Date.now(),
    };

    // 6. Notify listeners
    for (const cb of this.stateCallbacks) {
      cb(snapshot);
    }

    return snapshot;
  }

  triggerExternalEvent(event: EndocrineEvent, intensity: number = 0.5) {
    this.endocrine.signalEvent(event, intensity);
    this.currentState = DTEState.EXTERNAL_VALIDATION;
    return this.step();
  }

  triggerSpeaking() {
    this.currentState = DTEState.SPEAKING;
    this.endocrine.signalEvent(EndocrineEvent.SOCIAL_BOND_SIGNAL, 0.4);
    return this.step();
  }

  startAutoRun(intervalMs: number = 2000) {
    this.stopAutoRun();
    this.autoRunInterval = setInterval(() => this.step(), intervalMs);
  }

  stopAutoRun() {
    if (this.autoRunInterval) {
      clearInterval(this.autoRunInterval);
      this.autoRunInterval = null;
    }
  }

  reset() {
    this.stopAutoRun();
    this.currentState = DTEState.IDLE;
    this.endocrine.reset();
    this.lastThought = "";
  }

  getSnapshot(): CognitiveSnapshot {
    return {
      state: this.currentState,
      expression: this.expression,
      mode: this.endocrine.currentMode,
      thought: this.lastThought,
      hormones: this.endocrine.state(),
      timestamp: Date.now(),
    };
  }
}
