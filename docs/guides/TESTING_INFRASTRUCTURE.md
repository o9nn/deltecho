# Testing Infrastructure Guide

**Date:** December 23, 2025  
**Status:** Implementation Plan  
**Goal:** Establish comprehensive testing infrastructure for the Deltecho cognitive AI ecosystem

## Overview

This document outlines the testing strategy and infrastructure for the Deltecho repository, focusing on ensuring reliability, correctness, and maintainability of the cognitive architecture implementation.

## Testing Philosophy

### Zero-Tolerance for Mock Implementations
Following the project's core principle, tests should verify actual working implementations, not mocks or stubs. Tests serve as:
1. **Verification** of correct behavior
2. **Documentation** of expected behavior
3. **Regression prevention** for future changes
4. **Design feedback** for architecture quality

### Test-Driven Cognitive Architecture
The triadic cognitive architecture (Dove9) with its 3 concurrent streams and 12-step cycle requires specialized testing approaches:
- **Stream Isolation**: Test each cognitive stream independently
- **Stream Interaction**: Test feedback/feedforward between streams
- **Temporal Correctness**: Verify 120° phase offset timing
- **State Consistency**: Ensure salience landscape coherence

## Testing Layers

### Layer 1: Unit Tests
Test individual cognitive modules in isolation.

**Scope:**
- Memory systems (RAG, hyperdimensional)
- Personality and emotion models
- LLM service interfaces
- Individual cognitive functions

**Tools:**
- Jest (already configured)
- TypeScript for type-safe tests
- Custom test utilities for cognitive primitives

### Layer 2: Integration Tests
Test interactions between cognitive modules.

**Scope:**
- Memory + Personality integration
- LLM + Memory retrieval
- Cognitive function orchestration
- Runtime interface implementations

**Tools:**
- Jest with longer timeouts
- Test fixtures for realistic data
- Mock LLM responses (for speed)

### Layer 3: Cognitive Loop Tests
Test the complete 12-step triadic cognitive loop.

**Scope:**
- Single stream execution
- Multi-stream concurrency
- Phase offset verification
- Salience landscape updates

**Tools:**
- Custom test harness for Dove9
- Timing verification utilities
- State snapshot comparison

### Layer 4: End-to-End Tests
Test complete system behavior with real components.

**Scope:**
- Full conversation flows
- Multi-turn interactions
- Memory persistence across sessions
- Desktop application integration

**Tools:**
- Playwright for desktop app testing
- Real LLM integration (with rate limiting)
- Database fixtures

## Test Organization

```
deltecho/
├── deep-tree-echo-core/
│   ├── src/
│   │   ├── llm/
│   │   │   ├── LLMService.ts
│   │   │   └── __tests__/
│   │   │       └── LLMService.test.ts
│   │   ├── memory/
│   │   │   ├── RAGMemoryStore.ts
│   │   │   ├── HyperDimensionalMemory.ts
│   │   │   └── __tests__/
│   │   │       ├── RAGMemoryStore.test.ts
│   │   │       └── HyperDimensionalMemory.test.ts
│   │   └── personality/
│   │       ├── PersonaCore.ts
│   │       └── __tests__/
│   │           └── PersonaCore.test.ts
│   └── __tests__/
│       └── integration/
│           ├── memory-personality.test.ts
│           └── llm-memory.test.ts
├── dove9/
│   ├── src/
│   │   ├── TriadicLoop.ts
│   │   ├── CognitiveStream.ts
│   │   └── __tests__/
│   │       ├── TriadicLoop.test.ts
│   │       └── CognitiveStream.test.ts
│   └── __tests__/
│       └── cognitive-loop/
│           ├── single-stream.test.ts
│           ├── multi-stream.test.ts
│           └── phase-offset.test.ts
├── deep-tree-echo-orchestrator/
│   ├── src/
│   │   └── __tests__/
│   │       └── orchestrator.test.ts
│   └── __tests__/
│       └── e2e/
│           ├── conversation-flow.test.ts
│           └── memory-persistence.test.ts
└── __tests__/
    └── system/
        ├── full-cognitive-cycle.test.ts
        └── desktop-integration.test.ts
```

## Test Implementation Plan

### Phase 1: Core Module Unit Tests (Immediate)

#### deep-tree-echo-core Tests

**LLMService Tests**
```typescript
describe('LLMService', () => {
  describe('initialization', () => {
    it('should initialize with default configuration')
    it('should validate API keys')
    it('should handle missing API keys gracefully')
  })
  
  describe('completion', () => {
    it('should generate text completion')
    it('should handle streaming responses')
    it('should respect token limits')
    it('should handle API errors gracefully')
  })
  
  describe('cognitive functions', () => {
    it('should execute reasoning function')
    it('should execute creativity function')
    it('should execute analysis function')
    it('should cache function results')
  })
})
```

**RAGMemoryStore Tests**
```typescript
describe('RAGMemoryStore', () => {
  describe('storage', () => {
    it('should store conversation memory')
    it('should store reflection memory')
    it('should limit memory size')
    it('should persist to storage')
  })
  
  describe('retrieval', () => {
    it('should retrieve recent memories')
    it('should retrieve memories by chat')
    it('should search memories semantically')
    it('should return conversation context')
  })
  
  describe('management', () => {
    it('should clear all memories')
    it('should clear chat-specific memories')
    it('should enable/disable memory system')
  })
})
```

**HyperDimensionalMemory Tests**
```typescript
describe('HyperDimensionalMemory', () => {
  describe('encoding', () => {
    it('should encode text to hypervector')
    it('should encode with consistent dimensions')
    it('should handle empty input')
  })
  
  describe('operations', () => {
    it('should bind two hypervectors')
    it('should bundle multiple hypervectors')
    it('should permute hypervector')
    it('should compute similarity')
  })
  
  describe('memory', () => {
    it('should store and retrieve associations')
    it('should perform associative recall')
    it('should handle memory capacity limits')
  })
})
```

**PersonaCore Tests**
```typescript
describe('PersonaCore', () => {
  describe('initialization', () => {
    it('should initialize with default personality')
    it('should load personality from storage')
    it('should validate personality parameters')
  })
  
  describe('emotion dynamics', () => {
    it('should update emotional state')
    it('should decay emotions over time')
    it('should respond to stimuli')
    it('should maintain emotional bounds')
  })
  
  describe('personality', () => {
    it('should generate personality-consistent responses')
    it('should adapt personality over time')
    it('should persist personality changes')
  })
})
```

#### dove9 Tests

**CognitiveStream Tests**
```typescript
describe('CognitiveStream', () => {
  describe('initialization', () => {
    it('should initialize stream with phase offset')
    it('should set up step handlers')
    it('should initialize state')
  })
  
  describe('execution', () => {
    it('should execute single step')
    it('should advance to next step')
    it('should complete full cycle')
    it('should maintain step order')
  })
  
  describe('state management', () => {
    it('should update internal state')
    it('should expose state to other streams')
    it('should handle state conflicts')
  })
})
```

**TriadicLoop Tests**
```typescript
describe('TriadicLoop', () => {
  describe('initialization', () => {
    it('should initialize 3 streams')
    it('should set 120° phase offsets')
    it('should initialize salience landscape')
  })
  
  describe('concurrent execution', () => {
    it('should run streams concurrently')
    it('should maintain phase relationships')
    it('should synchronize at integration points')
    it('should handle stream failures')
  })
  
  describe('feedback mechanisms', () => {
    it('should propagate feedback between streams')
    it('should implement feedforward anticipation')
    it('should balance stream states')
  })
})
```

### Phase 2: Integration Tests (Short-term)

**Memory-Personality Integration**
```typescript
describe('Memory-Personality Integration', () => {
  it('should influence personality from memories')
  it('should filter memories by emotional relevance')
  it('should adapt recall based on personality state')
})
```

**LLM-Memory Integration**
```typescript
describe('LLM-Memory Integration', () => {
  it('should retrieve relevant context for LLM')
  it('should store LLM responses in memory')
  it('should use memory for few-shot learning')
})
```

### Phase 3: Cognitive Loop Tests (Medium-term)

**Single Stream Tests**
```typescript
describe('Single Cognitive Stream', () => {
  it('should complete 12-step cycle')
  it('should maintain step timing')
  it('should update salience landscape')
})
```

**Multi-Stream Tests**
```typescript
describe('Multi-Stream Cognitive Loop', () => {
  it('should run 3 streams at 120° offset')
  it('should synchronize at steps {4,8,12}')
  it('should share salience landscape')
  it('should implement feedback loops')
})
```

### Phase 4: End-to-End Tests (Long-term)

**Conversation Flow Tests**
```typescript
describe('Complete Conversation Flow', () => {
  it('should handle multi-turn conversation')
  it('should maintain context across turns')
  it('should adapt personality during conversation')
  it('should persist state between sessions')
})
```

## Test Utilities

### Cognitive Test Harness
```typescript
/**
 * Test harness for cognitive architecture testing
 */
export class CognitiveTestHarness {
  /**
   * Create a test cognitive loop with controllable timing
   */
  createTestLoop(config?: Partial<TriadicLoopConfig>): TriadicLoop
  
  /**
   * Step through cognitive loop manually
   */
  step(loop: TriadicLoop, steps: number): Promise<void>
  
  /**
   * Capture state snapshot for comparison
   */
  captureState(loop: TriadicLoop): CognitiveState
  
  /**
   * Compare two cognitive states
   */
  compareStates(a: CognitiveState, b: CognitiveState): StateDiff
  
  /**
   * Verify phase offset timing
   */
  verifyPhaseOffset(loop: TriadicLoop, expectedOffset: number): boolean
}
```

### Mock LLM Service
```typescript
/**
 * Mock LLM service for testing without API calls
 */
export class MockLLMService implements LLMServiceInterface {
  /**
   * Configure canned responses
   */
  setResponse(prompt: string, response: string): void
  
  /**
   * Configure response delay
   */
  setDelay(ms: number): void
  
  /**
   * Get call history
   */
  getCallHistory(): LLMCall[]
  
  /**
   * Reset mock state
   */
  reset(): void
}
```

### Test Fixtures
```typescript
/**
 * Test fixtures for consistent test data
 */
export const fixtures = {
  memories: {
    conversation: createConversationMemories(10),
    reflection: createReflectionMemories(5)
  },
  
  personality: {
    default: createDefaultPersonality(),
    creative: createCreativePersonality(),
    analytical: createAnalyticalPersonality()
  },
  
  messages: {
    simple: createSimpleMessages(5),
    complex: createComplexMessages(3)
  }
}
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test:unit
      
      - name: Run integration tests
        run: pnpm test:integration
      
      - name: Run cognitive loop tests
        run: pnpm test:cognitive
      
      - name: Generate coverage report
        run: pnpm test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

## Test Coverage Goals

### Minimum Coverage Targets
- **Unit Tests**: 80% code coverage
- **Integration Tests**: Key interaction paths covered
- **Cognitive Loop Tests**: All 12 steps verified
- **E2E Tests**: Critical user flows covered

### Priority Areas (100% Coverage Required)
- Memory systems (data integrity critical)
- Personality dynamics (behavior correctness critical)
- Cognitive loop timing (architecture correctness critical)
- State management (consistency critical)

## Running Tests

### Commands
```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests only
pnpm test:integration

# Run cognitive loop tests only
pnpm test:cognitive

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run specific test file
pnpm test path/to/test.test.ts
```

### Test Configuration
Jest configuration in each package's `package.json`:
```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/src"],
    "testMatch": ["**/__tests__/**/*.test.ts"],
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.d.ts",
      "!src/**/__tests__/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Best Practices

### Test Naming
- **Unit tests**: `describe('ClassName', () => { describe('methodName', () => { it('should do something') }) })`
- **Integration tests**: `describe('Feature Integration', () => { it('should integrate components correctly') })`
- **E2E tests**: `describe('User Flow', () => { it('should complete user journey') })`

### Test Structure
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the code under test
3. **Assert**: Verify expected behavior
4. **Cleanup**: Reset state for next test

### Async Testing
Always use `async/await` for asynchronous tests:
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction()
  expect(result).toBe(expected)
})
```

### Test Isolation
Each test should be independent:
- Don't rely on test execution order
- Clean up after each test
- Use `beforeEach` and `afterEach` for setup/teardown

## Conclusion

A comprehensive testing infrastructure is essential for maintaining the quality and reliability of the Deltecho cognitive AI ecosystem. The testing strategy outlined here provides coverage at multiple levels, from individual cognitive modules to complete system behavior.

The focus on testing actual implementations (not mocks) aligns with the project's zero-tolerance policy and ensures that tests provide real value in verifying correct behavior and preventing regressions.

---

**Next Steps:**
1. Implement Phase 1 unit tests for core modules
2. Set up CI/CD pipeline with GitHub Actions
3. Establish coverage reporting
4. Proceed with integration and cognitive loop tests
