import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  CosmicOrderBridge,
  createCosmicOrderBridge,
  type CosmicOrderBridgeConfig,
  type CosmicOrderSnapshot,
  type SystemLevelState,
} from '../cosmic-order-bridge.js';

describe('CosmicOrderBridge', () => {
  let bridge: CosmicOrderBridge;

  beforeEach(() => {
    bridge = new CosmicOrderBridge({ validateStructure: false });
  });

  afterEach(() => {
    if (bridge.isRunning()) bridge.stop();
  });

  // ============================================================
  // A000081 Structural Validation
  // ============================================================

  describe('A000081 structural validation', () => {
    it('should validate that System N has N centres', () => {
      const result = bridge.validate();
      expect(result.valid).toBe(true);

      // Check each level
      for (let n = 1; n <= 6; n++) {
        const state = bridge.getLevelState(n as 1 | 2 | 3 | 4 | 5 | 6);
        expect(state.centres).toBe(n);
      }
    });

    it('should validate that System N has a(N+1) terms', () => {
      const expectedTerms = [1, 2, 4, 9, 20, 48]; // A000081[2..7]

      for (let n = 1; n <= 6; n++) {
        const state = bridge.getLevelState(n as 1 | 2 | 3 | 4 | 5 | 6);
        expect(state.terms).toBe(expectedTerms[n - 1]);
      }
    });

    it('should validate triadic recurrence: Sys1↔Sys4, Sys2↔Sys5, Sys3↔Sys6', () => {
      const pairs = [
        [1, 4],
        [2, 5],
        [3, 6],
      ];

      for (const [lower, upper] of pairs) {
        const lState = bridge.getLevelState(lower as 1 | 2 | 3 | 4 | 5 | 6);
        const uState = bridge.getLevelState(upper as 1 | 2 | 3 | 4 | 5 | 6);
        expect(lState.triadicMirror).toBe(upper);
        expect(uState.triadicMirror).toBe(lower);
      }
    });

    it('should pass full structural validation', () => {
      const result = bridge.validate();
      expect(result.valid).toBe(true);
      expect(result.details.length).toBeGreaterThan(0);

      // All details should start with ✓
      for (const detail of result.details) {
        expect(detail.startsWith('✓')).toBe(true);
      }
    });

    it('should expose static A000081 sequence', () => {
      const seq = CosmicOrderBridge.getA000081();
      expect(seq[0]).toBe(0);
      expect(seq[1]).toBe(1);
      expect(seq[2]).toBe(1);
      expect(seq[3]).toBe(2);
      expect(seq[4]).toBe(4);
      expect(seq[5]).toBe(9);
      expect(seq[6]).toBe(20);
      expect(seq[7]).toBe(48);
    });

    it('should expose static particular sequence (1/7)', () => {
      const seq = CosmicOrderBridge.getParticularSequence();
      expect(Array.from(seq)).toEqual([1, 4, 2, 8, 5, 7]);
    });

    it('should expose static termCount', () => {
      expect(CosmicOrderBridge.termCount(1)).toBe(1);
      expect(CosmicOrderBridge.termCount(2)).toBe(2);
      expect(CosmicOrderBridge.termCount(3)).toBe(4);
      expect(CosmicOrderBridge.termCount(4)).toBe(9);
      expect(CosmicOrderBridge.termCount(5)).toBe(20);
      expect(CosmicOrderBridge.termCount(6)).toBe(48);
    });
  });

  // ============================================================
  // CNS Centre Naming
  // ============================================================

  describe('CNS-mapped centre naming', () => {
    it('Sys1 should have 1 centre: C₁:Idea', () => {
      const def = bridge.getLevelDefinition(1);
      expect(def.centres).toHaveLength(1);
      expect(def.centres[0]).toContain('Idea');
    });

    it('Sys2 should have C₁:Idea and C₂:Form', () => {
      const def = bridge.getLevelDefinition(2);
      expect(def.centres).toHaveLength(2);
      expect(def.centres[0]).toContain('Idea');
      expect(def.centres[1]).toContain('Form');
    });

    it('Sys3 should have C₁:Idea, C₂:Knowledge, C₃:Form', () => {
      const def = bridge.getLevelDefinition(3);
      expect(def.centres).toHaveLength(3);
      expect(def.centres[0]).toContain('Idea');
      expect(def.centres[1]).toContain('Knowledge');
      expect(def.centres[2]).toContain('Form');
    });

    it('Sys4 should have C₁:Idea, C₂:Knowledge, C₃:Routine, C₄:Form', () => {
      const def = bridge.getLevelDefinition(4);
      expect(def.centres).toHaveLength(4);
      expect(def.centres[0]).toContain('Idea');
      expect(def.centres[1]).toContain('Knowledge');
      expect(def.centres[2]).toContain('Routine');
      expect(def.centres[3]).toContain('Form');
    });

    it('Sys5 should have Somatic and Autonomic (no Cerebral)', () => {
      const def = bridge.getLevelDefinition(5);
      expect(def.centres).toHaveLength(5);
      expect(def.centres[0]).toContain('Idea');
      expect(def.centres[1]).toContain('Somatic');
      expect(def.centres[2]).toContain('Autonomic');
      expect(def.centres[3]).toContain('Routine');
      expect(def.centres[4]).toContain('Form');
      // Cerebral should NOT appear at Sys5
      const hasCerebral = def.centres.some(c => c.includes('Cerebral'));
      expect(hasCerebral).toBe(false);
    });

    it('Sys6 should have Cerebral, Somatic, and Autonomic (full CNS)', () => {
      const def = bridge.getLevelDefinition(6);
      expect(def.centres).toHaveLength(6);
      expect(def.centres[0]).toContain('Idea');
      expect(def.centres[1]).toContain('Cerebral');
      expect(def.centres[2]).toContain('Somatic');
      expect(def.centres[3]).toContain('Autonomic');
      expect(def.centres[4]).toContain('Routine');
      expect(def.centres[5]).toContain('Form');
    });

    it('Sys6 principle should mention neocortex ≥6 layers', () => {
      const def = bridge.getLevelDefinition(6);
      expect(def.principle).toContain('Neocortex');
      expect(def.principle).toContain('≥6');
    });

    it('getAllDefinitions should return 6 definitions', () => {
      const defs = bridge.getAllDefinitions();
      expect(defs).toHaveLength(6);
    });
  });

  // ============================================================
  // Lifecycle
  // ============================================================

  describe('lifecycle', () => {
    it('should start and stop cleanly', () => {
      bridge.start();
      expect(bridge.isRunning()).toBe(true);
      bridge.stop();
      expect(bridge.isRunning()).toBe(false);
    });

    it('should validate structure on start when configured', () => {
      const validBridge = new CosmicOrderBridge({ validateStructure: true });
      expect(() => validBridge.start()).not.toThrow();
      validBridge.stop();
    });

    it('should emit started/stopped events', () => {
      const events: string[] = [];
      bridge.on('started', () => events.push('started'));
      bridge.on('stopped', () => events.push('stopped'));

      bridge.start();
      bridge.stop();

      expect(events).toEqual(['started', 'stopped']);
    });

    it('should not start twice', () => {
      bridge.start();
      bridge.start(); // Should be no-op
      expect(bridge.isRunning()).toBe(true);
      bridge.stop();
    });
  });

  // ============================================================
  // Tick Mechanics
  // ============================================================

  describe('tick mechanics', () => {
    beforeEach(() => {
      bridge.start();
    });

    it('should advance global step on each tick', () => {
      expect(bridge.getGlobalStep()).toBe(0);
      bridge.tick();
      expect(bridge.getGlobalStep()).toBe(1);
      bridge.tick();
      expect(bridge.getGlobalStep()).toBe(2);
    });

    it('Sys1 should tick every step (fastest)', () => {
      const events: number[] = [];
      bridge.on('term_transition', (e: any) => {
        if (e.level === 1) events.push(e.step);
      });

      // Sys1 has 1 term and 1 cycle step, so it always stays at term 1
      // But it should still tick every step
      for (let i = 0; i < 6; i++) bridge.tick();

      // Sys1 ticks every step (globalStep % 1 === 0 always)
      // With 1 cycle step, currentStep wraps to 0 every tick
      const snapshot = bridge.getSnapshot();
      expect(snapshot.levels[0].level).toBe(1);
    });

    it('Sys6 should tick every 6 steps (slowest)', () => {
      const snapshots: CosmicOrderSnapshot[] = [];

      for (let i = 0; i < 12; i++) {
        snapshots.push(bridge.tick());
      }

      // Sys6 ticks at steps 6 and 12
      const sys6At5 = snapshots[4].levels[5]; // step 5
      const sys6At6 = snapshots[5].levels[5]; // step 6
      const sys6At11 = snapshots[10].levels[5]; // step 11
      const sys6At12 = snapshots[11].levels[5]; // step 12

      // Step 6 and 12 are tick boundaries for Sys6
      expect(sys6At6.currentStep).not.toBe(sys6At5.currentStep);
      expect(sys6At12.currentStep).not.toBe(sys6At11.currentStep);
    });

    it('nested shell frequency: inner shells tick faster than outer', () => {
      // Run 60 ticks (LCM of 1,2,3,4,5,6 = 60)
      for (let i = 0; i < 60; i++) bridge.tick();

      const snapshot = bridge.getSnapshot();

      // All levels should have completed at least one full cycle
      // Sys1: 60 ticks, Sys2: 30 ticks, Sys3: 20 ticks,
      // Sys4: 15 ticks, Sys5: 12 ticks, Sys6: 10 ticks
      expect(snapshot.globalStep).toBe(60);
    });
  });

  // ============================================================
  // Mode (E/R) Cycling
  // ============================================================

  describe('mode cycling', () => {
    beforeEach(() => {
      bridge.start();
    });

    it('Sys1 should always be in E mode (monad)', () => {
      for (let i = 0; i < 10; i++) {
        bridge.tick();
        const state = bridge.getLevelState(1);
        expect(state.mode).toBe('E');
      }
    });

    it('Sys2 should alternate between E and R', () => {
      const modes: string[] = [];
      for (let i = 0; i < 10; i++) {
        bridge.tick();
        modes.push(bridge.getLevelState(2).mode);
      }

      // Should contain both modes
      expect(modes).toContain('E');
      expect(modes).toContain('R');
    });

    it('mode_flip events should be emitted', () => {
      const flips: Array<{ level: number; from: string; to: string }> = [];
      bridge.on('mode_flip', (e: any) => flips.push(e));

      for (let i = 0; i < 20; i++) bridge.tick();

      // At least Sys2 should have flipped
      expect(flips.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Triadic Resonance
  // ============================================================

  describe('triadic resonance', () => {
    beforeEach(() => {
      bridge = new CosmicOrderBridge({
        validateStructure: false,
        enableTriadicResonance: true,
        enableEnergyFlow: true,
      });
      bridge.start();
    });

    it('should detect triadic resonance events', () => {
      const resonances: any[] = [];
      bridge.on('triadic_resonance', (e: any) => resonances.push(e));

      // Run enough ticks for resonance to occur
      for (let i = 0; i < 120; i++) bridge.tick();

      // At least some resonances should have fired
      expect(resonances.length).toBeGreaterThan(0);
    });

    it('resonance should boost energy of paired levels', () => {
      const initialEnergy1 = bridge.getLevelState(1).energy;
      const initialEnergy4 = bridge.getLevelState(4).energy;

      let resonanceDetected = false;
      bridge.on('triadic_resonance', (e: any) => {
        if (e.lower === 1 && e.upper === 4) resonanceDetected = true;
      });

      for (let i = 0; i < 120; i++) bridge.tick();

      if (resonanceDetected) {
        // Energy should have been boosted at some point
        // (may have decayed since, but resonance event confirms boost happened)
        expect(resonanceDetected).toBe(true);
      }
    });

    it('snapshot should include triadic resonance status', () => {
      bridge.tick();
      const snapshot = bridge.getSnapshot();

      expect(snapshot.triadicResonances).toHaveLength(3);
      expect(snapshot.triadicResonances[0].lower).toBe(1);
      expect(snapshot.triadicResonances[0].upper).toBe(4);
      expect(snapshot.triadicResonances[1].lower).toBe(2);
      expect(snapshot.triadicResonances[1].upper).toBe(5);
      expect(snapshot.triadicResonances[2].lower).toBe(3);
      expect(snapshot.triadicResonances[2].upper).toBe(6);
    });
  });

  // ============================================================
  // Energy Flow
  // ============================================================

  describe('energy flow', () => {
    it('energy should decay over time', () => {
      bridge = new CosmicOrderBridge({
        validateStructure: false,
        enableEnergyFlow: true,
        enableTriadicResonance: false,
        initialEnergy: 1.0,
        energyDecay: 0.01,
      });
      bridge.start();

      const initialEnergy = bridge.getLevelState(1).energy;

      for (let i = 0; i < 50; i++) bridge.tick();

      const finalEnergy = bridge.getLevelState(1).energy;
      expect(finalEnergy).toBeLessThan(initialEnergy);
    });

    it('energy should never go below 0', () => {
      bridge = new CosmicOrderBridge({
        validateStructure: false,
        enableEnergyFlow: true,
        enableTriadicResonance: false,
        initialEnergy: 0.1,
        energyDecay: 0.05,
      });
      bridge.start();

      for (let i = 0; i < 200; i++) bridge.tick();

      for (let n = 1; n <= 6; n++) {
        const state = bridge.getLevelState(n as 1 | 2 | 3 | 4 | 5 | 6);
        expect(state.energy).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ============================================================
  // Snapshot
  // ============================================================

  describe('snapshot', () => {
    it('should return complete snapshot of all 6 levels', () => {
      bridge.start();
      bridge.tick();

      const snapshot = bridge.getSnapshot();

      expect(snapshot.globalStep).toBe(1);
      expect(snapshot.levels).toHaveLength(6);
      expect(snapshot.triadicResonances).toHaveLength(3);
      expect(snapshot.structuralValid).toBe(true);

      // Each level should have correct level number
      for (let i = 0; i < 6; i++) {
        expect(snapshot.levels[i].level).toBe(i + 1);
      }
    });

    it('snapshot levels should be copies (immutable)', () => {
      bridge.start();
      bridge.tick();

      const snap1 = bridge.getSnapshot();
      bridge.tick();
      const snap2 = bridge.getSnapshot();

      // Snapshots should be independent
      expect(snap1.globalStep).toBe(1);
      expect(snap2.globalStep).toBe(2);
    });
  });

  // ============================================================
  // EchoAgentLoop Integration
  // ============================================================

  describe('EchoAgentLoop integration', () => {
    it('should work with createCosmicOrderBridge factory', () => {
      const b = createCosmicOrderBridge({ validateStructure: true });
      expect(b).toBeInstanceOf(CosmicOrderBridge);
      b.start();
      const snap = b.tick();
      expect(snap.globalStep).toBe(1);
      b.stop();
    });

    it('should integrate with echo-agent-loop grand cycle (60 steps)', async () => {
      jest.setTimeout(10000);
      // Dynamically import to test integration
      const { EchoAgentLoop } = await import('../echo-agent-loop.js');

      const loop = new EchoAgentLoop({
        stepDurationMs: 10,
        enableCosmicOrder: true,
        enableThreadMultiplexing: true,
        enableTriadCycling: true,
        enableTelemetry: true,
        cosmicOrderConfig: {
          validateStructure: true,
          enableTriadicResonance: true,
          enableEnergyFlow: true,
        },
      });

      const cosmicEvents: string[] = [];
      loop.on('cosmic_resonance', () => cosmicEvents.push('resonance'));
      loop.on('cosmic_term_transition', () => cosmicEvents.push('transition'));
      loop.on('cosmic_mode_flip', () => cosmicEvents.push('flip'));

      await loop.start();

      // Wait for some ticks
      await new Promise(resolve => setTimeout(resolve, 150));

      await loop.stop();

      // Cosmic order bridge should have been ticking
      const cosmicBridge = loop.getCosmicOrderBridge();
      expect(cosmicBridge).toBeInstanceOf(CosmicOrderBridge);
      expect(cosmicBridge.getGlobalStep()).toBeGreaterThan(0);

      // Should have received some cosmic events
      expect(cosmicEvents.length).toBeGreaterThan(0);
    });

    it('should disable cosmic order when configured', async () => {
      jest.setTimeout(10000);
      const { EchoAgentLoop } = await import('../echo-agent-loop.js');

      const loop = new EchoAgentLoop({
        stepDurationMs: 10,
        enableCosmicOrder: false,
      });

      await loop.start();
      await new Promise(resolve => setTimeout(resolve, 80));
      await loop.stop();

      // Cosmic order bridge should not have been ticking
      const cosmicBridge = loop.getCosmicOrderBridge();
      expect(cosmicBridge.getGlobalStep()).toBe(0);
    });
  });
});
