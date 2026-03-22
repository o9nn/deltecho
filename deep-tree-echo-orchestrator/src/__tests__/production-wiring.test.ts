import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ProductionOrchestrationWiring, type WiringPhase } from '../production-wiring.js';

describe('ProductionOrchestrationWiring', () => {
  let wiring: ProductionOrchestrationWiring;

  beforeEach(() => {
    wiring = new ProductionOrchestrationWiring({
      enableDeltaChat: true,
      enableAutonomyPipeline: true,
      enableCoreSelf: true,
      enableEchobeats: true,
      enableLucyVM: true,
      enableReservoirFeedback: true,
      enableContinuousTraining: true,
      enableDove9Bridge: true,
      enableEchoAgentLoop: true,
      enableTelemetryShell: true,
      enableHFDeploy: false,
    });
  });

  afterEach(async () => {
    await wiring.stop();
    wiring.removeAllListeners();
  });

  describe('Initialization', () => {
    it('should start in IDLE phase', () => {
      expect(wiring.getPhase()).toBe('IDLE');
      expect(wiring.isRunning()).toBe(false);
    });

    it('should create with default config', () => {
      const defaultWiring = new ProductionOrchestrationWiring();
      expect(defaultWiring.getPhase()).toBe('IDLE');
      defaultWiring.removeAllListeners();
    });

    it('should report empty status before start', () => {
      const status = wiring.getStatus();
      expect(status.phase).toBe('IDLE');
      expect(status.startedAt).toBeNull();
      expect(status.uptime).toBe(0);
      expect(status.components).toHaveLength(0);
      expect(status.healthScore).toBe(0);
    });
  });

  describe('Startup Sequence', () => {
    it('should progress through all startup phases', async () => {
      const phases: WiringPhase[] = [];
      wiring.on('phase_changed', (data: { phase: WiringPhase }) => {
        phases.push(data.phase);
      });

      await wiring.start();

      expect(phases).toContain('INITIALIZING');
      expect(phases).toContain('STARTING_INFRASTRUCTURE');
      expect(phases).toContain('STARTING_COGNITIVE');
      expect(phases).toContain('STARTING_AUTONOMY');
      expect(phases).toContain('WIRING_FEEDBACK_LOOPS');
      expect(phases).toContain('RUNNING');
    });

    it('should register all enabled components', async () => {
      await wiring.start();
      const status = wiring.getStatus();

      // Should have: lucyVM, storage, coreSelf, echobeats, reservoirFeedback,
      // deltaChat, autonomyPipeline, dove9Bridge, echoAgentLoop, continuousTraining, feedbackLoops
      expect(status.components.length).toBeGreaterThanOrEqual(10);
    });

    it('should emit production_ready event', async () => {
      let readyEmitted = false;
      wiring.on('production_ready', () => { readyEmitted = true; });

      await wiring.start();
      expect(readyEmitted).toBe(true);
    });

    it('should be in RUNNING phase after start', async () => {
      await wiring.start();
      expect(wiring.getPhase()).toBe('RUNNING');
      expect(wiring.isRunning()).toBe(true);
    });

    it('should track uptime', async () => {
      await wiring.start();
      const status = wiring.getStatus();
      expect(status.startedAt).toBeGreaterThan(0);
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Component Registration', () => {
    it('should register infrastructure components', async () => {
      await wiring.start();
      const status = wiring.getStatus();
      const names = status.components.map(c => c.name);

      expect(names).toContain('Lucy VM (llama.cpp)');
      expect(names).toContain('Persistent Storage');
    });

    it('should register cognitive components', async () => {
      await wiring.start();
      const status = wiring.getStatus();
      const names = status.components.map(c => c.name);

      expect(names).toContain('CoreSelf Engine');
      expect(names).toContain('Echobeats (3-stream)');
      expect(names).toContain('Reservoir Feedback Loop');
    });

    it('should register autonomy components', async () => {
      await wiring.start();
      const status = wiring.getStatus();
      const names = status.components.map(c => c.name);

      expect(names).toContain('DeltaChat Daemon');
      expect(names).toContain('Autonomy Pipeline');
      expect(names).toContain('Dove9 Conversational Bridge');
      expect(names).toContain('Echo Agent Loop');
      expect(names).toContain('Continuous Training Pipeline');
    });

    it('should register feedback loop wiring', async () => {
      await wiring.start();
      const status = wiring.getStatus();
      const names = status.components.map(c => c.name);

      expect(names).toContain('Feedback Loop Wiring');
    });
  });

  describe('Health Score', () => {
    it('should calculate health score based on healthy components', async () => {
      await wiring.start();
      const status = wiring.getStatus();
      // Most components should be healthy
      expect(status.healthScore).toBeGreaterThan(0.5);
    });

    it('should have reduced health when components are unhealthy', async () => {
      await wiring.start();
      // DeltaChat is registered but not running (waiting for RPC)
      const status = wiring.getStatus();
      // Not 1.0 because deltaChat is not healthy
      expect(status.healthScore).toBeLessThan(1.0);
    });
  });

  describe('Component Updates', () => {
    it('should update component status', async () => {
      await wiring.start();

      let updateEmitted = false;
      wiring.on('component_updated', () => { updateEmitted = true; });

      wiring.updateComponent('coreSelf', {
        healthy: true,
        details: { stage: 'DIFFERENTIATION', coherence: 0.75 },
      });

      expect(updateEmitted).toBe(true);
    });

    it('should ignore updates for non-existent components', async () => {
      await wiring.start();

      let updateEmitted = false;
      wiring.on('component_updated', () => { updateEmitted = true; });

      wiring.updateComponent('nonexistent', { healthy: false });
      expect(updateEmitted).toBe(false);
    });
  });

  describe('Shutdown', () => {
    it('should stop cleanly', async () => {
      await wiring.start();
      expect(wiring.isRunning()).toBe(true);

      await wiring.stop();
      expect(wiring.getPhase()).toBe('STOPPED');
      expect(wiring.isRunning()).toBe(false);
    });

    it('should mark all components as stopped', async () => {
      await wiring.start();
      await wiring.stop();

      const status = wiring.getStatus();
      for (const component of status.components) {
        expect(component.running).toBe(false);
        expect(component.healthy).toBe(false);
      }
    });

    it('should be idempotent', async () => {
      await wiring.stop(); // Should not throw when already stopped
      expect(wiring.getPhase()).toBe('IDLE');
    });

    it('should not start from non-IDLE/STOPPED phase', async () => {
      await wiring.start();
      // Try to start again while running
      await wiring.start();
      // Should still be running, not restarted
      expect(wiring.getPhase()).toBe('RUNNING');
    });
  });

  describe('Selective Component Enablement', () => {
    it('should skip disabled components', async () => {
      const minimalWiring = new ProductionOrchestrationWiring({
        enableDeltaChat: false,
        enableAutonomyPipeline: false,
        enableCoreSelf: true,
        enableEchobeats: true,
        enableLucyVM: false,
        enableReservoirFeedback: false,
        enableContinuousTraining: false,
        enableDove9Bridge: false,
        enableEchoAgentLoop: false,
        enableTelemetryShell: false,
        enableHFDeploy: false,
      });

      await minimalWiring.start();
      const status = minimalWiring.getStatus();
      const names = status.components.map(c => c.name);

      expect(names).toContain('CoreSelf Engine');
      expect(names).toContain('Echobeats (3-stream)');
      expect(names).not.toContain('DeltaChat Daemon');
      expect(names).not.toContain('Lucy VM (llama.cpp)');

      await minimalWiring.stop();
      minimalWiring.removeAllListeners();
    });
  });
});
