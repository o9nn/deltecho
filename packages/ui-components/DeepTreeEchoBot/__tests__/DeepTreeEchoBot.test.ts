import { DeepTreeEchoBot } from '../DeepTreeEchoBot.js';
import { LLMService } from '../LLMService.js';
import { BackendRemote } from '@deltecho/shared/backend';

/**
 * DeepTreeEchoBot.processMessage() returns void and delivers its replies
 * through BackendRemote.rpc.miscSendTextMessage, so the tests observe the
 * messages sent through a spy on that RPC method.
 */
describe('DeepTreeEchoBot', () => {
  let bot: DeepTreeEchoBot;
  let sendSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    sendSpy = jest.spyOn(BackendRemote.rpc, 'miscSendTextMessage').mockResolvedValue(0);

    bot = new DeepTreeEchoBot({
      enabled: true,
      apiKey: 'test-api-key',
      apiEndpoint: 'https://test-api-endpoint.com',
      memoryEnabled: true,
      personality: 'Test personality',
      visionEnabled: true,
      webAutomationEnabled: true,
      embodimentEnabled: true,
      useParallelProcessing: false,
    });
  });

  const sentTexts = () => sendSpy.mock.calls.map((call) => String(call[2]));

  describe('processMessage', () => {
    it('should process regular messages and send a response', async () => {
      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      };

      await bot.processMessage(1, 100, 123, message as any);

      // A thinking indicator followed by the generated response
      expect(sendSpy).toHaveBeenCalledWith(1, 100, '*Thinking...*');
      expect(sendSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      const lastText = sentTexts()[sentTexts().length - 1];
      expect(typeof lastText).toBe('string');
      expect(lastText.length).toBeGreaterThan(0);
    });

    it('should not send anything if the bot is disabled', async () => {
      bot.updateOptions({ enabled: false });

      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      };

      await bot.processMessage(1, 100, 123, message as any);

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should handle command messages', async () => {
      const message = {
        id: 123,
        text: '/help',
        file: null,
      };

      await bot.processMessage(1, 100, 123, message as any);

      expect(sendSpy).toHaveBeenCalledWith(1, 100, expect.stringContaining('commands'));
    });

    it('should handle LLM errors gracefully', async () => {
      jest
        .spyOn(LLMService.getInstance(), 'generateResponse')
        .mockRejectedValueOnce(new Error('LLM failure'));

      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      };

      await bot.processMessage(1, 100, 123, message as any);

      expect(sendSpy).toHaveBeenCalledWith(1, 100, expect.stringContaining("I'm sorry"));
    });
  });

  describe('Command Handlers', () => {
    it('should handle the /help command', async () => {
      const message = {
        id: 123,
        text: '/help',
        file: null,
      };

      await bot.processMessage(1, 100, 123, message as any);

      expect(sendSpy).toHaveBeenCalledWith(1, 100, expect.stringContaining('Available commands'));
    });

    it('should handle the /vision command', async () => {
      const message = {
        id: 123,
        text: '/vision',
        file: 'test-file-path.jpg',
      };

      await bot.processMessage(1, 100, 123, message as any);

      expect(sendSpy).toHaveBeenCalledWith(1, 100, expect.stringContaining('Vision analysis'));
    });

    it('should handle the /search command', async () => {
      const message = {
        id: 123,
        text: '/search test query',
        file: null,
      };

      await bot.processMessage(1, 100, 123, message as any);

      expect(sendSpy).toHaveBeenCalledWith(
        1,
        100,
        expect.stringContaining('Searching for: "test query"')
      );
    });

    it('should handle the /memory command', async () => {
      const message = {
        id: 123,
        text: '/memory status',
        file: null,
      };

      await bot.processMessage(1, 100, 123, message as any);

      expect(sendSpy).toHaveBeenCalledWith(1, 100, expect.stringContaining('Memory Status'));
    });

    it('should report unknown commands', async () => {
      const message = {
        id: 123,
        text: '/unknowncommand',
        file: null,
      };

      await bot.processMessage(1, 100, 123, message as any);

      expect(sendSpy).toHaveBeenCalledWith(1, 100, expect.stringContaining('Unknown command'));
    });
  });

  describe('updateOptions', () => {
    it('should update options', async () => {
      bot.updateOptions({
        enabled: false,
        apiKey: 'new-api-key',
        visionEnabled: false,
      });

      // We can't directly check the private options, but we can test functionality
      const message = {
        id: 123,
        text: 'Hello bot',
        file: null,
      };

      await bot.processMessage(1, 100, 123, message as any);

      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
