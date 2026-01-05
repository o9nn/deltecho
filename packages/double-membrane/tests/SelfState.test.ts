/**
 * Tests for SelfState - Sealed Identity Invariants
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SelfState } from '../src/inner-membrane/SelfState.js';
import {
  createProvenance,
  type MemoryWritePacket,
  type BeliefUpdatePacket,
} from '../src/transjective/packets.js';

describe('SelfState', () => {
  let state: SelfState;

  beforeEach(() => {
    state = new SelfState({
      name: 'TestEcho',
      invariants: [{ id: 'test-inv', name: 'Test Invariant', description: 'A test', value: 42 }],
      commitments: [
        {
          id: 'test-com',
          type: 'goal',
          description: 'Test goal',
          priority: 1,
          active: true,
        },
      ],
    });
  });

  describe('Identity Invariants', () => {
    it('should have immutable name', () => {
      expect(state.getName()).toBe('TestEcho');
    });

    it('should have creation timestamp', () => {
      const created = state.getCreatedAt();
      expect(created).toBeDefined();
      expect(new Date(created).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include default invariants', () => {
      const invariants = state.getInvariants();
      const names = invariants.map((i) => i.id);

      expect(names).toContain('name');
      expect(names).toContain('created');
      expect(names).toContain('core-values');
    });

    it('should include custom invariants', () => {
      const inv = state.getInvariant('test-inv');
      expect(inv).toBeDefined();
      expect(inv?.value).toBe(42);
    });

    it('should mark all invariants as immutable', () => {
      const invariants = state.getInvariants();
      for (const inv of invariants) {
        expect(inv.immutable).toBe(true);
      }
    });
  });

  describe('AAR Core', () => {
    it('should have initialized AAR core', () => {
      const aar = state.getAARCore();

      expect(aar.agent.capabilities).toContain('reason');
      expect(aar.arena.currentContext).toBe('initialization');
      expect(aar.relation.coherence).toBe(1.0);
    });

    it('should provide self-model summary', () => {
      const summary = state.getSelfModelSummary();
      expect(summary).toContain('TestEcho');
    });

    it('should update AAR core with write lock', () => {
      state.acquireWriteLock('test');

      const updated = state.updateAARCore({
        agent: { currentIntentions: ['test-intent'] },
        arena: { currentContext: 'testing' },
      });

      expect(updated).toBe(true);

      const aar = state.getAARCore();
      expect(aar.agent.currentIntentions).toContain('test-intent');
      expect(aar.arena.currentContext).toBe('testing');

      state.releaseWriteLock('test');
    });

    it('should reject AAR update without write lock', () => {
      const updated = state.updateAARCore({
        arena: { currentContext: 'should-fail' },
      });

      expect(updated).toBe(false);
      expect(state.getAARCore().arena.currentContext).toBe('initialization');
    });
  });

  describe('Write Lock', () => {
    it('should acquire and release write lock', () => {
      expect(state.isWriteLocked()).toBe(false);

      const acquired = state.acquireWriteLock('owner1');
      expect(acquired).toBe(true);
      expect(state.isWriteLocked()).toBe(true);

      const released = state.releaseWriteLock('owner1');
      expect(released).toBe(true);
      expect(state.isWriteLocked()).toBe(false);
    });

    it('should prevent double acquisition', () => {
      state.acquireWriteLock('owner1');
      const secondAcquire = state.acquireWriteLock('owner2');

      expect(secondAcquire).toBe(false);

      state.releaseWriteLock('owner1');
    });

    it('should prevent release by non-owner', () => {
      state.acquireWriteLock('owner1');
      const released = state.releaseWriteLock('owner2');

      expect(released).toBe(false);
      expect(state.isWriteLocked()).toBe(true);

      state.releaseWriteLock('owner1');
    });
  });

  describe('Commitments', () => {
    it('should have initial commitments', () => {
      const commitments = state.getCommitments();
      expect(commitments.length).toBe(1);
      expect(commitments[0].id).toBe('test-com');
    });

    it('should add commitments with write lock', () => {
      state.acquireWriteLock('test');

      const added = state.addCommitment({
        id: 'new-com',
        type: 'value',
        description: 'New value commitment',
        priority: 2,
        active: true,
      });

      expect(added).toBe(true);
      expect(state.getCommitments().length).toBe(2);

      state.releaseWriteLock('test');
    });

    it('should update commitments', () => {
      state.acquireWriteLock('test');

      const updated = state.updateCommitment('test-com', {
        priority: 10,
        active: false,
      });

      expect(updated).toBe(true);

      const commitment = state.getCommitments().find((c) => c.id === 'test-com');
      expect(commitment?.priority).toBe(10);
      expect(commitment?.active).toBe(false);

      state.releaseWriteLock('test');
    });

    it('should filter active commitments', () => {
      state.acquireWriteLock('test');

      state.addCommitment({
        id: 'inactive',
        type: 'goal',
        description: 'Inactive',
        priority: 1,
        active: false,
      });

      const active = state.getActiveCommitments();
      expect(active.length).toBe(1);
      expect(active[0].id).toBe('test-com');

      state.releaseWriteLock('test');
    });
  });

  describe('Beliefs', () => {
    it('should add beliefs with proper justification', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');
      const packet: BeliefUpdatePacket = {
        type: 'belief_update',
        id: 'bu-1',
        beliefId: 'belief-1',
        operation: 'add',
        newContent: 'The system is functioning correctly',
        newConfidence: 0.9,
        justification: {
          evidenceIds: ['e1', 'e2'],
          reasoning: 'Based on test results',
          consistencyCheck: true,
          goalAlignment: true,
        },
        provenance: prov,
        timestamp: new Date().toISOString(),
      };

      const added = state.updateBelief(packet);
      expect(added).toBe(true);

      const belief = state.getBelief('belief-1');
      expect(belief).toBeDefined();
      expect(belief?.confidence).toBe(0.9);

      state.releaseWriteLock('test');
    });

    it('should reject beliefs without consistency check', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');
      const packet: BeliefUpdatePacket = {
        type: 'belief_update',
        id: 'bu-1',
        beliefId: 'belief-bad',
        operation: 'add',
        newContent: 'Inconsistent belief',
        justification: {
          evidenceIds: [],
          reasoning: 'No reason',
          consistencyCheck: false, // Should fail
          goalAlignment: true,
        },
        provenance: prov,
        timestamp: new Date().toISOString(),
      };

      const added = state.updateBelief(packet);
      expect(added).toBe(false);
      expect(state.getBelief('belief-bad')).toBeUndefined();

      state.releaseWriteLock('test');
    });

    it('should strengthen beliefs', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

      // Add initial belief
      state.updateBelief({
        type: 'belief_update',
        id: 'bu-1',
        beliefId: 'belief-1',
        operation: 'add',
        newContent: 'Test belief',
        newConfidence: 0.5,
        justification: {
          evidenceIds: ['e1'],
          reasoning: 'Initial',
          consistencyCheck: true,
          goalAlignment: true,
        },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      // Strengthen
      state.updateBelief({
        type: 'belief_update',
        id: 'bu-2',
        beliefId: 'belief-1',
        operation: 'strengthen',
        justification: {
          evidenceIds: ['e2'],
          reasoning: 'More evidence',
          consistencyCheck: true,
          goalAlignment: true,
        },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      const belief = state.getBelief('belief-1');
      expect(belief?.confidence).toBe(0.6); // 0.5 + 0.1
      expect(belief?.version).toBe(2);

      state.releaseWriteLock('test');
    });

    it('should weaken beliefs', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

      // Add initial belief
      state.updateBelief({
        type: 'belief_update',
        id: 'bu-1',
        beliefId: 'belief-1',
        operation: 'add',
        newContent: 'Test belief',
        newConfidence: 0.8,
        justification: {
          evidenceIds: ['e1'],
          reasoning: 'Initial',
          consistencyCheck: true,
          goalAlignment: true,
        },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      // Weaken
      state.updateBelief({
        type: 'belief_update',
        id: 'bu-2',
        beliefId: 'belief-1',
        operation: 'weaken',
        justification: {
          evidenceIds: [],
          reasoning: 'Counter evidence',
          consistencyCheck: true,
          goalAlignment: true,
        },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      const belief = state.getBelief('belief-1');
      expect(belief?.confidence).toBeCloseTo(0.7, 5); // 0.8 - 0.1

      state.releaseWriteLock('test');
    });
  });

  describe('Memory (Append-Only)', () => {
    it('should write memory entries', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');
      const packet: MemoryWritePacket = {
        type: 'memory_write',
        id: 'mem-1',
        store: 'episodic',
        content: {
          key: 'event-1',
          value: { description: 'Something happened' },
          tags: ['test', 'event'],
        },
        provenance: prov,
        timestamp: new Date().toISOString(),
      };

      const written = state.writeMemory(packet);
      expect(written).toBe(true);

      const entry = state.getMemoryEntry('mem-1');
      expect(entry).toBeDefined();
      expect(entry?.store).toBe('episodic');
      expect(entry?.tags).toContain('test');

      state.releaseWriteLock('test');
    });

    it('should enforce append-only (no overwrites)', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

      // First write
      state.writeMemory({
        type: 'memory_write',
        id: 'mem-1',
        store: 'semantic',
        content: { key: 'fact-1', value: 'Original' },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      // Attempt overwrite
      const overwritten = state.writeMemory({
        type: 'memory_write',
        id: 'mem-1', // Same ID
        store: 'semantic',
        content: { key: 'fact-1', value: 'Modified' },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      expect(overwritten).toBe(false);

      const entry = state.getMemoryEntry('mem-1');
      expect(entry?.value).toBe('Original');

      state.releaseWriteLock('test');
    });

    it('should search memory by tags', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

      state.writeMemory({
        type: 'memory_write',
        id: 'mem-1',
        store: 'episodic',
        content: { key: 'e1', value: 'Event 1', tags: ['important', 'work'] },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      state.writeMemory({
        type: 'memory_write',
        id: 'mem-2',
        store: 'episodic',
        content: { key: 'e2', value: 'Event 2', tags: ['personal'] },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      const workMemories = state.searchMemoryByTags(['work']);
      expect(workMemories.length).toBe(1);
      expect(workMemories[0].id).toBe('mem-1');

      state.releaseWriteLock('test');
    });

    it('should search memory by store', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

      state.writeMemory({
        type: 'memory_write',
        id: 'mem-1',
        store: 'episodic',
        content: { key: 'e1', value: 'Event' },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      state.writeMemory({
        type: 'memory_write',
        id: 'mem-2',
        store: 'semantic',
        content: { key: 's1', value: 'Fact' },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      const semantic = state.searchMemoryByStore('semantic');
      expect(semantic.length).toBe(1);
      expect(semantic[0].store).toBe('semantic');

      state.releaseWriteLock('test');
    });

    it('should link memory entries', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

      state.writeMemory({
        type: 'memory_write',
        id: 'mem-1',
        store: 'episodic',
        content: { key: 'e1', value: 'Event 1' },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      state.writeMemory({
        type: 'memory_write',
        id: 'mem-2',
        store: 'episodic',
        content: { key: 'e2', value: 'Event 2' },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      const linked = state.linkMemory('mem-1', 'mem-2', prov);
      expect(linked).toBe(true);

      const entry1 = state.getMemoryEntry('mem-1');
      const entry2 = state.getMemoryEntry('mem-2');

      expect(entry1?.links).toContain('mem-2');
      expect(entry2?.links).toContain('mem-1');

      state.releaseWriteLock('test');
    });
  });

  describe('Audit Log', () => {
    it('should track all operations', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

      state.addCommitment({
        id: 'com-1',
        type: 'goal',
        description: 'Test',
        priority: 1,
        active: true,
      });

      state.writeMemory({
        type: 'memory_write',
        id: 'mem-1',
        store: 'episodic',
        content: { key: 'e1', value: 'Test' },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      const log = state.getAuditLog();
      expect(log.length).toBeGreaterThan(0);

      const operations = log.map((e) => e.operation);
      expect(operations).toContain('add_commitment');
      expect(operations).toContain('write_memory');

      state.releaseWriteLock('test');
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize state', () => {
      state.acquireWriteLock('test');

      const prov = createProvenance({ type: 'internal', name: 'test' }, 'verified');

      state.addCommitment({
        id: 'com-new',
        type: 'value',
        description: 'Serialization test',
        priority: 5,
        active: true,
      });

      state.writeMemory({
        type: 'memory_write',
        id: 'mem-ser',
        store: 'semantic',
        content: { key: 'fact', value: 'Serialized fact' },
        provenance: prov,
        timestamp: new Date().toISOString(),
      });

      state.releaseWriteLock('test');

      // Serialize
      const serialized = state.serialize();
      expect(typeof serialized).toBe('string');

      // Deserialize
      const restored = SelfState.deserialize(serialized);

      expect(restored.getName()).toBe('TestEcho');
      expect(restored.getCommitments().find((c) => c.id === 'com-new')).toBeDefined();
      expect(restored.getMemoryEntry('mem-ser')).toBeDefined();
    });
  });
});
