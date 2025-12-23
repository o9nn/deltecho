// Core cognitive modules
import { HyperDimensionalMemory } from './HyperDimensionalMemory.js'
import { AdaptivePersonality } from './AdaptivePersonality.js'
import { QuantumBeliefPropagation } from './QuantumBeliefPropagation.js'
import { EmotionalIntelligence } from './EmotionalIntelligence.js'
import { SecureIntegration } from './SecureIntegration.js'

// Import main component and its types
import { DeepTreeEchoBot, DeepTreeEchoBotOptions } from './DeepTreeEchoBot.js'
import DeepTreeEchoHubSimple from './DeepTreeEchoHubSimple.js'

// Import utility modules
import { LLMService, CognitiveFunctionType } from './LLMService.js'
import { PersonaCore } from './PersonaCore.js'
import { RAGMemoryStore } from './RAGMemoryStore.js'
import { SelfReflection } from './SelfReflection.js'
import BotSettings from './BotSettings.js'
import DeepTreeEchoSettingsScreen from './DeepTreeEchoSettingsScreen.js'
import {
  initDeepTreeEchoBot,
  saveBotSettings,
  getBotInstance,
  cleanupBot,
} from './DeepTreeEchoIntegration.js'
import {
  DeepTreeEchoTestUtil,
  createTestGroup,
  sendTestMessage,
  processMessageWithBot,
  runDemo,
  cleanup as cleanupTestUtil,
} from './DeepTreeEchoTestUtil.js'

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
