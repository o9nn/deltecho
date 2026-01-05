/**
 * LLaMA React Native Module
 *
 * Provides on-device LLaMA inference for React Native applications
 * using the native libraries (libllama.so, libggml.so).
 *
 * Features:
 * - Native LLaMA inference via JNI bridge
 * - Streaming token generation
 * - Context management
 * - Model loading and unloading
 * - Memory-efficient inference
 */

import { EventEmitter } from 'events';

/**
 * LLaMA model configuration
 */
export interface LlamaModelConfig {
  modelPath: string;
  contextSize: number;
  batchSize: number;
  numThreads: number;
  gpuLayers: number;
  useMmap: boolean;
  useMlock: boolean;
  vocabOnly: boolean;
  seed: number;
}

/**
 * Generation parameters
 */
export interface GenerationParams {
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  presencePenalty: number;
  frequencyPenalty: number;
  stopSequences: string[];
  stream: boolean;
}

/**
 * Token generation result
 */
export interface TokenResult {
  token: string;
  tokenId: number;
  logprob: number;
  isEos: boolean;
  position: number;
}

/**
 * Completion result
 */
export interface CompletionResult {
  text: string;
  tokens: TokenResult[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  generationTimeMs: number;
  tokensPerSecond: number;
}

/**
 * Model information
 */
export interface ModelInfo {
  name: string;
  architecture: string;
  contextLength: number;
  embeddingLength: number;
  vocabSize: number;
  quantization: string;
  fileSize: number;
}

/**
 * Native module interface (to be implemented by platform-specific code)
 */
export interface NativeLlamaModule {
  loadModel(config: LlamaModelConfig): Promise<boolean>;
  unloadModel(): Promise<void>;
  getModelInfo(): Promise<ModelInfo | null>;
  generate(prompt: string, params: GenerationParams): Promise<CompletionResult>;
  generateStream(
    prompt: string,
    params: GenerationParams,
    onToken: (token: TokenResult) => void
  ): Promise<CompletionResult>;
  tokenize(text: string): Promise<number[]>;
  detokenize(tokens: number[]): Promise<string>;
  getContextSize(): number;
  getUsedContextSize(): number;
  clearContext(): void;
  isModelLoaded(): boolean;
}

const DEFAULT_MODEL_CONFIG: LlamaModelConfig = {
  modelPath: '',
  contextSize: 4096,
  batchSize: 512,
  numThreads: 4,
  gpuLayers: 0,
  useMmap: true,
  useMlock: false,
  vocabOnly: false,
  seed: -1,
};

const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  maxTokens: 256,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  presencePenalty: 0.0,
  frequencyPenalty: 0.0,
  stopSequences: [],
  stream: false,
};

/**
 * LLaMA React Native Bridge
 *
 * High-level interface for LLaMA inference in React Native.
 */
export class LlamaReactNativeBridge extends EventEmitter {
  private nativeModule: NativeLlamaModule | null = null;
  private modelConfig: LlamaModelConfig | null = null;
  private modelInfo: ModelInfo | null = null;
  private isLoaded: boolean = false;

  // Metrics
  private metrics = {
    totalGenerations: 0,
    totalTokensGenerated: 0,
    averageTokensPerSecond: 0,
    totalGenerationTimeMs: 0,
  };

  constructor() {
    super();
  }

  /**
   * Set the native module implementation
   */
  setNativeModule(module: NativeLlamaModule): void {
    this.nativeModule = module;
    this.emit('native_module_set');
  }

  /**
   * Load a LLaMA model
   */
  async loadModel(config: Partial<LlamaModelConfig>): Promise<boolean> {
    if (!this.nativeModule) {
      throw new Error('Native module not set. Call setNativeModule() first.');
    }

    this.modelConfig = { ...DEFAULT_MODEL_CONFIG, ...config };

    try {
      this.emit('model_loading', { path: this.modelConfig.modelPath });

      const success = await this.nativeModule.loadModel(this.modelConfig);

      if (success) {
        this.modelInfo = await this.nativeModule.getModelInfo();
        this.isLoaded = true;
        this.emit('model_loaded', { info: this.modelInfo });
      } else {
        this.emit('model_load_failed', { config: this.modelConfig });
      }

      return success;
    } catch (error) {
      this.emit('error', { type: 'model_load', error });
      return false;
    }
  }

  /**
   * Unload the current model
   */
  async unloadModel(): Promise<void> {
    if (!this.nativeModule || !this.isLoaded) {
      return;
    }

    try {
      await this.nativeModule.unloadModel();
      this.isLoaded = false;
      this.modelInfo = null;
      this.emit('model_unloaded');
    } catch (error) {
      this.emit('error', { type: 'model_unload', error });
    }
  }

  /**
   * Generate completion for a prompt
   */
  async generate(
    prompt: string,
    params: Partial<GenerationParams> = {}
  ): Promise<CompletionResult> {
    if (!this.nativeModule || !this.isLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    const generationParams = { ...DEFAULT_GENERATION_PARAMS, ...params };
    const startTime = performance.now();

    try {
      this.emit('generation_started', { prompt, params: generationParams });

      let result: CompletionResult;

      if (generationParams.stream) {
        result = await this.nativeModule.generateStream(prompt, generationParams, (token) => {
          this.emit('token', token);
        });
      } else {
        result = await this.nativeModule.generate(prompt, generationParams);
      }

      // Update metrics
      this.updateMetrics(result);

      this.emit('generation_complete', result);
      return result;
    } catch (error) {
      const endTime = performance.now();
      this.emit('error', { type: 'generation', error });

      return {
        text: '',
        tokens: [],
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        generationTimeMs: endTime - startTime,
        tokensPerSecond: 0,
      };
    }
  }

  /**
   * Generate with streaming callback
   */
  async generateStream(
    prompt: string,
    params: Partial<GenerationParams> = {},
    onToken: (token: TokenResult) => void
  ): Promise<CompletionResult> {
    return this.generate(prompt, { ...params, stream: true });
  }

  /**
   * Tokenize text
   */
  async tokenize(text: string): Promise<number[]> {
    if (!this.nativeModule || !this.isLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    return this.nativeModule.tokenize(text);
  }

  /**
   * Detokenize token IDs
   */
  async detokenize(tokens: number[]): Promise<string> {
    if (!this.nativeModule || !this.isLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    return this.nativeModule.detokenize(tokens);
  }

  /**
   * Get model information
   */
  getModelInfo(): ModelInfo | null {
    return this.modelInfo;
  }

  /**
   * Get context size
   */
  getContextSize(): number {
    if (!this.nativeModule || !this.isLoaded) {
      return 0;
    }
    return this.nativeModule.getContextSize();
  }

  /**
   * Get used context size
   */
  getUsedContextSize(): number {
    if (!this.nativeModule || !this.isLoaded) {
      return 0;
    }
    return this.nativeModule.getUsedContextSize();
  }

  /**
   * Clear context
   */
  clearContext(): void {
    if (!this.nativeModule || !this.isLoaded) {
      return;
    }
    this.nativeModule.clearContext();
    this.emit('context_cleared');
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Update metrics after generation
   */
  private updateMetrics(result: CompletionResult): void {
    this.metrics.totalGenerations++;
    this.metrics.totalTokensGenerated += result.completionTokens;
    this.metrics.totalGenerationTimeMs += result.generationTimeMs;

    // Update average tokens per second
    const totalSeconds = this.metrics.totalGenerationTimeMs / 1000;
    this.metrics.averageTokensPerSecond =
      totalSeconds > 0 ? this.metrics.totalTokensGenerated / totalSeconds : 0;
  }
}

/**
 * Mock native module for testing
 */
export class MockNativeLlamaModule implements NativeLlamaModule {
  private loaded: boolean = false;
  private contextSize: number = 4096;
  private usedContext: number = 0;

  async loadModel(config: LlamaModelConfig): Promise<boolean> {
    this.contextSize = config.contextSize;
    this.loaded = true;
    return true;
  }

  async unloadModel(): Promise<void> {
    this.loaded = false;
    this.usedContext = 0;
  }

  async getModelInfo(): Promise<ModelInfo | null> {
    if (!this.loaded) return null;

    return {
      name: 'mock-llama-7b',
      architecture: 'llama',
      contextLength: this.contextSize,
      embeddingLength: 4096,
      vocabSize: 32000,
      quantization: 'Q4_K_M',
      fileSize: 4000000000,
    };
  }

  async generate(prompt: string, params: GenerationParams): Promise<CompletionResult> {
    const tokens: TokenResult[] = [];
    const words = ['Hello', ',', ' ', 'I', ' ', 'am', ' ', 'a', ' ', 'mock', ' ', 'response', '.'];

    for (let i = 0; i < Math.min(params.maxTokens, words.length); i++) {
      tokens.push({
        token: words[i],
        tokenId: i + 1000,
        logprob: -0.5,
        isEos: i === words.length - 1,
        position: i,
      });
    }

    const text = tokens.map((t) => t.token).join('');
    const promptTokens = Math.ceil(prompt.length / 4);

    this.usedContext += promptTokens + tokens.length;

    return {
      text,
      tokens,
      promptTokens,
      completionTokens: tokens.length,
      totalTokens: promptTokens + tokens.length,
      generationTimeMs: tokens.length * 50,
      tokensPerSecond: 20,
    };
  }

  async generateStream(
    prompt: string,
    params: GenerationParams,
    onToken: (token: TokenResult) => void
  ): Promise<CompletionResult> {
    const result = await this.generate(prompt, params);

    for (const token of result.tokens) {
      onToken(token);
      await new Promise((r) => setTimeout(r, 50));
    }

    return result;
  }

  async tokenize(text: string): Promise<number[]> {
    // Simple mock tokenization
    return text.split('').map((_, i) => 1000 + i);
  }

  async detokenize(tokens: number[]): Promise<string> {
    // Simple mock detokenization
    return tokens.map((t) => String.fromCharCode((t % 26) + 97)).join('');
  }

  getContextSize(): number {
    return this.contextSize;
  }

  getUsedContextSize(): number {
    return this.usedContext;
  }

  clearContext(): void {
    this.usedContext = 0;
  }

  isModelLoaded(): boolean {
    return this.loaded;
  }
}

/**
 * Create a LLaMA React Native bridge instance
 */
export function createLlamaReactNativeBridge(): LlamaReactNativeBridge {
  return new LlamaReactNativeBridge();
}

/**
 * Create a mock native module for testing
 */
export function createMockNativeModule(): MockNativeLlamaModule {
  return new MockNativeLlamaModule();
}

export default LlamaReactNativeBridge;
