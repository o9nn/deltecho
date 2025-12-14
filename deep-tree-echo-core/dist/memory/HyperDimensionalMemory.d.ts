/**
 * HyperDimensionalMemory: Advanced memory architecture that organizes conversations
 * across multiple cognitive dimensions using hypervector encoding
 *
 * Inspired by OpenCog's AtomSpace for persistent AI consciousness with:
 * - Atoms: Individual memories, thoughts, and preferences
 * - Hypergraphs: Relationships between memories across cognitive dimensions
 * - Inference: Recognition of patterns across conversation history
 */
export declare class HyperDimensionalMemory {
    private readonly DIMENSIONS;
    private readonly MEMORY_DECAY;
    private readonly CONTEXT_WINDOW;
    private memoryVectors;
    private conversationHypergraph;
    private temporalIndex;
    private associativeNetwork;
    private emotionalWeighting;
    constructor(options?: {
        dimensions?: number;
        memoryDecay?: number;
        contextWindow?: number;
    });
    /**
     * Creates a hypervector encoding of input text with emotional context
     */
    private createHypervector;
    /**
     * Binds memories together using circular convolution (simplified)
     */
    private bindMemories;
    /**
     * Integrates new memory into the hyperdimensional space
     */
    storeMemory(messageId: string, text: string, timestamp: number, emotionalSignificance?: number): void;
    /**
     * Recalls memories related to query within a context window
     */
    recallMemories(query: string, limit?: number): {
        id: string;
        text: string;
        relevance: number;
    }[];
    /**
     * Finds memories similar to the given vector
     */
    private findRelatedMemories;
    /**
     * Applies natural memory decay to simulate forgetting
     */
    private applyMemoryDecay;
    /**
     * Computes cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Normalizes a vector to unit length
     */
    private normalizeVector;
    /**
     * Creates a deterministic random number generator
     */
    private createPseudoRandomGenerator;
    /**
     * Simple string hash function
     */
    private hashString;
    /**
     * Gets memory text from ID (would connect to storage)
     */
    private getMemoryText;
    /**
     * Exports memory state for persistence
     */
    exportMemoryState(): object;
    /**
     * Imports memory state from persistence
     */
    importMemoryState(state: any): void;
}
//# sourceMappingURL=HyperDimensionalMemory.d.ts.map