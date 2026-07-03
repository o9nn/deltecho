/**
 * @fileoverview Deep Tree Echo Orchestrator
 *
 * Main entry point for the orchestrator package.
 * Exports all public APIs for orchestration services.
 */

// Core Orchestrator
export {
  Orchestrator,
  type OrchestratorConfig,
  type CognitiveTierMode,
} from './orchestrator.js';

// DeltaChat Interface
export {
  DeltaChatInterface,
  type DeltaChatConfig,
  type DeltaChatMessage,
  type DeltaChatContact,
  type DeltaChatChat,
  type DeltaChatAccount,
  type DeltaChatEvent,
  type DeltaChatEventType,
} from './deltachat-interface/index.js';

// Dovecot Interface
export {
  DovecotInterface,
  type DovecotConfig,
  type EmailMessage,
} from './dovecot-interface/index.js';

// Dove9 Security - Email Sanitization & Rate Limiting (Phase 6 Production Hardening)
export {
  EmailSanitizer,
  type SanitizerConfig,
  type SanitizationResult,
  MailRateLimiter,
  type RateLimiterConfig,
  type RateLimitResult,
} from './dovecot-interface/index.js';

// IPC Server
export {
  IPCServer,
  IPCMessageType,
  type IPCMessage,
  type IPCRequestHandler,
  type IPCServerConfig,
} from './ipc/server.js';
export { StorageManager } from './ipc/storage-manager.js';

// Task Scheduler
export {
  TaskScheduler,
  TaskStatus,
  type ScheduledTask,
  type TaskResult,
} from './scheduler/task-scheduler.js';

// Webhook Server
export { WebhookServer, type WebhookServerConfig } from './webhooks/webhook-server.js';

// Dove9 Integration
export {
  Dove9Integration,
  type Dove9IntegrationConfig,
  type Dove9Response,
} from './dove9-integration.js';

// Dove9 Conversational Bridge - "Everything is a chatbot" paradigm
export {
  Dove9ConversationalBridge,
  COGNITIVE_MAILBOXES,
  type ConversationalMessage,
  type ConversationalProcess,
  type CognitiveMailbox,
  type Dove9ConversationalBridgeConfig,
  type Dove9BridgeEvent,
} from './dove9-conversational-bridge.js';

// Sys6 Bridge - 30-step cognitive cycle integration
export {
  Sys6OrchestratorBridge,
  type Sys6BridgeConfig,
  type Sys6StepAddress,
  type StreamState,
  type CycleResult,
  type CognitiveAgent,
} from './sys6-bridge/index.js';

// Agent Coordinator - Nested agency pattern
export {
  AgentCoordinator,
  type Agent,
  type AgentCapability,
  type AgentTemplate,
  type Task,
  type TaskResult as AgentTaskResult,
  type CoordinatorConfig,
} from './agents/index.js';

// Telemetry Monitor - Real-time monitoring
export {
  TelemetryMonitor,
  type TelemetryConfig,
  type TelemetrySnapshot,
  type Metric,
  type MetricDataPoint,
  type HealthStatus,
  type Alert,
} from './telemetry/index.js';

// Double Membrane Integration - Bio-inspired cognitive architecture
export {
  DoubleMembraneIntegration,
  createDoubleMembraneIntegration,
  type DoubleMembraneIntegrationConfig,
  type DoubleMembraneRequest,
  type DoubleMembraneResponse,
  type IntegrationStatus,
} from './double-membrane-integration.js';

// Proactive Autonomous Loop - Self-initiated cognitive cycles
export {
  ProactiveLoop,
  ProactivePhase,
  OntogeneticStage,
  type ProactiveLoopConfig,
  type ProactiveLoopState,
  type ProactiveLoopEvent,
  type EnvironmentStimulus,
  type ReflectionResult,
  type AutonomousGoal,
  type ActionResult,
  type IntegrationResult,
} from './proactive-loop.js';

// Echo Agent Loop - Unified autonomous cognitive event loop
export {
  EchoAgentLoop,
  type EchoAgentLoopConfig,
  type EchoAgentMetrics,
  type GrandCycleState,
  type ThreadPermutation,
  type TriadConfig,
} from './echo-agent-loop.js';

// Cognitive Tick Processor - Real cognitive work per tick
export {
  CognitiveTickProcessor,
  type CognitiveTickProcessorConfig,
  type CognitivePercept,
  type EpisodicMemory,
  type CognitiveGoal,
  type SelfImageSnapshot,
} from './cognitive-tick-processor.js';

// Cosmic Order Bridge - Campbell's System hierarchy (sys1-6 composition)
export {
  CosmicOrderBridge,
  createCosmicOrderBridge,
  type CosmicOrderBridgeConfig,
  type CosmicOrderSnapshot,
  type SystemLevelState,
} from './cosmic-order-bridge.js';

// AAR (Agent-Arena-Relation) System - Core identity architecture
export * from './aar/index.js';

// Autonomy Lifecycle - Developmental cycle for true autonomy
export {
  AutonomyLifecycleCoordinator,
  createAutonomyLifecycleCoordinator,
  AutonomyPhase,
  type AutonomyLifecycleConfig,
  type VirtualAgentModel,
  type VirtualArenaModel,
  type DevelopmentalCycleResult,
} from './autonomy-lifecycle.js';

// Tool Execution Engine - Real action execution (autonomy enablement)
export {
  ToolExecutionEngine,
  type ToolExecutionEngineConfig,
  type ToolDefinition,
  type ToolParameter,
  type ToolCall,
  type ToolResult as ToolExecutionResult,
  type ToolType,
  LLMGoalPlanner,
  type LLMGoalPlannerConfig,
  type PlanningContext,
  type PlanningResult,
} from './tools/index.js';

// Perception Handlers - Real proactive environmental scanning (autonomy enablement)
export {
  PerceptionHandlers,
  type PerceptionHandlerConfig,
  type PerceptCallback,
} from './perception/index.js';

// Autonomy Pipeline - End-to-end Level 4 wiring (Perception → Cognition → Planning → Execution → Memory)
export {
  AutonomyPipeline,
  type AutonomyPipelineConfig,
  type AutonomyPipelineEvent,
} from './autonomy-pipeline.js';

// Echobeats - 3-stream concurrent cognitive loop (System 4/5 architecture)
export {
  Echobeats,
  type EchobeatsConfig,
  type CognitiveStream,
  type NestedShell,
  type EchobeatsTick,
  type StreamPhase,
  type StreamTickHandler,
} from './echobeats.js';

// DeltaChat Autonomy Bridge - Live autonomous operation
export {
  DeltaChatAutonomyBridge,
  type BridgeConfig as DeltaChatBridgeConfig,
  type IncomingMessage,
  type BridgeResponse,
  type BridgeStats,
} from './deltachat-autonomy-bridge.js';

// Self-Modification Engine - ENACTION phase self-tuning with safety constraints
export {
  SelfModificationEngine,
  type SelfModificationConfig,
  type ModifiableParameter,
  type ModificationRequest,
  type ModificationResult,
} from './self-modification.js';

// Training Data Generator - NanEcho conversation-to-training pipeline
export {
  ConversationTrainingGenerator,
  type TrainingConfig,
  type TrainingExample,
  type ConversationTurn,
  type ConceptNode,
  type TrainingStats,
} from './training/index.js';

// Level 5: Continuous Training Pipeline - INBOX.memory → NanEcho echoself fine-tuning
export {
  ContinuousTrainingPipeline,
  type ContinuousTrainingConfig,
  type ConsolidationEvent,
  type PipelineMetrics,
  type PipelineEvent,
} from './training/index.js';

// Entelechy Integration - Deep cognitive loop
export {
  EntelechyIntegration,
  type EntelechyIntegrationConfig,
} from './entelechy-integration.js';

// Level 5: Lucy VM Deployment — llama.cpp server lifecycle management
export {
  LucyVMDeployment,
  type LucyVMConfig,
  type DeploymentStatus,
  type DeploymentEvent,
} from './lucy-vm-deployment.js';

// Level 5: Reservoir Feedback Loop — Online RLS learning from conversational feedback
export {
  ReservoirFeedbackLoop,
  type ReservoirFeedbackConfig,
  type FeedbackEvent,
  type FeedbackLoopMetrics,
  type FeedbackLoopEvent,
} from './reservoir-feedback-loop.js';

// ─── Level 6: Symbiotic Autonomy ─────────────────────────────────

// Level 6: Lucy HuggingFace Deployment — Model card, identity metadata, checkpoint upload
export {
  LucyHFDeploy,
  type LucyHFDeployConfig,
  type LucyIdentityMetadata,
  type DeployResult,
} from './lucy-hf-deploy.js';

// Level 6: Production Orchestration Wiring — Live E2E startup of all subsystems
export {
  ProductionOrchestrationWiring,
  type ProductionWiringConfig,
  type WiringStatus,
  type ComponentStatus,
  type WiringPhase,
} from './production-wiring.js';

// Level 6: Echoself Introspection — Hypergraph memory visualization dashboard
export {
  EchoselfIntrospection,
  type IntrospectionConfig,
  type HypergraphNode,
  type HypergraphEdge,
  type HypergraphMetaEdge,
  type HypergraphSnapshot,
  type EvolutionTimelineEntry,
  type IdentityDashboard,
  type IntrospectionDashboardData,
} from './echoself-introspection.js';

// Level 6: System 5 Telemetry Shell — Prometheus metrics for thread-level multiplexing
export {
  System5TelemetryShell,
  type TelemetryShellConfig,
  type DyadicPair,
  type TriadicBundle,
  type MultiplexingState,
  type NestedShellState,
  type TelemetryDataPoint,
} from './system5-telemetry-shell.js';

// ─── Level 7: Proactive Orchestration Repair ─────────────────────────────────

// Proactive Orchestration Wiring — Real feedback loop connections
export {
  ProactiveOrchestrationWiring,
  type ProactiveOrchestrationWiringConfig,
  type SomaticMarker,
  type SelfModificationDirective,
} from './proactive-orchestration-wiring.js';

// Salience Landscape Renegotiation — PIVOTAL_RR from delovecho C layer
export {
  SalienceLandscape,
  type SalienceLandscapeConfig,
  type SalienceEntry,
  type RenegotiationEvent,
  CognitiveTerm,
  CouplingType,
  CognitiveMode,
} from './salience-landscape.js';
