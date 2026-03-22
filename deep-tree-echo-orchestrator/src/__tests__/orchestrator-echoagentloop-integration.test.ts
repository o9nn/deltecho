import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * @fileoverview Integration Tests: Orchestrator ↔ EchoAgentLoop
 *
 * Verifies that the EchoAgentLoop is properly wired into the Orchestrator
 * and that the unified cognitive event loop drives the grand cycle.
 */
import { Orchestrator } from '../orchestrator.js';

describe('Orchestrator ↔ EchoAgentLoop Integration', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator({
      // Disable external services for unit testing
      enableDeltaChat: false,
      enableDovecot: false,
      enableIPC: false,
      enableScheduler: false,
      enableWebhooks: false,
      processIncomingMessages: false,
      // Enable cognitive subsystems (disable double-membrane in test env)
      enableDove9: true,
      enableSys6: true,
      enableDoubleMembrane: false, // Requires @deltecho/double-membrane package
      enableProactiveLoop: true,
      enableAutonomyPipeline: false, // Needs LLM config
      enableCoreSelf: false,         // Needs Lucy config
      // Enable EchoAgentLoop
      enableEchoAgentLoop: true,
      echoAgentLoop: {
        stepDurationMs: 50, // Fast for testing
        enableCognitiveProcessing: true,
        enableConversationalBridge: true,
        enableCosmicOrder: true,
        enableThreadMultiplexing: true,
        enableTriadCycling: true,
      },
    });
  });

  afterEach(async () => {
    if (orchestrator.isRunning()) {
      await orchestrator.stop();
    }
  });

  describe('startup', () => {
    it('should start with EchoAgentLoop active', async () => {
      await orchestrator.start();
      expect(orchestrator.isRunning()).toBe(true);

      const echoLoop = orchestrator.getEchoAgentLoop();
      expect(echoLoop).toBeDefined();
      expect(echoLoop!.isRunning()).toBe(true);
    });

    it('should expose EchoAgentLoop via getter', async () => {
      await orchestrator.start();
      const loop = orchestrator.getEchoAgentLoop();
      expect(loop).toBeDefined();
    });

    it('should include EchoAgentLoop in cognitive system status', async () => {
      await orchestrator.start();
      const status = orchestrator.getCognitiveSystemStatus();
      expect(status.echoAgentLoop).not.toBeNull();
      expect(status.echoAgentLoop!.running).toBe(true);
    });
  });

  describe('grand cycle operation', () => {
    it('should accumulate steps over time', async () => {
      await orchestrator.start();

      // Wait for a few ticks
      await new Promise(resolve => setTimeout(resolve, 200));

      const loop = orchestrator.getEchoAgentLoop()!;
      const metrics = loop.getMetrics();
      expect(metrics.totalSteps).toBeGreaterThan(0);
    });

    it('should advance through grand cycle state', async () => {
      await orchestrator.start();

      await new Promise(resolve => setTimeout(resolve, 150));

      const loop = orchestrator.getEchoAgentLoop()!;
      const state = loop.getGrandCycleState();
      expect(state.step).toBeGreaterThanOrEqual(0);
      expect(state.step).toBeLessThan(60);
      expect(state.dove9Step).toBeGreaterThanOrEqual(0);
      expect(state.dove9Step).toBeLessThan(12);
      expect(state.sys6Step).toBeGreaterThanOrEqual(0);
      expect(state.sys6Step).toBeLessThan(30);
    });

    it('should have conversational bridge active', async () => {
      await orchestrator.start();

      const loop = orchestrator.getEchoAgentLoop()!;
      const bridge = loop.getConversationalBridge();
      expect(bridge).toBeDefined();
      expect(bridge!.isRunning()).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should stop EchoAgentLoop on orchestrator stop', async () => {
      await orchestrator.start();
      const loop = orchestrator.getEchoAgentLoop()!;
      expect(loop.isRunning()).toBe(true);

      await orchestrator.stop();
      expect(loop.isRunning()).toBe(false);
    });

    it('should report null EchoAgentLoop status when disabled', async () => {
      const noLoopOrch = new Orchestrator({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        processIncomingMessages: false,
        enableDove9: false,
        enableSys6: false,
        enableDoubleMembrane: false, // Requires @deltecho/double-membrane
        enableProactiveLoop: false,
        enableAutonomyPipeline: false,
        enableCoreSelf: false,
        enableEchoAgentLoop: false,
      });

      await noLoopOrch.start();
      const status = noLoopOrch.getCognitiveSystemStatus();
      expect(status.echoAgentLoop).toBeNull();
      await noLoopOrch.stop();
    });
  });
});
