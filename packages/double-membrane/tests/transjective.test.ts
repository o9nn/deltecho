/**
 * Tests for Transjective Buffer Components
 *
 * Tests the membrane bus, codec pipeline, crossing policy, and Sys6 clock.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  // Packets
  createProvenance,
  createEvidencePacket,
  createIntentPacket,
  validateEvidencePacket,
  validateIntentPacket,
  addProvenanceStep,
  type Fact,
  type EvidencePacket,
  type IntentPacket,
} from '../src/transjective/packets.js';
import { MembraneBus } from '../src/transjective/MembraneBus.js';
import { CodecPipeline, type ArenaEvent } from '../src/transjective/CodecPipeline.js';
import { CrossingPolicy, type PolicyContext } from '../src/transjective/CrossingPolicy.js';
import { Sys6MembraneClock } from '../src/transjective/Sys6MembraneClock.js';

describe('Packets', () => {
  describe('Provenance', () => {
    it('should create provenance with source and trust level', () => {
      const prov = createProvenance(
        { type: 'tool', name: 'test-tool', version: '1.0' },
        'trusted'
      );

      expect(prov.id).toMatch(/^prov-/);
      expect(prov.source.type).toBe('tool');
      expect(prov.source.name).toBe('test-tool');
      expect(prov.trustLevel).toBe('trusted');
      expect(prov.processingChain).toHaveLength(0);
    });

    it('should add processing steps to provenance', () => {
      const prov = createProvenance({ type: 'api', name: 'openai' }, 'verified');
      const updated = addProvenanceStep(prov, 'validation', 'CrossingPolicy');

      expect(updated.processingChain).toHaveLength(1);
      expect(updated.processingChain[0].step).toBe('validation');
      expect(updated.processingChain[0].agent).toBe('CrossingPolicy');
    });
  });

  describe('EvidencePacket', () => {
    it('should create valid evidence packet', () => {
      const facts: Fact[] = [
        {
          id: 'fact-1',
          content: 'The sky is blue',
          confidence: 0.95,
          category: 'observation',
        },
      ];
      const prov = createProvenance({ type: 'user', name: 'test-user' }, 'trusted');
      const packet = createEvidencePacket(facts, prov);

      expect(packet.type).toBe('evidence');
      expect(packet.facts).toHaveLength(1);
      expect(packet.provenance.source.name).toBe('test-user');
    });

    it('should validate evidence packet structure', () => {
      const facts: Fact[] = [
        { id: 'f1', content: 'Test', confidence: 0.8, category: 'inference' },
      ];
      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');
      const packet = createEvidencePacket(facts, prov);

      const validation = validateEvidencePacket(packet);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid confidence values', () => {
      const facts: Fact[] = [
        { id: 'f1', content: 'Test', confidence: 1.5, category: 'observation' }, // Invalid
      ];
      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');
      const packet = createEvidencePacket(facts, prov);

      const validation = validateEvidencePacket(packet);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('confidence'))).toBe(true);
    });
  });

  describe('IntentPacket', () => {
    it('should create valid intent packet', () => {
      const packet = createIntentPacket(
        { description: 'Search for information', category: 'query' },
        {
          allowedTools: [{ name: 'search' }],
          budget: { maxTokens: 1000 },
        }
      );

      expect(packet.type).toBe('intent');
      expect(packet.goal.category).toBe('query');
      expect(packet.allowedTools).toHaveLength(1);
    });

    it('should validate intent packet structure', () => {
      const packet = createIntentPacket(
        { description: 'Test action', category: 'action' },
        {
          allowedTools: [{ name: 'test-tool' }],
          budget: { maxTokens: 500 },
          redactionPolicy: { redactFields: [], redactPatterns: [] },
          expectedReturn: { type: 'text' },
        }
      );

      const validation = validateIntentPacket(packet);
      expect(validation.valid).toBe(true);
    });
  });
});

describe('MembraneBus', () => {
  let bus: MembraneBus;

  beforeEach(() => {
    bus = new MembraneBus({ maxEntries: 100 });
    bus.start();
  });

  afterEach(() => {
    bus.stop();
  });

  it('should start and stop correctly', () => {
    expect(bus.isRunning()).toBe(true);
    bus.stop();
    expect(bus.isRunning()).toBe(false);
  });

  it('should submit evidence packets (inward)', () => {
    const facts: Fact[] = [
      { id: 'f1', content: 'Test fact', confidence: 0.9, category: 'observation' },
    ];
    const prov = createProvenance({ type: 'tool', name: 'test' }, 'trusted');
    const packet = createEvidencePacket(facts, prov);

    const entry = bus.submitEvidence(packet);

    expect(entry.direction).toBe('inward');
    expect(entry.status).toBe('pending');
    expect(entry.sequence).toBe(1);
  });

  it('should submit intent packets (outward)', () => {
    const packet = createIntentPacket(
      { description: 'Test', category: 'query' },
      { allowedTools: [] }
    );

    const entry = bus.submitIntent(packet);

    expect(entry.direction).toBe('outward');
    expect(entry.status).toBe('pending');
  });

  it('should track queue depths', () => {
    const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

    // Submit 3 inward, 2 outward
    for (let i = 0; i < 3; i++) {
      bus.submitEvidence(
        createEvidencePacket(
          [{ id: `f${i}`, content: 'Test', confidence: 0.8, category: 'observation' }],
          prov
        )
      );
    }
    for (let i = 0; i < 2; i++) {
      bus.submitIntent(
        createIntentPacket({ description: 'Test', category: 'query' }, { allowedTools: [] })
      );
    }

    const depths = bus.getQueueDepths();
    expect(depths.inward).toBe(3);
    expect(depths.outward).toBe(2);
  });

  it('should approve and reject entries', () => {
    const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');
    const packet = createEvidencePacket(
      [{ id: 'f1', content: 'Test', confidence: 0.8, category: 'observation' }],
      prov
    );

    const entry = bus.submitEvidence(packet);
    bus.markProcessing(entry.id, 'TestProcessor');
    bus.approve(entry.id);

    const updated = bus.getEntry(entry.id);
    expect(updated?.status).toBe('approved');
  });

  it('should maintain statistics', () => {
    const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

    for (let i = 0; i < 5; i++) {
      const entry = bus.submitEvidence(
        createEvidencePacket(
          [{ id: `f${i}`, content: 'Test', confidence: 0.8, category: 'observation' }],
          prov
        )
      );
      bus.markProcessing(entry.id, 'TestProcessor');
      if (i % 2 === 0) {
        bus.approve(entry.id);
      } else {
        bus.reject(entry.id, 'Test rejection');
      }
    }

    const stats = bus.getStats();
    expect(stats.totalEntries).toBe(5);
    expect(stats.approvedCount).toBe(3);
    expect(stats.rejectedCount).toBe(2);
  });
});

describe('CodecPipeline', () => {
  let codec: CodecPipeline;

  beforeEach(() => {
    codec = new CodecPipeline({ embeddingDim: 128 });
  });

  describe('Graphize', () => {
    it('should convert arena events to hypergraph', () => {
      const events: ArenaEvent[] = [
        {
          id: 'e1',
          type: 'message',
          content: 'John said hello to Mary',
          source: 'chat',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'e2',
          type: 'action',
          content: 'Mary responded with a greeting',
          source: 'chat',
          timestamp: new Date().toISOString(),
        },
      ];

      const graph = codec.graphize(events);

      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
      expect(graph.metadata.source).toBe('CodecPipeline.graphize');
    });

    it('should create temporal edges between events', () => {
      const events: ArenaEvent[] = [
        { id: 'e1', type: 'a', content: 'First', source: 's', timestamp: '2024-01-01T00:00:00Z' },
        { id: 'e2', type: 'b', content: 'Second', source: 's', timestamp: '2024-01-01T00:01:00Z' },
      ];

      const graph = codec.graphize(events);
      const temporalEdges = graph.edges.filter((e) => e.type === 'temporal');

      expect(temporalEdges.length).toBe(1);
      expect(temporalEdges[0].sourceIds).toContain('event-e1');
      expect(temporalEdges[0].targetIds).toContain('event-e2');
    });
  });

  describe('Tensorize', () => {
    it('should convert hypergraph to tensor representation', () => {
      const events: ArenaEvent[] = [
        { id: 'e1', type: 'test', content: 'Test content', source: 's', timestamp: new Date().toISOString() },
      ];
      const graph = codec.graphize(events);
      const tensor = codec.tensorize(graph);

      expect(tensor.embedding.length).toBe(128);
      expect(tensor.dim).toBe(128);
      expect(tensor.metadata.source).toBe('CodecPipeline.tensorize');
    });

    it('should tensorize facts with embeddings', () => {
      const facts: Fact[] = [
        { id: 'f1', content: 'Fact one', confidence: 0.9, category: 'observation' },
        { id: 'f2', content: 'Fact two', confidence: 0.8, category: 'inference' },
      ];

      const tensor = codec.tensorizeFacts(facts);

      expect(tensor.embedding.length).toBe(128);
      expect(tensor.metadata.confidence).toBeCloseTo(0.85, 1);
    });
  });

  describe('Summarize', () => {
    it('should summarize text content', () => {
      const text =
        'This is the first sentence. This is the second sentence. This is the third sentence with more important content.';

      const summary = codec.summarize(text);

      expect(summary.text.length).toBeLessThanOrEqual(text.length);
      expect(summary.keyPoints.length).toBeGreaterThanOrEqual(0);
      expect(summary.compressionRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('Redact', () => {
    it('should redact email addresses', () => {
      const text = 'Contact me at john@example.com for more info.';
      const redacted = codec.redact(text, { redactFields: [], redactPatterns: [] });

      expect(redacted).not.toContain('john@example.com');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should redact phone numbers', () => {
      const text = 'Call me at 123-456-7890 or 9876543210.';
      const redacted = codec.redact(text, { redactFields: [], redactPatterns: [] });

      expect(redacted).not.toContain('123-456-7890');
    });

    it('should apply custom redaction patterns', () => {
      const text = 'Secret code: ABC123';
      const redacted = codec.redact(text, {
        redactFields: [],
        redactPatterns: ['ABC\\d+'],
      });

      expect(redacted).not.toContain('ABC123');
    });
  });
});

describe('CrossingPolicy', () => {
  let policy: CrossingPolicy;

  beforeEach(() => {
    policy = new CrossingPolicy({
      maxRiskScore: 0.7,
      minEvidenceConfidence: 0.3,
    });
  });

  it('should approve valid evidence packets', () => {
    const facts: Fact[] = [
      { id: 'f1', content: 'Valid fact', confidence: 0.8, category: 'observation' },
    ];
    const prov = createProvenance({ type: 'tool', name: 'trusted-tool' }, 'trusted');
    const packet = createEvidencePacket(facts, prov);

    const context = policy.createContext({ sys6Step: 5, energyLevel: 0.8 });
    const result = policy.evaluateInward(packet, context);

    expect(result.decision).toBe('approve');
  });

  it('should reject high-risk packets', () => {
    const facts: Fact[] = [
      { id: 'f1', content: 'Suspicious content', confidence: 0.9, category: 'tool_output' },
    ];
    const prov = createProvenance({ type: 'api', name: 'unknown-api' }, 'unknown');
    const packet = createEvidencePacket(facts, prov, {
      risk: { score: 0.9, categories: ['high'], concerns: ['Suspicious pattern'] },
    });

    const context = policy.createContext({ sys6Step: 5, energyLevel: 0.8 });
    const result = policy.evaluateInward(packet, context);

    expect(result.decision).not.toBe('approve');
  });

  it('should reject packets from hostile sources', () => {
    const facts: Fact[] = [
      { id: 'f1', content: 'Malicious content', confidence: 0.99, category: 'tool_output' },
    ];
    const prov = createProvenance({ type: 'api', name: 'bad-actor' }, 'hostile');
    const packet = createEvidencePacket(facts, prov);

    const context = policy.createContext({ sys6Step: 5, energyLevel: 0.8 });
    const result = policy.evaluateInward(packet, context);

    expect(result.decision).toBe('reject');
    expect(result.reason).toContain('hostile');
  });

  it('should defer in low energy mode for non-critical packets', () => {
    const facts: Fact[] = [
      { id: 'f1', content: 'Normal fact', confidence: 0.8, category: 'observation' },
    ];
    const prov = createProvenance({ type: 'tool', name: 'tool' }, 'trusted');
    const packet = createEvidencePacket(facts, prov, {
      metadata: { priority: 'low' },
    });

    const context = policy.createContext({ sys6Step: 5, energyLevel: 0.1 });
    const result = policy.evaluateInward(packet, context);

    expect(result.decision).toBe('defer');
    expect(result.reason).toContain('energy');
  });

  it('should approve valid intent packets', () => {
    const packet = createIntentPacket(
      { description: 'Search for data', category: 'query' },
      {
        allowedTools: [{ name: 'search' }],
        budget: { maxTokens: 500 },
        redactionPolicy: { redactFields: [], redactPatterns: [] },
        expectedReturn: { type: 'text' },
      }
    );

    const context = policy.createContext({ sys6Step: 25, energyLevel: 0.8 });
    const result = policy.evaluateOutward(packet, context);

    expect(result.decision).toBe('approve');
  });

  it('should track crossing history', () => {
    const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

    for (let i = 0; i < 5; i++) {
      const packet = createEvidencePacket(
        [{ id: `f${i}`, content: 'Test', confidence: 0.8, category: 'observation' }],
        prov
      );
      const context = policy.createContext({ sys6Step: i + 1, energyLevel: 0.8 });
      policy.evaluateInward(packet, context);
    }

    const history = policy.getHistory();
    expect(history.length).toBe(5);
  });
});

describe('Sys6MembraneClock', () => {
  let clock: Sys6MembraneClock;
  let bus: MembraneBus;
  let policy: CrossingPolicy;
  let codec: CodecPipeline;

  beforeEach(() => {
    clock = new Sys6MembraneClock({ autoAdvance: false });
    bus = new MembraneBus();
    policy = new CrossingPolicy();
    codec = new CodecPipeline();

    clock.connect(bus, policy, codec);
    bus.start();
    clock.start();
  });

  afterEach(() => {
    clock.stop();
    bus.stop();
  });

  it('should start at step 0 and advance to step 1', () => {
    const tick = clock.tick();
    expect(tick.address.globalStep).toBe(1);
  });

  it('should cycle through 30 steps', () => {
    for (let i = 0; i < 30; i++) {
      clock.tick();
    }
    const tick = clock.tick();
    expect(tick.address.globalStep).toBe(1); // Wraps around
  });

  it('should calculate correct phase, stage, step', () => {
    // Step 1: Phase 1, Stage 1, Step 1
    let tick = clock.tick();
    expect(tick.address.phase).toBe(1);
    expect(tick.address.stage).toBe(1);
    expect(tick.address.step).toBe(1);

    // Step 2: Phase 1, Stage 1, Step 2
    tick = clock.tick();
    expect(tick.address.phase).toBe(1);
    expect(tick.address.stage).toBe(1);
    expect(tick.address.step).toBe(2);

    // Step 3: Phase 1, Stage 2, Step 1
    tick = clock.tick();
    expect(tick.address.phase).toBe(1);
    expect(tick.address.stage).toBe(2);
    expect(tick.address.step).toBe(1);

    // Advance to step 11 (Phase 2)
    for (let i = 0; i < 7; i++) clock.tick();
    tick = clock.tick();
    expect(tick.address.globalStep).toBe(11);
    expect(tick.address.phase).toBe(2);
  });

  it('should alternate dyad state', () => {
    const tick1 = clock.tick();
    const tick2 = clock.tick();

    expect(tick1.address.dyadState).toBe('A');
    expect(tick2.address.dyadState).toBe('B');
  });

  it('should track energy levels', () => {
    clock.setEnergyLevel(1.0);
    expect(clock.getEnergyLevel()).toBe(1.0);

    // Tick should decay energy slightly
    clock.tick();
    expect(clock.getEnergyLevel()).toBeLessThanOrEqual(1.0);
  });

  it('should report inward/outward crossing availability', () => {
    // Phase 1 (steps 1-10): inward preferred
    clock.tick(); // Step 1
    expect(clock.canCrossInward()).toBe(true);

    // Advance to Phase 3 (steps 21-30): outward preferred
    for (let i = 0; i < 20; i++) clock.tick();
    expect(clock.canCrossOutward()).toBe(true);
  });

  it('should manage Delta-2 lanes', () => {
    const lanes = clock.getDelta2Lanes();
    expect(lanes.length).toBe(8);

    const toolLane = clock.getOptimalDelta2Lane('tool_call');
    expect(toolLane).toBeDefined();
    expect(toolLane?.type).toBe('tool_call');

    // Allocate load
    const allocated = clock.allocateDelta2Load(toolLane!.id, 5);
    expect(allocated).toBe(true);

    // Check load
    const updatedLane = clock.getDelta2Lanes().find((l) => l.id === toolLane!.id);
    expect(updatedLane?.currentLoad).toBe(5);

    // Release load
    clock.releaseDelta2Load(toolLane!.id, 3);
    const finalLane = clock.getDelta2Lanes().find((l) => l.id === toolLane!.id);
    expect(finalLane?.currentLoad).toBe(2);
  });

  it('should cycle Delta-3 phases', () => {
    const phases = new Set<string>();

    for (let i = 0; i < 30; i++) {
      const tick = clock.tick();
      if (tick.delta3Phase) {
        phases.add(tick.delta3Phase.type);
      }
    }

    // Should have cycled through multiple phases
    expect(phases.size).toBeGreaterThan(1);
  });
});
