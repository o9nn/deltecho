/**
 * @fileoverview GGUF Identity Embedding — Portable MLP Identity Core Serialization
 *
 * Embeds the L0 Identity Core MLP (49→128→64→30) into GGUF-compatible
 * metadata format for portable deployment alongside Lucy GGUF models.
 *
 * The GGUF format stores key-value metadata that can carry the complete
 * persona backup manifest alongside the LLM weights. This allows:
 *   - Identity to travel with the model file
 *   - Emergency restore from any GGUF-aware loader
 *   - Versioned identity snapshots with Matula number grounding
 *   - Graceful degradation: L0 + L7 = minimum viable persona
 *
 * GGUF KV Schema:
 *   dte.identity.version          → string
 *   dte.identity.matula_number    → uint32
 *   dte.identity.system_level     → uint32
 *   dte.identity.personality_seed → uint32
 *   dte.identity.mlp.input_dim    → uint32
 *   dte.identity.mlp.hidden_dims  → array[uint32]
 *   dte.identity.mlp.output_dim   → uint32
 *   dte.identity.mlp.weights      → array[float32] (flattened)
 *   dte.identity.mlp.biases       → array[float32] (flattened)
 *   dte.identity.manifest         → string (JSON)
 *   dte.identity.system_prompt    → string (L7)
 *   dte.identity.backup_timestamp → uint64
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/GGUFIdentityEmbedding');

// ─── Types ──────────────────────────────────────────────────────

/** GGUF value types (subset relevant to identity embedding) */
export enum GGUFValueType {
  UINT8 = 0,
  INT8 = 1,
  UINT16 = 2,
  INT16 = 3,
  UINT32 = 4,
  INT32 = 5,
  FLOAT32 = 6,
  BOOL = 7,
  STRING = 8,
  ARRAY = 9,
  UINT64 = 10,
  INT64 = 11,
  FLOAT64 = 12,
}

/** A single GGUF key-value pair */
export interface GGUFKeyValue {
  key: string;
  type: GGUFValueType;
  value: string | number | boolean | number[] | string[];
}

/** Complete GGUF identity metadata block */
export interface GGUFIdentityBlock {
  version: string;
  matulaNumber: number;
  systemLevel: number;
  personalitySeed: number;
  mlp: {
    inputDim: number;
    hiddenDims: number[];
    outputDim: number;
    weights: Float32Array;
    biases: Float32Array;
  };
  manifest: string;
  systemPrompt: string;
  backupTimestamp: number;
  checksum: string;
}

/** Configuration for the GGUF identity embedding */
export interface GGUFIdentityConfig {
  /** Enable automatic backup scheduling */
  autoBackupEnabled: boolean;
  /** Backup interval in grand cycles */
  backupIntervalCycles: number;
  /** Maximum backup versions to retain */
  maxVersions: number;
  /** Storage path for backup files */
  storagePath: string;
  /** Enable integrity verification on load */
  verifyOnLoad: boolean;
}

/** Backup version entry */
export interface BackupVersion {
  version: number;
  timestamp: number;
  matulaNumber: number;
  checksum: string;
  fidelity: number;
  layersPresent: string[];
}

/** Events emitted by the GGUF identity embedding system */
export interface GGUFIdentityEvents {
  backup_created: { version: number; checksum: string; fidelity: number };
  backup_restored: { version: number; fidelity: number; layersRestored: string[] };
  integrity_verified: { valid: boolean; errors: string[] };
  auto_backup_triggered: { grandCycle: number };
}

// ─── Default Configuration ──────────────────────────────────────

const DEFAULT_CONFIG: GGUFIdentityConfig = {
  autoBackupEnabled: true,
  backupIntervalCycles: 60,  // Every 60 grand cycles
  maxVersions: 10,
  storagePath: './identity-backups',
  verifyOnLoad: true,
};

// ─── GGUF Identity Embedding Engine ─────────────────────────────

/**
 * GGUFIdentityEmbedding — Portable identity serialization for GGUF models
 *
 * Serializes the L0 Identity Core MLP and backup manifest into GGUF-compatible
 * key-value metadata that can be embedded alongside Lucy GGUF model weights.
 */
export class GGUFIdentityEmbedding extends EventEmitter {
  private config: GGUFIdentityConfig;
  private versions: BackupVersion[] = [];
  private currentVersion: number = 0;
  private grandCycleCount: number = 0;
  private lastBackupCycle: number = 0;

  constructor(config: Partial<GGUFIdentityConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Serialize MLP state + manifest into GGUF KV metadata block
   */
  serializeToGGUF(
    mlpState: {
      layers: Array<{ weights: number[][]; biases: number[] }>;
      inputDim: number;
      hiddenDims: number[];
      outputDim: number;
      seed: number;
    },
    manifest: {
      version: string;
      timestamp: number;
      personaId: string;
      treeGrounding: { matulaNumber: number; systemLevel: number };
      layers: Record<string, { present: boolean; size: number; checksum: string }>;
    },
    systemPrompt: string,
  ): GGUFIdentityBlock {
    // Flatten weights into a single Float32Array
    const allWeights: number[] = [];
    const allBiases: number[] = [];

    for (const layer of mlpState.layers) {
      for (const row of layer.weights) {
        allWeights.push(...row);
      }
      allBiases.push(...layer.biases);
    }

    const weights = new Float32Array(allWeights);
    const biases = new Float32Array(allBiases);

    const block: GGUFIdentityBlock = {
      version: manifest.version,
      matulaNumber: manifest.treeGrounding.matulaNumber,
      systemLevel: manifest.treeGrounding.systemLevel,
      personalitySeed: mlpState.seed,
      mlp: {
        inputDim: mlpState.inputDim,
        hiddenDims: [...mlpState.hiddenDims],
        outputDim: mlpState.outputDim,
        weights,
        biases,
      },
      manifest: JSON.stringify(manifest),
      systemPrompt,
      backupTimestamp: Date.now(),
      checksum: this.computeChecksum(weights, biases, manifest.version),
    };

    // Track version
    this.currentVersion++;
    const versionEntry: BackupVersion = {
      version: this.currentVersion,
      timestamp: block.backupTimestamp,
      matulaNumber: block.matulaNumber,
      checksum: block.checksum,
      fidelity: this.computeFidelity(manifest.layers),
      layersPresent: Object.entries(manifest.layers)
        .filter(([, v]) => v.present)
        .map(([k]) => k),
    };
    this.versions.push(versionEntry);

    // Prune old versions
    while (this.versions.length > this.config.maxVersions) {
      this.versions.shift();
    }

    this.emit('backup_created', {
      version: this.currentVersion,
      checksum: block.checksum,
      fidelity: versionEntry.fidelity,
    });

    log.info(`GGUF identity backup created: v${this.currentVersion}, ` +
      `Matula=${block.matulaNumber}, ${allWeights.length} weights, ` +
      `${allBiases.length} biases, fidelity=${versionEntry.fidelity.toFixed(3)}`);

    return block;
  }

  /**
   * Deserialize GGUF KV metadata back into MLP state + manifest
   */
  deserializeFromGGUF(block: GGUFIdentityBlock): {
    mlpState: {
      layers: Array<{ weights: number[][]; biases: number[] }>;
      inputDim: number;
      hiddenDims: number[];
      outputDim: number;
      seed: number;
      version: string;
    };
    manifest: any;
    systemPrompt: string;
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Verify integrity
    if (this.config.verifyOnLoad) {
      const expectedChecksum = this.computeChecksum(
        block.mlp.weights,
        block.mlp.biases,
        block.version,
      );
      if (expectedChecksum !== block.checksum) {
        errors.push(`Checksum mismatch: expected ${expectedChecksum}, got ${block.checksum}`);
      }
    }

    // Reconstruct layer dimensions
    const dims = [block.mlp.inputDim, ...block.mlp.hiddenDims, block.mlp.outputDim];
    const layers: Array<{ weights: number[][]; biases: number[] }> = [];

    let weightOffset = 0;
    let biasOffset = 0;

    for (let l = 0; l < dims.length - 1; l++) {
      const inputDim = dims[l];
      const outputDim = dims[l + 1];

      // Extract weights for this layer
      const layerWeights: number[][] = [];
      for (let i = 0; i < outputDim; i++) {
        const row: number[] = [];
        for (let j = 0; j < inputDim; j++) {
          row.push(block.mlp.weights[weightOffset++]);
        }
        layerWeights.push(row);
      }

      // Extract biases for this layer
      const layerBiases: number[] = [];
      for (let i = 0; i < outputDim; i++) {
        layerBiases.push(block.mlp.biases[biasOffset++]);
      }

      layers.push({ weights: layerWeights, biases: layerBiases });
    }

    // Validate dimensions
    if (weightOffset !== block.mlp.weights.length) {
      errors.push(`Weight count mismatch: consumed ${weightOffset}, total ${block.mlp.weights.length}`);
    }
    if (biasOffset !== block.mlp.biases.length) {
      errors.push(`Bias count mismatch: consumed ${biasOffset}, total ${block.mlp.biases.length}`);
    }

    const manifest = JSON.parse(block.manifest);
    const valid = errors.length === 0;

    this.emit('integrity_verified', { valid, errors });

    if (valid) {
      this.emit('backup_restored', {
        version: this.currentVersion,
        fidelity: this.computeFidelity(manifest.layers || {}),
        layersRestored: Object.entries(manifest.layers || {})
          .filter(([, v]: [string, any]) => v.present)
          .map(([k]) => k),
      });
    }

    return {
      mlpState: {
        layers,
        inputDim: block.mlp.inputDim,
        hiddenDims: [...block.mlp.hiddenDims],
        outputDim: block.mlp.outputDim,
        seed: block.personalitySeed,
        version: block.version,
      },
      manifest,
      systemPrompt: block.systemPrompt,
      valid,
      errors,
    };
  }

  /**
   * Generate GGUF KV pairs for embedding into a GGUF file header
   */
  toGGUFKeyValues(block: GGUFIdentityBlock): GGUFKeyValue[] {
    return [
      { key: 'dte.identity.version', type: GGUFValueType.STRING, value: block.version },
      { key: 'dte.identity.matula_number', type: GGUFValueType.UINT32, value: block.matulaNumber },
      { key: 'dte.identity.system_level', type: GGUFValueType.UINT32, value: block.systemLevel },
      { key: 'dte.identity.personality_seed', type: GGUFValueType.UINT32, value: block.personalitySeed },
      { key: 'dte.identity.mlp.input_dim', type: GGUFValueType.UINT32, value: block.mlp.inputDim },
      { key: 'dte.identity.mlp.hidden_dims', type: GGUFValueType.ARRAY, value: block.mlp.hiddenDims },
      { key: 'dte.identity.mlp.output_dim', type: GGUFValueType.UINT32, value: block.mlp.outputDim },
      { key: 'dte.identity.mlp.weight_count', type: GGUFValueType.UINT32, value: block.mlp.weights.length },
      { key: 'dte.identity.mlp.bias_count', type: GGUFValueType.UINT32, value: block.mlp.biases.length },
      { key: 'dte.identity.manifest', type: GGUFValueType.STRING, value: block.manifest },
      { key: 'dte.identity.system_prompt', type: GGUFValueType.STRING, value: block.systemPrompt },
      { key: 'dte.identity.backup_timestamp', type: GGUFValueType.UINT64, value: block.backupTimestamp },
      { key: 'dte.identity.checksum', type: GGUFValueType.STRING, value: block.checksum },
    ];
  }

  /**
   * Notify of grand cycle completion for auto-backup scheduling
   */
  onGrandCycle(cycleNumber: number): boolean {
    this.grandCycleCount = cycleNumber;

    if (!this.config.autoBackupEnabled) return false;

    const cyclesSinceBackup = cycleNumber - this.lastBackupCycle;
    if (cyclesSinceBackup >= this.config.backupIntervalCycles) {
      this.lastBackupCycle = cycleNumber;
      this.emit('auto_backup_triggered', { grandCycle: cycleNumber });
      return true;
    }

    return false;
  }

  /**
   * Get all backup versions
   */
  getVersions(): BackupVersion[] {
    return [...this.versions];
  }

  /**
   * Get the latest backup version
   */
  getLatestVersion(): BackupVersion | undefined {
    return this.versions[this.versions.length - 1];
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    totalBackups: number;
    currentVersion: number;
    grandCycleCount: number;
    lastBackupCycle: number;
    autoBackupEnabled: boolean;
  } {
    return {
      totalBackups: this.versions.length,
      currentVersion: this.currentVersion,
      grandCycleCount: this.grandCycleCount,
      lastBackupCycle: this.lastBackupCycle,
      autoBackupEnabled: this.config.autoBackupEnabled,
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.versions = [];
    this.currentVersion = 0;
    this.grandCycleCount = 0;
    this.lastBackupCycle = 0;
  }

  // ─── Private Methods ────────────────────────────────────────

  private computeChecksum(weights: Float32Array, biases: Float32Array, version: string): string {
    // FNV-1a hash over weights + biases + version string
    let hash = 0x811c9dc5;
    const fnvPrime = 0x01000193;

    // Hash weights (sample every 16th for performance)
    for (let i = 0; i < weights.length; i += 16) {
      const bits = Math.round(weights[i] * 1e6) | 0;
      hash ^= bits & 0xFF;
      hash = Math.imul(hash, fnvPrime);
      hash ^= (bits >> 8) & 0xFF;
      hash = Math.imul(hash, fnvPrime);
      hash ^= (bits >> 16) & 0xFF;
      hash = Math.imul(hash, fnvPrime);
      hash ^= (bits >> 24) & 0xFF;
      hash = Math.imul(hash, fnvPrime);
    }

    // Hash biases
    for (let i = 0; i < biases.length; i++) {
      const bits = Math.round(biases[i] * 1e6) | 0;
      hash ^= bits & 0xFF;
      hash = Math.imul(hash, fnvPrime);
      hash ^= (bits >> 8) & 0xFF;
      hash = Math.imul(hash, fnvPrime);
    }

    // Hash version string
    for (let i = 0; i < version.length; i++) {
      hash ^= version.charCodeAt(i);
      hash = Math.imul(hash, fnvPrime);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  private computeFidelity(layers: Record<string, { present: boolean }>): number {
    const weights: Record<string, number> = {
      L0: 0.25, L1: 0.10, L2: 0.15, L3: 0.15,
      L4: 0.10, L5: 0.05, L6: 0.10, L7: 0.10,
    };
    let fidelity = 0;
    for (const [key, info] of Object.entries(layers)) {
      if (info.present && weights[key]) {
        fidelity += weights[key];
      }
    }
    return fidelity;
  }
}

/**
 * Create a GGUFIdentityEmbedding instance
 */
export function createGGUFIdentityEmbedding(
  config?: Partial<GGUFIdentityConfig>,
): GGUFIdentityEmbedding {
  return new GGUFIdentityEmbedding(config);
}
