/**
 * Membrane Transport Test Suite
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  MembraneBus,
  MembraneDirection,
  CrossingPolicy,
  Sys6MembraneTransport,
  Sys6Stage,
  EvidencePacket,
  IntentPacket,
} from '../src';

describe('MembraneBus', () => {
  let bus: MembraneBus;
  
  beforeEach(() => {
    bus = new MembraneBus({
      maxLogSize: 100,
      validatePackets: true,
      maxPacketSize: 1024 * 1024,
    });
  });
  
  it('should create a membrane bus', () => {
    expect(bus).toBeDefined();
  });
  
  it('should send evidence packet inward', async () => {
    const packet: EvidencePacket = {
      id: 'test-evidence-1',
      type: 'evidence',
      facts: [
        {
          claim: 'Test fact',
          confidence: 0.9,
          evidence: { data: 'test' },
        },
      ],
      provenance: {
        source: 'test-source',
        timestamp: Date.now(),
        confidence: 0.9,
        transformations: [],
      },
      cost: {
        compute: 100,
        time: 10,
        energy: 5,
        memory: 1024,
      },
      risk: {
        privacy: 0.1,
        injection: 0.1,
        exfiltration: 0.1,
        level: 'low',
        mitigations: [],
      },
      metadata: {},
    };
    
    let received = false;
    bus.on('packet:inward', (p) => {
      expect(p.id).toBe(packet.id);
      received = true;
    });
    
    await bus.sendInward(packet);
    expect(received).toBe(true);
    
    const stats = bus.getStatistics();
    expect(stats.inwardPackets).toBe(1);
  });
  
  it('should send intent packet outward', async () => {
    const packet: IntentPacket = {
      id: 'test-intent-1',
      type: 'intent',
      goal: {
        description: 'Test goal',
        success_criteria: ['criterion1'],
        priority: 1,
      },
      constraints: {
        time_limit: 1000,
        resource_limit: {
          compute: 1000,
          time: 1000,
          energy: 100,
          memory: 1024 * 1024,
        },
        safety_requirements: [],
      },
      allowedTools: ['tool1'],
      redactionPolicy: {
        redact_embeddings: true,
        redact_private_memory: true,
        allowed_data_types: ['text'],
      },
      budget: {
        compute: 1000,
        time: 1000,
        energy: 100,
        memory: 1024 * 1024,
      },
      expectedReturnType: 'result',
      metadata: {},
    };
    
    let received = false;
    bus.on('packet:outward', (p) => {
      expect(p.id).toBe(packet.id);
      received = true;
    });
    
    await bus.sendOutward(packet);
    expect(received).toBe(true);
    
    const stats = bus.getStatistics();
    expect(stats.outwardPackets).toBe(1);
  });
  
  it('should reject invalid packets', async () => {
    const invalidPacket: any = {
      id: 'invalid',
      type: 'evidence',
      // Missing required fields
    };
    
    let rejected = false;
    bus.on('packet:rejected', (p, reason) => {
      expect(p.id).toBe(invalidPacket.id);
      expect(reason).toBeDefined();
      rejected = true;
    });
    
    await bus.sendInward(invalidPacket);
    expect(rejected).toBe(true);
  });
  
  it('should query packets by criteria', async () => {
    const packet: EvidencePacket = {
      id: 'test-query-1',
      type: 'evidence',
      facts: [{ claim: 'test', confidence: 1, evidence: {} }],
      provenance: {
        source: 'test',
        timestamp: Date.now(),
        confidence: 1,
        transformations: [],
      },
      cost: { compute: 0, time: 0, energy: 0, memory: 0 },
      risk: {
        privacy: 0,
        injection: 0,
        exfiltration: 0,
        level: 'low',
        mitigations: [],
      },
      metadata: {},
    };
    
    await bus.sendInward(packet);
    
    const results = bus.queryPackets({
      direction: MembraneDirection.INWARD,
      type: 'evidence',
    });
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].packet.id).toBe(packet.id);
  });
});

describe('CrossingPolicy', () => {
  let policy: CrossingPolicy;
  
  beforeEach(() => {
    policy = new CrossingPolicy({
      budgetLimits: {
        maxCompute: 1000,
        maxTime: 1000,
        maxEnergy: 100,
        maxMoney: 1.0,
        maxMemory: 1024 * 1024,
      },
      riskThresholds: {
        maxPrivacy: 0.5,
        maxInjection: 0.5,
        maxExfiltration: 0.5,
        allowedLevels: ['low', 'medium'],
      },
    });
  });
  
  it('should allow valid evidence packet', () => {
    const packet: EvidencePacket = {
      id: 'test-1',
      type: 'evidence',
      facts: [{ claim: 'test', confidence: 1, evidence: {} }],
      provenance: {
        source: 'test',
        timestamp: Date.now(),
        confidence: 1,
        transformations: [],
      },
      cost: { compute: 100, time: 100, energy: 10, memory: 1024 },
      risk: {
        privacy: 0.1,
        injection: 0.1,
        exfiltration: 0.1,
        level: 'low',
        mitigations: [],
      },
      metadata: {},
    };
    
    const decision = policy.evaluateInward(packet);
    expect(decision.allowed).toBe(true);
  });
  
  it('should reject evidence packet with high risk', () => {
    const packet: EvidencePacket = {
      id: 'test-2',
      type: 'evidence',
      facts: [{ claim: 'test', confidence: 1, evidence: {} }],
      provenance: {
        source: 'test',
        timestamp: Date.now(),
        confidence: 1,
        transformations: [],
      },
      cost: { compute: 100, time: 100, energy: 10, memory: 1024 },
      risk: {
        privacy: 0.9, // Too high
        injection: 0.1,
        exfiltration: 0.1,
        level: 'critical',
        mitigations: [],
      },
      metadata: {},
    };
    
    const decision = policy.evaluateInward(packet);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('risk');
  });
  
  it('should reject evidence packet exceeding budget', () => {
    const packet: EvidencePacket = {
      id: 'test-3',
      type: 'evidence',
      facts: [{ claim: 'test', confidence: 1, evidence: {} }],
      provenance: {
        source: 'test',
        timestamp: Date.now(),
        confidence: 1,
        transformations: [],
      },
      cost: { compute: 10000, time: 100, energy: 10, memory: 1024 }, // Too high
      risk: {
        privacy: 0.1,
        injection: 0.1,
        exfiltration: 0.1,
        level: 'low',
        mitigations: [],
      },
      metadata: {},
    };
    
    const decision = policy.evaluateInward(packet);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('cost');
  });
  
  it('should allow valid intent packet', () => {
    const packet: IntentPacket = {
      id: 'test-4',
      type: 'intent',
      goal: {
        description: 'Test',
        success_criteria: [],
        priority: 1,
      },
      constraints: {
        safety_requirements: [],
      },
      allowedTools: ['tool1'],
      redactionPolicy: {
        redact_embeddings: true,
        redact_private_memory: true,
        allowed_data_types: ['text'],
      },
      budget: { compute: 100, time: 100, energy: 10, memory: 1024 },
      expectedReturnType: 'result',
      metadata: {},
    };
    
    const decision = policy.evaluateOutward(packet);
    expect(decision.allowed).toBe(true);
  });
});

describe('Sys6MembraneTransport', () => {
  let bus: MembraneBus;
  let policy: CrossingPolicy;
  let transport: Sys6MembraneTransport;
  
  beforeEach(() => {
    bus = new MembraneBus();
    policy = new CrossingPolicy();
    transport = new Sys6MembraneTransport(bus, policy);
  });
  
  afterEach(() => {
    transport.stop();
  });
  
  it('should create Sys6 transport', () => {
    expect(transport).toBeDefined();
  });
  
  it('should start and stop transport cycle', () => {
    let started = false;
    let stopped = false;
    
    transport.on('transport:started', () => {
      started = true;
    });
    
    transport.on('transport:stopped', () => {
      stopped = true;
    });
    
    transport.start(10);
    expect(started).toBe(true);
    
    transport.stop();
    expect(stopped).toBe(true);
  });
  
  it('should advance through Sys6 stages', (done) => {
    let tickCount = 0;
    const stages = new Set<Sys6Stage>();
    
    transport.on('transport:tick', (data) => {
      tickCount++;
      stages.add(data.stage);
      
      if (tickCount >= 30) {
        // Should have seen all stages in 30 steps
        expect(stages.size).toBeGreaterThan(1);
        transport.stop();
        done();
      }
    });
    
    transport.start(10);
  }, 10000);
  
  it('should queue and process packets', async () => {
    const evidencePacket: EvidencePacket = {
      id: 'test-evidence',
      type: 'evidence',
      facts: [{ claim: 'test', confidence: 1, evidence: {} }],
      provenance: {
        source: 'test',
        timestamp: Date.now(),
        confidence: 1,
        transformations: [],
      },
      cost: { compute: 100, time: 100, energy: 10, memory: 1024 },
      risk: {
        privacy: 0.1,
        injection: 0.1,
        exfiltration: 0.1,
        level: 'low',
        mitigations: [],
      },
      metadata: {},
    };
    
    transport.queueInward(evidencePacket);
    
    const state = transport.getCycleState();
    expect(state.pendingInward.length).toBe(1);
  });
  
  it('should emit synchronization events', (done) => {
    transport.on('transport:sync', (data) => {
      expect(data.step).toBeDefined();
      expect(data.stats).toBeDefined();
      transport.stop();
      done();
    });
    
    transport.start(10);
  }, 10000);
});
