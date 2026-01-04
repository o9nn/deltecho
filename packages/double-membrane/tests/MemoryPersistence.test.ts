/**
 * Tests for MemoryPersistence - Real Memory Storage Implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryPersistence } from '../src/inner-membrane/MemoryPersistence';
import * as fs from 'fs';
import * as path from 'path';

describe('MemoryPersistence', () => {
  let persistence: MemoryPersistence;
  const testStoragePath = '/tmp/deltecho-test-memory';

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(testStoragePath, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }

    persistence = new MemoryPersistence({
      storagePath: testStoragePath,
      maxEntries: 100,
      autoSaveInterval: 0, // Disable auto-save for tests
      enableCompression: false,
      enableEncryption: false,
    });

    await persistence.initialize();
  });

  afterEach(async () => {
    await persistence.shutdown();
    
    // Clean up test directory
    try {
      await fs.promises.rm(testStoragePath, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newPersistence = new MemoryPersistence({
        storagePath: testStoragePath + '-init',
        autoSaveInterval: 0,
      });
      await newPersistence.initialize();
      await newPersistence.shutdown();
      
      // Clean up
      try {
        await fs.promises.rm(testStoragePath + '-init', { recursive: true, force: true });
      } catch {
        // Ignore
      }
    });

    it('should emit initialized event', async () => {
      const newPersistence = new MemoryPersistence({
        storagePath: testStoragePath + '-event',
        autoSaveInterval: 0,
      });
      
      const handler = vi.fn();
      newPersistence.on('initialized', handler);
      await newPersistence.initialize();
      
      expect(handler).toHaveBeenCalled();
      await newPersistence.shutdown();
      
      // Clean up
      try {
        await fs.promises.rm(testStoragePath + '-event', { recursive: true, force: true });
      } catch {
        // Ignore
      }
    });
  });

  describe('store', () => {
    it('should store a memory entry', async () => {
      const entry = await persistence.store('declarative', 'Test content');
      
      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.type).toBe('declarative');
      expect(entry.content).toBe('Test content');
    });

    it('should store with metadata', async () => {
      const entry = await persistence.store('procedural', 'How to test', {
        importance: 0.8,
        tags: ['testing', 'howto'],
        source: 'unit-test',
      });
      
      expect(entry.metadata.importance).toBe(0.8);
      expect(entry.metadata.tags).toContain('testing');
      expect(entry.metadata.source).toBe('unit-test');
    });

    it('should store all memory types', async () => {
      const types = ['declarative', 'procedural', 'episodic', 'intentional'] as const;
      
      for (const type of types) {
        const entry = await persistence.store(type, `Content for ${type}`);
        expect(entry.type).toBe(type);
      }
    });

    it('should emit stored event', async () => {
      const handler = vi.fn();
      persistence.on('stored', handler);
      
      await persistence.store('declarative', 'Test');
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('retrieve', () => {
    it('should retrieve a stored entry', async () => {
      const stored = await persistence.store('declarative', 'Test content');
      const retrieved = await persistence.retrieve(stored.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(stored.id);
      expect(retrieved?.content).toBe('Test content');
    });

    it('should return null for non-existent entry', async () => {
      const retrieved = await persistence.retrieve('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should update access metadata on retrieve', async () => {
      const stored = await persistence.store('declarative', 'Test');
      const initialAccess = stored.metadata.accessCount;
      
      await persistence.retrieve(stored.id);
      const retrieved = await persistence.retrieve(stored.id);
      
      expect(retrieved?.metadata.accessCount).toBeGreaterThan(initialAccess);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Store some test entries
      await persistence.store('declarative', 'Fact about TypeScript', {
        importance: 0.9,
        tags: ['typescript', 'programming'],
      });
      await persistence.store('procedural', 'How to write tests', {
        importance: 0.7,
        tags: ['testing', 'programming'],
      });
      await persistence.store('episodic', 'Yesterday I learned about testing', {
        importance: 0.5,
        tags: ['testing', 'learning'],
      });
    });

    it('should query by type', async () => {
      const results = await persistence.query({ type: 'declarative' });
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('declarative');
    });

    it('should query by tags', async () => {
      const results = await persistence.query({ tags: ['testing'] });
      expect(results.length).toBe(2);
    });

    it('should query by minimum importance', async () => {
      const results = await persistence.query({ minImportance: 0.8 });
      expect(results.length).toBe(1);
      expect(results[0].metadata.importance).toBeGreaterThanOrEqual(0.8);
    });

    it('should query by search text', async () => {
      const results = await persistence.query({ searchText: 'TypeScript' });
      expect(results.length).toBe(1);
      expect(results[0].content).toContain('TypeScript');
    });

    it('should limit results', async () => {
      const results = await persistence.query({ limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should sort by importance and recency', async () => {
      const results = await persistence.query({});
      
      // Results should be sorted by importance (descending)
      for (let i = 1; i < results.length; i++) {
        const diff = results[i - 1].metadata.importance - results[i].metadata.importance;
        // Allow for equal importance (then sorted by recency)
        expect(diff).toBeGreaterThanOrEqual(-0.1);
      }
    });
  });

  describe('update', () => {
    it('should update content', async () => {
      const stored = await persistence.store('declarative', 'Original content');
      const updated = await persistence.update(stored.id, { content: 'Updated content' });
      
      expect(updated?.content).toBe('Updated content');
    });

    it('should update importance', async () => {
      const stored = await persistence.store('declarative', 'Test', { importance: 0.5 });
      const updated = await persistence.update(stored.id, { importance: 0.9 });
      
      expect(updated?.metadata.importance).toBe(0.9);
    });

    it('should update tags', async () => {
      const stored = await persistence.store('declarative', 'Test', { tags: ['old'] });
      const updated = await persistence.update(stored.id, { tags: ['new', 'updated'] });
      
      expect(updated?.metadata.tags).toContain('new');
      expect(updated?.metadata.tags).toContain('updated');
      expect(updated?.metadata.tags).not.toContain('old');
    });

    it('should return null for non-existent entry', async () => {
      const updated = await persistence.update('non-existent', { content: 'Test' });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an entry', async () => {
      const stored = await persistence.store('declarative', 'Test');
      const deleted = await persistence.delete(stored.id);
      
      expect(deleted).toBe(true);
      
      const retrieved = await persistence.retrieve(stored.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent entry', async () => {
      const deleted = await persistence.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('associations', () => {
    it('should create associations between entries', async () => {
      const entry1 = await persistence.store('declarative', 'Entry 1');
      const entry2 = await persistence.store('declarative', 'Entry 2');
      
      const associated = await persistence.associate(entry1.id, entry2.id);
      expect(associated).toBe(true);
    });

    it('should retrieve associations', async () => {
      const entry1 = await persistence.store('declarative', 'Entry 1');
      const entry2 = await persistence.store('declarative', 'Entry 2');
      
      await persistence.associate(entry1.id, entry2.id);
      
      const associations = await persistence.getAssociations(entry1.id);
      expect(associations.length).toBe(1);
      expect(associations[0].id).toBe(entry2.id);
    });

    it('should create bidirectional associations', async () => {
      const entry1 = await persistence.store('declarative', 'Entry 1');
      const entry2 = await persistence.store('declarative', 'Entry 2');
      
      await persistence.associate(entry1.id, entry2.id);
      
      const assoc1 = await persistence.getAssociations(entry1.id);
      const assoc2 = await persistence.getAssociations(entry2.id);
      
      expect(assoc1.some(a => a.id === entry2.id)).toBe(true);
      expect(assoc2.some(a => a.id === entry1.id)).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should return correct statistics', async () => {
      await persistence.store('declarative', 'Fact 1', { importance: 0.8 });
      await persistence.store('procedural', 'How to 1', { importance: 0.6 });
      await persistence.store('episodic', 'Event 1', { importance: 0.4 });
      
      const stats = persistence.getStats();
      
      expect(stats.totalEntries).toBe(3);
      expect(stats.entriesByType.declarative).toBe(1);
      expect(stats.entriesByType.procedural).toBe(1);
      expect(stats.entriesByType.episodic).toBe(1);
      expect(stats.averageImportance).toBeCloseTo(0.6, 1);
    });
  });

  describe('export/import', () => {
    it('should export all entries', async () => {
      await persistence.store('declarative', 'Entry 1');
      await persistence.store('procedural', 'Entry 2');
      
      const exported = await persistence.export();
      expect(exported.length).toBe(2);
    });

    it('should import entries', async () => {
      const entry1 = await persistence.store('declarative', 'Entry 1');
      const exported = await persistence.export();
      
      // Clear and reimport
      await persistence.clear();
      const imported = await persistence.import(exported);
      
      expect(imported).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await persistence.store('declarative', 'Entry 1');
      await persistence.store('procedural', 'Entry 2');
      
      await persistence.clear();
      
      const stats = persistence.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('persistence', () => {
    it('should save to disk', async () => {
      await persistence.store('declarative', 'Test entry');
      await persistence.saveToDisk();
      
      const filePath = path.join(testStoragePath, 'memories.json');
      const exists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should load from disk on initialize', async () => {
      await persistence.store('declarative', 'Persistent entry');
      await persistence.saveToDisk();
      await persistence.shutdown();
      
      // Create new instance
      const newPersistence = new MemoryPersistence({
        storagePath: testStoragePath,
        autoSaveInterval: 0,
      });
      await newPersistence.initialize();
      
      const stats = newPersistence.getStats();
      expect(stats.totalEntries).toBe(1);
      
      await newPersistence.shutdown();
    });
  });
});
