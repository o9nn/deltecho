// Core cognitive modules
import { HyperDimensionalMemory } from './HyperDimensionalMemory'
import { AdaptivePersonality } from './AdaptivePersonality'
import { QuantumBeliefPropagation } from './QuantumBeliefPropagation'
import { EmotionalIntelligence } from './EmotionalIntelligence'
import { SecureIntegration } from './SecureIntegration'

// Import main component and its types
import { DeepTreeEchoBot, DeepTreeEchoBotOptions } from './DeepTreeEchoBot'
import DeepTreeEchoHubSimple from './DeepTreeEchoHubSimple'

// Import utility modules
import { LLMService, CognitiveFunctionType } from './LLMService'
import { PersonaCore } from './PersonaCore'
import { RAGMemoryStore } from './RAGMemoryStore'
import { SelfReflection } from './SelfReflection'

// Import unified cognitive bridge (@deltecho/cognitive integration)
import {
  initCognitiveOrchestrator,
  getOrchestrator,
  cleanupOrchestrator,
  processMessageUnified,
  getCognitiveState,
  configureLLM,
  onCognitiveEvent,
  clearHistory,
} from './CognitiveBridge'
import type {
  DeepTreeEchoBotConfig as UnifiedBotConfig,
  UnifiedMessage,
  UnifiedCognitiveState,
  CognitiveEvent,
} from './CognitiveBridge'
import BotSettings from './BotSettings'
import DeepTreeEchoSettingsScreen from './DeepTreeEchoSettingsScreen'
import {
  initDeepTreeEchoBot,
  saveBotSettings,
  getBotInstance,
  cleanupBot,
} from './DeepTreeEchoIntegration'
import {
  DeepTreeEchoTestUtil,
  createTestGroup,
  sendTestMessage,
  processMessageWithBot,
  runDemo,
  cleanup as cleanupTestUtil,
} from './DeepTreeEchoTestUtil'

export {
  DeepTreeEchoBot,
  DeepTreeEchoHubSimple,
  BotSettings,
  DeepTreeEchoSettingsScreen,
  LLMService,
  PersonaCore,
  RAGMemoryStore,
  SelfReflection,
  CognitiveFunctionType,
  // Export integration functions
  initDeepTreeEchoBot,
  saveBotSettings,
  getBotInstance,
  cleanupBot,
  // Export test utilities
  DeepTreeEchoTestUtil,
  createTestGroup,
  sendTestMessage,
  processMessageWithBot,
  runDemo,
  cleanupTestUtil,
}

export type { DeepTreeEchoBotOptions }

// Export the main component as default
export default DeepTreeEchoBot

// Export the cognitive modules for advanced usage
export {
  HyperDimensionalMemory,
  AdaptivePersonality,
  QuantumBeliefPropagation,
  EmotionalIntelligence,
  SecureIntegration,
}

// Export unified cognitive framework integration
export {
  initCognitiveOrchestrator,
  getOrchestrator,
  cleanupOrchestrator,
  processMessageUnified,
  getCognitiveState,
  configureLLM,
  onCognitiveEvent,
  clearHistory,
}

export type {
  UnifiedBotConfig,
  UnifiedMessage,
  UnifiedCognitiveState,
  CognitiveEvent,
}

// Chat management
export {
  DeepTreeEchoChatManager,
  chatManager,
  getChatManager,
} from './DeepTreeEchoChatManager'
export type {
  ChatSummary,
  ActiveChatState,
  ScheduledMessage as ChatScheduledMessage,
  ChatWatchCallback,
  ContactSummary,
  MessageSummary,
} from './DeepTreeEchoChatManager'

// UI bridge
export {
  DeepTreeEchoUIBridge,
  uiBridge,
  getUIBridge,
} from './DeepTreeEchoUIBridge'
export type {
  UIView,
  DialogType as UIDialogType,
  UIState,
  ChatContextInterface,
  DialogContextInterface,
  UIBridgeEvent,
  UIBridgeEventListener,
} from './DeepTreeEchoUIBridge'

// Agentic modules
export { AgenticLLMService, getAgenticLLMService } from './AgenticLLMService'
export type { AgenticResponse, LLMProviderConfig } from './AgenticLLMService'

export { AgentToolExecutor, getAgentToolExecutor } from './AgentToolExecutor'
export type { AgentTool, ToolResult, ToolCall } from './AgentToolExecutor'

export {
  getDefaultLLMEndpoint,
  getDefaultLLMModel,
  PUBLIC_OPENAI_ENDPOINT,
} from './llmEndpoint'

// Inferno kernel (AGI reasoning: AtomSpace, PLN, attention allocation)
export {
  InfernoKernelService,
  getInfernoKernelService,
} from './InfernoKernelService'
export type {
  InfernoKernelState,
  InfernoKernelStatus,
  AttentionStats,
} from './InfernoKernelService'

// Proactive messaging
export {
  ProactiveMessaging,
  proactiveMessaging,
  getProactiveMessaging,
} from './ProactiveMessaging'
export type {
  TriggerType,
  EventType,
  ProactiveTrigger,
  QueuedMessage as ProactiveQueuedMessage,
  ProactiveConfig,
} from './ProactiveMessaging'

// Conversation impulse routing (dream-to-action pipeline)
export {
  ConversationImpulseRouter,
  conversationImpulseRouter,
} from './ConversationImpulseRouter'
export type {
  ConversationImpulse,
  ImpulseOrigin,
  SocialNormsConfig,
} from './ConversationImpulseRouter'

// Relationship trust gate (social boundaries)
export {
  RelationshipTrustGate,
  relationshipTrustGate,
  TrustTier,
} from './RelationshipTrustGate'
export type {
  RelationshipState,
  ResponseDisposition,
  InteractionSignal,
  TrustConfig,
} from './RelationshipTrustGate'

// Proactive integration (impulse-to-trigger bridge)
export {
  ProactiveIntegration,
  proactiveIntegration,
  initializeProactiveIntegration,
  shutdownProactiveIntegration,
} from './ProactiveIntegration'
export type {
  ProactiveIntegrationConfig,
  UnifiedImpulse,
} from './ProactiveIntegration'

// Proactive action kernel (agentic heartbeat)
export {
  ProactiveActionKernel,
  proactiveActionKernel,
} from './ProactiveActionKernel'

// Ecological resonance (ESN metabolic rhythms)
export { EcologicalResonance, ecologicalResonance } from './EcologicalResonance'
export type { TemporalRhythm, MetabolicResonance } from './EcologicalResonance'

// Internal journal manager (cognitive stream auditor)
export {
  InternalJournalManager,
  internalJournalManager,
} from './InternalJournalManager'
export type {
  JournalType,
  JournalEntry,
  InternalJournal,
} from './InternalJournalManager'

// Proactive messaging UI components
export { default as ProactiveMessagingSettings } from './ProactiveMessagingSettings'
export { default as TriggerManager } from './TriggerManager'
export { default as ProactiveStatusIndicator } from './ProactiveStatusIndicator'
