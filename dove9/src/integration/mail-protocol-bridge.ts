/**
 * Mail Protocol Bridge
 *
 * Bridges mail messages (IMAP/SMTP/LMTP) to Dove9 MessageProcess abstractions.
 * Implements the core "mail as IPC" paradigm where:
 * - Email messages → Process threads
 * - Mailboxes → Process queues
 * - Message flags → Process states
 */

import { MessageProcess, ProcessState, CognitiveContext, StreamId, CouplingType } from '../types/index.js';
import { MailMessage, MailFlag, MailboxMapping, DEFAULT_MAILBOX_MAPPING } from '../types/mail.js';

export interface MailProtocolBridgeConfig {
  mailboxMapping?: Partial<MailboxMapping>;
  defaultPriority?: number;
  enableThreading?: boolean;
}

export class MailProtocolBridge {
  private mailboxMapping: MailboxMapping;
  private defaultPriority: number;
  private enableThreading: boolean;

  constructor(config: MailProtocolBridgeConfig = {}) {
    this.mailboxMapping = {
      ...DEFAULT_MAILBOX_MAPPING,
      ...config.mailboxMapping,
    };
    this.defaultPriority = config.defaultPriority ?? 5;
    this.enableThreading = config.enableThreading ?? true;
  }

  /**
   * Convert MailMessage to MessageProcess
   */
  mailToProcess(mail: MailMessage): MessageProcess {
    const state = this.determineProcessState(mail);
    const priority = this.calculatePriority(mail);

    const process: MessageProcess = {
      id: mail.messageId,
      messageId: mail.messageId,
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      content: mail.body,

      // Process state
      state,
      priority,
      createdAt: mail.timestamp,

      // Cognitive context
      currentStep: 1,
      currentStream: StreamId.PRIMARY,
      cognitiveContext: this.createCognitiveContext(mail),

      // Thread relationships
      parentId: mail.inReplyTo,
      childIds: [],

      // Execution metadata
      executionHistory: [],
    };

    return process;
  }

  /**
   * Convert MessageProcess back to MailMessage for sending
   */
  processToMail(process: MessageProcess, response: string): MailMessage {
    const mailbox = this.determineMailbox(process.state);
    const flags = this.determineFlags(process.state);

    const mail: MailMessage = {
      messageId: `<${process.id}@dove9.local>`,
      threadId: process.parentId,
      inReplyTo: process.parentId,
      references: process.parentId ? [process.parentId] : [],
      from: process.to[0], // Echo bot's address
      to: [process.from],
      subject: process.subject.startsWith('Re: ') ? process.subject : `Re: ${process.subject}`,
      body: response,
      headers: new Map([
        ['X-Dove9-Process-Id', process.id],
        ['X-Dove9-State', process.state],
        ['X-Dove9-Priority', process.priority.toString()],
        ['X-Dove9-Cycle', Math.floor(process.currentStep / 12).toString()],
        ['X-Dove9-Step', process.currentStep.toString()],
      ]),
      timestamp: new Date(),
      receivedAt: new Date(),
      flags,
      mailbox,
    };

    return mail;
  }

  /**
   * Determine process state from mail flags and mailbox
   */
  private determineProcessState(mail: MailMessage): ProcessState {
    const flags = mail.flags || [];

    // Mailbox-based state determination
    if (mail.mailbox === this.mailboxMapping.trash) {
      return ProcessState.TERMINATED;
    }
    if (mail.mailbox === this.mailboxMapping.drafts) {
      return ProcessState.SUSPENDED;
    }
    if (mail.mailbox === this.mailboxMapping.sent) {
      return ProcessState.COMPLETED;
    }
    if (mail.mailbox === this.mailboxMapping.processing) {
      return ProcessState.PROCESSING;
    }

    // Flag-based state determination
    if (flags.includes(MailFlag.DELETED)) {
      return ProcessState.TERMINATED;
    }
    if (flags.includes(MailFlag.DRAFT)) {
      return ProcessState.SUSPENDED;
    }
    if (flags.includes(MailFlag.ANSWERED)) {
      return ProcessState.COMPLETED;
    }
    if (flags.includes(MailFlag.FLAGGED)) {
      return ProcessState.ACTIVE;
    }

    // Default to pending for new messages
    return ProcessState.PENDING;
  }

  /**
   * Determine mailbox from process state
   */
  private determineMailbox(state: ProcessState): string {
    switch (state) {
      case ProcessState.PENDING:
        return this.mailboxMapping.inbox;
      case ProcessState.ACTIVE:
      case ProcessState.PROCESSING:
      case ProcessState.WAITING:
        return this.mailboxMapping.processing;
      case ProcessState.COMPLETED:
        return this.mailboxMapping.sent;
      case ProcessState.SUSPENDED:
        return this.mailboxMapping.drafts;
      case ProcessState.TERMINATED:
        return this.mailboxMapping.trash;
      default:
        return this.mailboxMapping.inbox;
    }
  }

  /**
   * Determine mail flags from process state
   */
  private determineFlags(state: ProcessState): MailFlag[] {
    const flags: MailFlag[] = [];

    switch (state) {
      case ProcessState.COMPLETED:
        flags.push(MailFlag.SEEN, MailFlag.ANSWERED);
        break;
      case ProcessState.ACTIVE:
      case ProcessState.PROCESSING:
        flags.push(MailFlag.FLAGGED);
        break;
      case ProcessState.SUSPENDED:
        flags.push(MailFlag.DRAFT);
        break;
      case ProcessState.TERMINATED:
        flags.push(MailFlag.DELETED);
        break;
      case ProcessState.PENDING:
        // No flags for pending
        break;
    }

    return flags;
  }

  /**
   * Calculate priority from mail metadata
   */
  private calculatePriority(mail: MailMessage): number {
    let priority = this.defaultPriority;

    // Higher priority for direct messages (single recipient)
    if (mail.to.length === 1) {
      priority += 2;
    }

    // Increase priority for flagged messages
    if (mail.flags?.includes(MailFlag.FLAGGED)) {
      priority += 2;
    }

    // Increase priority for replies (threading)
    if (mail.inReplyTo || mail.subject.toLowerCase().startsWith('re:')) {
      priority += 1;
    }

    // Check for urgent markers in subject
    const urgentMarkers = ['urgent', 'important', 'asap', 'priority', 'critical'];
    const subjectLower = mail.subject.toLowerCase();
    if (urgentMarkers.some((marker) => subjectLower.includes(marker))) {
      priority += 3;
    }

    // Decrease priority for large messages
    if (mail.size && mail.size > 100000) {
      priority -= 1;
    }

    // Clamp priority to valid range [1, 10]
    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Create initial cognitive context from mail
   */
  private createCognitiveContext(mail: MailMessage): CognitiveContext {
    // Simple heuristic-based salience calculation
    const subjectLength = mail.subject.length;
    const bodyLength = mail.body.length;
    const hasAttachments = (mail.attachments?.length || 0) > 0;
    const isReply = !!mail.inReplyTo;

    // Base salience on content complexity
    let salienceScore = 0.5;
    if (subjectLength > 50) salienceScore += 0.1;
    if (bodyLength > 500) salienceScore += 0.1;
    if (hasAttachments) salienceScore += 0.15;
    if (isReply) salienceScore += 0.1;

    // Clamp to [0, 1]
    salienceScore = Math.min(1, salienceScore);

    return {
      relevantMemories: [],
      emotionalValence: 0,
      emotionalArousal: 0.3, // Slight arousal for new messages
      salienceScore,
      attentionWeight: salienceScore,
      activeCouplings: [CouplingType.PERCEPTION_MEMORY], // Default coupling
    };
  }

  /**
   * Update process with mail metadata after cognitive processing
   */
  updateProcessFromMail(process: MessageProcess, mail: MailMessage): MessageProcess {
    return {
      ...process,
      state: this.determineProcessState(mail),
      priority: this.calculatePriority(mail),
    };
  }

  /**
   * Extract thread relationships from mail
   */
  extractThreadRelations(mail: MailMessage): {
    parentId?: string;
    siblingIds: string[];
  } {
    const parentId = mail.inReplyTo;
    const siblingIds = mail.references?.filter((ref) => ref !== parentId) || [];

    return { parentId, siblingIds };
  }

  /**
   * Get mailbox mapping configuration
   */
  getMailboxMapping(): MailboxMapping {
    return { ...this.mailboxMapping };
  }
}
