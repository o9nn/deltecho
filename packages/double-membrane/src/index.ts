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
 * The architecture is inspired by the mitochondrial double membrane,
 * which compartmentalizes functions, creates energy gradients, and
 * maintains genetic autonomy.
 *
 * @module double-membrane
 */

// Inner Membrane - Core Identity & Autonomous Operation
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

// Outer Membrane - API Gateway & External Interface
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

// Intermembrane Space - Coordination & Routing
export {
  MembraneCoordinator,
  type CoordinatorRequest,
  type CoordinatorResponse,
  type CoordinatorConfig,
  type CoordinatorEvent,
} from './intermembrane-space/MembraneCoordinator.js';

// Main entry point - the complete Double Membrane System
export { DoubleMembrane, type DoubleMembraneConfig } from './DoubleMembrane.js';
