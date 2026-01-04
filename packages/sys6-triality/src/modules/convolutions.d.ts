/**
 * @fileoverview Dyadic, Triadic, and Tetradic convolution modules
 *
 * Implements the core convolution operations for Sys6 Triality:
 * - DyadicConvolution: Opponent processing between two poles
 * - TriadicConvolution: Three dyadic edges with shared vertices
 * - TetradicConvolution: Four triadic faces sharing six edges
 */
import { ShapedTensor, DyadicEdge, TriadicFace, TetradicBundle } from '../tensors/index.js';
import { Module } from './Module.js';
/**
 * Dyadic Convolution Module
 *
 * Implements opponent processing between two poles (Universal/Particular).
 * This is the fundamental binary distinction operation.
 *
 * Supports "entanglement of qubits with order 2" where both poles
 * access the same computation simultaneously.
 */
export declare class DyadicConvolution extends Module {
    private poleATransform;
    private poleBTransform;
    private entanglementLayer;
    private outputNorm;
    readonly dim: number;
    constructor(dim: number);
    forward(edge: DyadicEdge): DyadicEdge;
    /**
     * Forward pass returning both the transformed edge and the entangled state
     */
    forwardWithEntanglement(edge: DyadicEdge): {
        edge: DyadicEdge;
        entangled: ShapedTensor;
    };
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
export declare class TriadicConvolution extends Module {
    private edgeConv_ij;
    private edgeConv_jk;
    private edgeConv_ki;
    private integrationLayer;
    readonly dim: number;
    constructor(dim: number);
    forward(face: TriadicFace): {
        face: TriadicFace;
        integrated: ShapedTensor;
    };
    /**
     * Forward pass with full entanglement information
     */
    forwardWithEntanglement(face: TriadicFace): {
        face: TriadicFace;
        integrated: ShapedTensor;
        entanglements: {
            edge_ij: ShapedTensor;
            edge_jk: ShapedTensor;
            edge_ki: ShapedTensor;
        };
    };
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
export declare class TetradicConvolution extends Module {
    private faceConv_123;
    private faceConv_124;
    private faceConv_134;
    private faceConv_234;
    private vertexIntegration;
    readonly dim: number;
    constructor(dim: number);
    forward(bundle: TetradicBundle): {
        bundle: TetradicBundle;
        integrated: ShapedTensor;
    };
    /**
     * Forward pass with full entanglement information from all faces
     */
    forwardWithEntanglement(bundle: TetradicBundle): {
        bundle: TetradicBundle;
        integrated: ShapedTensor;
        faceIntegrations: {
            face_123: ShapedTensor;
            face_124: ShapedTensor;
            face_134: ShapedTensor;
            face_234: ShapedTensor;
        };
    };
}
/**
 * Nested Neural Network Factory
 *
 * Creates arbitrarily nested neural networks following the OEIS A000081
 * sequence for nested shells structure.
 */
export declare class NestedNeuralNetwork extends Module {
    private levels;
    readonly dim: number;
    readonly nestingLevels: number;
    readonly termsPerLevel: number[];
    constructor(dim: number, nestingLevels?: number);
    forward(input: ShapedTensor): ShapedTensor[];
    /**
     * Forward pass returning outputs organized by nesting level
     */
    forwardByLevel(input: ShapedTensor): ShapedTensor[][];
}
//# sourceMappingURL=convolutions.d.ts.map