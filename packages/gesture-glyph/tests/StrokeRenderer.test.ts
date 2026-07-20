/**
 * Tests for StrokeRenderer
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { StrokeRenderer } from '../src/renderer/StrokeRenderer';
import { GlyphFormat } from '../src/glyph/types';
import type { Trajectory, Action, Glyph, Stroke } from '../src/glyph/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    type: 'move',
    params: {},
    timestamp: 1000,
    ...overrides,
  };
}

function makeTrajectory(actions: Action[] = [], overrides: Partial<Trajectory> = {}): Trajectory {
  const acts = actions.length > 0 ? actions : [
    makeAction({ timestamp: 1000 }),
    makeAction({ timestamp: 2000 }),
    makeAction({ timestamp: 3000 }),
  ];
  return {
    id: 'traj-test',
    goal: 'test goal',
    context: {},
    actions: acts,
    states: [],
    observations: [],
    startTime: acts[0].timestamp,
    endTime: acts[acts.length - 1].timestamp,
    success: true,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Construction and configuration
// ---------------------------------------------------------------------------

describe('StrokeRenderer', () => {
  let renderer: StrokeRenderer;

  beforeEach(() => {
    renderer = new StrokeRenderer();
  });

  describe('construction', () => {
    it('should create with default config', () => {
      const cfg = renderer.getConfig();
      expect(cfg.width).toBe(512);
      expect(cfg.height).toBe(512);
      expect(cfg.minThickness).toBe(1);
      expect(cfg.maxThickness).toBe(10);
      expect(cfg.smoothing).toBe(0.5);
      expect(cfg.colorPalette).toHaveLength(7);
    });

    it('should accept partial config overrides', () => {
      const r = new StrokeRenderer({ width: 256, height: 128 });
      const cfg = r.getConfig();
      expect(cfg.width).toBe(256);
      expect(cfg.height).toBe(128);
      expect(cfg.smoothing).toBe(0.5); // default preserved
    });
  });

  describe('updateConfig', () => {
    it('should update individual config values', () => {
      renderer.updateConfig({ smoothing: 0.9 });
      expect(renderer.getConfig().smoothing).toBe(0.9);
    });

    it('should preserve unmodified config values', () => {
      renderer.updateConfig({ width: 1024 });
      expect(renderer.getConfig().height).toBe(512);
    });

    it('should return a copy so mutations do not affect internal state', () => {
      const cfg = renderer.getConfig();
      cfg.width = 999;
      expect(renderer.getConfig().width).toBe(512);
    });
  });

  // ---------------------------------------------------------------------------
  // Render output shape
  // ---------------------------------------------------------------------------

  describe('render output', () => {
    it('should return a Glyph with STROKE format', () => {
      const t = makeTrajectory();
      const glyph = renderer.render(t);
      expect(glyph.format).toBe(GlyphFormat.STROKE);
    });

    it('should set glyph id to glyph-<trajectoryId>', () => {
      const t = makeTrajectory([], { id: 'traj-xyz' });
      const glyph = renderer.render(t);
      expect(glyph.id).toBe('glyph-traj-xyz');
    });

    it('should set trajectoryId on glyph', () => {
      const t = makeTrajectory([], { id: 'my-traj' });
      const glyph = renderer.render(t);
      expect(glyph.trajectoryId).toBe('my-traj');
    });

    it('should include canvas dimensions in metadata', () => {
      const glyph = renderer.render(makeTrajectory());
      expect(glyph.metadata.dimensions.width).toBe(512);
      expect(glyph.metadata.dimensions.height).toBe(512);
    });

    it('should include palette in metadata', () => {
      const glyph = renderer.render(makeTrajectory());
      expect(Array.isArray(glyph.metadata.palette)).toBe(true);
      expect((glyph.metadata.palette as string[]).length).toBeGreaterThan(0);
    });

    it('should set a recent timestamp on glyph', () => {
      const before = Date.now();
      const glyph = renderer.render(makeTrajectory());
      const after = Date.now();
      expect(glyph.timestamp).toBeGreaterThanOrEqual(before);
      expect(glyph.timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ---------------------------------------------------------------------------
  // Stroke data properties
  // ---------------------------------------------------------------------------

  describe('stroke data', () => {
    function getStroke(glyph: Glyph): Stroke {
      return glyph.data as Stroke;
    }

    it('should produce a stroke with one point per action', () => {
      const actions = [
        makeAction({ timestamp: 1000, location: { x: 0, y: 0 } }),
        makeAction({ timestamp: 2000, location: { x: 1, y: 1 } }),
        makeAction({ timestamp: 3000, location: { x: 2, y: 2 } }),
      ];
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = getStroke(glyph);
      expect(stroke.points).toHaveLength(3);
    });

    it('should produce thickness array with same length as actions', () => {
      const actions = [1000, 2000, 3000, 4000].map((ts) => makeAction({ timestamp: ts }));
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = getStroke(glyph);
      expect(stroke.thickness).toHaveLength(actions.length);
    });

    it('should produce color array with same length as actions', () => {
      const actions = [1000, 2000, 3000].map((ts) => makeAction({ timestamp: ts }));
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = getStroke(glyph);
      expect(stroke.color).toHaveLength(3);
    });

    it('should produce timestamps that match action timestamps', () => {
      const actions = [
        makeAction({ timestamp: 100 }),
        makeAction({ timestamp: 200 }),
        makeAction({ timestamp: 300 }),
      ];
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = getStroke(glyph);
      expect(stroke.timestamps).toEqual([100, 200, 300]);
    });

    it('should keep stroke points within canvas bounds', () => {
      const actions = [
        makeAction({ timestamp: 1000, location: { x: -100, y: -100 } }),
        makeAction({ timestamp: 2000, location: { x: 0, y: 0 } }),
        makeAction({ timestamp: 3000, location: { x: 100, y: 100 } }),
      ];
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = getStroke(glyph);
      for (const pt of stroke.points) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(512);
        expect(pt.y).toBeGreaterThanOrEqual(0);
        expect(pt.y).toBeLessThanOrEqual(512);
      }
    });

    it('should assign valid hex colors from the palette', () => {
      const actions = [1000, 2000, 3000].map((ts) => makeAction({ timestamp: ts }));
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = getStroke(glyph);
      for (const c of stroke.color) {
        expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('should produce positive thickness values', () => {
      const actions = [
        makeAction({ timestamp: 1000, velocity: 0 }),
        makeAction({ timestamp: 2000, velocity: 5 }),
        makeAction({ timestamp: 3000, velocity: 10 }),
      ];
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = getStroke(glyph);
      for (const t of stroke.thickness) {
        expect(t).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Path extraction edge cases
  // ---------------------------------------------------------------------------

  describe('path extraction edge cases', () => {
    it('should handle actions with 3D locations by projecting to 2D', () => {
      const actions = [
        makeAction({ timestamp: 1000, location: { x: 1, y: 2, z: 3 } }),
        makeAction({ timestamp: 2000, location: { x: 4, y: 5, z: 6 } }),
      ];
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = glyph.data as Stroke;
      expect(stroke.points).toHaveLength(2);
      // z is dropped; points should be valid 2D
      expect(stroke.points[0]).not.toHaveProperty('z');
    });

    it('should accumulate displacement for actions without location', () => {
      const actions = [
        makeAction({ timestamp: 1000, direction: { x: 1, y: 0 } }),
        makeAction({ timestamp: 2000, direction: { x: 0, y: 1 } }),
        makeAction({ timestamp: 3000, direction: { x: 1, y: 1 } }),
      ];
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = glyph.data as Stroke;
      expect(stroke.points).toHaveLength(3);
    });

    it('should handle a single action', () => {
      const actions = [makeAction({ timestamp: 1000, location: { x: 5, y: 5 } })];
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = glyph.data as Stroke;
      expect(stroke.points).toHaveLength(1);
    });

    it('should handle actions with no location and no direction', () => {
      const actions = [
        makeAction({ timestamp: 1000 }),
        makeAction({ timestamp: 2000 }),
      ];
      const glyph = renderer.render(makeTrajectory(actions));
      const stroke = glyph.data as Stroke;
      expect(stroke.points).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Custom config effects
  // ---------------------------------------------------------------------------

  describe('custom config effects', () => {
    it('should use custom palette colors in output', () => {
      const palette = ['#AABBCC'];
      const r = new StrokeRenderer({ colorPalette: palette });
      const actions = [makeAction({ timestamp: 1000 }), makeAction({ timestamp: 2000 })];
      const glyph = r.render(makeTrajectory(actions));
      const stroke = glyph.data as Stroke;
      for (const c of stroke.color) {
        expect(c).toBe('#AABBCC');
      }
    });

    it('should use custom canvas dimensions in metadata', () => {
      const r = new StrokeRenderer({ width: 128, height: 64 });
      const glyph = r.render(makeTrajectory());
      expect(glyph.metadata.dimensions.width).toBe(128);
      expect(glyph.metadata.dimensions.height).toBe(64);
    });

    it('should produce higher thickness for higher velocity when maxThickness > minThickness', () => {
      const r = new StrokeRenderer({ smoothing: 0, minThickness: 1, maxThickness: 10 });
      const low = makeTrajectory([makeAction({ timestamp: 1000, velocity: 0 })]);
      const high = makeTrajectory([makeAction({ timestamp: 1000, velocity: 10 })]);
      const strokeLow = (r.render(low).data as Stroke).thickness[0];
      const strokeHigh = (r.render(high).data as Stroke).thickness[0];
      expect(strokeHigh).toBeGreaterThanOrEqual(strokeLow);
    });
  });
});
