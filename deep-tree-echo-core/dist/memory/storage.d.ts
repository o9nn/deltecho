/**
 * Storage interface for persisting memories
 * This allows the core package to be runtime-agnostic
 */
export interface MemoryStorage {
    load(key: string): Promise<string | undefined>;
    save(key: string, value: string): Promise<void>;
}
/**
 * In-memory storage implementation (for testing or non-persistent use)
 */
export declare class InMemoryStorage implements MemoryStorage {
    private storage;
    load(key: string): Promise<string | undefined>;
    save(key: string, value: string): Promise<void>;
    clear(): void;
}
//# sourceMappingURL=storage.d.ts.map