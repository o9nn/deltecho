/**
 * @fileoverview Tests for GlobalWorkspaceBroadcaster
 *
 * Validates the Global Workspace Theory implementation:
 * - Synchronization event handling
 * - Fan-out to subscribers
 * - Snapshot structure
 * - Error isolation (a failing subscriber must not block others)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  GlobalWorkspaceBroadcaster,
  type GlobalWorkspaceSnapshot,
  type Dove9CognitiveState,
  type SnapshotSubscriber,
} from '../telemetry/GlobalWorkspaceBroadcaster.js';
import type { SynchronizationEvent } from '../sys6-bridge/Sys6OrchestratorBridge.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSyncEvent(
  step = 12,
  alignedChannels: SynchronizationEvent['alignedChannels'] = ['dyadic', 'triadic', 'pentadic']
): SynchronizationEvent {
  return {
    step,
    cycleStep: ((step - 1) % 30) + 1,
    cycleNumber: 1,
    alignedChannels,
    channelPairCount: (alignedChannels.length * (alignedChannels.length - 1)) / 2,
    streamSaliences: [0.8, 0.6, 0.4],
    timestamp: Date.now(),
  };
}

function makeState(
  dove9: Dove9CognitiveState | null = null
): Parameters<GlobalWorkspaceBroadcaster['onSynchronizationEvent']>[1] {
  return () => ({
    telemetry: null,
    dove9,
    grandCycle: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GlobalWorkspaceBroadcaster', () => {
  let broadcaster: GlobalWorkspaceBroadcaster;

  beforeEach(() => {
    broadcaster = new GlobalWorkspaceBroadcaster();
  });

  describe('initial state', () => {
    it('starts with zero broadcast count', () => {
      expect(broadcaster.getBroadcastCount()).toBe(0);
    });

    it('starts with null last snapshot', () => {
      expect(broadcaster.getLastSnapshot()).toBeNull();
    });
  });

  describe('onSynchronizationEvent', () => {
    it('increments the broadcast count', async () => {
      await broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState());
      expect(broadcaster.getBroadcastCount()).toBe(1);

      await broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState());
      expect(broadcaster.getBroadcastCount()).toBe(2);
    });

    it('updates lastSnapshot', async () => {
      const syncEvent = makeSyncEvent(6, ['dyadic', 'triadic']);
      await broadcaster.onSynchronizationEvent(syncEvent, makeState());

      const snapshot = broadcaster.getLastSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot?.syncEvent).toBe(syncEvent);
    });

    it('calls registered subscribers with the snapshot', async () => {
      const subscriber = jest.fn<SnapshotSubscriber>();
      broadcaster.addSubscriber(subscriber);

      const syncEvent = makeSyncEvent();
      await broadcaster.onSynchronizationEvent(syncEvent, makeState());

      expect(subscriber).toHaveBeenCalledTimes(1);
      const received = (subscriber.mock.calls[0] as [GlobalWorkspaceSnapshot])[0];
      expect(received.syncEvent).toBe(syncEvent);
    });

    it('calls all subscribers', async () => {
      const sub1 = jest.fn<SnapshotSubscriber>();
      const sub2 = jest.fn<SnapshotSubscriber>();
      broadcaster.addSubscriber(sub1);
      broadcaster.addSubscriber(sub2);

      await broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState());

      expect(sub1).toHaveBeenCalledTimes(1);
      expect(sub2).toHaveBeenCalledTimes(1);
    });

    it('includes dove9 state in the snapshot', async () => {
      const dove9: Dove9CognitiveState = {
        running: true,
        activeProcessCount: 3,
        mailProtocolEnabled: true,
        triadic: { currentStep: 5, cycleNumber: 2, streamCount: 3 },
      };
      await broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState(dove9));

      const snapshot = broadcaster.getLastSnapshot();
      expect(snapshot?.dove9).toEqual(dove9);
    });

    it('includes stream saliences from the sync event', async () => {
      const syncEvent = makeSyncEvent();
      await broadcaster.onSynchronizationEvent(syncEvent, makeState());

      const snapshot = broadcaster.getLastSnapshot();
      expect(snapshot?.streamSaliences).toEqual([0.8, 0.6, 0.4]);
    });

    it('emits a "broadcast" event', async () => {
      const listener = jest.fn();
      broadcaster.on('broadcast', listener);

      await broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState());
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('isolates a failing subscriber so others still run', async () => {
      const failingSub = jest.fn<SnapshotSubscriber>().mockImplementation(() => {
        throw new Error('subscriber failure');
      });
      const goodSub = jest.fn<SnapshotSubscriber>();

      broadcaster.addSubscriber(failingSub);
      broadcaster.addSubscriber(goodSub);

      // Should not throw
      await expect(
        broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState())
      ).resolves.not.toThrow();

      expect(failingSub).toHaveBeenCalledTimes(1);
      expect(goodSub).toHaveBeenCalledTimes(1);
    });

    it('generates a unique broadcastId for each call', async () => {
      await broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState());
      const id1 = broadcaster.getLastSnapshot()?.broadcastId;

      await broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState());
      const id2 = broadcaster.getLastSnapshot()?.broadcastId;

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });

  describe('removeSubscriber', () => {
    it('prevents removed subscriber from being called', async () => {
      const sub = jest.fn<SnapshotSubscriber>();
      broadcaster.addSubscriber(sub);
      broadcaster.removeSubscriber(sub);

      await broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState());
      expect(sub).not.toHaveBeenCalled();
    });
  });

  describe('clearSubscribers', () => {
    it('removes all subscribers', async () => {
      const sub1 = jest.fn<SnapshotSubscriber>();
      const sub2 = jest.fn<SnapshotSubscriber>();
      broadcaster.addSubscriber(sub1);
      broadcaster.addSubscriber(sub2);
      broadcaster.clearSubscribers();

      await broadcaster.onSynchronizationEvent(makeSyncEvent(), makeState());
      expect(sub1).not.toHaveBeenCalled();
      expect(sub2).not.toHaveBeenCalled();
    });
  });
});
