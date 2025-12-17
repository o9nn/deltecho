import { RAGMemoryStore } from '../RAGMemoryStore';
import { InMemoryStorage } from '../storage';

describe('RAGMemoryStore', () => {
  let storage: InMemoryStorage;
  let ragMemory: RAGMemoryStore;

  beforeEach(() => {
    storage = new InMemoryStorage();
    ragMemory = new RAGMemoryStore(storage, {
      memoryLimit: 10,
      reflectionLimit: 5,
    });
  });

  describe('addMessage', () => {
    it('should add a message to conversation history', async () => {
      await ragMemory.addMessage('user', 'Hello, how are you?');
      const history = await ragMemory.getConversationHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello, how are you?');
      expect(history[0].timestamp).toBeDefined();
    });

    it('should add multiple messages in order', async () => {
      await ragMemory.addMessage('user', 'First message');
      await ragMemory.addMessage('assistant', 'Second message');
      await ragMemory.addMessage('user', 'Third message');
      
      const history = await ragMemory.getConversationHistory();
      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('First message');
      expect(history[1].content).toBe('Second message');
      expect(history[2].content).toBe('Third message');
    });

    it('should respect memory limit', async () => {
      // Add more messages than the limit
      for (let i = 0; i < 15; i++) {
        await ragMemory.addMessage('user', `Message ${i}`);
      }
      
      const history = await ragMemory.getConversationHistory();
      expect(history).toHaveLength(10); // Should be limited to 10
    });
  });

  describe('addReflection', () => {
    it('should add a reflection', async () => {
      await ragMemory.addReflection('This is an important insight');
      const reflections = await ragMemory.getReflections();
      
      expect(reflections).toHaveLength(1);
      expect(reflections[0].content).toBe('This is an important insight');
      expect(reflections[0].timestamp).toBeDefined();
    });

    it('should respect reflection limit', async () => {
      // Add more reflections than the limit
      for (let i = 0; i < 8; i++) {
        await ragMemory.addReflection(`Reflection ${i}`);
      }
      
      const reflections = await ragMemory.getReflections();
      expect(reflections).toHaveLength(5); // Should be limited to 5
    });
  });

  describe('searchMemory', () => {
    beforeEach(async () => {
      await ragMemory.addMessage('user', 'I love programming in TypeScript');
      await ragMemory.addMessage('assistant', 'TypeScript is great for large projects');
      await ragMemory.addMessage('user', 'What about Python?');
      await ragMemory.addMessage('assistant', 'Python is excellent for data science');
    });

    it('should find relevant messages by keyword', async () => {
      const results = await ragMemory.searchMemory('TypeScript');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.content.includes('TypeScript'))).toBe(true);
    });

    it('should return empty array when no matches found', async () => {
      const results = await ragMemory.searchMemory('Java');
      
      expect(results).toHaveLength(0);
    });

    it('should limit search results', async () => {
      const results = await ragMemory.searchMemory('programming', 1);
      
      expect(results).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear all memory', async () => {
      await ragMemory.addMessage('user', 'Test message');
      await ragMemory.addReflection('Test reflection');
      
      await ragMemory.clear();
      
      const history = await ragMemory.getConversationHistory();
      const reflections = await ragMemory.getReflections();
      
      expect(history).toHaveLength(0);
      expect(reflections).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('should persist and restore conversation history', async () => {
      await ragMemory.addMessage('user', 'Persistent message');
      
      // Create new instance with same storage
      const newRagMemory = new RAGMemoryStore(storage);
      const history = await newRagMemory.getConversationHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Persistent message');
    });

    it('should persist and restore reflections', async () => {
      await ragMemory.addReflection('Persistent reflection');
      
      // Create new instance with same storage
      const newRagMemory = new RAGMemoryStore(storage);
      const reflections = await newRagMemory.getReflections();
      
      expect(reflections).toHaveLength(1);
      expect(reflections[0].content).toBe('Persistent reflection');
    });
  });
});
