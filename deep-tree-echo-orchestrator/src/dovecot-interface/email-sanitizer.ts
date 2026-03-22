import { getLogger } from 'deep-tree-echo-core';
import type { EmailMessage } from './milter-server.js';

const log = getLogger('deep-tree-echo-orchestrator/EmailSanitizer');

/**
 * Result of email sanitization
 */
export interface SanitizationResult {
  /** The sanitized email message */
  message: EmailMessage;
  /** Whether the email was modified during sanitization */
  wasModified: boolean;
  /** Whether the email was rejected (contains malicious content) */
  rejected: boolean;
  /** Reason for rejection, if applicable */
  rejectionReason?: string;
  /** List of actions taken during sanitization */
  actions: string[];
}

/**
 * Configuration for email sanitizer
 */
export interface SanitizerConfig {
  /** Maximum allowed body length in bytes (default: 1MB) */
  maxBodyLength: number;
  /** Maximum allowed subject length (default: 998 characters per RFC 5322) */
  maxSubjectLength: number;
  /** Maximum number of recipients (default: 100) */
  maxRecipients: number;
  /** Whether to strip script tags from HTML bodies */
  stripScripts: boolean;
  /** Whether to strip potentially dangerous HTML attributes (onclick, onerror, etc.) */
  stripDangerousAttributes: boolean;
  /** Whether to reject emails with executable attachments */
  rejectExecutableAttachments: boolean;
  /** Blocked MIME types for attachments */
  blockedMimeTypes: string[];
  /** Whether to normalize Unicode in headers to prevent header injection */
  normalizeUnicode: boolean;
}

const DEFAULT_SANITIZER_CONFIG: SanitizerConfig = {
  maxBodyLength: 1024 * 1024, // 1 MB
  maxSubjectLength: 998,
  maxRecipients: 100,
  stripScripts: true,
  stripDangerousAttributes: true,
  rejectExecutableAttachments: true,
  blockedMimeTypes: [
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-executable',
    'application/x-sh',
    'application/x-csh',
    'application/vnd.microsoft.portable-executable',
  ],
  normalizeUnicode: true,
};

/**
 * Dangerous HTML event attributes that can execute JavaScript.
 * Based on OWASP XSS Prevention Cheat Sheet and MDN HTML attribute reference:
 * https://owasp.org/www-community/attacks/xss/
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#event_handler_attributes
 */
const DANGEROUS_HTML_ATTRIBUTES = [
  'onabort', 'onblur', 'onchange', 'onclick', 'ondblclick', 'onerror',
  'onfocus', 'onkeydown', 'onkeypress', 'onkeyup', 'onload', 'onmousedown',
  'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onreset',
  'onresize', 'onscroll', 'onselect', 'onsubmit', 'onunload',
  'onanimationend', 'onanimationiteration', 'onanimationstart',
  'ontransitionend', 'oncontextmenu', 'oncopy', 'oncut', 'onpaste',
];

/** File extensions associated with executable or dangerous files */
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.pif', '.application',
  '.gadget', '.msp', '.hta', '.cpl', '.msc', '.jar', '.scr',
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2',
  '.reg', '.inf', '.lnk', '.url',
]);

/**
 * EmailSanitizer - Sanitizes incoming email content for secure cognitive processing
 *
 * Implements Phase 6 production hardening for the Dove9-Dovecot integration:
 * - Strips dangerous HTML content (scripts, event handlers)
 * - Enforces size limits on email components
 * - Blocks executable attachments
 * - Prevents header injection via Unicode normalization
 * - Removes null bytes and control characters
 */
export class EmailSanitizer {
  private config: SanitizerConfig;

  constructor(config: Partial<SanitizerConfig> = {}) {
    this.config = { ...DEFAULT_SANITIZER_CONFIG, ...config };
  }

  /**
   * Sanitize an incoming email message
   */
  public sanitize(message: EmailMessage): SanitizationResult {
    const actions: string[] = [];
    let rejected = false;
    let rejectionReason: string | undefined;

    // Work on a mutable copy
    const sanitized: EmailMessage = {
      ...message,
      to: [...message.to],
      cc: [...message.cc],
      bcc: [...message.bcc],
      headers: new Map(message.headers),
      attachments: [...message.attachments],
    };

    // 1. Validate and sanitize the sender address
    const fromResult = this.sanitizeAddress(sanitized.from);
    if (fromResult !== sanitized.from) {
      sanitized.from = fromResult;
      actions.push('sanitized_from_address');
    }

    // 2. Check recipient count
    const totalRecipients = sanitized.to.length + sanitized.cc.length + sanitized.bcc.length;
    if (totalRecipients > this.config.maxRecipients) {
      rejected = true;
      rejectionReason = `Too many recipients: ${totalRecipients} (max: ${this.config.maxRecipients})`;
      log.warn('Email rejected: too many recipients', { count: totalRecipients, messageId: message.messageId });
      return { message, wasModified: false, rejected, rejectionReason, actions };
    }

    // 3. Sanitize subject line
    const sanitizedSubject = this.sanitizeHeader(sanitized.subject, this.config.maxSubjectLength);
    if (sanitizedSubject !== sanitized.subject) {
      sanitized.subject = sanitizedSubject;
      actions.push('sanitized_subject');
    }

    // 4. Check body size
    const bodyBytes = Buffer.byteLength(sanitized.body, 'utf8');
    if (bodyBytes > this.config.maxBodyLength) {
      sanitized.body = sanitized.body.substring(
        0,
        Math.floor(this.config.maxBodyLength * 0.75)
      ) + '\n\n[Content truncated due to size limit]';
      actions.push('truncated_body');
      log.info('Email body truncated due to size limit', {
        originalSize: bodyBytes,
        maxSize: this.config.maxBodyLength,
        messageId: message.messageId,
      });
    }

    // 5. Sanitize body content
    const contentType = sanitized.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const sanitizedBody = this.sanitizeHtml(sanitized.body);
      if (sanitizedBody !== sanitized.body) {
        sanitized.body = sanitizedBody;
        actions.push('sanitized_html_body');
      }
    } else {
      // Remove null bytes and dangerous control characters from plain text
      const sanitizedBody = this.sanitizePlainText(sanitized.body);
      if (sanitizedBody !== sanitized.body) {
        sanitized.body = sanitizedBody;
        actions.push('sanitized_plain_text_body');
      }
    }

    // 6. Sanitize headers to prevent injection
    const headerResult = this.sanitizeHeaders(sanitized.headers);
    if (headerResult.modified) {
      sanitized.headers = headerResult.headers;
      actions.push('sanitized_headers');
    }

    // 7. Check attachments
    for (let i = 0; i < sanitized.attachments.length; i++) {
      const attachment = sanitized.attachments[i];

      // Check for blocked MIME types
      if (this.config.blockedMimeTypes.includes(attachment.contentType.toLowerCase())) {
        if (this.config.rejectExecutableAttachments) {
          rejected = true;
          rejectionReason = `Blocked MIME type in attachment: ${attachment.contentType}`;
          log.warn('Email rejected: blocked MIME type', {
            contentType: attachment.contentType,
            filename: attachment.filename,
            messageId: message.messageId,
          });
          return { message, wasModified: false, rejected, rejectionReason, actions };
        }
      }

      // Check for dangerous file extensions
      if (this.config.rejectExecutableAttachments && attachment.filename) {
        const ext = this.getFileExtension(attachment.filename);
        if (DANGEROUS_EXTENSIONS.has(ext)) {
          rejected = true;
          rejectionReason = `Dangerous file extension in attachment: ${ext}`;
          log.warn('Email rejected: dangerous attachment extension', {
            filename: attachment.filename,
            extension: ext,
            messageId: message.messageId,
          });
          return { message, wasModified: false, rejected, rejectionReason, actions };
        }
      }
    }

    const wasModified = actions.length > 0;

    if (wasModified) {
      log.debug('Email sanitized', { messageId: message.messageId, actions });
    }

    return { message: sanitized, wasModified, rejected: false, actions };
  }

  /**
   * Sanitize an email address (remove null bytes and control characters)
   */
  private sanitizeAddress(address: string): string {
    return address
      .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
      .replace(/\r?\n/g, '')            // Remove line breaks (header injection)
      .trim();
  }

  /**
   * Sanitize a header value (prevent header injection)
   */
  private sanitizeHeader(value: string, maxLength = 998): string {
    let sanitized = value
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // Remove dangerous control chars
      .replace(/\r\n(?![ \t])/g, ' ')  // Fold CRLF that isn't legitimate folding
      .replace(/\r(?!\n)/g, ' ')       // Remove bare CR
      .replace(/\n(?![ \t])/g, ' ');   // Remove bare LF that isn't folding

    if (this.config.normalizeUnicode) {
      try {
        sanitized = sanitized.normalize('NFC');
      } catch (err) {
        // If normalization fails (malformed Unicode), continue with original value
        log.debug('Unicode normalization failed for header value', { error: err });
      }
    }

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize all headers in the map
   */
  private sanitizeHeaders(
    headers: Map<string, string>
  ): { headers: Map<string, string>; modified: boolean } {
    const sanitized = new Map<string, string>();
    let modified = false;

    for (const [key, value] of headers) {
      const sanitizedKey = this.sanitizeHeader(key, 80);
      const sanitizedValue = this.sanitizeHeader(value);

      if (sanitizedKey !== key || sanitizedValue !== value) {
        modified = true;
      }

      if (sanitizedKey) {
        sanitized.set(sanitizedKey.toLowerCase(), sanitizedValue);
      }
    }

    return { headers: sanitized, modified };
  }

  /**
   * Sanitize HTML content by removing scripts and dangerous attributes
   */
  private sanitizeHtml(html: string): string {
    let sanitized = html;

    if (this.config.stripScripts) {
      // Remove script tags and their content
      sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
      // Remove inline javascript: URLs (handles mixed quotes, whitespace, and encoding)
      sanitized = sanitized.replace(
        /(\s*(?:href|src|action|formaction|xlink:href)\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
        (match, prefix) => {
          const valueMatch = match.slice(prefix.length);
          const unquoted = valueMatch.replace(/^["']|["']$/g, '');
          // Strip leading whitespace/null bytes that could bypass detection
          const normalizedVal = unquoted.replace(/[\x00-\x20]+/g, '');
          if (/^javascript:/i.test(normalizedVal) || /^data:/i.test(normalizedVal)) {
            return `${prefix}"#"`;
          }
          return match;
        }
      );
    }

    if (this.config.stripDangerousAttributes) {
      // Remove event handler attributes
      for (const attr of DANGEROUS_HTML_ATTRIBUTES) {
        const pattern = new RegExp(`\\s+${attr}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]*)`, 'gi');
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');

    return sanitized;
  }

  /**
   * Sanitize plain text content
   */
  private sanitizePlainText(text: string): string {
    return text
      .replace(/\x00/g, '')                       // Remove null bytes
      .replace(/[\x01-\x08\x0e-\x1f\x7f]/g, ''); // Remove dangerous control chars (keep \t, \n, \r)
  }

  /**
   * Get file extension from filename (lowercase)
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot).toLowerCase();
  }
}
