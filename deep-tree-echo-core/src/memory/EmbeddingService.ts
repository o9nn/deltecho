/**
 * EmbeddingService - Real vector embedding generation
 *
 * Provides actual dense vector embeddings for semantic memory search.
 * Supports multiple backends:
 * - OpenAI text-embedding-3-small (default, highest quality)
 * - Ollama local embeddings (privacy-first, offline capable)
 * - Local hash-based embeddings (zero-dependency fallback)
 *
 * The local fallback uses a deterministic hash projection that produces
 * surprisingly good results for short text similarity — not as good as
 * neural embeddings, but orders of magnitude better than TF-IDF.
 */
import { getLogger } from '../utils/logger.js';

const log = getLogger('deep-tree-echo-core/memory/EmbeddingService');

export type EmbeddingProvider = 'openai' | 'ollama' | 'local';

export interface EmbeddingServiceConfig {
  /** Embedding provider */
  provider: EmbeddingProvider;
  /** API key (for OpenAI) */
  apiKey?: string;
  /** API endpoint */
  apiEndpoint?: string;
  /** Model name */
  model?: string;
  /** Embedding dimension */
  dimension?: number;
  /** Cache embeddings in memory */
  enableCache?: boolean;
}

const DEFAULT_CONFIGS: Record<EmbeddingProvider, Partial<EmbeddingServiceConfig>> = {
  openai: {
    apiEndpoint: 'https://api.openai.com/v1/embeddings',
    model: 'text-embedding-3-small',
    dimension: 1536,
  },
  ollama: {
    apiEndpoint: 'http://localhost:11434/api/embeddings',
    model: 'nomic-embed-text',
    dimension: 768,
  },
  local: {
    dimension: 256,
  },
};

export class EmbeddingService {
  private config: Required<EmbeddingServiceConfig>;
  private cache: Map<string, number[]> = new Map();
  private requestCount: number = 0;
  private failureCount: number = 0;
  private fallbackActive: boolean = false;

  constructor(config?: Partial<EmbeddingServiceConfig>) {
    const provider = config?.provider || 'local';
    const defaults = DEFAULT_CONFIGS[provider];
    this.config = {
      provider,
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY || '',
      apiEndpoint: config?.apiEndpoint || defaults.apiEndpoint || '',
      model: config?.model || defaults.model || '',
      dimension: config?.dimension || defaults.dimension || 256,
      enableCache: config?.enableCache ?? true,
    } as Required<EmbeddingServiceConfig>;

    log.info(`EmbeddingService initialized: provider=${provider}, dim=${this.config.dimension}`);
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!text.trim()) {
      return new Array(this.config.dimension).fill(0);
    }

    // Check cache
    if (this.config.enableCache && this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    let embedding: number[];

    // Try primary provider, fall back to local on failure
    if (this.config.provider !== 'local' && !this.fallbackActive) {
      try {
        embedding = await this.embedRemote(text);
        this.requestCount++;
        // Reset failure count on success
        this.failureCount = 0;
      } catch (error) {
        this.failureCount++;
        log.warn(`Embedding API failed (${this.failureCount}x): ${error}`);

        // After 3 consecutive failures, switch to local fallback
        if (this.failureCount >= 3) {
          log.warn('Switching to local embedding fallback after 3 consecutive failures');
          this.fallbackActive = true;
        }
        embedding = this.embedLocal(text);
      }
    } else {
      embedding = this.embedLocal(text);
    }

    // Cache
    if (this.config.enableCache) {
      this.cache.set(text, embedding);
      // Evict old entries if cache grows too large
      if (this.cache.size > 10000) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts (batched)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (this.config.provider === 'openai' && !this.fallbackActive) {
      try {
        return await this.embedBatchRemote(texts);
      } catch {
        // Fall through to individual embedding
      }
    }
    return Promise.all(texts.map(t => this.embed(t)));
  }

  /**
   * Compute cosine similarity between two vectors
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get service statistics
   */
  getStats(): { requestCount: number; failureCount: number; cacheSize: number; fallbackActive: boolean; provider: string } {
    return {
      requestCount: this.requestCount,
      failureCount: this.failureCount,
      cacheSize: this.cache.size,
      fallbackActive: this.fallbackActive,
      provider: this.fallbackActive ? 'local (fallback)' : this.config.provider,
    };
  }

  /**
   * Reset fallback state (e.g., after API key is updated)
   */
  resetFallback(): void {
    this.fallbackActive = false;
    this.failureCount = 0;
    log.info('Embedding fallback reset — will retry remote provider');
  }

  /**
   * Get the configured dimension
   */
  getDimension(): number {
    return this.config.dimension;
  }

  // ─── Remote Embedding ─────────────────────────────────────────

  private async embedRemote(text: string): Promise<number[]> {
    if (this.config.provider === 'openai') {
      return this.embedOpenAI(text);
    } else if (this.config.provider === 'ollama') {
      return this.embedOllama(text);
    }
    return this.embedLocal(text);
  }

  private async embedBatchRemote(texts: string[]): Promise<number[][]> {
    if (this.config.provider === 'openai') {
      return this.embedOpenAIBatch(texts);
    }
    return Promise.all(texts.map(t => this.embedRemote(t)));
  }

  private async embedOpenAI(text: string): Promise<number[]> {
    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
        dimensions: this.config.dimension,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  }

  private async embedOpenAIBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts,
        dimensions: this.config.dimension,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI batch embedding API error: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[]; index: number }> };
    // Sort by index to maintain order
    return data.data
      .sort((a, b) => a.index - b.index)
      .map(d => d.embedding);
  }

  private async embedOllama(text: string): Promise<number[]> {
    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding API error: ${response.status}`);
    }

    const data = await response.json() as { embedding: number[] };
    return data.embedding;
  }

  // ─── Local Hash-Based Embedding ───────────────────────────────
  //
  // Deterministic projection: hash n-grams into a fixed-dimension
  // vector using a seeded hash function. This produces dense vectors
  // that capture lexical overlap with surprising fidelity.
  //
  // Not as good as neural embeddings, but:
  // - Zero latency
  // - Zero cost
  // - Deterministic (same input → same output)
  // - Works offline
  // - Much better than TF-IDF for short text similarity

  embedLocal(text: string): number[] {
    const dim = this.config.dimension;
    const vector = new Float64Array(dim);
    const normalized = text.toLowerCase().trim();

    if (!normalized) return Array.from(vector);

    // Generate character n-grams (2, 3, 4)
    const ngrams: string[] = [];
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i <= normalized.length - n; i++) {
        ngrams.push(normalized.slice(i, i + n));
      }
    }

    // Also add word unigrams and bigrams
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    ngrams.push(...words);
    for (let i = 0; i < words.length - 1; i++) {
      ngrams.push(`${words[i]} ${words[i + 1]}`);
    }

    // Hash each n-gram into the vector using two hash functions
    // (simulated random projection via FNV-1a hash)
    for (const ngram of ngrams) {
      const h1 = this.fnv1a(ngram, 0x811c9dc5);
      const h2 = this.fnv1a(ngram, 0x01000193);

      const idx = Math.abs(h1) % dim;
      const sign = (h2 & 1) === 0 ? 1 : -1;

      vector[idx] += sign;
    }

    // L2 normalize
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] /= norm;
      }
    }

    return Array.from(vector);
  }

  /**
   * FNV-1a hash function (32-bit)
   */
  private fnv1a(str: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0; // Ensure unsigned
  }
}
