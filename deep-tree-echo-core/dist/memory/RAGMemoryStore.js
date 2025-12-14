import { getLogger } from '../utils/logger';
import { InMemoryStorage } from './storage';
const log = getLogger('deep-tree-echo-core/memory/RAGMemoryStore');
// Default configuration
const DEFAULT_MEMORY_LIMIT = 1000;
const DEFAULT_REFLECTION_LIMIT = 100;
/**
 * RAGMemoryStore manages conversation memories using a Retrieval Augmented Generation approach
 * It stores message history, generates embeddings, and retrieves relevant context
 */
export class RAGMemoryStore {
    memories = [];
    reflections = [];
    enabled = false;
    storage;
    memoryLimit;
    reflectionLimit;
    constructor(storage, options) {
        this.storage = storage || new InMemoryStorage();
        this.memoryLimit = options?.memoryLimit || DEFAULT_MEMORY_LIMIT;
        this.reflectionLimit = options?.reflectionLimit || DEFAULT_REFLECTION_LIMIT;
        this.loadMemories();
    }
    /**
     * Enable or disable the memory storage
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        log.info(`Memory system ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Check if memory system is enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Load memories from persistent storage
     */
    async loadMemories() {
        try {
            // Load conversation memories
            const memoriesData = await this.storage.load('deepTreeEchoBotMemories');
            if (memoriesData) {
                try {
                    this.memories = JSON.parse(memoriesData);
                    log.info(`Loaded ${this.memories.length} conversation memories`);
                }
                catch (error) {
                    log.error('Failed to parse conversation memories:', error);
                    this.memories = [];
                }
            }
            // Load reflection memories
            const reflectionsData = await this.storage.load('deepTreeEchoBotReflections');
            if (reflectionsData) {
                try {
                    this.reflections = JSON.parse(reflectionsData);
                    log.info(`Loaded ${this.reflections.length} reflection memories`);
                }
                catch (error) {
                    log.error('Failed to parse reflection memories:', error);
                    this.reflections = [];
                }
            }
            // Load memory enabled setting
            const enabledData = await this.storage.load('deepTreeEchoBotMemoryEnabled');
            this.enabled = enabledData === 'true';
        }
        catch (error) {
            log.error('Failed to load memories:', error);
            this.memories = [];
            this.reflections = [];
        }
    }
    /**
     * Save memories to persistent storage
     */
    async saveMemories() {
        try {
            // Save conversation memories - limit to configured max to prevent excessive storage
            const trimmedMemories = this.memories.slice(-this.memoryLimit);
            await this.storage.save('deepTreeEchoBotMemories', JSON.stringify(trimmedMemories));
            // Save reflection memories - limit to configured max
            const trimmedReflections = this.reflections.slice(-this.reflectionLimit);
            await this.storage.save('deepTreeEchoBotReflections', JSON.stringify(trimmedReflections));
            log.info('Saved memories to persistent storage');
        }
        catch (error) {
            log.error('Failed to save memories:', error);
        }
    }
    /**
     * Store a new memory
     */
    async storeMemory(memory) {
        if (!this.enabled)
            return;
        try {
            const newMemory = {
                ...memory,
                id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                timestamp: Date.now(),
                embedding: [], // In a real implementation, this would be generated
            };
            this.memories.push(newMemory);
            await this.saveMemories();
            log.info(`Stored new memory: ${newMemory.id}`);
        }
        catch (error) {
            log.error('Failed to store memory:', error);
        }
    }
    /**
     * Store a reflection memory
     */
    async storeReflection(content, type = 'periodic', aspect) {
        if (!this.enabled)
            return;
        try {
            const reflection = {
                id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                timestamp: Date.now(),
                content,
                type,
                aspect,
            };
            this.reflections.push(reflection);
            await this.saveMemories();
            log.info(`Stored new ${type} reflection${aspect ? ` on ${aspect}` : ''}`);
        }
        catch (error) {
            log.error('Failed to store reflection:', error);
        }
    }
    /**
     * Retrieve all memories for a specific chat
     */
    getMemoriesByChat(chatId) {
        return this.memories
            .filter(mem => mem.chatId === chatId)
            .sort((a, b) => a.timestamp - b.timestamp);
    }
    /**
     * Retrieve recent memories across all chats, ordered by timestamp
     */
    retrieveRecentMemories(count = 10) {
        return this.memories
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, count)
            .map(mem => `[${new Date(mem.timestamp).toLocaleString()}] ${mem.sender}: ${mem.text}`);
    }
    /**
     * Retrieve recent reflections, ordered by timestamp
     */
    getRecentReflections(count = 5) {
        return this.reflections
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, count);
    }
    /**
     * Clear all memories
     */
    async clearAllMemories() {
        this.memories = [];
        await this.saveMemories();
        log.info('Cleared all conversation memories');
    }
    /**
     * Clear memories for a specific chat
     */
    async clearChatMemories(chatId) {
        this.memories = this.memories.filter(mem => mem.chatId !== chatId);
        await this.saveMemories();
        log.info(`Cleared memories for chat ${chatId}`);
    }
    /**
     * Search memories using semantic search (simplified implementation)
     * In a real implementation, this would use vector similarity search
     */
    searchMemories(query, limit = 5) {
        // Simple keyword-based search as a placeholder
        // In a real implementation, this would use vector embeddings and similarity search
        const normalizedQuery = query.toLowerCase();
        return this.memories
            .filter(mem => mem.text.toLowerCase().includes(normalizedQuery))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    /**
     * Get conversation context for a specific chat
     */
    getConversationContext(chatId, messageLimit = 10) {
        return this.memories
            .filter(mem => mem.chatId === chatId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, messageLimit)
            .sort((a, b) => a.timestamp - b.timestamp);
    }
}
//# sourceMappingURL=RAGMemoryStore.js.map