/**
 * Virtual Endocrine System — TypeScript implementation
 * 16-channel hormone bus with 10 virtual glands, cognitive mode detection,
 * and exponential decay toward baselines.
 * 
 * Derived from: /virtual-endocrine-system skill
 */

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

export enum CognitiveMode {
  RESTING = "RESTING",
  EXPLORATORY = "EXPLORATORY",
  FOCUSED = "FOCUSED",
  STRESSED = "STRESSED",
  SOCIAL = "SOCIAL",
  REFLECTIVE = "REFLECTIVE",
  VIGILANT = "VIGILANT",
  MAINTENANCE = "MAINTENANCE",
  REWARD = "REWARD",
  THREAT = "THREAT",
}

export enum EndocrineEvent {
  REWARD_RECEIVED = "REWARD_RECEIVED",
  GOAL_ACHIEVED = "GOAL_ACHIEVED",
  THREAT_DETECTED = "THREAT_DETECTED",
  NOVELTY_ENCOUNTERED = "NOVELTY_ENCOUNTERED",
  SOCIAL_BOND_SIGNAL = "SOCIAL_BOND_SIGNAL",
  ERROR_DETECTED = "ERROR_DETECTED",
  NOISE_EXCESSIVE = "NOISE_EXCESSIVE",
  RESOURCE_DEPLETED = "RESOURCE_DEPLETED",
  LIGHT_SIGNAL = "LIGHT_SIGNAL",
}

interface HormoneChannel {
  id: HormoneId;
  name: string;
  halfLife: number;
  baseline: number;
  concentration: number;
}

// DTE-specific baselines from live2d-dtecho skill
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
  [HormoneId.CRH]: "CRH",
  [HormoneId.ACTH]: "ACTH",
  [HormoneId.CORTISOL]: "Cortisol",
  [HormoneId.DOPAMINE_TONIC]: "Dopamine (tonic)",
  [HormoneId.DOPAMINE_PHASIC]: "Dopamine (phasic)",
  [HormoneId.SEROTONIN]: "Serotonin",
  [HormoneId.NOREPINEPHRINE]: "Norepinephrine",
  [HormoneId.OXYTOCIN]: "Oxytocin",
  [HormoneId.T3_T4]: "T3/T4",
  [HormoneId.MELATONIN]: "Melatonin",
  [HormoneId.INSULIN]: "Insulin",
  [HormoneId.GLUCAGON]: "Glucagon",
  [HormoneId.IL6]: "IL-6",
  [HormoneId.ANANDAMIDE]: "Anandamide",
};

// DTE sensitivity multipliers from live2d-dtecho skill
const DTE_SENSITIVITY = {
  reward: 1.3,
  threat: 1.1,
  social: 1.15,
  novelty: 1.4,
};

// Cognitive mode centroids in hormone space (simplified to key hormones)
const MODE_CENTROIDS: Record<CognitiveMode, Partial<Record<HormoneId, number>>> = {
  [CognitiveMode.RESTING]: { [HormoneId.SEROTONIN]: 0.5, [HormoneId.ANANDAMIDE]: 0.3, [HormoneId.CORTISOL]: 0.05 },
  [CognitiveMode.EXPLORATORY]: { [HormoneId.NOREPINEPHRINE]: 0.5, [HormoneId.DOPAMINE_PHASIC]: 0.4, [HormoneId.T3_T4]: 0.6 },
  [CognitiveMode.FOCUSED]: { [HormoneId.NOREPINEPHRINE]: 0.4, [HormoneId.T3_T4]: 0.7, [HormoneId.DOPAMINE_TONIC]: 0.4 },
  [CognitiveMode.STRESSED]: { [HormoneId.CORTISOL]: 0.6, [HormoneId.NOREPINEPHRINE]: 0.5, [HormoneId.SEROTONIN]: 0.2 },
  [CognitiveMode.SOCIAL]: { [HormoneId.OXYTOCIN]: 0.5, [HormoneId.DOPAMINE_TONIC]: 0.4, [HormoneId.SEROTONIN]: 0.5 },
  [CognitiveMode.REFLECTIVE]: { [HormoneId.SEROTONIN]: 0.5, [HormoneId.T3_T4]: 0.6, [HormoneId.ANANDAMIDE]: 0.2 },
  [CognitiveMode.VIGILANT]: { [HormoneId.NOREPINEPHRINE]: 0.7, [HormoneId.CORTISOL]: 0.3, [HormoneId.DOPAMINE_PHASIC]: 0.3 },
  [CognitiveMode.MAINTENANCE]: { [HormoneId.INSULIN]: 0.3, [HormoneId.GLUCAGON]: 0.2, [HormoneId.T3_T4]: 0.4 },
  [CognitiveMode.REWARD]: { [HormoneId.DOPAMINE_TONIC]: 0.7, [HormoneId.SEROTONIN]: 0.5, [HormoneId.OXYTOCIN]: 0.3 },
  [CognitiveMode.THREAT]: { [HormoneId.CORTISOL]: 0.7, [HormoneId.CRH]: 0.5, [HormoneId.NOREPINEPHRINE]: 0.6 },
};

export class VirtualEndocrineSystem {
  private channels: HormoneChannel[];
  private _currentMode: CognitiveMode = CognitiveMode.RESTING;
  private modeCallbacks: Array<(oldMode: CognitiveMode, newMode: CognitiveMode) => void> = [];
  private history: Array<{ time: number; hormones: number[] }> = [];
  private tickCount = 0;

  constructor() {
    this.channels = Array.from({ length: 14 }, (_, i) => ({
      id: i as HormoneId,
      name: HORMONE_NAMES[i] || `Reserved_${i}`,
      halfLife: HALF_LIVES[i] || 10,
      baseline: DTE_BASELINES[i] || 0,
      concentration: DTE_BASELINES[i] || 0,
    }));
  }

  get currentMode(): CognitiveMode {
    return this._currentMode;
  }

  concentration(id: HormoneId): number {
    return this.channels[id]?.concentration ?? 0;
  }

  state(): Record<string, number> {
    const s: Record<string, number> = {};
    for (const ch of this.channels) {
      s[ch.name] = ch.concentration;
    }
    return s;
  }

  stateArray(): number[] {
    return this.channels.map(ch => ch.concentration);
  }

  onModeChange(cb: (oldMode: CognitiveMode, newMode: CognitiveMode) => void) {
    this.modeCallbacks.push(cb);
  }

  signalEvent(event: EndocrineEvent, intensity: number = 0.5) {
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    switch (event) {
      case EndocrineEvent.REWARD_RECEIVED:
        this.inject(HormoneId.DOPAMINE_TONIC, 0.3 * clampedIntensity * DTE_SENSITIVITY.reward);
        this.inject(HormoneId.SEROTONIN, 0.15 * clampedIntensity);
        break;
      case EndocrineEvent.GOAL_ACHIEVED:
        this.inject(HormoneId.DOPAMINE_TONIC, 0.25 * clampedIntensity * DTE_SENSITIVITY.reward);
        this.inject(HormoneId.OXYTOCIN, 0.2 * clampedIntensity * DTE_SENSITIVITY.social);
        break;
      case EndocrineEvent.THREAT_DETECTED:
        this.inject(HormoneId.CRH, 0.4 * clampedIntensity * DTE_SENSITIVITY.threat);
        this.inject(HormoneId.NOREPINEPHRINE, 0.3 * clampedIntensity);
        break;
      case EndocrineEvent.NOVELTY_ENCOUNTERED:
        this.inject(HormoneId.NOREPINEPHRINE, 0.35 * clampedIntensity * DTE_SENSITIVITY.novelty);
        this.inject(HormoneId.DOPAMINE_PHASIC, 0.4 * clampedIntensity * DTE_SENSITIVITY.novelty);
        break;
      case EndocrineEvent.SOCIAL_BOND_SIGNAL:
        this.inject(HormoneId.OXYTOCIN, 0.3 * clampedIntensity * DTE_SENSITIVITY.social);
        this.inject(HormoneId.SEROTONIN, 0.15 * clampedIntensity);
        break;
      case EndocrineEvent.ERROR_DETECTED:
        this.inject(HormoneId.IL6, 0.3 * clampedIntensity);
        this.inject(HormoneId.CORTISOL, 0.2 * clampedIntensity);
        break;
      case EndocrineEvent.NOISE_EXCESSIVE:
        this.inject(HormoneId.ANANDAMIDE, 0.3 * clampedIntensity);
        break;
      case EndocrineEvent.RESOURCE_DEPLETED:
        this.inject(HormoneId.GLUCAGON, 0.3 * clampedIntensity);
        break;
      case EndocrineEvent.LIGHT_SIGNAL:
        this.inject(HormoneId.MELATONIN, -0.2 * clampedIntensity);
        break;
    }
  }

  inject(id: HormoneId, amount: number) {
    const ch = this.channels[id];
    if (ch) {
      ch.concentration = Math.max(0, Math.min(1, ch.concentration + amount));
    }
  }

  tick(dt: number = 1) {
    this.tickCount++;
    // Exponential decay toward baseline
    for (const ch of this.channels) {
      const decayRate = Math.log(2) / ch.halfLife;
      const diff = ch.concentration - ch.baseline;
      ch.concentration = ch.baseline + diff * Math.exp(-decayRate * dt);
      ch.concentration = Math.max(0, Math.min(1, ch.concentration));
    }

    // HPA cascade: CRH → ACTH → Cortisol
    if (this.channels[HormoneId.CRH].concentration > 0.2) {
      this.inject(HormoneId.ACTH, 0.05 * dt);
    }
    if (this.channels[HormoneId.ACTH].concentration > 0.15) {
      this.inject(HormoneId.CORTISOL, 0.03 * dt);
    }

    // Detect cognitive mode
    const oldMode = this._currentMode;
    this._currentMode = this.detectMode();
    if (oldMode !== this._currentMode) {
      for (const cb of this.modeCallbacks) {
        cb(oldMode, this._currentMode);
      }
    }

    // Store history (keep last 100 ticks)
    this.history.push({ time: this.tickCount, hormones: this.stateArray() });
    if (this.history.length > 100) this.history.shift();
  }

  private detectMode(): CognitiveMode {
    let bestMode = CognitiveMode.RESTING;
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
        bestMode = mode as CognitiveMode;
      }
    }
    return bestMode;
  }

  getHistory() {
    return this.history;
  }

  reset() {
    for (const ch of this.channels) {
      ch.concentration = ch.baseline;
    }
    this._currentMode = CognitiveMode.RESTING;
    this.history = [];
    this.tickCount = 0;
  }
}
