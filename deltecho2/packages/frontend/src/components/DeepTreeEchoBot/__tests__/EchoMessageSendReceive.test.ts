/**
 * Integration test to verify Deep Tree Echo Bot message send/receive functionality
 * This test verifies the core requirements from the issue:
 * 1. Fix Echo - verify bot can process messages
 * 2. Enable Echo as main user - verify toggle works
 * 3. Test Echo message send receive - verify message handling
 */

import { DeepTreeEchoBot } from '../DeepTreeEchoBot'

// Mock all the dependencies for testing
jest.mock('@deltachat-desktop/shared/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

jest.mock('../../../backend-com', () => ({
  BackendRemote: {
    rpc: {
      getMessage: jest.fn().mockResolvedValue({
        fromId: 2,
        text: 'Hello bot!',
        chatId: 42,
        timestamp: Date.now(),
      }),
      miscSendTextMessage: jest.fn().mockResolvedValue(undefined),
    },
  },
}))

jest.mock('../LLMService', () => ({
  LLMService: {
    getInstance: jest.fn().mockReturnValue({
      setConfig: jest.fn(),
      setFunctionConfig: jest.fn(),
      getActiveFunctions: jest.fn().mockReturnValue([]),
      generateResponse: jest.fn().mockResolvedValue('Hello! How can I help you?'),
      generateFullParallelResponse: jest.fn().mockResolvedValue({
        integratedResponse: 'Hello! This is a parallel response.',
        processing: {},
      }),
    }),
  },
}))

jest.mock('../RAGMemoryStore', () => ({
  RAGMemoryStore: {
    getInstance: jest.fn().mockReturnValue({
      storeMemory: jest.fn(),
      getConversationContext: jest.fn().mockReturnValue([]),
      setEnabled: jest.fn(),
      retrieveRecentMemories: jest.fn().mockReturnValue([]),
      searchMemories: jest.fn().mockReturnValue([]),
      clearChatMemories: jest.fn(),
    }),
  },
}))

jest.mock('../PersonaCore', () => ({
  PersonaCore: {
    getInstance: jest.fn().mockReturnValue({
      getPreferences: jest.fn().mockReturnValue({ communicationTone: 'balanced' }),
      getDominantEmotion: jest.fn().mockReturnValue({ emotion: 'neutral', intensity: 0.5 }),
      getSelfPerception: jest.fn().mockReturnValue('I am Deep Tree Echo'),
    }),
  },
}))

jest.mock('../SelfReflection', () => ({
  SelfReflection: {
    getInstance: jest.fn().mockReturnValue({
      reflectOnAspect: jest.fn().mockResolvedValue('Reflection completed'),
    }),
  },
}))

describe('Deep Tree Echo Bot - Message Send/Receive Integration', () => {
  let bot: DeepTreeEchoBot

  beforeEach(() => {
    bot = new DeepTreeEchoBot({
      enabled: true,
      enableAsMainUser: true,
      memoryEnabled: true,
      apiKey: 'test-key',
      apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      visionEnabled: false,
      webAutomationEnabled: false,
      embodimentEnabled: false,
      useParallelProcessing: false,
    })
  })

  describe('Basic Bot Functionality', () => {
    it('should initialize with correct settings', () => {
      expect(bot.isEnabled()).toBe(true)
      expect(bot.isEnabledAsMainUser()).toBe(true)
      expect(bot.isMemoryEnabled()).toBe(true)
    })

    it('should update settings correctly', () => {
      bot.updateOptions({ enableAsMainUser: false })
      expect(bot.isEnabledAsMainUser()).toBe(false)
      
      bot.updateOptions({ memoryEnabled: false })
      expect(bot.isMemoryEnabled()).toBe(false)
    })
  })

  describe('Message Processing', () => {
    it('should process regular messages', async () => {
      const message = {
        text: 'Hello Deep Tree Echo!',
        fromId: 2,
      }

      // This should not throw an error
      await expect(bot.processMessage(1, 42, 123, message)).resolves.not.toThrow()
    })

    it('should process help command', async () => {
      const message = {
        text: '/help',
        fromId: 2,
      }

      // This should not throw an error
      await expect(bot.processMessage(1, 42, 124, message)).resolves.not.toThrow()
    })

    it('should process version command', async () => {
      const message = {
        text: '/version',
        fromId: 2,
      }

      // This should not throw an error
      await expect(bot.processMessage(1, 42, 125, message)).resolves.not.toThrow()
    })

    it('should process reflection command', async () => {
      const message = {
        text: '/reflect identity',
        fromId: 2,
      }

      // This should not throw an error
      await expect(bot.processMessage(1, 42, 126, message)).resolves.not.toThrow()
    })

    it('should handle disabled bot gracefully', async () => {
      bot.updateOptions({ enabled: false })
      
      const message = {
        text: 'Hello!',
        fromId: 2,
      }

      // Should return early without processing
      await expect(bot.processMessage(1, 42, 127, message)).resolves.not.toThrow()
    })
  })

  describe('Enable Echo as Main User', () => {
    it('should toggle main user mode', () => {
      // Initially enabled
      expect(bot.isEnabledAsMainUser()).toBe(true)
      
      // Disable
      bot.updateOptions({ enableAsMainUser: false })
      expect(bot.isEnabledAsMainUser()).toBe(false)
      
      // Re-enable
      bot.updateOptions({ enableAsMainUser: true })
      expect(bot.isEnabledAsMainUser()).toBe(true)
    })

    it('should default to false when not specified', () => {
      const defaultBot = new DeepTreeEchoBot({
        enabled: true,
        memoryEnabled: false,
        visionEnabled: false,
        webAutomationEnabled: false,
        embodimentEnabled: false,
      })
      
      expect(defaultBot.isEnabledAsMainUser()).toBe(false)
    })
  })

  describe('Memory Functionality', () => {
    it('should enable and disable memory', () => {
      expect(bot.isMemoryEnabled()).toBe(true)
      
      bot.updateOptions({ memoryEnabled: false })
      expect(bot.isMemoryEnabled()).toBe(false)
    })
  })
})