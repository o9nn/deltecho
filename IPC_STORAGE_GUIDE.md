# IPC-Based Storage Integration Guide

## Overview

The Deep Tree Echo orchestrator now provides centralized storage for desktop applications through an IPC (Inter-Process Communication) mechanism. This enables desktop apps to persist cognitive data (memories, persona state, etc.) in a centralized location managed by the orchestrator daemon.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Desktop Application                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           @deltecho/cognitive                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │ LLMService   │  │ PersonaCore  │  │RAGMemory  │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │   │
│  └─────────┼──────────────────┼─────────────────┼────────┘   │
│            │                  │                 │            │
│  ┌─────────▼──────────────────▼─────────────────▼────────┐   │
│  │       OrchestratorStorageAdapter                      │   │
│  │       (Unix Socket/TCP Client)                        │   │
│  └─────────────────────────┬─────────────────────────────┘   │
└────────────────────────────┼─────────────────────────────────┘
                             │ IPC Protocol
                             │ (JSON messages over socket)
┌────────────────────────────▼─────────────────────────────────┐
│          Deep Tree Echo Orchestrator Daemon                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              IPC Server                              │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │        StorageManager                       │    │   │
│  │  │  (In-memory + optional persistence)         │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Components

### 1. OrchestratorStorageAdapter

Location: `deep-tree-echo-core/src/adapters/OrchestratorStorageAdapter.ts`

A storage adapter that implements the `MemoryStorage` interface and communicates with the orchestrator's IPC server via Unix socket or TCP.

**Features:**
- Automatic reconnection on disconnection
- Request/response protocol with timeouts
- Newline-delimited JSON message format
- Event-based connection status notifications

### 2. IPC Server (Orchestrator)

Location: `deep-tree-echo-orchestrator/src/ipc/server.ts`

The server-side component that handles storage requests from desktop applications.

**Supported Message Types:**
- `REQUEST_STORAGE_GET` - Retrieve a value by key
- `REQUEST_STORAGE_SET` - Store a key-value pair
- `REQUEST_STORAGE_DELETE` - Delete a key
- `REQUEST_STORAGE_CLEAR` - Clear all keys with a prefix
- `REQUEST_STORAGE_KEYS` - List all keys with a prefix

### 3. StorageManager

Location: `deep-tree-echo-orchestrator/src/ipc/storage-manager.ts`

A simple in-memory key-value store with optional persistence support (to be implemented).

## Usage

### In Desktop Applications

```typescript
import { OrchestratorStorageAdapter } from 'deep-tree-echo-core';
import { RAGMemoryStore, PersonaCore } from 'deep-tree-echo-core';

// 1. Create the storage adapter
const storage = new OrchestratorStorageAdapter({
  socketPath: '/tmp/deep-tree-echo.sock',
  storagePrefix: 'deltecho'
});

// 2. Connect to the orchestrator
await storage.connect();

// 3. Use the adapter with cognitive modules
const ragMemory = new RAGMemoryStore(storage);
const persona = new PersonaCore(storage);

// 4. Listen for connection events
storage.on('connected', () => {
  console.log('Connected to orchestrator');
});

storage.on('disconnected', () => {
  console.log('Disconnected from orchestrator - will auto-reconnect');
});

storage.on('error', (error) => {
  console.error('Storage error:', error);
});

// 5. Use memory and persona as normal
await ragMemory.addMemory('user', 'Hello Deep Tree Echo!');
const memories = await ragMemory.getRecentMemories(10);
```

### In the Orchestrator

```typescript
import { IPCServer } from 'deep-tree-echo-orchestrator';

// 1. Create the IPC server
const ipcServer = new IPCServer({
  socketPath: '/tmp/deep-tree-echo.sock',
  useTcp: false,
  maxConnections: 10
});

// 2. Start the server
await ipcServer.start();

// 3. Server automatically handles storage requests
// Storage is managed internally via StorageManager
```

## Message Protocol

Messages are sent as newline-delimited JSON over the socket:

```typescript
// Request format
{
  "id": "1702989012345-abc123",
  "type": "request_storage_get",
  "payload": {
    "key": "deltecho:memories"
  },
  "timestamp": 1702989012345
}

// Response format (success)
{
  "id": "1702989012345-abc123",
  "type": "response_success",
  "payload": {
    "value": "{\"memories\": [...]}"
  },
  "timestamp": 1702989012346
}

// Response format (error)
{
  "id": "1702989012345-abc123",
  "type": "response_error",
  "payload": {
    "message": "Key not found"
  },
  "timestamp": 1702989012346
}
```

## Configuration

### Socket Path

**Unix Socket (default):** `/tmp/deep-tree-echo.sock`
- Fast, local-only communication
- Recommended for single-machine setups

**TCP Socket:** `localhost:9876`
- Network communication support
- Useful for multi-machine setups or testing

```typescript
// Unix socket (default)
const storage = new OrchestratorStorageAdapter({
  socketPath: '/tmp/deep-tree-echo.sock'
});

// TCP socket (not yet implemented in adapter)
const ipcServer = new IPCServer({
  useTcp: true,
  tcpPort: 9876
});
```

### Storage Prefix

All keys are automatically prefixed to avoid collisions:

```typescript
const storage = new OrchestratorStorageAdapter({
  storagePrefix: 'deltecho'  // Keys become "deltecho:key"
});
```

## Error Handling

The adapter automatically handles common error scenarios:

1. **Connection Failure:** Throws error on initial connect, then retries
2. **Disconnection:** Automatically attempts to reconnect every 5 seconds
3. **Request Timeout:** Requests timeout after 5 seconds (configurable)
4. **Invalid Messages:** Logged but don't crash the adapter

```typescript
try {
  await storage.connect();
} catch (error) {
  console.error('Failed to connect to orchestrator:', error);
  // Adapter will automatically retry connection
}

// Set up error handler for ongoing errors
storage.on('error', (error) => {
  console.error('Storage error:', error);
});
```

## Future Enhancements

1. **Persistent Storage:** Save to SQLite/Redis instead of in-memory
2. **Authentication:** Add API keys or tokens for security
3. **Compression:** Compress large payloads
4. **Encryption:** Encrypt sensitive data in transit
5. **Batching:** Batch multiple operations for efficiency
6. **Synchronization:** Multi-device sync capabilities

## Testing

To test the IPC storage integration:

```bash
# 1. Start the orchestrator daemon
cd deep-tree-echo-orchestrator
npm start

# 2. In another terminal, run a desktop app
cd deltecho2
npm run dev

# 3. Test storage operations in the app
# The app should connect to the orchestrator via IPC
```

## Troubleshooting

### "Connection refused"
- Ensure orchestrator daemon is running
- Check socket path is correct
- Verify socket file exists (`ls -la /tmp/deep-tree-echo.sock`)

### "Connection timeout"
- Orchestrator may be slow to start
- Check orchestrator logs for errors
- Verify no firewall blocking the socket

### "ENOENT: no such file or directory"
- Socket file doesn't exist
- Orchestrator hasn't created the socket yet
- Check orchestrator is running and has started IPC server

### Frequent disconnections
- Check orchestrator logs for crashes
- Verify system resources (memory, CPU)
- Look for network issues if using TCP

## References

- [DEEP-TREE-ECHO-ARCHITECTURE.md](../../DEEP-TREE-ECHO-ARCHITECTURE.md) - Overall architecture
- [deep-tree-echo-core/README.md](../deep-tree-echo-core/README.md) - Core package docs
- [deep-tree-echo-orchestrator/README.md](../deep-tree-echo-orchestrator/README.md) - Orchestrator docs
