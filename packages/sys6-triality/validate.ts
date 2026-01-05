/**
 * @fileoverview Validation script for Sys6 Triality package
 *
 * Run with: npx ts-node --esm validate.ts
 */

import {
  createTensor,
  zeros,
  ones,
  randn,
  createDyadicEdge,
  createTriadicFace,
  toStepAddress,
  getDoubleStepDelayState,
} from './src/tensors/types.js';

import { add, matmul, relu, softmax, opponentProcess } from './src/tensors/operations.js';

import { Sys6CycleEngine } from './src/engine/Sys6CycleEngine.js';
import { Sys6LLMIntegration, MockLLMProvider } from './src/integration/LLMIntegration.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
  try {
    if (fn()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name} - assertion failed`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${name} - ${e}`);
    failed++;
  }
}

async function testAsync(name: string, fn: () => Promise<boolean>): Promise<void> {
  try {
    if (await fn()) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name} - assertion failed`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${name} - ${e}`);
    failed++;
  }
}

console.log('=== Sys6 Triality Validation ===\n');

// Tensor Tests
console.log('--- Tensor Operations ---');

test('createTensor creates correct shape', () => {
  const t = createTensor([1, 2, 3, 4], [2, 2]);
  return t.shape[0] === 2 && t.shape[1] === 2;
});

test('zeros creates all-zero tensor', () => {
  const t = zeros([3, 3]);
  return Array.from(t.data).every((x) => x === 0);
});

test('ones creates all-one tensor', () => {
  const t = ones([2, 2]);
  return Array.from(t.data).every((x) => x === 1);
});

test('randn creates tensor with values', () => {
  const t = randn([10, 10]);
  const values = Array.from(t.data) as number[];
  return new Set(values).size > 1;
});

test('add performs element-wise addition', () => {
  const a = createTensor([1, 2, 3, 4], [2, 2]);
  const b = createTensor([5, 6, 7, 8], [2, 2]);
  const result = add(a, b);
  return Array.from(result.data).every((v, i) => v === [6, 8, 10, 12][i]);
});

test('matmul performs matrix multiplication', () => {
  const a = createTensor([1, 2, 3, 4], [2, 2]);
  const b = createTensor([5, 6, 7, 8], [2, 2]);
  const result = matmul(a, b);
  return result.data[0] === 19 && result.data[3] === 50;
});

test('relu applies ReLU activation', () => {
  const t = createTensor([-1, 0, 1, 2], [4]);
  const result = relu(t);
  return result.data[0] === 0 && result.data[2] === 1;
});

test('softmax normalizes to probability', () => {
  const t = createTensor([1, 2, 3], [1, 3]);
  const result = softmax(t, -1);
  const sum = Array.from(result.data).reduce((a, b) => (a as number) + (b as number), 0) as number;
  return Math.abs(sum - 1) < 0.001;
});

// Dyadic Tests
console.log('\n--- Dyadic Operations ---');

test('createDyadicEdge creates valid edge', () => {
  const poleA = createTensor([1, 2, 3], [1, 3]);
  const poleB = createTensor([4, 5, 6], [1, 3]);
  const edge = createDyadicEdge(poleA, poleB, 'edge_12');
  return edge.edgeId === 'edge_12';
});

test('opponentProcess computes interaction', () => {
  const poleA = createTensor([1, 2, 3], [1, 3]);
  const poleB = createTensor([3, 2, 1], [1, 3]);
  const edge = createDyadicEdge(poleA, poleB, 'edge_12');
  const result = opponentProcess(edge);
  return result.shape[0] === 1 && result.shape[1] === 3;
});

// 30-Step Cycle Tests
console.log('\n--- 30-Step Cycle ---');

test('toStepAddress converts step 1 correctly', () => {
  const addr = toStepAddress(1);
  return addr.phase === 1 && addr.stage === 1 && addr.step === 1;
});

test('toStepAddress converts step 30 correctly', () => {
  const addr = toStepAddress(30);
  return addr.phase === 3 && addr.stage === 5 && addr.step === 2;
});

test('getDoubleStepDelayState follows A1->A2->B2->B3 pattern', () => {
  const s1 = getDoubleStepDelayState(1);
  const s2 = getDoubleStepDelayState(2);
  const s3 = getDoubleStepDelayState(3);
  const s4 = getDoubleStepDelayState(4);
  return (
    s1.dyad === 'A' &&
    s1.triad === 1 &&
    s2.dyad === 'A' &&
    s2.triad === 2 &&
    s3.dyad === 'B' &&
    s3.triad === 2 &&
    s4.dyad === 'B' &&
    s4.triad === 3
  );
});

test('all 30 steps have unique addresses', () => {
  const addresses = new Set<string>();
  for (let step = 1; step <= 30; step++) {
    const addr = toStepAddress(step);
    addresses.add(`${addr.phase}-${addr.stage}-${addr.step}`);
  }
  return addresses.size === 30;
});

// Engine Tests
console.log('\n--- Sys6CycleEngine ---');

test('engine creates with correct config', () => {
  const engine = new Sys6CycleEngine({ dim: 64 });
  return engine.config.dim === 64;
});

test('engine forward produces 30 steps', () => {
  const engine = new Sys6CycleEngine({ dim: 32 });
  const input = randn([1, 32]);
  const result = engine.forward(input, 1);
  return result.steps.length === 30;
});

test('engine forward produces correct output shape', () => {
  const engine = new Sys6CycleEngine({ dim: 32 });
  const input = randn([1, 32]);
  const result = engine.forward(input, 1);
  return result.finalState.shape[0] === 1 && result.finalState.shape[1] === 32;
});

test('engine handles batch input', () => {
  const engine = new Sys6CycleEngine({ dim: 32 });
  const input = randn([4, 32]);
  const result = engine.forward(input, 1);
  return result.finalState.shape[0] === 4;
});

// Integration Tests
console.log('\n--- LLM Integration ---');

await testAsync('MockLLMProvider embed returns array', async () => {
  const provider = new MockLLMProvider();
  const embedding = await provider.embed('test');
  return Array.isArray(embedding) && embedding.length === 256;
});

await testAsync('MockLLMProvider complete returns response', async () => {
  const provider = new MockLLMProvider();
  const response = await provider.complete('test');
  return response.includes('[Mock Response]');
});

await testAsync('Sys6LLMIntegration process returns result', async () => {
  const integration = new Sys6LLMIntegration({
    dim: 32,
    provider: new MockLLMProvider(),
  });
  const result = await integration.process('test input', 'cognitive');
  return result.response !== undefined && result.cycleResult.steps.length === 30;
});

await testAsync('Sys6LLMIntegration processTriadic returns all perspectives', async () => {
  const integration = new Sys6LLMIntegration({
    dim: 32,
    provider: new MockLLMProvider(),
  });
  const result = await integration.processTriadic('test');
  return (
    result.cognitive !== undefined &&
    result.affective !== undefined &&
    result.relevance !== undefined &&
    result.integrated !== undefined
  );
});

// Summary
console.log('\n=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
