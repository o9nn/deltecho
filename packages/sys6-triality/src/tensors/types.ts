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
export function createTensor(
  data: number[],
  shape: number[],
  dtype: 'float32' | 'float64' | 'int32' = 'float32'
): ShapedTensor {
  const expectedSize = shape.reduce((a, b) => a * b, 1);
  if (data.length !== expectedSize) {
    throw new Error(
      `Data length ${data.length} does not match shape ${shape} (expected ${expectedSize})`
    );
  }
  return {
    data: dtype === 'float32' ? new Float32Array(data) : data,
    shape: Object.freeze(shape),
    dtype,
  };
}

/**
 * Create a zero tensor of given shape
 */
export function zeros(
  shape: number[],
  dtype: 'float32' | 'float64' | 'int32' = 'float32'
): ShapedTensor {
  const size = shape.reduce((a, b) => a * b, 1);
  return createTensor(new Array(size).fill(0), shape, dtype);
}

/**
 * Create a ones tensor of given shape
 */
export function ones(
  shape: number[],
  dtype: 'float32' | 'float64' | 'int32' = 'float32'
): ShapedTensor {
  const size = shape.reduce((a, b) => a * b, 1);
  return createTensor(new Array(size).fill(1), shape, dtype);
}

/**
 * Create a random tensor of given shape
 */
export function randn(
  shape: number[],
  dtype: 'float32' | 'float64' | 'int32' = 'float32'
): ShapedTensor {
  const size = shape.reduce((a, b) => a * b, 1);
  const data = new Array(size).fill(0).map(() => {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  });
  return createTensor(data, shape, dtype);
}

// =============================================================================
// DYADIC STRUCTURES (Order 2)
// =============================================================================

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
export type DyadicEdgeId =
  | 'edge_12' // Thread 1 - Thread 2
  | 'edge_13' // Thread 1 - Thread 3
  | 'edge_14' // Thread 1 - Thread 4
  | 'edge_23' // Thread 2 - Thread 3
  | 'edge_24' // Thread 2 - Thread 4
  | 'edge_34'; // Thread 3 - Thread 4

/**
 * Dyad state in the double step delay pattern
 */
export type DyadState = 'A' | 'B';

/**
 * Create a dyadic edge from two tensors
 */
export function createDyadicEdge(
  poleA: ShapedTensor,
  poleB: ShapedTensor,
  edgeId: DyadicEdgeId
): DyadicEdge {
  // Validate shapes match
  if (poleA.shape.join(',') !== poleB.shape.join(',')) {
    throw new Error(`Pole shapes must match: ${poleA.shape} vs ${poleB.shape}`);
  }
  return { poleA, poleB, edgeId };
}

// =============================================================================
// TRIADIC STRUCTURES (Order 3)
// =============================================================================

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
export type TriadicFaceId =
  | 'face_123' // Threads 1, 2, 3
  | 'face_124' // Threads 1, 2, 4
  | 'face_134' // Threads 1, 3, 4
  | 'face_234'; // Threads 2, 3, 4

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
export function createTriadicFace(
  edge_ij: DyadicEdge,
  edge_jk: DyadicEdge,
  edge_ki: DyadicEdge,
  faceId: TriadicFaceId
): TriadicFace {
  // Determine threads from face ID
  const threadMap: Record<TriadicFaceId, readonly [ThreadId, ThreadId, ThreadId]> = {
    face_123: [1, 2, 3],
    face_124: [1, 2, 4],
    face_134: [1, 3, 4],
    face_234: [2, 3, 4],
  };

  return {
    edge_ij,
    edge_jk,
    edge_ki,
    faceId,
    threads: threadMap[faceId],
  };
}

// =============================================================================
// TETRADIC STRUCTURES (Order 4)
// =============================================================================

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
export function createTetradicBundle(
  thread1: ShapedTensor,
  thread2: ShapedTensor,
  thread3: ShapedTensor,
  thread4: ShapedTensor
): TetradicBundle {
  // Create the 6 dyadic edges
  const edge_12 = createDyadicEdge(thread1, thread2, 'edge_12');
  const edge_13 = createDyadicEdge(thread1, thread3, 'edge_13');
  const edge_14 = createDyadicEdge(thread1, thread4, 'edge_14');
  const edge_23 = createDyadicEdge(thread2, thread3, 'edge_23');
  const edge_24 = createDyadicEdge(thread2, thread4, 'edge_24');
  const edge_34 = createDyadicEdge(thread3, thread4, 'edge_34');

  // Create the 4 triadic faces
  const face_123 = createTriadicFace(edge_12, edge_23, edge_13, 'face_123');
  const face_124 = createTriadicFace(edge_12, edge_24, edge_14, 'face_124');
  const face_134 = createTriadicFace(edge_13, edge_34, edge_14, 'face_134');
  const face_234 = createTriadicFace(edge_23, edge_34, edge_24, 'face_234');

  return {
    face_123,
    face_124,
    face_134,
    face_234,
    edges: {
      edge_12,
      edge_13,
      edge_14,
      edge_23,
      edge_24,
      edge_34,
    },
    threads: {
      1: thread1,
      2: thread2,
      3: thread3,
      4: thread4,
    },
  };
}

// =============================================================================
// SYS6 30-STEP CYCLE STRUCTURES
// =============================================================================

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
export function toStepAddress(absolute: number): StepAddress {
  if (absolute < 1 || absolute > 30) {
    throw new Error(`Absolute step must be 1-30, got ${absolute}`);
  }
  const zeroIndexed = absolute - 1;
  const phase = (Math.floor(zeroIndexed / 10) + 1) as PhaseId;
  const stageIndex = Math.floor((zeroIndexed % 10) / 2);
  const stage = (stageIndex + 1) as StageId;
  const step = ((zeroIndexed % 2) + 1) as StepId;
  return { phase, stage, step, absolute };
}

/**
 * Convert step address to absolute step (1-30)
 */
export function toAbsoluteStep(address: Omit<StepAddress, 'absolute'>): number {
  return (address.phase - 1) * 10 + (address.stage - 1) * 2 + address.step;
}

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
export const DOUBLE_STEP_DELAY_PATTERN: readonly DoubleStepDelayState[] = Object.freeze([
  { state: 1, dyad: 'A', triad: 1, patternStep: 1 },
  { state: 4, dyad: 'A', triad: 2, patternStep: 2 },
  { state: 6, dyad: 'B', triad: 2, patternStep: 3 },
  { state: 1, dyad: 'B', triad: 3, patternStep: 4 },
]);

/**
 * Get the double step delay state for a given absolute step
 */
export function getDoubleStepDelayState(absoluteStep: number): DoubleStepDelayState {
  const patternIndex = (absoluteStep - 1) % 4;
  return DOUBLE_STEP_DELAY_PATTERN[patternIndex];
}

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

// =============================================================================
// NESTED SHELLS (OEIS A000081)
// =============================================================================

/**
 * OEIS A000081 sequence: number of rooted trees with n nodes
 * Used to define the relationship between nesting levels and terms
 */
export const OEIS_A000081 = Object.freeze([1, 1, 2, 4, 9, 20, 48, 115, 286, 719]);

/**
 * Get the number of terms for a given nesting level
 */
export function getTermsForNestingLevel(level: number): number {
  if (level < 1 || level > OEIS_A000081.length) {
    throw new Error(`Nesting level must be 1-${OEIS_A000081.length}, got ${level}`);
  }
  return OEIS_A000081[level - 1];
}

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
export function createNestedShells<T>(
  maxLevel: number,
  contentFactory: (level: number, termIndex: number) => T
): NestedShell<T> {
  function buildShell(level: number, termIndex: number): NestedShell<T> {
    const terms = getTermsForNestingLevel(level);
    const stepsApart = level;

    if (level >= maxLevel) {
      return {
        level,
        terms,
        stepsApart,
        content: contentFactory(level, termIndex),
      };
    }

    const childTerms = getTermsForNestingLevel(level + 1);
    const children: NestedShell<T>[] = [];
    for (let i = 0; i < childTerms; i++) {
      children.push(buildShell(level + 1, i));
    }

    return {
      level,
      terms,
      stepsApart,
      content: children,
    };
  }

  return buildShell(1, 0);
}

// =============================================================================
// THREAD PERMUTATION CYCLING
// =============================================================================

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
export const DYADIC_PERMUTATIONS: readonly DyadicPairPermutation[] = Object.freeze([
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 4],
  [3, 4],
]);

/**
 * The 4 triadic permutations (complementary triads)
 * MP1: P[1,2,3] → P[1,2,4] → P[1,3,4] → P[2,3,4]
 * MP2: P[1,3,4] → P[2,3,4] → P[1,2,3] → P[1,2,4]
 */
export const TRIADIC_PERMUTATIONS_MP1: readonly TriadicPermutation[] = Object.freeze([
  [1, 2, 3],
  [1, 2, 4],
  [1, 3, 4],
  [2, 3, 4],
]);

export const TRIADIC_PERMUTATIONS_MP2: readonly TriadicPermutation[] = Object.freeze([
  [1, 3, 4],
  [2, 3, 4],
  [1, 2, 3],
  [1, 2, 4],
]);

/**
 * Get the dyadic pair for a given step in the multiplexing cycle
 */
export function getDyadicPairForStep(step: number): DyadicPairPermutation {
  return DYADIC_PERMUTATIONS[step % 6];
}

/**
 * Get the triadic permutations for a given step
 */
export function getTriadicPermutationsForStep(step: number): {
  mp1: TriadicPermutation;
  mp2: TriadicPermutation;
} {
  const index = step % 4;
  return {
    mp1: TRIADIC_PERMUTATIONS_MP1[index],
    mp2: TRIADIC_PERMUTATIONS_MP2[index],
  };
}

// =============================================================================
// STREAM INTERLEAVING (120° Phase Separation)
// =============================================================================

/**
 * Stream step groups (triads occurring every 4 steps)
 * {1,5,9}, {2,6,10}, {3,7,11}, {4,8,12} in 12-step cycle
 * Extended to 30-step: each group spans 10 steps
 */
export const STREAM_STEP_GROUPS = Object.freeze({
  stream1: [1, 5, 9, 13, 17, 21, 25, 29] as const, // Steps where stream 1 is primary
  stream2: [2, 6, 10, 14, 18, 22, 26, 30] as const, // Steps where stream 2 is primary
  stream3: [3, 7, 11, 15, 19, 23, 27] as const, // Steps where stream 3 is primary
  // Remaining steps (4, 8, 12, 16, 20, 24, 28) are integration points
});

/**
 * Get the primary stream for a given absolute step
 */
export function getPrimaryStreamForStep(absoluteStep: number): 1 | 2 | 3 | 'integration' {
  const mod4 = absoluteStep % 4;
  switch (mod4) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 0:
      return 'integration';
    default:
      return 'integration';
  }
}

/**
 * Get what each stream perceives at a given step
 * Stream 1 perceives Stream 2's action
 * Stream 2 perceives Stream 3's simulation
 * Stream 3 reflects on Stream 1's perception
 */
export function getStreamPerceptions(absoluteStep: number): {
  stream1Perceives: 'stream2_action';
  stream2Perceives: 'stream3_simulation';
  stream3Perceives: 'stream1_perception';
} {
  return {
    stream1Perceives: 'stream2_action',
    stream2Perceives: 'stream3_simulation',
    stream3Perceives: 'stream1_perception',
  };
}
