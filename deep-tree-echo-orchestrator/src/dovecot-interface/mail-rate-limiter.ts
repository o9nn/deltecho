import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/MailRateLimiter');

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum number of emails allowed per window per sender (default: 10) */
  maxEmailsPerWindow: number;
  /** Duration of the rate-limiting window in milliseconds (default: 60s) */
  windowMs: number;
  /** Maximum burst size (emails allowed momentarily above rate) (default: 5) */
  burstSize: number;
  /** Whether to track by sender domain instead of full address (default: false) */
  trackByDomain: boolean;
  /** Global limit across all senders per window (default: 1000) */
  globalMaxPerWindow: number;
}

const DEFAULT_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  maxEmailsPerWindow: 10,
  windowMs: 60_000, // 1 minute
  burstSize: 5,
  trackByDomain: false,
  globalMaxPerWindow: 1000,
};

/**
 * Per-sender rate limit state
 */
interface SenderState {
  /** Number of emails in the current window */
  count: number;
  /** Timestamp when the current window started */
  windowStart: number;
  /** Number of times this sender has been rate-limited */
  limitedCount: number;
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  /** Whether the email is allowed through */
  allowed: boolean;
  /** Sender identifier (email address or domain) */
  sender: string;
  /** Current count in the window */
  count: number;
  /** Maximum allowed per window */
  limit: number;
  /** Milliseconds until the window resets */
  resetInMs: number;
  /** Reason for rejection, if blocked */
  reason?: string;
}

/**
 * MailRateLimiter - Rate limiting for incoming mail to prevent flood attacks
 *
 * Implements Phase 6 production hardening for the Dove9-Dovecot integration:
 * - Per-sender rate limiting using sliding window algorithm
 * - Global rate limiting to protect system resources
 * - Domain-level tracking option for organization-level limits
 * - Burst allowance for legitimate high-volume senders
 * - Automatic state cleanup to prevent memory leaks
 */
export class MailRateLimiter {
  private config: RateLimiterConfig;
  private senderStates = new Map<string, SenderState>();
  private globalState: { count: number; windowStart: number } = {
    count: 0,
    windowStart: Date.now(),
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMITER_CONFIG, ...config };

    // Schedule periodic cleanup of expired state
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredState(),
      this.config.windowMs * 2
    );
  }

  /**
   * Check whether an incoming email from a sender should be allowed through
   */
  public checkLimit(senderAddress: string): RateLimitResult {
    const now = Date.now();
    const sender = this.config.trackByDomain
      ? this.extractDomain(senderAddress)
      : senderAddress.toLowerCase();

    // Check global limit first
    const globalResult = this.checkGlobalLimit(now);
    if (!globalResult.allowed) {
      return { ...globalResult, sender };
    }

    // Check per-sender limit
    const senderResult = this.checkSenderLimit(sender, now);
    if (!senderResult.allowed) {
      return senderResult;
    }

    // Both checks passed - increment counters
    this.incrementGlobal(now);
    this.incrementSender(sender, now);

    return senderResult;
  }

  /**
   * Get current statistics for monitoring
   */
  public getStats(): {
    activeSenders: number;
    globalCount: number;
    globalWindowStart: Date;
    topSenders: Array<{ sender: string; count: number; limitedCount: number }>;
  } {
    const now = Date.now();
    const topSenders = Array.from(this.senderStates.entries())
      .filter(([, state]) => now - state.windowStart < this.config.windowMs)
      .map(([sender, state]) => ({
        sender,
        count: state.count,
        limitedCount: state.limitedCount,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      activeSenders: this.senderStates.size,
      globalCount: this.globalState.count,
      globalWindowStart: new Date(this.globalState.windowStart),
      topSenders,
    };
  }

  /**
   * Reset rate limit state for a specific sender (e.g., after manual review)
   */
  public resetSender(senderAddress: string): void {
    const sender = this.config.trackByDomain
      ? this.extractDomain(senderAddress)
      : senderAddress.toLowerCase();
    this.senderStates.delete(sender);
    log.info('Rate limit reset for sender', { sender });
  }

  /**
   * Stop the rate limiter and clean up resources
   */
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private checkGlobalLimit(now: number): Omit<RateLimitResult, 'sender'> {
    // Reset global window if expired
    if (now - this.globalState.windowStart >= this.config.windowMs) {
      this.globalState = { count: 0, windowStart: now };
    }

    const resetInMs = this.config.windowMs - (now - this.globalState.windowStart);

    if (this.globalState.count >= this.config.globalMaxPerWindow) {
      log.warn('Global rate limit reached', {
        count: this.globalState.count,
        limit: this.config.globalMaxPerWindow,
      });
      return {
        allowed: false,
        count: this.globalState.count,
        limit: this.config.globalMaxPerWindow,
        resetInMs,
        reason: `Global rate limit exceeded: ${this.globalState.count}/${this.config.globalMaxPerWindow} emails in window`,
      };
    }

    return {
      allowed: true,
      count: this.globalState.count,
      limit: this.config.globalMaxPerWindow,
      resetInMs,
    };
  }

  private checkSenderLimit(sender: string, now: number): RateLimitResult {
    let state = this.senderStates.get(sender);

    // Initialize or reset window for this sender
    if (!state || now - state.windowStart >= this.config.windowMs) {
      state = { count: 0, windowStart: now, limitedCount: state?.limitedCount ?? 0 };
      this.senderStates.set(sender, state);
    }

    const effectiveLimit = this.config.maxEmailsPerWindow + this.config.burstSize;
    const resetInMs = this.config.windowMs - (now - state.windowStart);

    if (state.count >= effectiveLimit) {
      state.limitedCount++;
      log.warn('Sender rate limit reached', {
        sender,
        count: state.count,
        limit: effectiveLimit,
        limitedCount: state.limitedCount,
      });
      return {
        allowed: false,
        sender,
        count: state.count,
        limit: effectiveLimit,
        resetInMs,
        reason: `Sender rate limit exceeded: ${state.count}/${effectiveLimit} emails in window`,
      };
    }

    return {
      allowed: true,
      sender,
      count: state.count,
      limit: effectiveLimit,
      resetInMs,
    };
  }

  private incrementGlobal(now: number): void {
    if (now - this.globalState.windowStart >= this.config.windowMs) {
      this.globalState = { count: 1, windowStart: now };
    } else {
      this.globalState.count++;
    }
  }

  private incrementSender(sender: string, now: number): void {
    const state = this.senderStates.get(sender);
    if (state && now - state.windowStart < this.config.windowMs) {
      state.count++;
    } else {
      this.senderStates.set(sender, {
        count: 1,
        windowStart: now,
        limitedCount: state?.limitedCount ?? 0,
      });
    }
  }

  private extractDomain(address: string): string {
    const atIndex = address.lastIndexOf('@');
    if (atIndex === -1) return address.toLowerCase();
    return address.substring(atIndex + 1).toLowerCase();
  }

  private cleanupExpiredState(): void {
    const now = Date.now();
    const expiredThreshold = this.config.windowMs * 3;
    let cleanedCount = 0;

    for (const [sender, state] of this.senderStates.entries()) {
      if (now - state.windowStart > expiredThreshold) {
        this.senderStates.delete(sender);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      log.debug(`Rate limiter cleanup: removed ${cleanedCount} expired sender states`);
    }
  }
}
