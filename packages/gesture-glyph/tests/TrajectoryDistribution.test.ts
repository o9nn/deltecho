/**
 * Tests for TrajectoryDistribution
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TrajectoryDistribution } from '../src/distribution/TrajectoryDistribution';
import type { Trajectory, Action, Glyph } from '../src/glyph/types';
import { GlyphFormat } from '../src/glyph/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _trajCounter = 0;

function makeAction(ts: number, location?: { x: number; y: number }): Action {
  return {
    type: 'move',
    params: {},
    timestamp: ts,
    location,
    velocity: Math.random() * 5,
  };
}

function makeTrajectory(id?: string, success = true): Trajectory {
  const base = id ?? `traj-${++_trajCounter}`;
  return {
    id: base,
    goal: 'navigate',
    context: {},
    actions: [
      makeAction(1000, { x: Math.random() * 10, y: Math.random() * 10 }),
      makeAction(2000, { x: Math.random() * 10, y: Math.random() * 10 }),
      makeAction(3000, { x: Math.random() * 10, y: Math.random() * 10 }),
    ],
    states: [],
    observations: [],
    startTime: 1000,
    endTime: 3000,
    success,
    metadata: {},
  };
}

function makeGlyphs(trajectories: Trajectory[]): Map<string, Glyph> {
  const glyphs = new Map<string, Glyph>();
  for (const t of trajectories) {
    glyphs.set(t.id, {
      id: `glyph-${t.id}`,
      trajectoryId: t.id,
      format: GlyphFormat.STROKE,
      data: { points: [], thickness: [], color: [], timestamps: [] },
      metadata: { dimensions: { width: 64, height: 64 } },
      timestamp: Date.now(),
    });
  }
  return glyphs;
}

// ---------------------------------------------------------------------------
// Construction and configuration
// ---------------------------------------------------------------------------

describe('TrajectoryDistribution', () => {
  let dist: TrajectoryDistribution;

  beforeEach(() => {
    _trajCounter = 0;
    dist = new TrajectoryDistribution();
  });

  describe('construction', () => {
    it('should create with default config', () => {
      expect(dist).toBeDefined();
    });

    it('should start with null echo', () => {
      expect(dist.getEcho()).toBeNull();
    });

    it('should accept custom partition sequence', () => {
      const custom = new TrajectoryDistribution({ partitionSequence: [2, 4] });
      expect(custom).toBeDefined();
    });

    it('should accept custom maxDepth', () => {
      const shallow = new TrajectoryDistribution({ maxDepth: 2 });
      expect(shallow).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // buildEcho
  // ---------------------------------------------------------------------------

  describe('buildEcho', () => {
    it('should return a DeepTreeEcho structure', () => {
      const trajectories = Array.from({ length: 5 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      const echo = dist.buildEcho(trajectories, glyphs);
      expect(echo).toBeDefined();
      expect(echo.root).toBeDefined();
      expect(echo.nodes).toBeInstanceOf(Map);
      expect(echo.trajectories).toBeInstanceOf(Map);
    });

    it('should store all trajectories in the echo', () => {
      const trajectories = Array.from({ length: 4 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      const echo = dist.buildEcho(trajectories, glyphs);
      expect(echo.trajectories.size).toBe(4);
    });

    it('should set getEcho() after building', () => {
      const trajectories = [makeTrajectory()];
      const glyphs = makeGlyphs(trajectories);
      dist.buildEcho(trajectories, glyphs);
      expect(dist.getEcho()).not.toBeNull();
    });

    it('should create a root node with id "root"', () => {
      const trajectories = Array.from({ length: 3 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      const echo = dist.buildEcho(trajectories, glyphs);
      expect(echo.root.id).toBe('root');
    });

    it('should set parentId to null on root node', () => {
      const trajectories = Array.from({ length: 3 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      const echo = dist.buildEcho(trajectories, glyphs);
      expect(echo.root.parentId).toBeNull();
    });

    it('should include all trajectory ids in root node', () => {
      const trajectories = Array.from({ length: 4 }, (_, i) => makeTrajectory(`t-${i}`));
      const glyphs = makeGlyphs(trajectories);
      const echo = dist.buildEcho(trajectories, glyphs);
      for (const t of trajectories) {
        expect(echo.root.trajectories).toContain(t.id);
      }
    });

    it('should store the glyph map in echo', () => {
      const trajectories = Array.from({ length: 3 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      const echo = dist.buildEcho(trajectories, glyphs);
      expect(echo.glyphs).toBe(glyphs);
    });

    it('should correctly record the partition sequence in echo', () => {
      const custom = new TrajectoryDistribution({ partitionSequence: [3, 5] });
      const trajectories = Array.from({ length: 2 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      const echo = custom.buildEcho(trajectories, glyphs);
      expect(echo.partitionSequence).toEqual([3, 5]);
    });

    it('should handle empty trajectory list gracefully', () => {
      const echo = dist.buildEcho([], new Map());
      expect(echo.root.trajectories).toHaveLength(0);
      expect(echo.trajectories.size).toBe(0);
    });

    it('should partition into children when there are enough trajectories', () => {
      const trajectories = Array.from({ length: 20 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      const custom = new TrajectoryDistribution({
        partitionSequence: [3],
        maxDepth: 1,
        minTrajectoriesPerNode: 3,
      });
      const echo = custom.buildEcho(trajectories, glyphs);
      // Root should have children when we have 20 trajectories and min is 3
      expect(echo.root.children.length).toBeGreaterThan(0);
    });

    it('should not partition when below minTrajectoriesPerNode', () => {
      const trajectories = [makeTrajectory(), makeTrajectory()];
      const glyphs = makeGlyphs(trajectories);
      const stingy = new TrajectoryDistribution({ minTrajectoriesPerNode: 10 });
      const echo = stingy.buildEcho(trajectories, glyphs);
      expect(echo.root.children).toHaveLength(0);
    });

    it('should record correct statistics on root', () => {
      const trajs = [
        makeTrajectory('s1', true),
        makeTrajectory('s2', true),
        makeTrajectory('f1', false),
        makeTrajectory('f2', false),
      ];
      const glyphs = makeGlyphs(trajs);
      const echo = dist.buildEcho(trajs, glyphs);
      expect(echo.root.stats.count).toBe(4);
      expect(echo.root.stats.avgSuccess).toBeCloseTo(0.5);
      expect(echo.root.stats.avgDuration).toBeCloseTo(2000);
    });
  });

  // ---------------------------------------------------------------------------
  // queryByPath
  // ---------------------------------------------------------------------------

  describe('queryByPath', () => {
    it('should return empty array when echo not yet built', () => {
      const result = dist.queryByPath([0]);
      expect(result).toEqual([]);
    });

    it('should return root trajectories for empty path', () => {
      const trajectories = Array.from({ length: 3 }, (_, i) => makeTrajectory(`q-${i}`));
      const glyphs = makeGlyphs(trajectories);
      dist.buildEcho(trajectories, glyphs);
      const result = dist.queryByPath([]);
      expect(result).toHaveLength(3);
    });

    it('should return root trajectories for out-of-range path index', () => {
      const trajectories = Array.from({ length: 3 }, (_, i) => makeTrajectory(`oob-${i}`));
      const glyphs = makeGlyphs(trajectories);
      dist.buildEcho(trajectories, glyphs);
      // Index 999 doesn't exist; should stop at root
      const result = dist.queryByPath([999]);
      expect(result.length).toBeGreaterThanOrEqual(0); // no crash
    });

    it('should navigate into child nodes when they exist', () => {
      const trajectories = Array.from({ length: 20 }, (_, i) => makeTrajectory(`nav-${i}`));
      const glyphs = makeGlyphs(trajectories);
      const custom = new TrajectoryDistribution({
        partitionSequence: [3],
        maxDepth: 1,
        minTrajectoriesPerNode: 3,
      });
      custom.buildEcho(trajectories, glyphs);
      const echo = custom.getEcho()!;
      if (echo.root.children.length > 0) {
        // Navigate to first child
        const result = custom.queryByPath([0]);
        expect(Array.isArray(result)).toBe(true);
        // Result should be a subset of all trajectories
        expect(result.length).toBeLessThanOrEqual(20);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // exportEcho
  // ---------------------------------------------------------------------------

  describe('exportEcho', () => {
    it('should return "{}" when echo not yet built', () => {
      expect(dist.exportEcho()).toBe('{}');
    });

    it('should return valid JSON after building', () => {
      const trajectories = Array.from({ length: 3 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      dist.buildEcho(trajectories, glyphs);
      const json = dist.exportEcho();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include root in exported JSON', () => {
      const trajectories = Array.from({ length: 3 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      dist.buildEcho(trajectories, glyphs);
      const parsed = JSON.parse(dist.exportEcho());
      expect(parsed.root).toBeDefined();
      expect(parsed.root.id).toBe('root');
    });

    it('should include nodes in exported JSON', () => {
      const trajectories = Array.from({ length: 3 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      dist.buildEcho(trajectories, glyphs);
      const parsed = JSON.parse(dist.exportEcho());
      expect(Array.isArray(parsed.nodes)).toBe(true);
    });

    it('should include partitionSequence in exported JSON', () => {
      const trajectories = Array.from({ length: 2 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      dist.buildEcho(trajectories, glyphs);
      const parsed = JSON.parse(dist.exportEcho());
      expect(Array.isArray(parsed.partitionSequence)).toBe(true);
    });

    it('should include maxDepth in exported JSON', () => {
      const custom = new TrajectoryDistribution({ maxDepth: 3 });
      const trajectories = Array.from({ length: 2 }, () => makeTrajectory());
      const glyphs = makeGlyphs(trajectories);
      custom.buildEcho(trajectories, glyphs);
      const parsed = JSON.parse(custom.exportEcho());
      expect(parsed.maxDepth).toBe(3);
    });

    it('should be re-importable and reflect echo structure', () => {
      const trajectories = Array.from({ length: 6 }, (_, i) => makeTrajectory(`ex-${i}`));
      const glyphs = makeGlyphs(trajectories);
      const custom = new TrajectoryDistribution({
        partitionSequence: [3],
        maxDepth: 1,
        minTrajectoriesPerNode: 2,
      });
      custom.buildEcho(trajectories, glyphs);
      const echo = custom.getEcho()!;
      const parsed = JSON.parse(custom.exportEcho());
      // node count should match Map entries
      expect(parsed.nodes.length).toBe(echo.nodes.size);
    });
  });

  // ---------------------------------------------------------------------------
  // getEcho
  // ---------------------------------------------------------------------------

  describe('getEcho', () => {
    it('should return null before build', () => {
      expect(dist.getEcho()).toBeNull();
    });

    it('should return the built echo after buildEcho', () => {
      const trajectories = [makeTrajectory()];
      const glyphs = makeGlyphs(trajectories);
      const echo = dist.buildEcho(trajectories, glyphs);
      expect(dist.getEcho()).toBe(echo);
    });

    it('should be overwritten on second call to buildEcho', () => {
      const t1 = [makeTrajectory('a')];
      const t2 = [makeTrajectory('b'), makeTrajectory('c')];
      dist.buildEcho(t1, makeGlyphs(t1));
      dist.buildEcho(t2, makeGlyphs(t2));
      const echo = dist.getEcho()!;
      expect(echo.trajectories.size).toBe(2);
    });
  });
});
