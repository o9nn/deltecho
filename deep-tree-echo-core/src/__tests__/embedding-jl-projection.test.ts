import { EmbeddingService } from '../memory/EmbeddingService';

describe('EmbeddingService - JL Random Projection', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    service = new EmbeddingService({ provider: 'local', dimension: 384 });
  });

  describe('basic embedding', () => {
    it('should produce embeddings of correct dimension', async () => {
      const embedding = await service.embed('Hello world');
      expect(embedding).toHaveLength(384);
    });

    it('should produce zero vector for empty text', async () => {
      const embedding = await service.embed('');
      expect(embedding).toHaveLength(384);
      expect(embedding.every(v => v === 0)).toBe(true);
    });

    it('should produce L2-normalized vectors', async () => {
      const embedding = await service.embed('Test normalization');
      const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 3);
    });

    it('should be deterministic (same input → same output)', async () => {
      const e1 = await service.embed('deterministic test');
      const e2 = await service.embed('deterministic test');
      expect(e1).toEqual(e2);
    });
  });

  describe('Johnson-Lindenstrauss distance preservation', () => {
    it('should give high similarity for semantically similar texts', async () => {
      const e1 = await service.embed('The cat sat on the mat');
      const e2 = await service.embed('The cat was sitting on the mat');
      const similarity = EmbeddingService.cosineSimilarity(e1, e2);

      // Similar texts should have high similarity
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should give low similarity for unrelated texts', async () => {
      const e1 = await service.embed('quantum physics particle accelerator');
      const e2 = await service.embed('chocolate cake recipe baking');
      const similarity = EmbeddingService.cosineSimilarity(e1, e2);

      // Unrelated texts should have low similarity
      expect(similarity).toBeLessThan(0.3);
    });

    it('should preserve relative ordering of similarities', async () => {
      const base = await service.embed('machine learning neural network');
      const similar = await service.embed('deep learning artificial intelligence');
      const different = await service.embed('cooking pasta Italian recipe');

      const simSimilar = EmbeddingService.cosineSimilarity(base, similar);
      const simDifferent = EmbeddingService.cosineSimilarity(base, different);

      // Similar text should be closer than different text
      expect(simSimilar).toBeGreaterThan(simDifferent);
    });

    it('should handle long texts', async () => {
      const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(50);
      const embedding = await service.embed(longText);
      expect(embedding).toHaveLength(384);

      const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 3);
    });

    it('should differentiate between short similar strings', async () => {
      const e1 = await service.embed('hello');
      const e2 = await service.embed('world');
      const e3 = await service.embed('hello world');

      const sim12 = EmbeddingService.cosineSimilarity(e1, e2);
      const sim13 = EmbeddingService.cosineSimilarity(e1, e3);

      // 'hello' should be more similar to 'hello world' than to 'world'
      expect(sim13).toBeGreaterThan(sim12);
    });
  });

  describe('cosine similarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const v = [1, 0, 0, 1];
      expect(EmbeddingService.cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const v1 = [1, 0, 0, 0];
      const v2 = [0, 1, 0, 0];
      expect(EmbeddingService.cosineSimilarity(v1, v2)).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const v1 = [1, 0, 0, 0];
      const v2 = [-1, 0, 0, 0];
      expect(EmbeddingService.cosineSimilarity(v1, v2)).toBeCloseTo(-1.0, 5);
    });

    it('should return 0 for mismatched dimensions', () => {
      expect(EmbeddingService.cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });

    it('should return 0 for zero vectors', () => {
      expect(EmbeddingService.cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });
  });

  describe('batch embedding', () => {
    it('should embed multiple texts', async () => {
      const texts = ['hello', 'world', 'test'];
      const embeddings = await service.embedBatch(texts);

      expect(embeddings).toHaveLength(3);
      for (const emb of embeddings) {
        expect(emb).toHaveLength(384);
      }
    });

    it('should produce same results as individual embedding', async () => {
      const texts = ['alpha', 'beta', 'gamma'];
      const batch = await service.embedBatch(texts);
      const individual = await Promise.all(texts.map(t => service.embed(t)));

      for (let i = 0; i < texts.length; i++) {
        expect(batch[i]).toEqual(individual[i]);
      }
    });
  });

  describe('caching', () => {
    it('should cache embeddings when enabled', async () => {
      const cachedService = new EmbeddingService({
        provider: 'local',
        dimension: 384,
        enableCache: true,
      });

      await cachedService.embed('cache test');
      const stats = cachedService.getStats();
      expect(stats.cacheSize).toBe(1);
    });

    it('should not cache when disabled', async () => {
      const uncachedService = new EmbeddingService({
        provider: 'local',
        dimension: 384,
        enableCache: false,
      });

      await uncachedService.embed('no cache test');
      const stats = uncachedService.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('provider configuration', () => {
    it('should default to local provider', () => {
      const s = new EmbeddingService();
      const stats = s.getStats();
      expect(stats.provider).toBe('local');
    });

    it('should report correct dimension', () => {
      const s = new EmbeddingService({ provider: 'local', dimension: 512 });
      expect(s.getDimension()).toBe(512);
    });

    it('should support different dimensions', async () => {
      const s128 = new EmbeddingService({ provider: 'local', dimension: 128 });
      const s512 = new EmbeddingService({ provider: 'local', dimension: 512 });

      const e128 = await s128.embed('test');
      const e512 = await s512.embed('test');

      expect(e128).toHaveLength(128);
      expect(e512).toHaveLength(512);
    });

    it('should support fallback reset', () => {
      const s = new EmbeddingService({ provider: 'openai' });
      s.resetFallback();
      const stats = s.getStats();
      expect(stats.fallbackActive).toBe(false);
    });
  });

  describe('stress test', () => {
    it('should handle 100 embeddings without degradation', async () => {
      const texts = Array.from({ length: 100 }, (_, i) => `Text number ${i} with some content`);
      const start = Date.now();

      const embeddings = await service.embedBatch(texts);
      const elapsed = Date.now() - start;

      expect(embeddings).toHaveLength(100);
      // Local JL projection should complete in reasonable time
      // (sandbox environments may be slower than production)
      expect(elapsed).toBeLessThan(30000);
    });
  });
});
