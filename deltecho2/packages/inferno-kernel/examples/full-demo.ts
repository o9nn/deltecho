/**
 * Full Inferno Kernel AGI Demo
 * 
 * Demonstrates the complete AGI operating system with all cognitive components
 * working together: AtomSpace, PLN reasoning, attention allocation, MOSES
 * learning, OpenPsi motivation, and distributed coordination.
 */

import {
  InfernoKernel,
  AtomSpace,
  PatternMatcher,
  PLNEngine,
  AttentionAllocation,
  MOSES,
  OpenPsi,
  DistributedCoordinator,
} from '../src/index'

async function runFullDemo() {
  console.log('\n=== Inferno Kernel AGI Demo ===\n')

  // 1. Boot the AGI kernel
  console.log('1. Booting AGI Kernel...')
  const kernel = new InfernoKernel({
    maxAtoms: 100000,
    maxThreads: 8,
    distributedNodes: [],
    reasoningDepth: 10,
    attentionBudget: 1000,
  })
  await kernel.boot()

  // 2. Create AtomSpace for knowledge representation
  console.log('\n2. Creating AtomSpace and adding knowledge...')
  const atomSpace = new AtomSpace()

  // Add concepts
  const cat = atomSpace.addNode('ConceptNode', 'cat')
  const dog = atomSpace.addNode('ConceptNode', 'dog')
  const animal = atomSpace.addNode('ConceptNode', 'animal')
  const mammal = atomSpace.addNode('ConceptNode', 'mammal')

  // Add relationships
  atomSpace.addLink('InheritanceLink', [cat.id, mammal.id], {
    strength: 0.95,
    confidence: 0.9,
  })
  atomSpace.addLink('InheritanceLink', [dog.id, mammal.id], {
    strength: 0.95,
    confidence: 0.9,
  })
  atomSpace.addLink('InheritanceLink', [mammal.id, animal.id], {
    strength: 1.0,
    confidence: 1.0,
  })
  atomSpace.addLink('SimilarityLink', [cat.id, dog.id], {
    strength: 0.7,
    confidence: 0.8,
  })

  console.log(`AtomSpace contains ${atomSpace.getSize()} atoms`)

  // 3. Pattern Matching
  console.log('\n3. Pattern Matching...')
  const matcher = new PatternMatcher(atomSpace)

  const pattern = {
    type: 'InheritanceLink' as const,
    outgoing: [
      { type: 'ConceptNode' as const, variable: true, name: '$X' },
      { type: 'ConceptNode' as const, name: 'mammal' },
    ],
  }

  const matches = matcher.match(pattern)
  console.log(`Found ${matches.length} mammals:`)
  for (const match of matches) {
    const bound = match.bindings.get('$X')
    console.log(`  - ${bound?.name}`)
  }

  // 4. PLN Reasoning
  console.log('\n4. PLN Reasoning...')
  const plnEngine = new PLNEngine(atomSpace)

  // Forward chaining inference
  const newAtoms = plnEngine.forwardChain(5)
  console.log(`Forward chaining inferred ${newAtoms.length} new facts`)

  // 5. Attention Allocation
  console.log('\n5. Attention Allocation...')
  const attention = new AttentionAllocation(atomSpace)

  // Stimulate important concepts
  attention.stimulate(cat.id, 500)
  attention.stimulate(animal.id, 300)

  // Update attention across the graph
  attention.updateAttention()

  const attStats = attention.getStats()
  console.log('Attention statistics:', {
    focusSize: attStats.focusSize,
    avgSTI: attStats.avgSTI.toFixed(2),
  })

  const focusAtoms = attention.getAttentionalFocus()
  console.log('Atoms in attentional focus:')
  for (const atom of focusAtoms) {
    console.log(`  - ${atom.name || atom.type} (STI: ${atom.attentionValue.sti.toFixed(0)})`)
  }

  // 6. Hebbian Learning
  console.log('\n6. Hebbian Learning...')
  attention.applyHebbianLearning(cat.id, dog.id)
  console.log('Strengthened connection between cat and dog')

  // 7. MOSES Evolutionary Learning
  console.log('\n7. MOSES Evolutionary Learning...')
  const moses = new MOSES(atomSpace, {
    populationSize: 20,
    maxGenerations: 10,
    mutationRate: 0.1,
    crossoverRate: 0.7,
  })

  // Define simple fitness function
  const fitnessFunc = (program: any) => {
    // Simple fitness based on program complexity
    return Math.random() * 0.5 + 0.3
  }

  moses.initializePopulation()
  for (let i = 0; i < 5; i++) {
    moses.evolve(fitnessFunc)
  }

  const mosesStats = moses.getStats()
  console.log('MOSES statistics:', {
    generation: mosesStats.generation,
    avgFitness: mosesStats.avgFitness.toFixed(3),
    bestFitness: mosesStats.bestFitness.toFixed(3),
  })

  // 8. OpenPsi Motivational System
  console.log('\n8. OpenPsi Motivational System...')
  const openPsi = new OpenPsi(atomSpace)

  // Create goals
  openPsi.createGoal('Learn about animals', 0.9)
  openPsi.createGoal('Understand relationships', 0.7)
  openPsi.createGoal('Discover patterns', 0.6)

  // Execute actions
  for (let i = 0; i < 3; i++) {
    openPsi.executeAction()
  }

  const psiState = openPsi.getState()
  console.log('OpenPsi state:')
  console.log(`  Active goals: ${psiState.goals.length}`)
  console.log(`  Drives:`)
  for (const drive of psiState.drives) {
    console.log(`    - ${drive.name}: ${drive.value.toFixed(2)}`)
  }
  if (psiState.dominantEmotion) {
    console.log(`  Dominant emotion: ${psiState.dominantEmotion.name}`)
  }

  // 9. Distributed Coordination
  console.log('\n9. Distributed Coordination...')
  const coordinator = new DistributedCoordinator(atomSpace, {
    nodeId: 'demo-node',
    replicationFactor: 2,
  })

  // Register worker nodes
  coordinator.registerNode({
    nodeId: 'worker-1',
    address: 'localhost',
    port: 8081,
    capabilities: ['reasoning', 'learning'],
    load: 0,
  })

  coordinator.registerNode({
    nodeId: 'worker-2',
    address: 'localhost',
    port: 8082,
    capabilities: ['pattern-matching', 'reasoning'],
    load: 0,
  })

  // Create distributed tasks
  const task1 = coordinator.createTask('reasoning', 'snapshot-1')
  const task2 = coordinator.createTask('learning', 'snapshot-2')

  coordinator.assignTask(task1)
  coordinator.assignTask(task2)

  const coordStats = coordinator.getStats()
  console.log('Distributed coordination:', {
    totalNodes: coordStats.totalNodes,
    totalTasks: coordStats.totalTasks,
    runningTasks: coordStats.runningTasks,
  })

  // 10. Cognitive Processes
  console.log('\n10. Cognitive Processes...')
  const reasoningPid = kernel.createCognitiveProcess('reasoning', 10)
  const learningPid = kernel.createCognitiveProcess('learning', 8)
  const attentionPid = kernel.createCognitiveProcess('attention', 7)

  console.log('Active cognitive processes:')
  for (const proc of kernel.listProcesses()) {
    console.log(`  PID ${proc.pid}: ${proc.type} (priority: ${proc.priority})`)
  }

  // Execute reasoning cycle
  await kernel.executeReasoningCycle()

  // 11. Final Statistics
  console.log('\n11. Final Kernel Statistics...')
  const kernelStats = kernel.getStats()
  console.log('Kernel stats:', {
    uptime: `${(kernelStats.uptime / 1000).toFixed(1)}s`,
    activeProcesses: kernelStats.activeProcesses,
    reasoningCycles: kernelStats.reasoningCycles,
  })

  console.log(`\nAtomSpace final size: ${atomSpace.getSize()} atoms`)

  // 12. Shutdown
  console.log('\n12. Shutting down AGI kernel...')
  await kernel.shutdown()

  console.log('\n=== Demo Complete ===\n')
}

// Run the demo
runFullDemo().catch(console.error)
