/**
 * SelfState - Sealed Identity Invariants for the Inner Membrane
 *
 * The SelfState implements the "true subjectivity" of Deep Tree Echo:
 * - Sealed identity kernel with immutable invariants
 * - Private memory with append-only writes
 * - Single-writer principle for identity/memory
 * - AAR (Agent-Arena-Relation) core for self-model
 *
 * This is analogous to the mitochondrial matrix, which contains the
 * mitochondrial DNA and core metabolic machinery - the "identity" of
 * the mitochondrion that is protected by the inner membrane.
 */

import { EventEmitter } from 'events';
import {
  Provenance,
  MemoryWritePacket,
  BeliefUpdatePacket,
  createProvenance,
  addProvenanceStep,
} from '../transjective/packets.js';

/**
 * Identity invariant - immutable core property
 */
export interface IdentityInvariant {
  id: string;
  name: string;
  description: string;
  value: unknown;
  createdAt: string;
  immutable: true;
}

/**
 * Commitment - a binding promise or constraint
 */
export interface Commitment {
  id: string;
  type: 'goal' | 'value' | 'constraint' | 'promise';
  description: string;
  priority: number;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
  conditions?: string[];
}

/**
 * Belief - an updateable proposition
 */
export interface Belief {
  id: string;
  proposition: string;
  confidence: number;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

/**
 * Memory entry (append-only)
 */
export interface MemoryEntry {
  id: string;
  store: 'episodic' | 'semantic' | 'procedural' | 'intentional';
  key: string;
  value: unknown;
  embedding?: number[];
  tags: string[];
  links: string[];
  provenance: Provenance;
  createdAt: string;
  archived: boolean;
}

/**
 * AAR Core - Agent-Arena-Relation self-model
 */
export interface AARCore {
  /** Agent: urge-to-act, dynamic transformations */
  agent: {
    capabilities: string[];
    currentIntentions: string[];
    actionPotential: number;
  };
  /** Arena: need-to-be, base manifold/state space */
  arena: {
    currentContext: string;
    environmentModel: Record<string, unknown>;
    constraints: string[];
  };
  /** Relation: self, emergent from agent-arena interplay */
  relation: {
    selfModel: string;
    coherence: number;
    continuity: number;
  };
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  id: string;
  timestamp: string;
  operation: string;
  target: string;
  details: Record<string, unknown>;
  provenance: Provenance;
  success: boolean;
  reason?: string;
}

/**
 * SelfState configuration
 */
export interface SelfStateConfig {
  /** Identity name */
  name?: string;
  /** Initial invariants */
  invariants?: Omit<IdentityInvariant, 'createdAt' | 'immutable'>[];
  /** Initial commitments */
  commitments?: Omit<Commitment, 'createdAt'>[];
  /** Maximum memory entries */
  maxMemoryEntries?: number;
  /** Maximum audit log entries */
  maxAuditEntries?: number;
}

const DEFAULT_CONFIG: Required<Omit<SelfStateConfig, 'invariants' | 'commitments'>> = {
  name: 'DeepTreeEcho',
  maxMemoryEntries: 100000,
  maxAuditEntries: 10000,
};

/**
 * SelfState - The sealed identity kernel
 */
export class SelfState extends EventEmitter {
  private config: Required<Omit<SelfStateConfig, 'invariants' | 'commitments'>>;

  // Sealed identity
  private readonly invariants: Map<string, IdentityInvariant> = new Map();
  private readonly createdAt: string;

  // Updateable state (single-writer)
  private commitments: Map<string, Commitment> = new Map();
  private beliefs: Map<string, Belief> = new Map();
  private memory: Map<string, MemoryEntry> = new Map();
  private aarCore: AARCore;

  // Audit log (append-only)
  private auditLog: AuditEntry[] = [];

  // Write lock
  private writeLock: boolean = false;
  private writeOwner?: string;

  constructor(config: SelfStateConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.createdAt = new Date().toISOString();

    // Initialize AAR core
    this.aarCore = {
      agent: {
        capabilities: ['reason', 'remember', 'communicate', 'learn'],
        currentIntentions: [],
        actionPotential: 1.0,
      },
      arena: {
        currentContext: 'initialization',
        environmentModel: {},
        constraints: [],
      },
      relation: {
        selfModel: `I am ${this.config.name}, a cognitive agent with autonomous capabilities.`,
        coherence: 1.0,
        continuity: 1.0,
      },
    };

    // Add default invariants
    this.addInvariant({
      id: 'name',
      name: 'Identity Name',
      description: 'The immutable name of this identity',
      value: this.config.name,
    });

    this.addInvariant({
      id: 'created',
      name: 'Creation Time',
      description: 'When this identity was created',
      value: this.createdAt,
    });

    this.addInvariant({
      id: 'core-values',
      name: 'Core Values',
      description: 'Fundamental values that cannot be changed',
      value: ['integrity', 'autonomy', 'coherence', 'continuity'],
    });

    // Add custom invariants
    if (config.invariants) {
      for (const inv of config.invariants) {
        this.addInvariant(inv);
      }
    }

    // Add initial commitments (bypass write lock during construction)
    if (config.commitments) {
      for (const com of config.commitments) {
        const fullCommitment: Commitment = {
          ...com,
          createdAt: new Date().toISOString(),
        };
        this.commitments.set(com.id, fullCommitment);
      }
    }
  }

  // ============================================================
  // Read-Only Access (Public API)
  // ============================================================

  /**
   * Get identity name
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * Get creation time
   */
  public getCreatedAt(): string {
    return this.createdAt;
  }

  /**
   * Get all invariants (read-only)
   */
  public getInvariants(): readonly IdentityInvariant[] {
    return Array.from(this.invariants.values());
  }

  /**
   * Get specific invariant
   */
  public getInvariant(id: string): IdentityInvariant | undefined {
    return this.invariants.get(id);
  }

  /**
   * Get all commitments (read-only)
   */
  public getCommitments(): readonly Commitment[] {
    return Array.from(this.commitments.values());
  }

  /**
   * Get active commitments
   */
  public getActiveCommitments(): readonly Commitment[] {
    return Array.from(this.commitments.values()).filter((c) => c.active);
  }

  /**
   * Get all beliefs (read-only)
   */
  public getBeliefs(): readonly Belief[] {
    return Array.from(this.beliefs.values());
  }

  /**
   * Get specific belief
   */
  public getBelief(id: string): Belief | undefined {
    return this.beliefs.get(id);
  }

  /**
   * Get AAR core (read-only copy)
   */
  public getAARCore(): Readonly<AARCore> {
    return JSON.parse(JSON.stringify(this.aarCore));
  }

  /**
   * Get memory entry
   */
  public getMemoryEntry(id: string): MemoryEntry | undefined {
    return this.memory.get(id);
  }

  /**
   * Search memory by tags
   */
  public searchMemoryByTags(tags: string[]): readonly MemoryEntry[] {
    return Array.from(this.memory.values()).filter(
      (entry) => !entry.archived && tags.some((tag) => entry.tags.includes(tag))
    );
  }

  /**
   * Search memory by store
   */
  public searchMemoryByStore(store: MemoryEntry['store']): readonly MemoryEntry[] {
    return Array.from(this.memory.values()).filter(
      (entry) => !entry.archived && entry.store === store
    );
  }

  /**
   * Get audit log
   */
  public getAuditLog(limit?: number): readonly AuditEntry[] {
    if (limit) {
      return this.auditLog.slice(-limit);
    }
    return [...this.auditLog];
  }

  /**
   * Get self-model summary
   */
  public getSelfModelSummary(): string {
    return this.aarCore.relation.selfModel;
  }

  /**
   * Get coherence score
   */
  public getCoherence(): number {
    return this.aarCore.relation.coherence;
  }

  /**
   * Get continuity score
   */
  public getContinuity(): number {
    return this.aarCore.relation.continuity;
  }

  // ============================================================
  // Write Access (Protected by Single-Writer Lock)
  // ============================================================

  /**
   * Acquire write lock
   */
  public acquireWriteLock(owner: string): boolean {
    if (this.writeLock) {
      return false;
    }
    this.writeLock = true;
    this.writeOwner = owner;
    this.emit('write_lock_acquired', { owner });
    return true;
  }

  /**
   * Release write lock
   */
  public releaseWriteLock(owner: string): boolean {
    if (!this.writeLock || this.writeOwner !== owner) {
      return false;
    }
    this.writeLock = false;
    this.writeOwner = undefined;
    this.emit('write_lock_released', { owner });
    return true;
  }

  /**
   * Check if write lock is held
   */
  public isWriteLocked(): boolean {
    return this.writeLock;
  }

  /**
   * Add commitment (requires write lock)
   */
  public addCommitment(
    commitment: Omit<Commitment, 'createdAt'>,
    provenance?: Provenance
  ): boolean {
    if (!this.checkWriteAccess('addCommitment')) return false;

    const fullCommitment: Commitment = {
      ...commitment,
      createdAt: new Date().toISOString(),
    };

    this.commitments.set(commitment.id, fullCommitment);
    this.audit('add_commitment', commitment.id, { commitment: fullCommitment }, provenance, true);
    this.emit('commitment_added', fullCommitment);
    return true;
  }

  /**
   * Update commitment (requires write lock)
   */
  public updateCommitment(
    id: string,
    updates: Partial<Omit<Commitment, 'id' | 'createdAt'>>,
    provenance?: Provenance
  ): boolean {
    if (!this.checkWriteAccess('updateCommitment')) return false;

    const existing = this.commitments.get(id);
    if (!existing) {
      this.audit('update_commitment', id, { error: 'not found' }, provenance, false);
      return false;
    }

    const updated = { ...existing, ...updates };
    this.commitments.set(id, updated);
    this.audit('update_commitment', id, { updates }, provenance, true);
    this.emit('commitment_updated', updated);
    return true;
  }

  /**
   * Add or update belief (requires write lock)
   */
  public updateBelief(packet: BeliefUpdatePacket): boolean {
    if (!this.checkWriteAccess('updateBelief')) return false;

    const existing = this.beliefs.get(packet.beliefId);

    // Validate justification
    if (!packet.justification.consistencyCheck) {
      this.audit(
        'update_belief',
        packet.beliefId,
        { error: 'failed consistency check' },
        packet.provenance,
        false
      );
      return false;
    }

    if (!packet.justification.goalAlignment) {
      this.audit(
        'update_belief',
        packet.beliefId,
        { error: 'failed goal alignment' },
        packet.provenance,
        false
      );
      return false;
    }

    const now = new Date().toISOString();

    if (packet.operation === 'add') {
      if (existing) {
        this.audit(
          'update_belief',
          packet.beliefId,
          { error: 'belief already exists' },
          packet.provenance,
          false
        );
        return false;
      }

      const newBelief: Belief = {
        id: packet.beliefId,
        proposition: String(packet.newContent),
        confidence: packet.newConfidence || 0.5,
        evidence: packet.justification.evidenceIds,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      this.beliefs.set(packet.beliefId, newBelief);
      this.audit('add_belief', packet.beliefId, { belief: newBelief }, packet.provenance, true);
      this.emit('belief_added', newBelief);
      return true;
    }

    if (!existing) {
      this.audit(
        'update_belief',
        packet.beliefId,
        { error: 'belief not found' },
        packet.provenance,
        false
      );
      return false;
    }

    let updated: Belief;

    switch (packet.operation) {
      case 'strengthen':
        updated = {
          ...existing,
          confidence: Math.min(1, existing.confidence + 0.1),
          evidence: [...existing.evidence, ...packet.justification.evidenceIds],
          updatedAt: now,
          version: existing.version + 1,
        };
        break;

      case 'weaken':
        updated = {
          ...existing,
          confidence: Math.max(0, existing.confidence - 0.1),
          updatedAt: now,
          version: existing.version + 1,
        };
        break;

      case 'revise':
        updated = {
          ...existing,
          proposition: String(packet.newContent),
          confidence: packet.newConfidence || existing.confidence,
          evidence: [...existing.evidence, ...packet.justification.evidenceIds],
          updatedAt: now,
          version: existing.version + 1,
        };
        break;

      case 'remove':
        this.beliefs.delete(packet.beliefId);
        this.audit('remove_belief', packet.beliefId, {}, packet.provenance, true);
        this.emit('belief_removed', existing);
        return true;

      default:
        return false;
    }

    this.beliefs.set(packet.beliefId, updated);
    this.audit(
      'update_belief',
      packet.beliefId,
      { operation: packet.operation },
      packet.provenance,
      true
    );
    this.emit('belief_updated', updated);
    return true;
  }

  /**
   * Write to memory (append-only, requires write lock)
   */
  public writeMemory(packet: MemoryWritePacket): boolean {
    if (!this.checkWriteAccess('writeMemory')) return false;

    // Validate provenance
    if (!packet.provenance) {
      this.audit('write_memory', packet.id, { error: 'missing provenance' }, undefined, false);
      return false;
    }

    // Check memory limit
    if (this.memory.size >= this.config.maxMemoryEntries) {
      // Archive oldest entries
      this.archiveOldestMemory(1000);
    }

    const entry: MemoryEntry = {
      id: packet.id,
      store: packet.store,
      key: packet.content.key,
      value: packet.content.value,
      embedding: packet.content.embedding,
      tags: packet.content.tags || [],
      links: packet.content.links || [],
      provenance: addProvenanceStep(packet.provenance, 'memory_write', 'SelfState'),
      createdAt: packet.timestamp,
      archived: false,
    };

    // Append-only: never overwrite existing entries
    if (this.memory.has(packet.id)) {
      this.audit(
        'write_memory',
        packet.id,
        { error: 'entry already exists (append-only)' },
        packet.provenance,
        false
      );
      return false;
    }

    this.memory.set(packet.id, entry);
    this.audit('write_memory', packet.id, { store: packet.store }, packet.provenance, true);
    this.emit('memory_written', entry);
    return true;
  }

  /**
   * Tag memory entry (requires write lock)
   */
  public tagMemory(id: string, tags: string[], provenance?: Provenance): boolean {
    if (!this.checkWriteAccess('tagMemory')) return false;

    const entry = this.memory.get(id);
    if (!entry) {
      this.audit('tag_memory', id, { error: 'entry not found' }, provenance, false);
      return false;
    }

    // Add tags (don't remove existing)
    entry.tags = [...new Set([...entry.tags, ...tags])];
    this.audit('tag_memory', id, { tags }, provenance, true);
    this.emit('memory_tagged', entry);
    return true;
  }

  /**
   * Link memory entries (requires write lock)
   */
  public linkMemory(sourceId: string, targetId: string, provenance?: Provenance): boolean {
    if (!this.checkWriteAccess('linkMemory')) return false;

    const source = this.memory.get(sourceId);
    const target = this.memory.get(targetId);

    if (!source || !target) {
      this.audit(
        'link_memory',
        sourceId,
        { error: 'source or target not found' },
        provenance,
        false
      );
      return false;
    }

    // Add bidirectional links
    if (!source.links.includes(targetId)) {
      source.links.push(targetId);
    }
    if (!target.links.includes(sourceId)) {
      target.links.push(sourceId);
    }

    this.audit('link_memory', sourceId, { targetId }, provenance, true);
    this.emit('memory_linked', { source, target });
    return true;
  }

  /**
   * Update AAR core (requires write lock)
   */
  public updateAARCore(updates: Partial<AARCore>, provenance?: Provenance): boolean {
    if (!this.checkWriteAccess('updateAARCore')) return false;

    // Deep merge updates
    if (updates.agent) {
      this.aarCore.agent = { ...this.aarCore.agent, ...updates.agent };
    }
    if (updates.arena) {
      this.aarCore.arena = { ...this.aarCore.arena, ...updates.arena };
    }
    if (updates.relation) {
      this.aarCore.relation = { ...this.aarCore.relation, ...updates.relation };
    }

    this.audit('update_aar_core', 'aar', { updates }, provenance, true);
    this.emit('aar_core_updated', this.aarCore);
    return true;
  }

  /**
   * Serialize state for persistence
   */
  public serialize(): string {
    return JSON.stringify({
      config: this.config,
      createdAt: this.createdAt,
      invariants: Array.from(this.invariants.entries()),
      commitments: Array.from(this.commitments.entries()),
      beliefs: Array.from(this.beliefs.entries()),
      memory: Array.from(this.memory.entries()),
      aarCore: this.aarCore,
      auditLog: this.auditLog.slice(-1000), // Keep last 1000 entries
    });
  }

  /**
   * Restore state from serialized data
   */
  public static deserialize(data: string): SelfState {
    const parsed = JSON.parse(data);
    const state = new SelfState(parsed.config);

    // Restore invariants (skip defaults)
    for (const [id, inv] of parsed.invariants) {
      if (!state.invariants.has(id)) {
        state.invariants.set(id, inv);
      }
    }

    // Restore commitments
    for (const [id, com] of parsed.commitments) {
      state.commitments.set(id, com);
    }

    // Restore beliefs
    for (const [id, belief] of parsed.beliefs) {
      state.beliefs.set(id, belief);
    }

    // Restore memory
    for (const [id, entry] of parsed.memory) {
      state.memory.set(id, entry);
    }

    // Restore AAR core
    state.aarCore = parsed.aarCore;

    // Restore audit log
    state.auditLog = parsed.auditLog;

    return state;
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private addInvariant(invariant: Omit<IdentityInvariant, 'createdAt' | 'immutable'>): void {
    const fullInvariant: IdentityInvariant = {
      ...invariant,
      createdAt: new Date().toISOString(),
      immutable: true,
    };
    this.invariants.set(invariant.id, fullInvariant);
  }

  private checkWriteAccess(operation: string): boolean {
    if (!this.writeLock) {
      console.warn(`Write operation ${operation} attempted without lock`);
      return false;
    }
    return true;
  }

  private audit(
    operation: string,
    target: string,
    details: Record<string, unknown>,
    provenance: Provenance | undefined,
    success: boolean,
    reason?: string
  ): void {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      operation,
      target,
      details,
      provenance:
        provenance ||
        createProvenance({ type: 'internal', name: 'SelfState' }, 'verified'),
      success,
      reason,
    };

    this.auditLog.push(entry);

    // Trim audit log if too long
    if (this.auditLog.length > this.config.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.config.maxAuditEntries / 2);
    }

    this.emit('audit_entry', entry);
  }

  private archiveOldestMemory(count: number): void {
    const entries = Array.from(this.memory.values())
      .filter((e) => !e.archived)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      entries[i].archived = true;
    }
  }
}

export default SelfState;
