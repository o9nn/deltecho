/**
 * reasoningShim - Minimal browser-safe reasoning core for AgentToolExecutor
 *
 * Deltecho-chat's `@deltecho/reasoning` package (AtomSpace + PLN + DuckDB
 * persistence) is not available in this workspace: deltecho2's inferno-kernel
 * exposes a different AtomSpace API and no DuckDB adapter. This shim provides
 * an API-compatible, in-memory subset so the agentic knowledge tools
 * (store_knowledge / query_knowledge / perform_reasoning) keep working.
 *
 * If/when a full `@deltecho/reasoning` port lands in this workspace, the
 * imports in AgentToolExecutor.ts can be pointed back at it - the shapes
 * here mirror that package's public API.
 */

// ============================================================
// TRUTH VALUES
// ============================================================

/**
 * Probabilistic Truth Value (TV)
 * Represents the degree of truth of an Atom.
 */
export interface TruthValue {
  mean: number // Probability (0 to 1)
  confidence: number // Confidence in the mean (0 to 1)
}

export function createTruthValue(
  mean: number = 1.0,
  confidence: number = 1.0
): TruthValue {
  return {
    mean: Math.max(0, Math.min(1, mean)),
    confidence: Math.max(0, Math.min(1, confidence)),
  }
}

export function indeterminateTruthValue(): TruthValue {
  return { mean: 0.5, confidence: 0.0 }
}

// ============================================================
// ATOMS
// ============================================================

export enum AtomType {
  Node = 'Node',
  Link = 'Link',
  ConceptNode = 'ConceptNode',
  PredicateNode = 'PredicateNode',
  ListLink = 'ListLink',
  InheritanceLink = 'InheritanceLink',
  SimilarityLink = 'SimilarityLink',
  EvaluationLink = 'EvaluationLink',
  MemberLink = 'MemberLink',
  VariableNode = 'VariableNode',
}

export abstract class Atom {
  public readonly id: string
  public readonly type: AtomType
  public truthValue: TruthValue
  public attention: number = 0 // STI/LTI equivalent

  constructor(id: string, type: AtomType, tv: TruthValue = createTruthValue()) {
    this.id = id
    this.type = type
    this.truthValue = tv
  }

  public abstract isNode(): this is Node
  public abstract isLink(): this is Link

  public toString(): string {
    return this.id
  }
}

export class Node extends Atom {
  public readonly name: string

  constructor(
    name: string,
    type: AtomType = AtomType.ConceptNode,
    tv: TruthValue = createTruthValue()
  ) {
    super(`${type}:${name}`, type, tv)
    this.name = name
  }

  public isNode(): this is Node {
    return true
  }
  public isLink(): this is Link {
    return false
  }

  public toString(): string {
    return `(${this.type} "${this.name}")`
  }
}

export class Link extends Atom {
  public readonly outgoing: Atom[]

  constructor(
    type: AtomType,
    outgoing: Atom[],
    tv: TruthValue = createTruthValue()
  ) {
    // ID for links is derived from type and outgoing atom IDs
    const id = `${type}(${outgoing.map(a => a.id).join(',')})`
    super(id, type, tv)
    this.outgoing = outgoing
  }

  public isNode(): this is Node {
    return false
  }
  public isLink(): this is Link {
    return true
  }

  public toString(): string {
    return `(${this.type} ${this.outgoing.map(a => a.toString()).join(' ')})`
  }
}

// ============================================================
// ATOMSPACE
// ============================================================

export class AtomSpace {
  private atoms: Map<string, Atom> = new Map()

  /**
   * Get an atom by its ID
   */
  public getAtom(id: string): Atom | undefined {
    return this.atoms.get(id)
  }

  /**
   * Add an atom to the AtomSpace
   */
  public addAtom(atom: Atom): Atom {
    if (!this.atoms.has(atom.id)) {
      this.atoms.set(atom.id, atom)
    }
    return this.atoms.get(atom.id)!
  }

  /**
   * Create or get a Node
   */
  public node(
    name: string,
    type: AtomType = AtomType.ConceptNode,
    tv?: TruthValue
  ): Node {
    const atom = new Node(name, type, tv)
    return this.addAtom(atom) as Node
  }

  /**
   * Create or get a Link
   */
  public link(type: AtomType, outgoing: Atom[], tv?: TruthValue): Link {
    const atom = new Link(type, outgoing, tv)
    return this.addAtom(atom) as Link
  }

  /**
   * Get all atoms of a certain type
   */
  public getByType(type: AtomType): Atom[] {
    return Array.from(this.atoms.values()).filter(a => a.type === type)
  }

  /**
   * Get atoms that have a certain atom in their outgoing set
   */
  public getIncoming(atom: Atom): Link[] {
    return Array.from(this.atoms.values()).filter(
      a => a.isLink() && a.outgoing.some(o => o.id === atom.id)
    ) as Link[]
  }

  public size(): number {
    return this.atoms.size
  }

  public clear(): void {
    this.atoms.clear()
  }
}

// ============================================================
// PLN ENGINE
// ============================================================

export class PLNEngine {
  private atomSpace: AtomSpace

  constructor(atomSpace: AtomSpace) {
    this.atomSpace = atomSpace
  }

  /**
   * Perform one step of forward chaining deduction.
   * Finds patterns: InheritanceLink(A, B) and InheritanceLink(B, C)
   * and creates InheritanceLink(A, C)
   */
  public deduce(): number {
    const inheritanceLinks = this.atomSpace.getByType(
      AtomType.InheritanceLink
    ) as Link[]
    let newAtoms = 0

    for (const ab of inheritanceLinks) {
      const a = ab.outgoing[0]
      const b = ab.outgoing[1]
      if (!a || !b) continue

      // Find links where B is the first element (B -> C)
      const bcLinks = inheritanceLinks.filter(l => l.outgoing[0]?.id === b.id)

      for (const bc of bcLinks) {
        const c = bc.outgoing[1]
        if (!c || a.id === c.id) continue

        // Simple deduction rule
        const newTV = this.deductionFormula(ab.truthValue, bc.truthValue)

        // Check if the conclusion already exists
        const existing = this.atomSpace.getAtom(
          `${AtomType.InheritanceLink}(${a.id},${c.id})`
        )
        if (!existing) {
          this.atomSpace.link(AtomType.InheritanceLink, [a, c], newTV)
          newAtoms++
        }
      }
    }

    return newAtoms
  }

  private deductionFormula(tv1: TruthValue, tv2: TruthValue): TruthValue {
    // Simplified formula: strength product with confidence penalty
    return createTruthValue(
      tv1.mean * tv2.mean,
      tv1.confidence * tv2.confidence * 0.9
    )
  }
}

// ============================================================
// PERSISTENCE (in-memory stand-in for the DuckDB WASM adapter)
// ============================================================

export interface StoredAtomRecord {
  id: string
  type: string
  name?: string
  strength?: number
  confidence?: number
  metadata?: any
  embedding?: number[]
}

/**
 * In-memory stand-in for the `@deltecho/reasoning` DuckDB WASM adapter.
 * Keeps the same async surface so callers work unchanged; data does not
 * persist across sessions.
 */
export class DuckDBAdapter {
  private records: Map<string, StoredAtomRecord> = new Map()
  private initialized = false

  public async initialize(): Promise<void> {
    this.initialized = true
  }

  public async storeAtom(atom: StoredAtomRecord): Promise<void> {
    if (!this.initialized) await this.initialize()
    this.records.set(atom.id, { ...atom })
  }

  public async findAtoms(type?: string, namePattern?: string): Promise<any[]> {
    if (!this.initialized) await this.initialize()

    let results = Array.from(this.records.values())
    if (type) {
      results = results.filter(r => r.type === type)
    }
    if (namePattern) {
      // Mirror SQL LIKE semantics: % wildcard, case-insensitive
      const regex = new RegExp(
        '^' +
          namePattern
            .split('%')
            .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*') +
          '$',
        'i'
      )
      results = results.filter(r => r.name !== undefined && regex.test(r.name))
    }
    return results
  }

  /**
   * Minimal query support: the only SQL used by AgentToolExecutor is an
   * incoming-link lookup on metadata.outgoing, so emulate that and return
   * an empty result set for anything else.
   */
  public async query<T = any>(
    sqlQuery: string,
    _params: any[] = []
  ): Promise<T[]> {
    if (!this.initialized) await this.initialize()

    const outgoingMatch = sqlQuery.match(/\$\.outgoing'\)\s+LIKE\s+'%(.+?)%'/i)
    if (outgoingMatch) {
      const target = outgoingMatch[1]
      return Array.from(this.records.values()).filter(r => {
        const outgoing = r.metadata?.outgoing
        return (
          Array.isArray(outgoing) &&
          outgoing.some(o => typeof o === 'string' && o.includes(target))
        )
      }) as T[]
    }

    return []
  }
}
