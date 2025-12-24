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
            .filter((mem) => mem.chatId === chatId)
            .sort((a, b) => a.timestamp - b.timestamp);
    }
    /**
     * Retrieve recent memories across all chats, ordered by timestamp
     */
    retrieveRecentMemories(count = 10) {
        return this.memories
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, count)
            .map((mem) => `[${new Date(mem.timestamp).toLocaleString()}] ${mem.sender}: ${mem.text}`);
    }
    /**
     * Retrieve recent reflections, ordered by timestamp
     */
    getRecentReflections(count = 5) {
        return this.reflections.sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
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
        this.memories = this.memories.filter((mem) => mem.chatId !== chatId);
        await this.saveMemories();
        log.info(`Cleared memories for chat ${chatId}`);
    }
    /**
     * Search memories using TF-IDF based semantic search
     * Ranks results by relevance score combining term frequency and recency
     */
    searchMemories(query, limit = 5) {
        if (this.memories.length === 0)
            return [];
        // Tokenize query
        const queryTokens = this.tokenize(query);
        if (queryTokens.length === 0)
            return [];
        // Calculate IDF for all terms in corpus
        const idfScores = this.calculateIDF();
        // Score each memory
        const scoredMemories = this.memories.map((memory) => {
            const memoryTokens = this.tokenize(memory.text);
            const tfidfScore = this.calculateTFIDF(queryTokens, memoryTokens, idfScores);
            // Apply recency boost (more recent = higher boost)
            const ageInDays = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
            const recencyBoost = Math.exp(-ageInDays / 30); // Decay over 30 days
            // Combine TF-IDF with recency (70% relevance, 30% recency)
            const finalScore = tfidfScore * 0.7 + recencyBoost * 0.3;
            return { memory, score: finalScore };
        });
        // Filter out zero-score results and sort by score
        return scoredMemories
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((item) => item.memory);
    }
    /**
     * Tokenize text into normalized words
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length > 2 && !this.isStopWord(word));
    }
    /**
     * Check if word is a common stop word
     */
    isStopWord(word) {
        const stopWords = new Set([
            'the',
            'a',
            'an',
            'and',
            'or',
            'but',
            'in',
            'on',
            'at',
            'to',
            'for',
            'of',
            'with',
            'by',
            'from',
            'as',
            'is',
            'was',
            'are',
            'were',
            'been',
            'be',
            'have',
            'has',
            'had',
            'do',
            'does',
            'did',
            'will',
            'would',
            'could',
            'should',
            'may',
            'might',
            'must',
            'shall',
            'can',
            'this',
            'that',
            'these',
            'those',
            'it',
            'its',
            'they',
            'them',
            'their',
            'we',
            'us',
            'our',
            'you',
            'your',
            'he',
            'him',
            'his',
            'she',
            'her',
        ]);
        return stopWords.has(word);
    }
    /**
     * Calculate IDF (Inverse Document Frequency) for all terms
     */
    calculateIDF() {
        const documentFrequency = new Map();
        const totalDocs = this.memories.length;
        // Count document frequency for each term
        this.memories.forEach((memory) => {
            const uniqueTokens = new Set(this.tokenize(memory.text));
            uniqueTokens.forEach((token) => {
                documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
            });
        });
        // Calculate IDF scores
        const idfScores = new Map();
        documentFrequency.forEach((df, term) => {
            // IDF = log(N / df) where N is total documents
            idfScores.set(term, Math.log((totalDocs + 1) / (df + 1)) + 1);
        });
        return idfScores;
    }
    /**
     * Calculate TF-IDF score between query and document
     */
    calculateTFIDF(queryTokens, docTokens, idfScores) {
        if (docTokens.length === 0)
            return 0;
        // Calculate term frequency in document
        const termFreq = new Map();
        docTokens.forEach((token) => {
            termFreq.set(token, (termFreq.get(token) || 0) + 1);
        });
        // Calculate TF-IDF for query terms
        let score = 0;
        const queryTermSet = new Set(queryTokens);
        queryTermSet.forEach((queryTerm) => {
            const tf = (termFreq.get(queryTerm) || 0) / docTokens.length;
            const idf = idfScores.get(queryTerm) || 1;
            score += tf * idf;
        });
        // Normalize by query length
        return score / Math.sqrt(queryTermSet.size);
    }
    /**
     * Find memories similar to a given memory (for clustering/deduplication)
     */
    findSimilarMemories(memoryId, threshold = 0.5) {
        const targetMemory = this.memories.find((m) => m.id === memoryId);
        if (!targetMemory)
            return [];
        const targetTokens = this.tokenize(targetMemory.text);
        const idfScores = this.calculateIDF();
        return this.memories
            .filter((m) => m.id !== memoryId)
            .map((memory) => ({
            memory,
            similarity: this.calculateCosineSimilarity(targetTokens, this.tokenize(memory.text), idfScores),
        }))
            .filter((item) => item.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .map((item) => item.memory);
    }
    /**
     * Calculate cosine similarity between two token sets
     */
    calculateCosineSimilarity(tokens1, tokens2, idfScores) {
        const vec1 = this.createTFIDFVector(tokens1, idfScores);
        const vec2 = this.createTFIDFVector(tokens2, idfScores);
        // Get all unique terms
        const allTerms = new Set([...vec1.keys(), ...vec2.keys()]);
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        allTerms.forEach((term) => {
            const v1 = vec1.get(term) || 0;
            const v2 = vec2.get(term) || 0;
            dotProduct += v1 * v2;
            norm1 += v1 * v1;
            norm2 += v2 * v2;
        });
        if (norm1 === 0 || norm2 === 0)
            return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }
    /**
     * Create TF-IDF vector for tokens
     */
    createTFIDFVector(tokens, idfScores) {
        const vector = new Map();
        const termFreq = new Map();
        tokens.forEach((token) => {
            termFreq.set(token, (termFreq.get(token) || 0) + 1);
        });
        termFreq.forEach((tf, term) => {
            const normalizedTF = tf / tokens.length;
            const idf = idfScores.get(term) || 1;
            vector.set(term, normalizedTF * idf);
        });
        return vector;
    }
    /**
     * Get conversation context for a specific chat
     */
    getConversationContext(chatId, messageLimit = 10) {
        return this.memories
            .filter((mem) => mem.chatId === chatId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, messageLimit)
            .sort((a, b) => a.timestamp - b.timestamp);
    }
}
//# sourceMappingURL=RAGMemoryStore.js.map