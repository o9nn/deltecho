import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { System5TelemetryShell } from '../system5-telemetry-shell.js';

describe('System5TelemetryShell', () => {
  let telemetry: System5TelemetryShell;

  beforeEach(() => {
    telemetry = new System5TelemetryShell({
      collectionIntervalMs: 60000, // Long interval so it doesn't fire during tests
      maxDataPoints: 100,
      enableThreadMultiplexing: true,
      enableNestedShells: true,
      enableEchobeatsMetrics: true,
      enableReservoirMetrics: true,
      prometheusNamespace: 'dte_test',
    });
  });

  afterEach(() => {
    telemetry.stop();
    telemetry.removeAllListeners();
  });

  describe('Lifecycle', () => {
    it('should start and stop', () => {
      expect(telemetry.isRunning()).toBe(false);
      telemetry.start();
      expect(telemetry.isRunning()).toBe(true);
      telemetry.stop();
      expect(telemetry.isRunning()).toBe(false);
    });

    it('should emit started and stopped events', () => {
      const events: string[] = [];
      telemetry.on('started', () => events.push('started'));
      telemetry.on('stopped', () => events.push('stopped'));

      telemetry.start();
      telemetry.stop();

      expect(events).toEqual(['started', 'stopped']);
    });

    it('should be idempotent on start', () => {
      telemetry.start();
      telemetry.start(); // Should not throw
      expect(telemetry.isRunning()).toBe(true);
    });
  });

  describe('Thread Multiplexing', () => {
    it('should initialize with 6 dyadic pairs', () => {
      const state = telemetry.getMultiplexingState();
      expect(state.dyadicCyclePosition).toBe(0);
      expect(state.currentDyad.threads).toEqual([1, 2]);
      expect(state.entanglementOrder).toBe(2);
    });

    it('should cycle through all 6 dyadic pairs', () => {
      const expectedPairs: Array<[number, number]> = [
        [1, 3], [1, 4], [2, 3], [2, 4], [3, 4], [1, 2],
      ];

      for (let i = 0; i < 6; i++) {
        telemetry.advanceMultiplexingCycle(0.5, 0.8);
        const state = telemetry.getMultiplexingState();
        expect(state.currentDyad.threads).toEqual(expectedPairs[i]);
      }
    });

    it('should advance triadic cycle after full dyadic rotation', () => {
      const state0 = telemetry.getMultiplexingState();
      expect(state0.triadicCyclePosition).toBe(0);

      // Advance through all 6 dyadic pairs
      for (let i = 0; i < 6; i++) {
        telemetry.advanceMultiplexingCycle(0.5, 0.8);
      }

      const state1 = telemetry.getMultiplexingState();
      expect(state1.triadicCyclePosition).toBe(1);
      expect(state1.totalCycles).toBe(1);
    });

    it('should track energy and coherence on dyadic pairs', () => {
      telemetry.advanceMultiplexingCycle(0.75, 0.92);

      const state = telemetry.getMultiplexingState();
      expect(state.currentDyad.energy).toBe(0.75);
      expect(state.currentDyad.coherence).toBe(0.92);
      expect(state.currentDyad.active).toBe(true);
    });

    it('should emit multiplexing_advanced event', () => {
      let emitted = false;
      telemetry.on('multiplexing_advanced', (data: any) => {
        emitted = true;
        expect(data.energy).toBe(0.5);
        expect(data.coherence).toBe(0.8);
      });

      telemetry.advanceMultiplexingCycle(0.5, 0.8);
      expect(emitted).toBe(true);
    });

    it('should have MP1 and MP2 complementary triads', () => {
      const state = telemetry.getMultiplexingState();

      // MP1 starts at P[1,2,3]
      expect(state.currentTriadMP1.threads).toEqual([1, 2, 3]);
      // MP2 starts at P[1,3,4]
      expect(state.currentTriadMP2.threads).toEqual([1, 3, 4]);
    });

    it('should complete a full multiplexing cycle', () => {
      // 6 dyadic steps × 4 triadic positions = 24 steps for full cycle
      for (let i = 0; i < 24; i++) {
        telemetry.advanceMultiplexingCycle(Math.random(), Math.random());
      }

      const state = telemetry.getMultiplexingState();
      expect(state.totalCycles).toBe(4);
      expect(state.dyadicCyclePosition).toBe(0); // Back to start
      expect(state.triadicCyclePosition).toBe(0); // Back to start
    });
  });

  describe('Nested Shells', () => {
    it('should start at System 4', () => {
      expect(telemetry.getSystemLevel()).toBe(4);
    });

    it('should report correct nested shell state', () => {
      const shell = telemetry.getNestedShellState();
      expect(shell.systemLevel).toBe(4);
      expect(shell.termCount).toBe(9); // sys(4) = a(5) = 9
      expect(shell.shellStructure).toBe('((.) (.) . .)');
    });

    it('should evolve to System 5', () => {
      let evolved = false;
      telemetry.on('system5_evolved', (data: any) => {
        evolved = true;
        expect(data.termCount).toBe(9);
        expect(data.bundles).toBe(4);
      });

      telemetry.evolveToSystem5();
      expect(telemetry.getSystemLevel()).toBe(5);
      expect(evolved).toBe(true);
    });

    it('should be idempotent on evolveToSystem5', () => {
      telemetry.evolveToSystem5();
      telemetry.evolveToSystem5(); // Should not throw or change
      expect(telemetry.getSystemLevel()).toBe(5);
    });

    it('should expand shell energy array on System 5 evolution', () => {
      telemetry.evolveToSystem5();
      const shell = telemetry.getNestedShellState();
      expect(shell.shellEnergy.length).toBe(9); // 9 terms for sys(4) = a(5) = 9
    });
  });

  describe('External Metrics', () => {
    it('should accept echobeats metrics', () => {
      telemetry.updateEchobeatsMetrics({
        stream_count: 3,
        cycle_step: 7,
        total_ticks: 1000,
      });

      // Metrics are stored internally, verified via Prometheus export
      // No assertion needed here, just verify no errors
    });

    it('should accept reservoir metrics', () => {
      telemetry.updateReservoirMetrics({
        avg_prediction_error: 0.05,
        total_updates: 500,
        learning_rate: 0.01,
      });
    });

    it('should accept pipeline metrics', () => {
      telemetry.updatePipelineMetrics({
        examples_generated: 100,
        tokens_generated: 50000,
        flush_count: 10,
      });
    });
  });

  describe('Prometheus Export', () => {
    it('should export valid Prometheus text format', () => {
      // Advance a few cycles to generate data
      for (let i = 0; i < 3; i++) {
        telemetry.advanceMultiplexingCycle(0.5 + i * 0.1, 0.8);
      }

      // Manually trigger collection (normally done by interval)
      telemetry['collect']();

      const prometheus = telemetry.exportPrometheus();
      expect(prometheus).toContain('# HELP');
      expect(prometheus).toContain('# TYPE');
      expect(prometheus).toContain('gauge');
      expect(prometheus).toContain('dte_test_');
    });

    it('should include dyad metrics in Prometheus output', () => {
      telemetry.advanceMultiplexingCycle(0.5, 0.8);
      telemetry['collect']();

      const prometheus = telemetry.exportPrometheus();
      expect(prometheus).toContain('dte_test_dyad_energy');
      expect(prometheus).toContain('dte_test_dyad_coherence');
    });

    it('should include system level metrics', () => {
      telemetry['collect']();

      const prometheus = telemetry.exportPrometheus();
      expect(prometheus).toContain('dte_test_system_level');
      expect(prometheus).toContain('dte_test_system_term_count');
    });

    it('should include echobeats metrics when provided', () => {
      telemetry.updateEchobeatsMetrics({ stream_count: 3 });
      telemetry['collect']();

      const prometheus = telemetry.exportPrometheus();
      expect(prometheus).toContain('dte_test_echobeats_stream_count');
    });

    it('should include reservoir metrics when provided', () => {
      telemetry.updateReservoirMetrics({ avg_prediction_error: 0.05 });
      telemetry['collect']();

      const prometheus = telemetry.exportPrometheus();
      expect(prometheus).toContain('dte_test_reservoir_avg_prediction_error');
    });

    it('should include multiplexing cycle metrics', () => {
      telemetry['collect']();

      const prometheus = telemetry.exportPrometheus();
      expect(prometheus).toContain('dte_test_dyadic_cycle_position');
      expect(prometheus).toContain('dte_test_triadic_cycle_position');
      expect(prometheus).toContain('dte_test_total_cycles');
    });

    it('should include shell energy metrics', () => {
      telemetry.advanceMultiplexingCycle(0.7, 0.9);
      telemetry['collect']();

      const prometheus = telemetry.exportPrometheus();
      expect(prometheus).toContain('dte_test_shell_energy');
    });
  });

  describe('Data Points', () => {
    it('should collect data points', () => {
      telemetry['collect']();
      const dataPoints = telemetry.getDataPoints();
      expect(dataPoints.length).toBeGreaterThan(0);
    });

    it('should prune old data points', () => {
      const smallTelemetry = new System5TelemetryShell({ maxDataPoints: 10 });

      // Generate more than maxDataPoints
      for (let i = 0; i < 20; i++) {
        smallTelemetry.advanceMultiplexingCycle(Math.random(), Math.random());
        smallTelemetry['collect']();
      }

      // Should be pruned to around maxDataPoints
      const dataPoints = smallTelemetry.getDataPoints();
      expect(dataPoints.length).toBeLessThanOrEqual(20); // maxDataPoints * 2 triggers prune
      smallTelemetry.removeAllListeners();
    });

    it('should emit collection_complete event', () => {
      let emitted = false;
      telemetry.on('collection_complete', () => { emitted = true; });

      telemetry['collect']();
      expect(emitted).toBe(true);
    });
  });

  describe('OEIS A000081 Verification', () => {
    it('should use correct A000081 values for system levels', () => {
      // sys(n) = a000081(n+1)
      // sys(1) = a(2) = 1
      // sys(2) = a(3) = 2
      // sys(3) = a(4) = 4
      // sys(4) = a(5) = 9

      const shell = telemetry.getNestedShellState();
      expect(shell.systemLevel).toBe(4);
      expect(shell.termCount).toBe(9); // a(5) = 9
    });
  });
});
