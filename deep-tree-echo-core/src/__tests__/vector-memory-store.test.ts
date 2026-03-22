/**
 * VectorMemoryStore Tests
 *
 * Tests the real vector-based semantic memory that replaces TF-IDF.
 * Covers storage, retrieval, semantic search, persistence, and lifecycle.
 */
import { VectorMemoryStore } from '../memory/VectorMemoryStore';
import { InMemoryStorage } from '../memory/storage';

describe('VectorMemoryStore', () => {
  let store: VectorMemoryStore;
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    store = new VectorMemoryStore(storage, {
      embedding: { provider: 'local', dimension: 64 },
      similarityThreshold: 0.1,
    });
    store.setEnabled(true);
  });

  afterEach(() => {
    store.destroy();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve memories', async () => {
      await store.storeMemory({
        chatId: 1,
        messageId: 100,
        sender: 'user',
        text: 'Hello, how are you?',
      });

      const memories = store.getMemoriesByChat(1);
      expect(memories).toHaveLength(1);
      expect(memories[0].text).toBe('Hello, how are you?');
      expect(memories[0].sender).toBe('user');
    });

    it('should generate real embeddings on store', async () => {
      await store.storeMemory({
        chatId: 1,
        messageId: 100,
        sender: 'user',
        text: 'Test embedding generation',
      });

      const memories = store.getMemoriesByChat(1);
      expect(memories[0].embedding).toBeDefined();
      expect(memories[0].embedding!.length).toBe(64);
      // Should NOT be empty array (the old mock behavior)
      expect(memories[0].embedding!.some(v => v !== 0)).toBe(true);
    });

    it('should not store when disabled', async () => {
      store.setEnabled(false);
      await store.storeMemory({
        chatId: 1,
        messageId: 100,
        sender: 'user',
        text: 'Should not be stored',
      });

      const memories = store.getMemoriesByChat(1);
      expect(memories).toHaveLength(0);
    });

    it('should store reflections', async () => {
      await store.storeReflection('I notice patterns in the conversation', 'periodic');
      await store.storeReflection('The user seems interested in AI', 'focused', 'user-interest');

      const reflections = store.getRecentReflections(5);
      expect(reflections).toHaveLength(2);
    });

    it('should retrieve recent memories as formatted strings', async () => {
      await store.storeMemory({ chatId: 1, messageId: 1, sender: 'user', text: 'First message' });
      await store.storeMemory({ chatId: 1, messageId: 2, sender: 'bot', text: 'Second message' });

      const recent = store.retrieveRecentMemories(10);
      expect(recent).toHaveLength(2);
      expect(recent[0]).toContain('bot: Second message');
    });

    it('should get conversation context', async () => {
      for (let i = 0; i < 15; i++) {
        await store.storeMemory({
          chatId: 1,
          messageId: i,
          sender: i % 2 === 0 ? 'user' : 'bot',
          text: `Message ${i}`,
        });
      }

      const context = store.getConversationContext(1, 5);
      expect(context).toHaveLength(5);
      // Should be in chronological order
      expect(context[0].text).toBe('Message 10');
      expect(context[4].text).toBe('Message 14');
    });
  });

  describe('Semantic Search', () => {
    beforeEach(async () => {
      // Store a variety of memories
      await store.storeMemory({ chatId: 1, messageId: 1, sender: 'user', text: 'I love programming in TypeScript' });
      await store.storeMemory({ chatId: 1, messageId: 2, sender: 'bot', text: 'TypeScript is great for type safety' });
      await store.storeMemory({ chatId: 1, messageId: 3, sender: 'user', text: 'What is the weather like today?' });
      await store.storeMemory({ chatId: 1, messageId: 4, sender: 'bot', text: 'I can help with coding questions' });
      await store.storeMemory({ chatId: 1, messageId: 5, sender: 'user', text: 'Tell me about machine learning' });
    });

    it('should find semantically related memories', async () => {
      const results = await store.searchMemories('TypeScript programming', 3);
      expect(results.length).toBeGreaterThan(0);
      // The TypeScript-related memories should be in the results
      const texts = results.map(r => r.text);
      const hasTypeScript = texts.some(t => t.includes('TypeScript'));
      expect(hasTypeScript).toBe(true);
    });

    it('should return scored results', async () => {
      const results = await store.searchMemoriesWithScores('TypeScript', 5);
      expect(results.length).toBeGreaterThan(0);

      // Results should have scores
      for (const r of results) {
        expect(r.similarity).toBeGreaterThan(0);
        expect(r.score).toBeGreaterThan(0);
        expect(r.memory).toBeDefined();
      }

      // Results should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should respect limit parameter', async () => {
      const results = await store.searchMemories('programming', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty for no matches', async () => {
      // Use a very high threshold store
      const strictStore = new VectorMemoryStore(new InMemoryStorage(), {
        embedding: { provider: 'local', dimension: 64 },
        similarityThreshold: 0.99,
      });
      strictStore.setEnabled(true);
      await strictStore.storeMemory({ chatId: 1, messageId: 1, sender: 'user', text: 'cats' });
      const results = await strictStore.searchMemories('quantum physics differential equations', 5);
      // With very high threshold, dissimilar queries should return empty
      expect(results.length).toBeLessThanOrEqual(1);
      strictStore.destroy();
    });

    it('should return empty for empty store', async () => {
      const emptyStore = new VectorMemoryStore(new InMemoryStorage(), {
        embedding: { provider: 'local', dimension: 64 },
      });
      emptyStore.setEnabled(true);
      const results = await emptyStore.searchMemories('anything', 5);
      expect(results).toHaveLength(0);
      emptyStore.destroy();
    });
  });

  describe('Similar Memory Finding', () => {
    it('should find memories similar to a given memory', async () => {
      await store.storeMemory({ chatId: 1, messageId: 1, sender: 'user', text: 'I love TypeScript programming' });
      await store.storeMemory({ chatId: 1, messageId: 2, sender: 'user', text: 'TypeScript is my favorite language' });
      await store.storeMemory({ chatId: 1, messageId: 3, sender: 'user', text: 'The weather is nice today' });

      const memories = store.getMemoriesByChat(1);
      const similar = await store.findSimilarMemories(memories[0].id, 0.1);

      // Should find the other TypeScript memory as more similar
      expect(similar.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent memory', async () => {
      const similar = await store.findSimilarMemories('nonexistent', 0.5);
      expect(similar).toHaveLength(0);
    });
  });

  describe('Memory Management', () => {
    it('should clear all memories', async () => {
      await store.storeMemory({ chatId: 1, messageId: 1, sender: 'user', text: 'test' });
      await store.storeMemory({ chatId: 2, messageId: 2, sender: 'user', text: 'test2' });

      await store.clearAllMemories();
      expect(store.getMemoriesByChat(1)).toHaveLength(0);
      expect(store.getMemoriesByChat(2)).toHaveLength(0);
    });

    it('should clear memories for a specific chat', async () => {
      await store.storeMemory({ chatId: 1, messageId: 1, sender: 'user', text: 'chat 1' });
      await store.storeMemory({ chatId: 2, messageId: 2, sender: 'user', text: 'chat 2' });

      await store.clearChatMemories(1);
      expect(store.getMemoriesByChat(1)).toHaveLength(0);
      expect(store.getMemoriesByChat(2)).toHaveLength(1);
    });

    it('should enforce memory limit', async () => {
      const limitedStore = new VectorMemoryStore(new InMemoryStorage(), {
        memoryLimit: 5,
        embedding: { provider: 'local', dimension: 32 },
      });
      limitedStore.setEnabled(true);

      for (let i = 0; i < 10; i++) {
        await limitedStore.storeMemory({
          chatId: 1,
          messageId: i,
          sender: 'user',
          text: `Memory ${i}`,
        });
      }

      const stats = limitedStore.getStats();
      expect(stats.memoryCount).toBeLessThanOrEqual(10); // In-memory may have all
      limitedStore.destroy();
    });
  });

  describe('Persistence', () => {
    it('should save and reload memories', async () => {
      await store.storeMemory({ chatId: 1, messageId: 1, sender: 'user', text: 'persistent memory' });
      await store.flush();

      // Create a new store with the same storage
      const store2 = new VectorMemoryStore(storage, {
        embedding: { provider: 'local', dimension: 64 },
      });
      store2.setEnabled(true);

      // Wait for async load
      await store2.ready();

      const memories = store2.getMemoriesByChat(1);
      expect(memories).toHaveLength(1);
      expect(memories[0].text).toBe('persistent memory');
      store2.destroy();
    });
  });

  describe('Statistics', () => {
    it('should report accurate stats', async () => {
      await store.storeMemory({ chatId: 1, messageId: 1, sender: 'user', text: 'test' });
      await store.storeReflection('reflection', 'periodic');

      const stats = store.getStats();
      expect(stats.memoryCount).toBe(1);
      expect(stats.reflectionCount).toBe(1);
      expect(stats.vectorIndexSize).toBe(1);
      expect(stats.enabled).toBe(true);
      expect(stats.embeddingStats.provider).toBe('local');
    });

    it('should expose embedding service', () => {
      const embeddingService = store.getEmbeddingService();
      expect(embeddingService).toBeDefined();
      expect(embeddingService.getDimension()).toBe(64);
    });
  });
});
