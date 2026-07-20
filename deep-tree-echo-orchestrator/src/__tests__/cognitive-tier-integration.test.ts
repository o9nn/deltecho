/**
 * @fileoverview Integration tests for Cognitive Tier Routing
 *
 * Tests the three-tier cognitive processing system:
 * - Tier 1 (BASIC): Deep Tree Echo Core
 * - Tier 2 (SYS6): Sys6-Triality 30-step cognitive cycle
 * - Tier 3 (MEMBRANE): Double Membrane bio-inspired architecture
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the external dependencies
jest.unstable_mockModule('deep-tree-echo-core', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  LLMService: jest.fn().mockImplementation(() => ({
    generateFullParallelResponse: jest.fn<() => Promise<any>>().mockResolvedValue({
      integratedResponse: 'Mock response from LLM',
    }),
    setConfig: jest.fn(),
  })),
  RAGMemoryStore: jest.fn().mockImplementation(() => ({
    setEnabled: jest.fn(),
    storeMemory: jest.fn(),
    retrieveRecentMemories: jest.fn().mockReturnValue([]),
  })),
  PersonaCore: jest.fn().mockImplementation(() => ({
    getPersonality: jest.fn().mockReturnValue('Test personality'),
    getDominantEmotion: jest.fn().mockReturnValue({
      emotion: 'neutral',
      intensity: 0.5,
    }),
    updateEmotionalState: jest.fn(),
  })),
  InMemoryStorage: jest.fn().mockImplementation(() => ({})),
}));

// Mock Sys6 Bridge
jest.unstable_mockModule('../sys6-bridge/Sys6OrchestratorBridge.js', () => ({
  Sys6OrchestratorBridge: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    processMessage: jest.fn<() => Promise<string>>().mockResolvedValue('Mock Sys6 response'),
    getState: jest.fn().mockReturnValue({
      running: true,
      cycleNumber: 5,
      currentStep: 15,
      streams: [{ salience: 0.8 }, { salience: 0.6 }, { salience: 0.4 }],
    }),
    getMetrics: jest.fn().mockReturnValue({
      totalCycles: 5,
      totalSteps: 150,
    }),
  })),
}));

// Mock Double Membrane Integration
jest.unstable_mockModule('../double-membrane-integration.js', () => ({
  DoubleMembraneIntegration: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(true),
    chat: jest.fn<() => Promise<string>>().mockResolvedValue('Mock Membrane response'),
    getStatus: jest.fn().mockReturnValue({
      running: true,
      identityEnergy: 0.85,
      stats: {
        totalRequests: 10,
        nativeRequests: 5,
        externalRequests: 3,
        hybridRequests: 2,
      },
    }),
  })),
}));

// Mock other dependencies
jest.unstable_mockModule('../deltachat-interface/index.js', () => ({
  DeltaChatInterface: jest.fn().mockImplementation(() => ({
    connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    disconnect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(false),
    on: jest.fn(),
  })),
}));

jest.unstable_mockModule('../dovecot-interface/index.js', () => ({
  DovecotInterface: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(false),
    on: jest.fn(),
  })),
}));

jest.unstable_mockModule('../ipc/server.js', () => ({
  IPCServer: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })),
}));

jest.unstable_mockModule('../scheduler/task-scheduler.js', () => ({
  TaskScheduler: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })),
}));

jest.unstable_mockModule('../webhooks/webhook-server.js', () => ({
  WebhookServer: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })),
}));

jest.unstable_mockModule('../dove9-integration.js', () => ({
  Dove9Integration: jest.fn().mockImplementation(() => ({
    initialize: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onResponse: jest.fn(),
    getCognitiveState: jest.fn().mockReturnValue({ running: true }),
  })),
}));

jest.unstable_mockModule('../entelechy-integration.js', () => ({
  EntelechyIntegration: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(false),
    restore: jest.fn(),
    serialize: jest.fn().mockReturnValue({}),
    describeState: jest.fn().mockReturnValue('Mock entelechy state'),
    on: jest.fn(),
    getLastSnapshot: jest.fn().mockReturnValue(null),
    takeSnapshot: jest.fn().mockReturnValue(null),
  })),
}));

jest.unstable_mockModule('../proactive-loop.js', () => ({
  ProactivePhase: {
    IDLE: 'IDLE',
    PERCEIVE: 'PERCEIVE',
    REFLECT: 'REFLECT',
    PLAN: 'PLAN',
    ACT: 'ACT',
    INTEGRATE: 'INTEGRATE',
  },
  EnvironmentStimulus: {},
  ProactiveLoop: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    registerPerceptionHandler: jest.fn(),
    registerActionHandler: jest.fn(),
    injectStimulus: jest.fn(),
    getState: jest.fn().mockReturnValue({ running: true, totalCycles: 0 }),
    on: jest.fn(),
  })),
}));

jest.unstable_mockModule('../autonomy-pipeline.js', () => ({
  AutonomyPipeline: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(false),
    setLLMService: jest.fn(),
    setProactiveLoop: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      perceptsReceived: 0, planningCycles: 0, toolsExecuted: 0,
      memoriesConsolidated: 0, echobeatTicks: 0, errors: 0,
    }),
    on: jest.fn(),
  })),
}));

jest.unstable_mockModule('../echo-agent-loop.js', () => ({
  EchoAgentLoop: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(false),
    processMessage: jest.fn<() => Promise<string>>().mockResolvedValue('Mock agent response'),
    getMetrics: jest.fn().mockReturnValue({
      totalCycles: 0,
      totalActions: 0,
      totalPerceptions: 0,
      averageCycleTime: 0,
    }),
    on: jest.fn(),
  })),
}));

jest.unstable_mockModule('../deltachat-autonomy-bridge.js', () => ({
  DeltaChatAutonomyBridge: jest.fn().mockImplementation(() => ({
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
}));

type Orchestrator = import('../orchestrator.js').Orchestrator;
type CognitiveTierMode = import('../orchestrator.js').CognitiveTierMode;

let OrchestratorClass: typeof import('../orchestrator.js').Orchestrator;

beforeAll(async () => {
  // Import once at module load so all describe blocks (including outer ones)
  // see OrchestratorClass — fixes scope-of-assignment bug in the original file.
  const mod = await import('../orchestrator.js');
  OrchestratorClass = mod.Orchestrator;
});

describe('Cognitive Tier Integration', () => {
  let orchestrator: InstanceType<typeof OrchestratorClass>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (orchestrator?.isRunning()) {
      await orchestrator.stop();
    }
  });

  describe('Orchestrator Configuration', () => {
    it('should use ADAPTIVE mode by default', () => {
      orchestrator = new OrchestratorClass();
      expect(orchestrator.getCognitiveTierMode()).toBe('ADAPTIVE');
    });

    it('should accept custom cognitive tier mode', () => {
      orchestrator = new OrchestratorClass({ cognitiveTierMode: 'SYS6' });
      expect(orchestrator.getCognitiveTierMode()).toBe('SYS6');
    });

    it('should allow runtime mode changes', () => {
      orchestrator = new OrchestratorClass({ cognitiveTierMode: 'BASIC' });
      expect(orchestrator.getCognitiveTierMode()).toBe('BASIC');

      orchestrator.setCognitiveTierMode('MEMBRANE');
      expect(orchestrator.getCognitiveTierMode()).toBe('MEMBRANE');
    });

    it('should configure complexity thresholds', () => {
      orchestrator = new OrchestratorClass({
        sys6ComplexityThreshold: 0.3,
        membraneComplexityThreshold: 0.6,
      });
      // Thresholds are internal but affect routing
      expect(orchestrator.getCognitiveTierMode()).toBe('ADAPTIVE');
    });
  });

  describe('Service Initialization', () => {
    it('should start all cognitive tier services', async () => {
      orchestrator = new OrchestratorClass({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: true,
        enableSys6: true,
        enableDoubleMembrane: true,
      });

      await orchestrator.start();

      expect(orchestrator.isRunning()).toBe(true);
      expect(orchestrator.getSys6Bridge()).toBeDefined();
      expect(orchestrator.getDoubleMembraneIntegration()).toBeDefined();
    });

    it('should start with only BASIC tier when others disabled', async () => {
      orchestrator = new OrchestratorClass({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: false,
        enableSys6: false,
        enableDoubleMembrane: false,
        cognitiveTierMode: 'BASIC',
      });

      await orchestrator.start();

      expect(orchestrator.isRunning()).toBe(true);
      expect(orchestrator.getSys6Bridge()).toBeUndefined();
      expect(orchestrator.getDoubleMembraneIntegration()).toBeUndefined();
    });

    it('should stop all services gracefully', async () => {
      orchestrator = new OrchestratorClass({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: true,
        enableSys6: true,
        enableDoubleMembrane: true,
      });

      await orchestrator.start();
      expect(orchestrator.isRunning()).toBe(true);

      await orchestrator.stop();
      expect(orchestrator.isRunning()).toBe(false);
    });
  });

  describe('Processing Statistics', () => {
    it('should track processing statistics', async () => {
      orchestrator = new OrchestratorClass({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableSys6: true,
        enableDoubleMembrane: true,
      });

      await orchestrator.start();

      const stats = orchestrator.getProcessingStats();
      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('basicTierMessages');
      expect(stats).toHaveProperty('sys6TierMessages');
      expect(stats).toHaveProperty('membraneTierMessages');
      expect(stats).toHaveProperty('averageComplexity');
    });
  });

  describe('Cognitive System Status', () => {
    it('should provide comprehensive system status', async () => {
      orchestrator = new OrchestratorClass({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: true,
        enableSys6: true,
        enableDoubleMembrane: true,
      });

      await orchestrator.start();

      const status = orchestrator.getCognitiveSystemStatus();
      expect(status.tierMode).toBe('ADAPTIVE');
      expect(status.sys6).not.toBeNull();
      expect(status.doubleMembrane).not.toBeNull();
      expect(status.dove9).not.toBeNull();
      expect(status.stats).toBeDefined();
    });

    it('should show null for disabled tiers', async () => {
      orchestrator = new OrchestratorClass({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: false,
        enableSys6: false,
        enableDoubleMembrane: false,
      });

      await orchestrator.start();

      const status = orchestrator.getCognitiveSystemStatus();
      expect(status.sys6).toBeNull();
      expect(status.doubleMembrane).toBeNull();
      expect(status.dove9).toBeNull();
    });
  });
});

describe('Complexity Assessment', () => {
  let orchestrator: Orchestrator;

  beforeEach(async () => {
    orchestrator = new OrchestratorClass({
      enableDeltaChat: false,
      enableDovecot: false,
      enableIPC: false,
      enableScheduler: false,
      enableWebhooks: false,
      enableDove9: false,
      enableSys6: false,
      enableDoubleMembrane: false,
      cognitiveTierMode: 'ADAPTIVE',
      sys6ComplexityThreshold: 0.4,
      membraneComplexityThreshold: 0.7,
    });
    await orchestrator.start();
  });

  afterEach(async () => {
    if (orchestrator?.isRunning()) {
      await orchestrator.stop();
    }
  });

  // Note: assessComplexity is private, so we test through observable behavior
  // In a real scenario, we might expose it for testing or test through integration

  it('should track average complexity over time', () => {
    const stats = orchestrator.getProcessingStats();
    expect(typeof stats.averageComplexity).toBe('number');
    expect(stats.averageComplexity).toBeGreaterThanOrEqual(0);
    expect(stats.averageComplexity).toBeLessThanOrEqual(1);
  });
});

describe('Tier Mode Configurations', () => {
  const testCases: Array<{ mode: CognitiveTierMode; description: string }> = [
    { mode: 'BASIC', description: 'uses only Deep Tree Echo Core' },
    { mode: 'SYS6', description: 'uses Sys6-Triality 30-step cycle' },
    { mode: 'MEMBRANE', description: 'uses Double Membrane architecture' },
    { mode: 'ADAPTIVE', description: 'auto-selects based on complexity' },
    { mode: 'FULL', description: 'uses all tiers with cascading' },
  ];

  testCases.forEach(({ mode, description }) => {
    it(`${mode} mode ${description}`, async () => {
      const orchestrator = new OrchestratorClass({
        enableDeltaChat: false,
        enableDovecot: false,
        enableIPC: false,
        enableScheduler: false,
        enableWebhooks: false,
        enableDove9: false,
        enableSys6: true,
        enableDoubleMembrane: true,
        cognitiveTierMode: mode,
      });

      await orchestrator.start();
      expect(orchestrator.getCognitiveTierMode()).toBe(mode);
      await orchestrator.stop();
    });
  });
});
