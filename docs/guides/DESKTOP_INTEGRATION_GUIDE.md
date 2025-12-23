# Desktop Application Integration Guide

This guide explains how to integrate the Deep Tree Echo core cognitive modules into desktop applications (Electron and Tauri).

## Overview

The Deep Tree Echo core provides runtime-agnostic cognitive modules that can be integrated into any JavaScript/TypeScript environment. For desktop applications, you need to:

1. Install the core package
2. Choose or create a storage adapter
3. Initialize cognitive modules
4. Integrate with your UI

## Installation

```bash
# From the monorepo root
pnpm add deep-tree-echo-core --filter your-desktop-app

# Or if using workspace protocol
pnpm add deep-tree-echo-core@workspace:* --filter your-desktop-app
```

## Electron Integration

### 1. Main Process Setup

Create IPC handlers for storage operations in your main process:

```typescript
// main.ts
import { app, ipcMain } from 'electron';
import Store from 'electron-store';

const store = new Store();

// Storage IPC handlers
ipcMain.handle('storage:get', (_event, key: string) => {
  return store.get(key);
});

ipcMain.handle('storage:set', (_event, key: string, value: any) => {
  store.set(key, value);
});

ipcMain.handle('storage:delete', (_event, key: string) => {
  store.delete(key);
});

ipcMain.handle('storage:clear', (_event, prefix: string) => {
  const allKeys = Object.keys(store.store);
  allKeys
    .filter(key => key.startsWith(prefix))
    .forEach(key => store.delete(key));
});

ipcMain.handle('storage:keys', (_event, prefix?: string) => {
  const allKeys = Object.keys(store.store);
  return prefix 
    ? allKeys.filter(key => key.startsWith(prefix))
    : allKeys;
});
```

### 2. Renderer Process Integration

Use the Electron storage adapter in your renderer process:

```typescript
// renderer.ts
import { ElectronStorageAdapter } from 'deep-tree-echo-core/adapters';
import { RAGMemoryStore, HyperDimensionalMemory } from 'deep-tree-echo-core/memory';
import { PersonaCore } from 'deep-tree-echo-core/personality';
import { EnhancedLLMService } from 'deep-tree-echo-core/cognitive';

// Initialize storage adapter
const storage = new ElectronStorageAdapter('deltecho');

// Initialize memory systems
const ragMemory = new RAGMemoryStore(storage, {
  memoryLimit: 100,
  reflectionLimit: 20,
});

const hyperMemory = new HyperDimensionalMemory(storage, {
  dimensions: 10000,
  memoryDecay: 0.95,
  contextWindow: 50,
});

// Initialize personality
const persona = new PersonaCore(storage);

// Initialize LLM service
const llmService = new EnhancedLLMService({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  temperature: 0.7,
});

// Use in your application
async function handleUserMessage(message: string) {
  // Add to memory
  await ragMemory.addMessage('user', message);
  
  // Get conversation context
  const history = await ragMemory.getConversationHistory();
  
  // Generate response
  const response = await llmService.complete([
    { role: 'system', content: 'You are a helpful AI assistant.' },
    ...history.map(h => ({ role: h.role, content: h.content })),
  ]);
  
  // Store response
  await ragMemory.addMessage('assistant', response.content);
  
  return response.content;
}
```

## Tauri Integration

### 1. Install Tauri Store Plugin

```bash
pnpm add @tauri-apps/plugin-store
```

Configure in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "store": {
      "enabled": true
    }
  }
}
```

### 2. Frontend Integration

```typescript
// src/lib/cognitive.ts
import { TauriStorageAdapter } from 'deep-tree-echo-core/adapters';
import { RAGMemoryStore } from 'deep-tree-echo-core/memory';
import { PersonaCore } from 'deep-tree-echo-core/personality';

// Initialize storage adapter
const storage = new TauriStorageAdapter('deltecho');

// Initialize cognitive modules
const ragMemory = new RAGMemoryStore(storage);
const persona = new PersonaCore(storage);

// Export for use in components
export { ragMemory, persona };
```

### 3. React Component Example

```tsx
// src/components/ChatInterface.tsx
import { useState } from 'react';
import { ragMemory } from '../lib/cognitive';

export function ChatInterface() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const sendMessage = async () => {
    await ragMemory.addMessage('user', message);
    
    // Your LLM integration here
    const response = await generateResponse(message);
    await ragMemory.addMessage('assistant', response);
    
    // Update UI
    const newHistory = await ragMemory.getConversationHistory();
    setHistory(newHistory);
    setMessage('');
  };

  return (
    <div>
      {history.map((msg, i) => (
        <div key={i} className={msg.role}>
          {msg.content}
        </div>
      ))}
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
    </div>
  );
}
```

## Configuration

### Environment Variables

Create a `.env` file in your desktop app:

```env
# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...

# Configuration
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000

# Memory Configuration
MEMORY_LIMIT=100
REFLECTION_LIMIT=20
HYPERDIMENSIONAL_DIMENSIONS=10000
```

### Loading Configuration

```typescript
// config.ts
export const config = {
  llm: {
    provider: process.env.LLM_PROVIDER || 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.LLM_MODEL || 'gpt-4',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000'),
  },
  memory: {
    limit: parseInt(process.env.MEMORY_LIMIT || '100'),
    reflectionLimit: parseInt(process.env.REFLECTION_LIMIT || '20'),
    dimensions: parseInt(process.env.HYPERDIMENSIONAL_DIMENSIONS || '10000'),
  },
};
```

## Best Practices

### 1. Error Handling

Always wrap cognitive operations in try-catch blocks:

```typescript
try {
  await ragMemory.addMessage('user', message);
} catch (error) {
  console.error('Failed to store message:', error);
  // Handle error appropriately
}
```

### 2. Memory Management

Clear old memories periodically to prevent storage bloat:

```typescript
// Clear memories older than 30 days
async function cleanOldMemories() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const history = await ragMemory.getConversationHistory();
  
  const recentHistory = history.filter(
    msg => msg.timestamp > thirtyDaysAgo
  );
  
  await ragMemory.clear();
  for (const msg of recentHistory) {
    await ragMemory.addMessage(msg.role, msg.content);
  }
}
```

### 3. Initialization

Initialize cognitive modules once at app startup:

```typescript
// Initialize in main app component or startup script
let initialized = false;

export async function initializeCognitive() {
  if (initialized) return;
  
  // Initialize storage
  const storage = new ElectronStorageAdapter('deltecho');
  
  // Initialize modules
  await ragMemory.initialize();
  await persona.initialize();
  
  initialized = true;
}
```

### 4. Graceful Shutdown

Save state before app closes:

```typescript
// In Electron main process
app.on('before-quit', async () => {
  // Ensure all pending writes complete
  await storage.flush();
});
```

## Troubleshooting

### Storage Not Persisting

- Verify IPC handlers are registered in main process
- Check file permissions for storage location
- Ensure storage adapter is initialized before use

### Memory Leaks

- Clear old conversation history periodically
- Limit hyperdimensional memory size
- Monitor memory usage with dev tools

### API Rate Limits

- Implement request queuing
- Add exponential backoff for retries
- Cache responses when appropriate

## Next Steps

- Implement custom storage adapters for specific needs
- Add telemetry and monitoring
- Integrate with orchestrator for autonomous operation
- Customize personality and cognitive parameters

## Support

For issues and questions:
- GitHub Issues: https://github.com/o9nn/deltecho/issues
- Documentation: See README files in each package
- Examples: Check the `examples/` directory
