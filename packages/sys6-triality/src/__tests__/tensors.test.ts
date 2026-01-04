/**
 * @fileoverview Tests for tensor types and operations
 */

import {
  createTensor,
  zeros,
  ones,
  randn,
  createDyadicEdge,
  createTriadicFace,
  createTetradicBundle,
  toStepAddress,
  getDoubleStepDelayState,
  getPrimaryStreamForStep,
  getDyadicPairForStep,
  getTriadicPermutationsForStep,
} from '../tensors/types';

import {
  add,
  sub,
  mul,
  scale,
  matmul,
  dot,
  cat,
  relu,
  gelu,
  sigmoid,
  softmax,
  layerNorm,
  opponentProcess,
  entangle,
  extractThreadsFromFace,
  triadicIntegrate,
  extractVerticesFromBundle,
  tetradicIntegrate,
  reshape,
  transpose,
  sum,
  mean,
} from '../tensors/operations';

describe('Tensor Creation', () => {
  test('createTensor creates tensor with correct shape', () => {
    const tensor = createTensor([1, 2, 3, 4], [2, 2]);
    expect(tensor.shape).toEqual([2, 2]);
    expect(tensor.data.length).toBe(4);
  });

  test('zeros creates all-zero tensor', () => {
    const tensor = zeros([3, 4]);
    expect(tensor.shape).toEqual([3, 4]);
    expect(Array.from(tensor.data).every((x) => x === 0)).toBe(true);
  });

  test('ones creates all-one tensor', () => {
    const tensor = ones([2, 3]);
    expect(tensor.shape).toEqual([2, 3]);
    expect(Array.from(tensor.data).every((x) => x === 1)).toBe(true);
  });

  test('randn creates tensor with random values', () => {
    const tensor = randn([10, 10]);
    expect(tensor.shape).toEqual([10, 10]);
    // Check that values are roughly normally distributed (not all same)
    const values = Array.from(tensor.data);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBeGreaterThan(1);
  });
});

describe('Basic Tensor Operations', () => {
  test('add performs element-wise addition', () => {
    const a = createTensor([1, 2, 3, 4], [2, 2]);
    const b = createTensor([5, 6, 7, 8], [2, 2]);
    const result = add(a, b);
    expect(Array.from(result.data)).toEqual([6, 8, 10, 12]);
  });

  test('sub performs element-wise subtraction', () => {
    const a = createTensor([5, 6, 7, 8], [2, 2]);
    const b = createTensor([1, 2, 3, 4], [2, 2]);
    const result = sub(a, b);
    expect(Array.from(result.data)).toEqual([4, 4, 4, 4]);
  });

  test('mul performs element-wise multiplication', () => {
    const a = createTensor([1, 2, 3, 4], [2, 2]);
    const b = createTensor([2, 2, 2, 2], [2, 2]);
    const result = mul(a, b);
    expect(Array.from(result.data)).toEqual([2, 4, 6, 8]);
  });

  test('scale multiplies by scalar', () => {
    const tensor = createTensor([1, 2, 3, 4], [2, 2]);
    const result = scale(tensor, 3);
    expect(Array.from(result.data)).toEqual([3, 6, 9, 12]);
  });

  test('matmul performs matrix multiplication', () => {
    const a = createTensor([1, 2, 3, 4], [2, 2]);
    const b = createTensor([5, 6, 7, 8], [2, 2]);
    const result = matmul(a, b);
    // [1*5+2*7, 1*6+2*8, 3*5+4*7, 3*6+4*8] = [19, 22, 43, 50]
    expect(Array.from(result.data)).toEqual([19, 22, 43, 50]);
  });

  test('dot computes dot product', () => {
    const a = createTensor([1, 2, 3], [3]);
    const b = createTensor([4, 5, 6], [3]);
    const result = dot(a, b);
    expect(result).toBe(32); // 1*4 + 2*5 + 3*6
  });

  test('cat concatenates tensors', () => {
    const a = createTensor([1, 2], [1, 2]);
    const b = createTensor([3, 4], [1, 2]);
    const result = cat([a, b], 0);
    expect(result.shape).toEqual([2, 2]);
    expect(Array.from(result.data)).toEqual([1, 2, 3, 4]);
  });
});

describe('Activation Functions', () => {
  test('relu applies ReLU activation', () => {
    const tensor = createTensor([-1, 0, 1, 2], [4]);
    const result = relu(tensor);
    expect(Array.from(result.data)).toEqual([0, 0, 1, 2]);
  });

  test('sigmoid applies sigmoid activation', () => {
    const tensor = createTensor([0], [1]);
    const result = sigmoid(tensor);
    expect(result.data[0]).toBeCloseTo(0.5, 5);
  });

  test('softmax normalizes to probability distribution', () => {
    const tensor = createTensor([1, 2, 3], [1, 3]);
    const result = softmax(tensor, -1);
    const values = Array.from(result.data);
    const sum = values.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  test('gelu applies GELU activation', () => {
    const tensor = createTensor([0, 1, -1], [3]);
    const result = gelu(tensor);
    // GELU(0) ≈ 0, GELU(1) ≈ 0.841, GELU(-1) ≈ -0.159
    expect(result.data[0]).toBeCloseTo(0, 2);
    expect(result.data[1]).toBeGreaterThan(0.8);
    expect(result.data[2]).toBeLessThan(0);
  });
});

describe('Tensor Shape Operations', () => {
  test('reshape changes tensor shape', () => {
    const tensor = createTensor([1, 2, 3, 4, 5, 6], [2, 3]);
    const result = reshape(tensor, [3, 2]);
    expect(result.shape).toEqual([3, 2]);
    expect(Array.from(result.data)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('transpose swaps dimensions', () => {
    const tensor = createTensor([1, 2, 3, 4, 5, 6], [2, 3]);
    const result = transpose(tensor, 0, 1);
    expect(result.shape).toEqual([3, 2]);
  });

  test('sum reduces along dimension', () => {
    const tensor = createTensor([1, 2, 3, 4], [2, 2]);
    const result = sum(tensor, 0);
    expect((result as any).shape).toEqual([2]);
    expect(Array.from((result as any).data)).toEqual([4, 6]);
  });

  test('mean computes mean along dimension', () => {
    const tensor = createTensor([1, 2, 3, 4], [2, 2]);
    const result = mean(tensor, 0);
    expect(Array.from((result as any).data)).toEqual([2, 3]);
  });
});

describe('Dyadic Edge Operations', () => {
  test('createDyadicEdge creates valid edge', () => {
    const poleA = createTensor([1, 2, 3], [1, 3]);
    const poleB = createTensor([4, 5, 6], [1, 3]);
    const edge = createDyadicEdge(poleA, poleB, 'edge_12');

    expect(edge.edgeId).toBe('edge_12');
    expect(edge.poleA).toBe(poleA);
    expect(edge.poleB).toBe(poleB);
  });

  test('opponentProcess computes opponent interaction', () => {
    const poleA = createTensor([1, 2, 3], [1, 3]);
    const poleB = createTensor([3, 2, 1], [1, 3]);
    const edge = createDyadicEdge(poleA, poleB, 'edge_12');

    const result = opponentProcess(edge);
    expect(result.shape).toEqual([1, 3]);
  });

  test('entangle creates entangled state', () => {
    const poleA = createTensor([1, 0, 0], [1, 3]);
    const poleB = createTensor([0, 1, 0], [1, 3]);
    const edge = createDyadicEdge(poleA, poleB, 'edge_12');

    const result = entangle(edge);
    expect(result.shape).toEqual([1, 3]);
  });
});

describe('Triadic Face Operations', () => {
  test('createTriadicFace creates valid face', () => {
    const edge_ij = createDyadicEdge(
      createTensor([1, 2], [1, 2]),
      createTensor([3, 4], [1, 2]),
      'edge_12'
    );
    const edge_jk = createDyadicEdge(
      createTensor([3, 4], [1, 2]),
      createTensor([5, 6], [1, 2]),
      'edge_23'
    );
    const edge_ki = createDyadicEdge(
      createTensor([5, 6], [1, 2]),
      createTensor([1, 2], [1, 2]),
      'edge_13'
    );

    const face = createTriadicFace(edge_ij, edge_jk, edge_ki, 'face_123');

    expect(face.faceId).toBe('face_123');
    expect(face.edge_ij).toBe(edge_ij);
    expect(face.edge_jk).toBe(edge_jk);
    expect(face.edge_ki).toBe(edge_ki);
  });

  test('extractThreadsFromFace extracts three threads', () => {
    const edge_ij = createDyadicEdge(
      createTensor([1, 2], [1, 2]),
      createTensor([3, 4], [1, 2]),
      'edge_12'
    );
    const edge_jk = createDyadicEdge(
      createTensor([3, 4], [1, 2]),
      createTensor([5, 6], [1, 2]),
      'edge_23'
    );
    const edge_ki = createDyadicEdge(
      createTensor([5, 6], [1, 2]),
      createTensor([1, 2], [1, 2]),
      'edge_13'
    );

    const face = createTriadicFace(edge_ij, edge_jk, edge_ki, 'face_123');
    const { thread_i, thread_j, thread_k } = extractThreadsFromFace(face);

    expect(thread_i.shape).toEqual([1, 2]);
    expect(thread_j.shape).toEqual([1, 2]);
    expect(thread_k.shape).toEqual([1, 2]);
  });
});

describe('30-Step Cycle Addressing', () => {
  test('toStepAddress converts absolute step to address', () => {
    const addr1 = toStepAddress(1);
    expect(addr1.phase).toBe(1);
    expect(addr1.stage).toBe(1);
    expect(addr1.step).toBe(1);

    const addr15 = toStepAddress(15);
    expect(addr15.phase).toBe(2);
    expect(addr15.stage).toBe(3);
    expect(addr15.step).toBe(1);

    const addr30 = toStepAddress(30);
    expect(addr30.phase).toBe(3);
    expect(addr30.stage).toBe(5);
    expect(addr30.step).toBe(2);
  });

  test('getDoubleStepDelayState returns correct pattern', () => {
    // Pattern: A1 -> A2 -> B2 -> B3 (repeating)
    const state1 = getDoubleStepDelayState(1);
    expect(state1.dyad).toBe('A');
    expect(state1.triad).toBe(1);

    const state2 = getDoubleStepDelayState(2);
    expect(state2.dyad).toBe('A');
    expect(state2.triad).toBe(2);

    const state3 = getDoubleStepDelayState(3);
    expect(state3.dyad).toBe('B');
    expect(state3.triad).toBe(2);

    const state4 = getDoubleStepDelayState(4);
    expect(state4.dyad).toBe('B');
    expect(state4.triad).toBe(3);

    // Should repeat
    const state5 = getDoubleStepDelayState(5);
    expect(state5.dyad).toBe('A');
    expect(state5.triad).toBe(1);
  });

  test('getPrimaryStreamForStep returns correct stream', () => {
    // Streams are 120° apart (10 steps)
    const stream1 = getPrimaryStreamForStep(1);
    const stream11 = getPrimaryStreamForStep(11);
    const stream21 = getPrimaryStreamForStep(21);

    expect(stream1).toBe(1);
    expect(stream11).toBe(2);
    expect(stream21).toBe(3);
  });

  test('getDyadicPairForStep returns valid pair', () => {
    const pair = getDyadicPairForStep(1);
    expect(pair.length).toBe(2);
    expect(pair[0]).toBeGreaterThanOrEqual(1);
    expect(pair[0]).toBeLessThanOrEqual(4);
    expect(pair[1]).toBeGreaterThanOrEqual(1);
    expect(pair[1]).toBeLessThanOrEqual(4);
    expect(pair[0]).not.toBe(pair[1]);
  });

  test('getTriadicPermutationsForStep returns valid permutations', () => {
    const perms = getTriadicPermutationsForStep(1);
    expect(perms.mp1.length).toBe(3);
    expect(perms.mp2.length).toBe(3);

    // All values should be 1-4
    for (const val of perms.mp1) {
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(4);
    }
  });

  test('all 30 steps have unique addresses', () => {
    const addresses = new Set<string>();
    for (let step = 1; step <= 30; step++) {
      const addr = toStepAddress(step);
      const key = `${addr.phase}-${addr.stage}-${addr.step}`;
      expect(addresses.has(key)).toBe(false);
      addresses.add(key);
    }
    expect(addresses.size).toBe(30);
  });
});
