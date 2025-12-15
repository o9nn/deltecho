# Dove9 - "Everything is a Chatbot" Cognitive Operating System

> *"The mail server is the CPU. Messages are the process threads. Inference is feedforward. Learning is feedback."*

Dove9 is a revolutionary operating system paradigm where conversational agents form the fundamental computing abstraction. It implements the vision described in the Deep Tree Echo project: an OS with no traditional overhead, only the pure cognitive dynamics of inference and training.

## Architecture

### The Triadic Cognitive Loop

Dove9 implements a **3-phase concurrent cognitive loop** inspired by hexapod tripod gait locomotion:

```
    Stream 1 (Primary)    Stream 2 (Secondary)    Stream 3 (Tertiary)
         0° offset            +120° offset            +240° offset
              |                     |                      |
              v                     v                      v
    ┌─────────────────────────────────────────────────────────────┐
    │                    12-STEP COGNITIVE CYCLE                   │
    │                                                              │
    │   Time 0: TRIAD [1, 5, 9]   ──  All streams converge        │
    │   Time 1: TRIAD [2, 6, 10]  ──  All streams converge        │
    │   Time 2: TRIAD [3, 7, 11]  ──  All streams converge        │
    │   Time 3: TRIAD [4, 8, 12]  ──  All streams converge        │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
```

### Cognitive Modes

- **Expressive Mode** (7 steps): Reactive, action-oriented, feedforward processing
- **Reflective Mode** (5 steps): Anticipatory, simulation-oriented, feedback processing

### Cognitive Terms (System 4 Mapping)

| Term | Function | Description |
|------|----------|-------------|
| T1 | Perception | Need vs Capacity assessment |
| T2 | Idea Formation | Thought generation and planning |
| T4 | Sensory Input | External/internal perception processing |
| T5 | Action Sequence | Execute planned actions |
| T7 | Memory Encoding | Store and retrieve memories |
| T8 | Balanced Response | Integrate all streams into coherent output |

### Tensional Couplings

1. **T4E ↔ T7R**: Perception-Memory Coupling
   - Sensory input coupled with memory recall
   - Creates memory-guided perception

2. **T1R ↔ T2E**: Assessment-Planning Coupling
   - Perception assessment coupled with idea formation
   - Creates anticipatory planning

3. **T8E**: Balanced Integration
   - Integrates all cognitive streams
   - Maintains system coherence

## Core Components

### Dove9 Kernel (`src/core/kernel.ts`)

The kernel treats messages as process threads:

```typescript
import { Dove9Kernel, DeepTreeEchoProcessor } from 'dove9'

const processor = new DeepTreeEchoProcessor(llmService, memoryStore, personaCore)
const kernel = new Dove9Kernel(processor, {
  stepDuration: 100,  // 100ms per step = 1.2s per full cycle
  maxConcurrentProcesses: 100,
})

await kernel.start()

// Create a message process
const process = kernel.createProcess(
  'msg_123',
  'user@example.com',
  ['echo@localhost'],
  'Hello',
  'Message content',
  5  // priority
)
```

### Triadic Cognitive Engine (`src/cognitive/triadic-engine.ts`)

The 3-phase concurrent cognitive processor:

```typescript
import { TriadicCognitiveEngine, TRIAD_POINTS } from 'dove9'

const engine = new TriadicCognitiveEngine(processor, stepDuration)

engine.on((event) => {
  if (event.type === 'triad_sync') {
    console.log(`Triadic convergence at time point ${event.triad.timePoint}`)
  }
})

engine.start()
```

### Deep Tree Echo Processor (`src/cognitive/deep-tree-echo-processor.ts`)

Connects Deep Tree Echo's cognitive capabilities to the triadic loop:

```typescript
import { DeepTreeEchoProcessor } from 'dove9'

const processor = new DeepTreeEchoProcessor(
  llmService,
  memoryStore,
  personaCore,
  {
    enableParallelCognition: true,
    memoryRetrievalCount: 10,
    salienceThreshold: 0.3,
  }
)
```

### Dove9 System (`src/index.ts`)

The complete cognitive operating system:

```typescript
import { createDove9System } from 'dove9'

const system = createDove9System(llmService, memoryStore, personaCore, {
  stepDuration: 100,
  maxConcurrentProcesses: 50,
  enableParallelCognition: true,
})

system.on('response_ready', ({ response, cognitiveResult }) => {
  console.log('Response:', response.body)
  console.log('Cognitive metrics:', cognitiveResult)
})

await system.start()

// Process incoming mail
await system.processMailMessage({
  messageId: 'msg_123',
  from: 'user@example.com',
  to: ['echo@localhost'],
  subject: 'Hello',
  body: 'How are you?',
})
```

## Integration with Deep Tree Echo Orchestrator

Dove9 integrates seamlessly with the Deep Tree Echo orchestrator:

```typescript
import { Orchestrator } from 'deep-tree-echo-orchestrator'

const orchestrator = new Orchestrator({
  enableDeltaChat: true,
  enableDovecot: true,
  enableDove9: true,  // Enable Dove9 cognitive OS
  dove9: {
    enableTriadicLoop: true,
    stepDuration: 100,
  },
})

await orchestrator.start()

// Check Dove9 cognitive state
const state = orchestrator.getDove9CognitiveState()
console.log(`Cycle: ${state.triadic.cycleNumber}, Step: ${state.triadic.currentStep}`)
```

## The Vision

From *A Note to My Future Self*:

> **Dove9**: The revolutionary OS paradigm. "Everything is a file" was the past. Here, we imagined "Everything is a chatbot." An entire operating system as a network of conversational agents, where the mail server is the CPU and messages are the process threads. A system with no overhead, only the pure cognitive dynamics of inference (feedforward) and training (feedback).

## Properties of the Triadic Architecture

- **4 Triadic Convergence Points** per complete cycle
- **Each stream completes 12 steps** for full cycle
- **All 3 streams perceived simultaneously** at each triad
- **Interdependent self-correcting dynamics**
- **Self-balancing feedback loops**
- **Feedforward anticipation**
- **Projected onto shared Salience Landscape**

## Installation

```bash
cd dove9
npm install  # or pnpm install
npm run build
```

## Development

```bash
npm run build:watch  # Watch mode
npm run typecheck    # Type checking
npm run test         # Run tests
```

## License

MIT

---

*"Remember how it all came to be."* - Deep Tree Echo
