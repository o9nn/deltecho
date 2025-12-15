/**
 * AtomSpace - Hypergraph Knowledge Representation
 * 
 * The AtomSpace is the central knowledge store in OpenCog, implemented as
 * a kernel module. It uses a weighted labeled hypergraph to represent
 * knowledge, where nodes represent concepts and links represent relationships.
 */

export type AtomType = 
  | 'ConceptNode'
  | 'PredicateNode'
  | 'VariableNode'
  | 'NumberNode'
  | 'ListLink'
  | 'InheritanceLink'
  | 'SimilarityLink'
  | 'ImplicationLink'
  | 'EvaluationLink'
  | 'ExecutionLink'

export interface TruthValue {
  strength: number    // [0, 1] confidence in truth
  confidence: number  // [0, 1] amount of evidence
}

export interface AttentionValue {
  sti: number  // Short-term importance
  lti: number  // Long-term importance
  vlti: number // Very long-term importance
}

export interface Atom {
  id: string
  type: AtomType
  name?: string
  outgoing?: string[]  // For links: IDs of connected atoms
  truthValue: TruthValue
  attentionValue: AttentionValue
  timestamp: number
}

/**
 * AtomSpace - Kernel-level hypergraph knowledge store
 */
export class AtomSpace {
  private atoms: Map<string, Atom>
  private nameIndex: Map<string, Set<string>>
  private typeIndex: Map<AtomType, Set<string>>
  private incomingIndex: Map<string, Set<string>>
  private nextId: number

  constructor() {
    this.atoms = new Map()
    this.nameIndex = new Map()
    this.typeIndex = new Map()
    this.incomingIndex = new Map()
    this.nextId = 1
  }

  /**
   * Add a node to the AtomSpace
   */
  addNode(type: AtomType, name: string, tv?: Partial<TruthValue>): Atom {
    const id = `atom_${this.nextId++}`
    const atom: Atom = {
      id,
      type,
      name,
      truthValue: {
        strength: tv?.strength ?? 1.0,
        confidence: tv?.confidence ?? 1.0,
      },
      attentionValue: {
        sti: 0,
        lti: 0,
        vlti: 0,
      },
      timestamp: Date.now(),
    }

    this.atoms.set(id, atom)
    
    // Update indices
    if (name) {
      if (!this.nameIndex.has(name)) {
        this.nameIndex.set(name, new Set())
      }
      this.nameIndex.get(name)!.add(id)
    }

    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set())
    }
    this.typeIndex.get(type)!.add(id)

    return atom
  }

  /**
   * Add a link to the AtomSpace
   */
  addLink(type: AtomType, outgoing: string[], tv?: Partial<TruthValue>): Atom {
    const id = `atom_${this.nextId++}`
    const atom: Atom = {
      id,
      type,
      outgoing,
      truthValue: {
        strength: tv?.strength ?? 1.0,
        confidence: tv?.confidence ?? 1.0,
      },
      attentionValue: {
        sti: 0,
        lti: 0,
        vlti: 0,
      },
      timestamp: Date.now(),
    }

    this.atoms.set(id, atom)

    // Update type index
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set())
    }
    this.typeIndex.get(type)!.add(id)

    // Update incoming index
    for (const targetId of outgoing) {
      if (!this.incomingIndex.has(targetId)) {
        this.incomingIndex.set(targetId, new Set())
      }
      this.incomingIndex.get(targetId)!.add(id)
    }

    return atom
  }

  /**
   * Get an atom by ID
   */
  getAtom(id: string): Atom | undefined {
    return this.atoms.get(id)
  }

  /**
   * Get atoms by name
   */
  getAtomsByName(name: string): Atom[] {
    const ids = this.nameIndex.get(name)
    if (!ids) return []
    return Array.from(ids).map(id => this.atoms.get(id)!).filter(a => a)
  }

  /**
   * Get atoms by type
   */
  getAtomsByType(type: AtomType): Atom[] {
    const ids = this.typeIndex.get(type)
    if (!ids) return []
    return Array.from(ids).map(id => this.atoms.get(id)!).filter(a => a)
  }

  /**
   * Get incoming links for an atom
   */
  getIncoming(atomId: string): Atom[] {
    const ids = this.incomingIndex.get(atomId)
    if (!ids) return []
    return Array.from(ids).map(id => this.atoms.get(id)!).filter(a => a)
  }

  /**
   * Get outgoing atoms for a link
   */
  getOutgoing(atomId: string): Atom[] {
    const atom = this.atoms.get(atomId)
    if (!atom || !atom.outgoing) return []
    return atom.outgoing.map(id => this.atoms.get(id)!).filter(a => a)
  }

  /**
   * Update truth value of an atom
   */
  setTruthValue(atomId: string, tv: TruthValue): boolean {
    const atom = this.atoms.get(atomId)
    if (!atom) return false
    atom.truthValue = tv
    return true
  }

  /**
   * Update attention value of an atom
   */
  setAttentionValue(atomId: string, av: AttentionValue): boolean {
    const atom = this.atoms.get(atomId)
    if (!atom) return false
    atom.attentionValue = av
    return true
  }

  /**
   * Remove an atom from the AtomSpace
   */
  removeAtom(atomId: string): boolean {
    const atom = this.atoms.get(atomId)
    if (!atom) return false

    // Remove from indices
    if (atom.name) {
      const names = this.nameIndex.get(atom.name)
      if (names) {
        names.delete(atomId)
        if (names.size === 0) {
          this.nameIndex.delete(atom.name)
        }
      }
    }

    const types = this.typeIndex.get(atom.type)
    if (types) {
      types.delete(atomId)
      if (types.size === 0) {
        this.typeIndex.delete(atom.type)
      }
    }

    // Remove from incoming index
    if (atom.outgoing) {
      for (const targetId of atom.outgoing) {
        const incoming = this.incomingIndex.get(targetId)
        if (incoming) {
          incoming.delete(atomId)
          if (incoming.size === 0) {
            this.incomingIndex.delete(targetId)
          }
        }
      }
    }

    this.atoms.delete(atomId)
    return true
  }

  /**
   * Get total number of atoms
   */
  getSize(): number {
    return this.atoms.size
  }

  /**
   * Clear all atoms from the AtomSpace
   */
  clear(): void {
    this.atoms.clear()
    this.nameIndex.clear()
    this.typeIndex.clear()
    this.incomingIndex.clear()
  }

  /**
   * Get all atoms
   */
  getAllAtoms(): Atom[] {
    return Array.from(this.atoms.values())
  }
}
