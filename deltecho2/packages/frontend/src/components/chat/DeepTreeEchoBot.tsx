import React, { useEffect, useCallback } from 'react'
import { BackendRemote, onDCEvent } from '../../backend-com'
import { C } from '@deltachat/jsonrpc-client'
import { selectedAccountId } from '../../ScreenController'
import { useSettingsStore } from '../../stores/settings'
import { getLogger } from '../../../../shared/logger'
import useMessage from '../../hooks/chat/useMessage'
import { LLMService } from '../../utils/LLMService'
import { VisionCapabilities } from './VisionCapabilities'
import { PlaywrightAutomation } from './PlaywrightAutomation'

const log = getLogger('render/DeepTreeEchoBot')

// RAG memory store for conversation history
interface MemoryEntry {
  chatId: number
  messageId: number
  text: string
  timestamp: number
  sender: string
  isOutgoing: boolean
  userMessage?: string
  botResponse?: string
  content?: string
}

export class RAGMemoryStore {
  private static instance: RAGMemoryStore
  private memory: MemoryEntry[] = []
  private storageKey = 'deep-tree-echo-memory'

  private constructor() {
    this.loadFromStorage()
  }

  public static getInstance(): RAGMemoryStore {
    if (!RAGMemoryStore.instance) {
      RAGMemoryStore.instance = new RAGMemoryStore()
    }
    return RAGMemoryStore.instance
  }

  public addEntry(entry: MemoryEntry): void {
    this.memory.push(entry)
    this.saveToStorage()
  }

  public getMemoryForChat(chatId: number): MemoryEntry[] {
    return this.memory.filter(entry => entry.chatId === chatId)
  }

  public getAllMemory(): MemoryEntry[] {
    return [...this.memory]
  }

  public searchMemory(query: string): MemoryEntry[] {
    const lowerQuery = query.toLowerCase()
    return this.memory.filter(entry =>
      entry.text.toLowerCase().includes(lowerQuery)
    )
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memory))
    } catch (error) {
      log.error('Failed to save memory to storage:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        this.memory = JSON.parse(stored)
      }
    } catch (error) {
      log.error('Failed to load memory from storage:', error)
    }
  }

  public clearMemory(): void {
    this.memory = []
    this.saveToStorage()
  }

  public retrieveRelevantMemories(
    inputText: string,
    chatId: number,
    limit: number = 5
  ): MemoryEntry[] {
    // Get memories for the specific chat
    const chatMemories = this.getMemoryForChat(chatId)

    // Simple keyword-based search as a placeholder
    const lowerInput = inputText.toLowerCase()
    const relevantMemories = chatMemories.filter(entry =>
      entry.text.toLowerCase().includes(lowerInput)
    )

    // Return most recent relevant memories
    return relevantMemories
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  public storeMemory(
    chatId: number,
    userMessage: string,
    botResponse: string
  ): void {
    // Store user message
    this.addEntry({
      chatId,
      messageId: Date.now(),
      text: userMessage,
      timestamp: Date.now(),
      sender: 'user',
      isOutgoing: false,
      userMessage,
      content: userMessage,
    })

    // Store bot response
    this.addEntry({
      chatId,
      messageId: Date.now() + 1,
      text: botResponse,
      timestamp: Date.now() + 1,
      sender: 'bot',
      isOutgoing: true,
      botResponse,
      content: botResponse,
    })
  }
}

interface DeepTreeEchoBotProps {
  enabled: boolean
}

/**
 * Deep Tree Echo bot component that handles automatic responses to messages
 * and integrates with RAG memory for learning from conversations
 */
const DeepTreeEchoBot: React.FC<DeepTreeEchoBotProps> = ({ enabled }) => {
  const accountId = selectedAccountId()
  const { sendMessage } = useMessage()
  const settingsStore = useSettingsStore()[0]
  const memory = RAGMemoryStore.getInstance()
  const llmService = LLMService.getInstance()
  const visionCapabilities = VisionCapabilities.getInstance()
  const playwrightAutomation = PlaywrightAutomation.getInstance()

  /**
   * Process vision commands to analyze images
   */
  const handleVisionCommand = useCallback(
    async (imagePath: string, _messageText: string): Promise<string> => {
      try {
        const description =
          await visionCapabilities.generateImageDescription(imagePath)
        return description
      } catch (error) {
        log.error('Error handling vision command:', error)
        return "I'm sorry, I couldn't analyze this image. Vision capabilities might not be available in this environment."
      }
    },
    [visionCapabilities]
  )

  /**
   * Process web search commands
   */
  const handleSearchCommand = useCallback(
    async (query: string): Promise<string> => {
      try {
        // Use Playwright to search the web
        return await playwrightAutomation.searchWeb(query)
      } catch (error) {
        log.error('Error handling search command:', error)
        return "I couldn't perform that web search. Playwright automation might not be available in this environment."
      }
    },
    [playwrightAutomation]
  )

  /**
   * Process screenshot commands
   */
  const handleScreenshotCommand = useCallback(
    async (url: string, chatId: number): Promise<string> => {
      try {
        // Capture the webpage
        const screenshotPath = await playwrightAutomation.captureWebpage(url)

        // Send the screenshot as a file
        await sendMessage(accountId, chatId, {
          text: `Screenshot of ${url}`,
          file: screenshotPath,
        })

        return `I've captured a screenshot of ${url}.`
      } catch (error) {
        log.error('Error handling screenshot command:', error)
        return "I couldn't capture a screenshot of that webpage. Playwright automation might not be available."
      }
    },
    [playwrightAutomation, sendMessage, accountId]
  )

  const generateBotResponse = useCallback(
    async (inputText: string, chatId: number): Promise<string> => {
      try {
        // Get relevant memories
        const relevantMemories = memory.retrieveRelevantMemories(
          inputText,
          chatId,
          5
        )

        // Create context from memories
        const context = relevantMemories.length
          ? `Previous conversation context:\n${relevantMemories
              .map(m => `- ${m.content}`)
              .join('\n')}\n\n`
          : ''

        // Generate response using LLM
        const systemPrompt = `You are a helpful AI assistant with the personality: ${
          settingsStore?.desktopSettings?.deepTreeEchoBotPersonality ||
          'friendly and knowledgeable'
        }. Be concise and helpful.`

        const response = await llmService.generateResponseWithContext(
          inputText,
          context,
          systemPrompt
        )

        // Store the interaction in memory
        memory.storeMemory(chatId, inputText, response)

        return response
      } catch (error) {
        log.error('Error generating bot response:', error)
        return "I'm sorry, I couldn't process your message at the moment."
      }
    },
    [
      llmService,
      memory,
      settingsStore?.desktopSettings?.deepTreeEchoBotPersonality,
    ]
  )

  const runLearningExercise = useCallback(async () => {
    try {
      log.info('Running learning exercise...')
      const allMemory = memory.getAllMemory()

      // Skip if no memory entries
      if (allMemory.length === 0) {
        log.info('No memory entries found for learning exercise')
        return
      }

      // Convert memories to conversation data
      const conversationData = allMemory
        .filter(m => m.userMessage && m.botResponse)
        .map(m => `User: ${m.userMessage}\nBot: ${m.botResponse}`)
        .join('\n\n')

      // Simple system prompt for analysis
      const systemPrompt =
        'You are an AI assistant analyzing conversation patterns.'

      // Request analysis from LLM
      const analysisPrompt = `Please analyze the following conversations and provide insights on how to improve responses:\n\n${conversationData}`

      const analysis = await llmService.generateResponseWithContext(
        analysisPrompt,
        '',
        systemPrompt
      )

      // Log the analysis (in a real implementation, this would be used to update the model)
      log.info('Learning analysis completed:', analysis)

      log.info(
        `Learning exercise completed. Processed ${allMemory.length} memories.`
      )
    } catch (error) {
      log.error('Error during learning exercise:', error)
    }
  }, [memory, llmService])

  // Configure LLM service when settings change
  useEffect(() => {
    if (!settingsStore?.desktopSettings) return

    llmService.setConfig({
      apiKey: settingsStore.desktopSettings.deepTreeEchoBotApiKey || '',
      apiEndpoint:
        settingsStore.desktopSettings.deepTreeEchoBotApiEndpoint ||
        'https://api.openai.com/v1/chat/completions',
    })
  }, [
    settingsStore?.desktopSettings?.deepTreeEchoBotApiKey,
    settingsStore?.desktopSettings?.deepTreeEchoBotApiEndpoint,
    llmService,
    settingsStore?.desktopSettings,
  ])

  // Listen for incoming messages
  useEffect(() => {
    if (!enabled || !settingsStore?.desktopSettings?.deepTreeEchoBotEnabled)
      return

    return onDCEvent(accountId, 'IncomingMsg', async event => {
      try {
        const { chatId, msgId } = event

        // Get message details
        const message = await BackendRemote.rpc.getMessage(accountId, msgId)

        // Skip messages sent by bot itself
        if (message.isInfo || message.fromId === C.DC_CONTACT_ID_SELF) return

        // Store message in RAG memory
        memory.addEntry({
          chatId,
          messageId: msgId,
          text: message.text,
          timestamp: message.timestamp,
          sender: message.sender.displayName,
          isOutgoing: false,
        })

        // Get chat info
        const chatInfo = await BackendRemote.rpc.getBasicChatInfo(
          accountId,
          chatId
        )

        // Skip if chat is a contact request
        if (chatInfo.isContactRequest) return

        // Process special commands
        let response: string | null = null

        // Check if it's a vision command
        if (
          message.text.startsWith('/vision') &&
          message.file &&
          message.file.includes('image')
        ) {
          response = await handleVisionCommand(message.file, message.text)
        }
        // Check if it's a web search command
        else if (message.text.startsWith('/search')) {
          const query = message.text.substring('/search'.length).trim()
          response = await handleSearchCommand(query)
        }
        // Check if it's a screenshot command
        else if (message.text.startsWith('/screenshot')) {
          const url = message.text.substring('/screenshot'.length).trim()
          response = await handleScreenshotCommand(url, chatId)
        }
        // Generate normal response for regular messages
        else {
          response = await generateBotResponse(message.text, chatId)
        }

        // Send the response
        if (response) {
          await sendMessage(accountId, chatId, {
            text: response,
          })

          // Store the bot's response in memory too
          memory.addEntry({
            chatId,
            messageId: Math.floor(Math.random() * 100000), // Generate a random ID since we don't need exact message ID
            text: response,
            timestamp: Math.floor(Date.now() / 1000),
            sender: 'Deep Tree Echo',
            isOutgoing: true,
          })
        }
      } catch (error) {
        log.error('Error handling incoming message:', error)
      }
    })
  }, [
    accountId,
    enabled,
    sendMessage,
    memory,
    settingsStore?.desktopSettings?.deepTreeEchoBotEnabled,
    generateBotResponse,
    handleScreenshotCommand,
    handleSearchCommand,
    handleVisionCommand,
  ])

  // Periodically run learning exercises to improve the bot
  useEffect(() => {
    if (
      !enabled ||
      !settingsStore?.desktopSettings?.deepTreeEchoBotEnabled ||
      !settingsStore?.desktopSettings?.deepTreeEchoBotMemoryEnabled
    )
      return

    const intervalId = setInterval(
      () => {
        runLearningExercise()
      },
      24 * 60 * 60 * 1000
    ) // Once a day

    return () => clearInterval(intervalId)
  }, [
    enabled,
    settingsStore?.desktopSettings?.deepTreeEchoBotEnabled,
    settingsStore?.desktopSettings?.deepTreeEchoBotMemoryEnabled,
    runLearningExercise,
  ])

  return null // This is a background component with no UI
}

export default DeepTreeEchoBot
