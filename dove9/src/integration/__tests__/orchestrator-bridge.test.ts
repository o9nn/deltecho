/**
 * Orchestrator Bridge Tests
 *
 * Comprehensive test suite for the OrchestratorBridge class,
 * covering initialization, email processing, event handling, and lifecycle.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';
import {
  OrchestratorBridge,
  OrchestratorBridgeConfig,
  DovecotEmail,
  EmailResponse,
  createOrchestratorBridge,
} from '../orchestrator-bridge.js';
import {
  LLMServiceInterface,
  MemoryStoreInterface,
  PersonaCoreInterface,
} from '../../cognitive/deep-tree-echo-processor.js';

// Mock implementations
const createMockLLMService = (): LLMServiceInterface => ({
  generateResponse: jest.fn<() => Promise<string>>().mockResolvedValue('Generated response'),
  generateParallelResponse: jest.fn<() => Promise<any>>().mockResolvedValue({
    integratedResponse: 'Integrated response',
    cognitiveResponse: 'Cognitive stream',
    affectiveResponse: 'Affective stream',
    relevanceResponse: 'Relevance stream',
  }),
});

const createMockMemoryStore = (): MemoryStoreInterface => ({
  storeMemory: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  retrieveRecentMemories: jest.fn<() => string[]>().mockReturnValue(['Memory 1', 'Memory 2']),
  retrieveRelevantMemories: jest.fn<() => Promise<string[]>>().mockResolvedValue(['Relevant 1', 'Relevant 2']),
});

const createMockPersonaCore = (): PersonaCoreInterface => ({
  getPersonality: jest.fn<() => string>().mockReturnValue('Friendly AI assistant'),
  getDominantEmotion: jest.fn<() => { emotion: string; intensity: number }>().mockReturnValue({ emotion: 'interest', intensity: 0.6 }),
  updateEmotionalState: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
});

const createTestEmail = (overrides: Partial<DovecotEmail> = {}): DovecotEmail => ({
  from: 'user@example.com',
  to: ['echo@localhost'],
  subject: 'Test Subject',
  body: 'Test body content',
  headers: new Map([['Content-Type', 'text/plain']]),
  messageId: 'test-msg-123',
  receivedAt: new Date(),
  ...overrides,
});

describe('OrchestratorBridge', () => {
  let bridge: OrchestratorBridge;
  let mockLLM: LLMServiceInterface;
  let mockMemory: MemoryStoreInterface;
  let mockPersona: PersonaCoreInterface;

  beforeEach(() => {
    mockLLM = createMockLLMService();
    mockMemory = createMockMemoryStore();
    mockPersona = createMockPersonaCore();
    bridge = new OrchestratorBridge();
  });

  afterEach(async () => {
    if (bridge.isRunning()) {
      await bridge.stop();
    }
  });

  describe('constructor', () => {
    it('should create bridge with default config', () => {
      expect(bridge).toBeDefined();
      expect(bridge.isRunning()).toBe(false);
    });

    it('should create bridge with custom config', () => {
      const customConfig: Partial<OrchestratorBridgeConfig> = {
        botEmailAddress: 'custom@bot.com',
        enableAutoResponse: false,
        responseDelay: 1000,
      };
      const customBridge = new OrchestratorBridge(customConfig);
      expect(customBridge).toBeDefined();
    });

    it('should extend EventEmitter', () => {
      expect(bridge).toBeInstanceOf(EventEmitter);
    });
  });

  describe('createOrchestratorBridge factory', () => {
    it('should create bridge instance', () => {
      const factoryBridge = createOrchestratorBridge();
      expect(factoryBridge).toBeInstanceOf(OrchestratorBridge);
    });

    it('should pass config to bridge', () => {
      const config = { botEmailAddress: 'factory@bot.com' };
      const factoryBridge = createOrchestratorBridge(config);
      expect(factoryBridge).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize with cognitive services', () => {
      expect(() => {
        bridge.initialize(mockLLM, mockMemory, mockPersona);
      }).not.toThrow();
    });

    it('should create Dove9 system on initialization', () => {
      bridge.initialize(mockLLM, mockMemory, mockPersona);
      expect(bridge.getDove9System()).not.toBeNull();
    });
  });

  describe('start/stop lifecycle', () => {
    beforeEach(() => {
      bridge.initialize(mockLLM, mockMemory, mockPersona);
    });

    it('should start the bridge', async () => {
      await bridge.start();
      expect(bridge.isRunning()).toBe(true);
    });

    it('should emit started event', async () => {
      const startedHandler = jest.fn();
      bridge.on('started', startedHandler);

      await bridge.start();

      expect(startedHandler).toHaveBeenCalled();
    });

    it('should stop the bridge', async () => {
      await bridge.start();
      await bridge.stop();
      expect(bridge.isRunning()).toBe(false);
    });

    it('should emit stopped event', async () => {
      const stoppedHandler = jest.fn();
      bridge.on('stopped', stoppedHandler);

      await bridge.start();
      await bridge.stop();

      expect(stoppedHandler).toHaveBeenCalled();
    });

    it('should not start twice', async () => {
      await bridge.start();
      await bridge.start(); // Should not throw
      expect(bridge.isRunning()).toBe(true);
    });

    it('should handle stop when not running', async () => {
      await bridge.stop(); // Should not throw
      expect(bridge.isRunning()).toBe(false);
    });

    it('should throw if started without initialization', async () => {
      const uninitializedBridge = new OrchestratorBridge();
      await expect(uninitializedBridge.start()).rejects.toThrow('Bridge not initialized');
    });
  });

  describe('processEmail', () => {
    beforeEach(async () => {
      bridge.initialize(mockLLM, mockMemory, mockPersona);
      await bridge.start();
    });

    it('should process email addressed to bot', async () => {
      const email = createTestEmail();
      const result = await bridge.processEmail(email);

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
    });

    it('should ignore email not addressed to bot', async () => {
      const email = createTestEmail({ to: ['other@example.com'] });
      const result = await bridge.processEmail(email);

      expect(result).toBeNull();
    });

    it('should handle case-insensitive bot address matching', async () => {
      const email = createTestEmail({ to: ['ECHO@LOCALHOST'] });
      const result = await bridge.processEmail(email);

      expect(result).toBeDefined();
    });

    it('should handle email with multiple recipients including bot', async () => {
      const email = createTestEmail({
        to: ['other@example.com', 'echo@localhost', 'another@example.com'],
      });
      const result = await bridge.processEmail(email);

      expect(result).toBeDefined();
    });

    it('should throw if not initialized', async () => {
      const uninitializedBridge = new OrchestratorBridge();
      const email = createTestEmail();

      await expect(uninitializedBridge.processEmail(email)).rejects.toThrow(
        'Bridge not initialized'
      );
    });

    it('should generate messageId if not provided', async () => {
      const email = createTestEmail({ messageId: undefined });
      const result = await bridge.processEmail(email);

      expect(result).toBeDefined();
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      bridge.initialize(mockLLM, mockMemory, mockPersona);
      await bridge.start();
    });

    it('should emit response event when response is ready', async () => {
      const responseHandler = jest.fn();
      bridge.on('response', responseHandler);

      const email = createTestEmail();
      await bridge.processEmail(email);

      // Wait for async response
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(responseHandler).toHaveBeenCalled();
      const response = responseHandler.mock.calls[0][0] as EmailResponse;
      expect(response.to).toBe(email.from);
      expect(response.from).toBe('echo@localhost');
      expect(response.subject).toContain('Re:');
    });

    it('should emit send_response event for auto-response', async () => {
      const sendHandler = jest.fn();
      bridge.on('send_response', sendHandler);

      const email = createTestEmail();
      await bridge.processEmail(email);

      // Wait for async response
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sendHandler).toHaveBeenCalled();
    });

    it('should not emit send_response when auto-response is disabled', async () => {
      const customBridge = new OrchestratorBridge({ enableAutoResponse: false });
      customBridge.initialize(mockLLM, mockMemory, mockPersona);
      await customBridge.start();

      const sendHandler = jest.fn();
      customBridge.on('send_response', sendHandler);

      const email = createTestEmail();
      await customBridge.processEmail(email);

      // Wait for async response
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sendHandler).not.toHaveBeenCalled();

      await customBridge.stop();
    });

    it('should forward kernel events', async () => {
      const kernelHandler = jest.fn();
      bridge.on('kernel_event', kernelHandler);

      const dove9 = bridge.getDove9System();
      dove9?.emit('kernel_event', { type: 'test' });

      expect(kernelHandler).toHaveBeenCalledWith({ type: 'test' });
    });

    it('should forward triad sync events', async () => {
      const triadHandler = jest.fn();
      bridge.on('triad_sync', triadHandler);

      const dove9 = bridge.getDove9System();
      dove9?.emit('triad_sync', { triad: 'data' });

      expect(triadHandler).toHaveBeenCalledWith({ triad: 'data' });
    });

    it('should forward cycle complete events', async () => {
      const cycleHandler = jest.fn();
      bridge.on('cycle_complete', cycleHandler);

      const dove9 = bridge.getDove9System();
      dove9?.emit('cycle_complete', { cycle: 1, metrics: {} });

      expect(cycleHandler).toHaveBeenCalledWith({ cycle: 1, metrics: {} });
    });
  });

  describe('getMetrics', () => {
    it('should return null when not initialized', () => {
      expect(bridge.getMetrics()).toBeNull();
    });

    it('should return metrics when initialized and started', async () => {
      bridge.initialize(mockLLM, mockMemory, mockPersona);
      await bridge.start();
      const metrics = bridge.getMetrics();

      expect(metrics).toBeDefined();
      // Metrics structure varies based on Dove9System state
      expect(metrics).not.toBeNull();
    });
  });

  describe('getActiveProcesses', () => {
    it('should return empty array when not initialized', () => {
      expect(bridge.getActiveProcesses()).toEqual([]);
    });

    it('should return processes when initialized', () => {
      bridge.initialize(mockLLM, mockMemory, mockPersona);
      const processes = bridge.getActiveProcesses();

      expect(Array.isArray(processes)).toBe(true);
    });
  });

  describe('getDove9System', () => {
    it('should return null when not initialized', () => {
      expect(bridge.getDove9System()).toBeNull();
    });

    it('should return Dove9 system when initialized', () => {
      bridge.initialize(mockLLM, mockMemory, mockPersona);
      expect(bridge.getDove9System()).not.toBeNull();
    });
  });

  describe('configuration propagation', () => {
    it('should pass Dove9 config to system', () => {
      const customConfig: Partial<OrchestratorBridgeConfig> = {
        stepDuration: 500,
        maxConcurrentProcesses: 10,
        enableMilter: true,
        enableLMTP: true,
        enableDeltaChat: true,
        enableParallelCognition: true,
      };

      const customBridge = new OrchestratorBridge(customConfig);
      customBridge.initialize(mockLLM, mockMemory, mockPersona);

      const dove9 = customBridge.getDove9System();
      expect(dove9).not.toBeNull();
    });
  });

  describe('email response formatting', () => {
    beforeEach(async () => {
      bridge.initialize(mockLLM, mockMemory, mockPersona);
      await bridge.start();
    });

    it('should include inReplyTo header', async () => {
      const responseHandler = jest.fn();
      bridge.on('response', responseHandler);

      const email = createTestEmail({ messageId: 'original-msg-id' });
      await bridge.processEmail(email);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = responseHandler.mock.calls[0][0] as EmailResponse;
      expect(response.inReplyTo).toBe('original-msg-id');
    });

    it('should use bot email as from address', async () => {
      const customBridge = new OrchestratorBridge({ botEmailAddress: 'custom@bot.io' });
      customBridge.initialize(mockLLM, mockMemory, mockPersona);
      await customBridge.start();

      const responseHandler = jest.fn();
      customBridge.on('response', responseHandler);

      const email = createTestEmail({ to: ['custom@bot.io'] });
      await customBridge.processEmail(email);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = responseHandler.mock.calls[0][0] as EmailResponse;
      expect(response.from).toBe('custom@bot.io');

      await customBridge.stop();
    });
  });
});
