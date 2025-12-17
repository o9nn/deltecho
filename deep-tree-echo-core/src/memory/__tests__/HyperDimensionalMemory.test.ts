import { HyperDimensionalMemory } from '../HyperDimensionalMemory';
import { InMemoryStorage } from '../storage';

describe('HyperDimensionalMemory', () => {
  let storage: InMemoryStorage;
  let hyperMemory: HyperDimensionalMemory;

  beforeEach(() => {
    storage = new InMemoryStorage();
    hyperMemory = new HyperDimensionalMemory(storage, {
      dimensions: 1000, // Smaller for testing
      memoryDecay: 0.95,
      contextWindow: 10,
    });
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultMemory = new HyperDimensionalMemory(storage);
      expect(defaultMemory).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customMemory = new HyperDimensionalMemory(storage, {
        dimensions: 5000,
        memoryDecay: 0.9,
        contextWindow: 20,
      });
      expect(customMemory).toBeDefined();
    });

    it('should use in-memory storage when none provided', () => {
      const memory = new HyperDimensionalMemory();
      expect(memory).toBeDefined();
    });
  });

  describe('encoding', () => {
    it('should encode text into hypervector', async () => {
      const vector = await hyperMemory.encode('Hello world');
      
      expect(vector).toBeDefined();
      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBe(1000); // Matches dimensions config
    });

    it('should produce different vectors for different text', async () => {
      const vector1 = await hyperMemory.encode('Hello world');
      const vector2 = await hyperMemory.encode('Goodbye world');
      
      // Vectors should be different
      let differences = 0;
      for (let i = 0; i < vector1.length; i++) {
        if (vector1[i] !== vector2[i]) differences++;
      }
      expect(differences).toBeGreaterThan(0);
    });

    it('should produce similar vectors for similar text', async () => {
      const vector1 = await hyperMemory.encode('The cat sat on the mat');
      const vector2 = await hyperMemory.encode('The cat sat on the rug');
      
      const similarity = await hyperMemory.cosineSimilarity(vector1, vector2);
      expect(similarity).toBeGreaterThan(0.5); // Should be somewhat similar
    });
  });

  describe('memory storage', () => {
    it('should store memory with metadata', async () => {
      await hyperMemory.store('Test memory content', {
        chatId: 123,
        messageId: 456,
        emotion: 'joy',
      });

      const memories = await hyperMemory.getRecentMemories(1);
      expect(memories.length).toBe(1);
      expect(memories[0].content).toBe('Test memory content');
    });

    it('should store multiple memories', async () => {
      await hyperMemory.store('Memory 1', { chatId: 1 });
      await hyperMemory.store('Memory 2', { chatId: 2 });
      await hyperMemory.store('Memory 3', { chatId: 3 });

      const memories = await hyperMemory.getRecentMemories(10);
      expect(memories.length).toBe(3);
    });

    it('should include timestamp in stored memories', async () => {
      const before = Date.now();
      await hyperMemory.store('Timestamped memory', {});
      const after = Date.now();

      const memories = await hyperMemory.getRecentMemories(1);
      expect(memories[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(memories[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('memory retrieval', () => {
    beforeEach(async () => {
      await hyperMemory.store('I love programming in TypeScript', { topic: 'programming' });
      await hyperMemory.store('The weather is sunny today', { topic: 'weather' });
      await hyperMemory.store('JavaScript is also great', { topic: 'programming' });
      await hyperMemory.store('It might rain tomorrow', { topic: 'weather' });
    });

    it('should retrieve similar memories', async () => {
      const results = await hyperMemory.retrieve('coding in TypeScript', 2);
      
      expect(results.length).toBeLessThanOrEqual(2);
      // Should find programming-related memories
      const hasRelevant = results.some(
        r => r.content.includes('TypeScript') || r.content.includes('JavaScript')
      );
      expect(hasRelevant).toBe(true);
    });

    it('should return memories sorted by similarity', async () => {
      const results = await hyperMemory.retrieve('TypeScript programming', 4);
      
      // First result should be most similar
      if (results.length >= 2) {
        expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
      }
    });

    it('should limit results to requested count', async () => {
      const results = await hyperMemory.retrieve('test', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('associative memory', () => {
    it('should create associations between memories', async () => {
      const id1 = await hyperMemory.store('Concept A', {});
      const id2 = await hyperMemory.store('Concept B', {});
      
      await hyperMemory.createAssociation(id1, id2, 0.8);
      
      const associations = await hyperMemory.getAssociations(id1);
      expect(associations.length).toBeGreaterThan(0);
    });

    it('should retrieve associated memories', async () => {
      await hyperMemory.store('Dogs are loyal pets', { category: 'animals' });
      await hyperMemory.store('Cats are independent', { category: 'animals' });
      await hyperMemory.store('Birds can fly', { category: 'animals' });

      // Store a query and find associations
      const results = await hyperMemory.retrieve('pets and animals', 3);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('temporal indexing', () => {
    it('should retrieve memories by time range', async () => {
      const now = Date.now();
      
      await hyperMemory.store('Old memory', { timestamp: now - 10000 });
      await hyperMemory.store('Recent memory', { timestamp: now - 1000 });
      await hyperMemory.store('Current memory', { timestamp: now });

      const recentMemories = await hyperMemory.getMemoriesByTimeRange(
        now - 5000,
        now + 1000
      );
      
      expect(recentMemories.length).toBeGreaterThanOrEqual(1);
    });

    it('should get recent memories in order', async () => {
      await hyperMemory.store('First', {});
      await new Promise(resolve => setTimeout(resolve, 10));
      await hyperMemory.store('Second', {});
      await new Promise(resolve => setTimeout(resolve, 10));
      await hyperMemory.store('Third', {});

      const memories = await hyperMemory.getRecentMemories(3);
      
      // Most recent should be first
      expect(memories[0].content).toBe('Third');
      expect(memories[2].content).toBe('First');
    });
  });

  describe('emotional weighting', () => {
    it('should weight memories by emotional intensity', async () => {
      await hyperMemory.store('Neutral memory', { emotionalIntensity: 0.3 });
      await hyperMemory.store('Emotional memory', { emotionalIntensity: 0.9 });

      const results = await hyperMemory.retrieveWithEmotionalWeight('memory', 2, 0.5);
      
      // Emotional memory should be weighted higher
      expect(results.length).toBeGreaterThan(0);
    });

    it('should apply emotional decay', async () => {
      await hyperMemory.store('Intense memory', { emotionalIntensity: 1.0 });
      
      await hyperMemory.applyEmotionalDecay(0.5);
      
      const memories = await hyperMemory.getRecentMemories(1);
      expect(memories[0].emotionalIntensity).toBeLessThan(1.0);
    });
  });

  describe('memory decay', () => {
    it('should apply memory decay', async () => {
      await hyperMemory.store('Decaying memory', {});
      
      const beforeDecay = await hyperMemory.getRecentMemories(1);
      const initialStrength = beforeDecay[0].strength || 1.0;
      
      await hyperMemory.applyDecay();
      
      const afterDecay = await hyperMemory.getRecentMemories(1);
      expect(afterDecay[0].strength).toBeLessThan(initialStrength);
    });

    it('should remove memories below threshold', async () => {
      await hyperMemory.store('Weak memory', { strength: 0.01 });
      await hyperMemory.store('Strong memory', { strength: 0.9 });
      
      await hyperMemory.pruneWeakMemories(0.1);
      
      const memories = await hyperMemory.getRecentMemories(10);
      const hasWeak = memories.some(m => m.content === 'Weak memory');
      expect(hasWeak).toBe(false);
    });
  });

  describe('vector operations', () => {
    it('should calculate cosine similarity', async () => {
      const v1 = await hyperMemory.encode('Hello');
      const v2 = await hyperMemory.encode('Hello');
      
      const similarity = await hyperMemory.cosineSimilarity(v1, v2);
      expect(similarity).toBeCloseTo(1.0, 1); // Same text should be very similar
    });

    it('should bundle vectors', async () => {
      const v1 = await hyperMemory.encode('First');
      const v2 = await hyperMemory.encode('Second');
      
      const bundled = await hyperMemory.bundle([v1, v2]);
      
      expect(bundled).toBeDefined();
      expect(bundled.length).toBe(v1.length);
    });

    it('should bind vectors', async () => {
      const v1 = await hyperMemory.encode('Key');
      const v2 = await hyperMemory.encode('Value');
      
      const bound = await hyperMemory.bind(v1, v2);
      
      expect(bound).toBeDefined();
      expect(bound.length).toBe(v1.length);
    });
  });

  describe('persistence', () => {
    it('should persist memories to storage', async () => {
      await hyperMemory.store('Persistent memory', { important: true });
      
      // Create new instance with same storage
      const newHyperMemory = new HyperDimensionalMemory(storage, {
        dimensions: 1000,
      });
      
      // Wait for async load
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const memories = await newHyperMemory.getRecentMemories(1);
      expect(memories.length).toBeGreaterThan(0);
    });

    it('should clear all memories', async () => {
      await hyperMemory.store('Memory 1', {});
      await hyperMemory.store('Memory 2', {});
      
      await hyperMemory.clear();
      
      const memories = await hyperMemory.getRecentMemories(10);
      expect(memories.length).toBe(0);
    });
  });

  describe('context window', () => {
    it('should maintain context window size', async () => {
      // Store more than context window size
      for (let i = 0; i < 15; i++) {
        await hyperMemory.store(`Memory ${i}`, {});
      }

      const context = await hyperMemory.getContextWindow();
      expect(context.length).toBeLessThanOrEqual(10); // Context window is 10
    });

    it('should get context for query', async () => {
      await hyperMemory.store('Context memory 1', {});
      await hyperMemory.store('Context memory 2', {});
      
      const context = await hyperMemory.getContextForQuery('test query');
      expect(context).toBeDefined();
      expect(typeof context).toBe('string');
    });
  });
});
