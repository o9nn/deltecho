import { MemoryStorage } from './storage';
/**
 * Structure for a conversation memory
 */
export interface Memory {
    id: string;
    timestamp: number;
    chatId: number;
    messageId: number;
    sender: 'user' | 'bot';
    text: string;
    embedding?: number[];
}
/**
 * Structure for a reflection memory
 */
export interface ReflectionMemory {
    id: string;
    timestamp: number;
    content: string;
    type: 'periodic' | 'focused';
    aspect?: string;
}
/**
 * RAGMemoryStore manages conversation memories using a Retrieval Augmented Generation approach
 * It stores message history, generates embeddings, and retrieves relevant context
 */
export declare class RAGMemoryStore {
    private memories;
    private reflections;
    private enabled;
    private storage;
    private memoryLimit;
    private reflectionLimit;
    constructor(storage?: MemoryStorage, options?: {
        memoryLimit?: number;
        reflectionLimit?: number;
    });
    /**
     * Enable or disable the memory storage
     */
    setEnabled(enabled: boolean): void;
    /**
     * Check if memory system is enabled
     */
    isEnabled(): boolean;
    /**
     * Load memories from persistent storage
     */
    private loadMemories;
    /**
     * Save memories to persistent storage
     */
    private saveMemories;
    /**
     * Store a new memory
     */
    storeMemory(memory: Omit<Memory, 'id' | 'timestamp' | 'embedding'>): Promise<void>;
    /**
     * Store a reflection memory
     */
    storeReflection(content: string, type?: 'periodic' | 'focused', aspect?: string): Promise<void>;
    /**
     * Retrieve all memories for a specific chat
     */
    getMemoriesByChat(chatId: number): Memory[];
    /**
     * Retrieve recent memories across all chats, ordered by timestamp
     */
    retrieveRecentMemories(count?: number): string[];
    /**
     * Retrieve recent reflections, ordered by timestamp
     */
    getRecentReflections(count?: number): ReflectionMemory[];
    /**
     * Clear all memories
     */
    clearAllMemories(): Promise<void>;
    /**
     * Clear memories for a specific chat
     */
    clearChatMemories(chatId: number): Promise<void>;
    /**
     * Search memories using TF-IDF based semantic search
     * Ranks results by relevance score combining term frequency and recency
     */
    searchMemories(query: string, limit?: number): Memory[];
    /**
     * Tokenize text into normalized words
     */
    private tokenize;
    /**
     * Check if word is a common stop word
     */
    private isStopWord;
    /**
     * Calculate IDF (Inverse Document Frequency) for all terms
     */
    private calculateIDF;
    /**
     * Calculate TF-IDF score between query and document
     */
    private calculateTFIDF;
    /**
     * Find memories similar to a given memory (for clustering/deduplication)
     */
    findSimilarMemories(memoryId: string, threshold?: number): Memory[];
    /**
     * Calculate cosine similarity between two token sets
     */
    private calculateCosineSimilarity;
    /**
     * Create TF-IDF vector for tokens
     */
    private createTFIDFVector;
    /**
     * Get conversation context for a specific chat
     */
    getConversationContext(chatId: number, messageLimit?: number): Memory[];
}
//# sourceMappingURL=RAGMemoryStore.d.ts.map