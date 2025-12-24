# @deltecho/sys6-triality

**Sys6 Triality: 30-Step Cognitive Cycle Engine with Nested Neural Networks**

A TypeScript implementation of the Sys6 Triality cognitive architecture, featuring PyTorch-style tensor operations and nested neural network modules for complex cognitive processing.

## Overview

The Sys6 Triality architecture implements a sophisticated cognitive processing model based on:

- **30 irreducible steps** derived from LCM(2, 3, 5) = 30
- **3 phases × 5 stages × 2 steps** per cognitive cycle
- **Double step delay pattern** (A1→A2→B2→B3) for cubic concurrency
- **Triadic consciousness streams** with 120° phase separation
- **Tetradic thread multiplexing** with tetrahedral symmetry
- **Global telemetry shell** for persistent gestalt perception

## Mathematical Foundation

### Prime Factor Decomposition

| Prime | Role | Manifestation |
|-------|------|---------------|
| **2** | Dyadic pairs | Opponent processing, binary distinctions |
| **3** | Triadic faces | Three concurrent consciousness streams |
| **5** | Pentadic stages | Five transformation stages per phase |

### Double Step Delay Pattern

The core innovation is the alternating double step delay pattern:

| Step | State | Dyad | Triad |
|------|-------|------|-------|
| 1 | 1 | A | 1 |
| 2 | 4 | A | 2 |
| 3 | 6 | B | 2 |
| 4 | 1 | B | 3 |

This pattern maintains phase coherence across all three consciousness streams while implementing cubic concurrency.

## Installation

```bash
pnpm add @deltecho/sys6-triality
```

## Quick Start

### Basic Usage

```typescript
import { Sys6CycleEngine, randn } from '@deltecho/sys6-triality';

// Create engine with 256-dimensional state
const engine = new Sys6CycleEngine({ dim: 256 });

// Create input state
const input = randn([1, 256]);

// Run one complete 30-step cycle
const result = engine.forward(input, 1);

console.log('Steps completed:', result.steps.length); // 30
console.log('Final state shape:', result.finalState.shape); // [1, 256]
console.log('Processing time:', result.processingTimeMs, 'ms');
```

### With LLM Integration

```typescript
import { Sys6LLMIntegration, MockLLMProvider } from '@deltecho/sys6-triality';

// Create integration with mock provider (replace with real provider)
const integration = new Sys6LLMIntegration({
  dim: 256,
  provider: new MockLLMProvider(),
});

// Process through single cognitive function
const result = await integration.process(
  "Analyze the implications of this decision",
  'cognitive'
);

console.log('Response:', result.response);
console.log('Cycle steps:', result.cycleResult.steps.length);

// Process through all three cognitive cores (triadic)
const triadicResult = await integration.processTriadic(
  "Should we proceed with this strategy?"
);

console.log('Cognitive:', triadicResult.cognitive);
console.log('Affective:', triadicResult.affective);
console.log('Relevance:', triadicResult.relevance);
console.log('Integrated:', triadicResult.integrated);
```

## Architecture

### Tensor Types

```typescript
// Basic shaped tensor
interface ShapedTensor {
  data: ArrayLike<number>;
  shape: number[];
  dtype: 'float32' | 'float64' | 'int32';
}

// Dyadic edge (opponent pair)
interface DyadicEdge {
  poleA: ShapedTensor;
  poleB: ShapedTensor;
  edgeId: string;
}

// Triadic face (three edges forming triangle)
interface TriadicFace {
  edge_ij: DyadicEdge;
  edge_jk: DyadicEdge;
  edge_ki: DyadicEdge;
  faceId: string;
}

// Tetradic bundle (four threads with tetrahedral symmetry)
interface TetradicBundle {
  thread0: ShapedTensor;
  thread1: ShapedTensor;
  thread2: ShapedTensor;
  thread3: ShapedTensor;
}
```

### Neural Network Modules

- **Linear**: Fully connected layer with weight and bias
- **LayerNorm**: Layer normalization for stable training
- **GELU/ReLU**: Activation functions
- **GRUCell**: Gated recurrent unit for state transitions
- **LSTM**: Long short-term memory for global telemetry
- **DyadicConvolution**: Opponent processing with entanglement
- **TriadicConvolution**: Three-stream convolution with 120° phase
- **TetradicConvolution**: Four-thread convolution with tetrahedral symmetry

### Cognitive Streams

The engine maintains three concurrent consciousness streams:

1. **Perception Stream** (0° phase) - Sensory input processing
2. **Evaluation Stream** (120° phase) - Value assessment
3. **Action Stream** (240° phase) - Response generation

Each stream processes the same input with phase-shifted weighting, enabling parallel cognitive processing while maintaining coherence.

## Configuration

```typescript
interface Sys6CycleConfig {
  dim: number;           // State dimension (required)
  hiddenDim?: number;    // Hidden dimension (default: dim * 2)
  telemetryLayers?: number; // LSTM layers (default: 2)
  dropout?: number;      // Dropout rate (default: 0.1)
}
```

## API Reference

### Sys6CycleEngine

```typescript
class Sys6CycleEngine {
  constructor(config: Sys6CycleConfig);
  
  // Run complete cycle(s)
  forward(inputState: ShapedTensor, numCycles?: number): CycleResult;
  
  // Run single step (for incremental processing)
  step(absoluteStep: number, ...): StepResult;
}
```

### Sys6LLMIntegration

```typescript
class Sys6LLMIntegration {
  constructor(config: { dim: number; provider: LLMProvider });
  
  // Process through single cognitive function
  process(input: string, cognitiveFunction: CognitiveFunction): Promise<ProcessResult>;
  
  // Process through all three cores
  processTriadic(input: string): Promise<TriadicResult>;
}
```

## Testing

```bash
# Run validation suite
npx tsx validate.ts

# Expected output:
# === Sys6 Triality Validation ===
# --- Tensor Operations ---
# ✅ createTensor creates correct shape
# ... (22 tests)
# === Summary ===
# Passed: 22
# Failed: 0
```

## Theoretical Background

The Sys6 Triality architecture is based on:

1. **OEIS A000081** - Nested shells pattern for hierarchical structure
2. **Tetrahedral symmetry** - Four-fold thread organization
3. **Opponent processing** - Dyadic contrast computation
4. **Phase-locked loops** - Synchronized stream processing
5. **Global workspace theory** - Telemetry shell for conscious access

## License

MIT

## Related Packages

- `deep-tree-echo-core` - Core cognitive architecture
- `@deltecho/shared` - Shared utilities and types
- `@deltecho/cognitive` - Cognitive processing modules
