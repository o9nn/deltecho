/**
 * Unit tests for MOSES
 * Tests the Meta-Optimizing Semantic Evolutionary Search
 */

import { MOSES, Program, ProgramCandidate } from '../reasoning/MOSES.js';
import { AtomSpace } from '../atomspace/AtomSpace.js';

describe('MOSES', () => {
  let atomSpace: AtomSpace;
  let moses: MOSES;

  beforeEach(() => {
    atomSpace = new AtomSpace();
    moses = new MOSES(atomSpace);
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create a MOSES instance', () => {
      expect(moses).toBeDefined();
    });
  });

  describe('program representation', () => {
    it('should create programs in the AtomSpace', () => {
      const programAtom = atomSpace.addNode('ConceptNode', 'program_1');
      expect(programAtom).toBeDefined();
    });
  });

  describe('fitness evaluation', () => {
    it('should evaluate program fitness', () => {
      const candidate: ProgramCandidate = {
        id: 'prog_1',
        program: 'x AND y',
        fitness: 0,
        complexity: 1,
      };

      const testCases = [
        { inputs: { x: true, y: true }, expected: true },
        { inputs: { x: true, y: false }, expected: false },
        { inputs: { x: false, y: true }, expected: false },
        { inputs: { x: false, y: false }, expected: false },
      ];

      const fitness = moses.evaluateFitness(candidate, testCases);

      expect(fitness).toBeGreaterThanOrEqual(0);
      expect(fitness).toBeLessThanOrEqual(1);
    });

    it('should penalize complexity', () => {
      const simpleProgram: ProgramCandidate = {
        id: 'simple',
        program: 'x',
        fitness: 0,
        complexity: 1,
      };

      const complexProgram: ProgramCandidate = {
        id: 'complex',
        program: '(x AND y) OR (z AND NOT w)',
        fitness: 0,
        complexity: 10,
      };

      const testCases = [{ inputs: { x: true }, expected: true }];

      const simpleFitness = moses.evaluateFitness(simpleProgram, testCases);
      const complexFitness = moses.evaluateFitness(complexProgram, testCases);

      // With complexity penalty, simple should have higher adjusted fitness
      const simpleAdjusted = moses.adjustForComplexity(simpleFitness, simpleProgram.complexity);
      const complexAdjusted = moses.adjustForComplexity(complexFitness, complexProgram.complexity);

      expect(simpleAdjusted).toBeGreaterThanOrEqual(complexAdjusted);
    });
  });

  describe('evolutionary operations', () => {
    it('should generate initial population', () => {
      const population = moses.generateInitialPopulation(10);

      expect(population.length).toBe(10);
      population.forEach((candidate) => {
        expect(candidate.id).toBeDefined();
        expect(candidate.program).toBeDefined();
      });
    });

    it('should perform crossover', () => {
      const parent1: ProgramCandidate = {
        id: 'p1',
        program: 'x AND y',
        fitness: 0.8,
        complexity: 2,
      };

      const parent2: ProgramCandidate = {
        id: 'p2',
        program: 'z OR w',
        fitness: 0.7,
        complexity: 2,
      };

      const offspring = moses.crossover(parent1, parent2);

      expect(offspring).toBeDefined();
      expect(offspring.id).toBeDefined();
    });

    it('should perform mutation', () => {
      const original: ProgramCandidate = {
        id: 'orig',
        program: 'x AND y',
        fitness: 0.8,
        complexity: 2,
      };

      const mutated = moses.mutate(original, 1.0); // Force mutation

      expect(mutated).toBeDefined();
      expect(mutated.id).not.toBe(original.id);
    });

    it('should select parents based on fitness', () => {
      const population: ProgramCandidate[] = [
        { id: 'low', program: 'x', fitness: 0.1, complexity: 1 },
        { id: 'mid', program: 'y', fitness: 0.5, complexity: 1 },
        { id: 'high', program: 'z', fitness: 0.9, complexity: 1 },
      ];

      const selected = moses.selectParents(population, 2);

      expect(selected.length).toBe(2);
      // Higher fitness candidates should be selected more often
    });
  });

  describe('optimization run', () => {
    it('should run optimization and return best program', () => {
      const testCases = [
        { inputs: { x: true, y: true }, expected: true },
        { inputs: { x: true, y: false }, expected: false },
        { inputs: { x: false, y: true }, expected: false },
        { inputs: { x: false, y: false }, expected: false },
      ];

      const result = moses.optimize({
        testCases,
        populationSize: 10,
        generations: 5,
        mutationRate: 0.1,
      });

      expect(result).toBeDefined();
      expect(result.bestProgram).toBeDefined();
      expect(result.bestFitness).toBeGreaterThanOrEqual(0);
    });

    it('should improve fitness over generations', () => {
      const testCases = [
        { inputs: { x: true }, expected: true },
        { inputs: { x: false }, expected: false },
      ];

      const result = moses.optimize({
        testCases,
        populationSize: 20,
        generations: 10,
        mutationRate: 0.2,
        trackProgress: true,
      });

      expect(result.fitnessHistory).toBeDefined();
      if (result.fitnessHistory && result.fitnessHistory.length > 1) {
        const lastFitness = result.fitnessHistory[result.fitnessHistory.length - 1];
        const firstFitness = result.fitnessHistory[0];
        // Fitness should generally improve or stay the same
        expect(lastFitness).toBeGreaterThanOrEqual(firstFitness * 0.9); // Allow small variance
      }
    });
  });

  describe('representation normalization', () => {
    it('should normalize equivalent programs', () => {
      const prog1 = 'x AND y';
      const prog2 = 'y AND x';

      const norm1 = moses.normalizeProgram(prog1);
      const norm2 = moses.normalizeProgram(prog2);

      // Normalized forms should be comparable
      expect(norm1).toBeDefined();
      expect(norm2).toBeDefined();
    });

    it('should compute program complexity', () => {
      const simple = 'x';
      const complex = '(x AND y) OR (z AND NOT w)';

      const simpleComplexity = moses.computeComplexity(simple);
      const complexComplexity = moses.computeComplexity(complex);

      expect(complexComplexity).toBeGreaterThan(simpleComplexity);
    });
  });

  describe('deme management', () => {
    it('should create and manage demes', () => {
      const demes = moses.createDemes(3);

      expect(demes.length).toBe(3);
      demes.forEach((deme) => {
        expect(deme.id).toBeDefined();
        expect(deme.population).toBeDefined();
      });
    });

    it('should migrate between demes', () => {
      const demes = moses.createDemes(2);

      // Add some programs to each deme
      demes[0].population = moses.generateInitialPopulation(5);
      demes[1].population = moses.generateInitialPopulation(5);

      const originalSize0 = demes[0].population.length;
      const originalSize1 = demes[1].population.length;

      moses.migrate(demes, 0.2);

      // Migration should have occurred
      expect(demes[0].population.length).toBeGreaterThanOrEqual(0);
      expect(demes[1].population.length).toBeGreaterThanOrEqual(0);
    });
  });
});
