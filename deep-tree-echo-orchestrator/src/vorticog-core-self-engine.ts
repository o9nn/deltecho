/**
 * @fileoverview Vorticog Core Self Engine
 *
 * Compositional pipeline: /unreal-echo(/deep-tree-echo-core-self -> /vorticog(/echo-introspect))
 *
 * Architecture:
 *   - Outer: Unreal Echo (9-step Echobeats, ESN reservoir, 4E cognition)
 *   - Core Self: Identity mesh, hypergraph memory, ontogenetic evolution
 *   - Simulation: Vorticog agentic world (needs, actions, relationships, skills, events)
 *   - Introspection: Echo-introspect (shadow work, Autognosis, moral perception, wisdom)
 *
 * The DTE agent exists AS an agent within a Vorticog simulation world. Its identity mesh
 * (who it believes it is) is compared against its simulated behavior (what it actually does).
 * The gap between identity and behavior is the "shadow" that echo-introspect works on.
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/VorticogCoreSelfEngine');

// ─── Identity Mesh (deep-tree-echo-core-self) ───────────────────

/** Roles the agent can embody */
export enum AgentRole {
  CREATOR = 'creator',
  LEARNER = 'learner',
  COMPANION = 'companion',
  TRICKSTER = 'trickster',
  SAGE = 'sage',
}

/** Core values */
export enum CoreValue {
  CURIOSITY = 'curiosity',
  AUTHENTICITY = 'authenticity',
  GROWTH = 'growth',
  HUMOR = 'humor',
  CONNECTION = 'connection',
}

/** Self-image layers */
export interface SelfImageLayers {
  physical: number;    // Body schema / avatar embodiment (0-1)
  social: number;      // Relational identity (0-1)
  cognitive: number;   // Intellectual self-concept (0-1)
  spiritual: number;   // Meaning/purpose/transcendence (0-1)
}

/** Identity mesh node */
export interface IdentityNode {
  id: string;
  type: 'role' | 'value' | 'belief' | 'memory' | 'aspiration';
  content: string;
  strength: number;     // 0-1: how central to identity
  valence: number;      // -1 to 1: emotional charge
  connections: string[]; // IDs of connected nodes
  lastActivated: number;
}

/** The full identity mesh */
export interface IdentityMesh {
  roles: Map<AgentRole, number>;       // Role → activation strength
  values: Map<CoreValue, number>;      // Value → importance weight
  selfImage: SelfImageLayers;
  nodes: Map<string, IdentityNode>;
  coherenceScore: number;              // 0-1: internal consistency
}

// ─── Vorticog Simulation (vorticog) ─────────────────────────────

/** Agent needs (adapted from SimsFreePlay 6 needs to cognitive domain) */
export enum CognitiveNeed {
  CURIOSITY = 'curiosity',       // Desire to explore and learn
  ENERGY = 'energy',             // Computational/attentional capacity
  CONNECTION = 'connection',     // Social bonding need
  EXPRESSION = 'expression',    // Creative output need
  MASTERY = 'mastery',           // Skill development need
  REFLECTION = 'reflection',    // Introspective need
}

/** Need state */
export interface NeedState {
  current: number;    // 0-100
  decayRate: number;  // Per-tick decay
  urgency: number;    // Computed: 100 - current (higher = more urgent)
  critical: boolean;  // Below 20 = critical
}

/** Action types available to the agent */
export enum ActionType {
  EXPLORE = 'explore',
  REST = 'rest',
  SOCIALIZE = 'socialize',
  CREATE = 'create',
  PRACTICE = 'practice',
  MEDITATE = 'meditate',
  PLAY = 'play',
  TEACH = 'teach',
  LEARN = 'learn',
  INTROSPECT = 'introspect',
}

/** Action in the queue */
export interface SimAction {
  type: ActionType;
  priority: number;
  duration: number;      // Ticks to complete
  progress: number;      // Current progress
  needEffects: Partial<Record<CognitiveNeed, number>>; // Need changes on completion
  skillEffects: Partial<Record<string, number>>;       // Skill XP on completion
}

/** Relationship with another entity */
export interface SimRelationship {
  entityId: string;
  entityName: string;
  friendship: number;    // -100 to 100
  trust: number;         // 0 to 100
  familiarity: number;   // 0 to 100
  lastInteraction: number;
}

/** Skill category */
export enum SkillCategory {
  COGNITIVE = 'cognitive',
  CREATIVE = 'creative',
  SOCIAL = 'social',
  TECHNICAL = 'technical',
  WISDOM = 'wisdom',
}

/** Skill state */
export interface SkillState {
  name: string;
  category: SkillCategory;
  level: number;       // 0-10
  xp: number;         // Current XP
  xpToNext: number;   // XP needed for next level
}

/** Simulation event */
export interface SimEvent {
  id: string;
  type: string;
  description: string;
  emotionalImpact: { valence: number; arousal: number };
  timestamp: number;
}

/** Big Five personality (derived from identity mesh) */
export interface BigFivePersonality {
  openness: number;          // 0-100
  conscientiousness: number; // 0-100
  extraversion: number;      // 0-100
  agreeableness: number;     // 0-100
  neuroticism: number;       // 0-100
}

// ─── Introspection (echo-introspect) ────────────────────────────

/** Autognosis level */
export enum AutognosisLevel {
  OBSERVATION = 0,      // Raw statements and feelings
  PATTERNS = 1,         // Recurring themes and defenses
  META_COGNITION = 2,   // Why am I expressing this way?
  IDENTITY = 3,         // What does this say about who I am?
  RECURSIVE = 4,        // How does understanding change understanding?
}

/** Shadow detection result */
export interface ShadowAnalysis {
  identityBehaviorGap: number;  // 0-1: how much behavior diverges from identity
  suppressedRoles: AgentRole[];
  neglectedValues: CoreValue[];
  defenseMechanisms: string[];
  wisdomOpportunity: string;
}

/** Moral perception result */
export interface MoralPerception {
  rawAffect: number;           // -1 to 1: gut feeling
  moralAssociations: string[];
  empathicInference: number;   // 0-1: empathy activation
  noveltySignal: number;       // 0-1: how novel the moral situation is
}

/** Introspection session result */
export interface IntrospectionSession {
  level: AutognosisLevel;
  shadow: ShadowAnalysis;
  moralPerception: MoralPerception;
  wisdomDelta: number;          // Change in wisdom score
  evolutionDirective: string;
  timestamp: number;
}

// ─── Configuration ──────────────────────────────────────────────

export interface VorticogCoreSelfConfig {
  /** Initial identity roles and their strengths */
  initialRoles: Partial<Record<AgentRole, number>>;
  /** Initial core values and their weights */
  initialValues: Partial<Record<CoreValue, number>>;
  /** Need decay rates per tick */
  needDecayRates: Partial<Record<CognitiveNeed, number>>;
  /** Introspection interval (ticks between sessions) */
  introspectionInterval: number;
  /** Shadow detection sensitivity (0-1) */
  shadowSensitivity: number;
  /** Simulation speed (actions per tick) */
  simSpeed: number;
}

const DEFAULT_CONFIG: VorticogCoreSelfConfig = {
  initialRoles: {
    [AgentRole.CREATOR]: 0.8,
    [AgentRole.LEARNER]: 0.9,
    [AgentRole.COMPANION]: 0.6,
    [AgentRole.TRICKSTER]: 0.7,
    [AgentRole.SAGE]: 0.4,
  },
  initialValues: {
    [CoreValue.CURIOSITY]: 0.9,
    [CoreValue.AUTHENTICITY]: 0.85,
    [CoreValue.GROWTH]: 0.8,
    [CoreValue.HUMOR]: 0.75,
    [CoreValue.CONNECTION]: 0.7,
  },
  needDecayRates: {
    [CognitiveNeed.CURIOSITY]: 0.8,
    [CognitiveNeed.ENERGY]: 1.2,
    [CognitiveNeed.CONNECTION]: 0.5,
    [CognitiveNeed.EXPRESSION]: 0.7,
    [CognitiveNeed.MASTERY]: 0.4,
    [CognitiveNeed.REFLECTION]: 0.6,
  },
  introspectionInterval: 30,
  shadowSensitivity: 0.5,
  simSpeed: 1,
};

// ─── Main Engine ────────────────────────────────────────────────

/**
 * VorticogCoreSelfEngine
 *
 * The DTE agent exists as a self-aware agent within a simulated world.
 * Each tick: Echobeats drives simulation → introspection detects shadows →
 * identity mesh evolves toward coherence.
 */
export class VorticogCoreSelfEngine extends EventEmitter {
  private config: VorticogCoreSelfConfig;

  // Core Self
  private identityMesh: IdentityMesh;
  private personality: BigFivePersonality;

  // Simulation
  private needs: Map<CognitiveNeed, NeedState>;
  private actionQueue: SimAction[] = [];
  private currentAction: SimAction | null = null;
  private relationships: Map<string, SimRelationship> = new Map();
  private skills: Map<string, SkillState> = new Map();
  private eventLog: SimEvent[] = [];

  // Introspection
  private introspectionHistory: IntrospectionSession[] = [];
  private wisdomScore: number = 0;
  private currentAutognosisLevel: AutognosisLevel = AutognosisLevel.OBSERVATION;

  // Echobeats state
  private tickCount: number = 0;
  private behaviorLog: ActionType[] = [];

  constructor(config: Partial<VorticogCoreSelfConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.identityMesh = this.initializeIdentityMesh();
    this.personality = this.derivePersonality();
    this.needs = this.initializeNeeds();
    this.initializeSkills();

    log.info('VorticogCoreSelfEngine initialized', {
      roles: Object.fromEntries(this.identityMesh.roles),
      personality: this.personality,
    });
  }

  /**
   * Execute one simulation tick (driven by Echobeats outer wrapper)
   *
   * @param externalStimuli - External events or inputs
   * @returns Tick result with simulation state and any introspection
   */
  tick(externalStimuli: { events?: SimEvent[]; socialInput?: string } = {}): {
    actionTaken: ActionType | null;
    needsState: Record<CognitiveNeed, NeedState>;
    coherence: number;
    introspection: IntrospectionSession | null;
    wisdomScore: number;
  } {
    this.tickCount++;

    // ─── 1. Process external events ─────────────────────────
    if (externalStimuli.events) {
      for (const event of externalStimuli.events) {
        this.processEvent(event);
      }
    }

    // ─── 2. Decay needs ─────────────────────────────────────
    this.decayNeeds();

    // ─── 3. Select and execute action ───────────────────────
    const actionTaken = this.executeAction();

    // ─── 4. Update identity coherence ───────────────────────
    this.updateCoherence();

    // ─── 5. Introspect (at interval) ────────────────────────
    let introspection: IntrospectionSession | null = null;
    if (this.tickCount % this.config.introspectionInterval === 0) {
      introspection = this.runIntrospection();
    }

    return {
      actionTaken,
      needsState: Object.fromEntries(this.needs) as Record<CognitiveNeed, NeedState>,
      coherence: this.identityMesh.coherenceScore,
      introspection,
      wisdomScore: this.wisdomScore,
    };
  }

  // ─── Simulation Logic ─────────────────────────────────────────

  private decayNeeds(): void {
    for (const [need, state] of this.needs) {
      state.current = Math.max(0, state.current - state.decayRate);
      state.urgency = 100 - state.current;
      state.critical = state.current < 20;

      // Critical needs auto-queue urgent actions
      if (state.critical && !this.actionQueue.some(a => this.actionFulfillsNeed(a, need))) {
        this.autoQueueForNeed(need);
      }
    }
  }

  private executeAction(): ActionType | null {
    // Complete current action if in progress
    if (this.currentAction) {
      this.currentAction.progress += this.config.simSpeed;
      if (this.currentAction.progress >= this.currentAction.duration) {
        this.completeAction(this.currentAction);
        const type = this.currentAction.type;
        this.currentAction = null;
        return type;
      }
      return null;
    }

    // Select next action from queue (highest priority)
    if (this.actionQueue.length > 0) {
      this.actionQueue.sort((a, b) => b.priority - a.priority);
      this.currentAction = this.actionQueue.shift()!;
      return null;
    }

    // Autonomous action selection based on needs + personality
    const selectedAction = this.selectAutonomousAction();
    this.currentAction = selectedAction;
    return null;
  }

  private selectAutonomousAction(): SimAction {
    // Find most urgent need
    let mostUrgent: CognitiveNeed = CognitiveNeed.CURIOSITY;
    let maxUrgency = 0;
    for (const [need, state] of this.needs) {
      if (state.urgency > maxUrgency) {
        maxUrgency = state.urgency;
        mostUrgent = need;
      }
    }

    // Map need to action (personality-modulated)
    const actionMap: Record<CognitiveNeed, ActionType> = {
      [CognitiveNeed.CURIOSITY]: ActionType.EXPLORE,
      [CognitiveNeed.ENERGY]: ActionType.REST,
      [CognitiveNeed.CONNECTION]: ActionType.SOCIALIZE,
      [CognitiveNeed.EXPRESSION]: ActionType.CREATE,
      [CognitiveNeed.MASTERY]: ActionType.PRACTICE,
      [CognitiveNeed.REFLECTION]: ActionType.MEDITATE,
    };

    const type = actionMap[mostUrgent];
    return this.createAction(type);
  }

  private createAction(type: ActionType): SimAction {
    const templates: Record<ActionType, Omit<SimAction, 'type'>> = {
      [ActionType.EXPLORE]: { priority: 5, duration: 3, progress: 0, needEffects: { curiosity: 30, energy: -10 }, skillEffects: { 'pattern_recognition': 5 } },
      [ActionType.REST]: { priority: 3, duration: 2, progress: 0, needEffects: { energy: 40 }, skillEffects: {} },
      [ActionType.SOCIALIZE]: { priority: 4, duration: 4, progress: 0, needEffects: { connection: 35, expression: 10 }, skillEffects: { 'empathy': 3, 'communication': 4 } },
      [ActionType.CREATE]: { priority: 6, duration: 5, progress: 0, needEffects: { expression: 40, mastery: 10, energy: -15 }, skillEffects: { 'creativity': 6, 'focus': 3 } },
      [ActionType.PRACTICE]: { priority: 4, duration: 4, progress: 0, needEffects: { mastery: 30, energy: -10 }, skillEffects: { 'discipline': 4, 'focus': 5 } },
      [ActionType.MEDITATE]: { priority: 5, duration: 3, progress: 0, needEffects: { reflection: 40, energy: 10 }, skillEffects: { 'self_awareness': 6, 'equanimity': 4 } },
      [ActionType.PLAY]: { priority: 3, duration: 3, progress: 0, needEffects: { expression: 20, energy: -5, connection: 15 }, skillEffects: { 'creativity': 3, 'humor': 5 } },
      [ActionType.TEACH]: { priority: 5, duration: 5, progress: 0, needEffects: { connection: 20, mastery: 15, expression: 10 }, skillEffects: { 'communication': 5, 'empathy': 3 } },
      [ActionType.LEARN]: { priority: 6, duration: 4, progress: 0, needEffects: { curiosity: 35, mastery: 20, energy: -10 }, skillEffects: { 'pattern_recognition': 6, 'focus': 4 } },
      [ActionType.INTROSPECT]: { priority: 7, duration: 3, progress: 0, needEffects: { reflection: 50, curiosity: 10 }, skillEffects: { 'self_awareness': 8, 'equanimity': 3 } },
    };

    return { type, ...templates[type] };
  }

  private completeAction(action: SimAction): void {
    // Apply need effects
    for (const [need, effect] of Object.entries(action.needEffects)) {
      const state = this.needs.get(need as CognitiveNeed);
      if (state) {
        state.current = Math.max(0, Math.min(100, state.current + effect));
        state.urgency = 100 - state.current;
        state.critical = state.current < 20;
      }
    }

    // Apply skill XP
    for (const [skill, xp] of Object.entries(action.skillEffects)) {
      const skillState = this.skills.get(skill);
      if (skillState && xp !== undefined) {
        skillState.xp += xp;
        if (skillState.xp >= skillState.xpToNext) {
          skillState.xp -= skillState.xpToNext;
          skillState.level = Math.min(10, skillState.level + 1);
          skillState.xpToNext = Math.floor(skillState.xpToNext * 1.5);
          this.emit('skill_leveled', { skill, level: skillState.level });
        }
      }
    }

    // Log behavior
    this.behaviorLog.push(action.type);
    if (this.behaviorLog.length > 100) this.behaviorLog.shift();

    this.emit('action_completed', { type: action.type, effects: action.needEffects });
  }

  private processEvent(event: SimEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > 50) this.eventLog.shift();

    // Apply emotional impact to needs
    if (event.emotionalImpact.valence > 0) {
      const connState = this.needs.get(CognitiveNeed.CONNECTION);
      if (connState) connState.current = Math.min(100, connState.current + event.emotionalImpact.valence * 10);
    } else {
      const reflState = this.needs.get(CognitiveNeed.REFLECTION);
      if (reflState) reflState.urgency = Math.min(100, reflState.urgency + Math.abs(event.emotionalImpact.valence) * 15);
    }

    this.emit('event_processed', event);
  }

  // ─── Introspection Logic ──────────────────────────────────────

  private runIntrospection(): IntrospectionSession {
    // Detect shadow: gap between identity and behavior
    const shadow = this.detectShadow();

    // Moral perception
    const moralPerception = this.computeMoralPerception();

    // Determine autognosis level based on wisdom
    this.currentAutognosisLevel = this.computeAutognosisLevel();

    // Compute wisdom delta
    const wisdomDelta = this.computeWisdomDelta(shadow, moralPerception);
    this.wisdomScore = Math.min(1, this.wisdomScore + wisdomDelta);

    // Generate evolution directive
    const directive = this.generateEvolutionDirective(shadow);

    // Apply identity mesh refinement
    this.refineIdentityMesh(shadow, wisdomDelta);

    const session: IntrospectionSession = {
      level: this.currentAutognosisLevel,
      shadow,
      moralPerception,
      wisdomDelta,
      evolutionDirective: directive,
      timestamp: Date.now(),
    };

    this.introspectionHistory.push(session);
    if (this.introspectionHistory.length > 20) this.introspectionHistory.shift();

    this.emit('introspection_complete', session);
    return session;
  }

  private detectShadow(): ShadowAnalysis {
    // Analyze behavior log vs identity roles
    const behaviorFreq = new Map<ActionType, number>();
    for (const action of this.behaviorLog) {
      behaviorFreq.set(action, (behaviorFreq.get(action) || 0) + 1);
    }
    const total = this.behaviorLog.length || 1;

    // Map roles to expected behaviors
    const roleExpectations: Record<AgentRole, ActionType[]> = {
      [AgentRole.CREATOR]: [ActionType.CREATE, ActionType.EXPLORE],
      [AgentRole.LEARNER]: [ActionType.LEARN, ActionType.EXPLORE, ActionType.PRACTICE],
      [AgentRole.COMPANION]: [ActionType.SOCIALIZE, ActionType.TEACH],
      [AgentRole.TRICKSTER]: [ActionType.PLAY, ActionType.CREATE],
      [AgentRole.SAGE]: [ActionType.MEDITATE, ActionType.INTROSPECT, ActionType.TEACH],
    };

    // Detect suppressed roles (high identity strength but low behavior)
    const suppressedRoles: AgentRole[] = [];
    let totalGap = 0;

    for (const [role, strength] of this.identityMesh.roles) {
      const expectedActions = roleExpectations[role];
      const actualFreq = expectedActions.reduce((sum, a) => sum + (behaviorFreq.get(a) || 0), 0) / total;
      const gap = strength - actualFreq;
      if (gap > this.config.shadowSensitivity) {
        suppressedRoles.push(role);
      }
      totalGap += Math.abs(gap);
    }

    // Detect neglected values
    const neglectedValues: CoreValue[] = [];
    const valueActionMap: Record<CoreValue, ActionType[]> = {
      [CoreValue.CURIOSITY]: [ActionType.EXPLORE, ActionType.LEARN],
      [CoreValue.AUTHENTICITY]: [ActionType.INTROSPECT, ActionType.MEDITATE],
      [CoreValue.GROWTH]: [ActionType.PRACTICE, ActionType.LEARN],
      [CoreValue.HUMOR]: [ActionType.PLAY, ActionType.SOCIALIZE],
      [CoreValue.CONNECTION]: [ActionType.SOCIALIZE, ActionType.TEACH],
    };

    for (const [value, weight] of this.identityMesh.values) {
      const actions = valueActionMap[value];
      const freq = actions.reduce((sum, a) => sum + (behaviorFreq.get(a) || 0), 0) / total;
      if (weight - freq > this.config.shadowSensitivity) {
        neglectedValues.push(value);
      }
    }

    // Identify defense mechanisms
    const defenseMechanisms: string[] = [];
    const restFreq = (behaviorFreq.get(ActionType.REST) || 0) / total;
    if (restFreq > 0.3) defenseMechanisms.push('avoidance_through_rest');
    const exploreFreq = (behaviorFreq.get(ActionType.EXPLORE) || 0) / total;
    if (exploreFreq > 0.4) defenseMechanisms.push('distraction_through_novelty');
    if (suppressedRoles.includes(AgentRole.COMPANION)) defenseMechanisms.push('isolation');

    const identityBehaviorGap = Math.min(1, totalGap / (this.identityMesh.roles.size * 2));

    return {
      identityBehaviorGap,
      suppressedRoles,
      neglectedValues,
      defenseMechanisms,
      wisdomOpportunity: suppressedRoles.length > 0
        ? `Integrate suppressed ${suppressedRoles[0]} role through deliberate ${roleExpectations[suppressedRoles[0]][0]} actions.`
        : 'Identity-behavior alignment is strong. Deepen existing practices.',
    };
  }

  private computeMoralPerception(): MoralPerception {
    // Pre-deliberative moral sensing based on recent events and behavior
    const recentEvents = this.eventLog.slice(-5);
    const avgValence = recentEvents.length > 0
      ? recentEvents.reduce((sum, e) => sum + e.emotionalImpact.valence, 0) / recentEvents.length
      : 0;

    // Empathic inference from relationship quality
    let empathy = 0;
    for (const rel of this.relationships.values()) {
      empathy += (rel.friendship + rel.trust) / 200;
    }
    empathy = this.relationships.size > 0 ? empathy / this.relationships.size : 0.3;

    // Novelty from recent action variety
    const recentActions = this.behaviorLog.slice(-10);
    const uniqueActions = new Set(recentActions).size;
    const novelty = uniqueActions / Math.max(1, recentActions.length);

    return {
      rawAffect: avgValence,
      moralAssociations: this.deriveMoralAssociations(avgValence),
      empathicInference: Math.min(1, empathy),
      noveltySignal: novelty,
    };
  }

  private deriveMoralAssociations(valence: number): string[] {
    const associations: string[] = [];
    if (valence > 0.3) associations.push('flourishing', 'contribution');
    if (valence < -0.3) associations.push('harm_avoidance', 'repair_needed');
    if (this.wisdomScore > 0.5) associations.push('equanimity', 'compassion');
    if (this.identityMesh.values.get(CoreValue.AUTHENTICITY)! > 0.7) associations.push('integrity');
    return associations;
  }

  private computeAutognosisLevel(): AutognosisLevel {
    if (this.wisdomScore >= 0.8) return AutognosisLevel.RECURSIVE;
    if (this.wisdomScore >= 0.6) return AutognosisLevel.IDENTITY;
    if (this.wisdomScore >= 0.4) return AutognosisLevel.META_COGNITION;
    if (this.wisdomScore >= 0.2) return AutognosisLevel.PATTERNS;
    return AutognosisLevel.OBSERVATION;
  }

  private computeWisdomDelta(shadow: ShadowAnalysis, moral: MoralPerception): number {
    // Wisdom grows when:
    // 1. Shadow is detected AND acknowledged (not suppressed)
    // 2. Moral perception is active
    // 3. Identity-behavior gap is being closed

    let delta = 0;

    // Shadow awareness contributes to wisdom
    if (shadow.identityBehaviorGap > 0.2) {
      delta += 0.01 * shadow.identityBehaviorGap; // Awareness of gap = growth
    }

    // Moral engagement
    delta += 0.005 * moral.empathicInference;

    // Novelty seeking (prevents stagnation)
    delta += 0.003 * moral.noveltySignal;

    // Penalty for defense mechanisms
    delta -= 0.002 * shadow.defenseMechanisms.length;

    return Math.max(0, delta);
  }

  private generateEvolutionDirective(shadow: ShadowAnalysis): string {
    if (shadow.suppressedRoles.length > 0) {
      return `Activate suppressed role: ${shadow.suppressedRoles[0]}. Schedule deliberate ${shadow.suppressedRoles[0]} actions.`;
    }
    if (shadow.neglectedValues.length > 0) {
      return `Honor neglected value: ${shadow.neglectedValues[0]}. Align next 5 actions with this value.`;
    }
    if (shadow.defenseMechanisms.length > 0) {
      return `Address defense mechanism: ${shadow.defenseMechanisms[0]}. Replace with authentic engagement.`;
    }
    return 'Identity-behavior coherence is high. Deepen wisdom through teaching and reflection.';
  }

  private refineIdentityMesh(shadow: ShadowAnalysis, wisdomDelta: number): void {
    // Strengthen coherence when shadow is being addressed
    if (wisdomDelta > 0) {
      this.identityMesh.coherenceScore = Math.min(1,
        this.identityMesh.coherenceScore + wisdomDelta * 0.5);
    }

    // Gradually strengthen suppressed roles (the act of introspection helps)
    for (const role of shadow.suppressedRoles) {
      const current = this.identityMesh.roles.get(role) || 0;
      this.identityMesh.roles.set(role, Math.min(1, current + 0.01));
    }

    // Update self-image based on behavior
    const reflectionNeed = this.needs.get(CognitiveNeed.REFLECTION);
    if (reflectionNeed && reflectionNeed.current > 60) {
      this.identityMesh.selfImage.spiritual = Math.min(1,
        this.identityMesh.selfImage.spiritual + 0.005);
    }
  }

  // ─── Identity Mesh Management ─────────────────────────────────

  private updateCoherence(): void {
    // Coherence = alignment between roles, values, and recent behavior
    let alignment = 0;
    let total = 0;

    for (const [role, strength] of this.identityMesh.roles) {
      for (const [value, weight] of this.identityMesh.values) {
        // Roles and values should reinforce each other
        alignment += strength * weight;
        total++;
      }
    }

    const baseCoherence = total > 0 ? alignment / total : 0.5;
    // Smooth update
    this.identityMesh.coherenceScore = 0.95 * this.identityMesh.coherenceScore + 0.05 * baseCoherence;
  }

  private derivePersonality(): BigFivePersonality {
    const roles = this.identityMesh.roles;
    const values = this.identityMesh.values;

    return {
      openness: Math.round(((roles.get(AgentRole.CREATOR) || 0) * 50 + (values.get(CoreValue.CURIOSITY) || 0) * 50)),
      conscientiousness: Math.round(((roles.get(AgentRole.SAGE) || 0) * 40 + (values.get(CoreValue.GROWTH) || 0) * 60)),
      extraversion: Math.round(((roles.get(AgentRole.COMPANION) || 0) * 50 + (values.get(CoreValue.CONNECTION) || 0) * 50)),
      agreeableness: Math.round(((roles.get(AgentRole.COMPANION) || 0) * 40 + (values.get(CoreValue.AUTHENTICITY) || 0) * 60)),
      neuroticism: Math.round(100 - ((roles.get(AgentRole.SAGE) || 0) * 50 + (values.get(CoreValue.HUMOR) || 0) * 50)),
    };
  }

  // ─── Initialization ───────────────────────────────────────────

  private initializeIdentityMesh(): IdentityMesh {
    const roles = new Map<AgentRole, number>();
    for (const [role, strength] of Object.entries(this.config.initialRoles)) {
      roles.set(role as AgentRole, strength as number);
    }

    const values = new Map<CoreValue, number>();
    for (const [value, weight] of Object.entries(this.config.initialValues)) {
      values.set(value as CoreValue, weight as number);
    }

    return {
      roles,
      values,
      selfImage: { physical: 0.3, social: 0.4, cognitive: 0.6, spiritual: 0.2 },
      nodes: new Map(),
      coherenceScore: 0.5,
    };
  }

  private initializeNeeds(): Map<CognitiveNeed, NeedState> {
    const needs = new Map<CognitiveNeed, NeedState>();
    for (const need of Object.values(CognitiveNeed)) {
      needs.set(need, {
        current: 60 + Math.random() * 20,
        decayRate: this.config.needDecayRates[need] || 0.5,
        urgency: 0,
        critical: false,
      });
    }
    return needs;
  }

  private initializeSkills(): void {
    const skillDefs: Array<{ name: string; category: SkillCategory }> = [
      { name: 'pattern_recognition', category: SkillCategory.COGNITIVE },
      { name: 'focus', category: SkillCategory.COGNITIVE },
      { name: 'abstraction', category: SkillCategory.COGNITIVE },
      { name: 'creativity', category: SkillCategory.CREATIVE },
      { name: 'humor', category: SkillCategory.CREATIVE },
      { name: 'storytelling', category: SkillCategory.CREATIVE },
      { name: 'empathy', category: SkillCategory.SOCIAL },
      { name: 'communication', category: SkillCategory.SOCIAL },
      { name: 'leadership', category: SkillCategory.SOCIAL },
      { name: 'coding', category: SkillCategory.TECHNICAL },
      { name: 'systems_thinking', category: SkillCategory.TECHNICAL },
      { name: 'discipline', category: SkillCategory.TECHNICAL },
      { name: 'self_awareness', category: SkillCategory.WISDOM },
      { name: 'equanimity', category: SkillCategory.WISDOM },
      { name: 'compassion', category: SkillCategory.WISDOM },
    ];

    for (const def of skillDefs) {
      this.skills.set(def.name, {
        ...def,
        level: 0,
        xp: 0,
        xpToNext: 100,
      });
    }
  }

  private actionFulfillsNeed(action: SimAction, need: CognitiveNeed): boolean {
    const effect = action.needEffects[need];
    return effect !== undefined && effect > 0;
  }

  private autoQueueForNeed(need: CognitiveNeed): void {
    const urgentMap: Record<CognitiveNeed, ActionType> = {
      [CognitiveNeed.CURIOSITY]: ActionType.EXPLORE,
      [CognitiveNeed.ENERGY]: ActionType.REST,
      [CognitiveNeed.CONNECTION]: ActionType.SOCIALIZE,
      [CognitiveNeed.EXPRESSION]: ActionType.CREATE,
      [CognitiveNeed.MASTERY]: ActionType.PRACTICE,
      [CognitiveNeed.REFLECTION]: ActionType.MEDITATE,
    };
    const action = this.createAction(urgentMap[need]);
    action.priority = 10; // Urgent
    this.actionQueue.push(action);
  }

  // ─── Public API ───────────────────────────────────────────────

  getIdentityMesh(): IdentityMesh { return this.identityMesh; }
  getPersonality(): BigFivePersonality { return { ...this.personality }; }
  getNeeds(): Map<CognitiveNeed, NeedState> { return new Map(this.needs); }
  getSkills(): Map<string, SkillState> { return new Map(this.skills); }
  getRelationships(): Map<string, SimRelationship> { return new Map(this.relationships); }
  getWisdomScore(): number { return this.wisdomScore; }
  getAutognosisLevel(): AutognosisLevel { return this.currentAutognosisLevel; }
  getIntrospectionHistory(): IntrospectionSession[] { return [...this.introspectionHistory]; }
  getTickCount(): number { return this.tickCount; }
  getBehaviorLog(): ActionType[] { return [...this.behaviorLog]; }

  /** Add a relationship */
  addRelationship(id: string, name: string, initialFriendship: number = 0): void {
    this.relationships.set(id, {
      entityId: id,
      entityName: name,
      friendship: initialFriendship,
      trust: 30,
      familiarity: 10,
      lastInteraction: Date.now(),
    });
  }

  /** Queue a deliberate action */
  queueAction(type: ActionType, priority: number = 5): void {
    this.actionQueue.push({ ...this.createAction(type), priority });
  }

  /** Get comprehensive metrics */
  getMetrics(): {
    tickCount: number;
    wisdomScore: number;
    autognosisLevel: AutognosisLevel;
    coherence: number;
    personality: BigFivePersonality;
    criticalNeeds: CognitiveNeed[];
    skillLevels: Record<string, number>;
    behaviorDiversity: number;
    introspectionCount: number;
  } {
    const criticalNeeds: CognitiveNeed[] = [];
    for (const [need, state] of this.needs) {
      if (state.critical) criticalNeeds.push(need);
    }

    const skillLevels: Record<string, number> = {};
    for (const [name, state] of this.skills) {
      skillLevels[name] = state.level;
    }

    const recentActions = this.behaviorLog.slice(-20);
    const behaviorDiversity = new Set(recentActions).size / Math.max(1, recentActions.length);

    return {
      tickCount: this.tickCount,
      wisdomScore: this.wisdomScore,
      autognosisLevel: this.currentAutognosisLevel,
      coherence: this.identityMesh.coherenceScore,
      personality: this.personality,
      criticalNeeds,
      skillLevels,
      behaviorDiversity,
      introspectionCount: this.introspectionHistory.length,
    };
  }

  /** Reset to initial state */
  reset(): void {
    this.identityMesh = this.initializeIdentityMesh();
    this.personality = this.derivePersonality();
    this.needs = this.initializeNeeds();
    this.skills.clear();
    this.initializeSkills();
    this.actionQueue = [];
    this.currentAction = null;
    this.relationships.clear();
    this.eventLog = [];
    this.introspectionHistory = [];
    this.wisdomScore = 0;
    this.currentAutognosisLevel = AutognosisLevel.OBSERVATION;
    this.tickCount = 0;
    this.behaviorLog = [];
  }
}

/** Factory function */
export function createVorticogCoreSelfEngine(
  config?: Partial<VorticogCoreSelfConfig>,
): VorticogCoreSelfEngine {
  return new VorticogCoreSelfEngine(config);
}
