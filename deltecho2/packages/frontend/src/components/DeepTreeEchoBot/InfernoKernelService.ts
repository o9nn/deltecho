import { getLogger } from '@deltachat-desktop/shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'
import {
  InfernoKernel,
  AtomSpace,
  PLNEngine,
  AttentionAllocation,
} from '@deltachat-desktop/inferno-kernel'
import type {
  Atom,
  AtomType,
  TruthValue,
  KernelStats,
} from '@deltachat-desktop/inferno-kernel'

const log = getLogger('render/components/DeepTreeEchoBot/InfernoKernelService')

/**
 * Lifecycle state of the Inferno kernel
 */
export type InfernoKernelState = 'stopped' | 'starting' | 'running' | 'error'

/**
 * Attention allocation statistics reported by the kernel
 */
export interface AttentionStats {
  focusSize: number
  avgSTI: number
  maxSTI: number
  minSTI: number
}

/**
 * Snapshot of the kernel's current status for UI display
 */
export interface InfernoKernelStatus {
  enabled: boolean
  state: InfernoKernelState
  kernelStats: KernelStats | null
  atomCount: number
  attentionStats: AttentionStats | null
}

/**
 * InfernoKernelService - Lazy singleton bridge between the Deep Tree Echo
 * bot and the @deltachat-desktop/inferno-kernel AGI kernel.
 *
 * Exposes a small typed API over the kernel: AtomSpace operations,
 * PLN forward-chaining inference and attention allocation statistics.
 *
 * The kernel is only booted when the Deep Tree Echo bot is enabled and
 * parallel processing is turned on (deepTreeEchoBotUseParallelProcessing,
 * which defaults to true).
 */
export class InfernoKernelService {
  private static instance: InfernoKernelService | null = null

  private kernel: InfernoKernel | null = null
  private atomSpace: AtomSpace | null = null
  private plnEngine: PLNEngine | null = null
  private attention: AttentionAllocation | null = null

  private state: InfernoKernelState = 'stopped'
  private enabled = false

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): InfernoKernelService {
    if (!InfernoKernelService.instance) {
      InfernoKernelService.instance = new InfernoKernelService()
    }
    return InfernoKernelService.instance
  }

  /**
   * Initialize the kernel if it is enabled in the bot settings.
   * Idempotent: calling init while running is a no-op.
   *
   * @returns true when the kernel is running after the call
   */
  public async init(): Promise<boolean> {
    if (this.state === 'running') {
      return true
    }

    try {
      const desktopSettings = await runtime.getDesktopSettings()
      this.enabled =
        !!desktopSettings.deepTreeEchoBotEnabled &&
        desktopSettings.deepTreeEchoBotUseParallelProcessing !== false

      if (!this.enabled) {
        log.info(
          'Inferno kernel is disabled (bot disabled or parallel processing off)'
        )
        this.state = 'stopped'
        return false
      }

      this.state = 'starting'
      log.info('Booting Inferno AGI kernel...')

      this.kernel = new InfernoKernel()
      await this.kernel.boot()

      this.atomSpace = new AtomSpace()
      this.plnEngine = new PLNEngine(this.atomSpace)
      this.attention = new AttentionAllocation(this.atomSpace)

      this.state = 'running'
      log.info('Inferno AGI kernel booted successfully')
      return true
    } catch (error) {
      log.error('Failed to boot Inferno kernel:', error)
      this.state = 'error'
      return false
    }
  }

  /**
   * Shut down the kernel and release all cognitive resources
   */
  public async shutdown(): Promise<void> {
    if (this.kernel) {
      try {
        await this.kernel.shutdown()
      } catch (error) {
        log.error('Error shutting down Inferno kernel:', error)
      }
    }

    this.kernel = null
    this.atomSpace = null
    this.plnEngine = null
    this.attention = null
    this.state = 'stopped'
    log.info('Inferno kernel service stopped')
  }

  /**
   * Whether the kernel is currently booted and running
   */
  public isRunning(): boolean {
    return this.state === 'running'
  }

  /**
   * Get a status snapshot for UI display
   */
  public getStatus(): InfernoKernelStatus {
    return {
      enabled: this.enabled,
      state: this.state,
      kernelStats: this.kernel ? this.kernel.getStats() : null,
      atomCount: this.atomSpace ? this.atomSpace.getSize() : 0,
      attentionStats: this.attention ? this.attention.getStats() : null,
    }
  }

  /**
   * Add a concept node to the AtomSpace
   */
  public addConcept(name: string, tv?: Partial<TruthValue>): Atom | null {
    if (!this.atomSpace) {
      log.warn('Cannot add concept: kernel not running')
      return null
    }
    return this.atomSpace.addNode('ConceptNode', name, tv)
  }

  /**
   * Add a node of an arbitrary atom type to the AtomSpace
   */
  public addNode(
    type: AtomType,
    name: string,
    tv?: Partial<TruthValue>
  ): Atom | null {
    if (!this.atomSpace) {
      log.warn('Cannot add node: kernel not running')
      return null
    }
    return this.atomSpace.addNode(type, name, tv)
  }

  /**
   * Add a link between existing atoms to the AtomSpace
   */
  public addLink(
    type: AtomType,
    outgoing: string[],
    tv?: Partial<TruthValue>
  ): Atom | null {
    if (!this.atomSpace) {
      log.warn('Cannot add link: kernel not running')
      return null
    }
    return this.atomSpace.addLink(type, outgoing, tv)
  }

  /**
   * Look up atoms by name
   */
  public getAtomsByName(name: string): Atom[] {
    if (!this.atomSpace) {
      return []
    }
    return this.atomSpace.getAtomsByName(name)
  }

  /**
   * Run PLN forward-chaining inference over the AtomSpace
   *
   * @returns newly inferred atoms
   */
  public runInference(maxInferences: number = 10): Atom[] {
    if (!this.plnEngine) {
      log.warn('Cannot run inference: kernel not running')
      return []
    }
    return this.plnEngine.forwardChain(maxInferences)
  }

  /**
   * Stimulate an atom, increasing its short-term importance
   */
  public stimulateAtom(atomId: string, amount: number): void {
    if (!this.attention) {
      log.warn('Cannot stimulate atom: kernel not running')
      return
    }
    this.attention.stimulate(atomId, amount)
  }

  /**
   * Get attention allocation statistics
   */
  public getAttentionStats(): AttentionStats | null {
    if (!this.attention) {
      return null
    }
    return this.attention.getStats()
  }
}

/**
 * Convenience accessor for the singleton service
 */
export function getInfernoKernelService(): InfernoKernelService {
  return InfernoKernelService.getInstance()
}
