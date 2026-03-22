/**
 * DovecotIPCTransport - IPC Transport using Mail Protocols
 *
 * Implements the "mail server as CPU" paradigm by using IMAP/SMTP protocols
 * as the transport layer for inter-process communication.
 *
 * This transforms the mail server into a cognitive IPC bus:
 * - Mailboxes → IPC channels
 * - Messages → IPC packets
 * - IMAP IDLE → Real-time subscription
 * - SMTP → Sending IPC messages
 */

import { EventEmitter } from 'events';
import type { IPCChannel, IPCMessage, IPCMessageType } from './IPCBridge.js';

/**
 * Dovecot connection configuration
 */
export interface DovecotConfig {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  lmtpHost?: string;
  lmtpPort?: number;
  username: string;
  password: string;
  mailboxPrefix: string;
  useTLS: boolean;
  timeout?: number;
}

/**
 * Mail-based IPC message
 */
export interface MailIPCMessage {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  headers: Map<string, string>;
  timestamp: Date;
  channel: IPCChannel;
  ipcType: IPCMessageType;
  payload: any;
}

/**
 * Mailbox to IPC channel mapping
 */
export interface MailboxChannelMapping {
  mailbox: string;
  channel: IPCChannel;
  description: string;
}

/**
 * Transport statistics
 */
export interface TransportStats {
  messagesSent: number;
  messagesReceived: number;
  lastSendTime?: Date;
  lastReceiveTime?: Date;
  imapConnected: boolean;
  smtpConnected: boolean;
  activeSubscriptions: number;
}

/**
 * Transport event types
 */
export type TransportEvent =
  | { type: 'connected'; protocol: 'imap' | 'smtp' }
  | { type: 'disconnected'; protocol: 'imap' | 'smtp'; error?: string }
  | { type: 'message_received'; message: MailIPCMessage }
  | { type: 'message_sent'; messageId: string }
  | { type: 'error'; error: string };

/**
 * Default mailbox channel mappings
 */
export const DEFAULT_MAILBOX_MAPPINGS: MailboxChannelMapping[] = [
  { mailbox: 'INBOX.cognitive', channel: 'cognitive:process', description: 'Cognitive processing requests' },
  { mailbox: 'INBOX.cognitive.status', channel: 'cognitive:status', description: 'Cognitive status updates' },
  { mailbox: 'INBOX.memory', channel: 'memory:store', description: 'Memory storage operations' },
  { mailbox: 'INBOX.memory.retrieve', channel: 'memory:retrieve', description: 'Memory retrieval requests' },
  { mailbox: 'INBOX.memory.query', channel: 'memory:query', description: 'Memory queries' },
  { mailbox: 'INBOX.llm', channel: 'llm:request', description: 'LLM requests' },
  { mailbox: 'INBOX.llm.stream', channel: 'llm:stream', description: 'LLM streaming responses' },
  { mailbox: 'INBOX.system', channel: 'system:status', description: 'System status' },
  { mailbox: 'INBOX.system.config', channel: 'system:config', description: 'System configuration' },
  { mailbox: 'INBOX.identity', channel: 'identity:state', description: 'Identity state' },
  { mailbox: 'INBOX.identity.update', channel: 'identity:update', description: 'Identity updates' },
];

/**
 * Default transport configuration
 */
const DEFAULT_CONFIG: Partial<DovecotConfig> = {
  imapPort: 993,
  smtpPort: 587,
  lmtpPort: 24,
  useTLS: true,
  timeout: 30000,
  mailboxPrefix: 'INBOX',
};

/**
 * DovecotIPCTransport - Mail-based IPC transport implementation
 */
export class DovecotIPCTransport extends EventEmitter {
  private config: DovecotConfig;
  private mailboxMappings: Map<string, IPCChannel>;
  private channelMappings: Map<IPCChannel, string>;
  private subscriptions: Set<string>;
  private stats: TransportStats;
  private running: boolean = false;
  private messageHandlers: Map<IPCChannel, ((message: IPCMessage) => void)[]>;
  private messageCounter: number = 0;

  // Connection state (actual IMAP/SMTP clients would be plugged in here)
  private imapConnected: boolean = false;
  private smtpConnected: boolean = false;

  constructor(config: Partial<DovecotConfig>, mappings: MailboxChannelMapping[] = DEFAULT_MAILBOX_MAPPINGS) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as DovecotConfig;
    this.mailboxMappings = new Map();
    this.channelMappings = new Map();
    this.subscriptions = new Set();
    this.messageHandlers = new Map();
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      imapConnected: false,
      smtpConnected: false,
      activeSubscriptions: 0,
    };

    // Initialize mappings
    for (const mapping of mappings) {
      const fullMailbox = mapping.mailbox.startsWith(this.config.mailboxPrefix)
        ? mapping.mailbox
        : `${this.config.mailboxPrefix}.${mapping.mailbox}`;
      this.mailboxMappings.set(fullMailbox, mapping.channel);
      this.channelMappings.set(mapping.channel, fullMailbox);
    }
  }

  /**
   * Initialize the transport
   */
  public async initialize(): Promise<void> {
    if (this.running) return;

    // In production, this would connect to actual IMAP/SMTP servers
    // For now, we simulate the connection
    await this.connectIMAP();
    await this.connectSMTP();

    this.running = true;
    this.emitEvent({ type: 'connected', protocol: 'imap' });
    this.emitEvent({ type: 'connected', protocol: 'smtp' });
  }

  /**
   * Shutdown the transport
   */
  public async shutdown(): Promise<void> {
    if (!this.running) return;

    // Unsubscribe from all mailboxes
    for (const mailbox of this.subscriptions) {
      await this.unsubscribeMailbox(mailbox);
    }

    // Disconnect
    await this.disconnectIMAP();
    await this.disconnectSMTP();

    this.running = false;
  }

  /**
   * Connect to IMAP server
   */
  private async connectIMAP(): Promise<void> {
    // In production: Connect to Dovecot IMAP server
    // const client = new ImapClient({
    //   host: this.config.imapHost,
    //   port: this.config.imapPort,
    //   secure: this.config.useTLS,
    //   auth: { user: this.config.username, pass: this.config.password }
    // });
    // await client.connect();

    this.imapConnected = true;
    this.stats.imapConnected = true;
  }

  /**
   * Connect to SMTP server
   */
  private async connectSMTP(): Promise<void> {
    // In production: Connect to Dovecot SMTP server
    // const transporter = nodemailer.createTransport({
    //   host: this.config.smtpHost,
    //   port: this.config.smtpPort,
    //   secure: this.config.useTLS,
    //   auth: { user: this.config.username, pass: this.config.password }
    // });

    this.smtpConnected = true;
    this.stats.smtpConnected = true;
  }

  /**
   * Disconnect from IMAP server
   */
  private async disconnectIMAP(): Promise<void> {
    this.imapConnected = false;
    this.stats.imapConnected = false;
    this.emitEvent({ type: 'disconnected', protocol: 'imap' });
  }

  /**
   * Disconnect from SMTP server
   */
  private async disconnectSMTP(): Promise<void> {
    this.smtpConnected = false;
    this.stats.smtpConnected = false;
    this.emitEvent({ type: 'disconnected', protocol: 'smtp' });
  }

  /**
   * Subscribe to a channel (mailbox) for real-time updates
   */
  public async subscribe(channel: IPCChannel, handler: (message: IPCMessage) => void): Promise<void> {
    const mailbox = this.channelMappings.get(channel);
    if (!mailbox) {
      throw new Error(`No mailbox mapping for channel: ${channel}`);
    }

    // Add handler
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, []);
    }
    this.messageHandlers.get(channel)!.push(handler);

    // Subscribe to mailbox if not already subscribed
    if (!this.subscriptions.has(mailbox)) {
      await this.subscribeMailbox(mailbox);
      this.subscriptions.add(mailbox);
      this.stats.activeSubscriptions++;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  public async unsubscribe(channel: IPCChannel, handler?: (message: IPCMessage) => void): Promise<void> {
    const handlers = this.messageHandlers.get(channel);
    if (!handlers) return;

    if (handler) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.messageHandlers.delete(channel);
    }

    // If no more handlers, unsubscribe from mailbox
    if (!handlers || handlers.length === 0) {
      const mailbox = this.channelMappings.get(channel);
      if (mailbox && this.subscriptions.has(mailbox)) {
        await this.unsubscribeMailbox(mailbox);
        this.subscriptions.delete(mailbox);
        this.stats.activeSubscriptions--;
      }
    }
  }

  /**
   * Subscribe to a mailbox using IMAP IDLE
   */
  private async subscribeMailbox(_mailbox: string): Promise<void> {
    // In production: Use IMAP IDLE to watch for new messages
    // await this.imapClient.select(_mailbox);
    // this.imapClient.idle((msg) => this.handleMailMessage(_mailbox, msg));
  }

  /**
   * Unsubscribe from a mailbox
   */
  private async unsubscribeMailbox(_mailbox: string): Promise<void> {
    // In production: Stop IMAP IDLE for this mailbox
  }

  /**
   * Send an IPC message via mail
   */
  public async send(message: IPCMessage): Promise<void> {
    if (!this.running || !this.smtpConnected) {
      throw new Error('Transport not connected');
    }

    const mailMessage = this.ipcMessageToMail(message);

    // In production: Send via SMTP
    // await this.smtpTransporter.sendMail({
    //   from: mailMessage.from,
    //   to: mailMessage.to.join(', '),
    //   subject: mailMessage.subject,
    //   text: mailMessage.body,
    //   headers: Object.fromEntries(mailMessage.headers)
    // });

    this.stats.messagesSent++;
    this.stats.lastSendTime = new Date();

    this.emitEvent({ type: 'message_sent', messageId: mailMessage.messageId });
  }

  /**
   * Receive messages from a channel (fetch from mailbox)
   */
  public async receive(channel: IPCChannel, _options: { unseen?: boolean; limit?: number } = {}): Promise<IPCMessage[]> {
    const mailbox = this.channelMappings.get(channel);
    if (!mailbox) {
      throw new Error(`No mailbox mapping for channel: ${channel}`);
    }

    // In production: Fetch from IMAP
    // const messages = await this.imapClient.fetch(mailbox, {
    //   unseen: _options.unseen ?? true,
    //   limit: options.limit ?? 50
    // });

    // For now, return empty array (placeholder)
    return [];
  }

  /**
   * Convert IPC message to mail format
   */
  private ipcMessageToMail(message: IPCMessage): MailIPCMessage {
    const mailbox = this.channelMappings.get(message.channel) || 'INBOX';
    const messageId = this.generateMessageId();

    const headers = new Map<string, string>([
      ['X-IPC-Channel', message.channel],
      ['X-IPC-Type', message.type],
      ['X-IPC-Source', message.source],
      ['X-IPC-ID', message.id],
      ['X-IPC-Timestamp', message.timestamp.toString()],
    ]);

    if (message.target) {
      headers.set('X-IPC-Target', message.target);
    }

    return {
      messageId,
      from: `${this.config.username}@${this.getMailDomain()}`,
      to: [`${mailbox}@${this.getMailDomain()}`],
      subject: `[IPC:${message.channel}] ${message.type} - ${message.id}`,
      body: JSON.stringify(message.payload, null, 2),
      headers,
      timestamp: new Date(message.timestamp),
      channel: message.channel,
      ipcType: message.type,
      payload: message.payload,
    };
  }

  /**
   * Convert mail message to IPC format
   */
  public mailToIPCMessage(mail: MailIPCMessage): IPCMessage {
    const channel = mail.headers.get('X-IPC-Channel') as IPCChannel || mail.channel;
    const type = mail.headers.get('X-IPC-Type') as IPCMessageType || mail.ipcType || 'event';
    const source = mail.headers.get('X-IPC-Source') || mail.from;
    const id = mail.headers.get('X-IPC-ID') || mail.messageId;
    const target = mail.headers.get('X-IPC-Target');
    const timestampStr = mail.headers.get('X-IPC-Timestamp');
    const timestamp = timestampStr ? parseInt(timestampStr, 10) : mail.timestamp.getTime();

    let payload: any;
    try {
      payload = JSON.parse(mail.body);
    } catch {
      payload = { text: mail.body };
    }

    return {
      id,
      type,
      channel,
      payload,
      timestamp,
      source,
      target,
    };
  }

  /**
   * Handle incoming mail message from IMAP
   * @internal This method is called by the IMAP client when messages arrive
   */
  protected onMailMessage(mailbox: string, rawMessage: any): void {
    const channel = this.mailboxMappings.get(mailbox);
    if (!channel) return;

    // Convert raw message to MailIPCMessage
    const mailMessage: MailIPCMessage = {
      messageId: rawMessage.messageId || this.generateMessageId(),
      from: rawMessage.from || '',
      to: Array.isArray(rawMessage.to) ? rawMessage.to : [rawMessage.to],
      subject: rawMessage.subject || '',
      body: rawMessage.body || rawMessage.text || '',
      headers: new Map(Object.entries(rawMessage.headers || {})),
      timestamp: new Date(rawMessage.date || Date.now()),
      channel,
      ipcType: 'event',
      payload: null,
    };

    // Convert to IPC message
    const ipcMessage = this.mailToIPCMessage(mailMessage);

    this.stats.messagesReceived++;
    this.stats.lastReceiveTime = new Date();

    // Notify handlers
    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(ipcMessage);
        } catch (error) {
          this.emitEvent({ type: 'error', error: `Handler error: ${error}` });
        }
      }
    }

    // Emit general message event
    this.emitEvent({ type: 'message_received', message: mailMessage });
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    this.messageCounter++;
    return `<${Date.now()}.${this.messageCounter}.${Math.random().toString(36).substring(2, 11)}@${this.getMailDomain()}>`;
  }

  /**
   * Get mail domain from config
   */
  private getMailDomain(): string {
    return this.config.imapHost.replace(/^imap\./, '').replace(/^mail\./, '') || 'dove9.local';
  }

  /**
   * Emit transport event
   */
  private emitEvent(event: TransportEvent): void {
    this.emit('transport_event', event);
    this.emit(event.type, event);
  }

  /**
   * Get transport statistics
   */
  public getStats(): TransportStats {
    return { ...this.stats };
  }

  /**
   * Get channel to mailbox mapping
   */
  public getChannelMailbox(channel: IPCChannel): string | undefined {
    return this.channelMappings.get(channel);
  }

  /**
   * Get mailbox to channel mapping
   */
  public getMailboxChannel(mailbox: string): IPCChannel | undefined {
    return this.mailboxMappings.get(mailbox);
  }

  /**
   * Get all mailbox mappings
   */
  public getAllMappings(): MailboxChannelMapping[] {
    return Array.from(this.mailboxMappings.entries()).map(([mailbox, channel]) => ({
      mailbox,
      channel,
      description: `Mapping for ${channel}`,
    }));
  }

  /**
   * Check if transport is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if IMAP is connected
   */
  public isIMAPConnected(): boolean {
    return this.imapConnected;
  }

  /**
   * Check if SMTP is connected
   */
  public isSMTPConnected(): boolean {
    return this.smtpConnected;
  }

  /**
   * Get configuration (without sensitive data)
   */
  public getConfig(): Omit<DovecotConfig, 'password'> {
    const { password: _password, ...safeConfig } = this.config;
    return safeConfig;
  }
}

export default DovecotIPCTransport;
