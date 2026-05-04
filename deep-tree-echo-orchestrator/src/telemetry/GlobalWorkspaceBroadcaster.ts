/**
 * @fileoverview Global Workspace Broadcaster
 *
 * Implements Global Workspace Theory for the Deep Tree Echo orchestrator.
 *
 * At moments of highest inter-channel coherence (Sys6 synchronization events),
 * this broadcaster captures the full joint cognitive state and makes it
 * simultaneously available to all subscribers:
 *
 *   - Desktop apps via IPC
 *   - Monitoring dashboards via webhooks
 *   - The telemetry subsystem for metric collection
 *   - Any registered custom listener
 *
 * This is the architectural realisation of "the 42 synchronization events" per
 * 30-step Sys6 cycle described in the Dove9 architecture: each time two or more
 * channels align, consciousness briefly becomes globally available.
 */

import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';
import type { SynchronizationEvent } from '../sys6-bridge/Sys6OrchestratorBridge.js';

const log = getLogger('deep-tree-echo-orchestrator/GlobalWorkspaceBroadcaster');
import type { TelemetrySnapshot } from './TelemetryMonitor.js';

/** Process-unique prefix to avoid cross-restart ID collisions */
const INSTANCE_PREFIX = Math.random().toString(36).slice(2, 7);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Snapshot of the full joint cognitive state at a synchronization event.
 * Every subscriber receives exactly this payload.
 */
export interface GlobalWorkspaceSnapshot {
  /** Identifier for this broadcast */
  broadcastId: string;
  /** Unix timestamp (ms) */
  timestamp: number;
  /** The synchronization event that triggered this broadcast */
  syncEvent: SynchronizationEvent;
  /** Telemetry snapshot from the monitoring subsystem (may be null if not available) */
  telemetry: TelemetrySnapshot | null;
  /** Dove9 cognitive state at this moment */
  dove9: Dove9CognitiveState | null;
  /** Sys6 stream saliences at this moment (streams 1, 2, 3) */
  streamSaliences: [number, number, number];
  /** Grand-cycle information when applicable */
  grandCycle: GrandCycleInfo | null;
}

/** Dove9 cognitive state summary included in each broadcast */
export interface Dove9CognitiveState {
  running: boolean;
  activeProcessCount: number;
  mailProtocolEnabled: boolean;
  triadic: {
    currentStep: number;
    cycleNumber: number;
    streamCount: number;
  } | null;
}

/** Grand-cycle convergence info (present only at LCM(30,12)=60 boundaries) */
export interface GrandCycleInfo {
  grandCycleNumber: number;
  dove9CyclesCompleted: number;
  sys6CyclesCompleted: number;
}

/**
 * A function that can be registered as a snapshot subscriber.
 */
export type SnapshotSubscriber = (snapshot: GlobalWorkspaceSnapshot) => void | Promise<void>;

// ---------------------------------------------------------------------------
// GlobalWorkspaceBroadcaster
// ---------------------------------------------------------------------------

/**
 * GlobalWorkspaceBroadcaster
 *
 * Listens for synchronization events from the Sys6 bridge and fan-outs
 * a GlobalWorkspaceSnapshot to all registered subscribers.
 *
 * Usage:
 *
 * ```ts
 * const gwb = new GlobalWorkspaceBroadcaster();
 * gwb.addSubscriber(snapshot => ipcServer.broadcast('gw_snapshot', snapshot));
 * gwb.addSubscriber(snapshot => webhookServer.notify('gw_snapshot', snapshot));
 *
 * // Wire to Sys6 bridge
 * sys6Bridge.on('sync_event', (evt) => gwb.onSynchronizationEvent(evt, getState));
 * ```
 */
export class GlobalWorkspaceBroadcaster extends EventEmitter {
  private subscribers: SnapshotSubscriber[] = [];
  private broadcastCount = 0;
  private lastSnapshot: GlobalWorkspaceSnapshot | null = null;

  /**
   * Register a subscriber that will be called for every broadcast.
   */
  public addSubscriber(fn: SnapshotSubscriber): void {
    this.subscribers.push(fn);
  }

  /**
   * Remove a previously registered subscriber.
   */
  public removeSubscriber(fn: SnapshotSubscriber): void {
    this.subscribers = this.subscribers.filter((s) => s !== fn);
  }

  /**
   * Handle a synchronization event from the Sys6 bridge.
   *
   * @param syncEvent  The synchronization event
   * @param getState   A function returning the current cognitive state (called synchronously)
   */
  public async onSynchronizationEvent(
    syncEvent: SynchronizationEvent,
    getState: () => {
      telemetry: TelemetrySnapshot | null;
      dove9: Dove9CognitiveState | null;
      grandCycle: GrandCycleInfo | null;
    }
  ): Promise<void> {
    const state = getState();

    this.broadcastCount++;
    const snapshot: GlobalWorkspaceSnapshot = {
      broadcastId: `gws-${INSTANCE_PREFIX}-${this.broadcastCount}`,
      timestamp: syncEvent.timestamp,
      syncEvent,
      telemetry: state.telemetry,
      dove9: state.dove9,
      streamSaliences: syncEvent.streamSaliences,
      grandCycle: state.grandCycle,
    };

    this.lastSnapshot = snapshot;

    log.debug(
      `Broadcasting global workspace snapshot #${this.broadcastCount} ` +
        `(channels: ${syncEvent.alignedChannels.join('+')}, ` +
        `pairs: ${syncEvent.channelPairCount})`
    );

    // Fan-out to all subscribers concurrently. Wrap each call in a
    // try/catch so synchronous throws are also isolated — a failing subscriber
    // must never block the others.
    const promises = this.subscribers.map((fn) => {
      try {
        return Promise.resolve(fn(snapshot)).catch((err: unknown) => {
          log.warn('Global workspace subscriber threw an error', { error: err });
        });
      } catch (err) {
        log.warn('Global workspace subscriber threw synchronously', { error: err });
        return Promise.resolve();
      }
    });

    await Promise.all(promises);

    // Emit event so the orchestrator (and tests) can observe the broadcast
    this.emit('broadcast', snapshot);
  }

  /**
   * Get the most recent snapshot, or null if no broadcast has occurred yet.
   */
  public getLastSnapshot(): GlobalWorkspaceSnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Total number of broadcasts since instantiation.
   */
  public getBroadcastCount(): number {
    return this.broadcastCount;
  }

  /**
   * Remove all subscribers.
   */
  public clearSubscribers(): void {
    this.subscribers = [];
  }
}
