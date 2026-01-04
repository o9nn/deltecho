/**
 * @fileoverview Base Module class for neural network layers
 *
 * Provides a PyTorch nn.Module-compatible interface for building
 * nested neural networks in TypeScript.
 */
import { createTensor, randn, zeros } from '../tensors/index.js';
/**
 * Create a parameter with specified initialization
 */
export function createParameter(name, shape, init = 'xavier_uniform', requiresGrad = true) {
    let data;
    switch (init) {
        case 'zeros':
            data = zeros(shape);
            break;
        case 'ones':
            data = createTensor(new Array(shape.reduce((a, b) => a * b, 1)).fill(1), shape);
            break;
        case 'uniform':
            data = createTensor(new Array(shape.reduce((a, b) => a * b, 1)).fill(0).map(() => Math.random() * 2 - 1), shape);
            break;
        case 'normal':
            data = randn(shape);
            break;
        case 'xavier_uniform': {
            const fanIn = shape.length > 1 ? shape[shape.length - 2] : shape[0];
            const fanOut = shape[shape.length - 1];
            const bound = Math.sqrt(6 / (fanIn + fanOut));
            data = createTensor(new Array(shape.reduce((a, b) => a * b, 1))
                .fill(0)
                .map(() => Math.random() * 2 * bound - bound), shape);
            break;
        }
        case 'xavier_normal': {
            const fanIn = shape.length > 1 ? shape[shape.length - 2] : shape[0];
            const fanOut = shape[shape.length - 1];
            const std = Math.sqrt(2 / (fanIn + fanOut));
            const normal = randn(shape);
            data = createTensor(Array.from(normal.data).map((x) => x * std), shape);
            break;
        }
        case 'kaiming_uniform': {
            const fanIn = shape.length > 1 ? shape[shape.length - 2] : shape[0];
            const bound = Math.sqrt(6 / fanIn);
            data = createTensor(new Array(shape.reduce((a, b) => a * b, 1))
                .fill(0)
                .map(() => Math.random() * 2 * bound - bound), shape);
            break;
        }
        case 'kaiming_normal': {
            const fanIn = shape.length > 1 ? shape[shape.length - 2] : shape[0];
            const std = Math.sqrt(2 / fanIn);
            const normal = randn(shape);
            data = createTensor(Array.from(normal.data).map((x) => x * std), shape);
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
export class Module {
    /** Module name for debugging */
    _name;
    /** Whether the module is in training mode */
    _training = true;
    /** Registered parameters */
    _parameters = new Map();
    /** Registered submodules */
    _modules = new Map();
    /** Registered buffers (non-trainable tensors) */
    _buffers = new Map();
    constructor(name) {
        this._name = name || this.constructor.name;
    }
    /**
     * Call the module (alias for forward)
     */
    call(...inputs) {
        return this.forward(...inputs);
    }
    /**
     * Register a parameter
     */
    registerParameter(name, param) {
        this._parameters.set(name, param);
    }
    /**
     * Register a submodule
     */
    registerModule(name, module) {
        this._modules.set(name, module);
    }
    /**
     * Register a buffer (non-trainable tensor)
     */
    registerBuffer(name, tensor) {
        this._buffers.set(name, tensor);
    }
    /**
     * Get all parameters (including from submodules)
     */
    parameters() {
        const params = [];
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
    namedParameters(prefix = '') {
        const params = new Map();
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
    modules() {
        const mods = [this];
        for (const module of this._modules.values()) {
            mods.push(...module.modules());
        }
        return mods;
    }
    /**
     * Get named modules
     */
    namedModules(prefix = '') {
        const mods = new Map();
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
    train(mode = true) {
        this._training = mode;
        for (const module of this._modules.values()) {
            module.train(mode);
        }
        return this;
    }
    /**
     * Set evaluation mode
     */
    eval() {
        return this.train(false);
    }
    /**
     * Check if in training mode
     */
    isTraining() {
        return this._training;
    }
    /**
     * Zero all gradients
     */
    zeroGrad() {
        for (const param of this.parameters()) {
            param.grad = undefined;
        }
    }
    /**
     * Get module name
     */
    get name() {
        return this._name;
    }
    /**
     * Count total parameters
     */
    numParameters() {
        let count = 0;
        for (const param of this.parameters()) {
            count += param.data.data.length;
        }
        return count;
    }
    /**
     * String representation
     */
    toString() {
        const lines = [`${this._name}(`];
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
    _list = [];
    constructor(modules) {
        super('ModuleList');
        if (modules) {
            for (let i = 0; i < modules.length; i++) {
                this.append(modules[i]);
            }
        }
    }
    append(module) {
        const idx = this._list.length;
        this._list.push(module);
        this.registerModule(idx.toString(), module);
    }
    get(index) {
        return this._list[index];
    }
    get length() {
        return this._list.length;
    }
    [Symbol.iterator]() {
        return this._list[Symbol.iterator]();
    }
    forward(...inputs) {
        throw new Error('ModuleList does not implement forward()');
    }
}
/**
 * Container for a dictionary of modules
 */
export class ModuleDict extends Module {
    _dict = new Map();
    constructor(modules) {
        super('ModuleDict');
        if (modules) {
            for (const [name, module] of Object.entries(modules)) {
                this.set(name, module);
            }
        }
    }
    set(name, module) {
        this._dict.set(name, module);
        this.registerModule(name, module);
    }
    get(name) {
        return this._dict.get(name);
    }
    has(name) {
        return this._dict.has(name);
    }
    keys() {
        return this._dict.keys();
    }
    values() {
        return this._dict.values();
    }
    entries() {
        return this._dict.entries();
    }
    forward(...inputs) {
        throw new Error('ModuleDict does not implement forward()');
    }
}
/**
 * Sequential container - applies modules in order
 */
export class Sequential extends Module {
    _sequence = [];
    constructor(...modules) {
        super('Sequential');
        for (let i = 0; i < modules.length; i++) {
            this._sequence.push(modules[i]);
            this.registerModule(i.toString(), modules[i]);
        }
    }
    forward(input) {
        let output = input;
        for (const module of this._sequence) {
            const result = module.forward(output);
            output = Array.isArray(result) ? result[0] : result;
        }
        return output;
    }
    append(module) {
        const idx = this._sequence.length;
        this._sequence.push(module);
        this.registerModule(idx.toString(), module);
    }
}
//# sourceMappingURL=Module.js.map