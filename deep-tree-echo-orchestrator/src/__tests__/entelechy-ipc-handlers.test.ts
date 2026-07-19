/**
 * Tests for the Entelechy IPC handlers
 *
 * Validates that registerEntelechyHandlers exposes the entelechy emergence
 * state over IPC (entelechy_get_state) so desktop apps can query and
 * visualize emergence level, score, and narrative.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  registerEntelechyHandlers,
  type EntelechyHandlerDependency,
} from '../ipc/cognitive-handlers.js';
import type { IPCServer } from '../ipc/server.js';

type Handler = (payload?: any) => Promise<any>;

function createFakeIpcServer() {
  const handlers = new Map<string, Handler>();
  const server = {
    registerHandler: jest.fn((type: string, handler: Handler) => {
      handlers.set(type, handler);
    }),
  } as unknown as IPCServer;
  return { server, handlers };
}

describe('registerEntelechyHandlers', () => {
  let fake: ReturnType<typeof createFakeIpcServer>;

  const snapshot = {
    entelechy: {
      level: 'Coherent',
      score: 0.42,
      narrative: 'Patterns are cohering.',
    },
    timestamp: 12345,
    tickCount: 7,
  };

  const makeIntegration = (
    overrides: Partial<EntelechyHandlerDependency> = {},
  ): EntelechyHandlerDependency => ({
    isRunning: () => true,
    takeSnapshot: () => snapshot,
    getLastSnapshot: () => snapshot,
    describeState: () => 'Emergence level: Coherent',
    ...overrides,
  });

  beforeEach(() => {
    fake = createFakeIpcServer();
  });

  it('registers the entelechy_get_state handler', () => {
    registerEntelechyHandlers(fake.server, makeIntegration());

    expect(fake.handlers.has('entelechy_get_state')).toBe(true);
  });

  it('returns running state, snapshot, entelechy state, and description', async () => {
    registerEntelechyHandlers(fake.server, makeIntegration());

    const result = await fake.handlers.get('entelechy_get_state')!();

    expect(result.running).toBe(true);
    expect(result.snapshot).toEqual(snapshot);
    expect(result.entelechy).toEqual(snapshot.entelechy);
    expect(result.description).toBe('Emergence level: Coherent');
  });

  it('falls back to takeSnapshot when no last snapshot is cached', async () => {
    const takeSnapshot = jest.fn(() => snapshot);
    registerEntelechyHandlers(
      fake.server,
      makeIntegration({ getLastSnapshot: () => null, takeSnapshot }),
    );

    const result = await fake.handlers.get('entelechy_get_state')!();

    expect(takeSnapshot).toHaveBeenCalled();
    expect(result.entelechy).toEqual(snapshot.entelechy);
  });

  it('returns null entelechy when the snapshot has no entelechy state', async () => {
    registerEntelechyHandlers(
      fake.server,
      makeIntegration({
        isRunning: () => false,
        getLastSnapshot: () => null,
        takeSnapshot: () => ({ entelechy: null, timestamp: 0, tickCount: 0 }),
      }),
    );

    const result = await fake.handlers.get('entelechy_get_state')!();

    expect(result.running).toBe(false);
    expect(result.entelechy).toBeNull();
  });
});
