/**
 * Tests for Mail types
 */

import {
  MailMessage,
  MailFlag,
  DEFAULT_MAILBOX_MAPPING,
  MailProtocol,
  MailOperation,
} from '../../types/mail.js';

describe('Mail Types', () => {
  it('should create valid MailMessage', () => {
    const mail: MailMessage = {
      messageId: '<test@example.com>',
      from: 'user@example.com',
      to: ['echo@dove9.local'],
      subject: 'Test',
      body: 'Hello',
      headers: new Map([['X-Test', 'value']]),
      timestamp: new Date(),
      receivedAt: new Date(),
      mailbox: 'INBOX',
    };

    expect(mail.messageId).toBe('<test@example.com>');
    expect(mail.from).toBe('user@example.com');
    expect(mail.to).toContain('echo@dove9.local');
    expect(mail.subject).toBe('Test');
    expect(mail.body).toBe('Hello');
    expect(mail.headers.get('X-Test')).toBe('value');
  });

  it('should handle mail flags', () => {
    expect(MailFlag.SEEN).toBe('\\Seen');
    expect(MailFlag.ANSWERED).toBe('\\Answered');
    expect(MailFlag.FLAGGED).toBe('\\Flagged');
    expect(MailFlag.DELETED).toBe('\\Deleted');
    expect(MailFlag.DRAFT).toBe('\\Draft');
  });

  it('should have default mailbox mapping', () => {
    expect(DEFAULT_MAILBOX_MAPPING.inbox).toBe('INBOX');
    expect(DEFAULT_MAILBOX_MAPPING.processing).toBe('INBOX.Processing');
    expect(DEFAULT_MAILBOX_MAPPING.sent).toBe('Sent');
    expect(DEFAULT_MAILBOX_MAPPING.drafts).toBe('Drafts');
    expect(DEFAULT_MAILBOX_MAPPING.trash).toBe('Trash');
    expect(DEFAULT_MAILBOX_MAPPING.archive).toBe('Archive');
  });

  it('should define mail protocols', () => {
    expect(MailProtocol.IMAP).toBe('IMAP');
    expect(MailProtocol.SMTP).toBe('SMTP');
    expect(MailProtocol.LMTP).toBe('LMTP');
  });

  it('should define mail operations', () => {
    expect(MailOperation.FETCH).toBe('FETCH');
    expect(MailOperation.SEND).toBe('SEND');
    expect(MailOperation.MOVE).toBe('MOVE');
    expect(MailOperation.DELETE).toBe('DELETE');
    expect(MailOperation.MARK).toBe('MARK');
  });

  it('should support mail threading', () => {
    const mail: MailMessage = {
      messageId: '<reply@example.com>',
      threadId: '<thread@example.com>',
      inReplyTo: '<original@example.com>',
      references: ['<original@example.com>', '<thread@example.com>'],
      from: 'user@example.com',
      to: ['echo@dove9.local'],
      subject: 'Re: Test',
      body: 'Reply body',
      headers: new Map(),
      timestamp: new Date(),
      receivedAt: new Date(),
      mailbox: 'INBOX',
    };

    expect(mail.threadId).toBe('<thread@example.com>');
    expect(mail.inReplyTo).toBe('<original@example.com>');
    expect(mail.references).toHaveLength(2);
  });

  it('should support mail attachments', () => {
    const mail: MailMessage = {
      messageId: '<test@example.com>',
      from: 'user@example.com',
      to: ['echo@dove9.local'],
      subject: 'Test with attachment',
      body: 'See attached',
      headers: new Map(),
      timestamp: new Date(),
      receivedAt: new Date(),
      mailbox: 'INBOX',
      attachments: [
        {
          filename: 'document.pdf',
          contentType: 'application/pdf',
          size: 1024,
        },
      ],
    };

    expect(mail.attachments).toHaveLength(1);
    expect(mail.attachments![0].filename).toBe('document.pdf');
    expect(mail.attachments![0].contentType).toBe('application/pdf');
  });
});
