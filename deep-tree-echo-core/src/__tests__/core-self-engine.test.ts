// Core package uses standard jest (not @jest/globals)
import {
  CoreSelfEngine,
  IdentityMesh,
  LucyInferenceDriver,
  EchoReservoir,
} from '../core-self/index.js';

describe('IdentityMesh', () => {
  let mesh: IdentityMesh;

  beforeEach(() => {
    mesh = new IdentityMesh();
  });

  afterEach(async () => {
    await mesh.stop();
  });

  it('should initialize with default state', () => {
    const state = mesh.getState();
    expect(state).toBeDefined();
    expect(state.agent).toBeDefined();
    expect(state.arena).toBeDefined();
    expect(state.relation).toBeDefined();
    expect(state.relation.coherence).toBeGreaterThanOrEqual(0);
    expect(state.relation.coherence).toBeLessThanOrEqual(1);
  });

  it('should start at embryonic ontogenetic stage', () => {
    // Stage enum values are uppercase
    expect(mesh.getStage().toLowerCase()).toBe('embryonic');
  });

  it('should generate a system prompt', () => {
    const prompt = mesh.generateSystemPrompt();
    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('Deep Tree Echo');
  });

  it('should record experiences and update state', () => {
    const initialState = mesh.getState();
    const initialExperiences = initialState.arena.totalExperiences;

    mesh.recordExperience({
      type: 'conversation',
      content: 'Hello, who are you?',
      significance: 0.5,
    });

    const updatedState = mesh.getState();
    expect(updatedState.arena.totalExperiences).toBeGreaterThan(initialExperiences);
  });

  it('should update emotional state with emotional impact', () => {
    const initialState = mesh.getState();
    const initialValence = initialState.arena.valence;

    mesh.recordExperience({
      type: 'conversation',
      content: 'This is wonderful!',
      significance: 0.8,
      emotionalImpact: { valence: 0.9, arousal: 0.7 },
    });

    const updatedState = mesh.getState();
    // Valence should shift toward 0.9 (positive)
    expect(updatedState.arena.valence).not.toBe(initialValence);
  });

  it('should accumulate experience points', () => {
    const initialXP = mesh.getState().experiencePoints;

    for (let i = 0; i < 5; i++) {
      mesh.recordExperience({
        type: 'conversation',
        content: `Interaction ${i}`,
        significance: 0.5,
      });
    }

    expect(mesh.getState().experiencePoints).toBeGreaterThan(initialXP);
  });

  it('should compute coherence score between 0 and 1', () => {
    const state = mesh.getState();
    expect(typeof state.relation.coherence).toBe('number');
    expect(state.relation.coherence).toBeGreaterThanOrEqual(0);
    expect(state.relation.coherence).toBeLessThanOrEqual(1);
  });
});

describe('LucyInferenceDriver', () => {
  let driver: LucyInferenceDriver;

  beforeEach(() => {
    driver = new LucyInferenceDriver();
  });

  afterEach(async () => {
    await driver.stop();
  });

  it('should initialize with default config', () => {
    expect(driver).toBeDefined();
    expect(driver.isHealthy()).toBe(false); // No server running
  });

  it('should report unhealthy when no server is available', () => {
    expect(driver.isHealthy()).toBe(false);
  });

  it('should support custom base URL configuration', () => {
    const custom = new LucyInferenceDriver({
      baseUrl: 'http://localhost:9999',
      modelName: 'custom-model',
    });
    expect(custom).toBeDefined();
    expect(custom.isHealthy()).toBe(false);
  });

  it('should throw when server is unavailable', async () => {
    await driver.start();
    // chatCompletion throws when no server is reachable
    await expect(
      driver.chatCompletion([{ role: 'user', content: 'Hello' }])
    ).rejects.toThrow();
  });
});

describe('EchoReservoir', () => {
  let reservoir: EchoReservoir;

  beforeEach(() => {
    reservoir = new EchoReservoir({ units: 64, inputDim: 5 });
  });

  it('should initialize with default reservoir config', () => {
    expect(reservoir).toBeDefined();
    const state = reservoir.getState();
    expect(state).toBeDefined();
    expect(state.tick).toBe(0);
    expect(state.energy).toBe(0);
  });

  it('should process input through the reservoir via step()', () => {
    const input = new Float64Array([0.1, 0.2, 0.3, 0.4, 0.5]);
    const output = reservoir.step(input);
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
  });

  it('should maintain echo state across multiple inputs', () => {
    const input1 = new Float64Array([0.1, 0.2, 0.3, 0.4, 0.5]);
    const input2 = new Float64Array([0.4, 0.5, 0.6, 0.7, 0.8]);

    reservoir.step(input1);
    const state1 = reservoir.getState();

    reservoir.step(input2);
    const state2 = reservoir.getState();

    // Tick should increment
    expect(state2.tick).toBeGreaterThan(state1.tick);
  });

  it('should have fast and slow pools in state', () => {
    const input = new Float64Array([0.5, 0.5, 0.5, 0.5, 0.5]);
    reservoir.step(input);

    const state = reservoir.getState();
    expect(state.fast).toBeDefined();
    expect(state.slow).toBeDefined();
    expect(state.combined).toBeDefined();
    expect(state.fast.length).toBeGreaterThan(0);
    expect(state.slow.length).toBeGreaterThan(0);
  });

  it('should compute energy (L2 norm of combined state)', () => {
    const input = new Float64Array([0.5, 0.5, 0.5, 0.5, 0.5]);
    reservoir.step(input);

    const state = reservoir.getState();
    expect(state.energy).toBeGreaterThan(0);
  });

  it('should reset reservoir state', () => {
    const input = new Float64Array([0.1, 0.2, 0.3, 0.4, 0.5]);
    reservoir.step(input);
    expect(reservoir.getState().tick).toBeGreaterThan(0);

    reservoir.reset();
    expect(reservoir.getState().tick).toBe(0);
    expect(reservoir.getState().energy).toBe(0);
  });

  it('should serialize and deserialize', () => {
    const input = new Float64Array([0.1, 0.2, 0.3, 0.4, 0.5]);
    reservoir.step(input);
    reservoir.step(input);

    const serialized = reservoir.serialize();
    expect(serialized).toBeDefined();
    expect(serialized.tick).toBe(2);

    // Deserialize into a new reservoir
    const restored = EchoReservoir.deserialize(serialized);
    expect(restored.getState().tick).toBe(2);
  });

  it('should exhibit echo state property (fading memory)', () => {
    // Feed a strong signal then silence
    const signal = new Float64Array([1.0, 1.0, 1.0, 1.0, 1.0]);
    const silence = new Float64Array([0.0, 0.0, 0.0, 0.0, 0.0]);

    reservoir.step(signal);
    const energyAfterSignal = reservoir.getState().energy;

    // Feed silence for several steps
    for (let i = 0; i < 20; i++) {
      reservoir.step(silence);
    }
    const energyAfterSilence = reservoir.getState().energy;

    // Energy should decay (echo state property)
    expect(energyAfterSilence).toBeLessThan(energyAfterSignal);
  });
});

describe('CoreSelfEngine', () => {
  let engine: CoreSelfEngine;

  beforeEach(() => {
    engine = new CoreSelfEngine();
  });

  afterEach(async () => {
    if (engine.isRunning()) {
      await engine.stop();
    }
  });

  it('should initialize with all three subsystems', () => {
    expect(engine).toBeDefined();
    expect(engine.getIdentity()).toBeInstanceOf(IdentityMesh);
    expect(engine.getLucy()).toBeInstanceOf(LucyInferenceDriver);
    expect(engine.getReservoir()).toBeInstanceOf(EchoReservoir);
  });

  it('should start and stop cleanly', async () => {
    await engine.start();
    expect(engine.isRunning()).toBe(true);

    await engine.stop();
    expect(engine.isRunning()).toBe(false);
  });

  it('should process messages and return structured responses', async () => {
    await engine.start();

    const response = await engine.processMessage('Hello, who are you?');
    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(typeof response.content).toBe('string');
    expect(response.source).toBeDefined();
    expect(['core-self', 'api-augmented', 'fallback']).toContain(response.source);
    expect(response.aarState).toBeDefined();
    expect(response.aarState.coherence).toBeDefined();
    expect(response.identity).toBeDefined();
    expect(response.identity.stage).toBeDefined();
  });

  it('should update identity mesh after processing', async () => {
    await engine.start();

    const stateBefore = engine.getIdentity().getState();
    const xpBefore = stateBefore.experiencePoints;

    await engine.processMessage('Tell me about yourself');

    const stateAfter = engine.getIdentity().getState();
    expect(stateAfter.experiencePoints).toBeGreaterThanOrEqual(xpBefore);
  });

  it('should process through reservoir bridge', async () => {
    await engine.start();

    const tickBefore = engine.getReservoir().getState().tick;
    await engine.processMessage('Process this through the reservoir');
    const tickAfter = engine.getReservoir().getState().tick;

    expect(tickAfter).toBeGreaterThan(tickBefore);
  });

  it('should support custom configuration', () => {
    const custom = new CoreSelfEngine({
      lucy: { baseUrl: 'http://localhost:9999' },
      reservoir: { units: 64 },
    });
    expect(custom).toBeDefined();
    expect(custom.getReservoir()).toBeInstanceOf(EchoReservoir);
  });

  it('should report running state correctly', async () => {
    expect(engine.isRunning()).toBe(false);
    await engine.start();
    expect(engine.isRunning()).toBe(true);
    await engine.stop();
    expect(engine.isRunning()).toBe(false);
  });
});
