/**
 * Tests for gesture-glyph type definitions and index exports
 */

import { describe, it, expect } from '@jest/globals';
import {
  GlyphFormat,
  StrokeRenderer,
  TrajectoryDistribution,
} from '../src/index';
import type {
  Point2D,
  Point3D,
  Action,
  State,
  Observation,
  Trajectory,
  Stroke,
  TimeChannel,
  VectorField,
  ContactMap,
  Glyph,
} from '../src/index';

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

function makeTrajectory(overrides: Partial<Trajectory> = {}): Trajectory {
  return {
    id: 'traj-1',
    goal: 'test goal',
    context: {},
    actions: [makeAction({ timestamp: 1000 }), makeAction({ timestamp: 2000 })],
    states: [],
    observations: [],
    startTime: 1000,
    endTime: 2000,
    success: true,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// GlyphFormat enum
// ---------------------------------------------------------------------------

describe('GlyphFormat', () => {
  it('should define STROKE variant', () => {
    expect(GlyphFormat.STROKE).toBe('stroke');
  });

  it('should define TIME_CHANNEL variant', () => {
    expect(GlyphFormat.TIME_CHANNEL).toBe('time_channel');
  });

  it('should define VECTOR_FIELD variant', () => {
    expect(GlyphFormat.VECTOR_FIELD).toBe('vector_field');
  });

  it('should define CONTACT_MAP variant', () => {
    expect(GlyphFormat.CONTACT_MAP).toBe('contact_map');
  });

  it('should have exactly 4 variants', () => {
    const values = Object.values(GlyphFormat);
    expect(values).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Index re-exports
// ---------------------------------------------------------------------------

describe('package index exports', () => {
  it('should export GlyphFormat', () => {
    expect(GlyphFormat).toBeDefined();
  });

  it('should export StrokeRenderer class', () => {
    expect(StrokeRenderer).toBeDefined();
    expect(typeof StrokeRenderer).toBe('function');
  });

  it('should export TrajectoryDistribution class', () => {
    expect(TrajectoryDistribution).toBeDefined();
    expect(typeof TrajectoryDistribution).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Type structure smoke-tests (compile-time checks made runtime)
// ---------------------------------------------------------------------------

describe('type structures', () => {
  it('should construct a valid Point2D', () => {
    const p: Point2D = { x: 1, y: 2 };
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
  });

  it('should construct a valid Point3D', () => {
    const p: Point3D = { x: 1, y: 2, z: 3 };
    expect(p.z).toBe(3);
  });

  it('should construct a valid Action', () => {
    const a: Action = makeAction({ type: 'click', velocity: 5 });
    expect(a.type).toBe('click');
    expect(a.velocity).toBe(5);
  });

  it('should construct a valid State', () => {
    const s: State = { data: { key: 'value' }, timestamp: 100, confidence: 0.9 };
    expect(s.confidence).toBe(0.9);
  });

  it('should construct a valid Observation', () => {
    const o: Observation = { data: { raw: true }, timestamp: 200, type: 'sensor' };
    expect(o.type).toBe('sensor');
  });

  it('should construct a valid Trajectory', () => {
    const t = makeTrajectory();
    expect(t.id).toBe('traj-1');
    expect(t.success).toBe(true);
  });

  it('should construct a valid Stroke', () => {
    const s: Stroke = {
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      thickness: [1, 2],
      color: ['#FF0000', '#00FF00'],
      timestamps: [1000, 2000],
    };
    expect(s.points).toHaveLength(2);
  });

  it('should construct a valid TimeChannel', () => {
    const tc: TimeChannel = {
      width: 64,
      height: 64,
      timeBins: 4,
      data: [[[0]]],
    };
    expect(tc.timeBins).toBe(4);
  });

  it('should construct a valid VectorField', () => {
    const vf: VectorField = {
      width: 10,
      height: 10,
      vectors: [{ position: { x: 0, y: 0 }, direction: { x: 1, y: 0 }, magnitude: 1, phase: 0 }],
    };
    expect(vf.vectors).toHaveLength(1);
  });

  it('should construct a valid ContactMap', () => {
    const cm: ContactMap = {
      timeSteps: 10,
      spatialDim: 2,
      contacts: [{ time: 1, location: { x: 0, y: 0 }, type: 'grip', strength: 0.8 }],
    };
    expect(cm.contacts).toHaveLength(1);
  });

  it('should construct a valid Glyph', () => {
    const stroke: Stroke = {
      points: [{ x: 0, y: 0 }],
      thickness: [1],
      color: ['#FF0000'],
      timestamps: [1000],
    };
    const g: Glyph = {
      id: 'glyph-1',
      trajectoryId: 'traj-1',
      format: GlyphFormat.STROKE,
      data: stroke,
      metadata: { dimensions: { width: 512, height: 512 } },
      timestamp: Date.now(),
    };
    expect(g.format).toBe(GlyphFormat.STROKE);
  });
});
