/**
 * Typed Packet Schemas for Membrane Communication
 *
 * These packets define the formal contract for what can cross the membrane
 * boundaries. Inspired by mitochondrial transport proteins, each packet type
 * has strict typing, provenance tracking, and validation rules.
 *
 * Key principles:
 * - Objective → Subjective: Only EvidencePackets (never auto-applied)
 * - Subjective → Objective: Only IntentPackets (sanitized, budgeted)
 * - All crossings are typed, rate-limited, provenance-stamped
 */

/**
 * Trust level for provenance sources
 */
export type TrustLevel = 'verified' | 'trusted' | 'unknown' | 'untrusted' | 'hostile';

/**
 * Risk categories for content
 */
export type RiskCategory =
  | 'safe'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'prompt_injection'
  | 'data_exfiltration';

/**
 * Provenance tracking for all packets
 * Tracks the origin and chain of custody for any data crossing the membrane
 */
export interface Provenance {
  /** Unique identifier for this provenance chain */
  id: string;
  /** Source of the data */
  source: {
    type: 'tool' | 'api' | 'user' | 'internal' | 'arena' | 'memory';
    name: string;
    version?: string;
    endpoint?: string;
  };
  /** Timestamp of creation (ISO 8601) */
  timestamp: string;
  /** Trust level of the source */
  trustLevel: TrustLevel;
  /** Cryptographic signature (optional) */
  signature?: string;
  /** Parent provenance IDs (for derived data) */
  derivedFrom?: string[];
  /** Processing chain (what transformations were applied) */
  processingChain: Array<{
    step: string;
    timestamp: string;
    agent: string;
  }>;
}

/**
 * A single fact/claim in an evidence packet
 */
export interface Fact {
  /** Unique identifier */
  id: string;
  /** The claim content */
  content: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Category of the fact */
  category: 'observation' | 'inference' | 'tool_output' | 'user_statement' | 'memory_recall';
  /** Structured data (if applicable) */
  structuredData?: Record<string, unknown>;
  /** Embedding vector (if computed) */
  embedding?: number[];
}

/**
 * EvidencePacket - What crosses inward (Objective → Subjective)
 *
 * Evidence packets carry information from the external world into the
 * subjective core. They are NEVER auto-applied - the inner membrane
 * must explicitly accept and integrate them.
 */
export interface EvidencePacket {
  /** Packet type discriminator */
  type: 'evidence';
  /** Unique packet identifier */
  id: string;
  /** Provenance information */
  provenance: Provenance;
  /** Facts/claims contained in this packet */
  facts: Fact[];
  /** Resource cost incurred to produce this evidence */
  cost: {
    /** Energy/compute cost (normalized 0-1) */
    energy: number;
    /** Time cost in milliseconds */
    timeMs: number;
    /** Token cost (if LLM-derived) */
    tokens?: number;
    /** Monetary cost (if applicable) */
    monetary?: number;
  };
  /** Risk assessment */
  risk: {
    /** Overall risk score (0-1) */
    score: number;
    /** Risk categories detected */
    categories: RiskCategory[];
    /** Specific concerns */
    concerns: string[];
  };
  /** Proposed updates to subjective state (never auto-applied) */
  proposedUpdates?: UpdateProposal[];
  /** Metadata */
  metadata: {
    /** Sys6 step at which this was generated */
    sys6Step?: number;
    /** Which Δ₂ lane produced this */
    delta2Lane?: number;
    /** Priority level */
    priority: 'critical' | 'high' | 'normal' | 'low' | 'background';
    /** Expiration timestamp (ISO 8601) */
    expiresAt?: string;
  };
}

/**
 * UpdateProposal - A proposed change to subjective state
 *
 * These are suggestions from the objective side that must be
 * explicitly approved by the crossing policy before being applied.
 */
export interface UpdateProposal {
  /** Proposal identifier */
  id: string;
  /** Target of the update */
  target: 'memory' | 'belief' | 'goal' | 'value' | 'constraint' | 'model';
  /** Type of update */
  operation: 'add' | 'modify' | 'remove' | 'strengthen' | 'weaken';
  /** The proposed content */
  content: {
    key: string;
    value: unknown;
    previousValue?: unknown;
  };
  /** Justification for the update */
  justification: string;
  /** Confidence in the proposal */
  confidence: number;
  /** Evidence IDs supporting this proposal */
  supportingEvidence: string[];
}

/**
 * Tool specification for intent packets
 */
export interface ToolSpec {
  /** Tool name */
  name: string;
  /** Allowed operations */
  allowedOperations?: string[];
  /** Forbidden operations */
  forbiddenOperations?: string[];
  /** Parameter constraints */
  parameterConstraints?: Record<string, unknown>;
}

/**
 * Budget specification for intent packets
 */
export interface Budget {
  /** Maximum tokens to use */
  maxTokens?: number;
  /** Maximum monetary cost */
  maxCost?: number;
  /** Maximum time in milliseconds */
  maxTimeMs?: number;
  /** Maximum energy (normalized 0-1) */
  maxEnergy?: number;
  /** Battery threshold (don't exceed if below this) */
  batteryThreshold?: number;
}

/**
 * Redaction policy for outgoing data
 */
export interface RedactionPolicy {
  /** Fields to always redact */
  redactFields: string[];
  /** Patterns to redact (regex strings) */
  redactPatterns: string[];
  /** Maximum length for any single field */
  maxFieldLength?: number;
  /** Whether to hash sensitive data instead of removing */
  hashInsteadOfRemove?: boolean;
  /** Allowed output categories */
  allowedCategories?: string[];
}

/**
 * IntentPacket - What crosses outward (Subjective → Objective)
 *
 * Intent packets express the agent's goals and constraints to the
 * objective world. They are sanitized and budgeted to prevent
 * information leakage and resource exhaustion.
 */
export interface IntentPacket {
  /** Packet type discriminator */
  type: 'intent';
  /** Unique packet identifier */
  id: string;
  /** Goal specification */
  goal: {
    /** Natural language description */
    description: string;
    /** Goal category */
    category: 'query' | 'action' | 'plan' | 'communicate' | 'observe';
    /** Success criteria */
    successCriteria?: string[];
    /** Failure conditions */
    failureConditions?: string[];
  };
  /** Constraints on execution */
  constraints: {
    /** Temporal constraints */
    temporal?: {
      deadline?: string;
      notBefore?: string;
      maxDuration?: number;
    };
    /** Ethical constraints */
    ethical?: string[];
    /** Safety constraints */
    safety?: string[];
    /** Custom constraints */
    custom?: Record<string, unknown>;
  };
  /** Allowed tools for this intent */
  allowedTools: ToolSpec[];
  /** Redaction policy for responses */
  redactionPolicy: RedactionPolicy;
  /** Budget for this intent */
  budget: Budget;
  /** Expected return type */
  expectedReturn: {
    type: 'text' | 'structured' | 'binary' | 'stream' | 'none';
    schema?: Record<string, unknown>;
    maxSize?: number;
  };
  /** Metadata */
  metadata: {
    /** Sys6 step at which this was generated */
    sys6Step?: number;
    /** Priority level */
    priority: 'critical' | 'high' | 'normal' | 'low' | 'background';
    /** Correlation ID for tracking */
    correlationId?: string;
    /** Parent intent ID (for sub-intents) */
    parentIntentId?: string;
  };
}

/**
 * MemoryWritePacket - Internal packet for memory operations
 *
 * Memory writes are append-only and require signed provenance.
 * This enforces the single-writer principle for identity/memory.
 */
export interface MemoryWritePacket {
  /** Packet type discriminator */
  type: 'memory_write';
  /** Unique packet identifier */
  id: string;
  /** Target memory store */
  store: 'episodic' | 'semantic' | 'procedural' | 'intentional';
  /** Operation type (append-only) */
  operation: 'append' | 'tag' | 'link' | 'archive';
  /** Content to write */
  content: {
    key: string;
    value: unknown;
    embedding?: number[];
    tags?: string[];
    links?: string[];
  };
  /** Provenance (required for all writes) */
  provenance: Provenance;
  /** Reason code for the write */
  reasonCode: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * BeliefUpdatePacket - Internal packet for belief updates
 *
 * Beliefs can only be updated through explicit, justified operations.
 */
export interface BeliefUpdatePacket {
  /** Packet type discriminator */
  type: 'belief_update';
  /** Unique packet identifier */
  id: string;
  /** Belief identifier */
  beliefId: string;
  /** Update operation */
  operation: 'strengthen' | 'weaken' | 'revise' | 'add' | 'remove';
  /** New confidence (if applicable) */
  newConfidence?: number;
  /** New content (if revising) */
  newContent?: unknown;
  /** Justification */
  justification: {
    reason: string;
    evidenceIds: string[];
    consistencyCheck: boolean;
    goalAlignment: boolean;
  };
  /** Provenance */
  provenance: Provenance;
}

/**
 * TelemetryPacket - For global telemetry shell
 *
 * Telemetry packets provide the persistent perception of the gestalt,
 * allowing all local cores to maintain awareness of the global context.
 */
export interface TelemetryPacket {
  /** Packet type discriminator */
  type: 'telemetry';
  /** Unique packet identifier */
  id: string;
  /** Sys6 cycle information */
  sys6: {
    /** Current step (1-30) */
    step: number;
    /** Current phase (1-3) */
    phase: number;
    /** Current stage (1-5) */
    stage: number;
    /** Active streams */
    activeStreams: [number, number, number];
    /** Dyad state (A or B) */
    dyadState: 'A' | 'B';
    /** Triad permutation */
    triadPermutation: [number, number, number];
  };
  /** Energy state */
  energy: {
    /** Current level (0-1) */
    level: number;
    /** Consumption rate */
    consumptionRate: number;
    /** Available budget */
    availableBudget: number;
  };
  /** Queue depths */
  queues: {
    inbound: number;
    outbound: number;
    pending: number;
  };
  /** Health metrics */
  health: {
    coherence: number;
    latency: number;
    errorRate: number;
  };
  /** Timestamp */
  timestamp: string;
}

/**
 * Union type for all packet types
 */
export type Packet =
  | EvidencePacket
  | IntentPacket
  | MemoryWritePacket
  | BeliefUpdatePacket
  | TelemetryPacket;

/**
 * Packet validation result
 */
export interface PacketValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate an evidence packet
 */
export function validateEvidencePacket(packet: EvidencePacket): PacketValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!packet.id) errors.push('Missing packet ID');
  if (!packet.provenance) errors.push('Missing provenance');
  if (!packet.facts || packet.facts.length === 0) warnings.push('No facts in evidence packet');
  if (!packet.cost) errors.push('Missing cost information');
  if (!packet.risk) errors.push('Missing risk assessment');

  // Validate provenance
  if (packet.provenance) {
    if (!packet.provenance.source) errors.push('Missing provenance source');
    if (!packet.provenance.timestamp) errors.push('Missing provenance timestamp');
    if (!packet.provenance.trustLevel) errors.push('Missing trust level');
  }

  // Validate facts
  for (const fact of packet.facts || []) {
    if (!fact.id) errors.push(`Fact missing ID`);
    if (fact.confidence < 0 || fact.confidence > 1) {
      errors.push(`Fact ${fact.id}: confidence out of range`);
    }
  }

  // Validate risk
  if (packet.risk && packet.risk.score > 0.8) {
    warnings.push('High risk score detected');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an intent packet
 */
export function validateIntentPacket(packet: IntentPacket): PacketValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!packet.id) errors.push('Missing packet ID');
  if (!packet.goal) errors.push('Missing goal');
  if (!packet.constraints) errors.push('Missing constraints');
  if (!packet.allowedTools) errors.push('Missing allowed tools');
  if (!packet.redactionPolicy) errors.push('Missing redaction policy');
  if (!packet.budget) errors.push('Missing budget');
  if (!packet.expectedReturn) errors.push('Missing expected return type');

  // Validate budget
  if (packet.budget) {
    if (packet.budget.maxTokens && packet.budget.maxTokens > 100000) {
      warnings.push('Very high token budget');
    }
    if (packet.budget.maxCost && packet.budget.maxCost > 10) {
      warnings.push('High monetary budget');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Create a new provenance record
 */
export function createProvenance(
  source: Provenance['source'],
  trustLevel: TrustLevel = 'unknown'
): Provenance {
  return {
    id: `prov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source,
    timestamp: new Date().toISOString(),
    trustLevel,
    processingChain: [],
  };
}

/**
 * Add a processing step to provenance
 */
export function addProvenanceStep(
  provenance: Provenance,
  step: string,
  agent: string
): Provenance {
  return {
    ...provenance,
    processingChain: [
      ...provenance.processingChain,
      {
        step,
        timestamp: new Date().toISOString(),
        agent,
      },
    ],
  };
}

/**
 * Create a new evidence packet
 */
export function createEvidencePacket(
  facts: Fact[],
  provenance: Provenance,
  options: Partial<EvidencePacket> = {}
): EvidencePacket {
  return {
    type: 'evidence',
    id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    provenance,
    facts,
    cost: options.cost || { energy: 0, timeMs: 0 },
    risk: options.risk || { score: 0, categories: ['safe'], concerns: [] },
    proposedUpdates: options.proposedUpdates,
    metadata: options.metadata || { priority: 'normal' },
  };
}

/**
 * Create a new intent packet
 */
export function createIntentPacket(
  goal: IntentPacket['goal'],
  options: Partial<IntentPacket> = {}
): IntentPacket {
  return {
    type: 'intent',
    id: `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    goal,
    constraints: options.constraints || {},
    allowedTools: options.allowedTools || [],
    redactionPolicy: options.redactionPolicy || { redactFields: [], redactPatterns: [] },
    budget: options.budget || {},
    expectedReturn: options.expectedReturn || { type: 'text' },
    metadata: options.metadata || { priority: 'normal' },
  };
}
