import { getLogger } from 'deep-tree-echo-core';
import { MilterServer, MilterConfig, EmailMessage } from './milter-server.js';
import { LMTPServer, LMTPConfig } from './lmtp-server.js';
import { EmailProcessor } from './email-processor.js';
import { EmailSanitizer, type SanitizerConfig, type SanitizationResult } from './email-sanitizer.js';
import { MailRateLimiter, type RateLimiterConfig, type RateLimitResult } from './mail-rate-limiter.js';

const log = getLogger('deep-tree-echo-orchestrator/DovecotInterface');

/**
 * Configuration for Dovecot integration
 */
export interface DovecotConfig {
  /** Enable Milter interface for mail filtering */
  enableMilter: boolean;
  /** Milter socket path or host:port */
  milterSocket: string;
  /** Enable LMTP for local mail delivery */
  enableLMTP: boolean;
  /** LMTP socket path or host:port */
  lmtpSocket: string;
  /** Process emails from these domains */
  allowedDomains: string[];
  /** Deep Tree Echo email address for bot identity */
  botEmailAddress: string;
  /** Enable email sanitization (Phase 6 production hardening) */
  enableSanitization: boolean;
  /** Email sanitizer configuration */
  sanitizer?: Partial<SanitizerConfig>;
  /** Enable rate limiting */
  enableRateLimiting: boolean;
  /** Rate limiter configuration */
  rateLimiter?: Partial<RateLimiterConfig>;
}

const DEFAULT_CONFIG: DovecotConfig = {
  enableMilter: true,
  milterSocket: '/var/run/deep-tree-echo/milter.sock',
  enableLMTP: false,
  lmtpSocket: '/var/run/deep-tree-echo/lmtp.sock',
  allowedDomains: ['*'],
  botEmailAddress: 'echo@localhost',
  enableSanitization: true,
  enableRateLimiting: true,
};

/**
 * DovecotInterface - Integrates Deep Tree Echo with Dovecot mail server
 *
 * Provides:
 * - Milter interface for filtering/modifying emails in transit
 * - LMTP interface for local mail delivery processing
 * - Email-to-DeepTreeEcho message conversion
 * - Response generation and sending via SMTP
 * - Email sanitization (XSS, injection, executable blocking)
 * - Rate limiting (per-sender, per-domain, global)
 */
export class DovecotInterface {
  private config: DovecotConfig;
  private milterServer?: MilterServer;
  private lmtpServer?: LMTPServer;
  private emailProcessor: EmailProcessor;
  private emailSanitizer?: EmailSanitizer;
  private mailRateLimiter?: MailRateLimiter;
  private running: boolean = false;

  // Security metrics
  private securityMetrics = {
    totalProcessed: 0,
    sanitized: 0,
    rejected: 0,
    rateLimited: 0,
  };

  constructor(config: Partial<DovecotConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.emailProcessor = new EmailProcessor(this.config.botEmailAddress);

    // Initialize security components
    if (this.config.enableSanitization) {
      this.emailSanitizer = new EmailSanitizer(this.config.sanitizer);
      log.info('Email sanitizer initialized');
    }
    if (this.config.enableRateLimiting) {
      this.mailRateLimiter = new MailRateLimiter(this.config.rateLimiter);
      log.info('Mail rate limiter initialized');
    }
  }

  /**
   * Start the Dovecot integration services
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn('DovecotInterface is already running');
      return;
    }

    log.info('Starting Dovecot integration...');

    try {
      // Start Milter server if enabled
      if (this.config.enableMilter) {
        const milterConfig: MilterConfig = {
          socketPath: this.config.milterSocket,
          allowedDomains: this.config.allowedDomains,
        };
        this.milterServer = new MilterServer(milterConfig);
        this.milterServer.on('email', this.handleIncomingEmail.bind(this));
        await this.milterServer.start();
        log.info(`Milter server started on ${this.config.milterSocket}`);
      }

      // Start LMTP server if enabled
      if (this.config.enableLMTP) {
        const lmtpConfig: LMTPConfig = {
          socketPath: this.config.lmtpSocket,
          allowedDomains: this.config.allowedDomains,
        };
        this.lmtpServer = new LMTPServer(lmtpConfig);
        this.lmtpServer.on('email', this.handleIncomingEmail.bind(this));
        await this.lmtpServer.start();
        log.info(`LMTP server started on ${this.config.lmtpSocket}`);
      }

      this.running = true;
      log.info('Dovecot integration started successfully');
    } catch (error) {
      log.error('Failed to start Dovecot integration:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the Dovecot integration services
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    log.info('Stopping Dovecot integration...');

    if (this.milterServer) {
      await this.milterServer.stop();
    }

    if (this.lmtpServer) {
      await this.lmtpServer.stop();
    }

    if (this.mailRateLimiter) {
      this.mailRateLimiter.stop();
    }

    this.running = false;
    log.info('Dovecot integration stopped');
  }

  /**
   * Check if the interface is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Handle incoming email from Milter or LMTP
   *
   * Pipeline: Rate Limit → Sanitize → Route → Process → Respond
   */
  private async handleIncomingEmail(email: EmailMessage): Promise<void> {
    this.securityMetrics.totalProcessed++;
    log.info(`Processing email from ${email.from} to ${email.to.join(', ')}`);

    try {
      // Step 1: Rate limiting
      if (this.mailRateLimiter) {
        const rateLimitResult = this.mailRateLimiter.checkLimit(email.from);
        if (!rateLimitResult.allowed) {
          this.securityMetrics.rateLimited++;
          log.warn(`Email rate-limited from ${email.from}: ${rateLimitResult.reason}`);
          return;
        }
      }

      // Step 2: Sanitization
      let processedEmail = email;
      if (this.emailSanitizer) {
        const sanitizationResult = this.emailSanitizer.sanitize(email);
        if (sanitizationResult.rejected) {
          this.securityMetrics.rejected++;
          log.warn(`Email rejected from ${email.from}: ${sanitizationResult.rejectionReason}`);
          return;
        }
        if (sanitizationResult.wasModified) {
          this.securityMetrics.sanitized++;
          processedEmail = sanitizationResult.message;
        }
      }

      // Step 3: Check if this email is addressed to Deep Tree Echo
      const isForBot = processedEmail.to.some(
        (addr) => addr.toLowerCase() === this.config.botEmailAddress.toLowerCase()
      );

      if (!isForBot) {
        log.debug('Email not addressed to Deep Tree Echo, skipping');
        return;
      }

      // Step 4: Process the email and generate a response
      const response = await this.emailProcessor.processEmail(processedEmail);

      if (response) {
        log.info(`Generated response for ${processedEmail.from}`);
        this.emit('response', {
          to: processedEmail.from,
          from: this.config.botEmailAddress,
          subject: `Re: ${processedEmail.subject}`,
          body: response,
          inReplyTo: processedEmail.messageId,
        });
      }
    } catch (error) {
      log.error('Failed to process email:', error);
    }
  }

  /**
   * Get security metrics
   */
  public getSecurityMetrics(): typeof this.securityMetrics {
    return { ...this.securityMetrics };
  }

  /**
   * Get rate limiter statistics
   */
  public getRateLimiterStats() {
    return this.mailRateLimiter?.getStats() ?? null;
  }

  /**
   * Event emitter functionality (simplified)
   */
  private listeners: Map<string, Function[]> = new Map();

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((cb) => cb(data));
  }

  /**
   * Get configuration
   */
  public getConfig(): DovecotConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (requires restart)
   */
  public updateConfig(config: Partial<DovecotConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('Configuration updated. Restart required for changes to take effect.');
  }
}

export { EmailMessage, MilterConfig, LMTPConfig };
export { EmailSanitizer, type SanitizerConfig, type SanitizationResult } from './email-sanitizer.js';
export { MailRateLimiter, type RateLimiterConfig, type RateLimitResult } from './mail-rate-limiter.js';
