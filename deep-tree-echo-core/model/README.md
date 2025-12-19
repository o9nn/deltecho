# Deltecho Model Package - Z++ Formal Specification

This directory contains the formal Z++ specifications for the Deltecho cognitive model architecture, along with configuration files that reference these specifications.

## Overview

The Deltecho model implements a **12-step cognitive loop** with **3 concurrent inference streams**, based on the Echobeats architecture. The formal specifications ensure correctness and provide mathematical guarantees for the model's behavior.

## Cognitive Architecture

### Three Concurrent Streams

| Stream | Primary Role | Triads |
|--------|--------------|--------|
| Stream 1 | Perception | {1, 5, 9} |
| Stream 2 | Action | {2, 6, 10} |
| Stream 3 | Simulation | {3, 7, 11} |

### 12-Step Cognitive Loop

- **7 Expressive Steps**: Affordance interaction (conditioning past performance)
- **5 Reflective Steps**: Salience simulation (anticipating future potential)
- **2 Pivotal Steps**: Relevance realization (orienting present commitment)

### OEIS A000081 Nested Shell Structure

| Nesting Level | Terms | Steps Apart |
|---------------|-------|-------------|
| 1 | 1 | 1 |
| 2 | 2 | 2 |
| 3 | 4 | 3 |
| 4 | 9 | 4 |

## Specification Files

### `spec/Types.zpp`
Global constants and type aliases defining:
- Primitive types (TokenId, VocabSize, SeqLen, etc.)
- Cognitive architecture constants (streams, steps, triads)
- Tensor type definitions
- Memory and state types

### `spec/TokenizerConfig.zpp`
Tokenizer configuration state and invariants:
- Tokenizer type definitions (BPE, WordPiece, etc.)
- Special tokens configuration
- Padding and truncation strategies
- Cognitive token integration

### `spec/ModelConfig.zpp`
Model configuration state and invariants:
- Architecture types (DeltechoTransformer, MoE, Hybrid)
- Attention configuration (MHA, GQA, MQA)
- Feed-forward configuration
- Cognitive architecture configuration

### `spec/Tokenizer.zpp`
Tokenization and detokenization contracts:
- Encode/Decode operations
- Batch processing
- Cognitive stream token handling
- Roundtrip properties

### `spec/Model.zpp`
Parameter shapes and forward/sampling contracts:
- Model parameter definitions
- Forward pass operations
- Attention computation
- Sampling strategies (temperature, top-k, top-p)

### `spec/InferencePipe.zpp`
End-to-end generation contract:
- Pipeline configuration
- Generation operations
- Streaming support
- Cognitive state management
- Stopping criteria

## Configuration Files

### `config.json`
Model architecture configuration with Z++ spec references:
- `_zpp_spec.schema`: References `ModelConfigState`
- `_zpp_spec.invariants`: Lists applicable invariants
- `cognitive_config`: Cognitive architecture parameters

### `tokenizer_config.json`
Tokenizer configuration with Z++ spec references:
- `_zpp_spec.schema`: References `TokenizerConfigState`
- `_zpp_spec.operations`: Lists tokenizer operations
- `cognitive_tokens`: Cognitive stream tokens

### `special_tokens_map.json`
Special tokens mapping with Z++ spec references:
- `_zpp_spec.schema`: References `SpecialTokensMap`
- `_zpp_spec.constants`: Token ID constants
- Cognitive token descriptions

## Special Tokens

| Token | ID | Purpose |
|-------|-----|---------|
| `<pad>` | 0 | Padding |
| `<unk>` | 1 | Unknown |
| `<s>` | 2 | Beginning of sequence |
| `</s>` | 3 | End of sequence |
| `<\|stream1\|>` | 4 | Perception stream marker |
| `<\|stream2\|>` | 5 | Action stream marker |
| `<\|stream3\|>` | 6 | Simulation stream marker |
| `<\|pivot\|>` | 7 | Pivotal relevance marker |
| `<\|afford\|>` | 8 | Affordance interaction marker |
| `<\|salience\|>` | 9 | Salience simulation marker |

## Key Invariants

### Cognitive Architecture Invariants
```
ValidCognitiveLoop ≜
    COGNITIVE_STREAMS = 3 ∧
    COGNITIVE_STEPS = 12 ∧
    PHASE_OFFSET = 4 ∧
    EXPRESSIVE_STEPS + REFLECTIVE_STEPS = COGNITIVE_STEPS
```

### Triad Partition Invariant
```
ValidTriadPartition ≜
    TRIAD_1 ∪ TRIAD_2 ∪ TRIAD_3 ∪ TRIAD_4 = {1..12} ∧
    All triads are mutually disjoint
```

### Model Configuration Invariant
```
ModelConfigInvariant ≜
    ValidVocabSize(vocab_size) ∧
    ValidHiddenDim(hidden_size) ∧
    ValidAttentionConfig(attention, hidden_size) ∧
    ValidCognitiveConfig(cognitive)
```

## Key Theorems

### Encode-Decode Roundtrip
```
∀ text: TextInput •
    Decode(Encode(text)) = text
```

### Cognitive Stream Phasing
```
∀ s₁, s₂: StreamId • s₁ ≠ s₂ ⇒
    |step(s₁) - step(s₂)| mod PHASE_OFFSET = 0
```

### Generation Termination
```
∀ input: PipelineInput •
    ValidPipelineInput(input) ⇒
    ∃ output: PipelineOutput • Generate(input) terminates
```

## Usage

### Verifying Specifications

The Z++ specifications can be verified using a Z++ type checker or theorem prover. The specifications define:

1. **Types**: All data structures and their constraints
2. **Invariants**: Properties that must always hold
3. **Operations**: Pre/post conditions for all operations
4. **Theorems**: Provable properties of the system

### Implementing from Specifications

When implementing the model:

1. Ensure all type constraints are satisfied
2. Verify invariants hold after each operation
3. Check preconditions before operations
4. Guarantee postconditions after operations

## References

- OEIS A000081: Number of rooted trees with n nodes
- Echobeats Architecture: 3-stream cognitive loop
- Kawaii Hexapod System 4: 12-step cognitive architecture
- Twin Prime Mean: 5/7 distribution (mean = 6)
