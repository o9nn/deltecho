/**
 * Unit tests for ConnectorRegistry
 * Tests the AI platform connector management system
 */

import { ConnectorRegistry } from '../ConnectorRegistry.js';

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    registry = new ConnectorRegistry();
  });

  describe('initialization', () => {
    it('should create an empty registry', () => {
      expect(registry).toBeDefined();
      expect(registry.getConnectors()).toEqual([]);
    });
  });

  describe('connector registration', () => {
    it('should register a connector', () => {
      const connector = {
        id: 'test-connector',
        name: 'Test Connector',
        type: 'llm' as const,
        connect: jest.fn(),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      registry.register(connector);
      const connectors = registry.getConnectors();

      expect(connectors.length).toBe(1);
      expect(connectors[0].id).toBe('test-connector');
    });

    it('should register multiple connectors', () => {
      const connectors = [
        {
          id: 'connector-1',
          name: 'Connector 1',
          type: 'llm' as const,
          connect: jest.fn(),
          disconnect: jest.fn(),
          sendMessage: jest.fn(),
          isConnected: jest.fn().mockReturnValue(false),
        },
        {
          id: 'connector-2',
          name: 'Connector 2',
          type: 'llm' as const,
          connect: jest.fn(),
          disconnect: jest.fn(),
          sendMessage: jest.fn(),
          isConnected: jest.fn().mockReturnValue(false),
        },
      ];

      connectors.forEach((c) => registry.register(c));

      expect(registry.getConnectors().length).toBe(2);
    });

    it('should replace connector with same id', () => {
      const connector1 = {
        id: 'same-id',
        name: 'Original',
        type: 'llm' as const,
        connect: jest.fn(),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      const connector2 = {
        id: 'same-id',
        name: 'Replacement',
        type: 'llm' as const,
        connect: jest.fn(),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      registry.register(connector1);
      registry.register(connector2);

      const connectors = registry.getConnectors();
      expect(connectors.length).toBe(1);
      expect(connectors[0].name).toBe('Replacement');
    });
  });

  describe('connector retrieval', () => {
    beforeEach(() => {
      const connectors = [
        {
          id: 'openai',
          name: 'OpenAI',
          type: 'llm' as const,
          connect: jest.fn(),
          disconnect: jest.fn(),
          sendMessage: jest.fn(),
          isConnected: jest.fn().mockReturnValue(true),
        },
        {
          id: 'claude',
          name: 'Claude',
          type: 'llm' as const,
          connect: jest.fn(),
          disconnect: jest.fn(),
          sendMessage: jest.fn(),
          isConnected: jest.fn().mockReturnValue(false),
        },
      ];
      connectors.forEach((c) => registry.register(c));
    });

    it('should get connector by id', () => {
      const connector = registry.getConnector('openai');

      expect(connector).toBeDefined();
      expect(connector?.name).toBe('OpenAI');
    });

    it('should return undefined for non-existent id', () => {
      const connector = registry.getConnector('non-existent');

      expect(connector).toBeUndefined();
    });

    it('should get all connectors', () => {
      const connectors = registry.getConnectors();

      expect(connectors.length).toBe(2);
    });

    it('should get connected connectors', () => {
      const connected = registry.getConnectedConnectors();

      expect(connected.length).toBe(1);
      expect(connected[0].id).toBe('openai');
    });
  });

  describe('connector removal', () => {
    it('should remove a connector', () => {
      const connector = {
        id: 'to-remove',
        name: 'To Remove',
        type: 'llm' as const,
        connect: jest.fn(),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      registry.register(connector);
      expect(registry.getConnectors().length).toBe(1);

      registry.unregister('to-remove');
      expect(registry.getConnectors().length).toBe(0);
    });

    it('should do nothing when removing non-existent connector', () => {
      registry.unregister('non-existent');
      expect(registry.getConnectors().length).toBe(0);
    });
  });

  describe('connector lifecycle', () => {
    it('should connect all connectors', async () => {
      const connector1 = {
        id: 'c1',
        name: 'C1',
        type: 'llm' as const,
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      const connector2 = {
        id: 'c2',
        name: 'C2',
        type: 'llm' as const,
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      registry.register(connector1);
      registry.register(connector2);

      await registry.connectAll();

      expect(connector1.connect).toHaveBeenCalled();
      expect(connector2.connect).toHaveBeenCalled();
    });

    it('should disconnect all connectors', async () => {
      const connector = {
        id: 'c1',
        name: 'C1',
        type: 'llm' as const,
        connect: jest.fn(),
        disconnect: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true),
      };

      registry.register(connector);
      await registry.disconnectAll();

      expect(connector.disconnect).toHaveBeenCalled();
    });

    it('should handle connection failures gracefully', async () => {
      const failingConnector = {
        id: 'failing',
        name: 'Failing',
        type: 'llm' as const,
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      registry.register(failingConnector);

      // Should not throw
      await expect(registry.connectAll()).resolves.not.toThrow();
    });
  });

  describe('message routing', () => {
    it('should send message through specific connector', async () => {
      const connector = {
        id: 'router',
        name: 'Router',
        type: 'llm' as const,
        connect: jest.fn(),
        disconnect: jest.fn(),
        sendMessage: jest.fn().mockResolvedValue({ content: 'Response' }),
        isConnected: jest.fn().mockReturnValue(true),
      };

      registry.register(connector);

      const response = await registry.sendMessage('router', 'Hello');

      expect(connector.sendMessage).toHaveBeenCalledWith('Hello');
      expect(response).toEqual({ content: 'Response' });
    });

    it('should throw for non-existent connector', async () => {
      await expect(registry.sendMessage('non-existent', 'Hello')).rejects.toThrow();
    });

    it('should throw for disconnected connector', async () => {
      const connector = {
        id: 'disconnected',
        name: 'Disconnected',
        type: 'llm' as const,
        connect: jest.fn(),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      registry.register(connector);

      await expect(registry.sendMessage('disconnected', 'Hello')).rejects.toThrow();
    });
  });

  describe('events', () => {
    it('should emit connector registered event', () => {
      const listener = jest.fn();
      registry.on('connectorRegistered', listener);

      const connector = {
        id: 'new',
        name: 'New',
        type: 'llm' as const,
        connect: jest.fn(),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      registry.register(connector);

      expect(listener).toHaveBeenCalledWith({ connector });
    });

    it('should emit connector unregistered event', () => {
      const listener = jest.fn();
      registry.on('connectorUnregistered', listener);

      const connector = {
        id: 'to-remove',
        name: 'To Remove',
        type: 'llm' as const,
        connect: jest.fn(),
        disconnect: jest.fn(),
        sendMessage: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
      };

      registry.register(connector);
      registry.unregister('to-remove');

      expect(listener).toHaveBeenCalledWith({ connectorId: 'to-remove' });
    });
  });
});
