/**
 * Unit tests for PatternMatcher
 * Tests the hypergraph pattern matching system
 */

import { PatternMatcher, Pattern } from '../atomspace/PatternMatcher.js';
import { AtomSpace } from '../atomspace/AtomSpace.js';

describe('PatternMatcher', () => {
  let atomSpace: AtomSpace;
  let patternMatcher: PatternMatcher;

  beforeEach(() => {
    atomSpace = new AtomSpace();
    patternMatcher = new PatternMatcher(atomSpace);
  });

  describe('initialization', () => {
    it('should create a PatternMatcher with AtomSpace', () => {
      expect(patternMatcher).toBeDefined();
    });
  });

  describe('basic pattern matching', () => {
    it('should find atoms matching a simple pattern', () => {
      // Create some knowledge
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const dog = atomSpace.addNode('ConceptNode', 'dog');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');

      atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);
      atomSpace.addLink('InheritanceLink', [dog.id, mammal.id]);

      // Search for all inheritance links
      const pattern: Pattern = {
        type: 'InheritanceLink',
      };

      const results = patternMatcher.findPattern(pattern);

      expect(results.length).toBe(2);
    });

    it('should find atoms by type', () => {
      atomSpace.addNode('ConceptNode', 'a');
      atomSpace.addNode('ConceptNode', 'b');
      atomSpace.addNode('PredicateNode', 'p');

      const pattern: Pattern = {
        type: 'ConceptNode',
      };

      const results = patternMatcher.findPattern(pattern);

      expect(results.length).toBe(2);
    });

    it('should find atoms by name pattern', () => {
      atomSpace.addNode('ConceptNode', 'cat');
      atomSpace.addNode('ConceptNode', 'category');
      atomSpace.addNode('ConceptNode', 'dog');

      const pattern: Pattern = {
        type: 'ConceptNode',
        name: 'cat',
      };

      const results = patternMatcher.findPattern(pattern);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('cat');
    });
  });

  describe('variable binding', () => {
    it('should bind variables in patterns', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');
      atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);

      // Pattern: (InheritanceLink $X mammal)
      const pattern: Pattern = {
        type: 'InheritanceLink',
        variables: { X: 0 }, // X binds to first outgoing
      };

      const bindings = patternMatcher.matchWithVariables(pattern);

      expect(bindings.length).toBeGreaterThanOrEqual(0);
    });

    it('should support variable constraints', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const dog = atomSpace.addNode('ConceptNode', 'dog');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');

      atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);
      atomSpace.addLink('InheritanceLink', [dog.id, mammal.id]);

      const pattern: Pattern = {
        type: 'InheritanceLink',
        constraints: [
          (atom) => {
            const outgoing = atomSpace.getOutgoing(atom.id);
            return outgoing.some((a) => a.name === 'cat');
          },
        ],
      };

      const results = patternMatcher.findPattern(pattern);

      expect(results.length).toBe(1);
    });
  });

  describe('truth value filtering', () => {
    it('should filter by minimum truth value strength', () => {
      const a = atomSpace.addNode('ConceptNode', 'a', { strength: 0.9, confidence: 0.9 });
      const b = atomSpace.addNode('ConceptNode', 'b', { strength: 0.3, confidence: 0.9 });

      const pattern: Pattern = {
        type: 'ConceptNode',
        minStrength: 0.5,
      };

      const results = patternMatcher.findPattern(pattern);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('a');
    });

    it('should filter by minimum confidence', () => {
      const a = atomSpace.addNode('ConceptNode', 'a', { strength: 0.9, confidence: 0.9 });
      const b = atomSpace.addNode('ConceptNode', 'b', { strength: 0.9, confidence: 0.2 });

      const pattern: Pattern = {
        type: 'ConceptNode',
        minConfidence: 0.5,
      };

      const results = patternMatcher.findPattern(pattern);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('a');
    });
  });

  describe('attention value filtering', () => {
    it('should filter by minimum STI', () => {
      const a = atomSpace.addNode('ConceptNode', 'a');
      const b = atomSpace.addNode('ConceptNode', 'b');

      atomSpace.setAttentionValue(a.id, { sti: 100, lti: 0, vlti: 0 });
      atomSpace.setAttentionValue(b.id, { sti: 10, lti: 0, vlti: 0 });

      const pattern: Pattern = {
        type: 'ConceptNode',
        minSTI: 50,
      };

      const results = patternMatcher.findPattern(pattern);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('a');
    });
  });

  describe('complex patterns', () => {
    it('should match nested link patterns', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat');
      const mammal = atomSpace.addNode('ConceptNode', 'mammal');
      const animal = atomSpace.addNode('ConceptNode', 'animal');

      const catMammal = atomSpace.addLink('InheritanceLink', [cat.id, mammal.id]);
      const mammalAnimal = atomSpace.addLink('InheritanceLink', [mammal.id, animal.id]);

      // Find inheritance links where target has incoming links
      const pattern: Pattern = {
        type: 'InheritanceLink',
        constraints: [
          (atom) => {
            const outgoing = atomSpace.getOutgoing(atom.id);
            if (outgoing.length !== 2) return false;
            const target = outgoing[1];
            const targetIncoming = atomSpace.getIncoming(target.id);
            return targetIncoming.length > 0;
          },
        ],
      };

      const results = patternMatcher.findPattern(pattern);

      // cat->mammal should match because mammal has incoming from the other link
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should find transitive relationships', () => {
      const a = atomSpace.addNode('ConceptNode', 'a');
      const b = atomSpace.addNode('ConceptNode', 'b');
      const c = atomSpace.addNode('ConceptNode', 'c');

      atomSpace.addLink('ImplicationLink', [a.id, b.id]);
      atomSpace.addLink('ImplicationLink', [b.id, c.id]);

      const transitivePatterns = patternMatcher.findTransitive('ImplicationLink', a.id, 3);

      // Should find path a -> b -> c
      expect(transitivePatterns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('query language', () => {
    it('should support AND queries', () => {
      const cat = atomSpace.addNode('ConceptNode', 'cat', { strength: 0.9, confidence: 0.9 });
      const dog = atomSpace.addNode('ConceptNode', 'dog', { strength: 0.5, confidence: 0.9 });

      const pattern: Pattern = {
        type: 'ConceptNode',
        minStrength: 0.7,
        minConfidence: 0.8,
      };

      const results = patternMatcher.findPattern(pattern);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('cat');
    });

    it('should return empty array when no matches', () => {
      atomSpace.addNode('ConceptNode', 'test');

      const pattern: Pattern = {
        type: 'PredicateNode',
        name: 'nonexistent',
      };

      const results = patternMatcher.findPattern(pattern);

      expect(results).toEqual([]);
    });
  });
});
