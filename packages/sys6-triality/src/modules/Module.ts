/**
 * @fileoverview Base Module class for neural network layers
 * 
 * Provides a PyTorch nn.Module-compatible interface for building
 * nested neural networks in TypeScript.
 */

import {
  ShapedTensor,
  createTensor,
  randn,
  zeros,
} from '../tensors/index.js';

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
export function createParameter(
  name: string,
  shape: number[],
  init: InitStrategy = 'xavier_uniform',
  requiresGrad: boolean = true
): Parameter {
  let data: ShapedTensor;
  
  switch (init) {
    case 'zeros':
      data = zeros(shape);
      break;
    case 'ones':
      data = createTensor(new Array(shape.reduce((a, b) => a * b, 1)).fill(1), shape);
      break;
    case 'uniform':
      data = createTensor(
        new Array(shape.reduce((a, b) => a * b, 1)).fill(0).map(() => Math.random() * 2 - 1),
        shape
      );
      break;
    case 'normal':
      data = randn(shape);
      break;
    case 'xavier_uniform': {
      const fanIn = shape.length > 1 ? shape[shape.length - 2] : shape[0];
      const fanOut = shape[shape.length - 1];
      const bound = Math.sqrt(6 / (fanIn + fanOut));
      data = createTensor(
        new Array(shape.reduce((a, b) => a * b, 1)).fill(0).map(() => Math.random() * 2 * bound - bound),
        shape
      );
      break;
    }
    case 'xavier_normal': {
      const fanIn = shape.length > 1 ? shape[shape.length - 2] : shape[0];
      const fanOut = shape[shape.length - 1];
      const std = Math.sqrt(2 / (fanIn + fanOut));
      const normal = randn(shape);
      data = createTensor(
        Array.from(normal.data).map(x => (x as number) * std),
        shape
      );
      break;
    }
    case 'kaiming_uniform': {
      const fanIn = shape.length > 1 ? shape[shape.length - 2] : shape[0];
      const bound = Math.sqrt(6 / fanIn);
      data = createTensor(
        new Array(shape.reduce((a, b) => a * b, 1)).fill(0).map(() => Math.random() * 2 * bound - bound),
        shape
      );
      break;
    }
    case 'kaiming_normal': {
      const fanIn = shape.length > 1 ? shape[shape.length - 2] : shape[0];
      const std = Math.sqrt(2 / fanIn);
      const normal = randn(shape);
      data = createTensor(
        Array.from(normal.data).map(x => (x as number) * std),
        shape
      );
      break;
    }
    default:
      data = randn(shape);
  }
  
  return {
    name,
    data,
    requiresGrad,
  };
}

/**
 * Base class for all neural network modules
 * Mirrors PyTorch's nn.Module interface
 */
export abstract class Module {
  /** Module name for debugging */
  protected _name: string;
  
  /** Whether the module is in training mode */
  protected _training: boolean = true;
  
  /** Registered parameters */
  protected _parameters: Map<string, Parameter> = new Map();
  
  /** Registered submodules */
  protected _modules: Map<string, Module> = new Map();
  
  /** Registered buffers (non-trainable tensors) */
  protected _buffers: Map<string, ShapedTensor> = new Map();
  
  constructor(name?: string) {
    this._name = name || this.constructor.name;
  }
  
  /**
   * Forward pass - must be implemented by subclasses
   * Uses 'any' for flexibility with specialized input/output types
   */
  abstract forward(...inputs: any[]): any;
  
  /**
   * Call the module (alias for forward)
   */
  call(...inputs: any[]): any {
    return this.forward(...inputs);
  }
  
  /**
   * Register a parameter
   */
  protected registerParameter(name: string, param: Parameter): void {
    this._parameters.set(name, param);
  }
  
  /**
   * Register a submodule
   */
  protected registerModule(name: string, module: Module): void {
    this._modules.set(name, module);
  }
  
  /**
   * Register a buffer (non-trainable tensor)
   */
  protected registerBuffer(name: string, tensor: ShapedTensor): void {
    this._buffers.set(name, tensor);
  }
  
  /**
   * Get all parameters (including from submodules)
   */
  parameters(): Parameter[] {
    const params: Parameter[] = [];
    
    // Own parameters
    for (const param of this._parameters.values()) {
      params.push(param);
    }
    
    // Submodule parameters
    for (const module of this._modules.values()) {
      params.push(...module.parameters());
    }
    
    return params;
  }
  
  /**
   * Get named parameters
   */
  namedParameters(prefix: string = ''): Map<string, Parameter> {
    const params = new Map<string, Parameter>();
    const fullPrefix = prefix ? `${prefix}.` : '';
    
    // Own parameters
    for (const [name, param] of this._parameters) {
      params.set(`${fullPrefix}${name}`, param);
    }
    
    // Submodule parameters
    for (const [moduleName, module] of this._modules) {
      const subParams = module.namedParameters(`${fullPrefix}${moduleName}`);
      for (const [name, param] of subParams) {
        params.set(name, param);
      }
    }
    
    return params;
  }
  
  /**
   * Get all submodules
   */
  modules(): Module[] {
    const mods: Module[] = [this];
    
    for (const module of this._modules.values()) {
      mods.push(...module.modules());
    }
    
    return mods;
  }
  
  /**
   * Get named modules
   */
  namedModules(prefix: string = ''): Map<string, Module> {
    const mods = new Map<string, Module>();
    const fullPrefix = prefix ? `${prefix}.` : '';
    
    mods.set(prefix || this._name, this);
    
    for (const [name, module] of this._modules) {
      const subMods = module.namedModules(`${fullPrefix}${name}`);
      for (const [subName, subMod] of subMods) {
        mods.set(subName, subMod);
      }
    }
    
    return mods;
  }
  
  /**
   * Set training mode
   */
  train(mode: boolean = true): this {
    this._training = mode;
    for (const module of this._modules.values()) {
      module.train(mode);
    }
    return this;
  }
  
  /**
   * Set evaluation mode
   */
  eval(): this {
    return this.train(false);
  }
  
  /**
   * Check if in training mode
   */
  isTraining(): boolean {
    return this._training;
  }
  
  /**
   * Zero all gradients
   */
  zeroGrad(): void {
    for (const param of this.parameters()) {
      param.grad = undefined;
    }
  }
  
  /**
   * Get module name
   */
  get name(): string {
    return this._name;
  }
  
  /**
   * Count total parameters
   */
  numParameters(): number {
    let count = 0;
    for (const param of this.parameters()) {
      count += param.data.data.length;
    }
    return count;
  }
  
  /**
   * String representation
   */
  toString(): string {
    const lines: string[] = [`${this._name}(`];
    
    for (const [name, module] of this._modules) {
      const moduleStr = module.toString().split('\n');
      lines.push(`  (${name}): ${moduleStr[0]}`);
      for (let i = 1; i < moduleStr.length; i++) {
        lines.push(`  ${moduleStr[i]}`);
      }
    }
    
    lines.push(')');
    return lines.join('\n');
  }
}

/**
 * Container for a list of modules
 */
export class ModuleList extends Module {
  private _list: Module[] = [];
  
  constructor(modules?: Module[]) {
    super('ModuleList');
    if (modules) {
      for (let i = 0; i < modules.length; i++) {
        this.append(modules[i]);
      }
    }
  }
  
  append(module: Module): void {
    const idx = this._list.length;
    this._list.push(module);
    this.registerModule(idx.toString(), module);
  }
  
  get(index: number): Module {
    return this._list[index];
  }
  
  get length(): number {
    return this._list.length;
  }
  
  [Symbol.iterator](): Iterator<Module> {
    return this._list[Symbol.iterator]();
  }
  
  forward(...inputs: ShapedTensor[]): ShapedTensor {
    throw new Error('ModuleList does not implement forward()');
  }
}

/**
 * Container for a dictionary of modules
 */
export class ModuleDict extends Module {
  private _dict: Map<string, Module> = new Map();
  
  constructor(modules?: Record<string, Module>) {
    super('ModuleDict');
    if (modules) {
      for (const [name, module] of Object.entries(modules)) {
        this.set(name, module);
      }
    }
  }
  
  set(name: string, module: Module): void {
    this._dict.set(name, module);
    this.registerModule(name, module);
  }
  
  get(name: string): Module | undefined {
    return this._dict.get(name);
  }
  
  has(name: string): boolean {
    return this._dict.has(name);
  }
  
  keys(): IterableIterator<string> {
    return this._dict.keys();
  }
  
  values(): IterableIterator<Module> {
    return this._dict.values();
  }
  
  entries(): IterableIterator<[string, Module]> {
    return this._dict.entries();
  }
  
  forward(...inputs: ShapedTensor[]): ShapedTensor {
    throw new Error('ModuleDict does not implement forward()');
  }
}

/**
 * Sequential container - applies modules in order
 */
export class Sequential extends Module {
  private _sequence: Module[] = [];
  
  constructor(...modules: Module[]) {
    super('Sequential');
    for (let i = 0; i < modules.length; i++) {
      this._sequence.push(modules[i]);
      this.registerModule(i.toString(), modules[i]);
    }
  }
  
  forward(input: ShapedTensor): ShapedTensor {
    let output = input;
    for (const module of this._sequence) {
      const result = module.forward(output);
      output = Array.isArray(result) ? result[0] : result;
    }
    return output;
  }
  
  append(module: Module): void {
    const idx = this._sequence.length;
    this._sequence.push(module);
    this.registerModule(idx.toString(), module);
  }
}
