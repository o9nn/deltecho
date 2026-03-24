// ═══════════════════════════════════════════════════════════════════════
// Embodiment Module Exports
// ═══════════════════════════════════════════════════════════════════════

// --- ProprioceptiveEmbodiment ---
export { ProprioceptiveEmbodiment } from './ProprioceptiveEmbodiment.js';

// --- Live2DExpressionPipeline (original) ---
export {
  DTEchoExpressionPipeline,
  VirtualEndocrineEngine,
  ChaoticMicroExpressionGenerator,
  createDTEchoExpressionPipeline,
  endocrineToFACS,
  facsToCubism,
  facsToRigLogic,
  generateLive2DTrainingData,
} from './Live2DExpressionPipeline.js';
export type {
  EndocrineState as Live2DEndocrineState,
  EndocrineEvent as Live2DEndocrineEvent,
  Sensitivity,
  FACSState,
  CubismParams,
  RigLogicControls,
  CognitiveMode as Live2DCognitiveMode,
  DTEExpression,
  DTEchoExpressionConfig,
  ExpressionTickResult,
} from './Live2DExpressionPipeline.js';

// --- MeshPainterBridge ---
export {
  MeshPainterBridge,
  createMeshPainterBridge,
  DTE_ATLAS_REGIONS,
  MODE_GLOW_COLORS,
} from './MeshPainterBridge.js';
export type {
  AtlasRegion,
  ModeGlowConfig,
  AtlasVariant,
  VariantsManifest,
  MeshPainterConfig,
} from './MeshPainterBridge.js';

// --- CharacterRegistry ---
export {
  CharacterRegistry,
  CharacterRegistry as default,
} from './CharacterRegistry.js';
export type {
  OCEANPersonality,
  EndocrineBaselines,
  EndocrineSensitivity,
  ExpressionRule,
  CognitiveEvent,
  ExtraParamConfig,
  CharacterRegistration,
} from './CharacterRegistry.js';

// --- EndocrineExpressionBridge ---
export {
  EndocrineExpressionBridge,
  createEndocrineExpressionBridge,
} from './EndocrineExpressionBridge.js';
export type {
  EndocrineState,
  EndocrineEvent,
  ExpressionEvaluation,
  CognitiveMode,
} from './EndocrineExpressionBridge.js';

// --- ExpressionTickPipeline ---
export {
  ExpressionTickPipeline,
  createExpressionTickPipeline,
} from './ExpressionTickPipeline.js';
export type {
  CubismParameterUpdate,
  FrameOutput,
  FrameListener,
  CognitiveStateInput,
} from './ExpressionTickPipeline.js';
