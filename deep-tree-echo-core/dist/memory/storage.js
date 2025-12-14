/**
 * In-memory storage implementation (for testing or non-persistent use)
 */
export class InMemoryStorage {
    storage = new Map();
    async load(key) {
        return this.storage.get(key);
    }
    async save(key, value) {
        this.storage.set(key, value);
    }
    clear() {
        this.storage.clear();
    }
}
//# sourceMappingURL=storage.js.map