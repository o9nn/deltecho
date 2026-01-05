/**
 * Performance Benchmarks for Deltecho Cognitive Systems
 * Measures throughput, latency, and resource usage
 */

import { performance } from 'perf_hooks';
import { ActiveInference } from '../deep-tree-echo-core/src/active-inference/ActiveInference.js';
import { RAGMemoryStore } from '../deep-tree-echo-core/src/memory/RAGMemoryStore.js';
import { AtomSpace } from '../packages/reasoning/atomspace/AtomSpace.js';
import { PLNEngine } from '../packages/reasoning/reasoning/PLNEngine.js';

interface BenchmarkResult {
  name: string;
  operations: number;
  duration: number;
  opsPerSecond: number;
  avgLatency: number;
  memoryUsed: number;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Benchmark Active Inference cycle
   */
  async benchmarkActiveInference(iterations: number = 1000): Promise<BenchmarkResult> {
    const ai = new ActiveInference();
    await ai.start();

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await ai.perceive({
        type: 'message',
        content: `Test message ${i}`,
        timestamp: Date.now(),
      });

      const actions = [
        { id: 'respond', label: 'Respond', epistemicValue: 0.8, pragmaticValue: 0.7 },
      ];
      ai.selectAction(actions);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    await ai.stop();

    const duration = endTime - startTime;
    const result: BenchmarkResult = {
      name: 'Active Inference Cycle',
      operations: iterations,
      duration,
      opsPerSecond: (iterations / duration) * 1000,
      avgLatency: duration / iterations,
      memoryUsed: endMemory - startMemory,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark RAG Memory operations
   */
  async benchmarkMemoryOperations(iterations: number = 1000): Promise<BenchmarkResult> {
    const memory = RAGMemoryStore.getInstance();
    await memory.enable();

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // Store memories
    for (let i = 0; i < iterations; i++) {
      await memory.storeMemory({
        text: `Memory content ${i}`,
        sender: 'user',
        chatId: 1,
        messageId: i,
      });
    }

    // Retrieve memories
    for (let i = 0; i < iterations / 10; i++) {
      await memory.getRecentMemoriesAsString(1, 10);
    }

    // Search memories
    for (let i = 0; i < iterations / 10; i++) {
      await memory.searchMemories('content', 1);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    await memory.disable();

    const duration = endTime - startTime;
    const result: BenchmarkResult = {
      name: 'RAG Memory Operations',
      operations: iterations + iterations / 10 + iterations / 10,
      duration,
      opsPerSecond: ((iterations * 1.2) / duration) * 1000,
      avgLatency: duration / (iterations * 1.2),
      memoryUsed: endMemory - startMemory,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark AtomSpace operations
   */
  benchmarkAtomSpace(iterations: number = 10000): BenchmarkResult {
    const atomspace = new AtomSpace();

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // Add nodes
    const nodes = [];
    for (let i = 0; i < iterations; i++) {
      const node = atomspace.addNode('ConceptNode', `concept_${i}`);
      nodes.push(node);
    }

    // Add links
    for (let i = 0; i < iterations / 2; i++) {
      const source = nodes[i];
      const target = nodes[i + 1];
      atomspace.addLink('InheritanceLink', [source.id, target.id]);
    }

    // Query operations
    for (let i = 0; i < iterations / 10; i++) {
      atomspace.getAtomsByType('ConceptNode');
      atomspace.getAtomsByName(`concept_${i}`);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    const duration = endTime - startTime;
    const totalOps = iterations + iterations / 2 + (iterations / 10) * 2;
    const result: BenchmarkResult = {
      name: 'AtomSpace Operations',
      operations: totalOps,
      duration,
      opsPerSecond: (totalOps / duration) * 1000,
      avgLatency: duration / totalOps,
      memoryUsed: endMemory - startMemory,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark PLN inference
   */
  benchmarkPLNInference(iterations: number = 100): BenchmarkResult {
    const atomspace = new AtomSpace();
    const pln = new PLNEngine(atomspace);

    // Setup knowledge base
    const human = atomspace.addNode('ConceptNode', 'Human');
    const mortal = atomspace.addNode('ConceptNode', 'Mortal');
    const socrates = atomspace.addNode('ConceptNode', 'Socrates');

    atomspace.addLink('InheritanceLink', [human.id, mortal.id], {
      strength: 0.95,
      confidence: 0.9,
    });
    atomspace.addLink('InheritanceLink', [socrates.id, human.id], {
      strength: 1.0,
      confidence: 1.0,
    });

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      pln.forwardChain(5);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    const duration = endTime - startTime;
    const result: BenchmarkResult = {
      name: 'PLN Inference',
      operations: iterations,
      duration,
      opsPerSecond: (iterations / duration) * 1000,
      avgLatency: duration / iterations,
      memoryUsed: endMemory - startMemory,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    console.log('🚀 Starting Deltecho Performance Benchmarks\n');

    console.log('1. Benchmarking Active Inference...');
    const aiResult = await this.benchmarkActiveInference(1000);
    this.printResult(aiResult);

    console.log('\n2. Benchmarking RAG Memory Operations...');
    const memResult = await this.benchmarkMemoryOperations(1000);
    this.printResult(memResult);

    console.log('\n3. Benchmarking AtomSpace Operations...');
    const atomResult = this.benchmarkAtomSpace(10000);
    this.printResult(atomResult);

    console.log('\n4. Benchmarking PLN Inference...');
    const plnResult = this.benchmarkPLNInference(100);
    this.printResult(plnResult);

    console.log('\n📊 Summary:');
    this.printSummary();
  }

  /**
   * Print individual result
   */
  private printResult(result: BenchmarkResult): void {
    console.log(`   Name: ${result.name}`);
    console.log(`   Operations: ${result.operations.toLocaleString()}`);
    console.log(`   Duration: ${result.duration.toFixed(2)} ms`);
    console.log(`   Throughput: ${result.opsPerSecond.toFixed(2)} ops/sec`);
    console.log(`   Avg Latency: ${result.avgLatency.toFixed(4)} ms`);
    console.log(`   Memory Used: ${(result.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
  }

  /**
   * Print summary table
   */
  private printSummary(): void {
    console.log('\n┌─────────────────────────────┬──────────────┬─────────────┬──────────────┐');
    console.log('│ Benchmark                   │ Ops/Sec      │ Latency (ms)│ Memory (MB)  │');
    console.log('├─────────────────────────────┼──────────────┼─────────────┼──────────────┤');

    for (const result of this.results) {
      const name = result.name.padEnd(27);
      const opsPerSec = result.opsPerSecond.toFixed(2).padStart(12);
      const latency = result.avgLatency.toFixed(4).padStart(11);
      const memory = (result.memoryUsed / 1024 / 1024).toFixed(2).padStart(12);

      console.log(`│ ${name} │ ${opsPerSec} │ ${latency} │ ${memory} │`);
    }

    console.log('└─────────────────────────────┴──────────────┴─────────────┴──────────────┘');
  }
}

// Run benchmarks if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runAll().catch(console.error);
}

export { PerformanceBenchmark, BenchmarkResult };
