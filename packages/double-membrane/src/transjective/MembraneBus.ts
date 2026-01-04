/**
 * MembraneBus - Append-Only Event Log for Membrane Communication
 *
 * The MembraneBus is the central communication channel for the double membrane
 * architecture. It implements an append-only event log that ensures:
 *
 * - All crossings are recorded with full provenance
 * - Events are immutable once written
 * - Temporal ordering is preserved
 * - Replay and audit are possible
 *
 * This is analogous to the intermembrane space in mitochondria, where
 * molecules are buffered and regulated before crossing the inner membrane.
 */

import { EventEmitter } from 'events';
import {
  Packet,
  EvidencePacket,
  IntentPacket,
  TelemetryPacket,
  addProvenanceStep,
} from './packets.js';

/**
 * Direction of packet flow
 */
export type FlowDirection = 'inward' | 'outward' | 'internal';

/**
 * Event log entry
 */
export interface LogEntry {
  /** Unique entry ID */
  id: string;
  /** Sequence number (monotonically increasing) */
  sequence: number;
  /** Timestamp (ISO 8601) */
  timestamp: string;
  /** Flow direction */
  direction: FlowDirection;
  /** The packet */
  packet: Packet;
  /** Processing status */
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'expired';
  /** Rejection reason (if rejected) */
  rejectionReason?: string;
  /** Processing metadata */
  processingMeta?: {
    startTime?: string;
    endTime?: string;
    processorId?: string;
    sys6Step?: number;
  };
}

/**
 * Bus statistics
 */
export interface BusStats {
  totalEntries: number;
  inwardCount: number;
  outwardCount: number;
  internalCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  averageProcessingTimeMs: number;
}

/**
 * Bus event types
 */
export interface BusEvent {
  type: 'entry_added' | 'entry_processed' | 'entry_rejected' | 'bus_overflow' | 'bus_cleared';
  entry?: LogEntry;
  reason?: string;
  timestamp: string;
}

/**
 * MembraneBus configuration
 */
export interface MembraneBusConfig {
  /** Maximum entries to retain in memory */
  maxEntries?: number;
  /** Entry expiration time in milliseconds */
  entryExpirationMs?: number;
  /** Enable persistence (write to disk) */
  enablePersistence?: boolean;
  /** Persistence path */
  persistencePath?: string;
  /** Batch size for processing */
  batchSize?: number;
}

const DEFAULT_CONFIG: Required<MembraneBusConfig> = {
  maxEntries: 10000,
  entryExpirationMs: 3600000, // 1 hour
  enablePersistence: false,
  persistencePath: '',
  batchSize: 100,
};

/**
 * MembraneBus - The append-only event log
 */
export class MembraneBus extends EventEmitter {
  private config: Required<MembraneBusConfig>;
  private log: LogEntry[] = [];
  private sequence: number = 0;
  private running: boolean = false;
  private processingTimes: number[] = [];

  // Queues for different directions
  private inwardQueue: LogEntry[] = [];
  private outwardQueue: LogEntry[] = [];
  private internalQueue: LogEntry[] = [];

  constructor(config: MembraneBusConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the bus
   */
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.emit('started');
  }

  /**
   * Stop the bus
   */
  public stop(): void {
    if (!this.running) return;
    this.running = false;
    this.emit('stopped');
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Submit a packet to the bus (append-only)
   */
  public submit(packet: Packet, direction: FlowDirection): LogEntry {
    if (!this.running) {
      throw new Error('MembraneBus is not running');
    }

    // Create log entry
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sequence: ++this.sequence,
      timestamp: new Date().toISOString(),
      direction,
      packet: this.addBusProvenance(packet),
      status: 'pending',
    };

    // Append to log (immutable)
    this.log.push(entry);

    // Add to appropriate queue
    switch (direction) {
      case 'inward':
        this.inwardQueue.push(entry);
        break;
      case 'outward':
        this.outwardQueue.push(entry);
        break;
      case 'internal':
        this.internalQueue.push(entry);
        break;
    }

    // Check for overflow
    if (this.log.length > this.config.maxEntries) {
      this.handleOverflow();
    }

    // Emit event
    this.emitBusEvent({
      type: 'entry_added',
      entry,
      timestamp: new Date().toISOString(),
    });

    return entry;
  }

  /**
   * Submit evidence packet (inward)
   */
  public submitEvidence(packet: EvidencePacket): LogEntry {
    return this.submit(packet, 'inward');
  }

  /**
   * Submit intent packet (outward)
   */
  public submitIntent(packet: IntentPacket): LogEntry {
    return this.submit(packet, 'outward');
  }

  /**
   * Submit telemetry packet (internal)
   */
  public submitTelemetry(packet: TelemetryPacket): LogEntry {
    return this.submit(packet, 'internal');
  }

  /**
   * Get pending inward entries
   */
  public getPendingInward(): LogEntry[] {
    return this.inwardQueue.filter((e) => e.status === 'pending');
  }

  /**
   * Get pending outward entries
   */
  public getPendingOutward(): LogEntry[] {
    return this.outwardQueue.filter((e) => e.status === 'pending');
  }

  /**
   * Get pending internal entries
   */
  public getPendingInternal(): LogEntry[] {
    return this.internalQueue.filter((e) => e.status === 'pending');
  }

  /**
   * Mark an entry as processing
   */
  public markProcessing(entryId: string, processorId: string, sys6Step?: number): void {
    const entry = this.findEntry(entryId);
    if (!entry) throw new Error(`Entry not found: ${entryId}`);
    if (entry.status !== 'pending') {
      throw new Error(`Entry ${entryId} is not pending (status: ${entry.status})`);
    }

    entry.status = 'processing';
    entry.processingMeta = {
      startTime: new Date().toISOString(),
      processorId,
      sys6Step,
    };
  }

  /**
   * Approve an entry (crossing allowed)
   */
  public approve(entryId: string): void {
    const entry = this.findEntry(entryId);
    if (!entry) throw new Error(`Entry not found: ${entryId}`);
    if (entry.status !== 'processing') {
      throw new Error(`Entry ${entryId} is not processing (status: ${entry.status})`);
    }

    entry.status = 'approved';
    if (entry.processingMeta) {
      entry.processingMeta.endTime = new Date().toISOString();
      const processingTime =
        new Date(entry.processingMeta.endTime).getTime() -
        new Date(entry.processingMeta.startTime!).getTime();
      this.processingTimes.push(processingTime);
    }

    // Remove from queue
    this.removeFromQueue(entry);

    this.emitBusEvent({
      type: 'entry_processed',
      entry,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Reject an entry (crossing denied)
   */
  public reject(entryId: string, reason: string): void {
    const entry = this.findEntry(entryId);
    if (!entry) throw new Error(`Entry not found: ${entryId}`);
    if (entry.status !== 'processing' && entry.status !== 'pending') {
      throw new Error(`Entry ${entryId} cannot be rejected (status: ${entry.status})`);
    }

    entry.status = 'rejected';
    entry.rejectionReason = reason;
    if (entry.processingMeta) {
      entry.processingMeta.endTime = new Date().toISOString();
    }

    // Remove from queue
    this.removeFromQueue(entry);

    this.emitBusEvent({
      type: 'entry_rejected',
      entry,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get entry by ID
   */
  public getEntry(entryId: string): LogEntry | undefined {
    return this.findEntry(entryId);
  }

  /**
   * Get entries by sequence range
   */
  public getEntriesByRange(startSeq: number, endSeq: number): LogEntry[] {
    return this.log.filter((e) => e.sequence >= startSeq && e.sequence <= endSeq);
  }

  /**
   * Get entries by time range
   */
  public getEntriesByTimeRange(startTime: Date, endTime: Date): LogEntry[] {
    return this.log.filter((e) => {
      const entryTime = new Date(e.timestamp);
      return entryTime >= startTime && entryTime <= endTime;
    });
  }

  /**
   * Get entries by direction
   */
  public getEntriesByDirection(direction: FlowDirection): LogEntry[] {
    return this.log.filter((e) => e.direction === direction);
  }

  /**
   * Get entries by status
   */
  public getEntriesByStatus(status: LogEntry['status']): LogEntry[] {
    return this.log.filter((e) => e.status === status);
  }

  /**
   * Get the full log (read-only)
   */
  public getLog(): readonly LogEntry[] {
    return this.log;
  }

  /**
   * Get current sequence number
   */
  public getCurrentSequence(): number {
    return this.sequence;
  }

  /**
   * Get bus statistics
   */
  public getStats(): BusStats {
    const inward = this.log.filter((e) => e.direction === 'inward');
    const outward = this.log.filter((e) => e.direction === 'outward');
    const internal = this.log.filter((e) => e.direction === 'internal');

    const avgProcessingTime =
      this.processingTimes.length > 0
        ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
        : 0;

    return {
      totalEntries: this.log.length,
      inwardCount: inward.length,
      outwardCount: outward.length,
      internalCount: internal.length,
      approvedCount: this.log.filter((e) => e.status === 'approved').length,
      rejectedCount: this.log.filter((e) => e.status === 'rejected').length,
      pendingCount: this.log.filter((e) => e.status === 'pending').length,
      averageProcessingTimeMs: avgProcessingTime,
    };
  }

  /**
   * Get queue depths
   */
  public getQueueDepths(): { inward: number; outward: number; internal: number } {
    return {
      inward: this.inwardQueue.filter((e) => e.status === 'pending').length,
      outward: this.outwardQueue.filter((e) => e.status === 'pending').length,
      internal: this.internalQueue.filter((e) => e.status === 'pending').length,
    };
  }

  /**
   * Expire old entries
   */
  public expireOldEntries(): number {
    const now = Date.now();
    let expiredCount = 0;

    for (const entry of this.log) {
      if (entry.status === 'pending') {
        const entryTime = new Date(entry.timestamp).getTime();
        if (now - entryTime > this.config.entryExpirationMs) {
          entry.status = 'expired';
          this.removeFromQueue(entry);
          expiredCount++;
        }
      }
    }

    return expiredCount;
  }

  /**
   * Clear the bus (for testing/reset)
   */
  public clear(): void {
    this.log = [];
    this.inwardQueue = [];
    this.outwardQueue = [];
    this.internalQueue = [];
    this.sequence = 0;
    this.processingTimes = [];

    this.emitBusEvent({
      type: 'bus_cleared',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add bus provenance to packet
   */
  private addBusProvenance(packet: Packet): Packet {
    if ('provenance' in packet && packet.provenance) {
      return {
        ...packet,
        provenance: addProvenanceStep(packet.provenance, 'membrane_bus_entry', 'MembraneBus'),
      };
    }
    return packet;
  }

  /**
   * Find entry by ID
   */
  private findEntry(entryId: string): LogEntry | undefined {
    return this.log.find((e) => e.id === entryId);
  }

  /**
   * Remove entry from its queue
   */
  private removeFromQueue(entry: LogEntry): void {
    switch (entry.direction) {
      case 'inward':
        this.inwardQueue = this.inwardQueue.filter((e) => e.id !== entry.id);
        break;
      case 'outward':
        this.outwardQueue = this.outwardQueue.filter((e) => e.id !== entry.id);
        break;
      case 'internal':
        this.internalQueue = this.internalQueue.filter((e) => e.id !== entry.id);
        break;
    }
  }

  /**
   * Handle log overflow
   */
  private handleOverflow(): void {
    // Remove oldest entries that are not pending
    const toRemove = this.log.length - this.config.maxEntries;
    let removed = 0;

    for (let i = 0; i < this.log.length && removed < toRemove; i++) {
      if (this.log[i].status !== 'pending' && this.log[i].status !== 'processing') {
        this.log.splice(i, 1);
        removed++;
        i--; // Adjust index after removal
      }
    }

    this.emitBusEvent({
      type: 'bus_overflow',
      reason: `Removed ${removed} old entries`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit bus event
   */
  private emitBusEvent(event: BusEvent): void {
    this.emit(event.type, event);
    this.emit('bus_event', event);
  }
}

export default MembraneBus;
