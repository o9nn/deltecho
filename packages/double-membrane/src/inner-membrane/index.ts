/**
 * Inner Membrane Module
 *
 * The Inner Membrane is the protected core of Deep Tree Echo's cognitive architecture.
 * It contains the agent's core identity, native inference capabilities, and autonomous
 * operation systems.
 *
 * Components:
 * - CoreIdentity: Manages the agent's sense of self and AAR dynamics
 * - NativeInferenceEngine: Provides lightweight, autonomous inference
 * - AutonomousController: Coordinates inner membrane operations
 */

export { CoreIdentity, type AARCore, type CorePriors, type IdentityState, type CoreIdentityEvent, type NativeInferenceConfig } from './CoreIdentity.js';
export { NativeInferenceEngine, type InferenceRequest, type InferenceResponse, type EngineStats } from './NativeInferenceEngine.js';
export { AutonomousController, type ControllerConfig, type ProcessingResult, type ControllerEvent } from './AutonomousController.js';
export { SelfState, type IdentityInvariant, type Commitment, type Belief, type MemoryEntry, type AuditEntry, type SelfStateConfig } from './SelfState.js';
export { MemoryPersistence, type MemoryType, type MemoryEntry as PersistentMemoryEntry, type MemoryQuery, type MemoryStats, type PersistenceConfig } from './MemoryPersistence.js';
