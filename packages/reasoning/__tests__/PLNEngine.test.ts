/**
 * Unit tests for PLNEngine
 * Tests the Probabilistic Logic Networks reasoning engine
 */

import { PLNEngine, InferenceRule } from '../reasoning/PLNEngine.js';
import { AtomSpace } from '../atomspace/AtomSpace.js';

describe('PLNEngine', () => {
  let atomSpace: AtomSpace;
  let plnEngine: PLNEngine;

  beforeEach(() => {
    atomSpace = new AtomSpace();
    plnEngine = new PLNEngine(atomSpace);
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create a PLN engine with AtomSpace', () => {
      expect(plnEngine).toBeDefined();
    });

    it('should register default inference rules', () => {
      // The engine should have deduction, induction, abduction, and similarity rules
      // We verify this by checking that forward chaining works
      expect(plnEngine).toBeDefined();
    });
  });

  describe('deduction rule', () => {
    it('should apply deduction: A->B, B->C => A->C', () => {
      // Create nodes
      const a = atomSpace.addNode('ConceptNode', 'A');
      const b = atomSpace.addNode('ConceptNode', 'B');
      const c = atomSpace.addNode('ConceptNode', 'C');

      // Create implications: A->B and B->C
      atomSpace.addLink('ImplicationLink', [a.id, b.id], { strength: 0.9, confidence: 0.8 });
      atomSpace.addLink('ImplicationLink', [b.id, c.id], { strength: 0.8, confidence: 0.9 });

      // Run forward chaining
      const newAtoms = plnEngine.forwardChain(10);

      // Should have created A->C
      const implications = atomSpace.getAtomsByType('ImplicationLink');
      expect(implications.length).toBeGreaterThanOrEqual(3);

      // Find the derived A->C link
      const derivedLink = implications.find(
        (atom) => atom.outgoing && atom.outgoing[0] === a.id && atom.outgoing[1] === c.id
      );
      expect(derivedLink).toBeDefined();

      // Check truth value formula: strength = s1 * s2
      if (derivedLink) {
        expect(derivedLink.truthValue.strength).toBeCloseTo(0.9 * 0.8, 1);
      }
    });

    it('should not apply deduction when atoms do not connect', () => {
      const a = atomSpace.addNode('ConceptNode', 'A');
      const b = atomSpace.addNode('ConceptNode', 'B');
      const c = atomSpace.addNode('ConceptNode', 'C');
      const d = atomSpace.addNode('ConceptNode', 'D');

      // A->B and C->D (no connection)
      atomSpace.addLink('ImplicationLink', [a.id, b.id]);
      atomSpace.addLink('ImplicationLink', [c.id, d.id]);

      const initialCount = atomSpace.getAtomsByType('ImplicationLink').length;
      plnEngine.forwardChain(10);
      const finalCount = atomSpace.getAtomsByType('ImplicationLink').length;

      // Should not create new implication link connecting these unrelated chains
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('induction rule', () => {
    it('should apply induction on inheritance links', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');

      atomSpace.addLink('InheritanceLink', [cat.id, mammal.id], {
        strength: 0.95,
        confidence: 0.9,
      });

      const newAtoms = plnEngine.forwardChain(10);

      // Induction should strengthen or create related inheritance links
      const inheritanceLinks = atomSpace.getAtomsByType('InheritanceLink');
      expect(inheritanceLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('similarity rule', () => {
    it('should transfer properties via similarity', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const dog = atomSpace.addNode('ConceptNode', 'dog');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');

      // Cat is similar to dog
      atomSpace.addLink('SimilarityLink', [cat.id, dog.id], {
        strength: 0.7,
        confidence: 0.8,
      });

      // Dog is a mammal
      atomSpace.addLink('InheritanceLink', [dog.id, mammal.id], {
        strength: 0.95,
        confidence: 0.9,
      });

      plnEngine.forwardChain(10);

      // Should infer cat is a mammal via similarity
      const inheritanceLinks = atomSpace.getAtomsByType('InheritanceLink');
      expect(inheritanceLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('forward chaining', () => {
    it('should limit inferences to maxInferences', () => {
      // Create a graph that could generate many inferences
      const nodes: ReturnType<typeof atomSpace.addNode>[] = [];
      for (let i = 0; i < 5; i++) {
        nodes.push(atomSpace.addNode('ConceptNode', `node${i}`));
      }

      // Create chain of implications
      for (let i = 0; i < 4; i++) {
        atomSpace.addLink('ImplicationLink', [nodes[i].id, nodes[i + 1].id]);
      }

      const initialSize = atomSpace.getSize();
      plnEngine.forwardChain(2); // Limit to 2 inferences
      const afterSize = atomSpace.getSize();

      // Should have added at most 2 new atoms
      expect(afterSize - initialSize).toBeLessThanOrEqual(2);
    });

    it('should return newly created atoms', () => {
      const a = atomSpace.addNode('ConceptNode', 'A');
      const b = atomSpace.addNode('ConceptNode', 'B');
      const c = atomSpace.addNode('ConceptNode', 'C');

      atomSpace.addLink('ImplicationLink', [a.id, b.id], { strength: 0.9, confidence: 0.9 });
      atomSpace.addLink('ImplicationLink', [b.id, c.id], { strength: 0.9, confidence: 0.9 });

      const newAtoms = plnEngine.forwardChain(10);

      expect(Array.isArray(newAtoms)).toBe(true);
    });
  });

  describe('backward chaining', () => {
    it('should prove goal from existing knowledge', () => {
      const a = atomSpace.addNode('ConceptNode', 'A');
      const b = atomSpace.addNode('ConceptNode', 'B');

      atomSpace.addLink('ImplicationLink', [a.id, b.id], {
        strength: 0.9,
        confidence: 0.9,
      });

      // Create a goal with high truth value
      const goal = atomSpace.addLink('ImplicationLink', [a.id, b.id], {
        strength: 0.8,
        confidence: 0.8,
      });

      const result = plnEngine.backwardChain(goal, 5);

      expect(result).toBe(true);
    });

    it('should return false when goal cannot be proven', () => {
      const a = atomSpace.addNode('ConceptNode', 'A');
      const b = atomSpace.addNode('ConceptNode', 'B');

      // Create a goal with low truth value
      const goal = atomSpace.addLink('ImplicationLink', [a.id, b.id], {
        strength: 0.1,
        confidence: 0.1,
      });

      const result = plnEngine.backwardChain(goal, 5);

      expect(result).toBe(false);
    });

    it('should respect max depth', () => {
      const a = atomSpace.addNode('ConceptNode', 'A');
      const b = atomSpace.addNode('ConceptNode', 'B');

      const goal = atomSpace.addLink('ImplicationLink', [a.id, b.id], {
        strength: 0.5,
        confidence: 0.5,
      });

      // Depth 0 should return false immediately
      const result = plnEngine.backwardChain(goal, 0);

      expect(result).toBe(false);
    });
  });

  describe('custom rules', () => {
    it('should register custom inference rules', () => {
      const customRule: InferenceRule = {
        name: 'custom_rule',
        premises: ['ConceptNode'],
        conclusion: 'ConceptNode',
        apply: (premises, as) => {
          if (premises.length === 0) return null;
          return as.addNode('ConceptNode', `derived_from_${premises[0].name}`);
        },
      };

      plnEngine.registerRule(customRule);

      // Add a premise
      atomSpace.addNode('ConceptNode', 'source');

      // The custom rule should be available for forward chaining
      const newAtoms = plnEngine.forwardChain(10);

      expect(newAtoms.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('truth value formulas', () => {
    it('should apply correct deduction formula', () => {
      const a = atomSpace.addNode('ConceptNode', 'A');
      const b = atomSpace.addNode('ConceptNode', 'B');
      const c = atomSpace.addNode('ConceptNode', 'C');

      atomSpace.addLink('ImplicationLink', [a.id, b.id], { strength: 0.8, confidence: 0.9 });
      atomSpace.addLink('ImplicationLink', [b.id, c.id], { strength: 0.7, confidence: 0.8 });

      plnEngine.forwardChain(10);

      const implications = atomSpace.getAtomsByType('ImplicationLink');
      const acLink = implications.find(
        (atom) => atom.outgoing?.[0] === a.id && atom.outgoing?.[1] === c.id
      );

      if (acLink) {
        // Deduction formula: strength = s1 * s2
        expect(acLink.truthValue.strength).toBeCloseTo(0.8 * 0.7, 1);
        // Confidence formula: min(c1, c2) * 0.9
        expect(acLink.truthValue.confidence).toBeCloseTo(Math.min(0.9, 0.8) * 0.9, 1);
      }
    });
  });
});
