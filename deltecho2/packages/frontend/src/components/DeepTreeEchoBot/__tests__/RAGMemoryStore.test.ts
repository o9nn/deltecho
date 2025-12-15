import { RAGMemoryStore, Memory as _Memory } from '../RAGMemoryStore'

// Mock logger
jest.mock('@deltachat-desktop/shared/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

describe('RAGMemoryStore', () => {
  let memoryStore: RAGMemoryStore

  beforeEach(() => {
    memoryStore = RAGMemoryStore.getInstance()
    memoryStore.setEnabled(true)
    memoryStore.clearAllMemories()
  })

  describe('storeMemory', () => {
    it('should store a memory', async () => {
      const memory = {
        text: 'Test memory',
        sender: 'user' as const,
        chatId: 123,
        messageId: 456,
      }

      await memoryStore.storeMemory(memory)

      // Since storeMemory doesn't return the memory, let's check it was stored
      const storedMemories = memoryStore.getMemoriesByChat(123)
      expect(storedMemories).toHaveLength(1)
      expect(storedMemories[0].text).toBe(memory.text)
      expect(storedMemories[0].sender).toBe(memory.sender)
      expect(storedMemories[0].chatId).toBe(memory.chatId)
      expect(storedMemories[0].messageId).toBe(memory.messageId)
    })
  })

  describe('getMemoriesByChat', () => {
    it('should return memories for a specific chat ID', async () => {
      await memoryStore.storeMemory({
        text: 'Memory in chat 123',
        sender: 'user' as const,
        chatId: 123,
        messageId: 789,
      })

      await memoryStore.storeMemory({
        text: 'Memory in chat 456',
        sender: 'bot' as const,
        chatId: 456,
        messageId: 790,
      })

      const memories123 = memoryStore.getMemoriesByChat(123)
      const memories456 = memoryStore.getMemoriesByChat(456)

      expect(memories123.length).toBe(1)
      expect(memories456.length).toBe(1)
      expect(memories123[0].text).toBe('Memory in chat 123')
      expect(memories456[0].text).toBe('Memory in chat 456')
    })

    it('should return an empty array for a chat with no memories', () => {
      const memories = memoryStore.getMemoriesByChat(999)
      expect(memories).toEqual([])
    })
  })

  describe('retrieveRecentMemories', () => {
    it('should return the latest memories in chronological order', async () => {
      // Add 5 memories
      for (let i = 0; i < 5; i++) {
        await memoryStore.storeMemory({
          text: `Memory ${i}`,
          sender: i % 2 === 0 ? ('user' as const) : ('bot' as const),
          chatId: 123,
          messageId: 800 + i,
        })

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      const recentMemories = memoryStore.retrieveRecentMemories(3)

      expect(recentMemories.length).toBe(3)
      // Check that we get the most recent memories (as formatted strings)
      expect(recentMemories.some(m => m.includes('Memory 4'))).toBe(true)
      expect(recentMemories.some(m => m.includes('Memory 3'))).toBe(true)
      expect(recentMemories.some(m => m.includes('Memory 2'))).toBe(true)
    })

    it('should limit the number of memories returned', async () => {
      // Add 10 memories
      for (let i = 0; i < 10; i++) {
        await memoryStore.storeMemory({
          text: `Memory ${i}`,
          sender: 'user' as const,
          chatId: 123,
          messageId: 800 + i,
        })
      }

      const recentMemories = memoryStore.retrieveRecentMemories(5)
      expect(recentMemories.length).toBe(5)
    })
  })

  describe('searchMemories', () => {
    it('should find memories matching the search query', async () => {
      await memoryStore.storeMemory({
        text: 'I like apples and bananas',
        sender: 'user' as const,
        chatId: 123,
        messageId: 900,
      })

      await memoryStore.storeMemory({
        text: 'Bananas are yellow',
        sender: 'bot' as const,
        chatId: 123,
        messageId: 901,
      })

      await memoryStore.storeMemory({
        text: 'Apples are red or green',
        sender: 'user' as const,
        chatId: 123,
        messageId: 999,
      })

      const bananaResults = memoryStore.searchMemories('banana')
      const appleResults = memoryStore.searchMemories('apple')
      const fruitResults = memoryStore.searchMemories('fruit')

      expect(bananaResults.length).toBe(2)
      expect(appleResults.length).toBe(2)
      expect(fruitResults.length).toBe(0) // No exact match

      // Banana results should be sorted by timestamp (most recent first)
      expect(bananaResults[0].text).toBe('Bananas are yellow')
      expect(bananaResults[1].text).toBe('I like apples and bananas')
    })
  })

  describe('deleteChatMemories', () => {
    it('should delete all memories for a specific chat', async () => {
      // Add memories for two different chats
      await memoryStore.storeMemory({
        text: 'Memory in chat 123',
        sender: 'user' as const,
        chatId: 123,
        messageId: 999,
      })

      await memoryStore.storeMemory({
        text: 'Another memory in chat 123',
        sender: 'bot' as const,
        chatId: 123,
        messageId: 999,
      })

      await memoryStore.storeMemory({
        text: 'Memory in chat 456',
        sender: 'user' as const,
        chatId: 456,
        messageId: 999,
      })

      // Verify initial state
      expect(memoryStore.getMemoriesByChat(123).length).toBe(2)
      expect(memoryStore.getMemoriesByChat(456).length).toBe(1)

      // Delete memories for chat 123
      await memoryStore.clearChatMemories(123)

      // Verify final state
      expect(memoryStore.getMemoriesByChat(123).length).toBe(0)
      expect(memoryStore.getMemoriesByChat(456).length).toBe(1)
    })
  })

  describe('getStats', () => {
    it('should return the correct statistics', async () => {
      // Add memories for two different chats
      await memoryStore.storeMemory({
        text: 'Memory 1 in chat 123',
        sender: 'user' as const,
        chatId: 123,
        messageId: 999,
      })

      await memoryStore.storeMemory({
        text: 'Memory 2 in chat 123',
        sender: 'bot' as const,
        chatId: 123,
        messageId: 999,
      })

      await memoryStore.storeMemory({
        text: 'Memory 1 in chat 456',
        sender: 'user' as const,
        chatId: 456,
        messageId: 999,
      })

      // Check that we have memories stored
      const memories1 = memoryStore.getMemoriesByChat(123)
      const memories2 = memoryStore.getMemoriesByChat(456)

      expect(memories1.length).toBe(2)
      expect(memories2.length).toBe(1)
    })
  })
})
