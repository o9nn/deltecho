# Getting Started with Deltecho

This guide will help you get started with the Deltecho cognitive AI platform, from initial setup to running your first triadic cognitive processing.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Quick Start](#quick-start)
5. [Using the CLI](#using-the-cli)
6. [Programmatic Usage](#programmatic-usage)
7. [Understanding the Architecture](#understanding-the-architecture)
8. [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20.x or 22.x** installed
- **pnpm** package manager (`npm install -g pnpm`)
- An API key from **OpenAI** and/or **Anthropic**

### Obtaining API Keys

**OpenAI:**
1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new secret key

**Anthropic:**
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/o9nn/deltecho.git
cd deltecho
```

### Install Dependencies

```bash
pnpm install
```

### Build the Packages

```bash
pnpm build
```

This will compile all core packages:
- `deep-tree-echo-core` - Core cognitive functions
- `@deltecho/shared` - Shared utilities and abstractions
- `@deltecho/cognitive` - Cognitive architecture components
- `dove9` - Triadic processing engine
- `deep-tree-echo-orchestrator` - Multi-agent orchestration
- `@deltecho/ui-components` - UI components for desktop apps

---

## Configuration

### Environment Variables

Set your API keys as environment variables:

```bash
# OpenAI (recommended for general use)
export OPENAI_API_KEY="sk-your-openai-key-here"

# Anthropic Claude (alternative or additional provider)
export ANTHROPIC_API_KEY="sk-ant-your-anthropic-key-here"

# Optional: Set default provider
export DEFAULT_PROVIDER="openai"  # or "anthropic"

# Optional: Specify models
export OPENAI_MODEL="gpt-4-turbo-preview"
export ANTHROPIC_MODEL="claude-3-sonnet-20240229"
```

### Persistent Configuration

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Deltecho Configuration
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export DEFAULT_PROVIDER="openai"
```

---

## Quick Start

### Option 1: Using the CLI

The fastest way to start is with the CLI tool:

```bash
# Check status
npx ts-node bin/deltecho-cli.ts status

# Interactive chat
npx ts-node bin/deltecho-cli.ts chat

# Triadic processing (all three cognitive cores)
npx ts-node bin/deltecho-cli.ts triadic "Should I accept this job offer?"
```

### Option 2: Running Examples

```bash
# Basic LLM usage
npx ts-node examples/basic-llm-usage.ts

# Triadic cognitive loop
npx ts-node examples/triadic-cognitive-loop.ts

# Full 12-step cognitive cycle
npx ts-node examples/twelve-step-cognitive-cycle.ts
```

---

## Using the CLI

The Deltecho CLI provides a command-line interface for cognitive AI processing.

### Commands

| Command | Description |
|---------|-------------|
| `chat` | Interactive chat session |
| `triadic <prompt>` | Process through all three cognitive cores |
| `cognitive <prompt>` | Logical reasoning (Cognitive Core) |
| `affective <prompt>` | Emotional understanding (Affective Core) |
| `relevance <prompt>` | Integration and prioritization (Relevance Core) |
| `cycle <prompt>` | Run full 12-step cognitive cycle |
| `status` | Show provider configuration |
| `help` | Show help message |

### Examples

**Interactive Chat:**
```bash
npx ts-node bin/deltecho-cli.ts chat
```

In chat mode, you can switch between cognitive modes:
- `/cognitive` - Switch to Cognitive Core
- `/affective` - Switch to Affective Core
- `/relevance` - Switch to Relevance Core
- `/triadic` - Switch to triadic mode (all cores)
- `/quit` - Exit chat

**Triadic Processing:**
```bash
npx ts-node bin/deltecho-cli.ts triadic "What are the implications of AI in healthcare?"
```

This processes your input through all three cognitive cores and provides:
1. **Cognitive Analysis** - Logical reasoning
2. **Affective Analysis** - Emotional understanding
3. **Relevance Analysis** - Integration and prioritization
4. **Synthesis** - Unified response combining all perspectives

**12-Step Cognitive Cycle:**
```bash
npx ts-node bin/deltecho-cli.ts cycle "A customer is threatening to leave due to a service issue"
```

This runs the full 12-step cognitive loop with 3 concurrent streams.

---

## Programmatic Usage

### Basic Usage

```typescript
import {
  UnifiedLLMService,
  CognitiveFunction,
  LLMProviderRegistry,
  OpenAIProvider,
} from 'deep-tree-echo-core';

// Initialize
const registry = LLMProviderRegistry.getInstance();
registry.register(new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo-preview',
}));

const llmService = new UnifiedLLMService({
  defaultProvider: 'openai',
  registry,
});

await llmService.initialize();

// Process through Cognitive Core
const response = await llmService.process(
  "Analyze the key factors for startup success",
  CognitiveFunction.COGNITIVE_CORE
);

console.log(response.content);
```

### Triadic Processing

```typescript
// Process through all three cores in parallel
const triadicResponse = await llmService.processTriadic(
  "Should we pivot our product strategy?"
);

console.log('Cognitive:', triadicResponse.cognitive);
console.log('Affective:', triadicResponse.affective);
console.log('Relevance:', triadicResponse.relevance);
console.log('Synthesis:', triadicResponse.synthesis);
```

### Using LLMIntegration in UI Components

```typescript
import { LLMIntegration, CognitiveFunctionType } from '@deltecho/ui-components';

const integration = LLMIntegration.getInstance();
integration.initializeFromEnvironment();

if (integration.isReady()) {
  const response = await integration.generate(
    "How should we respond to this customer complaint?",
    CognitiveFunctionType.AFFECTIVE_CORE
  );
  console.log(response.content);
}
```

---

## Understanding the Architecture

### Triadic Cognitive Architecture

Deltecho implements a triadic cognitive architecture with three specialized cores:

| Core | Function | Focus |
|------|----------|-------|
| **Cognitive Core** | Logical reasoning | Analysis, planning, problem-solving |
| **Affective Core** | Emotional processing | Empathy, feelings, motivations |
| **Relevance Core** | Integration | Prioritization, synthesis, action |

These cores process in parallel (120° phase separation) and their outputs are synthesized into unified responses.

### 12-Step Cognitive Cycle

The full cognitive loop consists of 12 steps across 3 concurrent streams:

**Expressive Mode (Steps 1-7):**
1. PERCEIVE - Identify key elements
2. ORIENT - Direct attention
3. EVALUATE - Assess significance
4. GENERATE - Create options
5. SIMULATE - Project outcomes
6. SELECT - Choose action
7. EXECUTE - Formulate response

**Reflective Mode (Steps 8-12):**
8. OBSERVE - Document results
9. COMPARE - Check expectations
10. UPDATE - Revise understanding
11. CONSOLIDATE - Extract patterns
12. INTEGRATE - Connect to context

### Nested Shells Structure

The architecture follows the OEIS A000081 sequence for nested shells:
- 1 nest → 1 term
- 2 nests → 2 terms
- 3 nests → 4 terms
- 4 nests → 9 terms

This defines the relationship between the 3 concurrent streams and the 9 terms of 4 nestings.

---

## Next Steps

### Explore More Examples

- Check the `examples/` directory for more usage patterns
- Review the test files for API usage examples

### Integrate with Your Application

- Use `LLMIntegration` for UI component integration
- Implement custom cognitive functions for your domain

### Contribute

- Read `CONTRIBUTING.md` for contribution guidelines
- Check open issues on GitHub
- Submit pull requests for improvements

### Get Help

- Open an issue on GitHub
- Review the documentation in `docs/`
- Check the FAQ in `docs/guides/FAQ.md`

---

## Troubleshooting

### Common Issues

**"No providers configured"**
- Ensure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set
- Check environment variable spelling

**"API error: 401"**
- Verify your API key is correct
- Check if the key has expired

**"Build errors"**
- Run `pnpm install` to ensure dependencies are installed
- Run `pnpm build` to compile packages

**"Module not found"**
- Ensure you're running from the repository root
- Check that packages are built (`pnpm build`)

### Getting Help

If you encounter issues:
1. Check the error message carefully
2. Review this documentation
3. Search existing GitHub issues
4. Open a new issue with details

---

*Happy cognitive computing with Deltecho!* 🧠
