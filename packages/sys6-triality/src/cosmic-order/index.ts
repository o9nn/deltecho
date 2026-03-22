/**
 * @fileoverview Cosmic Order Module — Campbell's System of the Cosmic Order
 *
 * Implements the hierarchical nesting of Systems 1-6 where:
 *   System N has N centres and a(N+1) terms (OEIS A000081)
 *
 * Exports:
 *   - Type definitions for systems, centres, terms, shells
 *   - Canonical definitions for all 6 system levels
 *   - CosmicOrderComposer runtime engine
 *   - Verification functions for A000081 and triadic recurrence
 */

export * from './types.js';
export * from './definitions.js';
export {
  CosmicOrderComposer,
  createCosmicOrderComposer,
  type CosmicOrderConfig,
} from './composer.js';
export {
  A000055,
  integerPartitions,
  partitionCount,
  buildFlipTransform,
  verifyFlipTransform,
  verifyAllFlipTransforms,
  getClusterForTerm,
  type IntegerPartition,
  type Cluster,
  type FlipTransformRow,
  type FlipTransform,
} from './flip-transform.js';
export {
  sgramDenominator,
  kadOrder,
  divisions,
  nativeBase,
  verifyBaseIdentity,
  kadName,
  repeatingExpansion,
  buildSGram,
  buildAllSGrams,
  verifyAllSGrams,
  denominatorSequence,
  baseSequence,
  getParticularSequence as getSGramSequence,
  triadicDenominatorRelation,
  type RepeatingExpansion,
  type Kad,
  type ComplementaryPair,
  type SelfSimilarity,
  type SGramDefinition,
} from './sgram-sequences.js';
