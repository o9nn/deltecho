# UI Components Refactoring Guide

**Status:** In Progress  
**Date:** December 23, 2025  
**Package:** @deltecho/ui-components

## Overview

The `@deltecho/ui-components` package requires comprehensive refactoring to decouple it from Delta Chat Desktop internal dependencies and make it a standalone, reusable component library for the Deltecho ecosystem.

## Current State

### Completed Refactoring
✅ Fixed relative logger imports to use `@deltecho/shared/logger`  
✅ Created runtime interface abstraction in `@deltecho/shared/runtime`  
✅ Fixed most runtime imports to use the new abstraction  
✅ Commented out unavailable Delta Chat Desktop imports

### Remaining Issues

#### 1. Missing Dependencies
- **lucide-react**: Icon library used by AICompanionHub components
  - Solution: Add to package.json dependencies
  - `pnpm add lucide-react --filter @deltecho/ui-components`

#### 2. Runtime Import Issues
Several files still reference `runtime` without importing it:
- `AICompanionHub/ConnectorRegistry.ts`
- `AICompanionHub/MemoryPersistenceLayer.ts`
- `DeepTreeEchoBot/BotSettings.tsx`

**Fix:** Add `import { runtime } from '@deltecho/shared/runtime'` to these files

#### 3. Backend Communication Abstraction
Files that depend on `backend-com.js` (Delta Chat Desktop IPC):
- `DeepTreeEchoBot/DeepTreeEchoBot.ts`
- `DeepTreeEchoBot/DeepTreeEchoDev.ts`
- `DeepTreeEchoBot/DeepTreeEchoIntegration.ts`
- `DeepTreeEchoBot/DeepTreeEchoTestUtil.ts`
- `DeepTreeEchoBot/DeltachatBotInterface.ts`

**Solution:** Create `@deltecho/shared/backend.ts` with abstract backend interface

#### 4. Screen Controller Abstraction
File that depends on `ScreenController.js`:
- `DeepTreeEchoBot/DeepTreeEchoSettingsScreen.tsx`

**Solution:** Create `@deltecho/shared/navigation.ts` with abstract navigation interface

#### 5. Type Mismatches in AICompanionHub
- `AICompanionController.tsx`: Missing `companionId` property in `ConversationContext`
- `AICompanionCreator.tsx`: Invalid `roleplaying` capability, type mismatch for capabilities
- `AICompanionHub.tsx`: Invalid tab comparisons
- `ConnectorRegistry.ts`: Missing `type` property in `AIConnectorConfig`, type mismatches

**Solution:** Review and fix type definitions in component files

## Refactoring Strategy

### Phase 1: Add Missing Dependencies (Immediate)
```bash
cd /home/ubuntu/deltecho
pnpm add lucide-react --filter @deltecho/ui-components
pnpm add react react-dom --save-peer --filter @deltecho/ui-components
```

### Phase 2: Fix Runtime Imports (Immediate)
Add missing runtime imports to files that use `runtime` but don't import it.

```typescript
import { runtime } from '@deltecho/shared/runtime'
```

### Phase 3: Create Backend Abstraction (Short-term)
Create `/home/ubuntu/deltecho/packages/shared/backend.ts`:

```typescript
export interface BackendInterface {
  sendMessage(chatId: number, text: string): Promise<void>
  getChats(): Promise<Chat[]>
  getMessages(chatId: number): Promise<Message[]>
  // ... other backend methods
}

export const backend: BackendInterface = {
  // Default no-op implementations
}

export function setBackend(impl: BackendInterface): void {
  // Set backend implementation
}
```

### Phase 4: Create Navigation Abstraction (Short-term)
Create `/home/ubuntu/deltecho/packages/shared/navigation.ts`:

```typescript
export interface NavigationInterface {
  navigate(screen: string, params?: any): void
  goBack(): void
  // ... other navigation methods
}

export const navigation: NavigationInterface = {
  // Default no-op implementations
}

export function setNavigation(impl: NavigationInterface): void {
  // Set navigation implementation
}
```

### Phase 5: Fix Type Definitions (Medium-term)
Review and correct all type definitions in AICompanionHub components to ensure type safety.

### Phase 6: Remove Desktop-Specific Code (Long-term)
Identify and abstract or remove code that is tightly coupled to Delta Chat Desktop:
- DeltaChat JSON-RPC client usage
- Desktop-specific settings storage
- Electron-specific APIs

## Architecture Goals

### Standalone Operation
The ui-components package should be usable in:
1. **Delta Chat Desktop** - With full backend integration
2. **Standalone Web App** - With mock/demo backend
3. **Mobile App** - With native backend bridge
4. **Storybook** - For component development and testing

### Dependency Injection
All external dependencies should be injected through interfaces:
- **Runtime**: Platform-specific operations (file I/O, notifications, etc.)
- **Backend**: Chat backend operations (send message, get chats, etc.)
- **Navigation**: Screen navigation and routing
- **Storage**: Persistent data storage

### Clean Separation of Concerns
```
ui-components/
├── DeepTreeEchoBot/        # Deep Tree Echo bot UI
│   ├── components/         # Pure React components
│   ├── hooks/             # React hooks
│   ├── services/          # Business logic (uses injected interfaces)
│   └── types/             # TypeScript type definitions
├── AICompanionHub/         # AI Companion Hub UI
│   ├── components/
│   ├── hooks/
│   ├── connectors/        # AI service connectors
│   └── types/
└── shared/                # Shared UI utilities
    ├── components/
    ├── hooks/
    └── utils/
```

## Implementation Checklist

### Immediate Actions
- [ ] Add lucide-react dependency
- [ ] Fix missing runtime imports in 3 files
- [ ] Test build after fixes

### Short-term Actions
- [ ] Create backend interface abstraction
- [ ] Create navigation interface abstraction
- [ ] Update components to use abstractions
- [ ] Add peer dependencies (react, react-dom)

### Medium-term Actions
- [ ] Fix all type mismatches in AICompanionHub
- [ ] Review and update type definitions
- [ ] Add comprehensive JSDoc documentation
- [ ] Create Storybook stories for components

### Long-term Actions
- [ ] Remove all Delta Chat Desktop specific code
- [ ] Create demo backend implementation
- [ ] Add unit tests for all components
- [ ] Add integration tests
- [ ] Create usage examples and documentation

## Testing Strategy

### Unit Tests
Test individual components in isolation:
```typescript
describe('DeepTreeEchoBot', () => {
  it('should render with mock runtime', () => {
    const mockRuntime = createMockRuntime()
    setRuntime(mockRuntime)
    // ... test component
  })
})
```

### Integration Tests
Test components with real (or realistic) backends:
```typescript
describe('AICompanionHub Integration', () => {
  it('should create and interact with companion', async () => {
    const testBackend = createTestBackend()
    setBackend(testBackend)
    // ... test full workflow
  })
})
```

### Storybook Stories
Create interactive component documentation:
```typescript
export const Default: Story = {
  args: {
    // Component props
  },
  parameters: {
    runtime: mockRuntime,
    backend: mockBackend
  }
}
```

## Migration Path for Desktop Apps

When integrating with Delta Chat Desktop applications:

```typescript
// In desktop app initialization
import { setRuntime, setBackend, setNavigation } from '@deltecho/shared'
import { runtime as desktopRuntime } from '@deltachat-desktop/runtime-interface'
import { BackendRemote } from './backend-com'
import { ScreenController } from './ScreenController'

// Inject desktop implementations
setRuntime({
  getConfig: (key) => desktopRuntime.getDesktopSettings()[key],
  setConfig: (key, value) => desktopRuntime.setDesktopSetting(key, value),
  // ... map other methods
})

setBackend({
  sendMessage: (chatId, text) => BackendRemote.rpc.sendMessage(chatId, text),
  // ... map other methods
})

setNavigation({
  navigate: (screen, params) => ScreenController.navigate(screen, params),
  // ... map other methods
})
```

## Benefits of Refactoring

### Reusability
Components can be used across multiple applications without modification.

### Testability
Components can be tested in isolation with mock implementations.

### Maintainability
Clear separation of concerns makes code easier to understand and modify.

### Flexibility
New backends and runtimes can be added without changing component code.

### Documentation
Storybook stories serve as interactive documentation and examples.

## Conclusion

The ui-components refactoring is a significant but necessary undertaking to create a truly reusable component library for the Deltecho ecosystem. The work has been started with the runtime abstraction, and the remaining steps are clearly defined.

The refactoring should be completed incrementally, with each phase adding value and maintaining backward compatibility where possible. The immediate actions will get the package building, while the long-term actions will create a production-ready component library.

---

**Next Steps:** Complete immediate actions, then proceed with testing infrastructure setup.
