/**
 * @deltecho/gesture-glyph
 * 
 * Gesture glyph codec for trajectory visualization and deep tree echo distribution
 */

// Glyph types
export * from './glyph/types';

// Renderers
export { StrokeRenderer, type StrokeRendererConfig } from './renderer/StrokeRenderer';

// Distribution
export {
  TrajectoryDistribution,
  type TrajectoryDistributionConfig,
  type DistributionNode,
  type DeepTreeEcho,
} from './distribution/TrajectoryDistribution';
