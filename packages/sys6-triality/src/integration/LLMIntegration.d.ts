/**
 * @fileoverview Integration layer between Sys6 Triality and LLM Services
 *
 * This module bridges the Sys6 30-step cognitive cycle with external LLM
 * providers (OpenAI, Anthropic, local models) to create a hybrid cognitive
 * architecture where:
 *
 * - LLM provides semantic understanding and generation
 * - Sys6 provides structured cognitive processing
 * - The combination enables emergent reasoning capabilities
 */
import { ShapedTensor } from '../tensors/index.js';
import { Sys6CycleEngine, CycleResult } from '../engine/Sys6CycleEngine.js';
/**
 * LLM Provider interface for integration
 */
export interface LLMProvider {
    /** Provider name */
    name: string;
    /** Generate embeddings from text */
    embed(text: string): Promise<number[]>;
    /** Generate text completion */
    complete(prompt: string, options?: CompletionOptions): Promise<string>;
    /** Check if provider is available */
    isAvailable(): Promise<boolean>;
}
/**
 * Completion options
 */
export interface CompletionOptions {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    stopSequences?: string[];
}
/**
 * Configuration for Sys6-LLM integration
 */
export interface Sys6LLMConfig {
    /** Dimension for Sys6 state vectors */
    dim: number;
    /** LLM provider to use */
    provider: LLMProvider;
    /** Number of cognitive cycles per inference */
    cyclesPerInference?: number;
    /** Whether to use streaming for LLM calls */
    streaming?: boolean;
}
/**
 * Result from Sys6-LLM integrated processing
 */
export interface IntegratedResult {
    /** Final response text */
    response: string;
    /** Cognitive state after processing */
    cognitiveState: ShapedTensor;
    /** Cycle result from Sys6 engine */
    cycleResult: CycleResult;
    /** Processing metadata */
    metadata: {
        llmLatencyMs: number;
        cycleLatencyMs: number;
        totalLatencyMs: number;
        tokensUsed?: number;
    };
}
/**
 * Cognitive function types for triadic processing
 */
export type CognitiveFunction = 'cognitive' | 'affective' | 'relevance';
/**
 * Sys6-LLM Integration Layer
 *
 * Combines the structured 30-step cognitive cycle with LLM capabilities
 * to create a hybrid cognitive architecture.
 */
export declare class Sys6LLMIntegration {
    private engine;
    private provider;
    private config;
    private embeddingCache;
    constructor(config: Sys6LLMConfig);
    /**
     * Process input through the integrated Sys6-LLM pipeline
     */
    process(input: string, cognitiveFunction?: CognitiveFunction): Promise<IntegratedResult>;
    /**
     * Process through all three cognitive functions (triadic processing)
     */
    processTriadic(input: string): Promise<{
        cognitive: IntegratedResult;
        affective: IntegratedResult;
        relevance: IntegratedResult;
        integrated: string;
    }>;
    /**
     * Get embedding from LLM provider (with caching)
     */
    private getEmbedding;
    /**
     * Convert embedding to Sys6 state tensor
     */
    private embeddingToState;
    /**
     * Extract cognitive output based on function type
     */
    private extractCognitiveOutput;
    /**
     * Find dominant dimensions in state vector
     */
    private findDominantDimensions;
    /**
     * Get phase description
     */
    private getPhaseDescription;
    /**
     * Get stage description
     */
    private getStageDescription;
    /**
     * Describe salience landscape
     */
    private describeSalience;
    /**
     * Generate response using LLM with cognitive context
     */
    private generateResponse;
    /**
     * Get system prompt for cognitive function
     */
    private getSystemPromptForFunction;
    /**
     * Integrate triadic responses into unified output
     */
    private integrateTriadicResponses;
    /**
     * Clear embedding cache
     */
    clearCache(): void;
    /**
     * Get engine for direct access
     */
    getEngine(): Sys6CycleEngine;
    /**
     * Check if provider is available
     */
    isAvailable(): Promise<boolean>;
}
/**
 * Mock LLM Provider for testing
 */
export declare class MockLLMProvider implements LLMProvider {
    name: string;
    embed(text: string): Promise<number[]>;
    complete(prompt: string, options?: CompletionOptions): Promise<string>;
    isAvailable(): Promise<boolean>;
    private hashString;
}
//# sourceMappingURL=LLMIntegration.d.ts.map