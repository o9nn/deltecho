/**
 * Unit tests for AtomSpace
 * Tests the hypergraph knowledge representation system
 */

import { AtomSpace, Atom, AtomType, TruthValue, AttentionValue } from '../atomspace/AtomSpace.js';

describe('AtomSpace', () => {
  let atomSpace: AtomSpace;

  beforeEach(() => {
    atomSpace = new AtomSpace();
  });

  describe('node operations', () => {
    it('should create a concept node', () => {
      const node = atomSpace.addNode('ConceptNode', 'cat');

      expect(node).toBeDefined();
      expect(node.type).toBe('ConceptNode');
      expect(node.name).toBe('cat');
      expect(node.id).toMatch(/^atom_\d+$/);
    });

    it('should create a predicate node', () => {
      const node = atomSpace.addNode('PredicateNode', 'is_mammal');

      expect(node.type).toBe('PredicateNode');
      expect(node.name).toBe('is_mammal');
    });

    it('should set default truth values', () => {
      const node = atomSpace.addNode('ConceptNode', 'test');

      expect(node.truthValue.strength).toBe(1.0);
      expect(node.truthValue.confidence).toBe(1.0);
    });

    it('should accept custom truth values', () => {
      const node = atomSpace.addNode('ConceptNode', 'uncertain', {
        strength: 0.7,
        confidence: 0.5,
      });

      expect(node.truthValue.strength).toBe(0.7);
      expect(node.truthValue.confidence).toBe(0.5);
    });

    it('should set default attention values', () => {
      const node = atomSpace.addNode('ConceptNode', 'test');

      expect(node.attentionValue.sti).toBe(0);
      expect(node.attentionValue.lti).toBe(0);
      expect(node.attentionValue.vlti).toBe(0);
    });

    it('should generate unique IDs for each node', () => {
      const node1 = atomSpace.addNode('ConceptNode', 'cat');
      const node2 = atomSpace.addNode('ConceptNode', 'dog');
      const node3 = atomSpace.addNode('ConceptNode', 'bird');

      expect(node1.id).not.toBe(node2.id);
      expect(node2.id).not.toBe(node3.id);
      expect(node1.id).not.toBe(node3.id);
    });
  });

  describe('link operations', () => {
    it('should create an inheritance link', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');

      const link = atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);

      expect(link).toBeDefined();
      expect(link.type).toBe('InheritanceLink');
      expect(link.outgoing).toEqual([cat.id, mammal.id]);
    });

    it('should create a similarity link', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const dog = atomSpace.addNode('ConceptNode', 'dog');

      const link = atomSpace.addLink('SimilarityLink', [cat.id, dog.id], {
        strength: 0.6,
        confidence: 0.8,
      });

      expect(link.type).toBe('SimilarityLink');
      expect(link.truthValue.strength).toBe(0.6);
    });

    it('should update incoming index for linked atoms', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');

      atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);

      const incoming = atomSpace.getIncoming(cat.id);
      expect(incoming.length).toBe(1);
      expect(incoming[0].type).toBe('InheritanceLink');
    });
  });

  describe('retrieval operations', () => {
    it('should get atom by ID', () => {
      const node = atomSpace.addNode('ConceptNode', 'test');

      const retrieved = atomSpace.getAtom(node.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test');
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = atomSpace.getAtom('non_existent_id');
      expect(retrieved).toBeUndefined();
    });

    it('should get atoms by name', () => {
      atomSpace.addNode('ConceptNode', 'cat');
      atomSpace.addNode('PredicateNode', 'cat');

      const atoms = atomSpace.getAtomsByName('cat');

      expect(atoms.length).toBe(2);
    });

    it('should get atoms by type', () => {
      atomSpace.addNode('ConceptNode', 'cat');
      atomSpace.addNode('ConceptNode', 'dog');
      atomSpace.addNode('PredicateNode', 'is_mammal');

      const concepts = atomSpace.getAtomsByType('ConceptNode');

      expect(concepts.length).toBe(2);
    });

    it('should get outgoing atoms from a link', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');
      const link = atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);

      const outgoing = atomSpace.getOutgoing(link.id);

      expect(outgoing.length).toBe(2);
      expect(outgoing[0].name).toBe('cat');
      expect(outgoing[1].name).toBe('mammal');
    });
  });

  describe('modification operations', () => {
    it('should update truth value', () => {
      const node = atomSpace.addNode('ConceptNode', 'test');

      const result = atomSpace.setTruthValue(node.id, {
        strength: 0.9,
        confidence: 0.8,
      });

      expect(result).toBe(true);

      const updated = atomSpace.getAtom(node.id);
      expect(updated?.truthValue.strength).toBe(0.9);
    });

    it('should return false when updating non-existent atom', () => {
      const result = atomSpace.setTruthValue('fake_id', {
        strength: 0.5,
        confidence: 0.5,
      });

      expect(result).toBe(false);
    });

    it('should update attention value', () => {
      const node = atomSpace.addNode('ConceptNode', 'test');

      const result = atomSpace.setAttentionValue(node.id, {
        sti: 100,
        lti: 50,
        vlti: 10,
      });

      expect(result).toBe(true);

      const updated = atomSpace.getAtom(node.id);
      expect(updated?.attentionValue.sti).toBe(100);
    });
  });

  describe('deletion operations', () => {
    it('should remove an atom', () => {
      const node = atomSpace.addNode('ConceptNode', 'test');
      expect(atomSpace.getSize()).toBe(1);

      const result = atomSpace.removeAtom(node.id);

      expect(result).toBe(true);
      expect(atomSpace.getSize()).toBe(0);
      expect(atomSpace.getAtom(node.id)).toBeUndefined();
    });

    it('should return false when removing non-existent atom', () => {
      const result = atomSpace.removeAtom('fake_id');
      expect(result).toBe(false);
    });

    it('should clean up indices when removing', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');
      atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);

      atomSpace.removeAtom(cat.id);

      expect(atomSpace.getAtomsByName('cat').length).toBe(0);
    });

    it('should update incoming index when removing a link', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');
      const link = atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);

      atomSpace.removeAtom(link.id);

      expect(atomSpace.getIncoming(cat.id).length).toBe(0);
    });
  });

  describe('utility operations', () => {
    it('should return correct size', () => {
      expect(atomSpace.getSize()).toBe(0);

      atomSpace.addNode('ConceptNode', 'cat');
      expect(atomSpace.getSize()).toBe(1);

      atomSpace.addNode('ConceptNode', 'dog');
      expect(atomSpace.getSize()).toBe(2);
    });

    it('should clear all atoms', () => {
      atomSpace.addNode('ConceptNode', 'cat');
      atomSpace.addNode('ConceptNode', 'dog');

      atomSpace.clear();

      expect(atomSpace.getSize()).toBe(0);
      expect(atomSpace.getAllAtoms()).toEqual([]);
    });

    it('should get all atoms', () => {
      atomSpace.addNode('ConceptNode', 'cat');
      atomSpace.addNode('ConceptNode', 'dog');

      const allAtoms = atomSpace.getAllAtoms();

      expect(allAtoms.length).toBe(2);
    });
  });

  describe('complex scenarios', () => {
    it('should build a knowledge graph', () => {
      // Create a simple taxonomy
      const animal = atomSpace.addNode('ConceptNode', 'animal');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const dog = atomSpace.addNode('ConceptNode', 'dog');

      // Create inheritance hierarchy
      atomSpace.addLink('InheritanceLink', [mammal.id, animal.id]);
      atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);
      atomSpace.addLink('InheritanceLink', [dog.id, mammal.id]);

      // Create similarity between cat and dog
      atomSpace.addLink('SimilarityLink', [cat.id, dog.id], { strength: 0.7, confidence: 0.9 });

      expect(atomSpace.getSize()).toBe(7); // 4 nodes + 3 links

      // Verify graph structure
      const mammalIncoming = atomSpace.getIncoming(mammal.id);
      expect(mammalIncoming.length).toBe(2); // cat and dog inherit from mammal
    });

    it('should handle circular references', () => {
      const a = atomSpace.addNode('ConceptNode', 'A');
      const b = atomSpace.addNode('ConceptNode', 'B');

      atomSpace.addLink('SimilarityLink', [a.id, b.id]);
      atomSpace.addLink('SimilarityLink', [b.id, a.id]);

      const aIncoming = atomSpace.getIncoming(a.id);
      const bIncoming = atomSpace.getIncoming(b.id);

      expect(aIncoming.length).toBe(1);
      expect(bIncoming.length).toBe(1);
    });

    it('should handle multiple links between same nodes', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');

      atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);
      atomSpace.addLink('SimilarityLink', [cat.id, mammal.id]);

      const catIncoming = atomSpace.getIncoming(cat.id);
      expect(catIncoming.length).toBe(2);
    });
  });
});
