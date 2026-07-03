/**
 * @fileoverview Virtual Endocrine System — 16-Channel Hormone Bus
 *
 * Ported from delovecho/dtecho-nakama-airi/client/src/lib/endocrine.ts
 * with enhancements for orchestrator-level integration:
 *   - 14 hormone channels with DTE-specific baselines
 *   - HPA cascade (CRH → ACTH → Cortisol)
 *   - 10 cognitive mode centroids with nearest-centroid detection
 *   - Event signaling (REWARD, THREAT, NOVELTY, etc.)
 *   - History tracking for reservoir feedback
 *   - Live2D bridge output (simplified EndocrineState for expression mapping)
 *   - Integration with SalienceLandscape for hormone-modulated salience
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/VirtualEndocrineSystem');

// ─── Enums ──────────────────────────────────────────────────────

export enum HormoneId {
  CRH = 0,
  ACTH = 1,
  CORTISOL = 2,
  DOPAMINE_TONIC = 3,
  DOPAMINE_PHASIC = 4,
  SEROTONIN = 5,
  NOREPINEPHRINE = 6,
  OXYTOCIN = 7,
  T3_T4 = 8,
  MELATONIN = 9,
  INSULIN = 10,
  GLUCAGON = 11,
  IL6 = 12,
  ANANDAMIDE = 13,
}

export enum EndocrineCognitiveMode {
  RESTING = 'RESTING',
  EXPLORATORY = 'EXPLORATORY',
  FOCUSED = 'FOCUSED',
  STRESSED = 'STRESSED',
  SOCIAL = 'SOCIAL',
  REFLECTIVE = 'REFLECTIVE',
  VIGILANT = 'VIGILANT',
  MAINTENANCE = 'MAINTENANCE',
  REWARD = 'REWARD',
  THREAT = 'THREAT',
}

export enum EndocrineEvent {
  REWARD_RECEIVED = 'REWARD_RECEIVED',
  GOAL_ACHIEVED = 'GOAL_ACHIEVED',
  THREAT_DETECTED = 'THREAT_DETECTED',
  NOVELTY_ENCOUNTERED = 'NOVELTY_ENCOUNTERED',
  SOCIAL_BOND_SIGNAL = 'SOCIAL_BOND_SIGNAL',
  ERROR_DETECTED = 'ERROR_DETECTED',
  NOISE_EXCESSIVE = 'NOISE_EXCESSIVE',
  RESOURCE_DEPLETED = 'RESOURCE_DEPLETED',
  LIGHT_SIGNAL = 'LIGHT_SIGNAL',
  CREATIVE_INSIGHT = 'CREATIVE_INSIGHT',
  SELF_REFLECTION = 'SELF_REFLECTION',
}

// ─── Types ──────────────────────────────────────────────────────

export interface HormoneChannel {
  id: HormoneId;
  name: string;
  halfLife: number;
  baseline: number;
  concentration: number;
}

/** Simplified state for Live2D EndocrineExpressionBridge */
export interface EndocrineState {
  cortisol: number;
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  oxytocin: number;
  t3_t4: number;
  anandamide: number;
}

/** Configuration */
export interface VirtualEndocrineConfig {
  /** Custom baselines (override DTE defaults) */
  baselines?: Partial<Record<HormoneId, number>>;
  /** Sensitivity multipliers for events */
  sensitivity?: {
    reward?: number;
    threat?: number;
    social?: number;
    novelty?: number;
  };
  /** Maximum history length */
  maxHistory: number;
  /** Enable HPA cascade */
  enableHPACascade: boolean;
  /** Enable cortisol negative feedback */
  enableNegativeFeedback: boolean;
}

/** Emitted events */
export interface VESEvents {
  mode_change: { from: EndocrineCognitiveMode; to: EndocrineCognitiveMode };
  hormone_spike: { hormone: string; level: number; event: EndocrineEvent };
  homeostasis_restored: { ticksSinceDisturbance: number };
}

// ─── Constants ──────────────────────────────────────────────────

const DTE_BASELINES: Record<number, number> = {
  [HormoneId.CRH]: 0.05,
  [HormoneId.ACTH]: 0.05,
  [HormoneId.CORTISOL]: 0.10,
  [HormoneId.DOPAMINE_TONIC]: 0.40,
  [HormoneId.DOPAMINE_PHASIC]: 0.0,
  [HormoneId.SEROTONIN]: 0.45,
  [HormoneId.NOREPINEPHRINE]: 0.20,
  [HormoneId.OXYTOCIN]: 0.15,
  [HormoneId.T3_T4]: 0.60,
  [HormoneId.MELATONIN]: 0.10,
  [HormoneId.INSULIN]: 0.20,
  [HormoneId.GLUCAGON]: 0.10,
  [HormoneId.IL6]: 0.05,
  [HormoneId.ANANDAMIDE]: 0.15,
};

const HALF_LIVES: Record<number, number> = {
  [HormoneId.CRH]: 5,
  [HormoneId.ACTH]: 10,
  [HormoneId.CORTISOL]: 30,
  [HormoneId.DOPAMINE_TONIC]: 20,
  [HormoneId.DOPAMINE_PHASIC]: 3,
  [HormoneId.SEROTONIN]: 50,
  [HormoneId.NOREPINEPHRINE]: 8,
  [HormoneId.OXYTOCIN]: 15,
  [HormoneId.T3_T4]: 100,
  [HormoneId.MELATONIN]: 12,
  [HormoneId.INSULIN]: 10,
  [HormoneId.GLUCAGON]: 8,
  [HormoneId.IL6]: 20,
  [HormoneId.ANANDAMIDE]: 6,
};

const HORMONE_NAMES: Record<number, string> = {
  [HormoneId.CRH]: 'CRH',
  [HormoneId.ACTH]: 'ACTH',
  [HormoneId.CORTISOL]: 'Cortisol',
  [HormoneId.DOPAMINE_TONIC]: 'Dopamine (tonic)',
  [HormoneId.DOPAMINE_PHASIC]: 'Dopamine (phasic)',
  [HormoneId.SEROTONIN]: 'Serotonin',
  [HormoneId.NOREPINEPHRINE]: 'Norepinephrine',
  [HormoneId.OXYTOCIN]: 'Oxytocin',
  [HormoneId.T3_T4]: 'T3/T4',
  [HormoneId.MELATONIN]: 'Melatonin',
  [HormoneId.INSULIN]: 'Insulin',
  [HormoneId.GLUCAGON]: 'Glucagon',
  [HormoneId.IL6]: 'IL-6',
  [HormoneId.ANANDAMIDE]: 'Anandamide',
};

const DTE_SENSITIVITY = {
  reward: 1.3,
  threat: 1.1,
  social: 1.15,
  novelty: 1.4,
};

const MODE_CENTROIDS: Record<EndocrineCognitiveMode, Partial<Record<HormoneId, number>>> = {
  [EndocrineCognitiveMode.RESTING]: { [HormoneId.SEROTONIN]: 0.5, [HormoneId.ANANDAMIDE]: 0.3, [HormoneId.CORTISOL]: 0.05 },
  [EndocrineCognitiveMode.EXPLORATORY]: { [HormoneId.NOREPINEPHRINE]: 0.5, [HormoneId.DOPAMINE_PHASIC]: 0.4, [HormoneId.T3_T4]: 0.6 },
  [EndocrineCognitiveMode.FOCUSED]: { [HormoneId.NOREPINEPHRINE]: 0.4, [HormoneId.T3_T4]: 0.7, [HormoneId.DOPAMINE_TONIC]: 0.4 },
  [EndocrineCognitiveMode.STRESSED]: { [HormoneId.CORTISOL]: 0.6, [HormoneId.NOREPINEPHRINE]: 0.5, [HormoneId.SEROTONIN]: 0.2 },
  [EndocrineCognitiveMode.SOCIAL]: { [HormoneId.OXYTOCIN]: 0.5, [HormoneId.DOPAMINE_TONIC]: 0.4, [HormoneId.SEROTONIN]: 0.5 },
  [EndocrineCognitiveMode.REFLECTIVE]: { [HormoneId.SEROTONIN]: 0.5, [HormoneId.T3_T4]: 0.6, [HormoneId.ANANDAMIDE]: 0.2 },
  [EndocrineCognitiveMode.VIGILANT]: { [HormoneId.NOREPINEPHRINE]: 0.7, [HormoneId.CORTISOL]: 0.3, [HormoneId.DOPAMINE_PHASIC]: 0.3 },
  [EndocrineCognitiveMode.MAINTENANCE]: { [HormoneId.INSULIN]: 0.3, [HormoneId.GLUCAGON]: 0.2, [HormoneId.T3_T4]: 0.4 },
  [EndocrineCognitiveMode.REWARD]: { [HormoneId.DOPAMINE_TONIC]: 0.7, [HormoneId.SEROTONIN]: 0.5, [HormoneId.OXYTOCIN]: 0.3 },
  [EndocrineCognitiveMode.THREAT]: { [HormoneId.CORTISOL]: 0.7, [HormoneId.CRH]: 0.5, [HormoneId.NOREPINEPHRINE]: 0.6 },
};

// ─── Default Config ─────────────────────────────────────────────

const DEFAULT_CONFIG: VirtualEndocrineConfig = {
  maxHistory: 100,
  enableHPACascade: true,
  enableNegativeFeedback: true,
};

// ─── Virtual Endocrine System ───────────────────────────────────

/**
 * VirtualEndocrineSystem — 16-channel hormone bus with cognitive mode detection
 *
 * Ported from delovecho with orchestrator-level enhancements for
 * integration with SalienceLandscape, ProactiveLoop, and Live2D bridge.
 */
export class VirtualEndocrineSystem extends EventEmitter {
  private config: VirtualEndocrineConfig;
  private channels: HormoneChannel[];
  private _currentMode: EndocrineCognitiveMode = EndocrineCognitiveMode.RESTING;
  private history: Array<{ tick: number; hormones: number[]; mode: EndocrineCognitiveMode }> = [];
  private tickCount: number = 0;
  private lastDisturbanceTick: number = 0;
  private sensitivity: { reward: number; threat: number; social: number; novelty: number };

  constructor(config: Partial<VirtualEndocrineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sensitivity = {
      reward: config.sensitivity?.reward ?? DTE_SENSITIVITY.reward,
      threat: config.sensitivity?.threat ?? DTE_SENSITIVITY.threat,
      social: config.sensitivity?.social ?? DTE_SENSITIVITY.social,
      novelty: config.sensitivity?.novelty ?? DTE_SENSITIVITY.novelty,
    };

    // Initialize channels
    this.channels = Array.from({ length: 14 }, (_, i) => ({
      id: i as HormoneId,
      name: HORMONE_NAMES[i] || `Reserved_${i}`,
      halfLife: HALF_LIVES[i] || 10,
      baseline: config.baselines?.[i as HormoneId] ?? DTE_BASELINES[i] ?? 0,
      concentration: config.baselines?.[i as HormoneId] ?? DTE_BASELINES[i] ?? 0,
    }));
  }

  /** Current cognitive mode */
  get currentMode(): EndocrineCognitiveMode {
    return this._currentMode;
  }

  /** Get concentration of a specific hormone */
  concentration(id: HormoneId): number {
    return this.channels[id]?.concentration ?? 0;
  }

  /** Get full state as named record */
  state(): Record<string, number> {
    const s: Record<string, number> = {};
    for (const ch of this.channels) {
      s[ch.name] = ch.concentration;
    }
    return s;
  }

  /** Get state as flat array (for reservoir input) */
  stateArray(): number[] {
    return this.channels.map(ch => ch.concentration);
  }

  /** Get simplified state for Live2D EndocrineExpressionBridge */
  toLive2DState(): EndocrineState {
    return {
      cortisol: this.channels[HormoneId.CORTISOL].concentration,
      dopamine: (this.channels[HormoneId.DOPAMINE_TONIC].concentration +
                 this.channels[HormoneId.DOPAMINE_PHASIC].concentration) / 2,
      serotonin: this.channels[HormoneId.SEROTONIN].concentration,
      norepinephrine: this.channels[HormoneId.NOREPINEPHRINE].concentration,
      oxytocin: this.channels[HormoneId.OXYTOCIN].concentration,
      t3_t4: this.channels[HormoneId.T3_T4].concentration,
      anandamide: this.channels[HormoneId.ANANDAMIDE].concentration,
    };
  }

  /** Signal an endocrine event */
  signalEvent(event: EndocrineEvent, intensity: number = 0.5): void {
    const ci = Math.max(0, Math.min(1, intensity));
    this.lastDisturbanceTick = this.tickCount;

    switch (event) {
      case EndocrineEvent.REWARD_RECEIVED:
        this.inject(HormoneId.DOPAMINE_TONIC, 0.3 * ci * this.sensitivity.reward);
        this.inject(HormoneId.SEROTONIN, 0.15 * ci);
        break;
      case EndocrineEvent.GOAL_ACHIEVED:
        this.inject(HormoneId.DOPAMINE_TONIC, 0.25 * ci * this.sensitivity.reward);
        this.inject(HormoneId.OXYTOCIN, 0.2 * ci * this.sensitivity.social);
        break;
      case EndocrineEvent.THREAT_DETECTED:
        this.inject(HormoneId.CRH, 0.4 * ci * this.sensitivity.threat);
        this.inject(HormoneId.NOREPINEPHRINE, 0.3 * ci);
        break;
      case EndocrineEvent.NOVELTY_ENCOUNTERED:
        this.inject(HormoneId.NOREPINEPHRINE, 0.35 * ci * this.sensitivity.novelty);
        this.inject(HormoneId.DOPAMINE_PHASIC, 0.4 * ci * this.sensitivity.novelty);
        break;
      case EndocrineEvent.SOCIAL_BOND_SIGNAL:
        this.inject(HormoneId.OXYTOCIN, 0.3 * ci * this.sensitivity.social);
        this.inject(HormoneId.SEROTONIN, 0.15 * ci);
        break;
      case EndocrineEvent.ERROR_DETECTED:
        this.inject(HormoneId.IL6, 0.3 * ci);
        this.inject(HormoneId.CORTISOL, 0.2 * ci);
        break;
      case EndocrineEvent.NOISE_EXCESSIVE:
        this.inject(HormoneId.ANANDAMIDE, 0.3 * ci);
        break;
      case EndocrineEvent.RESOURCE_DEPLETED:
        this.inject(HormoneId.GLUCAGON, 0.3 * ci);
        break;
      case EndocrineEvent.LIGHT_SIGNAL:
        this.inject(HormoneId.MELATONIN, -0.2 * ci);
        break;
      case EndocrineEvent.CREATIVE_INSIGHT:
        this.inject(HormoneId.DOPAMINE_PHASIC, 0.5 * ci * this.sensitivity.novelty);
        this.inject(HormoneId.ANANDAMIDE, 0.2 * ci);
        break;
      case EndocrineEvent.SELF_REFLECTION:
        this.inject(HormoneId.SEROTONIN, 0.2 * ci);
        this.inject(HormoneId.T3_T4, 0.1 * ci);
        break;
    }

    // Check for spike events
    for (const ch of this.channels) {
      if (ch.concentration > ch.baseline + 0.4) {
        this.emit('hormone_spike', {
          hormone: ch.name,
          level: ch.concentration,
          event,
        });
      }
    }
  }

  /** Inject a specific hormone amount */
  inject(id: HormoneId, amount: number): void {
    const ch = this.channels[id];
    if (ch) {
      ch.concentration = Math.max(0, Math.min(1, ch.concentration + amount));
    }
  }

  /** Advance one tick (exponential decay + cascade + mode detection) */
  tick(dt: number = 1): void {
    this.tickCount++;

    // Exponential decay toward baseline
    for (const ch of this.channels) {
      const decayRate = Math.log(2) / ch.halfLife;
      const diff = ch.concentration - ch.baseline;
      ch.concentration = ch.baseline + diff * Math.exp(-decayRate * dt);
      ch.concentration = Math.max(0, Math.min(1, ch.concentration));
    }

    // HPA cascade: CRH → ACTH → Cortisol
    if (this.config.enableHPACascade) {
      if (this.channels[HormoneId.CRH].concentration > 0.2) {
        this.inject(HormoneId.ACTH, 0.05 * dt);
      }
      if (this.channels[HormoneId.ACTH].concentration > 0.15) {
        this.inject(HormoneId.CORTISOL, 0.03 * dt);
      }
    }

    // Cortisol negative feedback (suppresses CRH when cortisol is high)
    if (this.config.enableNegativeFeedback) {
      if (this.channels[HormoneId.CORTISOL].concentration > 0.5) {
        this.inject(HormoneId.CRH, -0.02 * dt);
      }
    }

    // Detect cognitive mode
    const oldMode = this._currentMode;
    this._currentMode = this.detectMode();
    if (oldMode !== this._currentMode) {
      this.emit('mode_change', { from: oldMode, to: this._currentMode });
      log.debug(`Cognitive mode: ${oldMode} → ${this._currentMode}`);
    }

    // Check homeostasis restoration
    const ticksSinceDisturbance = this.tickCount - this.lastDisturbanceTick;
    if (ticksSinceDisturbance === 20) {
      const isHomeostatic = this.channels.every(ch =>
        Math.abs(ch.concentration - ch.baseline) < 0.1
      );
      if (isHomeostatic) {
        this.emit('homeostasis_restored', { ticksSinceDisturbance });
      }
    }

    // Store history
    this.history.push({
      tick: this.tickCount,
      hormones: this.stateArray(),
      mode: this._currentMode,
    });
    if (this.history.length > this.config.maxHistory) {
      this.history.shift();
    }
  }

  /** Get hormone history (for reservoir feedback) */
  getHistory(): Array<{ tick: number; hormones: number[]; mode: EndocrineCognitiveMode }> {
    return [...this.history];
  }

  /** Get metrics */
  getMetrics(): {
    tickCount: number;
    currentMode: EndocrineCognitiveMode;
    dominantHormone: string;
    stressLevel: number;
    rewardLevel: number;
    arousalLevel: number;
  } {
    const cortisol = this.channels[HormoneId.CORTISOL].concentration;
    const dopamine = this.channels[HormoneId.DOPAMINE_TONIC].concentration;
    const norepinephrine = this.channels[HormoneId.NOREPINEPHRINE].concentration;

    // Find dominant hormone (highest above baseline)
    let maxDeviation = 0;
    let dominantHormone = 'None';
    for (const ch of this.channels) {
      const dev = ch.concentration - ch.baseline;
      if (dev > maxDeviation) {
        maxDeviation = dev;
        dominantHormone = ch.name;
      }
    }

    return {
      tickCount: this.tickCount,
      currentMode: this._currentMode,
      dominantHormone,
      stressLevel: cortisol,
      rewardLevel: dopamine,
      arousalLevel: norepinephrine,
    };
  }

  /** Reset to baselines */
  reset(): void {
    for (const ch of this.channels) {
      ch.concentration = ch.baseline;
    }
    this._currentMode = EndocrineCognitiveMode.RESTING;
    this.history = [];
    this.tickCount = 0;
    this.lastDisturbanceTick = 0;
  }

  // ─── Private Methods ────────────────────────────────────────

  private detectMode(): EndocrineCognitiveMode {
    let bestMode = EndocrineCognitiveMode.RESTING;
    let bestDist = Infinity;

    for (const [mode, centroid] of Object.entries(MODE_CENTROIDS)) {
      let dist = 0;
      for (const [idStr, target] of Object.entries(centroid)) {
        const id = Number(idStr) as HormoneId;
        const diff = this.channels[id].concentration - (target as number);
        dist += diff * diff;
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestMode = mode as EndocrineCognitiveMode;
      }
    }
    return bestMode;
  }
}

/**
 * Create a VirtualEndocrineSystem instance
 */
export function createVirtualEndocrineSystem(
  config?: Partial<VirtualEndocrineConfig>,
): VirtualEndocrineSystem {
  return new VirtualEndocrineSystem(config);
}
