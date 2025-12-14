# Deep Tree Echo Orchestrator

System-level orchestrator daemon for Deep Tree Echo AI that coordinates functionality across desktop applications and DeltaChat infrastructure.

## Overview

The orchestrator acts as a central coordinator that:

- **Manages DeltaChat Integration**: Direct access to DeltaChat core via JSON-RPC
- **Coordinates Desktop Apps**: IPC server for communication with delta-echo-desk and deltecho2
- **Enables Autonomous Operation**: Background daemon that runs 24/7
- **Schedules Tasks**: Cron-like scheduling for proactive actions
- **Provides External Integration**: Webhook server for external services

## Architecture

```
┌─────────────────────────────────────────────────────┐
│          Deep Tree Echo Orchestrator                │
├─────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────────────────┐ │
│  │ DeltaChat      │  │ IPC Server                 │ │
│  │ Interface      │  │ (Desktop App Communication)│ │
│  └────────────────┘  └────────────────────────────┘ │
│  ┌────────────────┐  ┌────────────────────────────┐ │
│  │ Task Scheduler │  │ Webhook Server             │ │
│  │ (Cron-like)    │  │ (External Integration)     │ │
│  └────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Usage

### Running as a Daemon

```bash
npm run build
npm start
```

### Development Mode

```bash
npm run dev
```

## Status

This is Phase 2 of the Deep Tree Echo architecture implementation. The orchestrator provides:

- ✅ Core structure and daemon entry point
- ✅ Service coordination framework
- ⏳ DeltaChat JSON-RPC integration (stub)
- ⏳ IPC server implementation (stub)
- ⏳ Task scheduler implementation (stub)
- ⏳ Webhook server implementation (stub)

## License

GPL-3.0-or-later
