/**
 * Tests for MailProtocolBridge
 */

import { MailProtocolBridge } from '../../integration/mail-protocol-bridge.js';
import { MailMessage, MailFlag } from '../../types/mail.js';
import { ProcessState, StreamId } from '../../types/index.js';

describe('MailProtocolBridge', () => {
  let bridge: MailProtocolBridge;

  beforeEach(() => {
    bridge = new MailProtocolBridge();
  });

  describe('mailToProcess', () => {
    it('should convert MailMessage to MessageProcess', () => {
      const mail: MailMessage = {
        messageId: '<test@example.com>',
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: 'Test Subject',
        body: 'Test body content',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      const process = bridge.mailToProcess(mail);

      expect(process.id).toBe('<test@example.com>');
      expect(process.messageId).toBe('<test@example.com>');
      expect(process.from).toBe('user@example.com');
      expect(process.to).toContain('echo@dove9.local');
      expect(process.subject).toBe('Test Subject');
      expect(process.content).toBe('Test body content');
      expect(process.state).toBe(ProcessState.PENDING);
      expect(process.currentStep).toBe(1);
      expect(process.currentStream).toBe(StreamId.PRIMARY);
    });

    it('should handle reply threading', () => {
      const mail: MailMessage = {
        messageId: '<reply@example.com>',
        inReplyTo: '<original@example.com>',
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: 'Re: Test',
        body: 'Reply content',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      const process = bridge.mailToProcess(mail);

      expect(process.parentId).toBe('<original@example.com>');
      expect(process.priority).toBeGreaterThan(5); // Increased for replies
    });

    it('should determine state from mailbox', () => {
      const baseMail: MailMessage = {
        messageId: '<test@example.com>',
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: 'Test',
        body: 'Test',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      // Test different mailboxes
      const inbox = bridge.mailToProcess({ ...baseMail, mailbox: 'INBOX' });
      expect(inbox.state).toBe(ProcessState.PENDING);

      const processing = bridge.mailToProcess({ ...baseMail, mailbox: 'INBOX.Processing' });
      expect(processing.state).toBe(ProcessState.PROCESSING);

      const sent = bridge.mailToProcess({ ...baseMail, mailbox: 'Sent' });
      expect(sent.state).toBe(ProcessState.COMPLETED);

      const drafts = bridge.mailToProcess({ ...baseMail, mailbox: 'Drafts' });
      expect(drafts.state).toBe(ProcessState.SUSPENDED);

      const trash = bridge.mailToProcess({ ...baseMail, mailbox: 'Trash' });
      expect(trash.state).toBe(ProcessState.TERMINATED);
    });

    it('should determine state from flags', () => {
      const baseMail: MailMessage = {
        messageId: '<test@example.com>',
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: 'Test',
        body: 'Test',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      const flagged = bridge.mailToProcess({ ...baseMail, flags: [MailFlag.FLAGGED] });
      expect(flagged.state).toBe(ProcessState.ACTIVE);

      const answered = bridge.mailToProcess({ ...baseMail, flags: [MailFlag.ANSWERED] });
      expect(answered.state).toBe(ProcessState.COMPLETED);

      const draft = bridge.mailToProcess({ ...baseMail, flags: [MailFlag.DRAFT] });
      expect(draft.state).toBe(ProcessState.SUSPENDED);

      const deleted = bridge.mailToProcess({ ...baseMail, flags: [MailFlag.DELETED] });
      expect(deleted.state).toBe(ProcessState.TERMINATED);
    });

    it('should calculate priority based on mail properties', () => {
      const baseMail: MailMessage = {
        messageId: '<test@example.com>',
        from: 'user@example.com',
        to: ['echo@dove9.local'], // Single recipient gets +2
        subject: 'Test',
        body: 'Test',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      const normal = bridge.mailToProcess(baseMail);
      expect(normal.priority).toBe(7); // Default 5 + 2 for single recipient

      const groupMail = bridge.mailToProcess({ 
        ...baseMail, 
        to: ['a@example.com', 'b@example.com', 'c@example.com']  // Multiple recipients
      });
      expect(groupMail.priority).toBe(5); // Default 5, no single recipient bonus

      const flagged = bridge.mailToProcess({ ...baseMail, flags: [MailFlag.FLAGGED] });
      expect(flagged.priority).toBe(9); // 5 + 2 (single) + 2 (flagged)

      const reply = bridge.mailToProcess({ ...baseMail, inReplyTo: '<parent@example.com>' });
      expect(reply.priority).toBe(8); // 5 + 2 (single) + 1 (reply)
    });

    it('should create cognitive context with salience', () => {
      const mail: MailMessage = {
        messageId: '<test@example.com>',
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: 'Important: Urgent matter requiring immediate attention',
        body: 'This is a longer message body with more complex content that should affect the salience calculation. It contains multiple sentences and requires more cognitive processing.',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      const process = bridge.mailToProcess(mail);

      expect(process.cognitiveContext.salienceScore).toBeGreaterThan(0.5);
      expect(process.cognitiveContext.emotionalArousal).toBeGreaterThan(0);
      expect(process.cognitiveContext.activeCouplings).toBeDefined();
    });
  });

  describe('processToMail', () => {
    it('should convert MessageProcess to MailMessage', () => {
      const inputMail: MailMessage = {
        messageId: '<test@example.com>',
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: 'Test',
        body: 'Question',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      const process = bridge.mailToProcess(inputMail);
      const response = 'This is the response';
      const outputMail = bridge.processToMail(process, response);

      expect(outputMail.from).toBe('echo@dove9.local');
      expect(outputMail.to).toContain('user@example.com');
      expect(outputMail.subject).toBe('Re: Test');
      expect(outputMail.body).toBe(response);
      expect(outputMail.inReplyTo).toBeUndefined();
    });

    it('should include Dove9 metadata in headers', () => {
      const inputMail: MailMessage = {
        messageId: '<test@example.com>',
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: 'Test',
        body: 'Question',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      const process = bridge.mailToProcess(inputMail);
      process.currentStep = 25; // More than 2 cycles
      const outputMail = bridge.processToMail(process, 'Response');

      expect(outputMail.headers.get('X-Dove9-Process-Id')).toBe(process.id);
      expect(outputMail.headers.get('X-Dove9-State')).toBe(process.state);
      expect(outputMail.headers.get('X-Dove9-Priority')).toBe(process.priority.toString());
      expect(outputMail.headers.get('X-Dove9-Cycle')).toBe('2');
      expect(outputMail.headers.get('X-Dove9-Step')).toBe('25');
    });

    it('should set correct mailbox based on state', () => {
      const mail: MailMessage = {
        messageId: '<test@example.com>',
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: 'Test',
        body: 'Test',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      const process = bridge.mailToProcess(mail);

      process.state = ProcessState.PENDING;
      expect(bridge.processToMail(process, 'Response').mailbox).toBe('INBOX');

      process.state = ProcessState.PROCESSING;
      expect(bridge.processToMail(process, 'Response').mailbox).toBe('INBOX.Processing');

      process.state = ProcessState.COMPLETED;
      expect(bridge.processToMail(process, 'Response').mailbox).toBe('Sent');

      process.state = ProcessState.SUSPENDED;
      expect(bridge.processToMail(process, 'Response').mailbox).toBe('Drafts');

      process.state = ProcessState.TERMINATED;
      expect(bridge.processToMail(process, 'Response').mailbox).toBe('Trash');
    });
  });

  describe('extractThreadRelations', () => {
    it('should extract thread parent and siblings', () => {
      const mail: MailMessage = {
        messageId: '<current@example.com>',
        inReplyTo: '<parent@example.com>',
        references: ['<grandparent@example.com>', '<parent@example.com>'],
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: 'Re: Thread',
        body: 'Reply',
        headers: new Map(),
        timestamp: new Date(),
        receivedAt: new Date(),
        mailbox: 'INBOX',
      };

      const relations = bridge.extractThreadRelations(mail);

      expect(relations.parentId).toBe('<parent@example.com>');
      expect(relations.siblingIds).toContain('<grandparent@example.com>');
      expect(relations.siblingIds).not.toContain('<parent@example.com>');
    });
  });

  describe('getMailboxMapping', () => {
    it('should return mailbox mapping', () => {
      const mapping = bridge.getMailboxMapping();

      expect(mapping.inbox).toBe('INBOX');
      expect(mapping.processing).toBe('INBOX.Processing');
      expect(mapping.sent).toBe('Sent');
    });

    it('should support custom mailbox mapping', () => {
      const customBridge = new MailProtocolBridge({
        mailboxMapping: {
          inbox: 'Custom/Inbox',
          processing: 'Custom/Processing',
        },
      });

      const mapping = customBridge.getMailboxMapping();

      expect(mapping.inbox).toBe('Custom/Inbox');
      expect(mapping.processing).toBe('Custom/Processing');
      expect(mapping.sent).toBe('Sent'); // Default
    });
  });
});
