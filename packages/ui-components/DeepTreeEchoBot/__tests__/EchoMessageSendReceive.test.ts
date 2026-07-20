/**
 * Integration test to verify Deep Tree Echo Bot message send/receive functionality
 * This test verifies the core requirements from the issue:
 * 1. Fix Echo - verify bot can process messages
 * 2. Enable Echo as main user - verify toggle works
 * 3. Test Echo message send receive - verify message handling
 *
 * The bot delivers replies through BackendRemote.rpc.miscSendTextMessage,
 * so a spy on that RPC method observes outgoing messages.
 */

import { DeepTreeEchoBot } from '../DeepTreeEchoBot.js';
import { BackendRemote } from '@deltecho/shared/backend';

describe('Deep Tree Echo Bot - Message Send/Receive Integration', () => {
  let bot: DeepTreeEchoBot;
  let sendSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    sendSpy = jest.spyOn(BackendRemote.rpc, 'miscSendTextMessage').mockResolvedValue(0);

    bot = new DeepTreeEchoBot({
      enabled: true,
      enableAsMainUser: true,
      memoryEnabled: true,
      apiKey: 'test-key',
      apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      visionEnabled: false,
      webAutomationEnabled: false,
      embodimentEnabled: false,
      useParallelProcessing: false,
    });
  });

  describe('Basic Bot Functionality', () => {
    it('should initialize with correct settings', () => {
      expect(bot.isEnabled()).toBe(true);
      expect(bot.isEnabledAsMainUser()).toBe(true);
      expect(bot.isMemoryEnabled()).toBe(true);
    });

    it('should update settings correctly', () => {
      bot.updateOptions({ enableAsMainUser: false });
      expect(bot.isEnabledAsMainUser()).toBe(false);

      bot.updateOptions({ memoryEnabled: false });
      expect(bot.isMemoryEnabled()).toBe(false);
    });
  });

  describe('Message Processing', () => {
    it('should process regular messages', async () => {
      const message = {
        text: 'Hello Deep Tree Echo!',
        fromId: 2,
      };

      await expect(bot.processMessage(1, 42, 123, message)).resolves.not.toThrow();
      // A response should have been sent to the chat
      expect(sendSpy).toHaveBeenCalled();
    });

    it('should process help command', async () => {
      const message = {
        text: '/help',
        fromId: 2,
      };

      await expect(bot.processMessage(1, 42, 124, message)).resolves.not.toThrow();
      expect(sendSpy).toHaveBeenCalledWith(1, 42, expect.stringContaining('Available commands'));
    });

    it('should process version command', async () => {
      const message = {
        text: '/version',
        fromId: 2,
      };

      await expect(bot.processMessage(1, 42, 125, message)).resolves.not.toThrow();
      expect(sendSpy).toHaveBeenCalledWith(
        1,
        42,
        expect.stringContaining('Deep Tree Echo Bot Status')
      );
    });

    it('should process reflection command', async () => {
      const message = {
        text: '/reflect identity',
        fromId: 2,
      };

      await expect(bot.processMessage(1, 42, 126, message)).resolves.not.toThrow();
      expect(sendSpy).toHaveBeenCalledWith(1, 42, expect.stringContaining('Reflection'));
    });

    it('should handle disabled bot gracefully', async () => {
      bot.updateOptions({ enabled: false });

      const message = {
        text: 'Hello!',
        fromId: 2,
      };

      // Should return early without processing
      await expect(bot.processMessage(1, 42, 127, message)).resolves.not.toThrow();
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('Enable Echo as Main User', () => {
    it('should toggle main user mode', () => {
      // Initially enabled
      expect(bot.isEnabledAsMainUser()).toBe(true);

      // Disable
      bot.updateOptions({ enableAsMainUser: false });
      expect(bot.isEnabledAsMainUser()).toBe(false);

      // Re-enable
      bot.updateOptions({ enableAsMainUser: true });
      expect(bot.isEnabledAsMainUser()).toBe(true);
    });

    it('should default to false when not specified', () => {
      const defaultBot = new DeepTreeEchoBot({
        enabled: true,
        memoryEnabled: false,
        visionEnabled: false,
        webAutomationEnabled: false,
        embodimentEnabled: false,
      });

      expect(defaultBot.isEnabledAsMainUser()).toBe(false);
    });
  });

  describe('Memory Functionality', () => {
    it('should enable and disable memory', () => {
      expect(bot.isMemoryEnabled()).toBe(true);

      bot.updateOptions({ memoryEnabled: false });
      expect(bot.isMemoryEnabled()).toBe(false);
    });
  });
});
