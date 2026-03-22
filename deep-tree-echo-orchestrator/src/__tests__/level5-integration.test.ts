import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Echobeats } from '../echobeats.js';
import { AutonomyLifecycleCoordinator, AutonomyPhase } from '../autonomy-lifecycle.js';
import { CognitiveTickProcessor } from '../cognitive-tick-processor.js';
import { DeltaChatAutonomyBridge } from '../deltachat-autonomy-bridge.js';

// ─── System 5 Tetradic Structure ──────────────────────────────

describe('Echobeats System 5 Tetradic', () => {
  let echobeats: Echobeats;

  beforeEach(() => {
    echobeats = new Echobeats({
      cycleInterval: 50,
      enableMultiplexing: true,
      enableNestedShells: true,
    });
  });

  afterEach(() => {
    echobeats.stop();
  });

  it('should evolve from System 4 (3 streams) to System 5 (4 threads)', () => {
    expect(echobeats.getStreams().length).toBe(3);
    expect(echobeats.isSystem5Active()).toBe(false);

    echobeats.evolveToSystem5();

    expect(echobeats.isSystem5Active()).toBe(true);
    expect(echobeats.getStreams().length).toBe(4);
    expect(echobeats.getStreams()[3].name).toBe('integration');
  });

  it('should create 4 tensor bundles with correct symmetries', () => {
    echobeats.evolveToSystem5();

    const bundles = echobeats.getThreadBundles();
    expect(bundles.length).toBe(4);

    // Each bundle has 3 threads and 3 edges
    for (const bundle of bundles) {
      expect(bundle.threads.length).toBe(3);
      expect(bundle.edges.length).toBe(3);
    }

    // Check symmetry names
    const symmetries = bundles.map(b => b.symmetry);
    expect(symmetries).toContain('operational');
    expect(symmetries).toContain('executive');
    expect(symmetries).toContain('reflective');
    expect(symmetries).toContain('generative');
  });

  it('should have full complementarity (each triad contains 3 of 4 threads)', () => {
    echobeats.evolveToSystem5();

    const bundles = echobeats.getThreadBundles();

    // Each thread should appear in exactly 3 bundles
    for (let threadId = 0; threadId < 4; threadId++) {
      const count = bundles.filter(b => b.threads.includes(threadId)).length;
      expect(count).toBe(3);
    }
  });

  it('should have 6 dyadic edges total across all bundles', () => {
    echobeats.evolveToSystem5();

    const bundles = echobeats.getThreadBundles();
    const allEdges = new Set<string>();

    for (const bundle of bundles) {
      for (const edge of bundle.edges) {
        allEdges.add(`${edge[0]}-${edge[1]}`);
      }
    }

    expect(allEdges.size).toBe(6); // C(4,2) = 6 unique pairs
  });

  it('should add System 5 shell with 9 terms (OEIS A000081 for N=4)', () => {
    echobeats.evolveToSystem5();

    const shells = echobeats.getShells();
    const sys5Shell = shells.find(s => s.name === 'system5-tetrad');
    expect(sys5Shell).toBeDefined();
    expect(sys5Shell!.termCount).toBe(9);
    expect(sys5Shell!.activeStreams.length).toBe(4);
  });

  it('should not double-evolve', () => {
    echobeats.evolveToSystem5();
    const streamsBefore = echobeats.getStreams().length;

    echobeats.evolveToSystem5(); // Should be a no-op
    expect(echobeats.getStreams().length).toBe(streamsBefore);
  });

  it('should emit system5_evolved event', (done) => {
    echobeats.on('system5_evolved', (data) => {
      expect(data.threads.length).toBe(4);
      expect(data.bundles.length).toBe(4);
      done();
    });

    echobeats.evolveToSystem5();
  });

  it('should get current bundle based on triad rotation', () => {
    expect(echobeats.getCurrentBundle()).toBeNull(); // Not System 5 yet

    echobeats.evolveToSystem5();
    const bundle = echobeats.getCurrentBundle();
    expect(bundle).toBeDefined();
    expect(bundle!.symmetry).toBeDefined();
  });
});

// ─── Telemetry ────────────────────────────────────────────────

describe('Echobeats Telemetry', () => {
  let echobeats: Echobeats;

  beforeEach(() => {
    echobeats = new Echobeats({ cycleInterval: 20 });
  });

  afterEach(() => {
    echobeats.stop();
  });

  it('should record telemetry on each tick', (done) => {
    let tickCount = 0;

    echobeats.on('tick', () => {
      tickCount++;
      if (tickCount >= 5) {
        echobeats.stop();
        // Telemetry is recorded after the tick event, so check after a microtask
        setTimeout(() => {
          const telemetry = echobeats.getTelemetry();
          expect(telemetry.recentTicks.length).toBeGreaterThanOrEqual(3);
          expect(telemetry.averageEnergy).toBeGreaterThan(0);
          done();
        }, 50);
      }
    });

    echobeats.start();
  });

  it('should report System 5 status in telemetry', () => {
    const telemetry1 = echobeats.getTelemetry();
    expect(telemetry1.system5Active).toBe(false);

    echobeats.evolveToSystem5();
    const telemetry2 = echobeats.getTelemetry();
    expect(telemetry2.system5Active).toBe(true);
  });

  it('should calculate ticks per second', (done) => {
    let tickCount = 0;

    echobeats.on('tick', () => {
      tickCount++;
      if (tickCount >= 5) {
        echobeats.stop();
        const telemetry = echobeats.getTelemetry();
        expect(telemetry.ticksPerSecond).toBeGreaterThan(0);
        done();
      }
    });

    echobeats.start();
  });
});

// ─── Inverted Mirror Feedback ─────────────────────────────────

describe('Inverted Mirror → Echobeats Feedback', () => {
  let lifecycle: AutonomyLifecycleCoordinator;
  let echobeats: Echobeats;
  let processor: CognitiveTickProcessor;

  beforeEach(() => {
    processor = new CognitiveTickProcessor();
    lifecycle = new AutonomyLifecycleCoordinator({}, processor);
    echobeats = new Echobeats({ cycleInterval: 50 });
  });

  afterEach(() => {
    lifecycle.stop();
    echobeats.stop();
  });

  it('should wire Echobeats to lifecycle coordinator', () => {
    lifecycle.wireEchobeats(echobeats);
    // Should not throw
    expect(lifecycle.isRunning()).toBe(false);
  });

  it('should emit mirror_feedback event during MIRRORING phase', async () => {
    lifecycle.wireEchobeats(echobeats);
    echobeats.start();

    const feedbackPromise = new Promise<void>((resolve) => {
      echobeats.on('mirror_feedback', (data) => {
        expect(data.coherence).toBeDefined();
        expect(data.energyModulation).toBeDefined();
        expect(data.currentEnergy).toBeDefined();
        expect(data.targetEnergy).toBeDefined();
        resolve();
      });
    });

    // Execute MIRRORING phase
    await lifecycle.executePhase(AutonomyPhase.MIRRORING);
    await feedbackPromise;

    echobeats.stop();
  });

  it('should include energyModulation in mirroring result', async () => {
    lifecycle.wireEchobeats(echobeats);
    echobeats.start();

    const result = await lifecycle.executePhase(AutonomyPhase.MIRRORING);
    expect(result.stateChanges).toHaveProperty('energyModulation');
    expect(result.stateChanges).toHaveProperty('echobeatsFeedback');
    expect(result.stateChanges.echobeatsFeedback).toBe(true);

    echobeats.stop();
  });

  it('should emit system5 feedback when System 5 is active', async () => {
    lifecycle.wireEchobeats(echobeats);
    echobeats.evolveToSystem5();
    echobeats.start();

    const feedbackPromise = new Promise<void>((resolve) => {
      lifecycle.on('mirror:system5_feedback', (data) => {
        expect(data.coherence).toBeDefined();
        expect(data.activeBundle).toBeDefined();
        expect(data.energyModulation).toBeDefined();
        resolve();
      });
    });

    await lifecycle.executePhase(AutonomyPhase.MIRRORING);
    await feedbackPromise;

    echobeats.stop();
  });

  it('should get inverted mirror state', () => {
    lifecycle.wireEchobeats(echobeats);
    echobeats.start();

    const mirrorState = lifecycle.getInvertedMirrorState();
    expect(mirrorState.virtualAgent).toBeDefined();
    expect(mirrorState.coherence).toBeDefined();
    expect(mirrorState.drift).toBeDefined();
    expect(mirrorState.echobeatsFeedback).toBe(true);

    echobeats.stop();
  });
});

// ─── DeltaChat Autonomy Bridge ────────────────────────────────

describe('DeltaChatAutonomyBridge', () => {
  // We need a mock AutonomyPipeline for the bridge tests
  let mockPipeline: any;
  let bridge: DeltaChatAutonomyBridge;

  beforeEach(() => {
    // Create a minimal mock pipeline
    mockPipeline = {
      getCognitiveProcessor: jest.fn().mockReturnValue({
        injectPercept: jest.fn(),
        getGoals: jest.fn().mockReturnValue([]),
      }),
      storeMessage: jest.fn().mockResolvedValue(undefined as never),
      searchMemory: jest.fn().mockResolvedValue([] as never),
      processWithCoreSelf: jest.fn().mockResolvedValue({
        content: 'Hello from DTE core self',
        source: 'core-self',
        coherence: 0.8,
        stage: 'developing',
      } as never),
      getStats: jest.fn().mockReturnValue({
        cognitiveState: {
          latestSelfImage: { coherenceScore: 0.75 },
        },
      }),
    };

    bridge = new DeltaChatAutonomyBridge(mockPipeline as any);
  });

  it('should process incoming messages', async () => {
    const response = await bridge.processMessage({
      chatId: 1,
      messageId: 100,
      accountId: 1,
      senderAddress: 'test@example.com',
      senderName: 'Test User',
      text: 'Hello, Deep Tree Echo!',
      timestamp: Date.now(),
      isGroup: false,
    });

    expect(response).toBeDefined();
    expect(response.text).toBe('Hello from DTE core self');
    expect(response.source).toBe('core-self');
    expect(response.coherence).toBe(0.8);
    expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should inject percepts into cognitive processor', async () => {
    await bridge.processMessage({
      chatId: 1,
      messageId: 100,
      accountId: 1,
      senderAddress: 'test@example.com',
      senderName: 'Test User',
      text: 'Test message',
      timestamp: Date.now(),
      isGroup: false,
    });

    const processor = mockPipeline.getCognitiveProcessor();
    expect(processor.injectPercept).toHaveBeenCalledTimes(1);
    const percept = (processor.injectPercept as any).mock.calls[0][0];
    expect(percept.source).toBe('message');
    expect(percept.content).toBe('Test message');
  });

  it('should store messages in vector memory', async () => {
    await bridge.processMessage({
      chatId: 1,
      messageId: 100,
      accountId: 1,
      senderAddress: 'test@example.com',
      senderName: 'Test User',
      text: 'Store this',
      timestamp: Date.now(),
      isGroup: false,
    });

    // Should store both the user message and the bot response
    expect(mockPipeline.storeMessage).toHaveBeenCalledTimes(2);
  });

  it('should compute salience correctly', async () => {
    // Direct message mentioning DTE should have high salience
    const response = await bridge.processMessage({
      chatId: 1,
      messageId: 100,
      accountId: 1,
      senderAddress: 'test@example.com',
      senderName: 'Test User',
      text: 'Hey Echo, what do you think?',
      timestamp: Date.now(),
      isGroup: false,
    });

    const processor = mockPipeline.getCognitiveProcessor();
    const percept = (processor.injectPercept as any).mock.calls[0][0];
    // Direct message (+0.2) + question (+0.1) + mentions echo (+0.3) = 0.5 + 0.6 = 1.0 (capped)
    expect(percept.salience).toBeGreaterThanOrEqual(0.8);
  });

  it('should track stats', async () => {
    await bridge.processMessage({
      chatId: 1,
      messageId: 100,
      accountId: 1,
      senderAddress: 'test@example.com',
      senderName: 'Test User',
      text: 'Hello',
      timestamp: Date.now(),
      isGroup: false,
    });

    const stats = bridge.getStats();
    expect(stats.messagesReceived).toBe(1);
    expect(stats.responsesGenerated).toBe(1);
    expect(stats.coreSelResponses).toBe(1);
    expect(stats.perceptsInjected).toBe(1);
  });

  it('should handle errors gracefully', async () => {
    mockPipeline.processWithCoreSelf.mockRejectedValue(new Error('LLM unavailable') as never);

    // Add error listener to prevent Node.js unhandled error
    bridge.on('error', () => { /* expected */ });

    const response = await bridge.processMessage({
      chatId: 1,
      messageId: 100,
      accountId: 1,
      senderAddress: 'test@example.com',
      senderName: 'Test User',
      text: 'This will fail',
      timestamp: Date.now(),
      isGroup: false,
    });

    expect(response.source).toBe('fallback');
    expect(response.text).toBe('');

    const stats = bridge.getStats();
    expect(stats.errors).toBe(1);
  });

  it('should truncate long responses', async () => {
    const longResponse = 'x'.repeat(5000);
    mockPipeline.processWithCoreSelf.mockResolvedValue({
      content: longResponse,
      source: 'core-self',
      coherence: 0.8,
      stage: 'developing',
    } as never);

    bridge.updateConfig({ maxResponseLength: 100 });

    const response = await bridge.processMessage({
      chatId: 1,
      messageId: 100,
      accountId: 1,
      senderAddress: 'test@example.com',
      senderName: 'Test User',
      text: 'Give me a long response',
      timestamp: Date.now(),
      isGroup: false,
    });

    expect(response.text.length).toBeLessThanOrEqual(100);
    expect(response.text.endsWith('...')).toBe(true);
  });

  it('should not generate proactive messages when disabled', async () => {
    bridge.updateConfig({ enableProactiveMessaging: false });
    const result = await bridge.checkProactiveMessage();
    expect(result).toBeNull();
  });
});
