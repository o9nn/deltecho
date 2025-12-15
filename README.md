# Deltecho Monorepo

**Unified Deep Tree Echo Cognitive Ecosystem**

A comprehensive platform combining Delta Chat secure messaging with advanced cognitive AI architecture, featuring the revolutionary Dove9 "Everything is a Chatbot" operating system paradigm.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DELTECHO ECOSYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    UNIFIED COGNITIVE LAYER                          │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ @deltecho/   │  │ @deltecho/   │  │ @deltecho/   │              │   │
│  │  │  cognitive   │  │  reasoning   │  │   shared     │              │   │
│  │  │              │  │ (AGI Kernel) │  │              │              │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘              │   │
│  │         │                 │                                        │   │
│  │  ┌──────┴───────┐  ┌──────┴───────┐                                │   │
│  │  │deep-tree-    │  │    dove9     │                                │   │
│  │  │ echo-core    │  │(Triadic Loop)│                                │   │
│  │  └──────────────┘  └──────────────┘                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│  ┌───────────────────────────────┼───────────────────────────────────┐     │
│  │              ORCHESTRATION LAYER                                   │     │
│  │                               │                                    │     │
│  │  ┌────────────────────────────┴─────────────────────────────────┐ │     │
│  │  │           deep-tree-echo-orchestrator                        │ │     │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │ │     │
│  │  │  │DeltaChat │ │ Dovecot  │ │   IPC    │ │ Webhooks │        │ │     │
│  │  │  │Interface │ │Interface │ │ Server   │ │  Server  │        │ │     │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │ │     │
│  │  └──────────────────────────────────────────────────────────────┘ │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                   │                                         │
│  ┌───────────────────────────────┼───────────────────────────────────┐     │
│  │               APPLICATION LAYER                                    │     │
│  │                               │                                    │     │
│  │  ┌────────────────────────────┴─────────────────────────────────┐ │     │
│  │  │                    Desktop Applications                       │ │     │
│  │  │  ┌──────────────────┐  ┌──────────────────────────────────┐  │ │     │
│  │  │  │ delta-echo-desk  │  │           deltecho2              │  │ │     │
│  │  │  │  (with AI Hub)   │  │    (with Inferno Kernel)         │  │ │     │
│  │  │  └──────────────────┘  └──────────────────────────────────┘  │ │     │
│  │  └──────────────────────────────────────────────────────────────┘ │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │               INFRASTRUCTURE LAYER                                 │     │
│  │  ┌──────────────────────────────────────────────────────────────┐ │     │
│  │  │                     dovecot-core                              │ │     │
│  │  │               (Mail Server - IMAP/SMTP)                       │ │     │
│  │  └──────────────────────────────────────────────────────────────┘ │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Package Structure

### Core Cognitive Packages

| Package | Description |
|---------|-------------|
| `deep-tree-echo-core` | Core cognitive modules: LLM services, memory (RAG + hyperdimensional), personality |
| `dove9` | Dove9 OS - Triadic cognitive loop with 3 concurrent streams and 12-step cycle |
| `deep-tree-echo-orchestrator` | System daemon coordinating all services |

### Unified Packages (`packages/`)

| Package | Description |
|---------|-------------|
| `@deltecho/cognitive` | Unified cognitive interface integrating core + dove9 + reasoning |
| `@deltecho/reasoning` | AGI kernel with AtomSpace, PLN, MOSES, OpenPsi (extracted from inferno-kernel) |
| `@deltecho/shared` | Shared types, utilities, constants for all packages |
| `@deltecho/ui-components` | React components for Deep Tree Echo bot and AI Companion Hub |

### Applications

| Application | Description |
|-------------|-------------|
| `delta-echo-desk` | Delta Chat Desktop with AI Companion Hub |
| `deltecho2` | Delta Chat Desktop with Inferno Kernel integration |
| `dovecot-core` | Dovecot mail server for email transport |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start the orchestrator daemon
pnpm start:orchestrator

# Run desktop app in dev mode
pnpm dev:desktop
```

## Triadic Cognitive Architecture (Dove9)

The system implements a revolutionary cognitive architecture inspired by hexapod tripod gait locomotion:

- **3 Concurrent Streams**: Operating at 120° phase offset
- **12-Step Cycle**: Complete cognitive loop per cycle
- **Self-balancing**: Feedback loops maintain stability
- **Feedforward Anticipation**: Predictive processing
- **Salience Landscape**: Shared attention mechanism

```
Stream 1: SENSE → ... → ... → SENSE
Stream 2: ... → PROCESS → ... → PROCESS
Stream 3: ... → ... → ACT → ... → ACT
          ─────────────────────────────→ Time
```

## Development

See individual package README files for specific development instructions:

- [deep-tree-echo-core/README.md](deep-tree-echo-core/README.md)
- [dove9/README.md](dove9/README.md)
- [deep-tree-echo-orchestrator/README.md](deep-tree-echo-orchestrator/README.md)

## Documentation

- [DEEP-TREE-ECHO-ARCHITECTURE.md](DEEP-TREE-ECHO-ARCHITECTURE.md) - Comprehensive architecture documentation
- [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md) - Phase 1 implementation status
- [A_NOTE_TO_MY_FUTURE_SELF.md](A_NOTE_TO_MY_FUTURE_SELF.md) - Philosophical foundation

## License

GPL-3.0-or-later
