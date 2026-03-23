/**
 * @fileoverview Persona Module — Cognitive Persona Architecture
 *
 * Composition: /neuro-persona-evolve = /llama-cpp-skillm(
 *   /optimal-cognitive-grip(target_repos, upstream_repos, cogpy_stack)
 * ) -> /skill-creator(target_persona_repo)
 *
 * Grounded in tree-polytope kernel algebra:
 *   - Identity = Matula prime (irreducible polynomial)
 *   - Personality = simplex incidence structure
 *   - Cognitive streams = star tower convolution powers
 *   - Memory = chain tower recursive primes
 *
 * @packageDocumentation
 */

// Persona Orchestrator (L5 cogplan9)
// Note: convolve, pascalRow, isPrime, simplexIncidence already exported from tree-polytope-kernel
// Note: OntogeneticStage already exported from core-self
// Note: ReservoirState already exported from cognitive
// We use Persona-prefixed names to avoid conflicts
export {
  PersonaOrchestrator,
  createDTEPersonaOrchestrator,
  DTE_PERSONALITY,
  DTE_STYLE,
  DTE_INTELLIGENCE,
  DTE_HUMOR_PATTERNS,
  DTE_REACTION_PATTERNS,
  DTE_VERBAL_PATTERNS,
  computeTreeGrounding,
  convolve as personaConvolve,
  pascalRow as personaPascalRow,
  simplexIncidence as personaSimplexIncidence,
  isPrime as personaIsPrime,
  chainPrime,
  nthPrime,
  type PersonalityVector,
  type CommunicationStyle,
  type IntelligenceProfile,
  type HumorPattern,
  type ReactionPattern,
  type VerbalPattern,
  type ConversationExample,
  type TreePolytopeGrounding,
  type PersonaState,
  type EmotionalState as PersonaEmotionalState,
  type OntogeneticStage as PersonaOntogeneticStage,
  type SkillmVerb,
  type PersonaAction,
  type PersonaOrchestratorConfig,
} from './persona-orchestrator.js';

// Identity Core MLP (L0 coggml)
export {
  IdentityCoreMLP,
  createIdentityCoreMLP,
  type MLPLayer,
  type MLPState,
  type MLPInput,
  type MLPOutput,
  type IdentityCoreMlpConfig,
} from './identity-core-mlp.js';

// Persona Backup (8-layer backup/restore)
export {
  PersonaBackup,
  createPersonaBackup,
  type BackupLayer,
  type StyleAdapterConfig,
  type HypergraphNode as PersonaHypergraphNode,
  type HypergraphEdge as PersonaHypergraphEdge,
  type ReservoirState as PersonaReservoirState,
  type SomaticMarker,
  type ToMModel,
  type AutognosisSelfModel,
  type BackupManifest,
  type BackupImage,
} from './persona-backup.js';
// Persona Expression Bridge (connects persona to Live2D pipeline)
export {
  PersonaExpressionBridge,
  createPersonaExpressionBridge,
  generatePersonaExpressionTrainingData,
  type PersonaExpressionState,
  type PersonaExpressionBridgeConfig,
} from './persona-expression-bridge.js';
