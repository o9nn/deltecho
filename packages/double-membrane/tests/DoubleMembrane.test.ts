/**
 * Tests for DoubleMembrane main class
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DoubleMembrane } from '../src/DoubleMembrane.js';

describe('DoubleMembrane', () => {
  let membrane: DoubleMembrane;

  beforeEach(() => {
    membrane = new DoubleMembrane({
      instanceName: 'TestEcho',
      verbose: false,
    });
  });

  afterEach(() => {
    if (membrane.isRunning()) {
      membrane.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const newMembrane = new DoubleMembrane();
      expect(newMembrane.isRunning()).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customMembrane = new DoubleMembrane({
        instanceName: 'CustomEcho',
        escalationThreshold: 0.8,
      });
      expect(customMembrane.isRunning()).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('should start and stop correctly', async () => {
      expect(membrane.isRunning()).toBe(false);
      await membrane.start();
      expect(membrane.isRunning()).toBe(true);
      membrane.stop();
      expect(membrane.isRunning()).toBe(false);
    });

    it('should emit started event', async () => {
      let eventReceived = false;
      membrane.on('started', () => {
        eventReceived = true;
      });
      await membrane.start();
      expect(eventReceived).toBe(true);
    });

    it('should emit stopped event', async () => {
      await membrane.start();
      let eventReceived = false;
      membrane.on('stopped', () => {
        eventReceived = true;
      });
      membrane.stop();
      expect(eventReceived).toBe(true);
    });
  });

  describe('processing', () => {
    beforeEach(async () => {
      await membrane.start();
    });

    it('should process simple requests', async () => {
      const response = await membrane.process({
        id: 'test-1',
        prompt: 'Hello!',
        priority: 'normal',
        preferNative: true,
      });

      expect(response).toBeDefined();
      expect(response.id).toBe('test-1');
      expect(response.text).toBeDefined();
    });

    it('should use chat interface', async () => {
      const response = await membrane.chat('Who are you?');
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should track processing statistics', async () => {
      await membrane.chat('Test message 1');
      await membrane.chat('Test message 2');

      const status = membrane.getStatus();
      // Each chat may result in multiple internal requests due to escalation
      expect(status.stats.totalRequests).toBeGreaterThanOrEqual(2);
    });
  });

  describe('status', () => {
    it('should return valid status when not running', () => {
      const status = membrane.getStatus();
      expect(status.running).toBe(false);
      expect(status.instanceName).toBe('TestEcho');
      expect(status.uptime).toBe(0);
    });

    it('should return valid status when running', async () => {
      await membrane.start();
      const status = membrane.getStatus();
      expect(status.running).toBe(true);
      expect(status.uptime).toBeGreaterThanOrEqual(0);
      expect(status.identityState).toBeDefined();
    });
  });

  describe('identity state', () => {
    it('should return identity state', async () => {
      await membrane.start();
      const state = membrane.getIdentityState();
      expect(state).toBeDefined();
      expect(state.energyLevel).toBeDefined();
      expect(state.coherence).toBeDefined();
    });

    it('should allow energy recharge', async () => {
      await membrane.start();
      const initialState = membrane.getIdentityState();
      const initialEnergy = initialState.energyLevel;

      // Consume some energy
      await membrane.chat('Test');
      const afterChat = membrane.getIdentityState();

      // Recharge
      membrane.rechargeEnergy(0.5);
      const afterRecharge = membrane.getIdentityState();

      expect(afterRecharge.energyLevel).toBeGreaterThanOrEqual(afterChat.energyLevel);
    });
  });

  describe('providers', () => {
    it('should return available providers', async () => {
      await membrane.start();
      const providers = membrane.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      // Local provider should always be available
      expect(providers).toContain('local');
    });
  });

  describe('error handling', () => {
    it('should throw error when processing without starting', async () => {
      await expect(
        membrane.process({
          id: 'test-error',
          prompt: 'Test',
          priority: 'normal',
          preferNative: true,
        })
      ).rejects.toThrow('System not running');
    });

    it('should throw error when chatting without starting', async () => {
      await expect(membrane.chat('Test')).rejects.toThrow('System not running');
    });
  });

  describe('coordinator access', () => {
    it('should provide access to coordinator', () => {
      const coordinator = membrane.getCoordinator();
      expect(coordinator).toBeDefined();
    });
  });
});
