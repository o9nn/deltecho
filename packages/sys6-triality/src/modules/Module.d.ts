/**
 * @fileoverview Base Module class for neural network layers
 *
 * Provides a PyTorch nn.Module-compatible interface for building
 * nested neural networks in TypeScript.
 */
import { ShapedTensor } from '../tensors/index.js';
/**
 * Parameter initialization strategies
 */
export type InitStrategy =
  | 'zeros'
  | 'ones'
  | 'uniform'
  | 'normal'
  | 'xavier_uniform'
  | 'xavier_normal'
  | 'kaiming_uniform'
  | 'kaiming_normal';
/**
 * Learnable parameter with gradient tracking
 */
export interface Parameter {
  /** Parameter name */
  name: string;
  /** Parameter tensor */
  data: ShapedTensor;
  /** Gradient tensor (same shape as data) */
  grad?: ShapedTensor;
  /** Whether this parameter requires gradient */
  requiresGrad: boolean;
}
/**
 * Create a parameter with specified initialization
 */
export declare function createParameter(
  name: string,
  shape: number[],
  init?: InitStrategy,
  requiresGrad?: boolean
): Parameter;
/**
 * Base class for all neural network modules
 * Mirrors PyTorch's nn.Module interface
 */
export declare abstract class Module {
  /** Module name for debugging */
  protected _name: string;
  /** Whether the module is in training mode */
  protected _training: boolean;
  /** Registered parameters */
  protected _parameters: Map<string, Parameter>;
  /** Registered submodules */
  protected _modules: Map<string, Module>;
  /** Registered buffers (non-trainable tensors) */
  protected _buffers: Map<string, ShapedTensor>;
  constructor(name?: string);
  /**
   * Forward pass - must be implemented by subclasses
   * Uses 'any' for flexibility with specialized input/output types
   */
  abstract forward(...inputs: any[]): any;
  /**
   * Call the module (alias for forward)
   */
  call(...inputs: any[]): any;
  /**
   * Register a parameter
   */
  protected registerParameter(name: string, param: Parameter): void;
  /**
   * Register a submodule
   */
  protected registerModule(name: string, module: Module): void;
  /**
   * Register a buffer (non-trainable tensor)
   */
  protected registerBuffer(name: string, tensor: ShapedTensor): void;
  /**
   * Get all parameters (including from submodules)
   */
  parameters(): Parameter[];
  /**
   * Get named parameters
   */
  namedParameters(prefix?: string): Map<string, Parameter>;
  /**
   * Get all submodules
   */
  modules(): Module[];
  /**
   * Get named modules
   */
  namedModules(prefix?: string): Map<string, Module>;
  /**
   * Set training mode
   */
  train(mode?: boolean): this;
  /**
   * Set evaluation mode
   */
  eval(): this;
  /**
   * Check if in training mode
   */
  isTraining(): boolean;
  /**
   * Zero all gradients
   */
  zeroGrad(): void;
  /**
   * Get module name
   */
  get name(): string;
  /**
   * Count total parameters
   */
  numParameters(): number;
  /**
   * String representation
   */
  toString(): string;
}
/**
 * Container for a list of modules
 */
export declare class ModuleList extends Module {
  private _list;
  constructor(modules?: Module[]);
  append(module: Module): void;
  get(index: number): Module;
  get length(): number;
  [Symbol.iterator](): Iterator<Module>;
  forward(...inputs: ShapedTensor[]): ShapedTensor;
}
/**
 * Container for a dictionary of modules
 */
export declare class ModuleDict extends Module {
  private _dict;
  constructor(modules?: Record<string, Module>);
  set(name: string, module: Module): void;
  get(name: string): Module | undefined;
  has(name: string): boolean;
  keys(): IterableIterator<string>;
  values(): IterableIterator<Module>;
  entries(): IterableIterator<[string, Module]>;
  forward(...inputs: ShapedTensor[]): ShapedTensor;
}
/**
 * Sequential container - applies modules in order
 */
export declare class Sequential extends Module {
  private _sequence;
  constructor(...modules: Module[]);
  forward(input: ShapedTensor): ShapedTensor;
  append(module: Module): void;
}
//# sourceMappingURL=Module.d.ts.map
