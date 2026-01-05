/**
 * Membrane Bus
 *
 * Manages packet routing between objective and subjective membranes
 * with append-only event log and pub/sub mechanism
 */

import { EventEmitter } from 'events';
import { Packet, EvidencePacket, IntentPacket } from '../packets/types';

/**
 * Membrane direction for packet flow
 */
export enum MembraneDirection {
  INWARD = 'inward', // Objective → Subjective
  OUTWARD = 'outward', // Subjective → Objective
}

/**
 * Bus event types
 */
export interface BusEvents {
  'packet:inward': (packet: EvidencePacket) => void;
  'packet:outward': (packet: IntentPacket) => void;
  'packet:validated': (packet: Packet) => void;
  'packet:rejected': (packet: Packet, reason: string) => void;
  'bus:error': (error: Error) => void;
}

/**
 * Packet log entry
 */
interface PacketLogEntry {
  timestamp: number;
  direction: MembraneDirection;
  packet: Packet;
  validated: boolean;
  rejected?: boolean;
  rejectionReason?: string;
}

/**
 * Bus statistics
 */
export interface BusStatistics {
  totalPackets: number;
  inwardPackets: number;
  outwardPackets: number;
  validatedPackets: number;
  rejectedPackets: number;
  averageLatency: number;
}

/**
 * Membrane Bus Configuration
 */
export interface MembraneBusConfig {
  /** Maximum log size before rotation */
  maxLogSize: number;

  /** Enable append-only log persistence */
  persistLog: boolean;

  /** Log file path (if persistLog is true) */
  logPath?: string;

  /** Enable packet validation */
  validatePackets: boolean;

  /** Maximum packet size in bytes */
  maxPacketSize: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MembraneBusConfig = {
  maxLogSize: 10000,
  persistLog: false,
  validatePackets: true,
  maxPacketSize: 1024 * 1024, // 1MB
};

/**
 * Membrane Bus
 *
 * Central routing system for packets crossing membrane boundaries
 */
export class MembraneBus extends EventEmitter {
  private config: MembraneBusConfig;
  private packetLog: PacketLogEntry[] = [];
  private stats: BusStatistics = {
    totalPackets: 0,
    inwardPackets: 0,
    outwardPackets: 0,
    validatedPackets: 0,
    rejectedPackets: 0,
    averageLatency: 0,
  };

  constructor(config: Partial<MembraneBusConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send an evidence packet inward (Objective → Subjective)
   */
  async sendInward(packet: EvidencePacket): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate packet
      if (this.config.validatePackets) {
        const validation = this.validatePacket(packet);
        if (!validation.valid) {
          this.rejectPacket(packet, MembraneDirection.INWARD, validation.errors.join(', '));
          return;
        }
      }

      // Log packet
      this.logPacket(packet, MembraneDirection.INWARD, true);

      // Emit event
      this.emit('packet:inward', packet);
      this.emit('packet:validated', packet);

      // Update stats
      this.stats.totalPackets++;
      this.stats.inwardPackets++;
      this.stats.validatedPackets++;
      this.updateLatency(Date.now() - startTime);
    } catch (error) {
      this.emit('bus:error', error as Error);
      throw error;
    }
  }

  /**
   * Send an intent packet outward (Subjective → Objective)
   */
  async sendOutward(packet: IntentPacket): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate packet
      if (this.config.validatePackets) {
        const validation = this.validatePacket(packet);
        if (!validation.valid) {
          this.rejectPacket(packet, MembraneDirection.OUTWARD, validation.errors.join(', '));
          return;
        }
      }

      // Log packet
      this.logPacket(packet, MembraneDirection.OUTWARD, true);

      // Emit event
      this.emit('packet:outward', packet);
      this.emit('packet:validated', packet);

      // Update stats
      this.stats.totalPackets++;
      this.stats.outwardPackets++;
      this.stats.validatedPackets++;
      this.updateLatency(Date.now() - startTime);
    } catch (error) {
      this.emit('bus:error', error as Error);
      throw error;
    }
  }

  /**
   * Validate a packet
   */
  private validatePacket(packet: Packet): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check packet size
    const packetSize = JSON.stringify(packet).length;
    if (packetSize > this.config.maxPacketSize) {
      errors.push(`Packet size ${packetSize} exceeds maximum ${this.config.maxPacketSize}`);
    }

    // Check required fields
    if (!packet.id) {
      errors.push('Packet missing required field: id');
    }
    if (!packet.type) {
      errors.push('Packet missing required field: type');
    }

    // Type-specific validation
    if (packet.type === 'evidence') {
      const evidencePacket = packet;
      if (!evidencePacket.facts || evidencePacket.facts.length === 0) {
        errors.push('Evidence packet must contain at least one fact');
      }
      if (!evidencePacket.provenance) {
        errors.push('Evidence packet missing provenance');
      }
      if (!evidencePacket.cost) {
        errors.push('Evidence packet missing cost');
      }
      if (!evidencePacket.risk) {
        errors.push('Evidence packet missing risk');
      }
    } else if (packet.type === 'intent') {
      const intentPacket = packet;
      if (!intentPacket.goal) {
        errors.push('Intent packet missing goal');
      }
      if (!intentPacket.constraints) {
        errors.push('Intent packet missing constraints');
      }
      if (!intentPacket.allowedTools) {
        errors.push('Intent packet missing allowedTools');
      }
      if (!intentPacket.budget) {
        errors.push('Intent packet missing budget');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log a packet to the append-only log
   */
  private logPacket(packet: Packet, direction: MembraneDirection, validated: boolean): void {
    const entry: PacketLogEntry = {
      timestamp: Date.now(),
      direction,
      packet,
      validated,
    };

    this.packetLog.push(entry);

    // Rotate log if needed
    if (this.packetLog.length > this.config.maxLogSize) {
      this.rotateLog();
    }
  }

  /**
   * Reject a packet
   */
  private rejectPacket(packet: Packet, direction: MembraneDirection, reason: string): void {
    const entry: PacketLogEntry = {
      timestamp: Date.now(),
      direction,
      packet,
      validated: false,
      rejected: true,
      rejectionReason: reason,
    };

    this.packetLog.push(entry);
    this.stats.rejectedPackets++;

    this.emit('packet:rejected', packet, reason);
  }

  /**
   * Rotate the log (keep most recent entries)
   */
  private rotateLog(): void {
    const keepSize = Math.floor(this.config.maxLogSize * 0.8);
    this.packetLog = this.packetLog.slice(-keepSize);
  }

  /**
   * Update average latency
   */
  private updateLatency(latency: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.stats.averageLatency = alpha * latency + (1 - alpha) * this.stats.averageLatency;
  }

  /**
   * Get bus statistics
   */
  getStatistics(): BusStatistics {
    return { ...this.stats };
  }

  /**
   * Get packet log (read-only)
   */
  getLog(): ReadonlyArray<PacketLogEntry> {
    return this.packetLog;
  }

  /**
   * Query packets by criteria
   */
  queryPackets(criteria: {
    direction?: MembraneDirection;
    type?: string;
    startTime?: number;
    endTime?: number;
    validated?: boolean;
  }): PacketLogEntry[] {
    return this.packetLog.filter((entry) => {
      if (criteria.direction && entry.direction !== criteria.direction) {
        return false;
      }
      if (criteria.type && entry.packet.type !== criteria.type) {
        return false;
      }
      if (criteria.startTime && entry.timestamp < criteria.startTime) {
        return false;
      }
      if (criteria.endTime && entry.timestamp > criteria.endTime) {
        return false;
      }
      if (criteria.validated !== undefined && entry.validated !== criteria.validated) {
        return false;
      }
      return true;
    });
  }

  /**
   * Clear the log (use with caution)
   */
  clearLog(): void {
    this.packetLog = [];
  }
}
