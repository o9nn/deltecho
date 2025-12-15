# CLAUDE.md - Deltecho Monorepo

This file provides guidance for Claude Code when working with the Deltecho monorepo.

## Project Overview

Deltecho is a unified cognitive AI ecosystem combining Delta Chat secure messaging with advanced cognitive architecture. The repository implements the Deep Tree Echo cognitive framework with the revolutionary Dove9 "Everything is a Chatbot" operating system paradigm.

## Repository Structure

```
deltecho/
├── packages/                      # Unified shared packages
│   ├── cognitive/                 # @deltecho/cognitive - Unified cognitive interface
│   ├── reasoning/                 # @deltecho/reasoning - AGI kernel (from inferno-kernel)
│   ├── shared/                    # @deltecho/shared - Shared types & utilities
│   └── ui-components/             # @deltecho/ui-components - React components
│
├── deep-tree-echo-core/           # Core cognitive modules (LLM, memory, personality)
├── deep-tree-echo-orchestrator/   # System daemon coordinating all services
├── dove9/                         # Dove9 OS - Triadic cognitive loop
│
├── delta-echo-desk/               # Desktop app with AI Companion Hub
├── deltecho2/                     # Desktop app with Inferno Kernel
├── dovecot-core/                  # Dovecot mail server core
│
└── _archived/                     # Deprecated code (deltachat-core)
```

## Core Cognitive Packages

### deep-tree-echo-core/
Core cognitive library providing LLM services, memory systems (RAG + hyperdimensional), and personality management.

**Key Commands**:
```bash
pnpm build:core        # Build the core package
pnpm check:core        # Type check
```

### dove9/
The Dove9 cognitive operating system implementing the triadic cognitive loop:
- 3 concurrent cognitive streams at 120° phase offset
- 12-step cognitive cycle
- Self-balancing feedback loops
- Feedforward anticipation

### deep-tree-echo-orchestrator/
System daemon that coordinates all Deep Tree Echo services:
- DeltaChat Interface (JSON-RPC)
- Dovecot Interface (email processing)
- IPC Server (desktop app communication)
- Task Scheduler (cron-like scheduling)
- Webhook Server (external integrations)
- Dove9 Integration (cognitive OS)

**Key Commands**:
```bash
pnpm start:orchestrator  # Start the daemon
```

## Unified Packages (`packages/`)

### @deltecho/cognitive
Unified cognitive interface that integrates:
- deep-tree-echo-core (LLM, memory, personality)
- dove9 (triadic cognitive loop)
- CognitiveOrchestrator class for unified access

### @deltecho/reasoning
AGI kernel extracted from inferno-kernel, providing:
- AtomSpace (hypergraph knowledge representation)
- PatternMatcher (hypergraph pattern matching)
- PLN Engine (Probabilistic Logic Networks)
- MOSES (Meta-Optimizing Semantic Evolutionary Search)
- OpenPsi (motivational/emotional system)
- AttentionAllocation (cognitive resource scheduler)
- DistributedCoordinator (multi-node AGI)

### @deltecho/shared
Shared types, utilities, and constants used across all packages:
- DesktopSettingsType (including Deep Tree Echo bot settings)
- Logger utilities
- Localization helpers
- Common utilities

### @deltecho/ui-components
React components for the cognitive interface:
- DeepTreeEchoBot (main bot component)
- AICompanionHub (multi-AI platform management)
- Memory visualization components

## Desktop Applications

Both desktop apps share similar architecture but have unique features:

### delta-echo-desk/
- Includes **AI Companion Hub** for multi-AI platform management
- ConnectorRegistry for multiple LLM providers

### deltecho2/
- Includes **Inferno Kernel** integration
- Enhanced Deep Tree Echo settings (parallel processing)

**Common Commands**:
```bash
pnpm dev:desktop       # Start desktop app in dev mode
pnpm dev:electron      # Start Electron dev mode
```

## Root-Level Commands

```bash
pnpm install           # Install all dependencies
pnpm build             # Build all packages
pnpm check             # Type check all packages
pnpm clean             # Clean all build outputs
pnpm test              # Run all tests
pnpm dev:desktop       # Start deltecho2 in dev mode
pnpm start:orchestrator # Start the orchestrator daemon
```

## Package-Specific Builds

```bash
pnpm build:core        # deep-tree-echo-core
pnpm build:orchestrator # deep-tree-echo-orchestrator
pnpm build:dove9       # dove9
pnpm build:cognitive   # @deltecho/cognitive
pnpm build:reasoning   # @deltecho/reasoning
pnpm build:shared      # @deltecho/shared
pnpm build:ui          # @deltecho/ui-components
```

## Architecture Philosophy

The codebase follows the **Dove9 paradigm** where "everything is a chatbot":
- Mail server acts as the CPU (cognitive processing unit)
- Messages are process threads
- Inference is feedforward processing
- Learning is feedback processing
- Deep Tree Echo is the orchestration agent

The **triadic cognitive loop** is inspired by hexapod tripod gait locomotion, providing stable, continuous cognitive processing through three interleaved streams.

## Development Workflow

1. Changes to cognitive logic → modify `deep-tree-echo-core` or `packages/cognitive`
2. Changes to AGI reasoning → modify `packages/reasoning`
3. Changes to UI components → modify `packages/ui-components`
4. Changes to shared types → modify `packages/shared`
5. Run `pnpm check` to verify all types
6. Run `pnpm build` to build all packages

## Code Conventions

- Avoid `console.log()` - use proper logging via `getLogger()`
- Use TypeScript strict mode patterns
- Prefer functional React components with hooks
- Import from unified packages (`@deltecho/*`) when possible
- Follow existing cognitive architecture patterns

## Key Documentation

- [README.md](README.md) - Project overview and quick start
- [DEEP-TREE-ECHO-ARCHITECTURE.md](DEEP-TREE-ECHO-ARCHITECTURE.md) - Comprehensive architecture
- [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md) - Phase 1 status
- [A_NOTE_TO_MY_FUTURE_SELF.md](A_NOTE_TO_MY_FUTURE_SELF.md) - Philosophical foundation
- [dove9/README.md](dove9/README.md) - Dove9 architecture details
