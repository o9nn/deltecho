/**
 * Membrane Transport Packet Types
 *
 * Defines the packet structures for crossing the double membrane boundary
 * between objective (outer) and subjective (inner) membranes.
 */

/**
 * Provenance information for tracking packet origin and chain of custody
 */
export interface Provenance {
  /** Source identifier (tool, provider, agent) */
  source: string;

  /** Timestamp of packet creation */
  timestamp: number;

  /** Confidence score (0-1) */
  confidence: number;

  /** Chain of transformations applied */
  transformations: Array<{
    type: string;
    timestamp: number;
    agent: string;
  }>;

  /** Cryptographic signature for integrity */
  signature?: string;
}

/**
 * Cost metrics for resource tracking
 */
export interface Cost {
  /** Computational cost (tokens, cycles, etc.) */
  compute: number;

  /** Time cost in milliseconds */
  time: number;

  /** Energy cost (battery, power units) */
  energy: number;

  /** Monetary cost (if applicable) */
  money?: number;

  /** Memory cost in bytes */
  memory: number;
}

/**
 * Risk assessment for security and privacy
 */
export interface Risk {
  /** Privacy risk score (0-1) */
  privacy: number;

  /** Prompt injection risk score (0-1) */
  injection: number;

  /** Data exfiltration risk score (0-1) */
  exfiltration: number;

  /** Overall risk level */
  level: 'low' | 'medium' | 'high' | 'critical';

  /** Risk mitigation actions taken */
  mitigations: string[];
}

/**
 * Evidence Packet: Crosses inward (Objective → Subjective)
 *
 * Contains evidence from the objective world that may update subjective beliefs
 */
export interface EvidencePacket {
  /** Unique packet identifier */
  id: string;

  /** Packet type discriminator */
  type: 'evidence';

  /** Facts or claims from the objective world */
  facts: Array<{
    claim: string;
    confidence: number;
    evidence: unknown;
  }>;

  /** Provenance tracking */
  provenance: Provenance;

  /** Resource costs */
  cost: Cost;

  /** Risk assessment */
  risk: Risk;

  /** Proposed updates (never auto-applied) */
  proposedUpdates?: Array<{
    target: string;
    operation: 'create' | 'update' | 'delete';
    data: unknown;
  }>;

  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Intent Packet: Crosses outward (Subjective → Objective)
 *
 * Contains intentions from the subjective self that guide objective actions
 */
export interface IntentPacket {
  /** Unique packet identifier */
  id: string;

  /** Packet type discriminator */
  type: 'intent';

  /** Goal specification */
  goal: {
    description: string;
    success_criteria: string[];
    priority: number;
  };

  /** Constraints on execution */
  constraints: {
    time_limit?: number;
    resource_limit?: Cost;
    safety_requirements: string[];
  };

  /** Allowed tools and capabilities */
  allowedTools: string[];

  /** Redaction policy for privacy */
  redactionPolicy: {
    redact_embeddings: boolean;
    redact_private_memory: boolean;
    allowed_data_types: string[];
  };

  /** Resource budget */
  budget: Cost;

  /** Expected return type */
  expectedReturnType: string;

  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Update Proposal: Suggested changes to subjective state
 */
export interface UpdateProposal {
  /** Unique proposal identifier */
  id: string;

  /** Target component to update */
  target: string;

  /** Operation type */
  operation: 'create' | 'update' | 'delete' | 'merge';

  /** Proposed data */
  data: unknown;

  /** Justification for the update */
  justification: string;

  /** Confidence in the proposal */
  confidence: number;

  /** Supporting evidence */
  evidence: EvidencePacket[];
}

/**
 * Union type for all packet types
 */
export type Packet = EvidencePacket | IntentPacket;

/**
 * Packet validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
