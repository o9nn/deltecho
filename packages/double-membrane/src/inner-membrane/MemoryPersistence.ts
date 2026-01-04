/**
 * MemoryPersistence - Real Memory Storage Implementation
 *
 * This module implements persistent memory storage for Deep Tree Echo,
 * providing both file-based and in-memory storage with optional SQLite support.
 * It handles the four memory types: Declarative, Procedural, Episodic, and Intentional.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Memory types following Deep Tree Echo architecture
 */
export type MemoryType = 'declarative' | 'procedural' | 'episodic' | 'intentional';

/**
 * Memory entry structure
 */
export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: {
    created: number;
    modified: number;
    accessed: number;
    accessCount: number;
    importance: number;
    tags: string[];
    source?: string;
    associations: string[];
  };
}

/**
 * Memory query options
 */
export interface MemoryQuery {
  type?: MemoryType;
  tags?: string[];
  minImportance?: number;
  since?: number;
  limit?: number;
  searchText?: string;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalEntries: number;
  entriesByType: Record<MemoryType, number>;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
  averageImportance: number;
}

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  storagePath: string;
  maxEntries: number;
  autoSaveInterval: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  encryptionKey?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PersistenceConfig = {
  storagePath: './data/memory',
  maxEntries: 100000,
  autoSaveInterval: 30000, // 30 seconds
  enableCompression: false,
  enableEncryption: false,
};

/**
 * MemoryPersistence - Real implementation of memory storage
 */
export class MemoryPersistence extends EventEmitter {
  private config: PersistenceConfig;
  private memories: Map<string, MemoryEntry>;
  private indices: {
    byType: Map<MemoryType, Set<string>>;
    byTag: Map<string, Set<string>>;
    byImportance: Map<number, Set<string>>;
  };
  private dirty: boolean = false;
  private autoSaveTimer?: ReturnType<typeof setInterval>;
  private initialized: boolean = false;

  constructor(config?: Partial<PersistenceConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memories = new Map();
    this.indices = {
      byType: new Map(),
      byTag: new Map(),
      byImportance: new Map(),
    };

    // Initialize type indices
    const types: MemoryType[] = ['declarative', 'procedural', 'episodic', 'intentional'];
    for (const type of types) {
      this.indices.byType.set(type, new Set());
    }
  }

  /**
   * Initialize the persistence layer
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure storage directory exists
    await this.ensureStorageDirectory();

    // Load existing memories
    await this.loadFromDisk();

    // Start auto-save timer
    if (this.config.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        if (this.dirty) {
          this.saveToDisk().catch(err => {
            this.emit('error', { type: 'save_error', error: err });
          });
        }
      }, this.config.autoSaveInterval);
    }

    this.initialized = true;
    this.emit('initialized', { entriesLoaded: this.memories.size });
  }

  /**
   * Shutdown the persistence layer
   */
  public async shutdown(): Promise<void> {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }

    // Final save
    if (this.dirty) {
      await this.saveToDisk();
    }

    this.initialized = false;
    this.emit('shutdown');
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.promises.mkdir(this.config.storagePath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Generate unique memory ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Store a memory entry
   */
  public async store(
    type: MemoryType,
    content: string,
    options?: {
      importance?: number;
      tags?: string[];
      source?: string;
      associations?: string[];
      embedding?: number[];
    }
  ): Promise<MemoryEntry> {
    const id = this.generateId();
    const now = Date.now();

    const entry: MemoryEntry = {
      id,
      type,
      content,
      embedding: options?.embedding,
      metadata: {
        created: now,
        modified: now,
        accessed: now,
        accessCount: 0,
        importance: options?.importance ?? 0.5,
        tags: options?.tags ?? [],
        source: options?.source,
        associations: options?.associations ?? [],
      },
    };

    // Check capacity
    if (this.memories.size >= this.config.maxEntries) {
      await this.evictOldest();
    }

    // Store entry
    this.memories.set(id, entry);

    // Update indices
    this.indices.byType.get(type)?.add(id);
    for (const tag of entry.metadata.tags) {
      if (!this.indices.byTag.has(tag)) {
        this.indices.byTag.set(tag, new Set());
      }
      this.indices.byTag.get(tag)?.add(id);
    }

    const importanceBucket = Math.floor(entry.metadata.importance * 10);
    if (!this.indices.byImportance.has(importanceBucket)) {
      this.indices.byImportance.set(importanceBucket, new Set());
    }
    this.indices.byImportance.get(importanceBucket)?.add(id);

    this.dirty = true;
    this.emit('stored', { entry });

    return entry;
  }

  /**
   * Retrieve a memory by ID
   */
  public async retrieve(id: string): Promise<MemoryEntry | null> {
    const entry = this.memories.get(id);
    if (!entry) return null;

    // Update access metadata
    entry.metadata.accessed = Date.now();
    entry.metadata.accessCount++;
    this.dirty = true;

    this.emit('retrieved', { id });
    return entry;
  }

  /**
   * Query memories
   */
  public async query(options: MemoryQuery): Promise<MemoryEntry[]> {
    let candidates: Set<string>;

    // Start with type filter if specified
    if (options.type) {
      candidates = new Set(this.indices.byType.get(options.type) || []);
    } else {
      candidates = new Set(this.memories.keys());
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      const tagMatches = new Set<string>();
      for (const tag of options.tags) {
        const tagSet = this.indices.byTag.get(tag);
        if (tagSet) {
          for (const id of tagSet) {
            if (candidates.has(id)) {
              tagMatches.add(id);
            }
          }
        }
      }
      candidates = tagMatches;
    }

    // Convert to entries and apply remaining filters
    let results: MemoryEntry[] = [];
    for (const id of candidates) {
      const entry = this.memories.get(id);
      if (!entry) continue;

      // Filter by importance
      if (options.minImportance !== undefined && entry.metadata.importance < options.minImportance) {
        continue;
      }

      // Filter by time
      if (options.since !== undefined && entry.metadata.created < options.since) {
        continue;
      }

      // Filter by text search
      if (options.searchText) {
        const searchLower = options.searchText.toLowerCase();
        if (!entry.content.toLowerCase().includes(searchLower)) {
          continue;
        }
      }

      results.push(entry);
    }

    // Sort by importance and recency
    results.sort((a, b) => {
      const importanceDiff = b.metadata.importance - a.metadata.importance;
      if (Math.abs(importanceDiff) > 0.1) return importanceDiff;
      return b.metadata.created - a.metadata.created;
    });

    // Apply limit
    if (options.limit && results.length > options.limit) {
      results = results.slice(0, options.limit);
    }

    this.emit('queried', { count: results.length });
    return results;
  }

  /**
   * Update a memory entry
   */
  public async update(
    id: string,
    updates: {
      content?: string;
      importance?: number;
      tags?: string[];
      associations?: string[];
    }
  ): Promise<MemoryEntry | null> {
    const entry = this.memories.get(id);
    if (!entry) return null;

    // Update content
    if (updates.content !== undefined) {
      entry.content = updates.content;
    }

    // Update importance
    if (updates.importance !== undefined) {
      // Remove from old importance bucket
      const oldBucket = Math.floor(entry.metadata.importance * 10);
      this.indices.byImportance.get(oldBucket)?.delete(id);

      entry.metadata.importance = updates.importance;

      // Add to new importance bucket
      const newBucket = Math.floor(updates.importance * 10);
      if (!this.indices.byImportance.has(newBucket)) {
        this.indices.byImportance.set(newBucket, new Set());
      }
      this.indices.byImportance.get(newBucket)?.add(id);
    }

    // Update tags
    if (updates.tags !== undefined) {
      // Remove from old tags
      for (const tag of entry.metadata.tags) {
        this.indices.byTag.get(tag)?.delete(id);
      }

      entry.metadata.tags = updates.tags;

      // Add to new tags
      for (const tag of updates.tags) {
        if (!this.indices.byTag.has(tag)) {
          this.indices.byTag.set(tag, new Set());
        }
        this.indices.byTag.get(tag)?.add(id);
      }
    }

    // Update associations
    if (updates.associations !== undefined) {
      entry.metadata.associations = updates.associations;
    }

    entry.metadata.modified = Date.now();
    this.dirty = true;

    this.emit('updated', { id });
    return entry;
  }

  /**
   * Delete a memory entry
   */
  public async delete(id: string): Promise<boolean> {
    const entry = this.memories.get(id);
    if (!entry) return false;

    // Remove from indices
    this.indices.byType.get(entry.type)?.delete(id);
    for (const tag of entry.metadata.tags) {
      this.indices.byTag.get(tag)?.delete(id);
    }
    const importanceBucket = Math.floor(entry.metadata.importance * 10);
    this.indices.byImportance.get(importanceBucket)?.delete(id);

    // Remove entry
    this.memories.delete(id);
    this.dirty = true;

    this.emit('deleted', { id });
    return true;
  }

  /**
   * Evict oldest/least important memories
   */
  private async evictOldest(): Promise<void> {
    // Find entries to evict (oldest with lowest importance)
    const entries = Array.from(this.memories.values());
    entries.sort((a, b) => {
      const importanceDiff = a.metadata.importance - b.metadata.importance;
      if (Math.abs(importanceDiff) > 0.2) return importanceDiff;
      return a.metadata.accessed - b.metadata.accessed;
    });

    // Evict 10% of entries
    const evictCount = Math.ceil(this.config.maxEntries * 0.1);
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      await this.delete(entries[i].id);
    }

    this.emit('evicted', { count: evictCount });
  }

  /**
   * Save memories to disk
   */
  public async saveToDisk(): Promise<void> {
    const data = {
      version: 1,
      timestamp: Date.now(),
      entries: Array.from(this.memories.values()),
    };

    let content = JSON.stringify(data, null, 2);

    // Optionally encrypt
    if (this.config.enableEncryption && this.config.encryptionKey) {
      content = this.encrypt(content);
    }

    const filePath = path.join(this.config.storagePath, 'memories.json');
    await fs.promises.writeFile(filePath, content, 'utf-8');

    this.dirty = false;
    this.emit('saved', { entriesCount: this.memories.size });
  }

  /**
   * Load memories from disk
   */
  private async loadFromDisk(): Promise<void> {
    const filePath = path.join(this.config.storagePath, 'memories.json');

    try {
      let content = await fs.promises.readFile(filePath, 'utf-8');

      // Optionally decrypt
      if (this.config.enableEncryption && this.config.encryptionKey) {
        content = this.decrypt(content);
      }

      const data = JSON.parse(content) as {
        version: number;
        timestamp: number;
        entries: MemoryEntry[];
      };

      // Load entries
      for (const entry of data.entries) {
        this.memories.set(entry.id, entry);

        // Rebuild indices
        this.indices.byType.get(entry.type)?.add(entry.id);
        for (const tag of entry.metadata.tags) {
          if (!this.indices.byTag.has(tag)) {
            this.indices.byTag.set(tag, new Set());
          }
          this.indices.byTag.get(tag)?.add(entry.id);
        }
        const importanceBucket = Math.floor(entry.metadata.importance * 10);
        if (!this.indices.byImportance.has(importanceBucket)) {
          this.indices.byImportance.set(importanceBucket, new Set());
        }
        this.indices.byImportance.get(importanceBucket)?.add(entry.id);
      }

      this.emit('loaded', { entriesCount: this.memories.size });
    } catch (error) {
      // File doesn't exist or is corrupted - start fresh
      this.emit('load_error', { error });
    }
  }

  /**
   * Simple encryption using AES-256-GCM
   */
  private encrypt(content: string): string {
    if (!this.config.encryptionKey) return content;

    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
    });
  }

  /**
   * Decrypt content
   */
  private decrypt(content: string): string {
    if (!this.config.encryptionKey) return content;

    const { iv, authTag, data } = JSON.parse(content);
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get memory statistics
   */
  public getStats(): MemoryStats {
    const entries = Array.from(this.memories.values());

    const entriesByType: Record<MemoryType, number> = {
      declarative: this.indices.byType.get('declarative')?.size || 0,
      procedural: this.indices.byType.get('procedural')?.size || 0,
      episodic: this.indices.byType.get('episodic')?.size || 0,
      intentional: this.indices.byType.get('intentional')?.size || 0,
    };

    let totalSize = 0;
    let totalImportance = 0;
    let oldest = Infinity;
    let newest = 0;

    for (const entry of entries) {
      totalSize += entry.content.length;
      totalImportance += entry.metadata.importance;
      oldest = Math.min(oldest, entry.metadata.created);
      newest = Math.max(newest, entry.metadata.created);
    }

    return {
      totalEntries: entries.length,
      entriesByType,
      totalSize,
      oldestEntry: oldest === Infinity ? 0 : oldest,
      newestEntry: newest,
      averageImportance: entries.length > 0 ? totalImportance / entries.length : 0,
    };
  }

  /**
   * Search memories by semantic similarity (requires embeddings)
   */
  public async searchSemantic(
    queryEmbedding: number[],
    options?: { type?: MemoryType; limit?: number; minSimilarity?: number }
  ): Promise<Array<{ entry: MemoryEntry; similarity: number }>> {
    const results: Array<{ entry: MemoryEntry; similarity: number }> = [];

    for (const entry of this.memories.values()) {
      // Filter by type
      if (options?.type && entry.type !== options.type) continue;

      // Skip entries without embeddings
      if (!entry.embedding) continue;

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

      // Filter by minimum similarity
      if (options?.minSimilarity && similarity < options.minSimilarity) continue;

      results.push({ entry, similarity });
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    // Apply limit
    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Create association between memories
   */
  public async associate(id1: string, id2: string): Promise<boolean> {
    const entry1 = this.memories.get(id1);
    const entry2 = this.memories.get(id2);

    if (!entry1 || !entry2) return false;

    // Add bidirectional association
    if (!entry1.metadata.associations.includes(id2)) {
      entry1.metadata.associations.push(id2);
    }
    if (!entry2.metadata.associations.includes(id1)) {
      entry2.metadata.associations.push(id1);
    }

    this.dirty = true;
    this.emit('associated', { id1, id2 });
    return true;
  }

  /**
   * Get associated memories
   */
  public async getAssociations(id: string): Promise<MemoryEntry[]> {
    const entry = this.memories.get(id);
    if (!entry) return [];

    const associations: MemoryEntry[] = [];
    for (const assocId of entry.metadata.associations) {
      const assocEntry = this.memories.get(assocId);
      if (assocEntry) {
        associations.push(assocEntry);
      }
    }

    return associations;
  }

  /**
   * Export all memories
   */
  public async export(): Promise<MemoryEntry[]> {
    return Array.from(this.memories.values());
  }

  /**
   * Import memories
   */
  public async import(entries: MemoryEntry[]): Promise<number> {
    let imported = 0;

    for (const entry of entries) {
      if (!this.memories.has(entry.id)) {
        this.memories.set(entry.id, entry);

        // Update indices
        this.indices.byType.get(entry.type)?.add(entry.id);
        for (const tag of entry.metadata.tags) {
          if (!this.indices.byTag.has(tag)) {
            this.indices.byTag.set(tag, new Set());
          }
          this.indices.byTag.get(tag)?.add(entry.id);
        }

        imported++;
      }
    }

    this.dirty = true;
    this.emit('imported', { count: imported });
    return imported;
  }

  /**
   * Clear all memories
   */
  public async clear(): Promise<void> {
    this.memories.clear();
    
    // Reset indices
    for (const set of this.indices.byType.values()) {
      set.clear();
    }
    this.indices.byTag.clear();
    this.indices.byImportance.clear();

    this.dirty = true;
    this.emit('cleared');
  }
}

export default MemoryPersistence;
