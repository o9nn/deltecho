# Deltecho Quick Start Guide

## Prerequisites

- Node.js >= 20
- pnpm >= 9.6.0
- Git

## Installation

```bash
git clone https://github.com/o9nn/deltecho.git
cd deltecho
pnpm install
```

## Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:core
pnpm build:orchestrator
pnpm build:dove9
```

## Development

```bash
# Run desktop app in development mode
pnpm dev:desktop

# Start orchestrator daemon
pnpm start:orchestrator
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm test:core
```

## Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format:fix

# Type check
pnpm check
```

## Project Structure

```
deltecho/
├── deep-tree-echo-core/       # Core cognitive modules
├── deep-tree-echo-orchestrator/ # System daemon
├── dove9/                     # Triadic cognitive loop
├── packages/                  # Unified packages
│   ├── cognitive/            # Cognitive interface
│   ├── reasoning/            # AGI kernel
│   ├── shared/               # Shared utilities
│   └── ui-components/        # React components
├── delta-echo-desk/          # Desktop app (AI Hub)
└── deltecho2/                # Desktop app (Inferno)
```

## Key Features

### Storage Adapters
- `ElectronStorageAdapter` - For Electron apps
- `TauriStorageAdapter` - For Tauri apps

### LLM Service
- Supports OpenAI, Anthropic, OpenRouter, Ollama
- Streaming responses
- Token estimation

### Memory Systems
- RAG Memory Store
- Hyperdimensional Memory
- Personality Core

## Environment Variables

Create `.env` file:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...

LLM_PROVIDER=openai
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7
```

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [DESKTOP_INTEGRATION_GUIDE.md](DESKTOP_INTEGRATION_GUIDE.md) - Integration guide
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [ANALYSIS_REPORT.md](ANALYSIS_REPORT.md) - Technical analysis

## Common Commands

```bash
# Clean build artifacts
pnpm clean

# Install dependencies
pnpm install

# Update dependencies
pnpm update

# Check for vulnerabilities
pnpm audit

# Run type checking
pnpm check
```

## Troubleshooting

### Installation fails
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Build fails
```bash
pnpm clean
pnpm build
```

### Tests fail
```bash
pnpm test -- --clearCache
pnpm test
```

## Getting Help

- GitHub Issues: https://github.com/o9nn/deltecho/issues
- Documentation: See package README files
- Contributing: See CONTRIBUTING.md

## License

GPL-3.0-or-later
