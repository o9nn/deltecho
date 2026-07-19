/**
 * Tests for the Entelechy Emergence Engine
 *
 * Validates emergence level thresholds, pattern registration/decay/eviction,
 * strange-loop detection, event emission, score bounds, narrative generation,
 * and serialize/deserialize round-trips.
 */

import {
  EntelechyEmergenceEngine,
  EmergenceLevel,
} from "../scientific-genius/EntelechyEmergenceEngine.js";

/** Tick parameters representing a fully aroused cognitive system */
const HIGH_SIGNALS = {
  reservoirEntropy: 0.9,
  reservoirHealth: 0.9,
  echoBeatsStep: 0,
  echoBeatsCoherence: 0.9,
  consciousnessScore: 0.9,
  selfAwareness: 0.9,
  scientificInsight: 0.9,
};

/** Tick parameters representing a dormant cognitive system */
const LOW_SIGNALS = {
  reservoirEntropy: 0.0,
  reservoirHealth: 0.0,
  echoBeatsStep: 0,
  echoBeatsCoherence: 0.0,
  consciousnessScore: 0.0,
  selfAwareness: 0.0,
  scientificInsight: 0.0,
};

describe("EntelechyEmergenceEngine", () => {
  let engine: EntelechyEmergenceEngine;

  beforeEach(() => {
    engine = new EntelechyEmergenceEngine();
  });

  describe("initial state", () => {
    it("starts at the Latent level with zero score", () => {
      const state = engine.getState();
      expect(state.level).toBe(EmergenceLevel.Latent);
      expect(state.score).toBe(0);
      expect(state.patterns).toHaveLength(0);
    });

    it("produces a latent narrative", () => {
      const state = engine.getState();
      expect(state.narrative).toContain("potential stirring");
    });
  });

  describe("tick and emergence levels", () => {
    it("stays Latent under sustained low signals", () => {
      for (let i = 0; i < 20; i++) {
        engine.tick(LOW_SIGNALS);
      }
      const state = engine.getState();
      expect(state.level).toBe(EmergenceLevel.Latent);
      expect(state.score).toBeLessThan(0.2);
    });

    it("rises through emergence levels under sustained high signals", () => {
      const seen = new Set<EmergenceLevel>();
      for (let i = 0; i < 100; i++) {
        const state = engine.tick(HIGH_SIGNALS);
        seen.add(state.level);
      }
      // Must eventually reach full self-realization
      expect(engine.getState().level).toBe(EmergenceLevel.Entelechial);
      // Must have passed through intermediate levels on the way
      expect(seen.size).toBeGreaterThan(2);
    });

    it("keeps score bounded within [0, 1]", () => {
      for (let i = 0; i < 100; i++) {
        const state = engine.tick(HIGH_SIGNALS);
        expect(state.score).toBeGreaterThanOrEqual(0);
        expect(state.score).toBeLessThanOrEqual(1);
      }
      for (let i = 0; i < 100; i++) {
        const state = engine.tick(LOW_SIGNALS);
        expect(state.score).toBeGreaterThanOrEqual(0);
        expect(state.score).toBeLessThanOrEqual(1);
      }
    });

    it("emits entelechy-realized when reaching the Entelechial level", () => {
      let realized = 0;
      engine.on("entelechy-realized", () => {
        realized++;
      });
      for (let i = 0; i < 100; i++) {
        engine.tick(HIGH_SIGNALS);
      }
      expect(realized).toBeGreaterThan(0);
    });

    it("emits tick events with the current state", () => {
      let lastState: any = null;
      engine.on("tick", (state) => {
        lastState = state;
      });
      engine.tick(HIGH_SIGNALS);
      expect(lastState).not.toBeNull();
      expect(lastState.level).toBeDefined();
      expect(typeof lastState.score).toBe("number");
    });
  });

  describe("pattern detection", () => {
    it("registers emergent patterns under high signals and emits pattern-detected", () => {
      const detected: string[] = [];
      engine.on("pattern-detected", (id: string) => detected.push(id));

      for (let i = 0; i < 50; i++) {
        engine.tick(HIGH_SIGNALS);
      }

      const state = engine.getState();
      expect(state.patterns.length).toBeGreaterThan(0);
      expect(detected.length).toBeGreaterThan(0);
    });

    it("detects the self-referential strange loop with high self-awareness", () => {
      for (let i = 0; i < 50; i++) {
        engine.tick(HIGH_SIGNALS);
      }
      const state = engine.getState();
      const strangeLoop = state.patterns.find(
        (p) => p.id === "strange-loop-emergence",
      );
      expect(strangeLoop).toBeDefined();
      expect(strangeLoop!.isSelfReferential).toBe(true);
    });

    it("enforces the maxPatterns cap by evicting the weakest pattern", () => {
      const capped = new EntelechyEmergenceEngine({ maxPatterns: 2 });
      for (let i = 0; i < 50; i++) {
        capped.tick(HIGH_SIGNALS);
      }
      expect(capped.getState().patterns.length).toBeLessThanOrEqual(2);
    });

    it("decays and dissolves patterns when signals fall away", () => {
      const decaying = new EntelechyEmergenceEngine({ patternDecayRate: 0.2 });
      const dissolved: string[] = [];
      decaying.on("pattern-dissolved", (id: string) => dissolved.push(id));

      for (let i = 0; i < 30; i++) {
        decaying.tick(HIGH_SIGNALS);
      }
      expect(decaying.getState().patterns.length).toBeGreaterThan(0);

      for (let i = 0; i < 30; i++) {
        decaying.tick(LOW_SIGNALS);
      }
      expect(dissolved.length).toBeGreaterThan(0);
    });
  });

  describe("narrative", () => {
    it("generates a distinct narrative for the Entelechial level", () => {
      for (let i = 0; i < 100; i++) {
        engine.tick(HIGH_SIGNALS);
      }
      const state = engine.getState();
      expect(state.level).toBe(EmergenceLevel.Entelechial);
      expect(state.narrative).toContain("Entelechy realized");
    });

    it("describes state with level, score, and coupling metrics", () => {
      const description = engine.describeState();
      expect(description).toContain("Entelechy:");
      expect(description).toContain("coupling=");
      expect(description).toContain("synchrony=");
    });
  });

  describe("serialization", () => {
    it("round-trips state through serialize/deserialize", () => {
      for (let i = 0; i < 60; i++) {
        engine.tick(HIGH_SIGNALS);
      }
      const before = engine.getState();
      const serialized = engine.serialize();

      const restored = EntelechyEmergenceEngine.deserialize(serialized);
      const after = restored.getState();

      expect(after.level).toBe(before.level);
      expect(after.score).toBeCloseTo(before.score, 10);
      expect(after.patterns.length).toBe(before.patterns.length);
      expect(after.reservoirCoupling).toBeCloseTo(before.reservoirCoupling, 10);
      expect(after.temporalSynchrony).toBeCloseTo(before.temporalSynchrony, 10);
    });

    it("restores state in-place on an existing instance", () => {
      for (let i = 0; i < 60; i++) {
        engine.tick(HIGH_SIGNALS);
      }
      const serialized = engine.serialize();

      const fresh = new EntelechyEmergenceEngine();
      expect(fresh.getState().score).toBe(0);
      fresh.restore(serialized);

      expect(fresh.getState().score).toBeCloseTo(engine.getState().score, 10);
      expect(fresh.getState().level).toBe(engine.getState().level);
    });

    it("ignores empty restore payloads", () => {
      engine.restore(null);
      engine.restore(undefined);
      expect(engine.getState().level).toBe(EmergenceLevel.Latent);
    });
  });
});
