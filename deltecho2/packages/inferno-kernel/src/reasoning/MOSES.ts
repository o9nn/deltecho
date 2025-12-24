/**
 * MOSES - Meta-Optimizing Semantic Evolutionary Search
 * 
 * MOSES is an evolutionary algorithm for program learning. It evolves
 * programs represented as trees to solve problems by optimizing a fitness
 * function. This is implemented as a kernel service for AGI learning.
 */

import { Atom, AtomSpace } from '../atomspace/AtomSpace.js'

export interface Program {
  id: string
  tree: Atom
  fitness: number
  generation: number
}

export interface MOSESConfig {
  populationSize: number
  maxGenerations: number
  mutationRate: number
  crossoverRate: number
  elitismRate: number
}

export type FitnessFunction = (program: Program) => number

/**
 * MOSES - Evolutionary program learning at the kernel level
 */
export class MOSES {
  private atomSpace: AtomSpace
  private config: MOSESConfig
  private population: Program[]
  private generation: number
  private nextProgramId: number

  constructor(atomSpace: AtomSpace, config: Partial<MOSESConfig> = {}) {
    this.atomSpace = atomSpace
    this.config = {
      populationSize: config.populationSize || 100,
      maxGenerations: config.maxGenerations || 50,
      mutationRate: config.mutationRate || 0.1,
      crossoverRate: config.crossoverRate || 0.7,
      elitismRate: config.elitismRate || 0.1,
    }
    this.population = []
    this.generation = 0
    this.nextProgramId = 1
  }

  /**
   * Initialize population with random programs
   */
  initializePopulation(): void {
    this.population = []
    
    for (let i = 0; i < this.config.populationSize; i++) {
      const program = this.createRandomProgram()
      this.population.push(program)
    }

    console.log(`[MOSES] Initialized population: ${this.population.length} programs`)
  }

  /**
   * Create a random program
   */
  private createRandomProgram(): Program {
    // Create a simple random program tree
    const tree = this.atomSpace.addLink(
      'ExecutionLink',
      [
        this.atomSpace.addNode('PredicateNode', `pred_${Math.random()}`).id,
        this.atomSpace.addLink('ListLink', [
          this.atomSpace.addNode('VariableNode', '$X').id,
        ]).id,
      ]
    )

    return {
      id: `prog_${this.nextProgramId++}`,
      tree,
      fitness: 0,
      generation: this.generation,
    }
  }

  /**
   * Evolve the population for one generation
   */
  evolve(fitnessFunc: FitnessFunction): Program[] {
    // Evaluate fitness
    for (const program of this.population) {
      program.fitness = fitnessFunc(program)
    }

    // Sort by fitness
    this.population.sort((a, b) => b.fitness - a.fitness)

    console.log(
      `[MOSES] Generation ${this.generation}: Best fitness = ${this.population[0].fitness}`
    )

    // Create next generation
    const nextGen: Program[] = []

    // Elitism - keep best programs
    const eliteCount = Math.floor(
      this.config.populationSize * this.config.elitismRate
    )
    for (let i = 0; i < eliteCount; i++) {
      nextGen.push(this.population[i])
    }

    // Generate rest of population
    while (nextGen.length < this.config.populationSize) {
      if (Math.random() < this.config.crossoverRate) {
        // Crossover
        const parent1 = this.tournamentSelect()
        const parent2 = this.tournamentSelect()
        const child = this.crossover(parent1, parent2)
        nextGen.push(child)
      } else {
        // Mutation
        const parent = this.tournamentSelect()
        const child = this.mutate(parent)
        nextGen.push(child)
      }
    }

    this.population = nextGen
    this.generation++

    return this.getBestPrograms(5)
  }

  /**
   * Tournament selection
   */
  private tournamentSelect(): Program {
    const tournamentSize = 3
    const tournament: Program[] = []

    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.population.length)
      tournament.push(this.population[idx])
    }

    return tournament.reduce((best, curr) => 
      curr.fitness > best.fitness ? curr : best
    )
  }

  /**
   * Deep clone an atom tree, creating new atoms in the AtomSpace
   */
  private cloneAtomTree(atomId: string): Atom {
    const original = this.atomSpace.getAtom(atomId)
    if (!original) {
      // If atom not found, create a placeholder
      return this.atomSpace.addNode('ConceptNode', `placeholder_${Math.random()}`)
    }

    if (original.outgoing && original.outgoing.length > 0) {
      // It's a link - recursively clone children
      const clonedOutgoing = original.outgoing.map(childId =>
        this.cloneAtomTree(childId).id
      )
      return this.atomSpace.addLink(original.type, clonedOutgoing, original.truthValue)
    } else {
      // It's a node - create a copy
      return this.atomSpace.addNode(original.type, original.name || '', original.truthValue)
    }
  }

  /**
   * Get all subtree root IDs from an atom tree
   */
  private getSubtreeIds(atomId: string): string[] {
    const result: string[] = [atomId]
    const atom = this.atomSpace.getAtom(atomId)

    if (atom?.outgoing) {
      for (const childId of atom.outgoing) {
        result.push(...this.getSubtreeIds(childId))
      }
    }

    return result
  }

  /**
   * Replace a subtree in a cloned tree with another subtree
   */
  private replaceSubtree(rootId: string, targetId: string, replacementId: string): Atom {
    const root = this.atomSpace.getAtom(rootId)
    if (!root) {
      return this.atomSpace.addNode('ConceptNode', 'error')
    }

    if (rootId === targetId) {
      // This is the node to replace - clone the replacement
      return this.cloneAtomTree(replacementId)
    }

    if (!root.outgoing || root.outgoing.length === 0) {
      // Leaf node, not our target - just clone it
      return this.atomSpace.addNode(root.type, root.name || '', root.truthValue)
    }

    // Link node - recursively process children
    const newOutgoing = root.outgoing.map(childId =>
      this.replaceSubtree(childId, targetId, replacementId).id
    )
    return this.atomSpace.addLink(root.type, newOutgoing, root.truthValue)
  }

  /**
   * Crossover two programs using subtree exchange
   * Performs actual genetic crossover by combining subtrees from both parents.
   */
  private crossover(parent1: Program, parent2: Program): Program {
    // Get subtree positions from both parents
    const subtrees1 = this.getSubtreeIds(parent1.tree.id)
    const subtrees2 = this.getSubtreeIds(parent2.tree.id)

    // Select random crossover points (skip root to ensure valid programs)
    const crossoverPoint1 = subtrees1.length > 1
      ? subtrees1[1 + Math.floor(Math.random() * (subtrees1.length - 1))]
      : subtrees1[0]
    const crossoverPoint2 = subtrees2.length > 1
      ? subtrees2[1 + Math.floor(Math.random() * (subtrees2.length - 1))]
      : subtrees2[0]

    // Clone parent1's tree and replace a subtree with one from parent2
    const childTree = this.replaceSubtree(
      parent1.tree.id,
      crossoverPoint1,
      crossoverPoint2
    )

    return {
      id: `prog_${this.nextProgramId++}`,
      tree: childTree,
      fitness: 0, // Will be evaluated by fitness function
      generation: this.generation,
    }
  }

  /**
   * Generate a random mutation for a node
   */
  private mutateNode(atom: Atom): Atom {
    const mutationTypes = ['strength', 'confidence', 'name'] as const
    const mutationType = mutationTypes[Math.floor(Math.random() * mutationTypes.length)]

    switch (mutationType) {
      case 'strength': {
        // Mutate truth value strength
        const newStrength = Math.max(0, Math.min(1,
          atom.truthValue.strength + (Math.random() - 0.5) * 0.2
        ))
        return this.atomSpace.addNode(
          atom.type,
          atom.name || '',
          { strength: newStrength, confidence: atom.truthValue.confidence }
        )
      }
      case 'confidence': {
        // Mutate truth value confidence
        const newConfidence = Math.max(0, Math.min(1,
          atom.truthValue.confidence + (Math.random() - 0.5) * 0.2
        ))
        return this.atomSpace.addNode(
          atom.type,
          atom.name || '',
          { strength: atom.truthValue.strength, confidence: newConfidence }
        )
      }
      case 'name': {
        // Mutate the predicate name (for predicate nodes)
        if (atom.type === 'PredicateNode') {
          return this.atomSpace.addNode(
            'PredicateNode',
            `pred_${Math.random()}`,
            atom.truthValue
          )
        }
        // For other node types, just clone
        return this.atomSpace.addNode(atom.type, atom.name || '', atom.truthValue)
      }
    }
  }

  /**
   * Mutate a program tree at a random position
   * Makes small modifications to the existing program tree structure.
   */
  private mutate(program: Program): Program {
    // Get all subtree positions
    const subtrees = this.getSubtreeIds(program.tree.id)

    // Select a random mutation point
    const mutationPoint = subtrees[Math.floor(Math.random() * subtrees.length)]
    const targetAtom = this.atomSpace.getAtom(mutationPoint)

    if (!targetAtom) {
      // Fallback: create a new random program
      return this.createRandomProgram()
    }

    // Decide mutation type
    const mutationChoice = Math.random()

    if (mutationChoice < 0.4 && (!targetAtom.outgoing || targetAtom.outgoing.length === 0)) {
      // Point mutation: modify a leaf node's properties
      const mutatedNode = this.mutateNode(targetAtom)
      const newTree = this.replaceSubtree(
        program.tree.id,
        mutationPoint,
        mutatedNode.id
      )
      return {
        id: `prog_${this.nextProgramId++}`,
        tree: newTree,
        fitness: 0,
        generation: this.generation,
      }
    } else if (mutationChoice < 0.7) {
      // Subtree mutation: replace a subtree with a new random one
      const randomSubtree = this.createRandomSubtree()
      const newTree = this.replaceSubtree(
        program.tree.id,
        mutationPoint,
        randomSubtree.id
      )
      return {
        id: `prog_${this.nextProgramId++}`,
        tree: newTree,
        fitness: 0,
        generation: this.generation,
      }
    } else {
      // Shrink mutation: replace a subtree with a single node
      const shrunkNode = this.atomSpace.addNode('VariableNode', '$Y')
      const newTree = this.replaceSubtree(
        program.tree.id,
        mutationPoint,
        shrunkNode.id
      )
      return {
        id: `prog_${this.nextProgramId++}`,
        tree: newTree,
        fitness: 0,
        generation: this.generation,
      }
    }
  }

  /**
   * Create a random subtree for mutation operations
   */
  private createRandomSubtree(): Atom {
    const depth = Math.floor(Math.random() * 2) + 1
    return this.createRandomSubtreeWithDepth(depth)
  }

  /**
   * Create a random subtree with specified maximum depth
   */
  private createRandomSubtreeWithDepth(maxDepth: number): Atom {
    if (maxDepth <= 0 || Math.random() < 0.3) {
      // Create a leaf node
      const nodeTypes = ['VariableNode', 'ConceptNode', 'NumberNode'] as const
      const nodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)]
      const name = nodeType === 'NumberNode'
        ? String(Math.random())
        : nodeType === 'VariableNode'
          ? `$${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
          : `concept_${Math.random().toString(36).substr(2, 5)}`
      return this.atomSpace.addNode(nodeType, name)
    }

    // Create a link with children
    const linkTypes = ['ListLink', 'EvaluationLink', 'ExecutionLink'] as const
    const linkType = linkTypes[Math.floor(Math.random() * linkTypes.length)]
    const numChildren = Math.floor(Math.random() * 2) + 1
    const children: string[] = []

    for (let i = 0; i < numChildren; i++) {
      const child = this.createRandomSubtreeWithDepth(maxDepth - 1)
      children.push(child.id)
    }

    return this.atomSpace.addLink(linkType, children)
  }

  /**
   * Get best programs
   */
  getBestPrograms(count: number): Program[] {
    return this.population
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, count)
  }

  /**
   * Run complete evolution
   */
  run(fitnessFunc: FitnessFunction): Program {
    this.initializePopulation()

    for (let i = 0; i < this.config.maxGenerations; i++) {
      this.evolve(fitnessFunc)
      
      const best = this.population[0]
      
      // Early stopping if fitness threshold reached
      if (best.fitness > 0.99) {
        console.log(`[MOSES] Converged at generation ${i}`)
        break
      }
    }

    const best = this.population[0]
    console.log(`[MOSES] Evolution complete. Best fitness: ${best.fitness}`)
    return best
  }

  /**
   * Get evolution statistics
   */
  getStats(): {
    generation: number
    populationSize: number
    avgFitness: number
    bestFitness: number
  } {
    const sum = this.population.reduce((s, p) => s + p.fitness, 0)
    
    return {
      generation: this.generation,
      populationSize: this.population.length,
      avgFitness: this.population.length > 0 ? sum / this.population.length : 0,
      bestFitness: this.population.length > 0 ? this.population[0].fitness : 0,
    }
  }
}
