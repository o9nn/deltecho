export { ProprioceptiveEmbodiment } from './ProprioceptiveEmbodiment.js';
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
  EndocrineState,
  EndocrineEvent,
  Sensitivity,
  FACSState,
  CubismParams,
  RigLogicControls,
  CognitiveMode,
  DTEExpression,
  DTEchoExpressionConfig,
  ExpressionTickResult,
} from './Live2DExpressionPipeline.js';
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
