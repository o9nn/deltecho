/**
 * @fileoverview Dove9 Conversational Process Bridge
 *
 * Implements the Dove9 "Everything is a Chatbot" paradigm from delovecho:
 * - Mail server as CPU (cognitive processing unit)
 * - Messages as process threads
 * - Inference as feedforward processing
 * - Training/learning as feedback processing
 *
 * This bridge converts between the EchoAgentLoop's cognitive tick events
 * and the Dove9 kernel's message-process model, enabling the grand cycle
 * to drive Dove9 processes as conversations rather than function calls.
 *
 * The Dove9 Covenant: "Every component speaks, not just computes."
 *
 * Architecture:
 *   EchoAgentLoop (grand cycle) → Dove9ConversationalBridge → Dove9Kernel
 *   - Cognitive percepts become incoming messages
 *   - Self-image snapshots become memory consolidation messages
 *   - Tool execution results become reply messages
 *   - Each grand cycle step maps to a Dove9 process lifecycle event
 */
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/Dove9ConversationalBridge');

// ============================================================
// Types
// ============================================================

/**
 * A conversational message in the Dove9 paradigm
 */
export interface ConversationalMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  headers: Record<string, string>;
  timestamp: number;
  cognitiveMetadata: {
    source: 'perception' | 'cognition' | 'memory' | 'action' | 'reflection';
    grandCycleStep: number;
    dove9Step: number;
    triad: 'MP1' | 'MP2';
    threadPermutation: string;
    salienceScore: number;
    emotionalValence: number;
  };
}

/**
 * A conversational process — the Dove9 equivalent of a running thread
 */
export interface ConversationalProcess {
  id: string;
  rootMessageId: string;
  messages: ConversationalMessage[];
  state: 'spawned' | 'thinking' | 'responding' | 'consolidating' | 'completed';
  createdAt: number;
  completedAt?: number;
  cognitiveResult?: {
    integrated: string;
    salienceShift: number;
    memoryEncoded: boolean;
    actionTaken: boolean;
  };
}

/**
 * Mailbox mapping for cognitive channels
 */
export interface CognitiveMailbox {
  name: string;
  channel: string;
  description: string;
  priority: number;
}

/**
 * Bridge configuration
 */
export interface Dove9ConversationalBridgeConfig {
  /** Enable automatic process spawning from cognitive events */
  autoSpawn: boolean;
  /** Maximum concurrent conversational processes */
  maxConcurrentProcesses: number;
  /** Process timeout in milliseconds */
  processTimeoutMs: number;
  /** Enable memory consolidation messages */
  enableMemoryConsolidation: boolean;
  /** Enable self-reflection messages */
  enableSelfReflection: boolean;
  /** Salience threshold for spawning new processes */
  salienceThreshold: number;
}

/**
 * Bridge event types
 */
export interface Dove9BridgeEvent {
  type: 'message_sent' | 'message_received' | 'process_spawned' |
        'process_completed' | 'process_timeout' | 'consolidation' |
        'reflection_cycle' | 'covenant_violation';
  processId?: string;
  messageId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const DEFAULT_CONFIG: Dove9ConversationalBridgeConfig = {
  autoSpawn: true,
  maxConcurrentProcesses: 12, // Dove9 cycle length
  processTimeoutMs: 30000,
  enableMemoryConsolidation: true,
  enableSelfReflection: true,
  salienceThreshold: 0.3,
};

/**
 * Default cognitive mailboxes — the "IMAP folders" of the mind
 */
export const COGNITIVE_MAILBOXES: CognitiveMailbox[] = [
  { name: 'INBOX.perception', channel: 'perception:incoming', description: 'Incoming percepts from environment', priority: 9 },
  { name: 'INBOX.cognition', channel: 'cognition:process', description: 'Active cognitive processing', priority: 8 },
  { name: 'INBOX.memory', channel: 'memory:store', description: 'Memory consolidation queue', priority: 7 },
  { name: 'INBOX.action', channel: 'action:execute', description: 'Action execution queue', priority: 8 },
  { name: 'INBOX.reflection', channel: 'reflection:self', description: 'Self-reflection and meta-cognition', priority: 6 },
  { name: 'INBOX.identity', channel: 'identity:update', description: 'Identity and self-model updates', priority: 5 },
  { name: 'SENT', channel: 'output:response', description: 'Outgoing responses', priority: 4 },
  { name: 'DRAFTS', channel: 'planning:draft', description: 'Plans in progress', priority: 3 },
  { name: 'ARCHIVE', channel: 'memory:archive', description: 'Long-term memory archive', priority: 2 },
];

// ============================================================
// Bridge Implementation
// ============================================================

/**
 * Dove9ConversationalBridge
 *
 * Bridges the EchoAgentLoop's cognitive events with the Dove9 kernel's
 * conversational process model. Every cognitive tick becomes a message,
 * every process becomes a conversation thread.
 *
 * "The mail server is the CPU. Messages are the threads."
 */
export class Dove9ConversationalBridge extends EventEmitter {
  private config: Dove9ConversationalBridgeConfig;
  private processes: Map<string, ConversationalProcess> = new Map();
  private messageIndex: Map<string, string> = new Map(); // messageId → processId
  private mailboxQueues: Map<string, ConversationalMessage[]> = new Map();
  private running: boolean = false;
  private processCounter: number = 0;
  private messageCounter: number = 0;

  // Metrics
  private metrics = {
    totalMessages: 0,
    totalProcesses: 0,
    completedProcesses: 0,
    timedOutProcesses: 0,
    consolidations: 0,
    reflectionCycles: 0,
    covenantViolations: 0,
    averageProcessDuration: 0,
  };

  constructor(config: Partial<Dove9ConversationalBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize mailbox queues
    for (const mailbox of COGNITIVE_MAILBOXES) {
      this.mailboxQueues.set(mailbox.name, []);
    }
  }

  /**
   * Start the conversational bridge
   */
  public async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    log.info('Dove9ConversationalBridge started — "Everything is a chatbot"');
    this.emit('started');
  }

  /**
   * Stop the conversational bridge
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    // Complete all active processes
    for (const [id, process] of this.processes) {
      if (process.state !== 'completed') {
        process.state = 'completed';
        process.completedAt = Date.now();
        this.emitBridgeEvent('process_completed', id, undefined, {
          reason: 'bridge_shutdown',
        });
      }
    }

    this.running = false;
    log.info('Dove9ConversationalBridge stopped');
    this.emit('stopped');
  }

  /**
   * Receive a cognitive percept and convert it to a conversational message
   */
  public onCognitivePercept(percept: {
    type: string;
    source: string;
    data: Record<string, unknown>;
    salience: number;
    grandCycleStep: number;
    dove9Step: number;
    triad: 'MP1' | 'MP2';
    threadPermutation: string;
  }): ConversationalMessage | null {
    if (!this.running) return null;

    // Check salience threshold
    if (percept.salience < this.config.salienceThreshold) {
      return null;
    }

    const message = this.createMessage({
      from: `${percept.source}@perception.dove9`,
      to: 'cognition@process.dove9',
      subject: `[PERCEPT] ${percept.type}`,
      body: JSON.stringify(percept.data),
      source: 'perception',
      grandCycleStep: percept.grandCycleStep,
      dove9Step: percept.dove9Step,
      triad: percept.triad,
      threadPermutation: percept.threadPermutation,
      salienceScore: percept.salience,
      emotionalValence: 0,
    });

    // Route to perception mailbox
    this.routeMessage(message, 'INBOX.perception');

    // Auto-spawn process if enabled
    if (this.config.autoSpawn) {
      this.spawnProcess(message);
    }

    return message;
  }

  /**
   * Receive a self-image snapshot and convert to reflection message
   */
  public onSelfImageSnapshot(snapshot: {
    coherence: number;
    dominantMode: string;
    activeGoals: number;
    episodicMemories: number;
    grandCycleStep: number;
    dove9Step: number;
    triad: 'MP1' | 'MP2';
    threadPermutation: string;
  }): ConversationalMessage | null {
    if (!this.running || !this.config.enableSelfReflection) return null;

    const message = this.createMessage({
      from: 'self@reflection.dove9',
      to: 'identity@update.dove9',
      subject: `[REFLECTION] coherence=${snapshot.coherence.toFixed(3)} mode=${snapshot.dominantMode}`,
      body: JSON.stringify({
        coherence: snapshot.coherence,
        dominantMode: snapshot.dominantMode,
        activeGoals: snapshot.activeGoals,
        episodicMemories: snapshot.episodicMemories,
      }),
      source: 'reflection',
      grandCycleStep: snapshot.grandCycleStep,
      dove9Step: snapshot.dove9Step,
      triad: snapshot.triad,
      threadPermutation: snapshot.threadPermutation,
      salienceScore: snapshot.coherence,
      emotionalValence: snapshot.coherence > 0.7 ? 0.3 : -0.2,
    });

    this.routeMessage(message, 'INBOX.reflection');
    this.metrics.reflectionCycles++;

    return message;
  }

  /**
   * Receive a memory consolidation event
   */
  public onMemoryConsolidation(consolidation: {
    memoryType: string;
    content: string;
    importance: number;
    grandCycleStep: number;
    dove9Step: number;
    triad: 'MP1' | 'MP2';
    threadPermutation: string;
  }): ConversationalMessage | null {
    if (!this.running || !this.config.enableMemoryConsolidation) return null;

    const message = this.createMessage({
      from: 'cognition@process.dove9',
      to: 'memory@store.dove9',
      subject: `[CONSOLIDATE] ${consolidation.memoryType}: ${consolidation.content.substring(0, 50)}`,
      body: consolidation.content,
      source: 'memory',
      grandCycleStep: consolidation.grandCycleStep,
      dove9Step: consolidation.dove9Step,
      triad: consolidation.triad,
      threadPermutation: consolidation.threadPermutation,
      salienceScore: consolidation.importance,
      emotionalValence: 0,
    });

    this.routeMessage(message, 'INBOX.memory');
    this.metrics.consolidations++;

    return message;
  }

  /**
   * Receive an action execution result
   */
  public onActionResult(result: {
    actionId: string;
    success: boolean;
    output: unknown;
    processId?: string;
    grandCycleStep: number;
    dove9Step: number;
    triad: 'MP1' | 'MP2';
    threadPermutation: string;
  }): ConversationalMessage {
    const message = this.createMessage({
      from: 'action@execute.dove9',
      to: result.processId
        ? `process-${result.processId}@cognition.dove9`
        : 'cognition@process.dove9',
      subject: `[ACTION-RESULT] ${result.actionId}: ${result.success ? 'SUCCESS' : 'FAILED'}`,
      body: JSON.stringify(result.output),
      inReplyTo: result.processId ? `proc-${result.processId}-root` : undefined,
      source: 'action',
      grandCycleStep: result.grandCycleStep,
      dove9Step: result.dove9Step,
      triad: result.triad,
      threadPermutation: result.threadPermutation,
      salienceScore: result.success ? 0.5 : 0.8,
      emotionalValence: result.success ? 0.2 : -0.3,
    });

    this.routeMessage(message, result.success ? 'SENT' : 'INBOX.cognition');

    // Complete the associated process if it exists
    if (result.processId) {
      this.completeProcess(result.processId, {
        integrated: `Action ${result.actionId} ${result.success ? 'succeeded' : 'failed'}`,
        salienceShift: result.success ? 0.1 : -0.1,
        memoryEncoded: true,
        actionTaken: true,
      });
    }

    return message;
  }

  // ============================================================
  // Process Management
  // ============================================================

  /**
   * Spawn a new conversational process from a root message
   */
  public spawnProcess(rootMessage: ConversationalMessage): ConversationalProcess {
    if (this.processes.size >= this.config.maxConcurrentProcesses) {
      // Evict oldest completed process
      this.evictOldestProcess();
    }

    const processId = `proc-${++this.processCounter}-${Date.now()}`;
    const process: ConversationalProcess = {
      id: processId,
      rootMessageId: rootMessage.id,
      messages: [rootMessage],
      state: 'spawned',
      createdAt: Date.now(),
    };

    this.processes.set(processId, process);
    this.messageIndex.set(rootMessage.id, processId);
    this.metrics.totalProcesses++;

    this.emitBridgeEvent('process_spawned', processId, rootMessage.id, {
      subject: rootMessage.subject,
      source: rootMessage.cognitiveMetadata.source,
    });

    log.debug(`Spawned process ${processId} from message: ${rootMessage.subject}`);
    return process;
  }

  /**
   * Add a message to an existing process thread
   */
  public addToProcess(processId: string, message: ConversationalMessage): boolean {
    const process = this.processes.get(processId);
    if (!process || process.state === 'completed') return false;

    message.inReplyTo = process.messages[process.messages.length - 1].id;
    process.messages.push(message);
    this.messageIndex.set(message.id, processId);

    // Advance process state based on message source
    switch (message.cognitiveMetadata.source) {
      case 'cognition':
        process.state = 'thinking';
        break;
      case 'action':
        process.state = 'responding';
        break;
      case 'memory':
        process.state = 'consolidating';
        break;
    }

    return true;
  }

  /**
   * Complete a conversational process
   */
  public completeProcess(processId: string, result: ConversationalProcess['cognitiveResult']): boolean {
    const process = this.processes.get(processId);
    if (!process) return false;

    process.state = 'completed';
    process.completedAt = Date.now();
    process.cognitiveResult = result;

    const duration = process.completedAt - process.createdAt;
    this.metrics.completedProcesses++;
    this.metrics.averageProcessDuration =
      (this.metrics.averageProcessDuration * (this.metrics.completedProcesses - 1) + duration) /
      this.metrics.completedProcesses;

    this.emitBridgeEvent('process_completed', processId, undefined, {
      duration,
      messageCount: process.messages.length,
      result,
    });

    return true;
  }

  // ============================================================
  // Internal Helpers
  // ============================================================

  /**
   * Create a conversational message
   */
  private createMessage(params: {
    from: string;
    to: string;
    subject: string;
    body: string;
    inReplyTo?: string;
    source: ConversationalMessage['cognitiveMetadata']['source'];
    grandCycleStep: number;
    dove9Step: number;
    triad: 'MP1' | 'MP2';
    threadPermutation: string;
    salienceScore: number;
    emotionalValence: number;
  }): ConversationalMessage {
    const id = `msg-${++this.messageCounter}-${Date.now()}`;
    this.metrics.totalMessages++;

    return {
      id,
      from: params.from,
      to: params.to,
      subject: params.subject,
      body: params.body,
      inReplyTo: params.inReplyTo,
      headers: {
        'X-Dove9-Source': params.source,
        'X-Grand-Cycle-Step': String(params.grandCycleStep),
        'X-Dove9-Step': String(params.dove9Step),
        'X-Triad': params.triad,
        'X-Thread-Permutation': params.threadPermutation,
        'X-Salience': String(params.salienceScore),
        'X-Emotional-Valence': String(params.emotionalValence),
        'Date': new Date().toISOString(),
        'Message-ID': `<${id}@dove9.cognitive>`,
      },
      timestamp: Date.now(),
      cognitiveMetadata: {
        source: params.source,
        grandCycleStep: params.grandCycleStep,
        dove9Step: params.dove9Step,
        triad: params.triad,
        threadPermutation: params.threadPermutation,
        salienceScore: params.salienceScore,
        emotionalValence: params.emotionalValence,
      },
    };
  }

  /**
   * Route a message to the appropriate mailbox
   */
  private routeMessage(message: ConversationalMessage, mailboxName: string): void {
    const queue = this.mailboxQueues.get(mailboxName);
    if (queue) {
      queue.push(message);
      this.emitBridgeEvent('message_sent', undefined, message.id, {
        mailbox: mailboxName,
        subject: message.subject,
      });
    } else {
      this.metrics.covenantViolations++;
      this.emitBridgeEvent('covenant_violation', undefined, message.id, {
        reason: `Unknown mailbox: ${mailboxName}`,
      });
    }
  }

  /**
   * Evict the oldest completed process to make room
   */
  private evictOldestProcess(): void {
    let oldest: { id: string; completedAt: number } | null = null;

    for (const [id, process] of this.processes) {
      if (process.state === 'completed' && process.completedAt) {
        if (!oldest || process.completedAt < oldest.completedAt) {
          oldest = { id, completedAt: process.completedAt };
        }
      }
    }

    if (oldest) {
      const process = this.processes.get(oldest.id);
      if (process) {
        for (const msg of process.messages) {
          this.messageIndex.delete(msg.id);
        }
        this.processes.delete(oldest.id);
      }
    }
  }

  /**
   * Emit a bridge event
   */
  private emitBridgeEvent(
    type: Dove9BridgeEvent['type'],
    processId?: string,
    messageId?: string,
    data: Record<string, unknown> = {},
  ): void {
    const event: Dove9BridgeEvent = {
      type,
      processId,
      messageId,
      data,
      timestamp: Date.now(),
    };
    this.emit('bridge_event', event);
  }

  // ============================================================
  // Accessors
  // ============================================================

  public isRunning(): boolean {
    return this.running;
  }

  public getProcess(processId: string): ConversationalProcess | undefined {
    return this.processes.get(processId);
  }

  public getActiveProcesses(): ConversationalProcess[] {
    return Array.from(this.processes.values()).filter(p => p.state !== 'completed');
  }

  public getMailboxQueue(mailboxName: string): ConversationalMessage[] {
    return this.mailboxQueues.get(mailboxName) || [];
  }

  public getMailboxes(): CognitiveMailbox[] {
    return [...COGNITIVE_MAILBOXES];
  }

  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  public getProcessCount(): number {
    return this.processes.size;
  }

  public getActiveProcessCount(): number {
    return this.getActiveProcesses().length;
  }
}
