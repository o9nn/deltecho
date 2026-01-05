/**
 * Gesture Glyph Types
 *
 * Visual representation of execution trajectories
 * Maps trajectories (τ) to glyphs (γ) and back
 */

/**
 * 2D Point
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 3D Point
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Action in execution space
 */
export interface Action {
  /** Action type */
  type: string;

  /** Action parameters */
  params: Record<string, unknown>;

  /** Timestamp */
  timestamp: number;

  /** Spatial location (if applicable) */
  location?: Point2D | Point3D;

  /** Velocity/speed */
  velocity?: number;

  /** Direction vector */
  direction?: Point2D | Point3D;
}

/**
 * State in execution space
 */
export interface State {
  /** State representation */
  data: Record<string, unknown>;

  /** Timestamp */
  timestamp: number;

  /** Belief confidence */
  confidence: number;
}

/**
 * Observation in execution space
 */
export interface Observation {
  /** Observation data */
  data: unknown;

  /** Timestamp */
  timestamp: number;

  /** Observation type */
  type: string;
}

/**
 * Trajectory: sequence of (state, action, observation) tuples
 */
export interface Trajectory {
  /** Unique identifier */
  id: string;

  /** Goal/intent */
  goal: string;

  /** Context */
  context: Record<string, unknown>;

  /** Actions sequence */
  actions: Action[];

  /** States sequence */
  states: State[];

  /** Observations sequence */
  observations: Observation[];

  /** Start time */
  startTime: number;

  /** End time */
  endTime: number;

  /** Success indicator */
  success: boolean;

  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Stroke: visual representation of action sequence
 */
export interface Stroke {
  /** Path points */
  points: Point2D[];

  /** Thickness at each point (encodes speed) */
  thickness: number[];

  /** Color at each point (encodes phase) */
  color: string[];

  /** Timestamp at each point */
  timestamps: number[];
}

/**
 * Time channel: raster representation with time as channels
 */
export interface TimeChannel {
  /** Width of raster */
  width: number;

  /** Height of raster */
  height: number;

  /** Number of time bins */
  timeBins: number;

  /** Data as 3D array [time][y][x] */
  data: number[][][];
}

/**
 * Vector field: arrows showing direction and magnitude
 */
export interface VectorField {
  /** Grid width */
  width: number;

  /** Grid height */
  height: number;

  /** Vectors at each grid point */
  vectors: Array<{
    position: Point2D;
    direction: Point2D;
    magnitude: number;
    phase: number;
  }>;
}

/**
 * Contact map: when/where constraints activate
 */
export interface ContactMap {
  /** Time dimension size */
  timeSteps: number;

  /** Spatial dimension size */
  spatialDim: number;

  /** Contact events */
  contacts: Array<{
    time: number;
    location: Point2D | Point3D;
    type: string;
    strength: number;
  }>;
}

/**
 * Glyph format types
 */
export enum GlyphFormat {
  STROKE = 'stroke',
  TIME_CHANNEL = 'time_channel',
  VECTOR_FIELD = 'vector_field',
  CONTACT_MAP = 'contact_map',
}

/**
 * Glyph: visual representation of trajectory
 */
export interface Glyph {
  /** Unique identifier */
  id: string;

  /** Source trajectory ID */
  trajectoryId: string;

  /** Glyph format */
  format: GlyphFormat;

  /** Visual data (format-specific) */
  data: Stroke | TimeChannel | VectorField | ContactMap;

  /** Rendering metadata */
  metadata: {
    /** Canvas dimensions */
    dimensions: {
      width: number;
      height: number;
    };

    /** Color palette */
    palette?: string[];

    /** Rendering hints */
    hints?: Record<string, unknown>;
  };

  /** Timestamp */
  timestamp: number;
}

/**
 * Glyph codec interface
 */
export interface GlyphCodec {
  /**
   * Render trajectory to glyph
   */
  render(trajectory: Trajectory, format: GlyphFormat): Glyph;

  /**
   * Decode glyph to trajectory
   */
  decode(glyph: Glyph): Trajectory;
}
