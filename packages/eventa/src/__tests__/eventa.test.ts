/**
 * Rigorous E2E Tests for Eventa Event System
 *
 * Tests the type-safe event-driven toolbox:
 * - Event definition and emission
 * - RPC/Invoke pattern
 * - Context lifecycle
 * - Transport adapters
 */
import {
  defineEventa,
  defineInvokeEventa,
  EventContext,
  createContext,
} from '../index.js';
import type { TransportAdapter, WireMessage, Subscription } from '../types.js';

/**
 * In-memory transport adapter for testing
 */
class InMemoryTransport implements TransportAdapter {
  private handlers: Array<(message: WireMessage) => void> = [];
  public sentMessages: WireMessage[] = [];

  send(message: WireMessage): void {
    this.sentMessages.push(message);
  }

  onMessage(handler: (message: WireMessage) => void): Subscription {
    this.handlers.push(handler);
    return {
      unsubscribe: () => {
        const idx = this.handlers.indexOf(handler);
        if (idx >= 0) this.handlers.splice(idx, 1);
      },
    };
  }

  close(): void {
    this.handlers = [];
  }
}

describe('Eventa Event System', () => {
  describe('Event Definitions', () => {
    it('should define events with type-safe IDs', () => {
      const testEvent = defineEventa<{ message: string }>('test.event');
      expect(testEvent.id).toBe('test.event');
    });

    it('should define invoke events with request/response types', () => {
      const testInvoke = defineInvokeEventa<string, { query: string }>('test.invoke');
      expect(testInvoke.id).toBe('test.invoke');
    });

    it('should create unique event IDs when no name given', () => {
      const event1 = defineEventa('event.one');
      const event2 = defineEventa('event.two');
      expect(event1.id).not.toBe(event2.id);
    });

    it('should auto-generate IDs when name is omitted', () => {
      const event = defineEventa();
      expect(event.id).toBeDefined();
      expect(typeof event.id).toBe('string');
    });
  });

  describe('EventContext', () => {
    let context: EventContext;

    beforeEach(() => {
      context = new EventContext({ contextId: 'test-context' });
    });

    afterEach(() => {
      context.close();
    });

    it('should create context with custom ID', () => {
      expect(context).toBeDefined();
    });

    it('should create context via factory function', () => {
      const ctx = createContext({ contextId: 'factory-test' });
      expect(ctx).toBeInstanceOf(EventContext);
      ctx.close();
    });

    it('should subscribe and receive events', () => {
      const testEvent = defineEventa<{ value: number }>('test.value');
      let received: number | null = null;

      context.on(testEvent, (envelope) => {
        received = envelope.body.value;
      });

      context.emit(testEvent, { value: 42 });

      expect(received).toBe(42);
    });

    it('should support multiple subscribers', () => {
      const testEvent = defineEventa<string>('test.multi');
      const received: string[] = [];

      context.on(testEvent, (envelope) => {
        received.push(`sub1:${envelope.body}`);
      });

      context.on(testEvent, (envelope) => {
        received.push(`sub2:${envelope.body}`);
      });

      context.emit(testEvent, 'hello');

      expect(received).toContain('sub1:hello');
      expect(received).toContain('sub2:hello');
    });

    it('should unsubscribe cleanly', () => {
      const testEvent = defineEventa<string>('test.unsub');
      let count = 0;

      const sub = context.on(testEvent, () => {
        count++;
      });

      context.emit(testEvent, 'first');
      expect(count).toBe(1);

      sub.unsubscribe();

      context.emit(testEvent, 'second');
      expect(count).toBe(1); // Should not increment
    });

    it('should include metadata in envelopes', () => {
      const testEvent = defineEventa<string>('test.meta');
      let envelope: any = null;

      context.on(testEvent, (env) => {
        envelope = env;
      });

      context.emit(testEvent, 'test');

      expect(envelope).not.toBeNull();
      expect(envelope.eventId).toBe('test.meta');
      expect(envelope.timestamp).toBeGreaterThan(0);
      expect(envelope.body).toBe('test');
    });

    it('should support once subscription', () => {
      const testEvent = defineEventa<number>('test.once');
      let count = 0;

      context.once(testEvent, () => {
        count++;
      });

      context.emit(testEvent, 1);
      context.emit(testEvent, 2);
      context.emit(testEvent, 3);

      expect(count).toBe(1);
    });
  });

  describe('RPC/Invoke Pattern', () => {
    let context: EventContext;

    beforeEach(() => {
      context = new EventContext({
        contextId: 'rpc-test',
        rpcTimeout: 1000,
      });
    });

    afterEach(() => {
      context.close();
    });

    it('should handle invoke requests and return responses', async () => {
      const greetInvoke = defineInvokeEventa<string, { name: string }>('greet');

      context.registerHandler(greetInvoke, (request) => {
        return `Hello, ${request.name}!`;
      });

      const result = await context.invoke(greetInvoke, { name: 'Echo' });
      expect(result).toBe('Hello, Echo!');
    });

    it('should handle async invoke handlers', async () => {
      const asyncInvoke = defineInvokeEventa<number, number>('async.compute');

      context.registerHandler(asyncInvoke, async (input) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return input * 2;
      });

      const result = await context.invoke(asyncInvoke, 21);
      expect(result).toBe(42);
    });

    it('should propagate errors from invoke handlers', async () => {
      const errorInvoke = defineInvokeEventa<void, void>('error.test');

      context.registerHandler(errorInvoke, () => {
        throw new Error('Handler error');
      });

      await expect(context.invoke(errorInvoke, undefined)).rejects.toThrow('Handler error');
    });

    it('should unregister handlers', async () => {
      const testInvoke = defineInvokeEventa<string, void>('unreg.test');

      const sub = context.registerHandler(testInvoke, () => 'handled');
      const result1 = await context.invoke(testInvoke, undefined);
      expect(result1).toBe('handled');

      sub.unsubscribe();

      // After unregister, invoke should fail (no handler)
      await expect(context.invoke(testInvoke, undefined)).rejects.toThrow();
    });
  });

  describe('Context Lifecycle', () => {
    it('should clean up on close', () => {
      const ctx = new EventContext({ contextId: 'close-test' });
      const testEvent = defineEventa<string>('test.close');
      let count = 0;

      ctx.on(testEvent, () => { count++; });
      ctx.emit(testEvent, 'before-close');
      expect(count).toBe(1);

      ctx.close();

      // After close, events should not be received
      ctx.emit(testEvent, 'after-close');
      expect(count).toBe(1);
    });

    it('should cancel pending RPC calls on close', async () => {
      const ctx = new EventContext({ contextId: 'cancel-test', rpcTimeout: 5000 });
      const slowInvoke = defineInvokeEventa<string, void>('slow');

      // Don't register a handler, so it will pend
      const promise = ctx.invoke(slowInvoke, undefined);
      ctx.close();

      await expect(promise).rejects.toThrow();
    });
  });

  describe('Transport Adapters', () => {
    it('should send events through transport', () => {
      const transport = new InMemoryTransport();
      const ctx = new EventContext({ contextId: 'transport-test' });

      ctx.attachTransport(transport);

      const testEvent = defineEventa<string>('test.transport');
      ctx.emit(testEvent, 'transported');

      expect(transport.sentMessages.length).toBeGreaterThan(0);
      expect(transport.sentMessages[0].eventId).toBe('test.transport');
      expect(transport.sentMessages[0].type).toBe('event');

      ctx.close();
    });

    it('should detach transport on unsubscribe', () => {
      const transport = new InMemoryTransport();
      const ctx = new EventContext({ contextId: 'detach-test' });

      const sub = ctx.attachTransport(transport);
      sub.unsubscribe();

      const testEvent = defineEventa<string>('test.detach');
      ctx.emit(testEvent, 'should-not-transport');

      // No messages should be sent after detach
      expect(transport.sentMessages.length).toBe(0);

      ctx.close();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple event types on same context', () => {
      const ctx = new EventContext({ contextId: 'multi-type' });
      const eventA = defineEventa<number>('type.a');
      const eventB = defineEventa<string>('type.b');
      const results: any[] = [];

      ctx.on(eventA, (env) => { results.push({ type: 'a', value: env.body }); });
      ctx.on(eventB, (env) => { results.push({ type: 'b', value: env.body }); });

      ctx.emit(eventA, 42);
      ctx.emit(eventB, 'hello');
      ctx.emit(eventA, 99);

      expect(results).toEqual([
        { type: 'a', value: 42 },
        { type: 'b', value: 'hello' },
        { type: 'a', value: 99 },
      ]);

      ctx.close();
    });

    it('should handle rapid-fire events', () => {
      const ctx = new EventContext({ contextId: 'rapid-fire' });
      const event = defineEventa<number>('rapid');
      let count = 0;

      ctx.on(event, () => { count++; });

      for (let i = 0; i < 1000; i++) {
        ctx.emit(event, i);
      }

      expect(count).toBe(1000);
      ctx.close();
    });
  });
});
