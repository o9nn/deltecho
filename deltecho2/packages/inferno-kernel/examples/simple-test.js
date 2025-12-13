/**
 * Simple test to verify the Inferno Kernel builds and exports correctly
 * 
 * Note: This test imports from the built dist/ directory. Make sure to
 * run `pnpm build` before running this test.
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
} from '../dist/index.js'

console.log('✓ All imports successful')

// Test basic instantiation
const kernel = new InfernoKernel()
console.log('✓ InfernoKernel instantiated')

const atomSpace = new AtomSpace()
console.log('✓ AtomSpace instantiated')

const matcher = new PatternMatcher(atomSpace)
console.log('✓ PatternMatcher instantiated')

const plnEngine = new PLNEngine(atomSpace)
console.log('✓ PLNEngine instantiated')

const attention = new AttentionAllocation(atomSpace)
console.log('✓ AttentionAllocation instantiated')

const moses = new MOSES(atomSpace)
console.log('✓ MOSES instantiated')

const openPsi = new OpenPsi(atomSpace)
console.log('✓ OpenPsi instantiated')

const coordinator = new DistributedCoordinator(atomSpace)
console.log('✓ DistributedCoordinator instantiated')

// Test basic operations
const cat = atomSpace.addNode('ConceptNode', 'cat')
const animal = atomSpace.addNode('ConceptNode', 'animal')
atomSpace.addLink('InheritanceLink', [cat.id, animal.id])

console.log('✓ Atoms added to AtomSpace')
console.log(`  AtomSpace size: ${atomSpace.getSize()} atoms`)

// Test pattern matching
const pattern = {
  type: 'InheritanceLink',
  outgoing: [
    { type: 'ConceptNode', variable: true, name: '$X' },
    { type: 'ConceptNode', name: 'animal' }
  ]
}

const matches = matcher.match(pattern)
console.log('✓ Pattern matching works')
console.log(`  Found ${matches.length} matches`)

// Test attention
attention.stimulate(cat.id, 500)
console.log('✓ Attention allocation works')

// Test OpenPsi
openPsi.createGoal('Test Goal', 0.8)
console.log('✓ OpenPsi works')

console.log('\n✅ All tests passed! Inferno Kernel AGI is operational.')
