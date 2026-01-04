/**
 * Double Membrane Architecture for Deep Tree Echo
 *
 * This package implements a bio-inspired double membrane architecture
 * that provides Deep Tree Echo with:
 *
 * 1. Strong Core Identity - A protected inner membrane with autonomous
 *    operation capabilities and persistent self-model
 *
 * 2. API Acceleration - An outer membrane that interfaces with external
 *    AI services for enhanced intelligence when available
 *
 * 3. Graceful Degradation - Seamless fallback between external APIs
 *    and native inference based on availability and complexity
 *
 * 4. Transjective Buffer - Intermembrane space with typed packets,
 *    codec pipeline, crossing policy, and Sys6 clock integration
 *
 * The architecture is inspired by the mitochondrial double membrane,
 * which compartmentalizes functions, creates energy gradients, and
 * maintains genetic autonomy.
 *
 * @module double-membrane
 */

// ============================================================
// Inner Membrane - Core Identity & Autonomous Operation
// ============================================================

export {
  CoreIdentity,
  type AARCore,
  type CorePriors,
  type IdentityState,
  type CoreIdentityEvent,
  type NativeInferenceConfig,
} from './inner-membrane/CoreIdentity.js';

export {
  NativeInferenceEngine,
  type InferenceRequest,
  type InferenceResponse,
  type EngineStats,
} from './inner-membrane/NativeInferenceEngine.js';

export {
  AutonomousController,
  type ControllerConfig,
  type ProcessingResult,
  type ControllerEvent,
} from './inner-membrane/AutonomousController.js';

export {
  SelfState,
  type IdentityInvariant,
  type Commitment,
  type Belief,
  type MemoryEntry,
  type AuditEntry,
  type SelfStateConfig,
} from './inner-membrane/SelfState.js';

// ============================================================
// Outer Membrane - API Gateway & External Interface
// ============================================================

export {
  APIGateway,
  type LLMProvider,
  type ProviderConfig,
  type APIRequest,
  type APIResponse,
  type ProviderHealth,
  type GatewayStats,
  type GatewayEvent,
} from './outer-membrane/APIGateway.js';

// ============================================================
// Intermembrane Space - Coordination & Routing
// ============================================================

export {
  MembraneCoordinator,
  type CoordinatorRequest,
  type CoordinatorResponse,
  type CoordinatorConfig,
  type CoordinatorEvent,
} from './intermembrane-space/MembraneCoordinator.js';

// ============================================================
// Transjective Buffer - Packets, Bus, Codecs, Policy, Clock
// ============================================================

// Packet schemas
export {
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
  validateEvidencePacket,
  validateIntentPacket,
  createProvenance,
  addProvenanceStep,
  createEvidencePacket,
  createIntentPacket,
} from './transjective/packets.js';

// Membrane Bus
export {
  MembraneBus,
  type FlowDirection,
  type LogEntry,
  type BusStats,
  type BusEvent,
  type MembraneBusConfig,
} from './transjective/MembraneBus.js';

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
} from './transjective/CodecPipeline.js';

// Crossing Policy
export {
  CrossingPolicy,
  type CrossingDecision,
  type CrossingResult,
  type PolicyRule,
  type PolicyContext,
  type CrossingRecord,
  type CrossingPolicyConfig,
} from './transjective/CrossingPolicy.js';

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
} from './transjective/Sys6MembraneClock.js';

// ============================================================
// Main Entry Point - Complete Double Membrane System
// ============================================================

export { DoubleMembrane, type DoubleMembraneConfig } from './DoubleMembrane.js';
