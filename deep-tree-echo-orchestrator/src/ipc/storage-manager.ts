/**
 * Simple key-value storage manager for the orchestrator
 * 
 * This provides persistent storage for desktop applications through the IPC server.
 * In a production system, this could be backed by SQLite, Redis, or another
 * persistent storage mechanism.
 */
export class StorageManager {
  private storage: Map<string, string> = new Map();
  private persistencePath?: string;

  constructor(persistencePath?: string) {
    this.persistencePath = persistencePath;
    // TODO: Load from persistent storage if path is provided
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | undefined> {
    return this.storage.get(key);
  }

  /**
   * Set a value for a key
   */
  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
    // TODO: Persist to storage if persistence path is configured
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
    // TODO: Persist deletion if persistence path is configured
  }

  /**
   * Clear all keys matching a prefix
   */
  async clear(prefix: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.storage.delete(key);
    }
    // TODO: Persist changes if persistence path is configured
  }

  /**
   * Get all keys matching a prefix
   */
  async keys(prefix?: string): Promise<string[]> {
    const allKeys = Array.from(this.storage.keys());
    
    if (prefix) {
      return allKeys.filter(key => key.startsWith(prefix));
    }
    
    return allKeys;
  }

  /**
   * Get storage size (number of keys)
   */
  size(): number {
    return this.storage.size;
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.storage.has(key);
  }
}
