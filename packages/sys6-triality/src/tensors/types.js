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
 * Create a shaped tensor with validation
 */
export function createTensor(data, shape, dtype = 'float32') {
    const expectedSize = shape.reduce((a, b) => a * b, 1);
    if (data.length !== expectedSize) {
        throw new Error(`Data length ${data.length} does not match shape ${shape} (expected ${expectedSize})`);
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
export function zeros(shape, dtype = 'float32') {
    const size = shape.reduce((a, b) => a * b, 1);
    return createTensor(new Array(size).fill(0), shape, dtype);
}
/**
 * Create a ones tensor of given shape
 */
export function ones(shape, dtype = 'float32') {
    const size = shape.reduce((a, b) => a * b, 1);
    return createTensor(new Array(size).fill(1), shape, dtype);
}
/**
 * Create a random tensor of given shape
 */
export function randn(shape, dtype = 'float32') {
    const size = shape.reduce((a, b) => a * b, 1);
    const data = new Array(size).fill(0).map(() => {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    });
    return createTensor(data, shape, dtype);
}
/**
 * Create a dyadic edge from two tensors
 */
export function createDyadicEdge(poleA, poleB, edgeId) {
    // Validate shapes match
    if (poleA.shape.join(',') !== poleB.shape.join(',')) {
        throw new Error(`Pole shapes must match: ${poleA.shape} vs ${poleB.shape}`);
    }
    return { poleA, poleB, edgeId };
}
/**
 * Create a triadic face from three dyadic edges
 */
export function createTriadicFace(edge_ij, edge_jk, edge_ki, faceId) {
    // Determine threads from face ID
    const threadMap = {
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
/**
 * Create a tetradic bundle from four thread tensors
 */
export function createTetradicBundle(thread1, thread2, thread3, thread4) {
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
/**
 * Convert absolute step (1-30) to step address
 */
export function toStepAddress(absolute) {
    if (absolute < 1 || absolute > 30) {
        throw new Error(`Absolute step must be 1-30, got ${absolute}`);
    }
    const zeroIndexed = absolute - 1;
    const phase = (Math.floor(zeroIndexed / 10) + 1);
    const stageIndex = Math.floor((zeroIndexed % 10) / 2);
    const stage = (stageIndex + 1);
    const step = ((zeroIndexed % 2) + 1);
    return { phase, stage, step, absolute };
}
/**
 * Convert step address to absolute step (1-30)
 */
export function toAbsoluteStep(address) {
    return (address.phase - 1) * 10 + (address.stage - 1) * 2 + address.step;
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
export const DOUBLE_STEP_DELAY_PATTERN = Object.freeze([
    { state: 1, dyad: 'A', triad: 1, patternStep: 1 },
    { state: 4, dyad: 'A', triad: 2, patternStep: 2 },
    { state: 6, dyad: 'B', triad: 2, patternStep: 3 },
    { state: 1, dyad: 'B', triad: 3, patternStep: 4 },
]);
/**
 * Get the double step delay state for a given absolute step
 */
export function getDoubleStepDelayState(absoluteStep) {
    const patternIndex = (absoluteStep - 1) % 4;
    return DOUBLE_STEP_DELAY_PATTERN[patternIndex];
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
export function getTermsForNestingLevel(level) {
    if (level < 1 || level > OEIS_A000081.length) {
        throw new Error(`Nesting level must be 1-${OEIS_A000081.length}, got ${level}`);
    }
    return OEIS_A000081[level - 1];
}
/**
 * Create a nested shell structure following OEIS A000081
 */
export function createNestedShells(maxLevel, contentFactory) {
    function buildShell(level, termIndex) {
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
        const children = [];
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
/**
 * The 6 dyadic pair permutations
 */
export const DYADIC_PERMUTATIONS = Object.freeze([
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
export const TRIADIC_PERMUTATIONS_MP1 = Object.freeze([
    [1, 2, 3],
    [1, 2, 4],
    [1, 3, 4],
    [2, 3, 4],
]);
export const TRIADIC_PERMUTATIONS_MP2 = Object.freeze([
    [1, 3, 4],
    [2, 3, 4],
    [1, 2, 3],
    [1, 2, 4],
]);
/**
 * Get the dyadic pair for a given step in the multiplexing cycle
 */
export function getDyadicPairForStep(step) {
    return DYADIC_PERMUTATIONS[step % 6];
}
/**
 * Get the triadic permutations for a given step
 */
export function getTriadicPermutationsForStep(step) {
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
    stream1: [1, 5, 9, 13, 17, 21, 25, 29], // Steps where stream 1 is primary
    stream2: [2, 6, 10, 14, 18, 22, 26, 30], // Steps where stream 2 is primary
    stream3: [3, 7, 11, 15, 19, 23, 27], // Steps where stream 3 is primary
    // Remaining steps (4, 8, 12, 16, 20, 24, 28) are integration points
});
/**
 * Get the primary stream for a given absolute step
 */
export function getPrimaryStreamForStep(absoluteStep) {
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
export function getStreamPerceptions(absoluteStep) {
    return {
        stream1Perceives: 'stream2_action',
        stream2Perceives: 'stream3_simulation',
        stream3Perceives: 'stream1_perception',
    };
}
//# sourceMappingURL=types.js.map