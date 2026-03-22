/**
 * @fileoverview Tests for EmailSanitizer and MailRateLimiter
 *
 * Validates Phase 6 production hardening components for the
 * Dove9-Dovecot integration pipeline.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EmailSanitizer } from '../dovecot-interface/email-sanitizer.js';
import { MailRateLimiter } from '../dovecot-interface/mail-rate-limiter.js';
import type { EmailMessage } from '../dovecot-interface/milter-server.js';

// Helper to create a test email
function makeEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    messageId: `<test-${Date.now()}@example.com>`,
    from: 'sender@example.com',
    to: ['bot@localhost'],
    cc: [],
    bcc: [],
    subject: 'Test Email Subject',
    body: 'Hello, this is a test email body.',
    headers: new Map([['content-type', 'text/plain']]),
    attachments: [],
    receivedAt: new Date(),
    ...overrides,
  };
}

// ============================================================
// EmailSanitizer Tests
// ============================================================

describe('EmailSanitizer', () => {
  let sanitizer: EmailSanitizer;

  beforeEach(() => {
    sanitizer = new EmailSanitizer();
  });

  describe('Clean emails pass through unchanged', () => {
    it('should allow a clean plain-text email without modification', () => {
      const email = makeEmail();
      const result = sanitizer.sanitize(email);

      expect(result.rejected).toBe(false);
      expect(result.wasModified).toBe(false);
      expect(result.actions).toHaveLength(0);
      expect(result.message.body).toBe(email.body);
    });

    it('should allow a clean HTML email', () => {
      const email = makeEmail({
        body: '<p>Hello <strong>world</strong>!</p>',
        headers: new Map([['content-type', 'text/html']]),
      });
      const result = sanitizer.sanitize(email);

      expect(result.rejected).toBe(false);
      expect(result.message.body).toContain('<p>');
    });
  });

  describe('HTML sanitization', () => {
    it('should strip script tags from HTML body', () => {
      const email = makeEmail({
        body: '<p>Hello</p><script>alert("xss")</script><p>World</p>',
        headers: new Map([['content-type', 'text/html']]),
      });
      const result = sanitizer.sanitize(email);

      expect(result.rejected).toBe(false);
      expect(result.wasModified).toBe(true);
      expect(result.message.body).not.toContain('<script>');
      expect(result.message.body).not.toContain('alert("xss")');
      expect(result.message.body).toContain('<p>Hello</p>');
      expect(result.actions).toContain('sanitized_html_body');
    });

    it('should strip javascript: URLs from HTML', () => {
      const email = makeEmail({
        body: '<a href="javascript:alert(1)">click</a>',
        headers: new Map([['content-type', 'text/html']]),
      });
      const result = sanitizer.sanitize(email);

      expect(result.wasModified).toBe(true);
      expect(result.message.body).not.toContain('javascript:');
    });

    it('should strip dangerous event attributes', () => {
      const email = makeEmail({
        body: '<img src="image.png" onerror="steal()" onload="track()">',
        headers: new Map([['content-type', 'text/html']]),
      });
      const result = sanitizer.sanitize(email);

      expect(result.wasModified).toBe(true);
      expect(result.message.body).not.toContain('onerror=');
      expect(result.message.body).not.toContain('onload=');
      expect(result.message.body).toContain('src="image.png"');
    });

    it('should strip onclick attribute', () => {
      const email = makeEmail({
        body: '<button onclick="malicious()">Click</button>',
        headers: new Map([['content-type', 'text/html']]),
      });
      const result = sanitizer.sanitize(email);

      expect(result.message.body).not.toContain('onclick=');
    });
  });

  describe('Plain text sanitization', () => {
    it('should remove null bytes from plain text', () => {
      const email = makeEmail({ body: 'Hello\x00World' });
      const result = sanitizer.sanitize(email);

      expect(result.wasModified).toBe(true);
      expect(result.message.body).not.toContain('\x00');
      expect(result.message.body).toBe('HelloWorld');
    });

    it('should remove dangerous control characters but keep tabs and newlines', () => {
      const email = makeEmail({ body: 'Line1\nLine2\tTabbed\x01Control' });
      const result = sanitizer.sanitize(email);

      expect(result.message.body).toContain('Line1\nLine2\tTabbed');
      expect(result.message.body).not.toContain('\x01');
    });
  });

  describe('Subject sanitization', () => {
    it('should sanitize subject with header injection attempt', () => {
      const email = makeEmail({
        subject: 'Normal Subject\r\nX-Injected: malicious',
      });
      const result = sanitizer.sanitize(email);

      expect(result.wasModified).toBe(true);
      expect(result.message.subject).not.toContain('\r\n');
      expect(result.actions).toContain('sanitized_subject');
    });

    it('should truncate overly long subjects', () => {
      const email = makeEmail({ subject: 'A'.repeat(1000) });
      const result = sanitizer.sanitize(email);

      expect(result.wasModified).toBe(true);
      expect(result.message.subject.length).toBeLessThanOrEqual(998);
    });
  });

  describe('Body size limits', () => {
    it('should truncate body exceeding max size', () => {
      const largeBody = 'A'.repeat(2 * 1024 * 1024); // 2MB
      const email = makeEmail({ body: largeBody });
      const sanitizerWithSmallLimit = new EmailSanitizer({ maxBodyLength: 1024 });
      const result = sanitizerWithSmallLimit.sanitize(email);

      expect(result.wasModified).toBe(true);
      expect(result.actions).toContain('truncated_body');
      expect(result.message.body).toContain('[Content truncated due to size limit]');
    });
  });

  describe('Recipient limits', () => {
    it('should reject emails with too many recipients', () => {
      const email = makeEmail({
        to: Array.from({ length: 200 }, (_, i) => `user${i}@example.com`),
      });
      const result = sanitizer.sanitize(email);

      expect(result.rejected).toBe(true);
      expect(result.rejectionReason).toContain('Too many recipients');
    });

    it('should allow emails within recipient limit', () => {
      const email = makeEmail({
        to: Array.from({ length: 5 }, (_, i) => `user${i}@example.com`),
      });
      const result = sanitizer.sanitize(email);

      expect(result.rejected).toBe(false);
    });
  });

  describe('Attachment safety', () => {
    it('should reject emails with executable attachments', () => {
      const email = makeEmail({
        attachments: [
          {
            filename: 'malware.exe',
            contentType: 'application/octet-stream',
            size: 1024,
            content: Buffer.from('MZ'),
          },
        ],
      });
      const result = sanitizer.sanitize(email);

      expect(result.rejected).toBe(true);
      expect(result.rejectionReason).toContain('.exe');
    });

    it('should reject emails with blocked MIME types', () => {
      const email = makeEmail({
        attachments: [
          {
            filename: 'setup.msi',
            contentType: 'application/x-msdownload',
            size: 512,
            content: Buffer.from(''),
          },
        ],
      });
      const result = sanitizer.sanitize(email);

      expect(result.rejected).toBe(true);
      expect(result.rejectionReason).toContain('application/x-msdownload');
    });

    it('should allow safe attachments like PDF', () => {
      const email = makeEmail({
        attachments: [
          {
            filename: 'document.pdf',
            contentType: 'application/pdf',
            size: 4096,
            content: Buffer.from('%PDF'),
          },
        ],
      });
      const result = sanitizer.sanitize(email);

      expect(result.rejected).toBe(false);
    });

    it('should not reject when rejectExecutableAttachments is false', () => {
      const lenientSanitizer = new EmailSanitizer({ rejectExecutableAttachments: false });
      const email = makeEmail({
        attachments: [
          {
            filename: 'script.bat',
            contentType: 'application/octet-stream',
            size: 64,
            content: Buffer.from('echo hello'),
          },
        ],
      });
      const result = lenientSanitizer.sanitize(email);

      expect(result.rejected).toBe(false);
    });
  });

  describe('Header sanitization', () => {
    it('should sanitize header values to prevent injection', () => {
      const headers = new Map([
        ['content-type', 'text/plain'],
        ['x-custom', 'value\r\nX-Injected: bad'],
      ]);
      const email = makeEmail({ headers });
      const result = sanitizer.sanitize(email);

      expect(result.wasModified).toBe(true);
      const customHeader = result.message.headers.get('x-custom');
      expect(customHeader).not.toContain('\r\n');
    });
  });

  describe('From address sanitization', () => {
    it('should remove control characters from sender address', () => {
      const email = makeEmail({ from: 'sender@example.com\r\nBcc: victim@example.com' });
      const result = sanitizer.sanitize(email);

      expect(result.message.from).not.toContain('\r\n');
      expect(result.wasModified).toBe(true);
    });
  });
});

// ============================================================
// MailRateLimiter Tests
// ============================================================

describe('MailRateLimiter', () => {
  let rateLimiter: MailRateLimiter;

  beforeEach(() => {
    rateLimiter = new MailRateLimiter({
      maxEmailsPerWindow: 5,
      burstSize: 2,
      windowMs: 60_000,
      globalMaxPerWindow: 100,
    });
  });

  describe('Basic rate limiting', () => {
    it('should allow emails within limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.checkLimit('user@example.com');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block emails exceeding limit (including burst)', () => {
      // Allow 5 + 2 burst = 7
      for (let i = 0; i < 7; i++) {
        rateLimiter.checkLimit('user@example.com');
      }
      const result = rateLimiter.checkLimit('user@example.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('rate limit exceeded');
    });

    it('should track different senders independently', () => {
      // Fill up sender1's limit
      for (let i = 0; i < 7; i++) {
        rateLimiter.checkLimit('sender1@example.com');
      }
      const blocked = rateLimiter.checkLimit('sender1@example.com');
      expect(blocked.allowed).toBe(false);

      // sender2 should still be allowed
      const allowed = rateLimiter.checkLimit('sender2@example.com');
      expect(allowed.allowed).toBe(true);
    });

    it('should return correct count and limit in result', () => {
      rateLimiter.checkLimit('user@example.com');
      rateLimiter.checkLimit('user@example.com');
      const result = rateLimiter.checkLimit('user@example.com');

      expect(result.allowed).toBe(true);
      expect(result.count).toBe(2); // count before this check
      expect(result.limit).toBe(7); // 5 + 2 burst
    });
  });

  describe('Domain-level rate limiting', () => {
    it('should limit by domain when trackByDomain is true', () => {
      const domainLimiter = new MailRateLimiter({
        maxEmailsPerWindow: 3,
        burstSize: 0,
        windowMs: 60_000,
        trackByDomain: true,
      });

      // Different users from same domain
      for (let i = 0; i < 3; i++) {
        domainLimiter.checkLimit(`user${i}@company.com`);
      }

      // Should be blocked because the domain hit the limit
      const result = domainLimiter.checkLimit('another@company.com');
      expect(result.allowed).toBe(false);

      domainLimiter.stop();
    });
  });

  describe('Global rate limiting', () => {
    it('should enforce global limit across all senders', () => {
      const globalLimiter = new MailRateLimiter({
        maxEmailsPerWindow: 1000,
        burstSize: 0,
        windowMs: 60_000,
        globalMaxPerWindow: 5,
      });

      // Send from multiple different senders to hit global limit
      for (let i = 0; i < 5; i++) {
        globalLimiter.checkLimit(`sender${i}@example.com`);
      }

      const result = globalLimiter.checkLimit('new@example.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Global rate limit');

      globalLimiter.stop();
    });
  });

  describe('Reset functionality', () => {
    it('should reset rate limit for a specific sender', () => {
      // Fill up limit
      for (let i = 0; i < 7; i++) {
        rateLimiter.checkLimit('user@example.com');
      }
      expect(rateLimiter.checkLimit('user@example.com').allowed).toBe(false);

      // Reset
      rateLimiter.resetSender('user@example.com');

      // Should be allowed again
      expect(rateLimiter.checkLimit('user@example.com').allowed).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      rateLimiter.checkLimit('a@example.com');
      rateLimiter.checkLimit('a@example.com');
      rateLimiter.checkLimit('b@example.com');

      const stats = rateLimiter.getStats();
      expect(stats.activeSenders).toBe(2);
      expect(stats.globalCount).toBe(3);
      expect(stats.topSenders).toBeDefined();
      expect(stats.topSenders.length).toBeGreaterThan(0);
    });

    it('should track limited count on senders that hit rate limit', () => {
      // Hit limit for user
      for (let i = 0; i < 8; i++) {
        rateLimiter.checkLimit('user@example.com');
      }
      // Check limit once more (this triggers rate limit tracking)
      rateLimiter.checkLimit('user@example.com');

      const stats = rateLimiter.getStats();
      const userStat = stats.topSenders.find((s) => s.sender === 'user@example.com');
      expect(userStat).toBeDefined();
      expect(userStat?.limitedCount).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should stop without error', () => {
      expect(() => rateLimiter.stop()).not.toThrow();
    });

    it('should handle multiple stop calls gracefully', () => {
      rateLimiter.stop();
      expect(() => rateLimiter.stop()).not.toThrow();
    });
  });
});
