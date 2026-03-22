/**
 * System5TelemetryShell — Prometheus Metrics for Thread-Level Multiplexing
 *
 * Implements the global telemetry shell with persistent gestalt perception.
 * All local cores, channel computations, and pipes operate within this shell.
 *
 * Thread-level multiplexing cycles through permutations of 4 particular sets:
 *   Dyadic pairs: P(1,2) → P(1,3) → P(1,4) → P(2,3) → P(2,4) → P(3,4)
 *
 * Two complementary triads cycle:
 *   MP1: P[1,2,3] → P[1,2,4] → P[1,3,4] → P[2,3,4]
 *   MP2: P[1,3,4] → P[2,3,4] → P[1,2,3] → P[1,2,4]
 *
 * This is conceptualized as qubit entanglement of order 2 — two processes
 * accessing the same memory simultaneously.
 *
 * OEIS A000081 nested shells:
 *   sys(1) = a(2) = 1  (singular undifferentiated)
 *   sys(2) = a(3) = 2  (opponent processing)
 *   sys(3) = a(4) = 4  (2 orthogonal dyadic pairs)
 *   sys(4) = a(5) = 9  (3 concurrent threads + tetradic bundles)
 *
 * Metrics are exported in Prometheus text format for scraping.
 */
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/System5TelemetryShell');

// ─── Types ─────────────────────────────────────────────────────

export interface TelemetryShellConfig {
  /** Collection interval in milliseconds */
  collectionIntervalMs: number;
  /** Maximum data points to retain per metric */
  maxDataPoints: number;
  /** Enable thread multiplexing telemetry */
  enableThreadMultiplexing: boolean;
  /** Enable nested shell telemetry */
  enableNestedShells: boolean;
  /** Enable Echobeats stream telemetry */
  enableEchobeatsMetrics: boolean;
  /** Enable reservoir telemetry */
  enableReservoirMetrics: boolean;
  /** Prometheus namespace prefix */
  prometheusNamespace: string;
}

export interface DyadicPair {
  id: string;
  threads: [number, number];
  active: boolean;
  energy: number;
  coherence: number;
  lastActivated: number;
}

export interface TriadicBundle {
  id: string;
  threads: [number, number, number];
  symmetry: string;
  dyadicEdges: DyadicPair[];
  energy: number;
  coherence: number;
  rotationIndex: number;
}

export interface MultiplexingState {
  currentDyad: DyadicPair;
  currentTriadMP1: TriadicBundle;
  currentTriadMP2: TriadicBundle;
  dyadicCyclePosition: number;
  triadicCyclePosition: number;
  totalCycles: number;
  entanglementOrder: number;
}

export interface NestedShellState {
  systemLevel: number;
  termCount: number;
  shellStructure: string;
  activeTerms: number;
  shellEnergy: number[];
}

export interface TelemetryDataPoint {
  timestamp: number;
  metric: string;
  value: number;
  labels: Record<string, string>;
}

// ─── OEIS A000081 Reference ────────────────────────────────────

const A000081: number[] = [0, 1, 1, 2, 4, 9, 20, 48, 115, 286, 719];
// sys(n) = a000081(n+1)

// ─── Dyadic & Triadic Constants ────────────────────────────────

/** All 6 dyadic pairs of 4 threads */
const DYADIC_PAIRS: Array<[number, number]> = [
  [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
];

/** MP1 triadic rotation: P[1,2,3] → P[1,2,4] → P[1,3,4] → P[2,3,4] */
const MP1_TRIADS: Array<[number, number, number]> = [
  [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4],
];

/** MP2 triadic rotation: P[1,3,4] → P[2,3,4] → P[1,2,3] → P[1,2,4] */
const MP2_TRIADS: Array<[number, number, number]> = [
  [1, 3, 4], [2, 3, 4], [1, 2, 3], [1, 2, 4],
];

const SYMMETRY_LABELS = ['diagonal', 'anti-diagonal', 'horizontal', 'vertical'];

// ─── Main Telemetry Shell Class ────────────────────────────────

export class System5TelemetryShell extends EventEmitter {
  private config: TelemetryShellConfig;
  private running = false;
  private collectionInterval: ReturnType<typeof setInterval> | null = null;
  private dataPoints: TelemetryDataPoint[] = [];
  private startedAt: number | null = null;

  // Thread multiplexing state
  private dyadicPairs: DyadicPair[] = [];
  private triadicBundlesMP1: TriadicBundle[] = [];
  private triadicBundlesMP2: TriadicBundle[] = [];
  private dyadicCyclePosition = 0;
  private triadicCyclePosition = 0;
  private totalCycles = 0;

  // Nested shell state
  private currentSystemLevel = 4;
  private shellEnergy: number[] = [0, 0, 0, 0];

  // External metric sources
  private echobeatsMetrics: Record<string, number> = {};
  private reservoirMetrics: Record<string, number> = {};
  private pipelineMetrics: Record<string, number> = {};

  constructor(config: Partial<TelemetryShellConfig> = {}) {
    super();
    this.config = {
      collectionIntervalMs: config.collectionIntervalMs || 5000,
      maxDataPoints: config.maxDataPoints || 1000,
      enableThreadMultiplexing: config.enableThreadMultiplexing ?? true,
      enableNestedShells: config.enableNestedShells ?? true,
      enableEchobeatsMetrics: config.enableEchobeatsMetrics ?? true,
      enableReservoirMetrics: config.enableReservoirMetrics ?? true,
      prometheusNamespace: config.prometheusNamespace || 'dte',
    };

    this.initializeMultiplexingState();
  }

  /**
   * Initialize the thread multiplexing state with all dyadic pairs and triadic bundles.
   */
  private initializeMultiplexingState(): void {
    // Create dyadic pairs
    this.dyadicPairs = DYADIC_PAIRS.map(([a, b], idx) => ({
      id: `dyad_${a}_${b}`,
      threads: [a, b] as [number, number],
      active: idx === 0,
      energy: 0,
      coherence: 0,
      lastActivated: 0,
    }));

    // Create MP1 triadic bundles
    this.triadicBundlesMP1 = MP1_TRIADS.map(([a, b, c], idx) => ({
      id: `mp1_${a}_${b}_${c}`,
      threads: [a, b, c] as [number, number, number],
      symmetry: SYMMETRY_LABELS[idx],
      dyadicEdges: this.getDyadicEdgesForTriad([a, b, c]),
      energy: 0,
      coherence: 0,
      rotationIndex: idx,
    }));

    // Create MP2 triadic bundles
    this.triadicBundlesMP2 = MP2_TRIADS.map(([a, b, c], idx) => ({
      id: `mp2_${a}_${b}_${c}`,
      threads: [a, b, c] as [number, number, number],
      symmetry: SYMMETRY_LABELS[idx],
      dyadicEdges: this.getDyadicEdgesForTriad([a, b, c]),
      energy: 0,
      coherence: 0,
      rotationIndex: idx,
    }));
  }

  /**
   * Start the telemetry shell.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = Date.now();

    this.collectionInterval = setInterval(() => {
      this.collect();
    }, this.config.collectionIntervalMs);

    log.info(`System5TelemetryShell started (collection every ${this.config.collectionIntervalMs}ms)`);
    this.emit('started');
  }

  /**
   * Stop the telemetry shell.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    log.info('System5TelemetryShell stopped');
    this.emit('stopped');
  }

  /**
   * Advance the thread multiplexing cycle by one step.
   * Called by Echobeats on each tick.
   */
  advanceMultiplexingCycle(energy: number, coherence: number): void {
    // Advance dyadic cycle
    this.dyadicPairs[this.dyadicCyclePosition].active = false;
    this.dyadicCyclePosition = (this.dyadicCyclePosition + 1) % DYADIC_PAIRS.length;
    const currentDyad = this.dyadicPairs[this.dyadicCyclePosition];
    currentDyad.active = true;
    currentDyad.energy = energy;
    currentDyad.coherence = coherence;
    currentDyad.lastActivated = Date.now();

    // Advance triadic cycle every 6 dyadic steps (one full dyadic rotation)
    if (this.dyadicCyclePosition === 0) {
      this.triadicCyclePosition = (this.triadicCyclePosition + 1) % MP1_TRIADS.length;
      this.totalCycles++;

      // Update triadic bundle energies
      const mp1 = this.triadicBundlesMP1[this.triadicCyclePosition];
      const mp2 = this.triadicBundlesMP2[this.triadicCyclePosition];
      mp1.energy = energy;
      mp1.coherence = coherence;
      mp2.energy = energy;
      mp2.coherence = coherence;
    }

    // Update shell energy
    const shellIdx = this.dyadicCyclePosition % this.shellEnergy.length;
    this.shellEnergy[shellIdx] = energy;

    this.emit('multiplexing_advanced', {
      dyadicPosition: this.dyadicCyclePosition,
      triadicPosition: this.triadicCyclePosition,
      currentDyad: currentDyad.id,
      energy,
      coherence,
    });
  }

  /**
   * Update external metrics from Echobeats.
   */
  updateEchobeatsMetrics(metrics: Record<string, number>): void {
    this.echobeatsMetrics = { ...metrics };
  }

  /**
   * Update external metrics from ReservoirFeedbackLoop.
   */
  updateReservoirMetrics(metrics: Record<string, number>): void {
    this.reservoirMetrics = { ...metrics };
  }

  /**
   * Update external metrics from AutonomyPipeline.
   */
  updatePipelineMetrics(metrics: Record<string, number>): void {
    this.pipelineMetrics = { ...metrics };
  }

  /**
   * Evolve to System 5 (tetradic architecture).
   */
  evolveToSystem5(): void {
    if (this.currentSystemLevel >= 5) return;
    this.currentSystemLevel = 5;
    this.shellEnergy = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 9 terms for sys(4) = a(5) = 9
    log.info('Evolved to System 5: 9 terms, 4 tensor bundles');
    this.emit('system5_evolved', { termCount: 9, bundles: 4 });
  }

  /**
   * Collect all metrics into data points.
   */
  private collect(): void {
    const now = Date.now();
    const ns = this.config.prometheusNamespace;

    // Thread multiplexing metrics
    if (this.config.enableThreadMultiplexing) {
      for (const dyad of this.dyadicPairs) {
        this.recordMetric(`${ns}_dyad_energy`, dyad.energy, {
          dyad: dyad.id,
          active: String(dyad.active),
        });
        this.recordMetric(`${ns}_dyad_coherence`, dyad.coherence, {
          dyad: dyad.id,
        });
      }

      this.recordMetric(`${ns}_dyadic_cycle_position`, this.dyadicCyclePosition, {});
      this.recordMetric(`${ns}_triadic_cycle_position`, this.triadicCyclePosition, {});
      this.recordMetric(`${ns}_total_cycles`, this.totalCycles, {});

      for (let i = 0; i < this.triadicBundlesMP1.length; i++) {
        const mp1 = this.triadicBundlesMP1[i];
        this.recordMetric(`${ns}_triad_mp1_energy`, mp1.energy, {
          triad: mp1.id,
          symmetry: mp1.symmetry,
        });
      }
      for (let i = 0; i < this.triadicBundlesMP2.length; i++) {
        const mp2 = this.triadicBundlesMP2[i];
        this.recordMetric(`${ns}_triad_mp2_energy`, mp2.energy, {
          triad: mp2.id,
          symmetry: mp2.symmetry,
        });
      }
    }

    // Nested shell metrics
    if (this.config.enableNestedShells) {
      this.recordMetric(`${ns}_system_level`, this.currentSystemLevel, {});
      this.recordMetric(`${ns}_system_term_count`, A000081[this.currentSystemLevel + 1] || 0, {});
      for (let i = 0; i < this.shellEnergy.length; i++) {
        this.recordMetric(`${ns}_shell_energy`, this.shellEnergy[i], { shell: String(i) });
      }
    }

    // Echobeats metrics
    if (this.config.enableEchobeatsMetrics) {
      for (const [key, value] of Object.entries(this.echobeatsMetrics)) {
        this.recordMetric(`${ns}_echobeats_${key}`, value, {});
      }
    }

    // Reservoir metrics
    if (this.config.enableReservoirMetrics) {
      for (const [key, value] of Object.entries(this.reservoirMetrics)) {
        this.recordMetric(`${ns}_reservoir_${key}`, value, {});
      }
    }

    // Pipeline metrics
    for (const [key, value] of Object.entries(this.pipelineMetrics)) {
      this.recordMetric(`${ns}_pipeline_${key}`, value, {});
    }

    this.emit('collection_complete', { timestamp: now, dataPointCount: this.dataPoints.length });
  }

  /**
   * Export all metrics in Prometheus text exposition format.
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    const ns = this.config.prometheusNamespace;

    // Group by metric name for HELP/TYPE headers
    const metricGroups = new Map<string, TelemetryDataPoint[]>();
    for (const dp of this.dataPoints.slice(-this.config.maxDataPoints)) {
      const group = metricGroups.get(dp.metric) || [];
      group.push(dp);
      metricGroups.set(dp.metric, group);
    }

    for (const [metric, points] of metricGroups) {
      lines.push(`# HELP ${metric} DTE System 5 telemetry metric`);
      lines.push(`# TYPE ${metric} gauge`);

      // Only export the latest point per label set
      const latestByLabels = new Map<string, TelemetryDataPoint>();
      for (const point of points) {
        const labelKey = JSON.stringify(point.labels);
        latestByLabels.set(labelKey, point);
      }

      for (const point of latestByLabels.values()) {
        const labelStr = Object.entries(point.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        const labelPart = labelStr ? `{${labelStr}}` : '';
        lines.push(`${metric}${labelPart} ${point.value} ${point.timestamp}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Get the current multiplexing state.
   */
  getMultiplexingState(): MultiplexingState {
    return {
      currentDyad: { ...this.dyadicPairs[this.dyadicCyclePosition] },
      currentTriadMP1: { ...this.triadicBundlesMP1[this.triadicCyclePosition] },
      currentTriadMP2: { ...this.triadicBundlesMP2[this.triadicCyclePosition] },
      dyadicCyclePosition: this.dyadicCyclePosition,
      triadicCyclePosition: this.triadicCyclePosition,
      totalCycles: this.totalCycles,
      entanglementOrder: 2,
    };
  }

  /**
   * Get the nested shell state.
   */
  getNestedShellState(): NestedShellState {
    const termCount = A000081[this.currentSystemLevel + 1] || 0;
    return {
      systemLevel: this.currentSystemLevel,
      termCount,
      shellStructure: this.getShellStructure(),
      activeTerms: this.shellEnergy.filter(e => e > 0).length,
      shellEnergy: [...this.shellEnergy],
    };
  }

  /**
   * Get the data points for time-series visualization.
   */
  getDataPoints(): TelemetryDataPoint[] {
    return [...this.dataPoints];
  }

  /**
   * Check if running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the current system level.
   */
  getSystemLevel(): number {
    return this.currentSystemLevel;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private recordMetric(metric: string, value: number, labels: Record<string, string>): void {
    this.dataPoints.push({
      timestamp: Date.now(),
      metric,
      value,
      labels,
    });

    // Prune old data points
    if (this.dataPoints.length > this.config.maxDataPoints * 2) {
      this.dataPoints = this.dataPoints.slice(-this.config.maxDataPoints);
    }
  }

  private getDyadicEdgesForTriad(threads: number[]): DyadicPair[] {
    return this.dyadicPairs.filter(d =>
      threads.includes(d.threads[0]) && threads.includes(d.threads[1])
    );
  }

  private getShellStructure(): string {
    switch (this.currentSystemLevel) {
      case 1: return '(.)';
      case 2: return '(. .)';
      case 3: return '((.) .)';
      case 4: return '((.) (.) . .)';
      case 5: return '(((.) .) (.) (.) . . . . .)';
      default: return `sys(${this.currentSystemLevel})`;
    }
  }
}
