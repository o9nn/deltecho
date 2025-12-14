# Deep Tree Echo Core

Core cognitive and memory modules for the Deep Tree Echo AI system.

## Overview

This package provides the foundational cognitive architecture, memory systems, personality management, and security components that power Deep Tree Echo across the deltecho monorepo.

## Architecture

The package is organized into the following modules:

- **cognitive/** - LLM service and cognitive processing
- **memory/** - Memory systems (semantic, episodic, procedural, hyperdimensional)
- **personality/** - Persona management and adaptive personality
- **security/** - Security integration layer
- **embodiment/** - Proprioceptive embodiment simulation
- **utils/** - Shared utilities (logging, etc.)

## Usage

```typescript
import { LLMService, CognitiveFunctionType } from 'deep-tree-echo-core/cognitive'

const llmService = new LLMService()
llmService.setConfig({ apiKey: 'your-key', apiEndpoint: 'https://...' })

const response = await llmService.generateResponse('Hello', [])
```

## Development

Build the package:
```bash
pnpm build
```

Type-check:
```bash
pnpm check:types
```

## License

GPL-3.0-or-later
