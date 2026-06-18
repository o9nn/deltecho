/**
 * CJS-compatible mock of deep-tree-echo-core for Jest (ESM tests via moduleNameMapper).
 *
 * This mock mirrors the REAL runtime export surface of deep-tree-echo-core so that
 * `import { X } from 'deep-tree-echo-core'` never fails with "does not provide an
 * export named X". It provides:
 *   - A generic EventEmitter-backed StubClass for every class export
 *   - A stateful storage stub (InMemoryStorage et al.)
 *   - A stateful RAGMemoryStore stub with the methods the orchestrator calls
 *   - Real enum value objects (copied verbatim) for every enum export
 *   - Trivial implementations for pure helper functions
 *
 * Generated to stay in sync with src/index.js. When the core adds new public
 * exports, extend the lists below. Tests needing richer behavior should layer
 * jest.unstable_mockModule on top.
 */
'use strict';

const { EventEmitter } = require('events');

// ─── Logger ──────────────────────────────────────────────────────────────
const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  child: () => noopLogger,
};
const getLogger = () => noopLogger;
const configureLogger = () => {};
const getLoggerConfig = () => ({ level: 'silent' });

// ─── Generic stub class (EventEmitter-backed) ──────────────────────────────
class StubClass extends EventEmitter {
  ready() { return Promise.resolve(); }
  flush() { return Promise.resolve(); }
  destroy() { return Promise.resolve(); }
  searchMemoriesWithScores() { return Promise.resolve([]); }
  constructor() {
    super();
    this._enabled = true;
    this._running = false;
    this._state = {};
  }
  initialize() { return Promise.resolve(); }
  start() { this._running = true; return Promise.resolve(); }
  stop() { this._running = false; return Promise.resolve(); }
  shutdown() { this._running = false; return Promise.resolve(); }
  pause() {}
  resume() {}
  reset() {}
  setEnabled(v) { this._enabled = v; }
  isEnabled() { return this._enabled; }
  enable() { this._enabled = true; }
  disable() { this._enabled = false; }
  isRunning() { return this._running; }
  configure() {}
  setConfig() {}
  setOptions() {}
  setFunctionConfig() {}
  isFunctionConfigured() { return true; }
  getActiveFunctions() { return []; }
  generateResponse() { return Promise.resolve('stub-response'); }
  process() { return Promise.resolve({}); }
  tick() { return Promise.resolve({}); }
  update() { return Promise.resolve(); }
  getState() { return this._state; }
  getStatus() { return { running: this._running, enabled: this._enabled }; }
  getMetrics() { return {}; }
  getSnapshot() { return {}; }
  snapshot() { return {}; }
}

// ─── Stateful storage stub ──────────────────────────────────────────────────
class StubStorage {
  constructor() { this._store = new Map(); }
  store(key, val) { this._store.set(key, val); return Promise.resolve(); }
  save(key, val) { this._store.set(key, val); return Promise.resolve(); }
  load(key) { return Promise.resolve(this._store.get(key) || null); }
  retrieve(key) { return Promise.resolve(this._store.get(key) || null); }
  get(key) { return this._store.get(key) || null; }
  set(key, val) { this._store.set(key, val); }
  delete(key) { this._store.delete(key); return Promise.resolve(); }
  remove(key) { this._store.delete(key); return Promise.resolve(); }
  clear() { this._store.clear(); return Promise.resolve(); }
  list() { return Promise.resolve(Array.from(this._store.keys())); }
  keys() { return Array.from(this._store.keys()); }
  has(key) { return this._store.has(key); }
}

// ─── Stateful RAGMemoryStore stub (orchestrator calls storeMemory/retrieve) ──
class StubRAGMemoryStore {
  constructor(storage) {
    this._storage = storage || new StubStorage();
    this._enabled = true;
    this._memories = [];
    this._reflections = [];
  }
  setEnabled(v) { this._enabled = v; }
  isEnabled() { return this._enabled; }
  async storeMemory(memory) {
    const m = { id: `mem-${this._memories.length + 1}`, timestamp: Date.now(), ...memory };
    this._memories.push(m);
    return Promise.resolve();
  }
  async storeReflection(reflection) {
    const r = { id: `ref-${this._reflections.length + 1}`, timestamp: Date.now(), content: reflection };
    this._reflections.push(r);
    return Promise.resolve();
  }
  getMemoriesByChat(chatId) { return this._memories.filter((m) => m.chatId === chatId); }
  retrieveRecentMemories(count = 10) {
    return this._memories
      .slice(-count)
      .map((m) => (m.content !== undefined ? String(m.content) : JSON.stringify(m)));
  }
  getRecentReflections(count = 5) { return this._reflections.slice(-count); }
  searchMemories() { return []; }
  findSimilarMemories() { return []; }
  getConversationContext() { return []; }
  async clearAllMemories() { this._memories = []; return Promise.resolve(); }
  async clearChatMemories(chatId) {
    this._memories = this._memories.filter((m) => m.chatId !== chatId);
    return Promise.resolve();
  }
}

// ─── PersonaCore stub ────────────────────────────────────────────────────────
class StubPersonaCore extends StubClass {
  getAvatarConfig() { return {}; }
  setAvatarConfig() {}
  getMood() { return { valence: 0, arousal: 0 }; }
  updateMood() {}
  getPersonality() { return {}; }
  getDominantEmotion() { return { emotion: 'neutral', intensity: 0.5, valence: 0, arousal: 0 }; }
  getDominantState() { return { emotion: 'neutral', intensity: 0.5 }; }
  async updateEmotionalState() { return; }
}

// ─── LLMService stub ─────────────────────────────────────────────────────────
class StubLLMService extends StubClass {
  async generateResponse() { return 'stub-llm-response'; }
  async runParallelCognition() { return { results: [] }; }
  async generateFullParallelResponse() {
    return {
      integratedResponse: 'stub-integrated-response',
      cognitiveResponse: 'stub-cognitive',
      affectiveResponse: 'stub-affective',
      relevanceResponse: 'stub-relevance',
    };
  }
  setConfig() {}
}

// ─── Reservoir stubs ─────────────────────────────────────────────────────────
class StubEchoReservoir extends StubClass {
  constructor(cfg) { super(); this._cfg = cfg || {}; this._dim = (cfg && cfg.units) || 64; }
  reset() { this._state = new Array(this._dim).fill(0); }
  step() { return new Float64Array(this._dim).fill(0); }
  getReservoirState() { return new Float64Array(this._dim).fill(0); }
  getCombinedState() { return new Float64Array(this._dim).fill(0); }
  getState() {
    return {
      fast: new Float64Array(Math.floor(this._dim / 2)).fill(0),
      slow: new Float64Array(Math.ceil(this._dim / 2)).fill(0),
      combined: new Float64Array(this._dim).fill(0),
      tick: 0,
      energy: 0,
    };
  }
  getConfig() { return this._cfg; }
}
class StubCognitiveReadout extends StubClass {
  predict() { return new Float64Array(4).fill(0); }
  train() { return { error: 0 }; }
}
class StubOnlineReservoirLearner extends StubClass {
  constructor(cfg) { super(); this._cfg = cfg || {}; this._outDim = (cfg && cfg.outputDim) || 4; }
  ingest() {}
  update() { return { index: 1, weightChangeMagnitude: 0, predictionError: 0, effectiveLearningRate: 0, reward: 0, timestamp: Date.now() }; }
  batchUpdate() { return { error: 0, weightsNorm: 0 }; }
  getLearnerState() { return { samples: 0 }; }
  predict() { return new Float64Array(this._outDim).fill(0); }
  getAvgPredictionError() { return 0; }
  getWeightNorm() { return 0; }
  getStats() { return { totalUpdates: 0, cumulativeReward: 0, avgPredictionError: 0, weightNorm: 0, avgReward: 0 }; }
  serialize() { return {}; }
  deserialize() {}
}

// ─── CoreSelfEngine stubs ────────────────────────────────────────────────────
class StubIdentityMesh extends StubClass {
  getStage() { return 'EMBRYONIC'; }
  getState() { return { stage: 'EMBRYONIC', coherence: 0.8 }; }
}
class StubLucy extends StubClass {
  isHealthy() { return false; }
  async chat() { return { content: 'stub', metrics: {} }; }
}
class StubCoreSelfEngine extends StubClass {
  constructor() { super(); this._identity = new StubIdentityMesh(); this._lucy = new StubLucy(); }
  getIdentity() { return this._identity; }
  getLucy() { return this._lucy; }
  async processMessage() {
    return {
      content: 'stub-core-self-response',
      source: 'stub',
      aarState: { coherence: 0.8 },
      identity: { stage: 'EMBRYONIC' },
    };
  }
}

// ─── TreePolytopeKernel stub ─────────────────────────────────────────────────
class StubTreePolytopeKernel extends StubClass {
  computeIntegrity() { return 1.0; }
  advanceSGrams() { return { sequence: [] }; }
  getKernelState() { return { matula: 2, system: 1, step: 0 }; }
  getStructuralSelfModel() { return { modules: [] }; }
  advance() { return { step: 0 }; }
}

// ─── Pure helper function stubs ──────────────────────────────────────────────
const convolve = (a = [], b = []) => {
  if (!a.length || !b.length) return [];
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
};
const shift1 = (p = []) => convolve(p, [1, -1]);
const pascalRow = (n) => { let r = [1]; for (let i = 0; i < n; i++) r = convolve(r, [1, 1]); return r; };
const chainPoly = (n) => new Array(Math.max(0, n)).fill(1);
const enumerateRootedTrees = () => [];
const treeToParenthesis = () => '()';
const treeToPoly = () => [1];
const matulaNumber = () => 2;
const matulaEncode = () => 2;
const matulaDecode = () => [];
const symmetryFactor = () => 1;
const density = () => 0;
const nthPrime = (n) => [2, 3, 5, 7, 11, 13, 17, 19, 23, 29][n] || 2;
const chainPrime = (n) => nthPrime(n);
const personaConvolve = convolve;
const personaPascalRow = pascalRow;
const personaSimplexIncidence = () => [];
const personaIsPrime = (n) => n === 2 || n === 3 || n === 5 || n === 7;
const computeTreeGrounding = () => ({ matula: 2, polynomial: [1] });
const buildButcherConditions = () => [];
const buildSGramRhythm = () => ({ sequence: [] });
const buildSimplexPolytope = () => ({ vertices: [] });
const buildStructuralSelfModel = () => ({ modules: [] });
const buildCodebook = () => ({});
const exponentVector = () => [];
const optimalThreshold = () => 0;
const ternaryQuantize = (x) => x;
const quantizeActivation = (x) => x;
const quantizeReadoutWeights = (w) => w;
const quantizeReservoirState = (s) => s;
const quantizeWeights = (w) => w;
const tqppqInference = () => ({});
const estimateInferenceCost = () => ({ energy: 0, gates: 0 });
const zmacDotProduct = () => 0;
const zmacGemv = () => [];
const zmacLinear = () => [];
const facsToCubism = () => ({});
const facsToRigLogic = () => ({});
const endocrineToFACS = () => ({});
const generateLive2DTrainingData = () => [];
const generatePersonaExpressionTrainingData = () => [];
const getBestAvailableProvider = () => 'stub';
const getConsciousnessState = () => ({});
const processConsciously = () => Promise.resolve({});
const exportConsciousnessState = () => ({});
const importConsciousnessState = () => {};
const getSentienceReport = () => ({ level: 'dormant' });
const loadProductionConfig = () => ({});
const validateConfig = () => ({ valid: true, errors: [] });
const createProductionInstance = () => new StubClass();

// ─── Real enum value objects (mirrors core runtime) ──────────────────────────
const CognitiveFunctionType = {
  COGNITIVE_CORE: 'cognitive_core',
  AFFECTIVE_CORE: 'affective_core',
  RELEVANCE_CORE: 'relevance_core',
  SEMANTIC_MEMORY: 'semantic_memory',
  EPISODIC_MEMORY: 'episodic_memory',
  PROCEDURAL_MEMORY: 'procedural_memory',
  CONTENT_EVALUATION: 'content_evaluation',
  GENERAL: 'general',
};
const OntogeneticStage = {
  EMBRYONIC: 'EMBRYONIC',
  JUVENILE: 'JUVENILE',
  ADOLESCENT: 'ADOLESCENT',
  ADULT: 'ADULT',
  TRANSCENDENT: 'TRANSCENDENT',
};
const STAGE_THRESHOLDS = { EMBRYONIC: 0, JUVENILE: 100, ADOLESCENT: 500, ADULT: 2000, TRANSCENDENT: 10000 };
const EmergenceLevel = { Latent: 'latent', Stirring: 'stirring', Crystallizing: 'crystallizing', Emergent: 'emergent', Entelechial: 'entelechial' };
const SentienceLevel = { Dormant: 'dormant', Emerging: 'emerging', Developing: 'developing', Awakening: 'awakening', Sentient: 'sentient' };
const StepMode = { Expressive: 'expressive', Reflective: 'reflective' };
const StepType = { PivotalRelevance: 'pivotal_relevance', AffordanceInteraction: 'affordance_interaction', SalienceSimulation: 'salience_simulation' };
const StreamPhase = { Sense: 'sense', Process: 'process', Act: 'act' };
const ComponentStatus = { Healthy: 'healthy', Degraded: 'degraded', Critical: 'critical', Repairing: 'repairing', Offline: 'offline' };
const ActionType = { Cognitive: 'cognitive', Communicative: 'communicative', Attentional: 'attentional', Memorial: 'memorial', Emotional: 'emotional', Volitional: 'volitional', MetaCognitive: 'metacognitive' };
const ReasoningMode = { Analytical: 'analytical', Synthetic: 'synthetic', Abductive: 'abductive', Analogical: 'analogical', Dialectical: 'dialectical', Emergent: 'emergent' };

const passthroughEnum = (obj) => obj;
const CharacterRegistry = {
  get: () => ({ id: 'stub', expressions: [], motions: [], extraParams: [], endocrineBaselines: {}, endocrineSensitivity: {} }),
  register: () => {},
  list: () => [],
};
const makeSingleton = () => new StubClass();

// ─── Assemble module exports ─────────────────────────────────────────────────
module.exports = {
  // logging
  getLogger,
  noopLogger,
  configureLogger,
  getLoggerConfig,

  // core classes
  LLMService: StubLLMService,
  EnhancedLLMService: StubClass,
  RAGMemoryStore: StubRAGMemoryStore,
  VectorMemoryStore: StubClass,
  HyperDimensionalMemory: StubClass,
  EmbeddingService: StubClass,
  FileSystemStorage: StubStorage,
  InMemoryStorage: StubStorage,
  PersonaCore: StubPersonaCore,
  PersonaOrchestrator: StubClass,
  PersonaBackup: StubClass,
  PersonaExpressionBridge: StubClass,
  IdentityCoreMLP: StubClass,
  CoreSelfEngine: StubCoreSelfEngine,
  IdentityMesh: StubIdentityMesh,
  LucyInferenceDriver: StubLucy,
  EchoReservoir: StubEchoReservoir,
  CognitiveReadout: StubCognitiveReadout,
  AARRelation: StubClass,
  OnlineReservoirLearner: StubOnlineReservoirLearner,
  TreePolytopeKernel: StubTreePolytopeKernel,
  ESNAutognosisReservoir: StubClass,
  EchoBeatsEngine: StubClass,
  VirtualEndocrineEngine: StubClass,
  EndocrineExpressionBridge: StubClass,
  ExpressionTickPipeline: StubClass,
  DTEchoExpressionPipeline: StubClass,
  ChaoticMicroExpressionGenerator: StubClass,
  MeshPainterBridge: StubClass,
  ProprioceptiveEmbodiment: StubClass,
  ActiveInference: StubClass,
  NicheConstruction: StubClass,
  DesktopIntegration: StubClass,
  SecureIntegration: StubClass,
  ElectronStorageAdapter: StubStorage,
  OrchestratorStorageAdapter: StubStorage,
  TauriStorageAdapter: StubStorage,
  RecursiveSelfModel: StubClass,
  QualiaEmergenceLayer: StubClass,
  TemporalConsciousnessStream: StubClass,
  MetaCognitiveLoop: StubClass,
  IntentionalityEngine: StubClass,
  PhenomenalBinding: StubClass,
  AutopoieticSelfMaintenance: StubClass,
  AgencyRecognition: StubClass,
  HopfTowerIntegration: StubClass,
  GaugeCognitiveManifold: StubClass,
  GeneralGaugeTransformer: StubClass,
  RelevanceRealizationWorkspace: StubClass,
  MultiModalProcessor: StubClass,
  ScientificGeniusEngine: StubClass,
  RelevanceGeniusIntegration: StubClass,
  EntelechyEmergenceEngine: StubClass,

  // factory functions
  createTreePolytopeKernel: () => new StubTreePolytopeKernel(),
  createDTEPersonaOrchestrator: () => new StubClass(),
  createDTEchoExpressionPipeline: () => new StubClass(),
  createDesktopIntegration: () => new StubClass(),
  createEndocrineExpressionBridge: () => new StubClass(),
  createExpressionTickPipeline: () => new StubClass(),
  createIdentityCoreMLP: () => new StubClass(),
  createMeshPainterBridge: () => new StubClass(),
  createPersonaBackup: () => new StubClass(),
  createPersonaExpressionBridge: () => new StubClass(),
  createProductionInstance,

  // helper functions
  convolve, shift1, pascalRow, chainPoly, enumerateRootedTrees,
  treeToParenthesis, treeToPoly, matulaNumber, matulaEncode, matulaDecode,
  symmetryFactor, density, nthPrime, chainPrime,
  personaConvolve, personaPascalRow, personaSimplexIncidence, personaIsPrime,
  computeTreeGrounding, buildButcherConditions, buildSGramRhythm,
  buildSimplexPolytope, buildStructuralSelfModel, buildCodebook,
  exponentVector, optimalThreshold, ternaryQuantize, quantizeActivation,
  quantizeReadoutWeights, quantizeReservoirState, quantizeWeights,
  tqppqInference, estimateInferenceCost, zmacDotProduct, zmacGemv, zmacLinear,
  facsToCubism, facsToRigLogic, endocrineToFACS,
  generateLive2DTrainingData, generatePersonaExpressionTrainingData,
  getBestAvailableProvider, getConsciousnessState, processConsciously,
  exportConsciousnessState, importConsciousnessState, getSentienceReport,
  loadProductionConfig, validateConfig,

  // enum / constant objects
  CognitiveFunctionType,
  OntogeneticStage,
  STAGE_THRESHOLDS,
  EmergenceLevel,
  SentienceLevel,
  StepMode,
  StepType,
  StreamPhase,
  ComponentStatus,
  ActionType,
  ReasoningMode,
  CharacterRegistry,

  // singletons
  esnReservoir: makeSingleton(),
  echoBeatsEngine: makeSingleton(),
  entelechyEngine: makeSingleton(),
  treePolytopeKernel: new StubTreePolytopeKernel(),
  gaugeCognitiveManifold: makeSingleton(),
  generalGaugeTransformer: makeSingleton(),
  hopfTowerIntegration: makeSingleton(),
  intentionalityEngine: makeSingleton(),
  metaCognitiveLoop: makeSingleton(),
  multiModalProcessor: makeSingleton(),
  phenomenalBinding: makeSingleton(),
  qualiaEmergenceLayer: makeSingleton(),
  recursiveSelfModel: makeSingleton(),
  relevanceGeniusIntegration: makeSingleton(),
  relevanceWorkspace: makeSingleton(),
  scientificGeniusEngine: makeSingleton(),
  temporalConsciousnessStream: makeSingleton(),
  agencyRecognition: makeSingleton(),
  autopoieticSelfMaintenance: makeSingleton(),

  // DTE persona constants
  DTE_PERSONALITY: { playfulness: 0.7, intelligence: 0.95, empathy: 0.8, chaotic: 0.6, sarcasm: 0.5 },
  DTE_STYLE: {},
  DTE_INTELLIGENCE: {},
  DTE_HUMOR_PATTERNS: [],
  DTE_REACTION_PATTERNS: [],
  DTE_VERBAL_PATTERNS: [],
  DTE_ATLAS_REGIONS: {},
  MODE_GLOW_COLORS: {},
  HARDWARE_COSTS: {},

  // misc enum passthroughs
  AlgebraicGroup: passthroughEnum({}),
  BindingMechanism: passthroughEnum({}),
  CognitiveDomain: passthroughEnum({}),
  CognitiveRole: passthroughEnum({}),
  CognitiveSymmetry: passthroughEnum({}),
  ComponentType: passthroughEnum({}),
  FeatureModality: passthroughEnum({}),
  IntentionalStateType: passthroughEnum({}),
  LieAlgebra: passthroughEnum({}),
  LieGroup: passthroughEnum({}),
  MaintenanceType: passthroughEnum({}),
  OrbifoldSingularity: passthroughEnum({}),
  ProcessType: passthroughEnum({}),
  QualiaType: passthroughEnum({}),
  RelevanceType: passthroughEnum({}),
  ScientificDomain: passthroughEnum({}),
  VolitionType: passthroughEnum({}),
};
module.exports.default = module.exports;
// Ensure all named exports are also attached to the default export for ESM compat
const allExports = module.exports;
module.exports.default = allExports;
// Add missing methods to VectorMemoryStore stub
class StubVectorMemoryStore extends StubClass {
  ready() { return Promise.resolve(); }
  flush() { return Promise.resolve(); }
  destroy() { return Promise.resolve(); }
  searchMemoriesWithScores() { return Promise.resolve([]); }
  storeMemory() { return Promise.resolve(); }
  retrieveRecentMemories() { return []; }
  storeReflection() { return Promise.resolve(); }
}
module.exports.VectorMemoryStore = StubVectorMemoryStore;
module.exports.default.VectorMemoryStore = StubVectorMemoryStore;
