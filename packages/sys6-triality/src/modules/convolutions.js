/**
 * @fileoverview Dyadic, Triadic, and Tetradic convolution modules
 *
 * Implements the core convolution operations for Sys6 Triality:
 * - DyadicConvolution: Opponent processing between two poles
 * - TriadicConvolution: Three dyadic edges with shared vertices
 * - TetradicConvolution: Four triadic faces sharing six edges
 */
import { createDyadicEdge, createTriadicFace, } from '../tensors/index.js';
import { add, cat, extractThreadsFromFace, extractVerticesFromBundle, } from '../tensors/operations.js';
import { Module, Sequential } from './Module.js';
import { Linear, LayerNorm, GELU, Bilinear } from './layers.js';
/**
 * Dyadic Convolution Module
 *
 * Implements opponent processing between two poles (Universal/Particular).
 * This is the fundamental binary distinction operation.
 *
 * Supports "entanglement of qubits with order 2" where both poles
 * access the same computation simultaneously.
 */
export class DyadicConvolution extends Module {
    poleATransform;
    poleBTransform;
    entanglementLayer;
    outputNorm;
    dim;
    constructor(dim) {
        super('DyadicConvolution');
        this.dim = dim;
        // Pole transformations
        this.poleATransform = new Linear(dim, dim);
        this.poleBTransform = new Linear(dim, dim);
        this.registerModule('pole_a', this.poleATransform);
        this.registerModule('pole_b', this.poleBTransform);
        // Entanglement layer (bilinear interaction)
        this.entanglementLayer = new Bilinear(dim, dim, dim);
        this.registerModule('entangle', this.entanglementLayer);
        // Output normalization
        this.outputNorm = new LayerNorm(dim);
        this.registerModule('norm', this.outputNorm);
    }
    forward(edge) {
        // Transform each pole independently
        const aPrime = this.poleATransform.forward(edge.poleA);
        const bPrime = this.poleBTransform.forward(edge.poleB);
        // Entangled interaction (order 2 entanglement)
        // Both poles access the same computation simultaneously
        const entangled = this.entanglementLayer.forward(aPrime, bPrime);
        // Combine: transformed + entangled
        const aOut = this.outputNorm.forward(add(aPrime, entangled));
        const bOut = this.outputNorm.forward(add(bPrime, entangled));
        return createDyadicEdge(aOut, bOut, edge.edgeId);
    }
    /**
     * Forward pass returning both the transformed edge and the entangled state
     */
    forwardWithEntanglement(edge) {
        const aPrime = this.poleATransform.forward(edge.poleA);
        const bPrime = this.poleBTransform.forward(edge.poleB);
        const entangled = this.entanglementLayer.forward(aPrime, bPrime);
        const aOut = this.outputNorm.forward(add(aPrime, entangled));
        const bOut = this.outputNorm.forward(add(bPrime, entangled));
        return {
            edge: createDyadicEdge(aOut, bOut, edge.edgeId),
            entangled,
        };
    }
}
/**
 * Triadic Convolution Module
 *
 * Processes a triadic fiber bundle: three dyadic edges with shared vertices.
 * Implements 120° phase separation between the three streams.
 *
 * The three threads (vertices) form a complementarity set where:
 * - Thread i = (edge_ij.poleA + edge_ki.poleB) / 2
 * - Thread j = (edge_ij.poleB + edge_jk.poleA) / 2
 * - Thread k = (edge_jk.poleB + edge_ki.poleA) / 2
 */
export class TriadicConvolution extends Module {
    edgeConv_ij;
    edgeConv_jk;
    edgeConv_ki;
    integrationLayer;
    dim;
    constructor(dim) {
        super('TriadicConvolution');
        this.dim = dim;
        // Three dyadic convolutions for each edge
        this.edgeConv_ij = new DyadicConvolution(dim);
        this.edgeConv_jk = new DyadicConvolution(dim);
        this.edgeConv_ki = new DyadicConvolution(dim);
        this.registerModule('conv_ij', this.edgeConv_ij);
        this.registerModule('conv_jk', this.edgeConv_jk);
        this.registerModule('conv_ki', this.edgeConv_ki);
        // Triadic integration: 3 threads → integrated output
        this.integrationLayer = new Sequential(new Linear(dim * 3, dim * 2), new GELU(), new Linear(dim * 2, dim), new LayerNorm(dim));
        this.registerModule('integrate', this.integrationLayer);
    }
    forward(face) {
        // Process each dyadic edge
        const edge_ij = this.edgeConv_ij.forward(face.edge_ij);
        const edge_jk = this.edgeConv_jk.forward(face.edge_jk);
        const edge_ki = this.edgeConv_ki.forward(face.edge_ki);
        // Create new face with transformed edges
        const newFace = createTriadicFace(edge_ij, edge_jk, edge_ki, face.faceId);
        // Extract thread states from the transformed face
        const { thread_i, thread_j, thread_k } = extractThreadsFromFace(newFace);
        // Triadic integration
        const concatenated = cat([thread_i, thread_j, thread_k], -1);
        const integrated = this.integrationLayer.forward(concatenated);
        return { face: newFace, integrated };
    }
    /**
     * Forward pass with full entanglement information
     */
    forwardWithEntanglement(face) {
        // Process each edge with entanglement
        const result_ij = this.edgeConv_ij.forwardWithEntanglement(face.edge_ij);
        const result_jk = this.edgeConv_jk.forwardWithEntanglement(face.edge_jk);
        const result_ki = this.edgeConv_ki.forwardWithEntanglement(face.edge_ki);
        const newFace = createTriadicFace(result_ij.edge, result_jk.edge, result_ki.edge, face.faceId);
        const { thread_i, thread_j, thread_k } = extractThreadsFromFace(newFace);
        const concatenated = cat([thread_i, thread_j, thread_k], -1);
        const integrated = this.integrationLayer.forward(concatenated);
        return {
            face: newFace,
            integrated,
            entanglements: {
                edge_ij: result_ij.entangled,
                edge_jk: result_jk.entangled,
                edge_ki: result_ki.entangled,
            },
        };
    }
}
/**
 * Tetradic Convolution Module
 *
 * Processes a tetradic system: 4 triadic faces sharing 6 dyadic edges.
 * Implements tetrahedral symmetry with mutually orthogonal orientations.
 *
 * The 4 monadic vertices (threads) each appear in exactly 3 faces:
 * - Vertex 1: faces 123, 124, 134
 * - Vertex 2: faces 123, 124, 234
 * - Vertex 3: faces 123, 134, 234
 * - Vertex 4: faces 124, 134, 234
 */
export class TetradicConvolution extends Module {
    faceConv_123;
    faceConv_124;
    faceConv_134;
    faceConv_234;
    vertexIntegration;
    dim;
    constructor(dim) {
        super('TetradicConvolution');
        this.dim = dim;
        // Four triadic convolutions for each face
        this.faceConv_123 = new TriadicConvolution(dim);
        this.faceConv_124 = new TriadicConvolution(dim);
        this.faceConv_134 = new TriadicConvolution(dim);
        this.faceConv_234 = new TriadicConvolution(dim);
        this.registerModule('conv_123', this.faceConv_123);
        this.registerModule('conv_124', this.faceConv_124);
        this.registerModule('conv_134', this.faceConv_134);
        this.registerModule('conv_234', this.faceConv_234);
        // Tetrahedral integration: 4 vertices → integrated output
        this.vertexIntegration = new Sequential(new Linear(dim * 4, dim * 3), new GELU(), new Linear(dim * 3, dim * 2), new GELU(), new Linear(dim * 2, dim), new LayerNorm(dim));
        this.registerModule('integrate', this.vertexIntegration);
    }
    forward(bundle) {
        // Process each triadic face
        const result_123 = this.faceConv_123.forward(bundle.face_123);
        const result_124 = this.faceConv_124.forward(bundle.face_124);
        const result_134 = this.faceConv_134.forward(bundle.face_134);
        const result_234 = this.faceConv_234.forward(bundle.face_234);
        // Create new bundle with transformed faces
        // Note: We need to reconstruct the bundle from the transformed faces
        // The edges are shared, so we use the edges from the transformed faces
        const newBundle = {
            face_123: result_123.face,
            face_124: result_124.face,
            face_134: result_134.face,
            face_234: result_234.face,
            edges: {
                edge_12: result_123.face.edge_ij,
                edge_13: result_123.face.edge_ki,
                edge_14: result_124.face.edge_ki,
                edge_23: result_123.face.edge_jk,
                edge_24: result_124.face.edge_jk,
                edge_34: result_134.face.edge_jk,
            },
            threads: bundle.threads, // Will be updated below
        };
        // Extract vertex states from the transformed bundle
        const { vertex1, vertex2, vertex3, vertex4 } = extractVerticesFromBundle(newBundle);
        // Update thread states in the bundle
        newBundle.threads = {
            1: vertex1,
            2: vertex2,
            3: vertex3,
            4: vertex4,
        };
        // Tetrahedral integration
        const concatenated = cat([vertex1, vertex2, vertex3, vertex4], -1);
        const integrated = this.vertexIntegration.forward(concatenated);
        return { bundle: newBundle, integrated };
    }
    /**
     * Forward pass with full entanglement information from all faces
     */
    forwardWithEntanglement(bundle) {
        const result_123 = this.faceConv_123.forward(bundle.face_123);
        const result_124 = this.faceConv_124.forward(bundle.face_124);
        const result_134 = this.faceConv_134.forward(bundle.face_134);
        const result_234 = this.faceConv_234.forward(bundle.face_234);
        const newBundle = {
            face_123: result_123.face,
            face_124: result_124.face,
            face_134: result_134.face,
            face_234: result_234.face,
            edges: {
                edge_12: result_123.face.edge_ij,
                edge_13: result_123.face.edge_ki,
                edge_14: result_124.face.edge_ki,
                edge_23: result_123.face.edge_jk,
                edge_24: result_124.face.edge_jk,
                edge_34: result_134.face.edge_jk,
            },
            threads: bundle.threads,
        };
        const { vertex1, vertex2, vertex3, vertex4 } = extractVerticesFromBundle(newBundle);
        newBundle.threads = { 1: vertex1, 2: vertex2, 3: vertex3, 4: vertex4 };
        const concatenated = cat([vertex1, vertex2, vertex3, vertex4], -1);
        const integrated = this.vertexIntegration.forward(concatenated);
        return {
            bundle: newBundle,
            integrated,
            faceIntegrations: {
                face_123: result_123.integrated,
                face_124: result_124.integrated,
                face_134: result_134.integrated,
                face_234: result_234.integrated,
            },
        };
    }
}
/**
 * Nested Neural Network Factory
 *
 * Creates arbitrarily nested neural networks following the OEIS A000081
 * sequence for nested shells structure.
 */
export class NestedNeuralNetwork extends Module {
    levels;
    dim;
    nestingLevels;
    termsPerLevel;
    constructor(dim, nestingLevels = 4) {
        super('NestedNeuralNetwork');
        this.dim = dim;
        this.nestingLevels = nestingLevels;
        // OEIS A000081: 1, 1, 2, 4, 9, 20, 48, 115, ...
        // We use: 1, 2, 4, 9 for levels 1-4
        this.termsPerLevel = [1, 2, 4, 9].slice(0, nestingLevels);
        // Create nested structure
        this.levels = [];
        const currentDim = dim;
        for (let level = 0; level < nestingLevels; level++) {
            const terms = this.termsPerLevel[level];
            const levelModules = [];
            for (let t = 0; t < terms; t++) {
                const module = new Sequential(new Linear(currentDim, currentDim), new LayerNorm(currentDim), new GELU());
                levelModules.push(module);
                this.registerModule(`level_${level}_term_${t}`, module);
            }
            this.levels.push(levelModules);
        }
    }
    forward(input) {
        const outputs = [];
        let currentInputs = [input];
        for (let level = 0; level < this.nestingLevels; level++) {
            const levelOutputs = [];
            const terms = this.termsPerLevel[level];
            for (let t = 0; t < terms; t++) {
                // Each term processes the corresponding input (or broadcasts)
                const inputIdx = Math.min(t, currentInputs.length - 1);
                const termInput = currentInputs[inputIdx];
                const termOutput = this.levels[level][t].forward(termInput);
                levelOutputs.push(termOutput);
            }
            currentInputs = levelOutputs;
            outputs.push(...levelOutputs);
        }
        return outputs;
    }
    /**
     * Forward pass returning outputs organized by nesting level
     */
    forwardByLevel(input) {
        const outputsByLevel = [];
        let currentInputs = [input];
        for (let level = 0; level < this.nestingLevels; level++) {
            const levelOutputs = [];
            const terms = this.termsPerLevel[level];
            for (let t = 0; t < terms; t++) {
                const inputIdx = Math.min(t, currentInputs.length - 1);
                const termInput = currentInputs[inputIdx];
                const termOutput = this.levels[level][t].forward(termInput);
                levelOutputs.push(termOutput);
            }
            currentInputs = levelOutputs;
            outputsByLevel.push(levelOutputs);
        }
        return outputsByLevel;
    }
}
//# sourceMappingURL=convolutions.js.map