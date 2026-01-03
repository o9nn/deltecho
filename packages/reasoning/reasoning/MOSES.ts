/**
 * MOSES - Meta-Optimizing Semantic Evolutionary Search
 *
 * MOSES is an evolutionary algorithm for program learning. It evolves
 * programs represented as trees to solve problems by optimizing a fitness
 * function. This is implemented as a kernel service for AGI learning.
 */

import { Atom, AtomSpace, AtomType } from '../atomspace/AtomSpace.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('MOSES');

export interface Program {
  id: string;
  tree: Atom;
  fitness: number;
  generation: number;
}

export interface MOSESConfig {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
}

export type FitnessFunction = (program: Program) => number;

/**
 * MOSES - Evolutionary program learning at the kernel level
 */
export class MOSES {
  private atomSpace: AtomSpace;
  private config: MOSESConfig;
  private population: Program[];
  private generation: number;
  private nextProgramId: number;

  constructor(atomSpace: AtomSpace, config: Partial<MOSESConfig> = {}) {
    this.atomSpace = atomSpace;
    this.config = {
      populationSize: config.populationSize || 100,
      maxGenerations: config.maxGenerations || 50,
      mutationRate: config.mutationRate || 0.1,
      crossoverRate: config.crossoverRate || 0.7,
      elitismRate: config.elitismRate || 0.1,
    };
    this.population = [];
    this.generation = 0;
    this.nextProgramId = 1;
  }

  /**
   * Initialize population with random programs
   */
  initializePopulation(): void {
    this.population = [];

    for (let i = 0; i < this.config.populationSize; i++) {
      const program = this.createRandomProgram();
      this.population.push(program);
    }

    logger.info(`Initialized population: ${this.population.length} programs`);
  }

  /**
   * Create a random program
   */
  private createRandomProgram(): Program {
    // Create a simple random program tree
    const tree = this.atomSpace.addLink('ExecutionLink', [
      this.atomSpace.addNode('PredicateNode', `pred_${Math.random()}`).id,
      this.atomSpace.addLink('ListLink', [this.atomSpace.addNode('VariableNode', '$X').id]).id,
    ]);

    return {
      id: `prog_${this.nextProgramId++}`,
      tree,
      fitness: 0,
      generation: this.generation,
    };
  }

  /**
   * Evolve the population for one generation
   */
  evolve(fitnessFunc: FitnessFunction): Program[] {
    // Evaluate fitness
    for (const program of this.population) {
      program.fitness = fitnessFunc(program);
    }

    // Sort by fitness
    this.population.sort((a, b) => b.fitness - a.fitness);

    logger.debug(
      `Generation ${this.generation}: Best fitness = ${this.population[0].fitness}`
    );

    // Create next generation
    const nextGen: Program[] = [];

    // Elitism - keep best programs
    const eliteCount = Math.floor(this.config.populationSize * this.config.elitismRate);
    for (let i = 0; i < eliteCount; i++) {
      nextGen.push(this.population[i]);
    }

    // Generate rest of population
    while (nextGen.length < this.config.populationSize) {
      if (Math.random() < this.config.crossoverRate) {
        // Crossover
        const parent1 = this.tournamentSelect();
        const parent2 = this.tournamentSelect();
        const child = this.crossover(parent1, parent2);
        nextGen.push(child);
      } else {
        // Mutation
        const parent = this.tournamentSelect();
        const child = this.mutate(parent);
        nextGen.push(child);
      }
    }

    this.population = nextGen;
    this.generation++;

    return this.getBestPrograms(5);
  }

  /**
   * Tournament selection
   */
  private tournamentSelect(): Program {
    const tournamentSize = 3;
    const tournament: Program[] = [];

    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[idx]);
    }

    return tournament.reduce((best, curr) => (curr.fitness > best.fitness ? curr : best));
  }

  // Node types for type checking
  private readonly NODE_TYPES: AtomType[] = [
    'ConceptNode',
    'PredicateNode',
    'VariableNode',
    'NumberNode',
  ];
  private readonly LINK_TYPES: AtomType[] = [
    'ListLink',
    'InheritanceLink',
    'SimilarityLink',
    'ImplicationLink',
    'EvaluationLink',
    'ExecutionLink',
  ];

  /**
   * Check if an atom type is a node type
   */
  private isNodeType(type: AtomType): boolean {
    return this.NODE_TYPES.includes(type);
  }

  /**
   * Check if an atom type is a link type
   */
  private isLinkType(type: AtomType): boolean {
    return this.LINK_TYPES.includes(type);
  }

  /**
   * Crossover two programs using subtree exchange
   * Combines genetic material from both parents by swapping subtrees
   */
  private crossover(parent1: Program, parent2: Program): Program {
    // Get the tree structures from both parents
    const tree1 = parent1.tree;
    const tree2 = parent2.tree;

    // Create a new child program tree by combining parent structures
    const childTree = this.performSubtreeCrossover(tree1, tree2);

    return {
      id: `prog_${this.nextProgramId++}`,
      tree: childTree,
      fitness: 0, // Will be evaluated by fitness function
      generation: this.generation,
    };
  }

  /**
   * Perform subtree crossover between two atom trees
   */
  private performSubtreeCrossover(tree1: Atom, tree2: Atom): Atom {
    // If both are links, we can exchange subtrees
    if (this.isLinkType(tree1.type) && this.isLinkType(tree2.type)) {
      const outgoing1 = tree1.outgoing || [];
      const outgoing2 = tree2.outgoing || [];

      // Randomly select crossover point
      const crossoverPoint = Math.random();

      if (crossoverPoint < 0.5 && outgoing1.length > 0 && outgoing2.length > 0) {
        // Exchange a random subtree from parent2 into parent1's structure
        const idx1 = Math.floor(Math.random() * outgoing1.length);
        const idx2 = Math.floor(Math.random() * outgoing2.length);

        // Create new outgoing array with swapped subtree
        const newOutgoing = [...outgoing1];
        const subtree2 = this.atomSpace.getAtom(outgoing2[idx2]);

        if (subtree2) {
          // Clone the subtree from parent2 into the child
          const clonedSubtree = this.cloneSubtree(subtree2);
          newOutgoing[idx1] = clonedSubtree.id;
        }

        return this.atomSpace.addLink(tree1.type, newOutgoing);
      }
    }

    // Default: clone tree1 with slight variation
    return this.cloneSubtree(tree1);
  }

  /**
   * Clone a subtree into a new structure
   */
  private cloneSubtree(atom: Atom): Atom {
    if (this.isNodeType(atom.type)) {
      // For nodes, create a new node with same type but potentially modified name
      const baseName = atom.name || 'node';
      const variation = Math.random() < 0.1 ? `_v${Math.floor(Math.random() * 100)}` : '';
      return this.atomSpace.addNode(atom.type, baseName + variation);
    } else {
      // For links, recursively clone outgoing atoms
      const outgoing = atom.outgoing || [];
      const newOutgoing = outgoing.map((id) => {
        const child = this.atomSpace.getAtom(id);
        if (child) {
          return this.cloneSubtree(child).id;
        }
        return id;
      });
      return this.atomSpace.addLink(atom.type, newOutgoing);
    }
  }

  /**
   * Mutate a program using various mutation operators
   */
  private mutate(program: Program): Program {
    const tree = program.tree;
    const mutatedTree = this.performMutation(tree);

    return {
      id: `prog_${this.nextProgramId++}`,
      tree: mutatedTree,
      fitness: 0, // Will be evaluated by fitness function
      generation: this.generation,
    };
  }

  /**
   * Perform mutation on an atom tree
   */
  private performMutation(atom: Atom): Atom {
    const mutationType = Math.random();

    if (mutationType < 0.3) {
      // Point mutation: modify a node value
      return this.pointMutation(atom);
    } else if (mutationType < 0.6) {
      // Subtree mutation: replace a subtree with a new random one
      return this.subtreeMutation(atom);
    } else if (mutationType < 0.8) {
      // Insertion mutation: add a new node
      return this.insertionMutation(atom);
    } else {
      // Deletion mutation: remove a subtree (with protection)
      return this.deletionMutation(atom);
    }
  }

  /**
   * Point mutation: modify node values slightly
   */
  private pointMutation(atom: Atom): Atom {
    if (this.isNodeType(atom.type)) {
      // Mutate the node name
      const baseName = atom.name || 'node';
      const mutationSuffix = `_m${Math.floor(Math.random() * 1000)}`;
      return this.atomSpace.addNode(atom.type, baseName + mutationSuffix);
    } else {
      // For links, mutate a random child
      const outgoing = atom.outgoing || [];
      if (outgoing.length > 0) {
        const idx = Math.floor(Math.random() * outgoing.length);
        const child = this.atomSpace.getAtom(outgoing[idx]);
        if (child) {
          const newOutgoing = [...outgoing];
          newOutgoing[idx] = this.pointMutation(child).id;
          return this.atomSpace.addLink(atom.type, newOutgoing);
        }
      }
      return atom;
    }
  }

  /**
   * Subtree mutation: replace a subtree with a new random one
   */
  private subtreeMutation(atom: Atom): Atom {
    if (this.isLinkType(atom.type)) {
      const outgoing = atom.outgoing || [];
      if (outgoing.length > 0 && Math.random() < 0.5) {
        // Replace a random subtree
        const idx = Math.floor(Math.random() * outgoing.length);
        const newSubtree = this.createRandomSubtree(2);
        const newOutgoing = [...outgoing];
        newOutgoing[idx] = newSubtree.id;
        return this.atomSpace.addLink(atom.type, newOutgoing);
      }
    }
    // Create entirely new structure
    return this.createRandomSubtree(3);
  }

  /**
   * Insertion mutation: add a new node to the tree
   */
  private insertionMutation(atom: Atom): Atom {
    if (this.isLinkType(atom.type)) {
      const outgoing = atom.outgoing || [];
      const newNode = this.atomSpace.addNode(
        'VariableNode',
        `$V${Math.floor(Math.random() * 100)}`
      );
      const newOutgoing = [...outgoing, newNode.id];
      return this.atomSpace.addLink(atom.type, newOutgoing);
    }
    // Wrap node in a link
    return this.atomSpace.addLink('ListLink', [atom.id]);
  }

  /**
   * Deletion mutation: remove a subtree (with minimum structure protection)
   */
  private deletionMutation(atom: Atom): Atom {
    if (this.isLinkType(atom.type)) {
      const outgoing = atom.outgoing || [];
      if (outgoing.length > 1) {
        // Remove a random child (keep at least one)
        const idx = Math.floor(Math.random() * outgoing.length);
        const newOutgoing = outgoing.filter((_, i) => i !== idx);
        return this.atomSpace.addLink(atom.type, newOutgoing);
      }
    }
    // Cannot delete from node or single-child link, return as-is
    return atom;
  }

  /**
   * Create a random subtree of specified depth
   */
  private createRandomSubtree(maxDepth: number): Atom {
    if (maxDepth <= 0 || Math.random() < 0.3) {
      // Create a leaf node
      const nodeTypes: AtomType[] = ['VariableNode', 'ConceptNode', 'NumberNode'];
      const nodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
      const value =
        nodeType === 'NumberNode'
          ? String(Math.floor(Math.random() * 100))
          : `$X${Math.floor(Math.random() * 50)}`;
      return this.atomSpace.addNode(nodeType, value);
    } else {
      // Create a link with children
      const linkTypes: AtomType[] = ['ListLink', 'EvaluationLink', 'ExecutionLink'];
      const linkType = linkTypes[Math.floor(Math.random() * linkTypes.length)];
      const numChildren = 1 + Math.floor(Math.random() * 3);
      const children: string[] = [];

      for (let i = 0; i < numChildren; i++) {
        const child = this.createRandomSubtree(maxDepth - 1);
        children.push(child.id);
      }

      return this.atomSpace.addLink(linkType, children);
    }
  }

  /**
   * Get best programs
   */
  getBestPrograms(count: number): Program[] {
    return this.population.sort((a, b) => b.fitness - a.fitness).slice(0, count);
  }

  /**
   * Run complete evolution
   */
  run(fitnessFunc: FitnessFunction): Program {
    this.initializePopulation();

    for (let i = 0; i < this.config.maxGenerations; i++) {
      this.evolve(fitnessFunc);

      const best = this.population[0];

      // Early stopping if fitness threshold reached
      if (best.fitness > 0.99) {
        logger.info(`Converged at generation ${i}`);
        break;
      }
    }

    const best = this.population[0];
    logger.info(`Evolution complete. Best fitness: ${best.fitness}`);
    return best;
  }

  /**
   * Get evolution statistics
   */
  getStats(): {
    generation: number;
    populationSize: number;
    avgFitness: number;
    bestFitness: number;
  } {
    const sum = this.population.reduce((s, p) => s + p.fitness, 0);

    return {
      generation: this.generation,
      populationSize: this.population.length,
      avgFitness: this.population.length > 0 ? sum / this.population.length : 0,
      bestFitness: this.population.length > 0 ? this.population[0].fitness : 0,
    };
  }
}
