import { DeepTreeEchoBot } from '../DeepTreeEchoBot'
import { LLMService } from '../LLMService'
import { BackendRemote } from '../../../backend-com'

// Mock dependencies
jest.mock('@deltachat-desktop/shared/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

jest.mock('../RAGMemoryStore', () => {
  return {
    RAGMemoryStore: {
      getInstance: jest.fn().mockReturnValue({
        addMemory: jest.fn().mockResolvedValue({ id: 'test-memory-id' }),
        getMemoriesByChatId: jest.fn().mockReturnValue([]),
        getLatestChatMemories: jest.fn().mockReturnValue([]),
        searchMemories: jest.fn().mockReturnValue([]),
        deleteChatMemories: jest.fn().mockResolvedValue(undefined),
        getStats: jest
          .fn()
          .mockReturnValue({ totalMemories: 10, chatCount: 2 }),
        setEnabled: jest.fn(),
        storeMemory: jest.fn(),
        getConversationContext: jest.fn().mockReturnValue([]),
        retrieveRecentMemories: jest.fn().mockReturnValue([]),
        clearChatMemories: jest.fn(),
      }),
    },
  }
})

jest.mock('../LLMService', () => {
  return {
    LLMService: {
      getInstance: jest.fn().mockReturnValue({
        setConfig: jest.fn(),
        setFunctionConfig: jest.fn(),
        getActiveFunctions: jest.fn().mockReturnValue([]),
        generateResponse: jest.fn().mockResolvedValue('Test response'),
        generateFullParallelResponse: jest.fn().mockResolvedValue({
          integratedResponse: 'Test parallel response',
          processing: {},
        }),
        getCompletion: jest
          .fn()
          .mockResolvedValue({ content: 'Test response' }),
        generateResponseFromMemories: jest
          .fn()
          .mockResolvedValue({ content: 'Test response from memories' }),
        updateOptions: jest.fn(),
      }),
    },
  }
})

jest.mock('../VisionCapabilities', () => {
  return {
    VisionCapabilities: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(true),
      analyzeImage: jest.fn().mockResolvedValue({
        description: 'Test image description',
        tags: ['test', 'image'],
        objects: [{ label: 'test object', confidence: 0.9 }],
      }),
      updateOptions: jest.fn(),
    })),
  }
})

jest.mock('../PlaywrightAutomation', () => {
  return {
    PlaywrightAutomation: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(true),
      searchWeb: jest.fn().mockResolvedValue({
        success: true,
        data: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            snippet: 'Test snippet',
          },
        ],
      }),
      takeScreenshot: jest.fn().mockResolvedValue({
        success: true,
        data: { url: 'https://example.com', timestamp: '2023-01-01T00:00:00Z' },
        screenshot: 'base64-screenshot-data',
      }),
      updateOptions: jest.fn(),
    })),
  }
})

jest.mock('../ProprioceptiveEmbodiment', () => {
  return {
    ProprioceptiveEmbodiment: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(true),
      startTraining: jest.fn().mockResolvedValue(true),
      stopTraining: jest.fn().mockResolvedValue(true),
      getCurrentMovementData: jest.fn().mockResolvedValue({
        positions: [],
        velocities: {
          linear: { x: 0, y: 0, z: 0 },
          angular: { roll: 0, pitch: 0, yaw: 0 },
        },
        acceleration: {
          linear: { x: 0, y: 0, z: 0 },
          angular: { roll: 0, pitch: 0, yaw: 0 },
        },
        balance: {
          stabilityScore: 0.8,
          centerOfMassOffset: { x: 0, y: 0 },
          balanceConfidence: 0.7,
        },
      }),
      evaluateMovement: jest.fn().mockResolvedValue({
        score: 0.8,
        feedback: 'Test feedback',
      }),
      getTrainingStats: jest.fn().mockReturnValue({
        sessionsCompleted: 5,
        totalDataPoints: 100,
        avgStabilityScore: 0.75,
      }),
      updateOptions: jest.fn(),
    })),
  }
})

jest.mock('../PersonaCore', () => {
  return {
    PersonaCore: {
      getInstance: jest.fn().mockReturnValue({
        getPreferences: jest.fn().mockReturnValue({
          communicationTone: 'balanced',
        }),
        getDominantEmotion: jest.fn().mockReturnValue({
          emotion: 'neutral',
          intensity: 0.5,
        }),
        getSelfPerception: jest.fn().mockReturnValue('I am Deep Tree Echo'),
        evaluateSettingAlignment: jest.fn().mockReturnValue({
          approved: true,
          reasoning: 'Test reasoning',
        }),
        updatePersonality: jest.fn(),
      }),
    },
  }
})

jest.mock('../SelfReflection', () => {
  return {
    SelfReflection: {
      getInstance: jest.fn().mockReturnValue({
        reflectOnAspect: jest.fn().mockResolvedValue('Test reflection'),
      }),
    },
  }
})

jest.mock('../../../backend-com', () => ({
  BackendRemote: {
    rpc: {
      getMessage: jest.fn().mockResolvedValue({
        fromId: 2,
        text: 'Test message',
      }),
      miscSendTextMessage: jest.fn().mockResolvedValue(undefined),
    },
  },
}))

/**
 * DeepTreeEchoBot.processMessage() returns void and delivers its replies
 * through BackendRemote.rpc.miscSendTextMessage, so the tests assert on the
 * messages sent through that (mocked) RPC method.
 */
describe('DeepTreeEchoBot', () => {
  let bot: DeepTreeEchoBot
  const sendTextMock = BackendRemote.rpc
    .miscSendTextMessage as unknown as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    bot = new DeepTreeEchoBot({
      enabled: true,
      apiKey: 'test-api-key',
      apiEndpoint: 'https://test-api-endpoint.com',
      memoryEnabled: true,
      personality: 'Test personality',
      visionEnabled: true,
      webAutomationEnabled: true,
      embodimentEnabled: true,
    })
  })

  describe('processMessage', () => {
    it('should process regular messages and send a response', async () => {
      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      }

      await bot.processMessage(1, 100, 123, message as any)

      // A thinking indicator followed by the generated response
      expect(sendTextMock).toHaveBeenCalledWith(1, 100, '*Thinking...*')
      expect(sendTextMock).toHaveBeenCalledWith(
        1,
        100,
        'Test parallel response'
      )
    })

    it('should not send anything if the bot is disabled', async () => {
      bot.updateOptions({ enabled: false })

      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      }

      await bot.processMessage(1, 100, 123, message as any)

      expect(sendTextMock).not.toHaveBeenCalled()
    })

    it('should handle command messages', async () => {
      const message = {
        id: 123,
        text: '/help',
        file: null,
      }

      await bot.processMessage(1, 100, 123, message as any)

      expect(sendTextMock).toHaveBeenCalledWith(
        1,
        100,
        expect.stringContaining('commands')
      )
    })

    it('should handle errors gracefully', async () => {
      // Force an error in response generation
      const llmMock = LLMService.getInstance() as unknown as {
        generateFullParallelResponse: jest.Mock
      }
      llmMock.generateFullParallelResponse.mockRejectedValueOnce(
        new Error('LLM failure')
      )

      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      }

      await bot.processMessage(1, 100, 123, message as any)

      expect(sendTextMock).toHaveBeenCalledWith(
        1,
        100,
        expect.stringContaining("I'm sorry")
      )
    })
  })

  describe('Command Handlers', () => {
    it('should handle the /help command', async () => {
      const message = {
        id: 123,
        text: '/help',
        file: null,
      }

      await bot.processMessage(1, 100, 123, message as any)

      expect(sendTextMock).toHaveBeenCalledWith(
        1,
        100,
        expect.stringContaining('Available commands')
      )
    })

    it('should handle the /vision command', async () => {
      const message = {
        id: 123,
        text: '/vision',
        file: 'test-file-path.jpg',
      }

      await bot.processMessage(1, 100, 123, message as any)

      expect(sendTextMock).toHaveBeenCalledWith(
        1,
        100,
        expect.stringContaining('Vision analysis')
      )
    })

    it('should handle the /search command', async () => {
      const message = {
        id: 123,
        text: '/search test query',
        file: null,
      }

      await bot.processMessage(1, 100, 123, message as any)

      expect(sendTextMock).toHaveBeenCalledWith(
        1,
        100,
        expect.stringContaining('Searching for: "test query"')
      )
    })

    it('should handle the /memory command', async () => {
      const message = {
        id: 123,
        text: '/memory status',
        file: null,
      }

      await bot.processMessage(1, 100, 123, message as any)

      expect(sendTextMock).toHaveBeenCalledWith(
        1,
        100,
        expect.stringContaining('Memory Status')
      )
    })

    it('should report unknown commands', async () => {
      const message = {
        id: 123,
        text: '/unknowncommand',
        file: null,
      }

      await bot.processMessage(1, 100, 123, message as any)

      expect(sendTextMock).toHaveBeenCalledWith(
        1,
        100,
        expect.stringContaining('Unknown command')
      )
    })
  })

  describe('updateOptions', () => {
    it('should update options', async () => {
      bot.updateOptions({
        enabled: false,
        apiKey: 'new-api-key',
        visionEnabled: false,
      })

      // We can't directly check the private options, but we can test functionality
      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      }

      await bot.processMessage(1, 100, 123, message as any)

      expect(sendTextMock).not.toHaveBeenCalled()
    })
  })
})
