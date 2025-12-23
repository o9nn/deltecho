# LLM Service API Reference

This document provides a comprehensive API reference for the Deltecho LLM services.

## Table of Contents

1. [UnifiedLLMService](#unifiedllmservice)
2. [LLMProviderRegistry](#llmproviderregistry)
3. [OpenAIProvider](#openaiprovider)
4. [AnthropicProvider](#anthropicprovider)
5. [LLMIntegration](#llmintegration)
6. [Types and Interfaces](#types-and-interfaces)

---

## UnifiedLLMService

The main service class for cognitive AI processing with triadic architecture support.

### Import

```typescript
import { UnifiedLLMService, CognitiveFunction } from 'deep-tree-echo-core';
```

### Constructor

```typescript
new UnifiedLLMService(config: UnifiedLLMServiceConfig)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config.defaultProvider` | `string` | Default provider name ('openai' or 'anthropic') |
| `config.registry` | `LLMProviderRegistry` | Provider registry instance |

### Methods

#### initialize()

Initialize the service and verify provider connectivity.

```typescript
async initialize(): Promise<void>
```

**Example:**
```typescript
const service = new UnifiedLLMService({ defaultProvider: 'openai', registry });
await service.initialize();
```

#### process()

Process input through a specific cognitive function.

```typescript
async process(
  input: string,
  cognitiveFunction: CognitiveFunction,
  options?: ProcessOptions
): Promise<LLMResponse>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string` | The input text to process |
| `cognitiveFunction` | `CognitiveFunction` | The cognitive function to use |
| `options.provider` | `string` | Optional: Override default provider |
| `options.temperature` | `number` | Optional: Override temperature (0-1) |
| `options.maxTokens` | `number` | Optional: Override max tokens |

**Returns:** `Promise<LLMResponse>`

**Example:**
```typescript
const response = await service.process(
  "Analyze the market trends",
  CognitiveFunction.COGNITIVE_CORE
);
console.log(response.content);
```

#### processTriadic()

Process input through all three cognitive cores in parallel.

```typescript
async processTriadic(input: string): Promise<TriadicResponse>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string` | The input text to process |

**Returns:** `Promise<TriadicResponse>`

**Example:**
```typescript
const result = await service.processTriadic("Should we expand internationally?");
console.log(result.cognitive);  // Logical analysis
console.log(result.affective);  // Emotional considerations
console.log(result.relevance);  // Integration
console.log(result.synthesis);  // Unified response
```

#### processStream()

Process input with streaming response.

```typescript
async processStream(
  input: string,
  cognitiveFunction: CognitiveFunction
): AsyncGenerator<StreamChunk>
```

**Example:**
```typescript
const stream = await service.processStream(
  "Explain quantum computing",
  CognitiveFunction.COGNITIVE_CORE
);

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

#### getProviderHealth()

Check the health status of all configured providers.

```typescript
async getProviderHealth(): Promise<Record<string, ProviderHealth>>
```

**Returns:** Object with provider names as keys and health status as values.

**Example:**
```typescript
const health = await service.getProviderHealth();
// { openai: { available: true, latency: 245 }, anthropic: { available: true, latency: 312 } }
```

#### shutdown()

Gracefully shutdown the service.

```typescript
async shutdown(): Promise<void>
```

---

## LLMProviderRegistry

Registry for managing LLM providers.

### Import

```typescript
import { LLMProviderRegistry } from 'deep-tree-echo-core';
```

### Methods

#### getInstance()

Get the singleton instance.

```typescript
static getInstance(): LLMProviderRegistry
```

#### register()

Register a new provider.

```typescript
register(provider: LLMProvider): void
```

**Example:**
```typescript
const registry = LLMProviderRegistry.getInstance();
registry.register(new OpenAIProvider({ apiKey: 'sk-...' }));
```

#### get()

Get a registered provider by name.

```typescript
get(name: string): LLMProvider | undefined
```

#### list()

List all registered provider names.

```typescript
list(): string[]
```

---

## OpenAIProvider

Provider implementation for OpenAI API.

### Import

```typescript
import { OpenAIProvider } from 'deep-tree-echo-core';
```

### Constructor

```typescript
new OpenAIProvider(config: OpenAIProviderConfig)
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `apiKey` | `string` | Required | OpenAI API key |
| `model` | `string` | `'gpt-4-turbo-preview'` | Model to use |
| `temperature` | `number` | `0.7` | Sampling temperature |
| `maxTokens` | `number` | `2000` | Maximum tokens in response |
| `baseUrl` | `string` | `'https://api.openai.com/v1'` | API base URL |

**Example:**
```typescript
const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
});
```

### Supported Models

| Model | Description |
|-------|-------------|
| `gpt-4-turbo-preview` | Latest GPT-4 Turbo (recommended) |
| `gpt-4` | GPT-4 base model |
| `gpt-4-32k` | GPT-4 with 32k context |
| `gpt-3.5-turbo` | Fast and cost-effective |
| `gpt-3.5-turbo-16k` | GPT-3.5 with 16k context |

---

## AnthropicProvider

Provider implementation for Anthropic Claude API.

### Import

```typescript
import { AnthropicProvider } from 'deep-tree-echo-core';
```

### Constructor

```typescript
new AnthropicProvider(config: AnthropicProviderConfig)
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `apiKey` | `string` | Required | Anthropic API key |
| `model` | `string` | `'claude-3-sonnet-20240229'` | Model to use |
| `temperature` | `number` | `0.7` | Sampling temperature |
| `maxTokens` | `number` | `2000` | Maximum tokens in response |

**Example:**
```typescript
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-opus-20240229',
});
```

### Supported Models

| Model | Description |
|-------|-------------|
| `claude-3-opus-20240229` | Most capable Claude model |
| `claude-3-sonnet-20240229` | Balanced performance (recommended) |
| `claude-3-haiku-20240307` | Fastest Claude model |

---

## LLMIntegration

Integration layer for UI components, providing backward compatibility with the original LLMService.

### Import

```typescript
import { LLMIntegration, CognitiveFunctionType } from '@deltecho/ui-components';
```

### Methods

#### getInstance()

Get the singleton instance.

```typescript
static getInstance(): LLMIntegration
```

#### initializeFromEnvironment()

Initialize from environment variables.

```typescript
initializeFromEnvironment(): void
```

#### initializeFromConfig()

Initialize from LLMServiceConfig (backward compatibility).

```typescript
initializeFromConfig(config: LLMServiceConfig): void
```

#### isReady()

Check if integration is ready for use.

```typescript
isReady(): boolean
```

#### generate()

Generate a response.

```typescript
async generate(
  prompt: string,
  functionType?: CognitiveFunctionType,
  providerName?: string
): Promise<LLMResponse>
```

#### generateTriadic()

Generate triadic response.

```typescript
async generateTriadic(prompt: string): Promise<TriadicResponse>
```

---

## Types and Interfaces

### CognitiveFunction

Enum for cognitive function types.

```typescript
enum CognitiveFunction {
  COGNITIVE_CORE = 'cognitive_core',
  AFFECTIVE_CORE = 'affective_core',
  RELEVANCE_CORE = 'relevance_core',
}
```

### LLMResponse

Response from LLM provider.

```typescript
interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}
```

### TriadicResponse

Response from triadic processing.

```typescript
interface TriadicResponse {
  cognitive: string;
  affective: string;
  relevance: string;
  synthesis: string;
  processingTimeMs: number;
}
```

### StreamChunk

Chunk from streaming response.

```typescript
interface StreamChunk {
  content: string;
  done: boolean;
}
```

### ProviderHealth

Provider health status.

```typescript
interface ProviderHealth {
  available: boolean;
  latency?: number;
  error?: string;
}
```

---

## Error Handling

All async methods may throw errors. Wrap calls in try-catch:

```typescript
try {
  const response = await service.process(input, CognitiveFunction.COGNITIVE_CORE);
  console.log(response.content);
} catch (error) {
  if (error.message.includes('401')) {
    console.error('Invalid API key');
  } else if (error.message.includes('429')) {
    console.error('Rate limited, please wait');
  } else {
    console.error('Error:', error.message);
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 401 | Unauthorized | Check API key |
| 429 | Rate limited | Wait and retry |
| 500 | Server error | Retry later |
| ENOTFOUND | Network error | Check connection |

---

## Best Practices

1. **Initialize once:** Create the service once and reuse it
2. **Handle errors:** Always wrap API calls in try-catch
3. **Use appropriate cores:** Match cognitive function to task type
4. **Monitor usage:** Track token usage for cost management
5. **Shutdown gracefully:** Call `shutdown()` when done

---

*For more examples, see the `examples/` directory.*
