/**
 * FileSystemStorage Tests
 *
 * Tests the persistent filesystem-backed storage for DTE cognitive state.
 */
import { FileSystemStorage } from '../memory/FileSystemStorage';

describe('FileSystemStorage', () => {
  const testDir = `/tmp/dte-fs-storage-test-${Date.now()}`;
  let storage: FileSystemStorage;

  beforeEach(() => {
    storage = new FileSystemStorage({ storagePath: testDir });
  });

  afterAll(async () => {
    try {
      const fs = await import('node:fs/promises');
      await fs.rm(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  describe('Basic Operations', () => {
    it('should save and load data', async () => {
      await storage.save('test-key', 'test-value');
      const result = await storage.load('test-key');
      expect(result).toBe('test-value');
    });

    it('should return undefined for missing keys', async () => {
      const result = await storage.load('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should overwrite existing data', async () => {
      await storage.save('overwrite-key', 'value-1');
      await storage.save('overwrite-key', 'value-2');
      const result = await storage.load('overwrite-key');
      expect(result).toBe('value-2');
    });

    it('should handle JSON data', async () => {
      const data = { name: 'DTE', version: 1, memories: [1, 2, 3] };
      await storage.save('json-key', JSON.stringify(data));
      const result = await storage.load('json-key');
      expect(JSON.parse(result!)).toEqual(data);
    });

    it('should handle empty strings', async () => {
      await storage.save('empty', '');
      const result = await storage.load('empty');
      expect(result).toBe('');
    });

    it('should handle large data', async () => {
      const largeData = 'x'.repeat(100000);
      await storage.save('large', largeData);
      const result = await storage.load('large');
      expect(result).toBe(largeData);
    });
  });

  describe('Key Management', () => {
    it('should list stored keys', async () => {
      await storage.save('key-a', 'a');
      await storage.save('key-b', 'b');
      const keys = await storage.keys();
      expect(keys).toContain('key-a');
      expect(keys).toContain('key-b');
    });

    it('should delete keys', async () => {
      await storage.save('delete-me', 'data');
      await storage.delete('delete-me');
      const result = await storage.load('delete-me');
      expect(result).toBeUndefined();
    });

    it('should handle deleting non-existent keys', async () => {
      // Should not throw
      await storage.delete('nonexistent');
    });
  });

  describe('Cache', () => {
    it('should serve from cache on repeated reads', async () => {
      await storage.save('cached', 'cached-value');
      const r1 = await storage.load('cached');
      const r2 = await storage.load('cached');
      expect(r1).toBe(r2);
    });
  });

  describe('Clear', () => {
    it('should clear all data', async () => {
      await storage.save('clear-1', 'a');
      await storage.save('clear-2', 'b');
      await storage.clear();
      const keys = await storage.keys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('Sanitization', () => {
    it('should sanitize keys with special characters', async () => {
      await storage.save('key/with/slashes', 'data');
      const result = await storage.load('key/with/slashes');
      expect(result).toBe('data');
    });
  });

  describe('Persistence', () => {
    it('should persist data across instances', async () => {
      const dir = `${testDir}/persist-test`;
      const s1 = new FileSystemStorage({ storagePath: dir });
      await s1.save('persist', 'persistent-data');

      const s2 = new FileSystemStorage({ storagePath: dir });
      const result = await s2.load('persist');
      expect(result).toBe('persistent-data');
    });
  });
});
