import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EchoselfIntrospection } from '../echoself-introspection.js';

describe('EchoselfIntrospection', () => {
  let introspection: EchoselfIntrospection;

  beforeEach(() => {
    introspection = new EchoselfIntrospection({
      snapshotIntervalMs: 60000, // Long interval so it doesn't fire during tests
      maxSnapshots: 50,
      enableClustering: true,
      clusterCount: 5,
      enableEvolutionTimeline: true,
      enableIdentityDashboard: true,
    });
  });

  afterEach(() => {
    introspection.stop();
    introspection.removeAllListeners();
  });

  describe('Lifecycle', () => {
    it('should start and stop', () => {
      expect(introspection.isRunning()).toBe(false);
      introspection.start();
      expect(introspection.isRunning()).toBe(true);
      introspection.stop();
      expect(introspection.isRunning()).toBe(false);
    });

    it('should emit started and stopped events', () => {
      const events: string[] = [];
      introspection.on('started', () => events.push('started'));
      introspection.on('stopped', () => events.push('stopped'));

      introspection.start();
      introspection.stop();

      expect(events).toEqual(['started', 'stopped']);
    });

    it('should be idempotent on start', () => {
      introspection.start();
      introspection.start(); // Should not throw
      expect(introspection.isRunning()).toBe(true);
    });
  });

  describe('Hypergraph Node Management', () => {
    it('should add nodes and return IDs', () => {
      const id = introspection.addNode({
        type: 'concept',
        label: 'recursion',
        weight: 0.8,
        memoryType: 'declarative',
        metadata: { domain: 'computer-science' },
      });

      expect(id).toMatch(/^node_\d+$/);
      expect(introspection.getNodeCount()).toBe(1);
    });

    it('should add multiple nodes', () => {
      introspection.addNode({ type: 'concept', label: 'A', weight: 1, memoryType: 'declarative', metadata: {} });
      introspection.addNode({ type: 'entity', label: 'B', weight: 1, memoryType: 'episodic', metadata: {} });
      introspection.addNode({ type: 'goal', label: 'C', weight: 1, memoryType: 'intentional', metadata: {} });

      expect(introspection.getNodeCount()).toBe(3);
    });

    it('should emit node_added event', () => {
      let emitted = false;
      introspection.on('node_added', () => { emitted = true; });

      introspection.addNode({ type: 'concept', label: 'test', weight: 1, memoryType: 'declarative', metadata: {} });
      expect(emitted).toBe(true);
    });

    it('should track access count on accessNode', () => {
      const id = introspection.addNode({
        type: 'concept', label: 'test', weight: 1, memoryType: 'declarative', metadata: {},
      });

      introspection.accessNode(id);
      introspection.accessNode(id);
      introspection.accessNode(id);

      // Access count should be 4 (1 initial + 3 accesses)
      const snapshot = introspection.takeSnapshot();
      const node = snapshot.nodes.find(n => n.id === id);
      expect(node?.accessCount).toBe(4);
    });
  });

  describe('Hypergraph Edge Management', () => {
    it('should add edges between nodes', () => {
      const nodeA = introspection.addNode({ type: 'concept', label: 'A', weight: 1, memoryType: 'declarative', metadata: {} });
      const nodeB = introspection.addNode({ type: 'concept', label: 'B', weight: 1, memoryType: 'declarative', metadata: {} });

      const edgeId = introspection.addEdge({
        source: nodeA,
        target: nodeB,
        type: 'association',
        weight: 0.7,
        bidirectional: false,
      });

      expect(edgeId).toMatch(/^edge_\d+$/);
      expect(introspection.getEdgeCount()).toBe(1);
    });

    it('should add meta-edges', () => {
      const e1 = introspection.addEdge({ source: 'a', target: 'b', type: 'association', weight: 1, bidirectional: false });
      const e2 = introspection.addEdge({ source: 'b', target: 'c', type: 'causal', weight: 1, bidirectional: false });

      const metaId = introspection.addMetaEdge({
        edges: [e1, e2],
        type: 'conversation_flow',
        weight: 0.9,
      });

      expect(metaId).toMatch(/^meta_\d+$/);
    });
  });

  describe('Conversation Ingestion', () => {
    it('should ingest a conversation turn', () => {
      let ingested = false;
      introspection.on('conversation_ingested', () => { ingested = true; });

      introspection.ingestConversationTurn({
        role: 'user',
        content: 'What is reservoir computing?',
        timestamp: Date.now(),
        concepts: ['reservoir-computing', 'echo-state-network'],
        entities: ['Dan'],
        emotion: 'curious',
      });

      expect(ingested).toBe(true);
      // Should create: 1 memory + 2 concepts + 1 entity = 4 nodes
      expect(introspection.getNodeCount()).toBe(4);
      // Should create: 2 concept edges + 1 entity edge = 3 edges
      expect(introspection.getEdgeCount()).toBe(3);
    });

    it('should reuse existing concept nodes', () => {
      introspection.ingestConversationTurn({
        role: 'user',
        content: 'Tell me about AI',
        timestamp: Date.now(),
        concepts: ['artificial-intelligence'],
        entities: [],
      });

      introspection.ingestConversationTurn({
        role: 'assistant',
        content: 'AI is a broad field...',
        timestamp: Date.now(),
        concepts: ['artificial-intelligence', 'machine-learning'],
        entities: [],
      });

      // First turn: 1 memory + 1 concept = 2 nodes
      // Second turn: 1 memory + 1 new concept (ML) = 2 new nodes (AI reused)
      expect(introspection.getNodeCount()).toBe(4);
    });

    it('should handle turns without concepts or entities', () => {
      introspection.ingestConversationTurn({
        role: 'user',
        content: 'Hello!',
        timestamp: Date.now(),
      });

      expect(introspection.getNodeCount()).toBe(1); // Just the memory node
      expect(introspection.getEdgeCount()).toBe(0);
    });

    it('should record evolution timeline entry', () => {
      introspection.ingestConversationTurn({
        role: 'user',
        content: 'Test',
        timestamp: Date.now(),
        concepts: ['test'],
      });

      const timeline = introspection.getEvolutionTimeline();
      expect(timeline.length).toBe(1);
      expect(timeline[0].event).toContain('Ingested user turn');
      expect(timeline[0].nodesDelta).toBeGreaterThan(0);
    });
  });

  describe('Snapshots', () => {
    it('should take a snapshot', () => {
      introspection.addNode({ type: 'concept', label: 'A', weight: 1, memoryType: 'declarative', metadata: {} });
      introspection.addNode({ type: 'entity', label: 'B', weight: 1, memoryType: 'episodic', metadata: {} });

      const snapshot = introspection.takeSnapshot();

      expect(snapshot.nodeCount).toBe(2);
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.memoryDistribution.declarative).toBe(1);
      expect(snapshot.memoryDistribution.episodic).toBe(1);
    });

    it('should compute clusters', () => {
      introspection.addNode({ type: 'concept', label: 'A', weight: 1, memoryType: 'declarative', metadata: {} });
      introspection.addNode({ type: 'concept', label: 'B', weight: 1, memoryType: 'declarative', metadata: {} });
      introspection.addNode({ type: 'memory', label: 'C', weight: 1, memoryType: 'episodic', metadata: {} });

      const snapshot = introspection.takeSnapshot();
      expect(snapshot.clusterCentroids.length).toBeGreaterThan(0);
    });

    it('should limit snapshots to maxSnapshots', () => {
      const smallIntrospection = new EchoselfIntrospection({ maxSnapshots: 3 });

      for (let i = 0; i < 5; i++) {
        smallIntrospection.takeSnapshot();
      }

      expect(smallIntrospection.getSnapshots().length).toBe(3);
      smallIntrospection.removeAllListeners();
    });

    it('should emit snapshot_taken event', () => {
      let emitted = false;
      introspection.on('snapshot_taken', () => { emitted = true; });

      introspection.takeSnapshot();
      expect(emitted).toBe(true);
    });

    it('should compute coherence score', () => {
      // Add nodes and edges to create non-zero coherence
      const a = introspection.addNode({ type: 'concept', label: 'A', weight: 1, memoryType: 'declarative', metadata: {} });
      const b = introspection.addNode({ type: 'concept', label: 'B', weight: 1, memoryType: 'declarative', metadata: {} });
      introspection.addEdge({ source: a, target: b, type: 'association', weight: 1, bidirectional: false });

      introspection.accessNode(a);
      introspection.accessNode(b);

      const snapshot = introspection.takeSnapshot();
      expect(snapshot.coherenceScore).toBeGreaterThan(0);
    });
  });

  describe('Identity Dashboard', () => {
    it('should return default identity', () => {
      const identity = introspection.getIdentityDashboard();
      expect(identity.name).toBe('Deep Tree Echo');
      expect(identity.stage).toBe('EMERGENCE');
      expect(identity.coherence).toBe(0);
    });

    it('should update identity', () => {
      introspection.updateIdentity({
        stage: 'DIFFERENTIATION',
        coherence: 0.75,
        selfStory: 'I have differentiated.',
      });

      const identity = introspection.getIdentityDashboard();
      expect(identity.stage).toBe('DIFFERENTIATION');
      expect(identity.coherence).toBe(0.75);
      expect(identity.selfStory).toBe('I have differentiated.');
    });

    it('should record coherence changes in timeline', () => {
      introspection.updateIdentity({ coherence: 0.5 });
      introspection.updateIdentity({ coherence: 0.75 });

      const timeline = introspection.getEvolutionTimeline();
      expect(timeline.length).toBe(2);
      expect(timeline[1].coherenceDelta).toBeCloseTo(0.25, 5);
    });

    it('should emit identity_updated event', () => {
      let emitted = false;
      introspection.on('identity_updated', () => { emitted = true; });

      introspection.updateIdentity({ coherence: 0.5 });
      expect(emitted).toBe(true);
    });
  });

  describe('Training Events', () => {
    it('should record training events', () => {
      introspection.recordTrainingEvent(10, 5000);

      const timeline = introspection.getEvolutionTimeline();
      expect(timeline.length).toBe(1);
      expect(timeline[0].trainingExamplesAdded).toBe(10);
      expect(timeline[0].event).toContain('10 examples');
      expect(timeline[0].event).toContain('5000 tokens');
    });

    it('should emit training_recorded event', () => {
      let emitted = false;
      introspection.on('training_recorded', () => { emitted = true; });

      introspection.recordTrainingEvent(5, 2500);
      expect(emitted).toBe(true);
    });
  });

  describe('Dashboard Data', () => {
    it('should return comprehensive dashboard data', () => {
      introspection.start();
      introspection.addNode({ type: 'concept', label: 'test', weight: 1, memoryType: 'declarative', metadata: {} });
      introspection.takeSnapshot();

      const data = introspection.getDashboardData();
      expect(data.currentSnapshot).not.toBeNull();
      expect(data.currentSnapshot?.nodeCount).toBe(1);
      expect(data.snapshotCount).toBe(1);
      expect(data.uptimeMs).toBeGreaterThanOrEqual(0);
      expect(data.identity.name).toBe('Deep Tree Echo');
    });

    it('should return null snapshot when no snapshots taken', () => {
      const data = introspection.getDashboardData();
      expect(data.currentSnapshot).toBeNull();
    });
  });

  describe('Hypergraph Export', () => {
    it('should export the full hypergraph', () => {
      introspection.addNode({ type: 'concept', label: 'A', weight: 1, memoryType: 'declarative', metadata: {} });
      introspection.addNode({ type: 'entity', label: 'B', weight: 1, memoryType: 'episodic', metadata: {} });
      introspection.addEdge({ source: 'node_1', target: 'node_2', type: 'association', weight: 1, bidirectional: false });

      const exported = introspection.exportHypergraph();
      expect(exported.nodes).toHaveLength(2);
      expect(exported.edges).toHaveLength(1);
      expect(exported.identity.name).toBe('Deep Tree Echo');
    });
  });
});
