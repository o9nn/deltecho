/**
 * Stroke Renderer
 * 
 * Renders trajectories as stroke images
 * - Path: integrated action sequence as 2D path
 * - Thickness: encodes speed
 * - Color: encodes phase
 */

import {
  Trajectory,
  Glyph,
  GlyphFormat,
  Stroke,
  Point2D,
  Action,
} from '../glyph/types';

/**
 * Stroke Renderer Configuration
 */
export interface StrokeRendererConfig {
  /** Canvas width */
  width: number;
  
  /** Canvas height */
  height: number;
  
  /** Minimum stroke thickness */
  minThickness: number;
  
  /** Maximum stroke thickness */
  maxThickness: number;
  
  /** Color palette for phases */
  colorPalette: string[];
  
  /** Smoothing factor (0-1) */
  smoothing: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: StrokeRendererConfig = {
  width: 512,
  height: 512,
  minThickness: 1,
  maxThickness: 10,
  colorPalette: [
    '#FF0000', // Red
    '#FF7F00', // Orange
    '#FFFF00', // Yellow
    '#00FF00', // Green
    '#0000FF', // Blue
    '#4B0082', // Indigo
    '#9400D3', // Violet
  ],
  smoothing: 0.5,
};

/**
 * Stroke Renderer
 */
export class StrokeRenderer {
  private config: StrokeRendererConfig;
  
  constructor(config: Partial<StrokeRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Render trajectory as stroke glyph
   */
  render(trajectory: Trajectory): Glyph {
    // Extract path from actions
    const path = this.extractPath(trajectory.actions);
    
    // Normalize path to canvas dimensions
    const normalizedPath = this.normalizePath(path);
    
    // Calculate thickness (encodes speed)
    const thickness = this.calculateThickness(trajectory.actions);
    
    // Calculate color (encodes phase)
    const color = this.calculateColor(trajectory.actions);
    
    // Extract timestamps
    const timestamps = trajectory.actions.map(a => a.timestamp);
    
    // Create stroke
    const stroke: Stroke = {
      points: normalizedPath,
      thickness,
      color,
      timestamps,
    };
    
    // Create glyph
    const glyph: Glyph = {
      id: `glyph-${trajectory.id}`,
      trajectoryId: trajectory.id,
      format: GlyphFormat.STROKE,
      data: stroke,
      metadata: {
        dimensions: {
          width: this.config.width,
          height: this.config.height,
        },
        palette: this.config.colorPalette,
      },
      timestamp: Date.now(),
    };
    
    return glyph;
  }
  
  /**
   * Extract 2D path from actions
   */
  private extractPath(actions: Action[]): Point2D[] {
    const path: Point2D[] = [];
    
    for (const action of actions) {
      if (action.location) {
        // If location is 3D, project to 2D
        if ('z' in action.location) {
          path.push({
            x: action.location.x,
            y: action.location.y,
          });
        } else {
          path.push(action.location as Point2D);
        }
      } else {
        // If no location, use cumulative displacement
        if (path.length > 0) {
          const last = path[path.length - 1];
          const displacement = action.direction || { x: 0, y: 0 };
          path.push({
            x: last.x + ('x' in displacement ? displacement.x : 0),
            y: last.y + ('y' in displacement ? displacement.y : 0),
          });
        } else {
          path.push({ x: 0, y: 0 });
        }
      }
    }
    
    return path;
  }
  
  /**
   * Normalize path to canvas dimensions
   */
  private normalizePath(path: Point2D[]): Point2D[] {
    if (path.length === 0) {
      return [];
    }
    
    // Find bounding box
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const point of path) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    
    // Add padding
    const padding = 0.1;
    const paddedWidth = this.config.width * (1 - 2 * padding);
    const paddedHeight = this.config.height * (1 - 2 * padding);
    
    // Normalize
    return path.map(point => ({
      x: ((point.x - minX) / rangeX) * paddedWidth + this.config.width * padding,
      y: ((point.y - minY) / rangeY) * paddedHeight + this.config.height * padding,
    }));
  }
  
  /**
   * Calculate thickness (encodes speed)
   */
  private calculateThickness(actions: Action[]): number[] {
    const thickness: number[] = [];
    
    for (const action of actions) {
      const velocity = action.velocity || 0;
      
      // Map velocity to thickness range
      const normalizedVelocity = Math.min(1, Math.max(0, velocity / 10));
      const t = this.config.minThickness + 
                normalizedVelocity * (this.config.maxThickness - this.config.minThickness);
      
      thickness.push(t);
    }
    
    // Apply smoothing
    return this.smoothArray(thickness, this.config.smoothing);
  }
  
  /**
   * Calculate color (encodes phase)
   */
  private calculateColor(actions: Action[]): string[] {
    const color: string[] = [];
    const numColors = this.config.colorPalette.length;
    
    for (let i = 0; i < actions.length; i++) {
      // Phase is normalized time through trajectory
      const phase = i / (actions.length - 1 || 1);
      
      // Map phase to color palette
      const colorIndex = Math.floor(phase * (numColors - 1));
      color.push(this.config.colorPalette[colorIndex]);
    }
    
    return color;
  }
  
  /**
   * Smooth array with exponential moving average
   */
  private smoothArray(arr: number[], factor: number): number[] {
    if (arr.length === 0 || factor === 0) {
      return arr;
    }
    
    const smoothed: number[] = [arr[0]];
    
    for (let i = 1; i < arr.length; i++) {
      smoothed.push(factor * arr[i] + (1 - factor) * smoothed[i - 1]);
    }
    
    return smoothed;
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<StrokeRendererConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): StrokeRendererConfig {
    return { ...this.config };
  }
}
