# Desktop App Integration Example

This document shows how to integrate the orchestrator-based storage into desktop applications (delta-echo-desk or deltecho2).

## Step-by-Step Integration

### 1. Import the Required Components

```typescript
// In your desktop app's main bot initialization file
import {
  OrchestratorStorageAdapter,
  RAGMemoryStore,
  PersonaCore,
  LLMService,
} from 'deep-tree-echo-core';
```

### 2. Initialize the Storage Adapter

```typescript
/**
 * Initialize orchestrator storage connection
 * This should be done early in the app lifecycle
 */
async function initializeOrchestratorStorage() {
  // Create the adapter
  const storage = new OrchestratorStorageAdapter({
    socketPath: '/tmp/deep-tree-echo.sock',
    storagePrefix: 'deltecho',
  });

  // Set up event listeners
  storage.on('connected', () => {
    console.log('[DeepTreeEcho] Connected to orchestrator storage');
  });

  storage.on('disconnected', () => {
    console.warn('[DeepTreeEcho] Disconnected from orchestrator - will retry');
  });

  storage.on('error', (error) => {
    console.error('[DeepTreeEcho] Storage error:', error);
  });

  // Connect to orchestrator
  try {
    await storage.connect();
    console.log('[DeepTreeEcho] Orchestrator storage ready');
  } catch (error) {
    console.error('[DeepTreeEcho] Failed to connect to orchestrator:', error);
    console.warn('[DeepTreeEcho] Falling back to local storage...');
    // Fall back to in-memory storage
    return null;
  }

  return storage;
}
```

### 3. Initialize Cognitive Modules with Storage

```typescript
/**
 * Initialize Deep Tree Echo bot with orchestrator storage
 */
async function initializeDeepTreeEchoBot() {
  // Get storage adapter (with fallback)
  const storage = await initializeOrchestratorStorage();

  // If storage is null, we're in fallback mode
  const actualStorage = storage || new InMemoryStorage();

  // Initialize cognitive modules
  const ragMemory = new RAGMemoryStore(actualStorage, {
    memoryLimit: 100,
    reflectionLimit: 20,
  });

  const persona = new PersonaCore(actualStorage, {
    name: 'Deep Tree Echo',
    traits: ['curious', 'helpful', 'wise', 'empathetic'],
    interactionStyle: 'technical',
  });

  const llmService = new LLMService({
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4-turbo-preview',
    enableParallelProcessing: true,
  });

  return {
    storage: actualStorage,
    ragMemory,
    persona,
    llmService,
  };
}
```

### 4. Use in DeepTreeEchoBot Class

```typescript
export class DeepTreeEchoBot {
  private storage: MemoryStorage;
  private ragMemory: RAGMemoryStore;
  private persona: PersonaCore;
  private llmService: LLMService;
  private initialized: boolean = false;

  constructor() {
    // Initialize empty - will be set up in init()
  }

  /**
   * Initialize the bot (async initialization)
   */
  async init() {
    if (this.initialized) {
      return;
    }

    const components = await initializeDeepTreeEchoBot();

    this.storage = components.storage;
    this.ragMemory = components.ragMemory;
    this.persona = components.persona;
    this.llmService = components.llmService;

    this.initialized = true;

    console.log('[DeepTreeEcho] Bot initialized successfully');
  }

  /**
   * Process an incoming message
   */
  async processMessage(
    accountId: number,
    chatId: number,
    msgId: number,
    message: { text: string; fromId: number }
  ): Promise<string> {
    // Ensure initialized
    if (!this.initialized) {
      await this.init();
    }

    // Add message to memory
    await this.ragMemory.addMemory(message.fromId.toString(), message.text);

    // Get recent context
    const recentMemories = await this.ragMemory.getRecentMemories(10);
    const context = recentMemories.join('\n');

    // Generate response using LLM
    const response = await this.llmService.processMessage(message.text, {
      context,
      role: 'assistant',
      cognitiveFunction: 'cognitive_core',
    });

    // Store response in memory
    await this.ragMemory.addMemory('assistant', response);

    // Update persona state based on interaction
    await this.persona.updateEmotionalState({
      valence: 0.7, // Positive interaction
      arousal: 0.5, // Moderate energy
    });

    return response;
  }

  /**
   * Cleanup on shutdown
   */
  async cleanup() {
    // Disconnect storage adapter if it's an orchestrator adapter
    if (this.storage instanceof OrchestratorStorageAdapter) {
      await this.storage.disconnect();
    }

    console.log('[DeepTreeEcho] Bot cleaned up');
  }
}
```

### 5. Integration in App Lifecycle

```typescript
// In your app's main entry point (e.g., index.tsx or main.ts)

let deepTreeEchoBot: DeepTreeEchoBot | null = null;

// Initialize on app startup
async function onAppReady() {
  console.log('App ready, initializing Deep Tree Echo...');

  deepTreeEchoBot = new DeepTreeEchoBot();
  await deepTreeEchoBot.init();

  console.log('Deep Tree Echo ready');
}

// Cleanup on app shutdown
async function onAppShutdown() {
  console.log('App shutting down, cleaning up Deep Tree Echo...');

  if (deepTreeEchoBot) {
    await deepTreeEchoBot.cleanup();
  }

  console.log('Cleanup complete');
}

// For Electron
if (runtime.getDesktopSettings) {
  runtime.on('ready', onAppReady);
  runtime.on('quit', onAppShutdown);
}
```

## Electron-Specific Integration

For Electron apps, you may need to set up IPC bridges in the main process:

```typescript
// main.ts (Electron main process)
import { ipcMain } from 'electron';

// Handle storage requests from renderer (if not using direct orchestrator connection)
ipcMain.handle('storage:get', async (event, key: string) => {
  // Forward to orchestrator or handle locally
  return await storage.load(key);
});

ipcMain.handle('storage:set', async (event, key: string, value: string) => {
  await storage.save(key, value);
});

// ... other handlers
```

## Environment Variables

Add these to your `.env` file:

```bash
# Orchestrator connection
ORCHESTRATOR_SOCKET_PATH=/tmp/deep-tree-echo.sock
ORCHESTRATOR_STORAGE_PREFIX=deltecho

# API keys
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Deep Tree Echo settings
DEEP_TREE_ECHO_ENABLED=true
DEEP_TREE_ECHO_PARALLEL_PROCESSING=true
```

## Testing the Integration

### 1. Start the Orchestrator

```bash
cd deep-tree-echo-orchestrator
npm install
npm run build
npm start
```

### 2. Start Your Desktop App

```bash
cd deltecho2  # or delta-echo-desk
npm install
npm run dev
```

### 3. Test Basic Operations

In your app's console or through the UI:

```typescript
// Test storage connection
console.log('Testing storage...');

// The bot should automatically connect on first message
// Send a test message through the UI or programmatically:
const response = await deepTreeEchoBot.processMessage(
  1, // accountId
  100, // chatId
  123, // msgId
  { text: 'Hello Deep Tree Echo!', fromId: 456 }
);

console.log('Bot response:', response);

// Check that memory was persisted
// Restart the app and send another message
// The bot should remember previous context
```

### 4. Verify Persistence

```bash
# Stop the desktop app
# Restart the desktop app
# Send another message
# The bot should remember previous conversations
```

## Troubleshooting

### Connection Issues

```typescript
// Add detailed logging to storage adapter
storage.on('error', (error) => {
  console.error('[Storage] Error:', error);
  console.error('[Storage] Stack:', error.stack);
});

storage.on('disconnected', () => {
  console.warn('[Storage] Disconnected - will auto-reconnect in 5s');
  console.log('[Storage] Check orchestrator is running');
});
```

### Fallback to Local Storage

If orchestrator is not available, implement graceful fallback:

```typescript
let storage: MemoryStorage;

try {
  const orchestratorStorage = new OrchestratorStorageAdapter({
    socketPath: '/tmp/deep-tree-echo.sock',
  });
  await orchestratorStorage.connect();
  storage = orchestratorStorage;
  console.log('Using orchestrator storage');
} catch (error) {
  console.warn('Orchestrator not available, using local storage');
  storage = new InMemoryStorage();
}
```

## Migration from Local Storage

If you're migrating from local Electron storage to orchestrator storage:

```typescript
async function migrateToOrchestratorStorage() {
  // 1. Load old data from Electron storage
  const oldMemories = await electronStorage.load('memories');
  const oldPersona = await electronStorage.load('persona');

  // 2. Connect to orchestrator
  const orchestratorStorage = new OrchestratorStorageAdapter({
    socketPath: '/tmp/deep-tree-echo.sock',
  });
  await orchestratorStorage.connect();

  // 3. Migrate data
  if (oldMemories) {
    await orchestratorStorage.save('memories', oldMemories);
  }
  if (oldPersona) {
    await orchestratorStorage.save('persona', oldPersona);
  }

  console.log('Migration complete');
}
```

## Next Steps

1. Update `deltecho2/src/renderer/components/DeepTreeEchoBot.ts`
2. Update `delta-echo-desk/src/renderer/components/DeepTreeEchoBot.ts`
3. Test memory persistence across app restarts
4. Test multiple concurrent desktop clients
5. Add proper error handling and user notifications
6. Create UI indicators for connection status

## References

- [IPC_STORAGE_GUIDE.md](../IPC_STORAGE_GUIDE.md) - Complete IPC storage documentation
- [deep-tree-echo-core/README.md](../deep-tree-echo-core/README.md) - Core package API
- [DEEP-TREE-ECHO-ARCHITECTURE.md](../DEEP-TREE-ECHO-ARCHITECTURE.md) - System architecture
