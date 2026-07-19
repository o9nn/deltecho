/**
 * Tests for the Entelechy Integration
 *
 * Validates the start/stop lifecycle (timers cleared), processMessage result
 * shape, snapshot construction, disabled-subsystem fallbacks, event
 * forwarding, scientific-insight coupling, and serialize/restore symmetry.
 */

import { describe, it, expect, afterEach, jest } from '@jest/globals';
import {
  EntelechyIntegration,
  EntelechyIntegrationConfig,
} from '../entelechy-integration.js';
import { entelechyEngine } from 'deep-tree-echo-core';

describe('EntelechyIntegration', () => {
  let integration: EntelechyIntegration;

  const testConfig: Partial<EntelechyIntegrationConfig> = {
    backgroundTickInterval: 50,
  };

  afterEach(async () => {
    if (integration) {
      await integration.stop();
    }
  });

  describe('constructor', () => {
    it('creates the integration with provided config', () => {
      integration = new EntelechyIntegration(testConfig);
      expect(integration).toBeDefined();
      expect(integration.isRunning()).toBe(false);
    });

    it('creates the integration with default config', () => {
      integration = new EntelechyIntegration();
      expect(integration).toBeDefined();
      expect(integration.isRunning()).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('starts and stops cleanly', async () => {
      integration = new EntelechyIntegration(testConfig);

      await integration.start();
      expect(integration.isRunning()).toBe(true);

      await integration.stop();
      expect(integration.isRunning()).toBe(false);
    });

    it('emits started and stopped events', async () => {
      integration = new EntelechyIntegration(testConfig);
      const events: string[] = [];
      integration.on('started', () => events.push('started'));
      integration.on('stopped', () => events.push('stopped'));

      await integration.start();
      await integration.stop();

      expect(events).toEqual(['started', 'stopped']);
    });

    it('is idempotent for repeated start/stop calls', async () => {
      integration = new EntelechyIntegration(testConfig);

      await integration.start();
      await integration.start(); // no-op
      expect(integration.isRunning()).toBe(true);

      await integration.stop();
      await integration.stop(); // no-op
      expect(integration.isRunning()).toBe(false);
    });

    it('runs background ticks without throwing', async () => {
      integration = new EntelechyIntegration(testConfig);
      await integration.start();

      // Let a few background ticks fire
      await new Promise((resolve) => setTimeout(resolve, 200));

      const snapshot = integration.getLastSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.tickCount).toBeGreaterThan(0);
    });
  });

  describe('processMessage', () => {
    it('returns the full processing result shape', async () => {
      integration = new EntelechyIntegration(testConfig);
      await integration.start();

      const result = await integration.processMessage('Hello, are you aware?');

      expect(typeof result.response).toBe('string');
      expect(typeof result.wasEntelechial).toBe('boolean');
      expect(typeof result.emergenceLevel).toBe('string');
      expect(typeof result.narrative).toBe('string');
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.timestamp).toBeGreaterThan(0);
    });

    it('emits message-processed events', async () => {
      integration = new EntelechyIntegration(testConfig);
      await integration.start();

      const handler = jest.fn();
      integration.on('message-processed', handler);

      await integration.processMessage('test message');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('snapshots and disabled-subsystem fallbacks', () => {
    it('populates all subsystem fields when enabled', async () => {
      integration = new EntelechyIntegration(testConfig);
      await integration.start();

      const snapshot = integration.takeSnapshot();
      expect(snapshot.reservoir).not.toBeNull();
      expect(snapshot.echoBeats).not.toBeNull();
      expect(snapshot.consciousness).not.toBeNull();
      expect(snapshot.entelechy).not.toBeNull();
    });

    it('nulls out disabled subsystems in the snapshot', async () => {
      integration = new EntelechyIntegration({
        ...testConfig,
        enableReservoir: false,
        enableEchoBeats: false,
        enableConsciousness: false,
        enableEntelechy: false,
      });
      await integration.start();

      const snapshot = integration.takeSnapshot();
      expect(snapshot.reservoir).toBeNull();
      expect(snapshot.autognosis).toBeNull();
      expect(snapshot.echoBeats).toBeNull();
      expect(snapshot.consciousness).toBeNull();
      expect(snapshot.entelechy).toBeNull();
    });

    it('still processes messages with all subsystems disabled', async () => {
      integration = new EntelechyIntegration({
        ...testConfig,
        enableReservoir: false,
        enableEchoBeats: false,
        enableConsciousness: false,
        enableEntelechy: false,
        enableScientificGenius: false,
      });
      await integration.start();

      const result = await integration.processMessage('fallback message');
      expect(result.response).toBe('fallback message');
      expect(result.emergenceLevel).toBe('latent');
      expect(result.wasEntelechial).toBe(false);
    });
  });

  describe('event forwarding', () => {
    it('forwards entelechy engine events while running', async () => {
      integration = new EntelechyIntegration(testConfig);
      await integration.start();

      const realized = jest.fn();
      const detected = jest.fn();
      integration.on('entelechy-realized', realized);
      integration.on('pattern-detected', detected);

      entelechyEngine.emit('entelechy-realized', { level: 'entelechial' });
      entelechyEngine.emit('pattern-detected', 'test-pattern');

      expect(realized).toHaveBeenCalledTimes(1);
      expect(detected).toHaveBeenCalledWith('test-pattern');
    });

    it('detaches engine event forwarders on stop', async () => {
      integration = new EntelechyIntegration(testConfig);
      await integration.start();

      const detected = jest.fn();
      integration.on('pattern-detected', detected);

      await integration.stop();
      entelechyEngine.emit('pattern-detected', 'after-stop');

      expect(detected).not.toHaveBeenCalled();
    });
  });

  describe('scientific insight coupling', () => {
    it('returns the fallback when scientific genius is disabled', () => {
      integration = new EntelechyIntegration({
        ...testConfig,
        enableScientificGenius: false,
      });
      const insight = (integration as any).computeScientificInsight(0.3);
      expect(insight).toBe(0.3);
    });

    it('derives a bounded live signal with the fallback as floor', () => {
      integration = new EntelechyIntegration({
        ...testConfig,
        enableScientificGenius: true,
      });
      const insight = (integration as any).computeScientificInsight(0.6);
      expect(insight).toBeGreaterThanOrEqual(0.6);
      expect(insight).toBeLessThanOrEqual(1);
    });
  });

  describe('persistence', () => {
    it('serializes state including tick count, reservoir, and entelechy', async () => {
      integration = new EntelechyIntegration(testConfig);
      await integration.start();
      await integration.processMessage('persist me');

      const serialized: any = integration.serialize();
      expect(serialized.config).toBeDefined();
      expect(typeof serialized.tickCount).toBe('number');
      expect(serialized.reservoir).toBeDefined();
      expect(serialized.entelechy).toBeDefined();
    });

    it('restores serialized state symmetric with serialize', async () => {
      integration = new EntelechyIntegration(testConfig);
      await integration.start();
      await integration.processMessage('build some state');
      await integration.stop();

      const serialized: any = integration.serialize();
      serialized.tickCount = 42;

      const restored = new EntelechyIntegration(testConfig);
      restored.restore(serialized);

      const restoredState: any = restored.serialize();
      expect(restoredState.tickCount).toBe(42);
    });

    it('ignores empty restore payloads', () => {
      integration = new EntelechyIntegration(testConfig);
      expect(() => integration.restore(null)).not.toThrow();
      expect(() => integration.restore(undefined)).not.toThrow();
    });
  });

  describe('describeState', () => {
    it('produces a human-readable state description', async () => {
      integration = new EntelechyIntegration(testConfig);
      await integration.start();
      await integration.processMessage('describe yourself');

      const description = integration.describeState();
      expect(typeof description).toBe('string');
      expect(description).toContain('Entelechy:');
    });
  });
});
