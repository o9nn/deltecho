/**
 * Dove9 Kernel
 *
 * "Everything is a chatbot" - The cognitive operating system kernel
 *
 * This kernel treats:
 * - Mail server as CPU (cognitive processing unit)
 * - Messages as process threads
 * - Inference as feedforward processing
 * - Training/learning as feedback processing
 *
 * The kernel orchestrates the triadic cognitive engine and manages
 * message processes through their lifecycle.
 */

import { EventEmitter } from 'events';
import {
  MessageProcess,
  ProcessState,
  CognitiveContext,
  StreamId,
  KernelState,
  KernelMetrics,
  KernelEvent,
  Dove9Config,
  DEFAULT_DOVE9_CONFIG,
  ExecutionRecord,
  CognitiveMode,
  MailMessage,
  MailboxMapping,
  DEFAULT_MAILBOX_MAPPING,
  MailFlag,
} from '../types/index.js';
import {
  TriadicCognitiveEngine,
  CognitiveProcessor,
  TriadicEvent,
} from '../cognitive/triadic-engine.js';
import { MailProtocolBridge } from '../integration/mail-protocol-bridge.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('Dove9Kernel');

/**
 * Generate a unique process ID
 */
function generateProcessId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create initial cognitive context for a new process
 */
function createInitialContext(): CognitiveContext {
  return {
    relevantMemories: [],
    emotionalValence: 0,
    emotionalArousal: 0.5,
    salienceScore: 0.5,
    attentionWeight: 1.0,
    activeCouplings: [],
  };
}

/**
 * Dove9Kernel - The cognitive operating system core
 */
export class Dove9Kernel extends EventEmitter {
  private config: Dove9Config;
  private engine: TriadicCognitiveEngine;
  private processTable: Map<string, MessageProcess> = new Map();
  private processQueue: string[] = [];
  private activeProcesses: Set<string> = new Set();
  private running: boolean = false;
  private metrics: KernelMetrics;

  // Mail protocol support
  private mailBridge?: MailProtocolBridge;
  private mailboxMapping?: MailboxMapping;
  private messageToProcessMap: Map<string, string> = new Map(); // messageId → processId
  private processToMessageMap: Map<string, string> = new Map(); // processId → messageId

  constructor(processor: CognitiveProcessor, config: Partial<Dove9Config> = {}) {
    super();

    this.config = { ...DEFAULT_DOVE9_CONFIG, ...config };
    this.engine = new TriadicCognitiveEngine(processor, this.config.stepDuration);
    this.metrics = this.initializeMetrics();

    // Subscribe to engine events
    this.engine.on(this.handleEngineEvent.bind(this));
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): KernelMetrics {
    return {
      totalSteps: 0,
      totalCycles: 0,
      processesCompleted: 0,
      averageLatency: 0,
      streamCoherence: 1.0,
      cognitiveLoad: 0,
      activeCouplings: [],
    };
  }

  /**
   * Start the kernel
   */
  public async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.engine.start();

    // Start the process scheduler
    this.scheduleNextProcess();

    this.emitEvent({ type: 'step_advance', step: 0, cycle: 0 });
  }

  /**
   * Stop the kernel
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;
    this.engine.stop();

    // Suspend all active processes
    for (const processId of this.activeProcesses) {
      const process = this.processTable.get(processId);
      if (process) {
        process.state = ProcessState.SUSPENDED;
      }
    }
  }

  /**
   * Create a new message process
   */
  public createProcess(
    messageId: string,
    from: string,
    to: string[],
    subject: string,
    content: string,
    priority: number = 5
  ): MessageProcess {
    const processId = generateProcessId();

    const process: MessageProcess = {
      id: processId,
      messageId,
      from,
      to,
      subject,
      content,
      state: ProcessState.PENDING,
      priority,
      createdAt: new Date(),
      currentStep: 0,
      currentStream: StreamId.PRIMARY,
      cognitiveContext: createInitialContext(),
      childIds: [],
      executionHistory: [],
    };

    this.processTable.set(processId, process);
    this.enqueueProcess(processId, priority);

    this.emitEvent({ type: 'process_created', process });

    return process;
  }

  /**
   * Enqueue a process based on priority
   */
  private enqueueProcess(processId: string, priority: number): void {
    // Insert at correct position based on priority (higher priority = earlier)
    let insertIndex = this.processQueue.length;
    for (let i = 0; i < this.processQueue.length; i++) {
      const existingProcess = this.processTable.get(this.processQueue[i]);
      if (existingProcess && existingProcess.priority < priority) {
        insertIndex = i;
        break;
      }
    }
    this.processQueue.splice(insertIndex, 0, processId);

    // Update cognitive load
    this.metrics.cognitiveLoad = this.activeProcesses.size / this.config.maxConcurrentProcesses;
  }

  /**
   * Schedule the next process for execution
   */
  private scheduleNextProcess(): void {
    if (!this.running) return;

    // Check if we can activate more processes
    while (
      this.activeProcesses.size < this.config.maxConcurrentProcesses &&
      this.processQueue.length > 0
    ) {
      const processId = this.processQueue.shift();
      if (processId) {
        this.activateProcess(processId);
      }
    }

    // Schedule next check
    setTimeout(() => this.scheduleNextProcess(), this.config.stepDuration);
  }

  /**
   * Activate a process for execution
   */
  private async activateProcess(processId: string): Promise<void> {
    const process = this.processTable.get(processId);
    if (!process) return;

    process.state = ProcessState.ACTIVE;
    this.activeProcesses.add(processId);

    try {
      await this.executeProcess(process);
    } catch (error) {
      process.state = ProcessState.TERMINATED;
      logger.error(`Process ${processId} failed:`, error);
    }
  }

  /**
   * Execute a process through the cognitive loop
   */
  private async executeProcess(process: MessageProcess): Promise<void> {
    process.state = ProcessState.PROCESSING;
    const startTime = Date.now();

    // Process through the triadic cognitive engine
    const updatedContext = await this.engine.processMessage(process);
    process.cognitiveContext = updatedContext;

    // Record execution
    const record: ExecutionRecord = {
      timestamp: new Date(),
      step: this.engine.getState().currentStep,
      stream: process.currentStream,
      term: this.engine.getState().streams.get(process.currentStream)?.currentTerm!,
      mode:
        this.engine.getState().streams.get(process.currentStream)?.mode || CognitiveMode.EXPRESSIVE,
      duration: Date.now() - startTime,
      result: 'success',
      output: updatedContext,
    };
    process.executionHistory.push(record);

    // Complete the process
    this.completeProcess(process.id, updatedContext);
  }

  /**
   * Complete a process
   */
  private completeProcess(processId: string, result: any): void {
    const process = this.processTable.get(processId);
    if (!process) return;

    process.state = ProcessState.COMPLETED;
    this.activeProcesses.delete(processId);

    // Update metrics
    this.metrics.processesCompleted++;
    const latency = Date.now() - process.createdAt.getTime();
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.processesCompleted - 1) + latency) /
      this.metrics.processesCompleted;

    this.emitEvent({ type: 'process_completed', processId, result });
  }

  /**
   * Handle engine events
   */
  private handleEngineEvent(event: TriadicEvent): void {
    switch (event.type) {
      case 'step_complete':
        this.metrics.totalSteps++;
        break;

      case 'cycle_complete':
        this.metrics.totalCycles = event.cycleNumber;
        this.emitEvent({
          type: 'cycle_complete',
          cycle: event.cycleNumber,
          metrics: { ...this.metrics },
        });
        break;

      case 'triad_sync':
        this.emitEvent({ type: 'triad_convergence', triad: event.triad });
        // Synchronize all active processes at triad points
        this.synchronizeProcesses();
        break;

      case 'coupling_active':
        this.metrics.activeCouplings = [
          ...new Set([...this.metrics.activeCouplings, event.coupling]),
        ];
        this.emitEvent({
          type: 'coupling_activated',
          coupling: event.coupling,
        });
        break;
    }
  }

  /**
   * Synchronize all active processes at triadic convergence points
   */
  private synchronizeProcesses(): void {
    const streamIds = [StreamId.PRIMARY, StreamId.SECONDARY, StreamId.TERTIARY];
    this.emitEvent({ type: 'stream_sync', streams: streamIds });

    // Update stream coherence metric
    const engineState = this.engine.getState();
    const activeStreamCount = Array.from(engineState.streams.values()).filter(
      (s) => s.isActive
    ).length;
    this.metrics.streamCoherence = activeStreamCount / 3;
  }

  /**
   * Get a process by ID
   */
  public getProcess(processId: string): MessageProcess | undefined {
    return this.processTable.get(processId);
  }

  /**
   * Get all processes
   */
  public getAllProcesses(): MessageProcess[] {
    return Array.from(this.processTable.values());
  }

  /**
   * Get active processes
   */
  public getActiveProcesses(): MessageProcess[] {
    return Array.from(this.activeProcesses)
      .map((id) => this.processTable.get(id))
      .filter((p): p is MessageProcess => p !== undefined);
  }

  /**
   * Get kernel state
   */
  public getState(): KernelState {
    const engineState = this.engine.getState();
    return {
      currentStep: engineState.currentStep,
      cycleNumber: engineState.cycleNumber,
      streams: engineState.streams,
      processTable: new Map(this.processTable),
      activeProcesses: new Set(this.activeProcesses),
      metrics: { ...this.metrics },
    };
  }

  /**
   * Get kernel metrics
   */
  public getMetrics(): KernelMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if kernel is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Emit a kernel event
   */
  private emitEvent(event: KernelEvent): void {
    this.emit('kernel_event', event);
    this.emit(event.type, event);
  }

  /**
   * Fork a process (create child process)
   */
  public forkProcess(parentId: string, content: string, subject?: string): MessageProcess | null {
    const parent = this.processTable.get(parentId);
    if (!parent) return null;

    const child = this.createProcess(
      `${parent.messageId}_fork_${Date.now()}`,
      parent.from,
      parent.to,
      subject || `Re: ${parent.subject}`,
      content,
      parent.priority
    );

    child.parentId = parentId;
    parent.childIds.push(child.id);

    // Inherit cognitive context
    child.cognitiveContext = { ...parent.cognitiveContext };

    return child;
  }

  /**
   * Terminate a process
   */
  public terminateProcess(processId: string): boolean {
    const process = this.processTable.get(processId);
    if (!process) return false;

    process.state = ProcessState.TERMINATED;
    this.activeProcesses.delete(processId);

    // Remove from queue if pending
    const queueIndex = this.processQueue.indexOf(processId);
    if (queueIndex > -1) {
      this.processQueue.splice(queueIndex, 1);
    }

    return true;
  }

  /**
   * Suspend a process
   */
  public suspendProcess(processId: string): boolean {
    const process = this.processTable.get(processId);
    if (!process || process.state !== ProcessState.ACTIVE) return false;

    process.state = ProcessState.SUSPENDED;
    this.activeProcesses.delete(processId);

    return true;
  }

  /**
   * Resume a suspended process
   */
  public resumeProcess(processId: string): boolean {
    const process = this.processTable.get(processId);
    if (!process || process.state !== ProcessState.SUSPENDED) return false;

    process.state = ProcessState.PENDING;
    this.enqueueProcess(processId, process.priority);

    return true;
  }

  // ============================================================
  // Mail Protocol Integration
  // ============================================================

  /**
   * Enable mail protocol bridge for native mail operations
   */
  public enableMailProtocol(mailboxes: Partial<MailboxMapping> = {}): void {
    this.mailboxMapping = { ...DEFAULT_MAILBOX_MAPPING, ...mailboxes };
    this.mailBridge = new MailProtocolBridge({
      mailboxMapping: this.mailboxMapping,
      defaultPriority: 5,
      enableThreading: true,
    });

    logger.info('Mail protocol enabled', { mailboxes: this.mailboxMapping });

    // Forward process completion events to mail system
    this.on('process_completed', (event: { processId: string; result: any }) => {
      if (this.mailBridge) {
        const process = this.processTable.get(event.processId);
        if (process) {
          const response = this.formatProcessResponse(process, event.result);
          const mailMessage = this.mailBridge.processToMail(process, response);
          this.emit('mail_message_ready', mailMessage);
        }
      }
    });
  }

  /**
   * Check if mail protocol is enabled
   */
  public isMailProtocolEnabled(): boolean {
    return this.mailBridge !== undefined;
  }

  /**
   * Create a process from incoming mail message
   */
  public createProcessFromMail(mail: MailMessage): MessageProcess {
    if (!this.mailBridge) {
      throw new Error('Mail protocol not enabled. Call enableMailProtocol() first.');
    }

    // Convert mail to process using bridge
    const process = this.mailBridge.mailToProcess(mail);

    // Store in process table
    this.processTable.set(process.id, process);

    // Store bidirectional mapping
    this.messageToProcessMap.set(mail.messageId, process.id);
    this.processToMessageMap.set(process.id, mail.messageId);

    // Enqueue for processing
    this.enqueueProcess(process.id, process.priority);

    // Emit creation event
    this.emitEvent({ type: 'process_created', process });

    logger.info('Created process from mail', {
      processId: process.id,
      messageId: mail.messageId,
      from: mail.from,
      subject: mail.subject,
      priority: process.priority,
    });

    return process;
  }

  /**
   * Get process by mail message ID
   */
  public getProcessByMessageId(messageId: string): MessageProcess | undefined {
    const processId = this.messageToProcessMap.get(messageId);
    if (!processId) return undefined;
    return this.processTable.get(processId);
  }

  /**
   * Get mail message ID for a process
   */
  public getMessageIdForProcess(processId: string): string | undefined {
    return this.processToMessageMap.get(processId);
  }

  /**
   * Query processes by mailbox (state mapping)
   */
  public getProcessesByMailbox(mailbox: string): MessageProcess[] {
    if (!this.mailboxMapping) {
      return [];
    }

    // Determine which process state corresponds to this mailbox
    let targetState: ProcessState | undefined;

    if (mailbox === this.mailboxMapping.inbox) {
      targetState = ProcessState.PENDING;
    } else if (mailbox === this.mailboxMapping.processing) {
      targetState = ProcessState.PROCESSING;
    } else if (mailbox === this.mailboxMapping.sent) {
      targetState = ProcessState.COMPLETED;
    } else if (mailbox === this.mailboxMapping.drafts) {
      targetState = ProcessState.SUSPENDED;
    } else if (mailbox === this.mailboxMapping.trash) {
      targetState = ProcessState.TERMINATED;
    }

    if (targetState === undefined) {
      return [];
    }

    return Array.from(this.processTable.values()).filter(p => p.state === targetState);
  }

  /**
   * Move process to a different mailbox (change state)
   */
  public moveProcessToMailbox(processId: string, targetMailbox: string): boolean {
    if (!this.mailboxMapping) {
      return false;
    }

    const process = this.processTable.get(processId);
    if (!process) return false;

    // Determine new state from mailbox
    let newState: ProcessState | undefined;

    if (targetMailbox === this.mailboxMapping.inbox) {
      newState = ProcessState.PENDING;
    } else if (targetMailbox === this.mailboxMapping.processing) {
      newState = ProcessState.PROCESSING;
    } else if (targetMailbox === this.mailboxMapping.sent) {
      newState = ProcessState.COMPLETED;
    } else if (targetMailbox === this.mailboxMapping.drafts) {
      newState = ProcessState.SUSPENDED;
    } else if (targetMailbox === this.mailboxMapping.trash) {
      newState = ProcessState.TERMINATED;
    }

    if (newState === undefined) {
      return false;
    }

    // Update process state
    const oldState = process.state;
    process.state = newState;

    // Handle state transitions
    if (oldState === ProcessState.ACTIVE || oldState === ProcessState.PROCESSING) {
      this.activeProcesses.delete(processId);
    }

    if (newState === ProcessState.PENDING) {
      this.enqueueProcess(processId, process.priority);
    }

    logger.info('Moved process to mailbox', {
      processId,
      targetMailbox,
      oldState,
      newState,
    });

    return true;
  }

  /**
   * Get mailbox for a process based on its state
   */
  public getMailboxForProcess(processId: string): string | undefined {
    if (!this.mailboxMapping || !this.mailBridge) {
      return undefined;
    }

    const process = this.processTable.get(processId);
    if (!process) return undefined;

    // Use the bridge's mailbox mapping based on state
    const mapping = this.mailBridge.getMailboxMapping();

    switch (process.state) {
      case ProcessState.PENDING:
        return mapping.inbox;
      case ProcessState.ACTIVE:
      case ProcessState.PROCESSING:
      case ProcessState.WAITING:
        return mapping.processing;
      case ProcessState.COMPLETED:
        return mapping.sent;
      case ProcessState.SUSPENDED:
        return mapping.drafts;
      case ProcessState.TERMINATED:
        return mapping.trash;
      default:
        return mapping.inbox;
    }
  }

  /**
   * Update process flags from mail flags
   */
  public updateProcessFromMailFlags(processId: string, flags: MailFlag[]): boolean {
    const process = this.processTable.get(processId);
    if (!process) return false;

    // Map mail flags to process state
    if (flags.includes(MailFlag.DELETED)) {
      process.state = ProcessState.TERMINATED;
      this.activeProcesses.delete(processId);
    } else if (flags.includes(MailFlag.DRAFT)) {
      process.state = ProcessState.SUSPENDED;
      this.activeProcesses.delete(processId);
    } else if (flags.includes(MailFlag.ANSWERED)) {
      process.state = ProcessState.COMPLETED;
      this.activeProcesses.delete(processId);
    } else if (flags.includes(MailFlag.FLAGGED)) {
      // Increase priority for flagged messages
      process.priority = Math.min(10, process.priority + 2);
    }

    return true;
  }

  /**
   * Get mail protocol bridge
   */
  public getMailBridge(): MailProtocolBridge | undefined {
    return this.mailBridge;
  }

  /**
   * Format process response for mail output
   */
  private formatProcessResponse(process: MessageProcess, result: any): string {
    if (typeof result === 'string') {
      return result;
    }

    if (result?.text) {
      return result.text;
    }

    if (result?.response) {
      return result.response;
    }

    // Format cognitive context as response
    const ctx = process.cognitiveContext;
    const lines = [
      '[Cognitive Process Complete]',
      `Subject: ${process.subject}`,
      `Priority: ${process.priority}`,
      `Salience: ${ctx.salienceScore.toFixed(2)}`,
      `Emotional Valence: ${ctx.emotionalValence.toFixed(2)}`,
      `Emotional Arousal: ${ctx.emotionalArousal.toFixed(2)}`,
      `Active Couplings: ${ctx.activeCouplings.join(', ') || 'none'}`,
      '',
      `Processing completed at step ${process.currentStep} of cycle.`,
    ];
    return lines.join('\n');
  }
}
