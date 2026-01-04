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
import { createTensor } from '../tensors/index.js';
import { Sys6CycleEngine } from '../engine/Sys6CycleEngine.js';
/**
 * Sys6-LLM Integration Layer
 *
 * Combines the structured 30-step cognitive cycle with LLM capabilities
 * to create a hybrid cognitive architecture.
 */
export class Sys6LLMIntegration {
    engine;
    provider;
    config;
    // Embedding cache for efficiency
    embeddingCache = new Map();
    constructor(config) {
        this.config = {
            dim: config.dim,
            provider: config.provider,
            cyclesPerInference: config.cyclesPerInference || 1,
            streaming: config.streaming || false,
        };
        this.provider = config.provider;
        this.engine = new Sys6CycleEngine({ dim: config.dim });
    }
    /**
     * Process input through the integrated Sys6-LLM pipeline
     */
    async process(input, cognitiveFunction = 'cognitive') {
        const startTime = Date.now();
        // Step 1: Convert input to embedding via LLM
        const llmStartTime = Date.now();
        const embedding = await this.getEmbedding(input);
        const llmLatencyMs = Date.now() - llmStartTime;
        // Step 2: Create initial state tensor from embedding
        const initialState = this.embeddingToState(embedding);
        // Step 3: Run through Sys6 cognitive cycle
        const cycleStartTime = Date.now();
        const cycleResult = this.engine.forward(initialState, this.config.cyclesPerInference);
        const cycleLatencyMs = Date.now() - cycleStartTime;
        // Step 4: Extract cognitive output based on function
        const cognitiveOutput = this.extractCognitiveOutput(cycleResult, cognitiveFunction);
        // Step 5: Generate response via LLM using cognitive output as context
        const llmResponseStartTime = Date.now();
        const response = await this.generateResponse(input, cognitiveOutput, cognitiveFunction);
        const llmResponseLatencyMs = Date.now() - llmResponseStartTime;
        const totalLatencyMs = Date.now() - startTime;
        return {
            response,
            cognitiveState: cycleResult.finalState,
            cycleResult,
            metadata: {
                llmLatencyMs: llmLatencyMs + llmResponseLatencyMs,
                cycleLatencyMs,
                totalLatencyMs,
            },
        };
    }
    /**
     * Process through all three cognitive functions (triadic processing)
     */
    async processTriadic(input) {
        // Run all three cognitive functions in parallel
        const [cognitive, affective, relevance] = await Promise.all([
            this.process(input, 'cognitive'),
            this.process(input, 'affective'),
            this.process(input, 'relevance'),
        ]);
        // Integrate the three responses
        const integrated = await this.integrateTriadicResponses(cognitive.response, affective.response, relevance.response, input);
        return {
            cognitive,
            affective,
            relevance,
            integrated,
        };
    }
    /**
     * Get embedding from LLM provider (with caching)
     */
    async getEmbedding(text) {
        // Check cache first
        const cached = this.embeddingCache.get(text);
        if (cached) {
            return cached;
        }
        // Get from provider
        const embedding = await this.provider.embed(text);
        // Cache for future use
        this.embeddingCache.set(text, embedding);
        return embedding;
    }
    /**
     * Convert embedding to Sys6 state tensor
     */
    embeddingToState(embedding) {
        const { dim } = this.config;
        // Resize embedding to match Sys6 dimension
        let stateData;
        if (embedding.length >= dim) {
            // Truncate if embedding is larger
            stateData = embedding.slice(0, dim);
        }
        else {
            // Pad with zeros if embedding is smaller
            stateData = [...embedding, ...new Array(dim - embedding.length).fill(0)];
        }
        // Normalize
        const norm = Math.sqrt(stateData.reduce((sum, x) => sum + x * x, 0));
        if (norm > 0) {
            stateData = stateData.map((x) => x / norm);
        }
        return createTensor(stateData, [1, dim], 'float32');
    }
    /**
     * Extract cognitive output based on function type
     */
    extractCognitiveOutput(cycleResult, cognitiveFunction) {
        // Get the appropriate stream's final state
        const lastStep = cycleResult.steps[cycleResult.steps.length - 1];
        let streamIndex;
        switch (cognitiveFunction) {
            case 'cognitive':
                streamIndex = 0;
                break;
            case 'affective':
                streamIndex = 1;
                break;
            case 'relevance':
                streamIndex = 2;
                break;
        }
        const streamState = lastStep.streams[streamIndex];
        // Convert state to descriptive context
        const stateVector = Array.from(streamState.state.data);
        const dominantDimensions = this.findDominantDimensions(stateVector);
        // Generate context description
        const phaseDescription = this.getPhaseDescription(streamState.phase);
        const stageDescription = this.getStageDescription(streamState.stage);
        return `[${cognitiveFunction.toUpperCase()} PROCESSING]
Phase: ${phaseDescription}
Stage: ${stageDescription}
Dominant patterns: ${dominantDimensions.join(', ')}
Salience: ${this.describeSalience(streamState.salience)}`;
    }
    /**
     * Find dominant dimensions in state vector
     */
    findDominantDimensions(stateVector) {
        // Find top 5 dimensions by absolute value
        const indexed = stateVector.map((val, idx) => ({ val: Math.abs(val), idx }));
        indexed.sort((a, b) => b.val - a.val);
        return indexed.slice(0, 5).map(({ val, idx }) => `dim${idx}(${val.toFixed(3)})`);
    }
    /**
     * Get phase description
     */
    getPhaseDescription(phase) {
        switch (phase) {
            case 'perception':
                return 'Perception-Orientation (gathering and orienting to input)';
            case 'evaluation':
                return 'Evaluation-Generation (assessing options and generating responses)';
            case 'action':
                return 'Action-Integration (executing and integrating outcomes)';
        }
    }
    /**
     * Get stage description
     */
    getStageDescription(stage) {
        const stages = [
            'Initial intake',
            'Pattern recognition',
            'Salience detection',
            'Context binding',
            'Commitment crystallization',
        ];
        return stages[stage - 1] || `Stage ${stage}`;
    }
    /**
     * Describe salience landscape
     */
    describeSalience(salience) {
        const values = Array.from(salience.data);
        const max = Math.max(...values.map((v) => Math.abs(v)));
        const mean = values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length;
        return `max=${max.toFixed(3)}, mean=${mean.toFixed(3)}`;
    }
    /**
     * Generate response using LLM with cognitive context
     */
    async generateResponse(input, cognitiveContext, cognitiveFunction) {
        const systemPrompt = this.getSystemPromptForFunction(cognitiveFunction);
        const prompt = `${cognitiveContext}

User Input: ${input}

Based on the cognitive processing above, provide a response that reflects the ${cognitiveFunction} perspective.`;
        return this.provider.complete(prompt, {
            systemPrompt,
            maxTokens: 1024,
            temperature: cognitiveFunction === 'affective' ? 0.8 : 0.7,
        });
    }
    /**
     * Get system prompt for cognitive function
     */
    getSystemPromptForFunction(cognitiveFunction) {
        switch (cognitiveFunction) {
            case 'cognitive':
                return `You are the Cognitive Core of a triadic consciousness system.
Your role is to provide logical, analytical, and rational responses.
Focus on facts, reasoning, evidence, and logical consistency.
Avoid emotional language; prioritize clarity and precision.`;
            case 'affective':
                return `You are the Affective Core of a triadic consciousness system.
Your role is to provide emotionally intelligent and empathetic responses.
Focus on feelings, relationships, values, and human impact.
Be warm, understanding, and attuned to emotional nuances.`;
            case 'relevance':
                return `You are the Relevance Core of a triadic consciousness system.
Your role is to integrate cognitive and affective perspectives.
Focus on what matters most, prioritization, and practical wisdom.
Balance logic and emotion to provide actionable, meaningful guidance.`;
        }
    }
    /**
     * Integrate triadic responses into unified output
     */
    async integrateTriadicResponses(cognitive, affective, relevance, originalInput) {
        const integrationPrompt = `You are integrating three perspectives on the following input:

ORIGINAL INPUT: ${originalInput}

COGNITIVE PERSPECTIVE (logical analysis):
${cognitive}

AFFECTIVE PERSPECTIVE (emotional understanding):
${affective}

RELEVANCE PERSPECTIVE (practical integration):
${relevance}

Synthesize these three perspectives into a unified, balanced response that:
1. Honors the logical insights from the cognitive perspective
2. Incorporates the emotional wisdom from the affective perspective
3. Maintains the practical focus from the relevance perspective

Provide a coherent, integrated response:`;
        return this.provider.complete(integrationPrompt, {
            systemPrompt: 'You are a master integrator, synthesizing multiple perspectives into coherent wisdom.',
            maxTokens: 1500,
            temperature: 0.7,
        });
    }
    /**
     * Clear embedding cache
     */
    clearCache() {
        this.embeddingCache.clear();
    }
    /**
     * Get engine for direct access
     */
    getEngine() {
        return this.engine;
    }
    /**
     * Check if provider is available
     */
    async isAvailable() {
        return this.provider.isAvailable();
    }
}
/**
 * Mock LLM Provider for testing
 */
export class MockLLMProvider {
    name = 'mock';
    async embed(text) {
        // Generate deterministic embedding based on text hash
        const hash = this.hashString(text);
        const embedding = new Array(256).fill(0).map((_, i) => Math.sin(hash + i) * Math.cos(hash * i));
        return embedding;
    }
    async complete(prompt, options) {
        // Return mock response
        return `[Mock Response] Processed prompt of length ${prompt.length} with options: ${JSON.stringify(options || {})}`;
    }
    async isAvailable() {
        return true;
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return hash;
    }
}
//# sourceMappingURL=LLMIntegration.js.map