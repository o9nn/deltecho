/**
 * Unit tests for ConnectorRegistry
 * Tests the AI platform connector management system.
 *
 * ConnectorRegistry is a singleton (private constructor) whose connectors are
 * created from configurations via createConnector() and removed via
 * removeConnector(). These tests exercise that API against the in-memory
 * runtime provided by @deltecho/shared.
 */

import { ConnectorRegistry, ConnectorRegistryEvent } from '../ConnectorRegistry.js';
import { AICapability, AIConnectorConfig } from '../connectors/BaseConnector.js';

const makeConfig = (id: string, name: string, type = 'deep-tree-echo'): AIConnectorConfig => ({
  id,
  name,
  type,
  capabilities: [AICapability.TEXT_GENERATION],
  personalityTraits: { curiosity: 0.8, empathy: 0.7 },
});

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;
  const createdIds: string[] = [];

  const createConnector = async (config: AIConnectorConfig) => {
    const connector = await registry.createConnector(config);
    createdIds.push(config.id);
    return connector;
  };

  beforeAll(async () => {
    registry = ConnectorRegistry.getInstance();
    await registry.initialize();
  });

  afterEach(async () => {
    // Remove connectors created during the test to keep the singleton clean
    while (createdIds.length > 0) {
      const id = createdIds.pop();
      if (id) await registry.removeConnector(id);
    }
  });

  describe('initialization', () => {
    it('should expose a singleton instance', () => {
      expect(registry).toBeDefined();
      expect(ConnectorRegistry.getInstance()).toBe(registry);
    });

    it('should start with no connectors', () => {
      expect(registry.getAllConnectors()).toEqual([]);
    });
  });

  describe('connector creation', () => {
    it('should create a connector from a configuration', async () => {
      const connector = await createConnector(makeConfig('test-connector', 'Test Connector'));

      expect(connector).toBeDefined();
      expect(registry.getAllConnectors().length).toBe(1);
      expect(registry.getConnector('test-connector')).toBe(connector);
    });

    it('should create multiple connectors', async () => {
      await createConnector(makeConfig('connector-1', 'Connector 1'));
      await createConnector(makeConfig('connector-2', 'Connector 2'));

      expect(registry.getAllConnectors().length).toBe(2);
    });

    it('should reject a duplicate connector id', async () => {
      await createConnector(makeConfig('same-id', 'Original'));

      await expect(registry.createConnector(makeConfig('same-id', 'Replacement'))).rejects.toThrow(
        /already exists/
      );
    });

    it('should reject an unknown connector type', async () => {
      await expect(
        registry.createConnector(makeConfig('bad-type', 'Bad Type', 'not-a-real-type'))
      ).rejects.toThrow(/Unknown connector type/);
    });
  });

  describe('connector retrieval', () => {
    it('should get connector by id', async () => {
      const connector = await createConnector(makeConfig('openai', 'OpenAI'));

      expect(registry.getConnector('openai')).toBe(connector);
    });

    it('should return undefined for non-existent id', () => {
      expect(registry.getConnector('non-existent')).toBeUndefined();
    });

    it('should report connector info including offline status', async () => {
      await createConnector(makeConfig('info-connector', 'Info Connector'));

      const infos = await registry.getConnectorInfos();
      const info = infos.find((i) => i.id === 'info-connector');

      expect(info).toBeDefined();
      expect(info?.name).toBe('Info Connector');
      expect(info?.type).toBe('deep-tree-echo');
      expect(info?.status).toBe('offline');
      expect(info?.conversationCount).toBe(0);
    });
  });

  describe('connector updates', () => {
    it('should update a connector configuration', async () => {
      await createConnector(makeConfig('to-update', 'Before Update'));

      await registry.updateConnector('to-update', { name: 'After Update' });

      const infos = await registry.getConnectorInfos();
      const info = infos.find((i) => i.id === 'to-update');
      expect(info?.name).toBe('After Update');
    });

    it('should reject updates for unknown connectors', async () => {
      await expect(registry.updateConnector('non-existent', { name: 'Nope' })).rejects.toThrow(
        /not found/
      );
    });
  });

  describe('connector removal', () => {
    it('should remove a connector', async () => {
      await createConnector(makeConfig('to-remove', 'To Remove'));
      expect(registry.getAllConnectors().length).toBe(1);

      const removed = await registry.removeConnector('to-remove');

      expect(removed).toBe(true);
      expect(registry.getConnector('to-remove')).toBeUndefined();
      expect(registry.getAllConnectors().length).toBe(0);
    });

    it('should return false when removing a non-existent connector', async () => {
      const removed = await registry.removeConnector('non-existent');

      expect(removed).toBe(false);
    });
  });

  describe('message routing', () => {
    it('should reject sending through a non-existent connector', async () => {
      await expect(registry.sendMessage('non-existent', 'conv-1', 'Hello')).rejects.toThrow(
        /not found/
      );
    });
  });

  describe('events', () => {
    it('should emit an event when a connector is added', async () => {
      const listener = jest.fn();
      registry.on(ConnectorRegistryEvent.CONNECTOR_ADDED, listener);

      await createConnector(makeConfig('event-add', 'Event Add'));

      expect(listener).toHaveBeenCalledWith({
        id: 'event-add',
        type: 'deep-tree-echo',
        name: 'Event Add',
      });

      registry.off(ConnectorRegistryEvent.CONNECTOR_ADDED, listener);
    });

    it('should emit an event when a connector is removed', async () => {
      const listener = jest.fn();
      registry.on(ConnectorRegistryEvent.CONNECTOR_REMOVED, listener);

      await createConnector(makeConfig('event-remove', 'Event Remove'));
      await registry.removeConnector('event-remove');
      createdIds.pop();

      expect(listener).toHaveBeenCalledWith({ id: 'event-remove' });

      registry.off(ConnectorRegistryEvent.CONNECTOR_REMOVED, listener);
    });
  });
});
