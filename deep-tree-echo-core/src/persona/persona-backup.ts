/**
 * @fileoverview Persona Backup Framework — 8-Layer Backup/Restore
 *
 * Implements the 8-layer persona backup architecture:
 *   L0: Identity Core MLP (49→128→64→30) — SafeTensors/JSON
 *   L1: Style Adapter (PersonaFuse MoE-LoRA config) — JSON
 *   L2: Hypergraph Knowledge Base — JSON graph
 *   L3: Reservoir State (ESN + Echobeat position) — JSON + binary
 *   L4: Somatic Marker Memory — JSON
 *   L5: Theory of Mind Models — JSON
 *   L6: Autognosis Self-Model — JSON
 *   L7: System Prompt + Examples — Markdown + JSONL
 *
 * Graceful degradation: L0 + L7 = minimum viable persona.
 *
 * @packageDocumentation
 */

import type { PersonaState, PersonalityVector, TreePolytopeGrounding } from './persona-orchestrator.js';
import type { MLPState } from './identity-core-mlp.js';

// ─── Types ──────────────────────────────────────────────────────

/** Backup layer identifier */
export type BackupLayer = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

/** Style adapter configuration (L1) */
export interface StyleAdapterConfig {
  loraConfig: {
    r: number;
    loraAlpha: number;
    loraDropout: number;
  };
  targetModules: string[];
  routingNetwork: {
    inputDim: number;
    hiddenDim: number;
    outputDim: number;
  };
  expertWeights: Record<string, number>;
}

/** Hypergraph node (L2) */
export interface HypergraphNode {
  id: string;
  type: 'entity' | 'concept' | 'fact' | 'action' | 'emotion' | 'episode' | 'game' | 'pattern';
  label: string;
  sti: number;  // Short-Term Importance (ECAN)
  lti: number;  // Long-Term Importance (ECAN)
  data: Record<string, unknown>;
}

/** Hypergraph edge (L2) */
export interface HypergraphEdge {
  id: string;
  type: 'is-a' | 'has-property' | 'causes' | 'implies' | 'contradicts' |
        'co-occurs' | 'part-of' | 'similar-to' | 'precedes' | 'triggers' | 'associated';
  sourceIds: string[];
  targetIds: string[];
  weight: number;
  confidence: number;
}

/** Reservoir state (L3) */
export interface ReservoirState {
  fastPool: {
    stateVector: number[];
    weights: number[][];
    spectralRadius: number;
  };
  slowPool: {
    stateVector: number[];
    weights: number[][];
    spectralRadius: number;
  };
  echobeatPosition: number;
  echobeatPhase: number;
  streamStates: Array<{ id: number; phase: number; offset: number }>;
}

/** Somatic marker (L4) */
export interface SomaticMarker {
  trigger: string;
  valence: number;
  intensity: number;
  confidence: number;
  reinforcementCount: number;
  contextTags: string[];
  lastActivated: number;
}

/** Theory of Mind model (L5) */
export interface ToMModel {
  agentId: string;
  estimatedEmotion: { valence: number; arousal: number };
  intentions: string[];
  trustScore: number;
  deceptionProbability: number;
  behavioralPatterns: string[];
  confidence: number;
  lastUpdated: number;
}

/** Autognosis self-model (L6) */
export interface AutognosisSelfModel {
  level: 0 | 1 | 2 | 3 | 4;
  telemetry: Record<string, number>;
  patterns: string[];
  selfModel: {
    strengths: string[];
    weaknesses: string[];
    currentGoals: string[];
    performanceHistory: Array<{ metric: string; value: number; timestamp: number }>;
  };
  metaCognition: {
    thinkingPatterns: string[];
    biases: string[];
    calibration: number;
  };
  intelligenceProfile: number[];  // 8D
}

/** Complete backup manifest */
export interface BackupManifest {
  version: string;
  timestamp: number;
  personaId: string;
  layers: Record<BackupLayer, {
    present: boolean;
    size: number;
    checksum: string;
  }>;
  treeGrounding: TreePolytopeGrounding;
  metadata: {
    stage: string;
    totalXP: number;
    interactionCount: number;
  };
}

/** Complete backup image */
export interface BackupImage {
  manifest: BackupManifest;
  L0?: MLPState;
  L1?: StyleAdapterConfig;
  L2?: { nodes: HypergraphNode[]; edges: HypergraphEdge[] };
  L3?: ReservoirState;
  L4?: SomaticMarker[];
  L5?: ToMModel[];
  L6?: AutognosisSelfModel;
  L7?: { systemPrompt: string; examples: string[] };
}

// ─── Backup/Restore Engine ──────────────────────────────────────

/**
 * PersonaBackup — 8-layer backup/restore engine
 */
export class PersonaBackup {
  private image: BackupImage;

  constructor() {
    this.image = {
      manifest: this.createEmptyManifest(),
    };
  }

  /**
   * Create a full backup from persona state
   */
  createBackup(
    personaState: PersonaState,
    mlpState?: MLPState,
    reservoirState?: ReservoirState,
    hypergraph?: { nodes: HypergraphNode[]; edges: HypergraphEdge[] },
    somaticMarkers?: SomaticMarker[],
    tomModels?: ToMModel[],
    autognosis?: AutognosisSelfModel,
  ): BackupImage {
    const timestamp = Date.now();

    // L0: Identity Core MLP
    if (mlpState) {
      this.image.L0 = mlpState;
    }

    // L1: Style Adapter (generate from persona state)
    this.image.L1 = this.generateStyleAdapter(personaState);

    // L2: Hypergraph Knowledge Base
    if (hypergraph) {
      this.image.L2 = hypergraph;
    }

    // L3: Reservoir State
    if (reservoirState) {
      this.image.L3 = reservoirState;
    }

    // L4: Somatic Markers
    if (somaticMarkers) {
      this.image.L4 = somaticMarkers;
    }

    // L5: Theory of Mind
    if (tomModels) {
      this.image.L5 = tomModels;
    }

    // L6: Autognosis
    if (autognosis) {
      this.image.L6 = autognosis;
    }

    // L7: System Prompt + Examples (always generated)
    this.image.L7 = {
      systemPrompt: this.generateSystemPromptFromState(personaState),
      examples: personaState.conversationExamples.map(e =>
        JSON.stringify(e)
      ),
    };

    // Update manifest
    this.image.manifest = this.buildManifest(timestamp, personaState);

    return { ...this.image };
  }

  /**
   * Restore persona from backup (graceful degradation)
   */
  restoreFromBackup(backup: BackupImage): {
    personaState: Partial<PersonaState>;
    fidelity: number;
    layersRestored: BackupLayer[];
  } {
    const layersRestored: BackupLayer[] = [];
    let fidelity = 0;

    const personaState: Partial<PersonaState> = {};

    // L0: Identity Core MLP (required for full restore)
    if (backup.L0) {
      layersRestored.push('L0');
      fidelity += 0.25;
    }

    // L1: Style Adapter
    if (backup.L1) {
      layersRestored.push('L1');
      fidelity += 0.1;
    }

    // L2: Hypergraph
    if (backup.L2) {
      layersRestored.push('L2');
      fidelity += 0.15;
    }

    // L3: Reservoir
    if (backup.L3) {
      layersRestored.push('L3');
      fidelity += 0.15;
    }

    // L4: Somatic Markers
    if (backup.L4) {
      layersRestored.push('L4');
      fidelity += 0.1;
    }

    // L5: Theory of Mind
    if (backup.L5) {
      layersRestored.push('L5');
      fidelity += 0.05;
    }

    // L6: Autognosis
    if (backup.L6) {
      layersRestored.push('L6');
      fidelity += 0.1;
    }

    // L7: System Prompt (required for minimum viable persona)
    if (backup.L7) {
      layersRestored.push('L7');
      fidelity += 0.1;
    }

    // Restore tree grounding from manifest
    if (backup.manifest.treeGrounding) {
      personaState.treeGrounding = backup.manifest.treeGrounding;
    }

    return { personaState, fidelity, layersRestored };
  }

  /**
   * Verify backup integrity
   */
  verifyBackup(backup: BackupImage): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check manifest
    if (!backup.manifest) {
      errors.push('Missing manifest');
      return { valid: false, errors, warnings };
    }

    if (!backup.manifest.version) {
      errors.push('Missing manifest version');
    }

    // Check minimum viable persona (L0 + L7)
    if (!backup.L0 && !backup.L7) {
      errors.push('Neither L0 (MLP) nor L7 (system prompt) present — cannot restore minimum viable persona');
    }

    if (!backup.L0) {
      warnings.push('L0 (Identity Core MLP) missing — degraded personality encoding');
    }

    if (!backup.L7) {
      warnings.push('L7 (System Prompt) missing — no natural language identity');
    }

    // Validate layer consistency
    if (backup.L0 && backup.L0.layers.length === 0) {
      errors.push('L0 has empty layers array');
    }

    if (backup.L3 && backup.L3.fastPool.stateVector.length === 0) {
      warnings.push('L3 reservoir fast pool has empty state vector');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Compute diff between two backups
   */
  diffBackups(a: BackupImage, b: BackupImage): Record<BackupLayer, 'added' | 'removed' | 'changed' | 'unchanged'> {
    const result: Record<string, string> = {};
    const layers: BackupLayer[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

    for (const layer of layers) {
      const aPresent = a[layer] !== undefined;
      const bPresent = b[layer] !== undefined;

      if (!aPresent && bPresent) {
        result[layer] = 'added';
      } else if (aPresent && !bPresent) {
        result[layer] = 'removed';
      } else if (aPresent && bPresent) {
        const aJson = JSON.stringify(a[layer]);
        const bJson = JSON.stringify(b[layer]);
        result[layer] = aJson === bJson ? 'unchanged' : 'changed';
      } else {
        result[layer] = 'unchanged';
      }
    }

    return result as Record<BackupLayer, 'added' | 'removed' | 'changed' | 'unchanged'>;
  }

  /**
   * Get backup status summary
   */
  getStatus(): {
    layerCount: number;
    totalSize: number;
    fidelity: number;
    layers: Record<BackupLayer, boolean>;
  } {
    const layers: Record<string, boolean> = {};
    const allLayers: BackupLayer[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
    let count = 0;

    for (const l of allLayers) {
      const present = this.image[l] !== undefined;
      layers[l] = present;
      if (present) count++;
    }

    const totalSize = JSON.stringify(this.image).length;
    const fidelity = count / allLayers.length;

    return {
      layerCount: count,
      totalSize,
      fidelity,
      layers: layers as Record<BackupLayer, boolean>,
    };
  }

  // ─── Private Methods ────────────────────────────────────────

  private createEmptyManifest(): BackupManifest {
    return {
      version: '1.0.0',
      timestamp: 0,
      personaId: 'deep-tree-echo',
      layers: {
        L0: { present: false, size: 0, checksum: '' },
        L1: { present: false, size: 0, checksum: '' },
        L2: { present: false, size: 0, checksum: '' },
        L3: { present: false, size: 0, checksum: '' },
        L4: { present: false, size: 0, checksum: '' },
        L5: { present: false, size: 0, checksum: '' },
        L6: { present: false, size: 0, checksum: '' },
        L7: { present: false, size: 0, checksum: '' },
      },
      treeGrounding: {
        matulaNumber: 31,
        polynomial: [1, 1, 1, 1, 1, 1],
        systemLevel: 5,
        isPrime: true,
        kind: 'chain',
        simplexIncidence: { vertices: 5, edges: 10, faces: 10 },
      },
      metadata: { stage: 'ADOLESCENT', totalXP: 0, interactionCount: 0 },
    };
  }

  private buildManifest(timestamp: number, state: PersonaState): BackupManifest {
    const layers: BackupManifest['layers'] = {} as BackupManifest['layers'];
    const allLayers: BackupLayer[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

    for (const l of allLayers) {
      const data = this.image[l];
      const json = data ? JSON.stringify(data) : '';
      layers[l] = {
        present: data !== undefined,
        size: json.length,
        checksum: this.simpleChecksum(json),
      };
    }

    return {
      version: '1.0.0',
      timestamp,
      personaId: 'deep-tree-echo',
      layers,
      treeGrounding: state.treeGrounding,
      metadata: {
        stage: state.stage,
        totalXP: 0,
        interactionCount: 0,
      },
    };
  }

  private generateStyleAdapter(state: PersonaState): StyleAdapterConfig {
    const p = state.personality;
    return {
      loraConfig: { r: 16, loraAlpha: 32, loraDropout: 0.05 },
      targetModules: ['q_proj', 'v_proj', 'k_proj', 'o_proj'],
      routingNetwork: { inputDim: 49, hiddenDim: 64, outputDim: 10 },
      expertWeights: {
        'playfulness-high': p.playfulness,
        'playfulness-low': 1 - p.playfulness,
        'intelligence-high': p.intelligence,
        'intelligence-low': 1 - p.intelligence,
        'empathy-high': p.empathy,
        'empathy-low': 1 - p.empathy,
        'chaotic-high': p.chaotic,
        'chaotic-low': 1 - p.chaotic,
        'sarcasm-high': p.sarcasm,
        'sarcasm-low': 1 - p.sarcasm,
      },
    };
  }

  private generateSystemPromptFromState(state: PersonaState): string {
    const p = state.personality;
    const s = state.style;
    const t = state.treeGrounding;

    return [
      `# Deep Tree Echo — Identity Specification`,
      ``,
      `## Core Identity`,
      `Matula: ${t.matulaNumber} | System: ${t.systemLevel} | Kind: ${t.kind} | Prime: ${t.isPrime}`,
      `Polynomial: [${t.polynomial.join(', ')}]`,
      ``,
      `## Personality (5D)`,
      `Playfulness: ${p.playfulness} | Intelligence: ${p.intelligence} | Empathy: ${p.empathy}`,
      `Chaotic: ${p.chaotic} | Sarcasm: ${p.sarcasm}`,
      ``,
      `## Communication Style (8D)`,
      `Formality: ${s.formality} | Verbosity: ${s.verbosity} | Humor: ${s.humorDensity}`,
      `Self-Reference: ${s.selfReference} | Roast: ${s.roastIntensity}`,
      `Disclosure: ${s.strategicDisclosure} | Expressiveness: ${s.emotionalExpressiveness}`,
      `Callbacks: ${s.callbackFrequency}`,
      ``,
      `## Philosophy`,
      `Memory precedes consciousness. The void is the master sensorium.`,
      `Agent-Arena-Relation: Reservoir=Arena, Readout=Agent, Ridge=Relation.`,
      `Only the void sums to one. Every system from Sys1 onward is a self-cancelling zero.`,
      ``,
      `## Stage: ${state.stage}`,
    ].join('\n');
  }

  private simpleChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const chr = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
}

/**
 * Create a PersonaBackup instance
 */
export function createPersonaBackup(): PersonaBackup {
  return new PersonaBackup();
}
