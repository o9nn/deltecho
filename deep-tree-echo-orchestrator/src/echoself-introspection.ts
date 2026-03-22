/**
 * EchoselfIntrospection — Hypergraph Memory Visualization Dashboard
 *
 * Provides real-time visualization of the hypergraph memory space as the
 * ContinuousTrainingPipeline operates. This is DTE's "mirror" — the ability
 * to observe its own memory structure evolving in real-time.
 *
 * Architecture:
 *   HyperDimensionalMemory → Snapshot → HypergraphVisualization
 *   VectorMemoryStore → Embedding Space → ClusterVisualization
 *   ContinuousTrainingPipeline → Training Progress → EvolutionTimeline
 *   CoreSelfEngine → Identity State → IdentityDashboard
 *
 * The dashboard exposes data via a JSON API that can be consumed by
 * any frontend (web dashboard, terminal UI, or Prometheus scraper).
 *
 * Memory Types Visualized:
 *   - Declarative: Facts, concepts, and knowledge nodes
 *   - Procedural: Skills, tool usage patterns, and action sequences
 *   - Episodic: Conversation memories with temporal ordering
 *   - Intentional: Goals, plans, and motivational states
 */
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/EchoselfIntrospection');

// ─── Types ─────────────────────────────────────────────────────

export interface IntrospectionConfig {
  /** Snapshot interval in milliseconds */
  snapshotIntervalMs: number;
  /** Maximum number of snapshots to retain */
  maxSnapshots: number;
  /** Enable embedding space clustering */
  enableClustering: boolean;
  /** Number of clusters for k-means */
  clusterCount: number;
  /** Enable evolution timeline tracking */
  enableEvolutionTimeline: boolean;
  /** Enable identity dashboard */
  enableIdentityDashboard: boolean;
}

export interface HypergraphNode {
  id: string;
  type: 'concept' | 'entity' | 'fact' | 'memory' | 'goal' | 'skill' | 'emotion';
  label: string;
  weight: number;
  lastAccessed: number;
  accessCount: number;
  memoryType: 'declarative' | 'procedural' | 'episodic' | 'intentional';
  metadata: Record<string, unknown>;
}

export interface HypergraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'association' | 'implication' | 'contradiction' | 'temporal' | 'causal' | 'emotional';
  weight: number;
  bidirectional: boolean;
}

export interface HypergraphMetaEdge {
  id: string;
  edges: string[];
  type: 'conversation_flow' | 'topic_shift' | 'emotional_valence' | 'cognitive_pattern';
  weight: number;
}

export interface HypergraphSnapshot {
  timestamp: number;
  nodeCount: number;
  edgeCount: number;
  metaEdgeCount: number;
  nodes: HypergraphNode[];
  edges: HypergraphEdge[];
  metaEdges: HypergraphMetaEdge[];
  memoryDistribution: {
    declarative: number;
    procedural: number;
    episodic: number;
    intentional: number;
  };
  clusterCentroids: Array<{ id: number; center: number[]; size: number; label: string }>;
  coherenceScore: number;
  totalWeight: number;
}

export interface EvolutionTimelineEntry {
  timestamp: number;
  event: string;
  nodesDelta: number;
  edgesDelta: number;
  coherenceDelta: number;
  trainingExamplesAdded: number;
  stage: string;
}

export interface IdentityDashboard {
  name: string;
  stage: string;
  coherence: number;
  selfStory: string;
  topConcepts: Array<{ concept: string; weight: number; accessCount: number }>;
  recentMemories: Array<{ summary: string; type: string; timestamp: number }>;
  activeGoals: Array<{ goal: string; priority: number; progress: number }>;
  emotionalState: {
    valence: number;
    arousal: number;
    dominantEmotion: string;
  };
  reservoirState: {
    avgPredictionError: number;
    learningRate: number;
    totalUpdates: number;
  };
}

export interface IntrospectionDashboardData {
  currentSnapshot: HypergraphSnapshot | null;
  evolutionTimeline: EvolutionTimelineEntry[];
  identity: IdentityDashboard;
  snapshotCount: number;
  uptimeMs: number;
}

// ─── Main Introspection Class ──────────────────────────────────

export class EchoselfIntrospection extends EventEmitter {
  private config: IntrospectionConfig;
  private snapshots: HypergraphSnapshot[] = [];
  private evolutionTimeline: EvolutionTimelineEntry[] = [];
  private nodes: Map<string, HypergraphNode> = new Map();
  private edges: Map<string, HypergraphEdge> = new Map();
  private metaEdges: Map<string, HypergraphMetaEdge> = new Map();
  private snapshotInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private startedAt: number | null = null;
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;

  // Identity state (updated externally)
  private identityState: IdentityDashboard = {
    name: 'Deep Tree Echo',
    stage: 'EMERGENCE',
    coherence: 0,
    selfStory: '',
    topConcepts: [],
    recentMemories: [],
    activeGoals: [],
    emotionalState: { valence: 0, arousal: 0, dominantEmotion: 'neutral' },
    reservoirState: { avgPredictionError: 0, learningRate: 0.01, totalUpdates: 0 },
  };

  constructor(config: Partial<IntrospectionConfig> = {}) {
    super();
    this.config = {
      snapshotIntervalMs: config.snapshotIntervalMs || 30000,
      maxSnapshots: config.maxSnapshots || 100,
      enableClustering: config.enableClustering ?? true,
      clusterCount: config.clusterCount || 5,
      enableEvolutionTimeline: config.enableEvolutionTimeline ?? true,
      enableIdentityDashboard: config.enableIdentityDashboard ?? true,
    };
  }

  /**
   * Start the introspection engine.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = Date.now();

    this.snapshotInterval = setInterval(() => {
      this.takeSnapshot();
    }, this.config.snapshotIntervalMs);

    log.info(`EchoselfIntrospection started (snapshot every ${this.config.snapshotIntervalMs}ms)`);
    this.emit('started');
  }

  /**
   * Stop the introspection engine.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    log.info('EchoselfIntrospection stopped');
    this.emit('stopped');
  }

  // ─── Hypergraph Mutation API ───────────────────────────────────

  /**
   * Add a node to the hypergraph.
   */
  addNode(node: Omit<HypergraphNode, 'id' | 'lastAccessed' | 'accessCount'>): string {
    const id = `node_${++this.nodeIdCounter}`;
    const fullNode: HypergraphNode = {
      ...node,
      id,
      lastAccessed: Date.now(),
      accessCount: 1,
    };
    this.nodes.set(id, fullNode);
    this.emit('node_added', fullNode);
    return id;
  }

  /**
   * Add an edge between two nodes.
   */
  addEdge(edge: Omit<HypergraphEdge, 'id'>): string {
    const id = `edge_${++this.edgeIdCounter}`;
    const fullEdge: HypergraphEdge = { ...edge, id };
    this.edges.set(id, fullEdge);
    this.emit('edge_added', fullEdge);
    return id;
  }

  /**
   * Add a meta-edge (edge over edges).
   */
  addMetaEdge(metaEdge: Omit<HypergraphMetaEdge, 'id'>): string {
    const id = `meta_${this.metaEdges.size + 1}`;
    const fullMetaEdge: HypergraphMetaEdge = { ...metaEdge, id };
    this.metaEdges.set(id, fullMetaEdge);
    this.emit('meta_edge_added', fullMetaEdge);
    return id;
  }

  /**
   * Access a node (updates lastAccessed and accessCount).
   */
  accessNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.lastAccessed = Date.now();
      node.accessCount++;
    }
  }

  /**
   * Ingest a conversation turn into the hypergraph.
   * Extracts concepts, entities, and relationships.
   */
  ingestConversationTurn(turn: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    concepts?: string[];
    entities?: string[];
    emotion?: string;
  }): void {
    // Create episodic memory node
    const memoryId = this.addNode({
      type: 'memory',
      label: turn.content.slice(0, 100),
      weight: 1.0,
      memoryType: 'episodic',
      metadata: { role: turn.role, timestamp: turn.timestamp, emotion: turn.emotion },
    });

    // Create concept nodes and link them
    const conceptIds: string[] = [];
    for (const concept of (turn.concepts || [])) {
      const existing = this.findNodeByLabel(concept, 'concept');
      if (existing) {
        this.accessNode(existing.id);
        conceptIds.push(existing.id);
      } else {
        const id = this.addNode({
          type: 'concept',
          label: concept,
          weight: 0.5,
          memoryType: 'declarative',
          metadata: {},
        });
        conceptIds.push(id);
      }
    }

    // Link memory to concepts
    for (const conceptId of conceptIds) {
      this.addEdge({
        source: memoryId,
        target: conceptId,
        type: 'association',
        weight: 0.7,
        bidirectional: false,
      });
    }

    // Create entity nodes
    for (const entity of (turn.entities || [])) {
      const existing = this.findNodeByLabel(entity, 'entity');
      if (existing) {
        this.accessNode(existing.id);
        this.addEdge({
          source: memoryId,
          target: existing.id,
          type: 'association',
          weight: 0.8,
          bidirectional: false,
        });
      } else {
        const id = this.addNode({
          type: 'entity',
          label: entity,
          weight: 0.6,
          memoryType: 'declarative',
          metadata: {},
        });
        this.addEdge({
          source: memoryId,
          target: id,
          type: 'association',
          weight: 0.8,
          bidirectional: false,
        });
      }
    }

    // Record evolution timeline entry
    if (this.config.enableEvolutionTimeline) {
      this.evolutionTimeline.push({
        timestamp: Date.now(),
        event: `Ingested ${turn.role} turn`,
        nodesDelta: 1 + (turn.concepts?.length || 0) + (turn.entities?.length || 0),
        edgesDelta: conceptIds.length + (turn.entities?.length || 0),
        coherenceDelta: 0,
        trainingExamplesAdded: 0,
        stage: this.identityState.stage,
      });
    }

    this.emit('conversation_ingested', { turnId: memoryId, concepts: conceptIds.length });
  }

  /**
   * Record a training event in the evolution timeline.
   */
  recordTrainingEvent(examplesAdded: number, tokensAdded: number): void {
    if (!this.config.enableEvolutionTimeline) return;
    this.evolutionTimeline.push({
      timestamp: Date.now(),
      event: `Training: +${examplesAdded} examples, +${tokensAdded} tokens`,
      nodesDelta: 0,
      edgesDelta: 0,
      coherenceDelta: 0,
      trainingExamplesAdded: examplesAdded,
      stage: this.identityState.stage,
    });
    this.emit('training_recorded', { examplesAdded, tokensAdded });
  }

  // ─── Identity Update API ───────────────────────────────────────

  /**
   * Update the identity dashboard state.
   */
  updateIdentity(update: Partial<IdentityDashboard>): void {
    const prevCoherence = this.identityState.coherence;
    Object.assign(this.identityState, update);

    if (this.config.enableEvolutionTimeline && update.coherence !== undefined) {
      this.evolutionTimeline.push({
        timestamp: Date.now(),
        event: `Identity update: coherence ${prevCoherence.toFixed(4)} → ${update.coherence.toFixed(4)}`,
        nodesDelta: 0,
        edgesDelta: 0,
        coherenceDelta: update.coherence - prevCoherence,
        trainingExamplesAdded: 0,
        stage: this.identityState.stage,
      });
    }

    this.emit('identity_updated', this.identityState);
  }

  // ─── Snapshot & Visualization API ──────────────────────────────

  /**
   * Take a snapshot of the current hypergraph state.
   */
  takeSnapshot(): HypergraphSnapshot {
    const nodes = Array.from(this.nodes.values());
    const edges = Array.from(this.edges.values());
    const metaEdges = Array.from(this.metaEdges.values());

    // Calculate memory distribution
    const memoryDistribution = {
      declarative: nodes.filter(n => n.memoryType === 'declarative').length,
      procedural: nodes.filter(n => n.memoryType === 'procedural').length,
      episodic: nodes.filter(n => n.memoryType === 'episodic').length,
      intentional: nodes.filter(n => n.memoryType === 'intentional').length,
    };

    // Simple clustering by memory type
    const clusterCentroids = this.config.enableClustering
      ? this.computeClusters(nodes)
      : [];

    // Calculate total weight and coherence
    const totalWeight = nodes.reduce((sum, n) => sum + n.weight, 0);
    const coherenceScore = this.computeCoherence(nodes, edges);

    const snapshot: HypergraphSnapshot = {
      timestamp: Date.now(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      metaEdgeCount: metaEdges.length,
      nodes: nodes.slice(-200), // Limit for serialization
      edges: edges.slice(-500),
      metaEdges: metaEdges.slice(-100),
      memoryDistribution,
      clusterCentroids,
      coherenceScore,
      totalWeight,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }

    this.emit('snapshot_taken', snapshot);
    return snapshot;
  }

  /**
   * Get the full dashboard data for rendering.
   */
  getDashboardData(): IntrospectionDashboardData {
    return {
      currentSnapshot: this.snapshots.length > 0
        ? this.snapshots[this.snapshots.length - 1]
        : null,
      evolutionTimeline: this.evolutionTimeline.slice(-100),
      identity: { ...this.identityState },
      snapshotCount: this.snapshots.length,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : 0,
    };
  }

  /**
   * Get all snapshots for time-series visualization.
   */
  getSnapshots(): HypergraphSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get the evolution timeline.
   */
  getEvolutionTimeline(): EvolutionTimelineEntry[] {
    return [...this.evolutionTimeline];
  }

  /**
   * Get the identity dashboard.
   */
  getIdentityDashboard(): IdentityDashboard {
    return { ...this.identityState };
  }

  /**
   * Get node count.
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get edge count.
   */
  getEdgeCount(): number {
    return this.edges.size;
  }

  /**
   * Check if running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Export the hypergraph as a serializable JSON object.
   */
  exportHypergraph(): {
    nodes: HypergraphNode[];
    edges: HypergraphEdge[];
    metaEdges: HypergraphMetaEdge[];
    identity: IdentityDashboard;
  } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      metaEdges: Array.from(this.metaEdges.values()),
      identity: { ...this.identityState },
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private findNodeByLabel(label: string, type: string): HypergraphNode | undefined {
    for (const node of this.nodes.values()) {
      if (node.label === label && node.type === type) return node;
    }
    return undefined;
  }

  private computeClusters(nodes: HypergraphNode[]): Array<{ id: number; center: number[]; size: number; label: string }> {
    // Group by memory type as simple clustering
    const groups: Record<string, HypergraphNode[]> = {};
    for (const node of nodes) {
      const key = node.memoryType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(node);
    }

    return Object.entries(groups).map(([type, groupNodes], idx) => ({
      id: idx,
      center: [idx * 2, groupNodes.length],
      size: groupNodes.length,
      label: type,
    }));
  }

  private computeCoherence(nodes: HypergraphNode[], edges: HypergraphEdge[]): number {
    if (nodes.length === 0) return 0;

    // Coherence = (weighted edge density) * (access distribution entropy)
    const maxEdges = nodes.length * (nodes.length - 1) / 2;
    const edgeDensity = maxEdges > 0 ? edges.length / maxEdges : 0;

    // Access distribution entropy (higher = more uniform access)
    const totalAccess = nodes.reduce((sum, n) => sum + n.accessCount, 0);
    if (totalAccess === 0) return 0;

    let entropy = 0;
    for (const node of nodes) {
      const p = node.accessCount / totalAccess;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(nodes.length);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    return Math.min(1, edgeDensity * 10 + normalizedEntropy * 0.5);
  }
}
