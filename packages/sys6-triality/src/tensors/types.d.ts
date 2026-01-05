/**
 * @fileoverview Core tensor types for Sys6 Triality architecture
 *
 * Implements the mathematical foundation based on LCM(2,3,5) = 30
 * with nested tuple structures following OEIS A000081.
 *
 * Key concepts:
 * - Dyadic: Opponent processing (2 poles)
 * - Triadic: Three concurrent streams (120° phase separation)
 * - Tetradic: Four threads forming tetrahedral structure
 * - 30-step cycle: 3 phases × 5 stages × 2 steps
 */
/**
 * Base tensor type - represents a multi-dimensional array of numbers.
 * In a PyTorch implementation, this would be torch.Tensor.
 * Here we use a pure TypeScript representation for portability.
 */
export type Tensor = Float32Array | number[];
/**
 * Tensor with shape information for validation
 */
export interface ShapedTensor {
  data: Tensor;
  shape: readonly number[];
  dtype: 'float32' | 'float64' | 'int32';
}
/**
 * Create a shaped tensor with validation
 */
export declare function createTensor(
  data: number[],
  shape: number[],
  dtype?: 'float32' | 'float64' | 'int32'
): ShapedTensor;
/**
 * Create a zero tensor of given shape
 */
export declare function zeros(
  shape: number[],
  dtype?: 'float32' | 'float64' | 'int32'
): ShapedTensor;
/**
 * Create a ones tensor of given shape
 */
export declare function ones(
  shape: number[],
  dtype?: 'float32' | 'float64' | 'int32'
): ShapedTensor;
/**
 * Create a random tensor of given shape
 */
export declare function randn(
  shape: number[],
  dtype?: 'float32' | 'float64' | 'int32'
): ShapedTensor;
/**
 * Dyadic Edge: Opponent processing between two poles
 * Represents the fundamental binary distinction (Universal/Particular)
 */
export interface DyadicEdge {
  /** Universal pole (pole A) */
  poleA: ShapedTensor;
  /** Particular pole (pole B) */
  poleB: ShapedTensor;
  /** Edge identifier for graph structure */
  edgeId: DyadicEdgeId;
}
/**
 * Dyadic edge identifiers for the 6 edges of a tetrahedron
 */
export type DyadicEdgeId = 'edge_12' | 'edge_13' | 'edge_14' | 'edge_23' | 'edge_24' | 'edge_34';
/**
 * Dyad state in the double step delay pattern
 */
export type DyadState = 'A' | 'B';
/**
 * Create a dyadic edge from two tensors
 */
export declare function createDyadicEdge(
  poleA: ShapedTensor,
  poleB: ShapedTensor,
  edgeId: DyadicEdgeId
): DyadicEdge;
/**
 * Triadic Face: Three dyadic edges forming a triangular face
 * Represents one of the 4 faces of the tetrahedron
 * Contains 3 threads (vertices) connected by 3 edges
 */
export interface TriadicFace {
  /** Edge between thread i and thread j */
  edge_ij: DyadicEdge;
  /** Edge between thread j and thread k */
  edge_jk: DyadicEdge;
  /** Edge between thread k and thread i */
  edge_ki: DyadicEdge;
  /** Face identifier */
  faceId: TriadicFaceId;
  /** The three thread indices that form this face */
  threads: readonly [ThreadId, ThreadId, ThreadId];
}
/**
 * Triadic face identifiers for the 4 faces of a tetrahedron
 */
export type TriadicFaceId = 'face_123' | 'face_124' | 'face_134' | 'face_234';
/**
 * Triad state in the double step delay pattern (1, 2, or 3)
 */
export type TriadState = 1 | 2 | 3;
/**
 * Thread identifier (1-4 for tetradic system)
 */
export type ThreadId = 1 | 2 | 3 | 4;
/**
 * Create a triadic face from three dyadic edges
 */
export declare function createTriadicFace(
  edge_ij: DyadicEdge,
  edge_jk: DyadicEdge,
  edge_ki: DyadicEdge,
  faceId: TriadicFaceId
): TriadicFace;
/**
 * Tetradic Bundle: Four triadic faces sharing six dyadic edges
 * Represents the complete tetrahedral structure with 4 threads (vertices)
 */
export interface TetradicBundle {
  /** Face with threads 1, 2, 3 */
  face_123: TriadicFace;
  /** Face with threads 1, 2, 4 */
  face_124: TriadicFace;
  /** Face with threads 1, 3, 4 */
  face_134: TriadicFace;
  /** Face with threads 2, 3, 4 */
  face_234: TriadicFace;
  /** The six shared edges */
  edges: Record<DyadicEdgeId, DyadicEdge>;
  /** The four thread states */
  threads: Record<ThreadId, ShapedTensor>;
}
/**
 * Create a tetradic bundle from four thread tensors
 */
export declare function createTetradicBundle(
  thread1: ShapedTensor,
  thread2: ShapedTensor,
  thread3: ShapedTensor,
  thread4: ShapedTensor
): TetradicBundle;
/**
 * Phase in the 30-step cycle (3 phases)
 */
export type PhaseId = 1 | 2 | 3;
/**
 * Stage within a phase (5 stages per phase)
 */
export type StageId = 1 | 2 | 3 | 4 | 5;
/**
 * Step within a stage (2 steps per stage - double step delay)
 */
export type StepId = 1 | 2;
/**
 * Complete step address in the 30-step cycle
 */
export interface StepAddress {
  phase: PhaseId;
  stage: StageId;
  step: StepId;
  /** Absolute step number (1-30) */
  absolute: number;
}
/**
 * Convert absolute step (1-30) to step address
 */
export declare function toStepAddress(absolute: number): StepAddress;
/**
 * Convert step address to absolute step (1-30)
 */
export declare function toAbsoluteStep(address: Omit<StepAddress, 'absolute'>): number;
/**
 * Double step delay pattern state
 */
export interface DoubleStepDelayState {
  /** Current state in the 4-step pattern (1, 4, 6, or 1) */
  state: 1 | 4 | 6;
  /** Current dyad (A or B) */
  dyad: DyadState;
  /** Current triad (1, 2, or 3) */
  triad: TriadState;
  /** Pattern step (1-4) */
  patternStep: 1 | 2 | 3 | 4;
}
/**
 * The double step delay pattern lookup table
 * | Step | State | Dyad | Triad |
 * |------|-------|------|-------|
 * | 1    | 1     | A    | 1     |
 * | 2    | 4     | A    | 2     |
 * | 3    | 6     | B    | 2     |
 * | 4    | 1     | B    | 3     |
 */
export declare const DOUBLE_STEP_DELAY_PATTERN: readonly DoubleStepDelayState[];
/**
 * Get the double step delay state for a given absolute step
 */
export declare function getDoubleStepDelayState(absoluteStep: number): DoubleStepDelayState;
/**
 * Stream state for one of the 3 concurrent consciousness streams
 */
export interface StreamState {
  /** Stream identifier (1, 2, or 3) */
  streamId: 1 | 2 | 3;
  /** Current phase for this stream */
  phase: 'perception' | 'evaluation' | 'action';
  /** Current stage within the phase */
  stage: StageId;
  /** Stream's tensor state */
  state: ShapedTensor;
  /** What this stream perceives from other streams */
  perceives: {
    stream1?: ShapedTensor;
    stream2?: ShapedTensor;
    stream3?: ShapedTensor;
  };
  /** Current salience landscape */
  salience: ShapedTensor;
  /** Available affordances */
  affordances: ShapedTensor[];
}
/**
 * Complete Sys6 state at a given step
 */
export interface Sys6State {
  /** Current step address */
  step: StepAddress;
  /** Double step delay pattern state */
  delayState: DoubleStepDelayState;
  /** The three concurrent streams */
  streams: readonly [StreamState, StreamState, StreamState];
  /** Tetradic bundle for thread multiplexing */
  tetradic: TetradicBundle;
  /** Global telemetry (persistent gestalt) */
  telemetry: ShapedTensor;
}
/**
 * OEIS A000081 sequence: number of rooted trees with n nodes
 * Used to define the relationship between nesting levels and terms
 */
export declare const OEIS_A000081: readonly number[];
/**
 * Get the number of terms for a given nesting level
 */
export declare function getTermsForNestingLevel(level: number): number;
/**
 * Nested shell structure
 */
export interface NestedShell<T> {
  /** Nesting level (1-4 typically) */
  level: number;
  /** Number of terms at this level */
  terms: number;
  /** Steps apart from parent shell */
  stepsApart: number;
  /** Content at this shell level */
  content: T | NestedShell<T>[];
}
/**
 * Create a nested shell structure following OEIS A000081
 */
export declare function createNestedShells<T>(
  maxLevel: number,
  contentFactory: (level: number, termIndex: number) => T
): NestedShell<T>;
/**
 * Dyadic pair permutation for thread-level multiplexing
 */
export type DyadicPairPermutation = [ThreadId, ThreadId];
/**
 * Triadic permutation for complementary triads
 */
export type TriadicPermutation = [ThreadId, ThreadId, ThreadId];
/**
 * The 6 dyadic pair permutations
 */
export declare const DYADIC_PERMUTATIONS: readonly DyadicPairPermutation[];
/**
 * The 4 triadic permutations (complementary triads)
 * MP1: P[1,2,3] → P[1,2,4] → P[1,3,4] → P[2,3,4]
 * MP2: P[1,3,4] → P[2,3,4] → P[1,2,3] → P[1,2,4]
 */
export declare const TRIADIC_PERMUTATIONS_MP1: readonly TriadicPermutation[];
export declare const TRIADIC_PERMUTATIONS_MP2: readonly TriadicPermutation[];
/**
 * Get the dyadic pair for a given step in the multiplexing cycle
 */
export declare function getDyadicPairForStep(step: number): DyadicPairPermutation;
/**
 * Get the triadic permutations for a given step
 */
export declare function getTriadicPermutationsForStep(step: number): {
  mp1: TriadicPermutation;
  mp2: TriadicPermutation;
};
/**
 * Stream step groups (triads occurring every 4 steps)
 * {1,5,9}, {2,6,10}, {3,7,11}, {4,8,12} in 12-step cycle
 * Extended to 30-step: each group spans 10 steps
 */
export declare const STREAM_STEP_GROUPS: Readonly<{
  stream1: readonly [1, 5, 9, 13, 17, 21, 25, 29];
  stream2: readonly [2, 6, 10, 14, 18, 22, 26, 30];
  stream3: readonly [3, 7, 11, 15, 19, 23, 27];
}>;
/**
 * Get the primary stream for a given absolute step
 */
export declare function getPrimaryStreamForStep(absoluteStep: number): 1 | 2 | 3 | 'integration';
/**
 * Get what each stream perceives at a given step
 * Stream 1 perceives Stream 2's action
 * Stream 2 perceives Stream 3's simulation
 * Stream 3 reflects on Stream 1's perception
 */
export declare function getStreamPerceptions(absoluteStep: number): {
  stream1Perceives: 'stream2_action';
  stream2Perceives: 'stream3_simulation';
  stream3Perceives: 'stream1_perception';
};
//# sourceMappingURL=types.d.ts.map
