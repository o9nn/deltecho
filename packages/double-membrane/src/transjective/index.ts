/**
 * Transjective Buffer - Intermembrane Space Components
 *
 * This module exports all components of the transjective buffer,
 * which mediates between the objective (outer) and subjective (inner)
 * membranes.
 */

// Packet schemas
export {
  // Types
  type TrustLevel,
  type RiskCategory,
  type Provenance,
  type Fact,
  type EvidencePacket,
  type UpdateProposal,
  type ToolSpec,
  type Budget,
  type RedactionPolicy,
  type IntentPacket,
  type MemoryWritePacket,
  type BeliefUpdatePacket,
  type TelemetryPacket,
  type Packet,
  type PacketValidation,
  // Functions
  validateEvidencePacket,
  validateIntentPacket,
  createProvenance,
  addProvenanceStep,
  createEvidencePacket,
  createIntentPacket,
} from './packets.js';

// Membrane Bus
export {
  MembraneBus,
  type FlowDirection,
  type LogEntry,
  type BusStats,
  type BusEvent,
  type MembraneBusConfig,
} from './MembraneBus.js';

// Codec Pipeline
export {
  CodecPipeline,
  type HypergraphNode,
  type HypergraphEdge,
  type Hypergraph,
  type TensorRepresentation,
  type Summary,
  type CodecConfig,
  type ArenaEvent,
} from './CodecPipeline.js';

// Crossing Policy
export {
  CrossingPolicy,
  type CrossingDecision,
  type CrossingResult,
  type PolicyRule,
  type PolicyContext,
  type CrossingRecord,
  type CrossingPolicyConfig,
} from './CrossingPolicy.js';

// Sys6 Membrane Clock
export {
  Sys6MembraneClock,
  type Sys6Phase,
  type Sys6Stage,
  type Sys6Step,
  type DyadState,
  type TriadPermutation,
  type Sys6Address,
  type Delta2Lane,
  type Delta3Phase,
  type ClockTick,
  type Sys6MembraneClockConfig,
} from './Sys6MembraneClock.js';
