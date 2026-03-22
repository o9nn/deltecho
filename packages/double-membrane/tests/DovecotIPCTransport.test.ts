/**
 * Tests for DovecotIPCTransport - Mail-based IPC Transport
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DovecotIPCTransport, DEFAULT_MAILBOX_MAPPINGS } from '../src/ipc/DovecotIPCTransport';
import type { IPCMessage } from '../src/ipc/IPCBridge';

describe('DovecotIPCTransport', () => {
  let transport: DovecotIPCTransport;

  beforeEach(async () => {
    transport = new DovecotIPCTransport({
      imapHost: 'localhost',
      imapPort: 993,
      smtpHost: 'localhost',
      smtpPort: 587,
      username: 'test',
      password: 'test',
      mailboxPrefix: 'INBOX',
      useTLS: false,
    });
  });

  afterEach(async () => {
    if (transport.isRunning()) {
      await transport.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await transport.initialize();
      expect(transport.isRunning()).toBe(true);
    });

    it('should connect to IMAP and SMTP', async () => {
      await transport.initialize();
      expect(transport.isIMAPConnected()).toBe(true);
      expect(transport.isSMTPConnected()).toBe(true);
    });

    it('should have default mailbox mappings', () => {
      const mappings = transport.getAllMappings();
      expect(mappings.length).toBeGreaterThan(0);
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await transport.initialize();
      expect(transport.isRunning()).toBe(true);
      await transport.shutdown();
      expect(transport.isRunning()).toBe(false);
    });

    it('should disconnect from IMAP and SMTP', async () => {
      await transport.initialize();
      await transport.shutdown();
      expect(transport.isIMAPConnected()).toBe(false);
      expect(transport.isSMTPConnected()).toBe(false);
    });
  });

  describe('mailbox mappings', () => {
    it('should map channels to mailboxes', async () => {
      await transport.initialize();
      const mailbox = transport.getChannelMailbox('cognitive:process');
      expect(mailbox).toBeDefined();
      expect(mailbox).toContain('cognitive');
    });

    it('should map mailboxes to channels', async () => {
      await transport.initialize();
      const mappings = transport.getAllMappings();
      const cognitiveMapping = mappings.find(m => m.channel === 'cognitive:process');
      expect(cognitiveMapping).toBeDefined();
      if (cognitiveMapping) {
        const channel = transport.getMailboxChannel(cognitiveMapping.mailbox);
        expect(channel).toBe('cognitive:process');
      }
    });

    it('should use default mappings when none provided', () => {
      const defaultTransport = new DovecotIPCTransport({
        imapHost: 'localhost',
        imapPort: 993,
        smtpHost: 'localhost',
        smtpPort: 587,
        username: 'test',
        password: 'test',
        mailboxPrefix: 'INBOX',
        useTLS: false,
      });
      const mappings = defaultTransport.getAllMappings();
      expect(mappings.length).toBe(DEFAULT_MAILBOX_MAPPINGS.length);
    });
  });

  describe('statistics', () => {
    it('should track statistics', async () => {
      await transport.initialize();
      const stats = transport.getStats();
      expect(stats.messagesSent).toBe(0);
      expect(stats.messagesReceived).toBe(0);
      expect(stats.activeSubscriptions).toBe(0);
      expect(stats.imapConnected).toBe(true);
      expect(stats.smtpConnected).toBe(true);
    });
  });

  describe('message conversion', () => {
    it('should convert mail to IPC message', async () => {
      await transport.initialize();
      
      const mailMessage = {
        messageId: '<test123@dove9.local>',
        from: 'user@example.com',
        to: ['echo@dove9.local'],
        subject: '[IPC:cognitive:process] request - req_123',
        body: '{"text": "Hello, world!"}',
        headers: new Map<string, string>([
          ['X-IPC-Channel', 'cognitive:process'],
          ['X-IPC-Type', 'request'],
          ['X-IPC-Source', 'user@example.com'],
          ['X-IPC-ID', 'req_123'],
          ['X-IPC-Timestamp', Date.now().toString()],
        ]),
        timestamp: new Date(),
        channel: 'cognitive:process' as const,
        ipcType: 'request' as const,
        payload: { text: 'Hello, world!' },
      };

      const ipcMessage = transport.mailToIPCMessage(mailMessage);
      
      expect(ipcMessage.channel).toBe('cognitive:process');
      expect(ipcMessage.type).toBe('request');
      expect(ipcMessage.source).toBe('user@example.com');
      expect(ipcMessage.payload).toEqual({ text: 'Hello, world!' });
    });
  });

  describe('subscription', () => {
    it('should subscribe to a channel', async () => {
      await transport.initialize();
      
      let messageReceived = false;
      await transport.subscribe('cognitive:process', (_message: IPCMessage) => {
        messageReceived = true;
      });
      
      const stats = transport.getStats();
      expect(stats.activeSubscriptions).toBe(1);
    });

    it('should unsubscribe from a channel', async () => {
      await transport.initialize();
      
      const handler = (_message: IPCMessage) => {};
      await transport.subscribe('cognitive:process', handler);
      
      let stats = transport.getStats();
      expect(stats.activeSubscriptions).toBe(1);
      
      await transport.unsubscribe('cognitive:process', handler);
      
      stats = transport.getStats();
      expect(stats.activeSubscriptions).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should return config without password', () => {
      const config = transport.getConfig();
      expect(config.imapHost).toBe('localhost');
      expect(config.username).toBe('test');
      expect((config as any).password).toBeUndefined();
    });
  });
});
