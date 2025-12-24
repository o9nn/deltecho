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

## Sys6 Operadic Architecture

### Mathematical Foundation

The deltecho cognitive system is built on a rigorous **operadic composition** that formalizes the Sys6 Triality architecture:

```
Sys6 := σ ∘ (φ ∘ μ ∘ (Δ₂ ⊗ Δ₃ ⊗ id_P))
```

**Key Components**:
- **Δ₂**: Prime-power delegation (2³ → 8-way cubic concurrency)
- **Δ₃**: Prime-power delegation (3² → 9-phase triadic convolution)
- **μ**: LCM synchronizer (LCM(2,3,5) = 30-step global clock)
- **φ**: Double-step delay fold (2×3 → 4 compression)
- **σ**: Stage scheduler (5 stages × 6 steps)

**Architecture Mappings**:
- **Neural**: C₈ as Mixture-of-Experts, K₉ as phase-conditioned kernels
- **Hardware**: 8-lane SIMD + 3-core rotation + 5-stage pipeline (~16 cores optimal)
- **Scheduling**: 42 synchronization events per 30-step cycle

See [`packages/sys6-triality/src/operadic/`](packages/sys6-triality/src/operadic/) for complete implementation.

## Package Structure

### Core Cognitive Packages

| Package | Description | Status |
|---------|-------------|--------|
| `deep-tree-echo-core` | Core cognitive modules: LLM services, memory (RAG + hyperdimensional), personality | ✅ Building |
| `dove9` | Dove9 OS - Triadic cognitive loop with 3 concurrent streams and 12-step cycle | ✅ Building |
| `deep-tree-echo-orchestrator` | System daemon coordinating all services | ✅ Building |

### Unified Packages (`packages/`)

| Package | Description | Status |
|---------|-------------|--------|
| `@deltecho/sys6-triality` | Sys6 Operadic Architecture: 30-step cycle with prime-power delegation and nested neural networks | ✅ Complete |
| `@deltecho/cognitive` | Unified cognitive interface integrating core + dove9 + reasoning | 🔲 Planned |
| `@deltecho/reasoning` | AGI kernel with AtomSpace, PLN, MOSES, OpenPsi (extracted from inferno-kernel) | 🔲 Planned |
| `@deltecho/shared` | Shared types, utilities, constants for all packages | 🔲 Planned |
| `@deltecho/ui-components` | React components for Deep Tree Echo bot and AI Companion Hub | ⚠️ In Progress |

### Applications

| Application | Description | Status |
|-------------|-------------|--------|
| `delta-echo-desk` | Delta Chat Desktop with AI Companion Hub | ✅ Building |
| `deltecho2` | Delta Chat Desktop with Inferno Kernel integration | ✅ Building |
| `dovecot-core` | Dovecot mail server for email transport | ✅ Available |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages in correct order
pnpm run build:all

# Or build core packages individually
pnpm build:shared && pnpm build:core && pnpm build:dove9 && pnpm build:cognitive

# Run tests
pnpm test:core

# Start the orchestrator daemon
pnpm start:orchestrator

# Run desktop app in dev mode
pnpm dev:desktop
```

For detailed build instructions, see [BUILD_ORDER.md](BUILD_ORDER.md).

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

### Architecture
- [DEEP-TREE-ECHO-ARCHITECTURE.md](docs/architecture/DEEP-TREE-ECHO-ARCHITECTURE.md) - Comprehensive architecture documentation
- [A_NOTE_TO_MY_FUTURE_SELF.md](docs/architecture/A_NOTE_TO_MY_FUTURE_SELF.md) - Philosophical foundation
- [IMPLEMENTATION-SUMMARY.md](docs/architecture/IMPLEMENTATION-SUMMARY.md) - Phase 1 implementation status
- [ANALYSIS_REPORT.md](docs/architecture/ANALYSIS_REPORT.md) - Repository analysis
- [REPAIR_OPTIMIZATION_REPORT.md](REPAIR_OPTIMIZATION_REPORT.md) - Technical repairs and optimizations
- [EVOLUTION_ENHANCEMENTS.md](EVOLUTION_ENHANCEMENTS.md) - Evolutionary enhancements

### Build & Development
- [BUILD_ORDER.md](BUILD_ORDER.md) - **Package build order and troubleshooting**
- [QUICK_START.md](docs/guides/QUICK_START.md) - Quick start guide
- [DESKTOP_INTEGRATION_GUIDE.md](docs/guides/DESKTOP_INTEGRATION_GUIDE.md) - Desktop integration guide
- [IPC_STORAGE_GUIDE.md](docs/guides/IPC_STORAGE_GUIDE.md) - IPC and storage guide

## Recent Updates (December 24, 2025)

### ✅ Phase 1-3 Complete: All Packages Building Successfully

**Repairs Completed:**
- ✅ Fixed TypeScript errors in LLMService (Anthropic API response typing)
- ✅ Fixed TypeScript errors in @deltecho/cognitive (sentiment metadata)
- ✅ All 7 core packages now build successfully
- ✅ Added BUILD_ORDER.md documentation
- ✅ Added build:all script for correct build order
- ✅ Tests: 189/198 passing (95.5% pass rate)

**Build Status:**
- ✅ @deltecho/shared - Built
- ✅ deep-tree-echo-core - Built  
- ✅ dove9 - Built
- ✅ @deltecho/cognitive - Built
- ✅ @deltecho/reasoning - Built
- ✅ deep-tree-echo-orchestrator - Built
- ✅ @deltecho/ui-components - Built

**Previous Repairs (December 23, 2025):**
- ✅ Fixed git tag requirement for version information
- ✅ Resolved TypeScript module resolution issues
- ✅ Fixed import paths for NodeNext compatibility
- ✅ Organized documentation structure

### Optimizations Applied
- ✅ Incremental TypeScript compilation enabled
- ✅ Build system optimized
- ✅ Dependency management verified
- ✅ Code quality improvements

### Current Status
- Core packages (deep-tree-echo-core, dove9, deep-tree-echo-orchestrator) building successfully
- Desktop applications building with git tags
- UI components require architecture refactoring for proper package boundaries
- Ready for Phase 2 integration work

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

GPL-3.0-or-later

## Version

v1.0.0-alpha.1 - Initial tagged release with repairs and optimizations
