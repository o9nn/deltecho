/**
 * PLN (Probabilistic Logic Networks) - Reasoning Engine
 * 
 * PLN is a formal inference system that combines logic and probability theory
 * for uncertain reasoning. It's a core component of OpenCog's cognitive
 * architecture, implemented here as a kernel service.
 */

import { Atom, AtomSpace, TruthValue } from '../atomspace/AtomSpace.js'
import { PatternMatcher } from '../atomspace/PatternMatcher.js'

export interface InferenceRule {
  name: string
  premises: string[]
  conclusion: string
  apply: (premises: Atom[], atomSpace: AtomSpace) => Atom | null
}

/**
 * PLNEngine - Probabilistic reasoning at the kernel level
 */
export class PLNEngine {
  private atomSpace: AtomSpace
  private patternMatcher: PatternMatcher
  private rules: Map<string, InferenceRule>

  constructor(atomSpace: AtomSpace) {
    this.atomSpace = atomSpace
    this.patternMatcher = new PatternMatcher(atomSpace)
    this.rules = new Map()
    this.initializeRules()
  }

  /**
   * Initialize standard PLN inference rules
   */
  private initializeRules(): void {
    // Deduction rule: If A->B and B->C, infer A->C
    this.registerRule({
      name: 'deduction',
      premises: ['ImplicationLink', 'ImplicationLink'],
      conclusion: 'ImplicationLink',
      apply: (premises, atomSpace) => {
        return this.applyDeduction(premises, atomSpace)
      },
    })

    // Induction rule: Generalize from examples
    this.registerRule({
      name: 'induction',
      premises: ['InheritanceLink'],
      conclusion: 'InheritanceLink',
      apply: (premises, atomSpace) => {
        return this.applyInduction(premises, atomSpace)
      },
    })

    // Abduction rule: Infer cause from effect
    this.registerRule({
      name: 'abduction',
      premises: ['ImplicationLink', 'EvaluationLink'],
      conclusion: 'EvaluationLink',
      apply: (premises, atomSpace) => {
        return this.applyAbduction(premises, atomSpace)
      },
    })

    // Similarity rule: A similar to B, B has property P, infer A has property P
    this.registerRule({
      name: 'similarity',
      premises: ['SimilarityLink', 'InheritanceLink'],
      conclusion: 'InheritanceLink',
      apply: (premises, atomSpace) => {
        return this.applySimilarity(premises, atomSpace)
      },
    })
  }

  /**
   * Register a new inference rule
   */
  registerRule(rule: InferenceRule): void {
    this.rules.set(rule.name, rule)
    console.log(`[PLNEngine] Registered rule: ${rule.name}`)
  }

  /**
   * Apply deduction rule: A->B, B->C => A->C
   */
  private applyDeduction(premises: Atom[], atomSpace: AtomSpace): Atom | null {
    if (premises.length < 2) return null

    const ab = premises[0]
    const bc = premises[1]

    // Check if premises connect (B is common)
    if (!ab.outgoing || !bc.outgoing) return null
    if (ab.outgoing.length !== 2 || bc.outgoing.length !== 2) return null

    // Use string comparison for atom IDs (IDs are always strings)
    if (String(ab.outgoing[1]) !== String(bc.outgoing[0])) return null

    // Create A->C with combined truth value
    const tv = this.deductionFormula(ab.truthValue, bc.truthValue)
    
    const conclusion = atomSpace.addLink(
      'ImplicationLink',
      [ab.outgoing[0], bc.outgoing[1]],
      tv
    )

    console.log('[PLNEngine] Applied deduction rule')
    return conclusion
  }

  /**
   * Apply induction rule: Generalize from specific examples
   */
  private applyInduction(premises: Atom[], atomSpace: AtomSpace): Atom | null {
    if (premises.length < 1) return null
    
    const example = premises[0]
    if (!example.outgoing || example.outgoing.length !== 2) return null

    // Simple induction: strengthen existing inheritance links
    const tv = this.inductionFormula(example.truthValue)
    
    // Find or create generalized inheritance link
    const conclusion = atomSpace.addLink(
      'InheritanceLink',
      example.outgoing,
      tv
    )

    console.log('[PLNEngine] Applied induction rule')
    return conclusion
  }

  /**
   * Apply abduction rule: Infer likely cause from effect
   */
  private applyAbduction(premises: Atom[], atomSpace: AtomSpace): Atom | null {
    if (premises.length < 2) return null

    const implication = premises[0]
    const effect = premises[1]

    if (!implication.outgoing || implication.outgoing.length !== 2) return null

    // Check if effect matches consequent
    const tv = this.abductionFormula(
      implication.truthValue,
      effect.truthValue
    )

    const conclusion = atomSpace.addLink(
      'EvaluationLink',
      [implication.outgoing[0]],
      tv
    )

    console.log('[PLNEngine] Applied abduction rule')
    return conclusion
  }

  /**
   * Apply similarity rule: Transfer properties via similarity
   */
  private applySimilarity(premises: Atom[], atomSpace: AtomSpace): Atom | null {
    if (premises.length < 2) return null

    const similarity = premises[0]
    const inheritance = premises[1]

    if (!similarity.outgoing || similarity.outgoing.length !== 2) return null
    if (!inheritance.outgoing || inheritance.outgoing.length !== 2) return null

    // Check if atoms are related
    const tv = this.similarityFormula(
      similarity.truthValue,
      inheritance.truthValue
    )

    const conclusion = atomSpace.addLink(
      'InheritanceLink',
      [similarity.outgoing[1], inheritance.outgoing[1]],
      tv
    )

    console.log('[PLNEngine] Applied similarity rule')
    return conclusion
  }

  /**
   * Deduction truth value formula
   */
  private deductionFormula(tv1: TruthValue, tv2: TruthValue): TruthValue {
    return {
      strength: tv1.strength * tv2.strength,
      confidence: Math.min(tv1.confidence, tv2.confidence) * 0.9,
    }
  }

  /**
   * Induction truth value formula
   */
  private inductionFormula(tv: TruthValue): TruthValue {
    return {
      strength: tv.strength,
      confidence: Math.min(tv.confidence * 0.8, 0.9),
    }
  }

  /**
   * Abduction truth value formula
   */
  private abductionFormula(tv1: TruthValue, tv2: TruthValue): TruthValue {
    return {
      strength: tv1.strength * tv2.strength * 0.8,
      confidence: Math.min(tv1.confidence, tv2.confidence) * 0.7,
    }
  }

  /**
   * Similarity truth value formula
   */
  private similarityFormula(tv1: TruthValue, tv2: TruthValue): TruthValue {
    return {
      strength: tv1.strength * tv2.strength * 0.9,
      confidence: Math.min(tv1.confidence, tv2.confidence) * 0.8,
    }
  }

  /**
   * Execute one forward chaining inference step
   */
  forwardChain(maxInferences: number = 10): Atom[] {
    const newAtoms: Atom[] = []
    let inferences = 0

    for (const rule of this.rules.values()) {
      if (inferences >= maxInferences) break

      // Find applicable premises
      const premises = this.findPremises(rule)
      
      for (const premiseSet of premises) {
        if (inferences >= maxInferences) break

        const conclusion = rule.apply(premiseSet, this.atomSpace)
        if (conclusion) {
          newAtoms.push(conclusion)
          inferences++
        }
      }
    }

    console.log(`[PLNEngine] Forward chaining: ${inferences} inferences`)
    return newAtoms
  }

  /**
   * Execute backward chaining inference to prove a goal
   */
  backwardChain(goal: Atom, maxDepth: number = 5): boolean {
    if (maxDepth <= 0) return false

    // Check if goal already proven
    if (goal.truthValue.strength > 0.7) return true

    // Try to find rules that can prove the goal
    for (const rule of this.rules.values()) {
      // Simplified backward chaining - find premises that lead to goal
      const premises = this.findPremises(rule)
      
      for (const premiseSet of premises) {
        const conclusion = rule.apply(premiseSet, this.atomSpace)
        if (conclusion && this.atomsEquivalent(conclusion, goal)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Find applicable premises for a rule
   */
  private findPremises(rule: InferenceRule): Atom[][] {
    const results: Atom[][] = []
    
    // Simplified premise finding - get atoms matching premise types
    const premises: Atom[][] = []
    for (const premiseType of rule.premises) {
      const atoms = this.atomSpace.getAtomsByType(premiseType as any)
      premises.push(atoms)
    }

    // Generate combinations (simplified)
    if (premises.length > 0) {
      for (const atom of premises[0]) {
        results.push([atom, ...premises.slice(1).map(p => p[0]).filter(a => a)])
      }
    }

    return results
  }

  /**
   * Check if two atoms are equivalent
   */
  private atomsEquivalent(a1: Atom, a2: Atom): boolean {
    if (a1.type !== a2.type) return false
    if (a1.name !== a2.name) return false
    return true
  }
}
