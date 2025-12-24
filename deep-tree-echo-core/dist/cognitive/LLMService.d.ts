/**
 * Supported LLM provider types
 */
export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';
/**
 * Structure for a conversation memory (shared with RAGMemoryStore)
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
 * Configuration for a single LLM service instance
 */
export interface LLMServiceConfig {
    apiKey: string;
    apiEndpoint: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    provider?: LLMProvider;
    systemPrompt?: string;
}
/**
 * Represents a cognitive or memory function with its own API key
 */
export interface CognitiveFunction {
    id: string;
    name: string;
    description: string;
    config: LLMServiceConfig;
    usage: {
        totalTokens: number;
        lastUsed: number;
        requestCount: number;
    };
}
/**
 * Types of cognitive functions supported by the service
 */
export declare enum CognitiveFunctionType {
    COGNITIVE_CORE = "cognitive_core",
    AFFECTIVE_CORE = "affective_core",
    RELEVANCE_CORE = "relevance_core",
    SEMANTIC_MEMORY = "semantic_memory",
    EPISODIC_MEMORY = "episodic_memory",
    PROCEDURAL_MEMORY = "procedural_memory",
    CONTENT_EVALUATION = "content_evaluation",
    GENERAL = "general"
}
/**
 * Grouped cognitive function result from parallel processing
 */
export interface ParallelCognitiveResult {
    processing: Record<CognitiveFunctionType, string>;
    integratedResponse: string;
    insights: Record<string, any>;
}
/**
 * Service for interacting with Language Model APIs
 * Supports multiple API keys for different cognitive functions
 */
export declare class LLMService {
    private cognitiveFunctions;
    private defaultConfig;
    constructor();
    /**
     * Set configuration for a specific cognitive function
     */
    setFunctionConfig(functionType: CognitiveFunctionType, config: Partial<LLMServiceConfig>): void;
    /**
     * Get a readable function name for logging
     */
    private getFunctionName;
    /**
     * Get function description for logging and UI
     */
    private getFunctionDescription;
    /**
     * Set configuration for the general/default function
     * Backward compatibility with the previous single-key implementation
     */
    setConfig(config: Partial<LLMServiceConfig>): void;
    /**
     * Get all configured cognitive functions
     */
    getAllFunctions(): CognitiveFunction[];
    /**
     * Get all functioning cognitive cores
     */
    getActiveFunctions(): CognitiveFunction[];
    /**
     * Check if a specific cognitive function is configured
     */
    isFunctionConfigured(functionType: CognitiveFunctionType): boolean;
    /**
     * Get the best available cognitive function for a specific type
     * Falls back to general function if specific function not available
     */
    private getBestAvailableFunction;
    /**
     * Detect the LLM provider from the API endpoint
     */
    private detectProvider;
    /**
     * Call the LLM API with the given messages
     */
    private callLLMAPI;
    /**
     * Call OpenAI-compatible API (OpenAI, Ollama, custom endpoints)
     */
    private callOpenAICompatibleAPI;
    /**
     * Call Anthropic Claude API
     */
    private callAnthropicAPI;
    /**
     * Get the system prompt for a cognitive function type
     */
    private getSystemPromptForFunction;
    /**
     * Generate a response using the default/general cognitive function
     * Maintains backward compatibility with the original implementation
     */
    generateResponse(input: string, context?: string[]): Promise<string>;
    /**
     * Generate a response using a specific cognitive function
     */
    generateResponseWithFunction(functionType: CognitiveFunctionType, input: string, context?: string[]): Promise<string>;
    /**
     * Get a placeholder response for when API calls fail
     */
    private getPlaceholderResponse;
    /**
     * Generate responses from multiple cognitive functions and combine them
     */
    generateParallelResponses(input: string, functionTypes: CognitiveFunctionType[], context?: string[]): Promise<Record<CognitiveFunctionType, string>>;
    /**
     * Generate a complete response using all available cognitive systems in parallel
     * This leverages the multi-key architecture for truly parallel processing
     */
    generateFullParallelResponse(input: string, context?: string[]): Promise<ParallelCognitiveResult>;
    /**
     * Extract responses from cognitive domain functions
     */
    private extractCognitiveDomainResponses;
    /**
     * Extract responses from memory domain functions
     */
    private extractMemoryDomainResponses;
    /**
     * Integrate responses from different cognitive domains
     */
    private integrateResponses;
    /**
     * Analyze a message using parallel cognitive processes
     */
    analyzeMessage(message: string): Promise<Record<string, any>>;
    /**
     * Generate reflection content for self-reflection process
     * Uses Cognitive, Affective, and Relevance cores in parallel
     */
    generateReflection(reflectionPrompt: string): Promise<string>;
    /**
     * Placeholder reflection response
     */
    private getPlaceholderReflection;
    /**
     * Analyze content for potential sensitivity issues using the specialized content evaluation function
     */
    evaluateContent(content: string): Promise<{
        isSensitive: boolean;
        category?: 'violence' | 'sexual' | 'other';
        explanation: string;
        recommendedAction: 'respond_normally' | 'respond_with_humor' | 'de_escalate' | 'decline';
    }>;
    /**
     * Analyze an image using vision capabilities
     */
    analyzeImage(imageData: string): Promise<string>;
}
//# sourceMappingURL=LLMService.d.ts.map