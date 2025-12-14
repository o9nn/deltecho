/**
 * PatternMatcher - Hypergraph Pattern Matching Engine
 * 
 * The pattern matcher is a core cognitive primitive that finds patterns
 * in the AtomSpace hypergraph. This is essential for reasoning, learning,
 * and knowledge discovery.
 */

import { Atom, AtomSpace, AtomType } from './AtomSpace.js'

export interface Pattern {
  type: AtomType
  name?: string
  variable?: boolean
  outgoing?: Pattern[]
}

export interface MatchResult {
  bindings: Map<string, Atom>
  matches: Atom[]
}

/**
 * PatternMatcher - Kernel-level pattern matching for cognitive operations
 */
export class PatternMatcher {
  private atomSpace: AtomSpace

  constructor(atomSpace: AtomSpace) {
    this.atomSpace = atomSpace
  }

  /**
   * Match a pattern against the AtomSpace
   */
  match(pattern: Pattern): MatchResult[] {
    const results: MatchResult[] = []
    
    // Get candidate atoms based on pattern type
    const candidates = pattern.type 
      ? this.atomSpace.getAtomsByType(pattern.type)
      : this.atomSpace.getAllAtoms()

    for (const atom of candidates) {
      const bindings = new Map<string, Atom>()
      if (this.matchAtom(pattern, atom, bindings)) {
        results.push({
          bindings,
          matches: [atom],
        })
      }
    }

    return results
  }

  /**
   * Match a pattern recursively against an atom
   */
  private matchAtom(
    pattern: Pattern,
    atom: Atom,
    bindings: Map<string, Atom>
  ): boolean {
    // Check type match
    if (pattern.type && pattern.type !== atom.type) {
      return false
    }

    // Check name match (if not a variable)
    if (pattern.name && !pattern.variable) {
      if (pattern.name !== atom.name) {
        return false
      }
    }

    // Handle variable binding
    if (pattern.variable && pattern.name) {
      const existing = bindings.get(pattern.name)
      if (existing && existing.id !== atom.id) {
        return false
      }
      bindings.set(pattern.name, atom)
    }

    // Match outgoing atoms for links
    if (pattern.outgoing && atom.outgoing) {
      if (pattern.outgoing.length !== atom.outgoing.length) {
        return false
      }

      for (let i = 0; i < pattern.outgoing.length; i++) {
        const subPattern = pattern.outgoing[i]
        const subAtomId = atom.outgoing[i]
        const subAtom = this.atomSpace.getAtom(subAtomId)
        
        if (!subAtom || !this.matchAtom(subPattern, subAtom, bindings)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Find atoms similar to a given atom
   */
  findSimilar(atomId: string, threshold: number = 0.5): Atom[] {
    const atom = this.atomSpace.getAtom(atomId)
    if (!atom) return []

    const similar: Atom[] = []
    const candidates = this.atomSpace.getAtomsByType(atom.type)

    for (const candidate of candidates) {
      if (candidate.id === atomId) continue
      
      const similarity = this.calculateSimilarity(atom, candidate)
      if (similarity >= threshold) {
        similar.push(candidate)
      }
    }

    return similar
  }

  /**
   * Calculate similarity between two atoms
   */
  private calculateSimilarity(atom1: Atom, atom2: Atom): number {
    // Simple similarity based on structure and truth values
    if (atom1.type !== atom2.type) return 0

    let similarity = 0

    // Name similarity
    if (atom1.name && atom2.name && atom1.name === atom2.name) {
      similarity += 0.4
    }

    // Truth value similarity
    const tvSim = 1 - Math.abs(
      atom1.truthValue.strength - atom2.truthValue.strength
    )
    similarity += tvSim * 0.3

    // Structural similarity for links
    if (atom1.outgoing && atom2.outgoing) {
      if (atom1.outgoing.length === atom2.outgoing.length) {
        similarity += 0.3
      }
    }

    return similarity
  }

  /**
   * Query the AtomSpace with a complex pattern
   */
  query(patterns: Pattern[]): MatchResult[] {
    if (patterns.length === 0) return []
    
    // Start with first pattern
    let results = this.match(patterns[0])

    // Refine with subsequent patterns
    for (let i = 1; i < patterns.length; i++) {
      const nextPattern = patterns[i]
      const newResults: MatchResult[] = []

      for (const result of results) {
        const matches = this.match(nextPattern)
        for (const match of matches) {
          // Merge bindings
          const mergedBindings = new Map<string, Atom>()
          for (const [k, v] of result.bindings) {
            mergedBindings.set(k, v)
          }
          for (const [k, v] of match.bindings) {
            mergedBindings.set(k, v)
          }
          newResults.push({
            bindings: mergedBindings,
            matches: [...result.matches, ...match.matches],
          })
        }
      }

      results = newResults
    }

    return results
  }
}
