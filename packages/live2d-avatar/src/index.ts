/**
 * @fileoverview DTEcho Live2D Avatar Package
 *
 * Production-grade Live2D Cubism 5 avatar integration for the
 * Deep Tree Echo cognitive architecture.
 *
 * Built on:
 *   - PixiJS v8 (WebGL2/WebGPU)
 *   - untitled-pixi-live2d-engine (Cubism 5.4 SDK)
 *   - Deep Tree Echo cognitive core
 *
 * @packageDocumentation
 */

// Core application
export {
  DTEchoApp,
  createDTEchoApp,
  type DTEchoAppConfig,
  type CognitiveStateUpdate,
  type EndocrineUpdate,
  type UserDataEvent,
  type HitAreaCallback,
  type ExpressionChangeCallback,
} from './DTEchoApp';

// Expression controller
export {
  ExpressionController,
  ExpressionPriority,
  type ExpressionRequest,
  type ExpressionHistoryEntry,
  type SmoothedParameter,
  type MicroExpressionConfig,
} from './ExpressionController';
