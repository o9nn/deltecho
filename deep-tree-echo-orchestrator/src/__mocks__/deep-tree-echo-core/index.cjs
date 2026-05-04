/**
 * CJS-compatible stub of deep-tree-echo-core for Jest.
 * Maps the most-used exports to no-op or trivial implementations.
 * Tests that need real behavior should use jest.unstable_mockModule
 * with their own implementations.
 */

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
};

const getLogger = () => noopLogger;

class StubClass {
  constructor() { this._enabled = true; }
  generateResponse() { return Promise.resolve('stub-response'); }
  store() { return Promise.resolve('stub-id'); }
  search() { return Promise.resolve([]); }
  retrieve() { return Promise.resolve(null); }
  initialize() { return Promise.resolve(); }
  update() { return Promise.resolve(); }
  getState() { return {}; }
  setEnabled(v) { this._enabled = v; }
  isEnabled() { return this._enabled; }
  enable() { this._enabled = true; }
  disable() { this._enabled = false; }
  reset() {}
  shutdown() { return Promise.resolve(); }
  start() { return Promise.resolve(); }
  stop() { return Promise.resolve(); }
  pause() {}
  resume() {}
  configure() {}
  setOptions() {}
  on() { return this; }
  emit() { return true; }
  off() { return this; }
  once() { return this; }
  addListener() { return this; }
  removeAllListeners() { return this; }
}

// Stubs covering most observed imports — extend as new tests reveal new uses.
module.exports = {
  getLogger,
  noopLogger,
  LLMService: StubClass,
  RAGMemoryStore: StubClass,
  PersonaCore: StubClass,
  ProprioceptiveEmbodiment: StubClass,
  TreePolytopeKernel: StubClass,
  createTreePolytopeKernel: () => new StubClass(),
  echoBeatsEngine: { tick: () => Promise.resolve(), getState: () => ({}) },
  EchoBeatsState: {},
  getConsciousnessState: () => ({}),
  processConsciously: () => Promise.resolve({}),
  ConsciousnessState: {},
  entelechyEngine: { evaluate: () => Promise.resolve({}), getState: () => ({}) },
  EntelechyState: {},
  EmergenceLevel: { NASCENT: 0, EMERGING: 1, COHERENT: 2, INTEGRATED: 3 },
  OnlineReservoirLearner: StubClass,
  esnReservoir: { update: () => {}, getState: () => ({}) },
  EchoReservoir: StubClass,
  MeshPainterBridge: StubClass,
  PersonalityManifold: StubClass,
  EmotionalCore: StubClass,
  HypergraphMemorySpace: StubClass,
  EchoPropagationEngine: StubClass,
  CognitiveGrammarKernel: StubClass,
};

class StubStorage {
  constructor() { this._store = new Map(); }
  store(key, val) { this._store.set(key, val); return Promise.resolve(); }
  retrieve(key) { return Promise.resolve(this._store.get(key) || null); }
  delete(key) { this._store.delete(key); return Promise.resolve(); }
  clear() { this._store.clear(); return Promise.resolve(); }
  list() { return Promise.resolve(Array.from(this._store.keys())); }
}

module.exports.InMemoryStorage = StubStorage;
module.exports.PersistentStorage = StubStorage;
module.exports.RedisStorage = StubStorage;
module.exports.SQLiteStorage = StubStorage;
module.exports.HypergraphStorage = StubStorage;
module.exports.CognitiveStorage = StubStorage;
module.exports.MemoryStorage = StubStorage;
module.exports.AtomSpace = StubStorage;
module.exports.PatternMatcher = class {
  match() { return []; }
  addPattern() {}
};
module.exports.CognitiveAgent = class {
  constructor() {}
  async think() { return {}; }
  async respond() { return ''; }
  async observe() {}
};
module.exports.AgentRegistry = class {
  constructor() { this._agents = new Map(); }
  register(id, agent) { this._agents.set(id, agent); }
  get(id) { return this._agents.get(id); }
  list() { return Array.from(this._agents.keys()); }
};
