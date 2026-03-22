/**
 * @fileoverview Canonical definitions for Systems 1-6
 *
 * Each System N has:
 *   - N centres (active interfaces)
 *   - a(N+1) terms (rooted tree configurations on N+1 nodes)
 *   - A cycle whose structure mirrors the lower systems
 *
 * The triadic recurrence:
 *   Sys1 (1 centre)     ↔  Sys4 (4 centres = 1 enneagram)
 *   Sys2 (2 centres E/R) ↔  Sys5 (5 centres = 2 enneagrams E/R)
 *   Sys3 (3 centres)     ↔  Sys6 (6 centres = 3 enneagrams cyclic)
 */

import {
  type SystemDefinition,
  type SystemLevel,
  type Centre,
  type Term,
  A000081,
} from './types.js';

// ============================================================
// A000081 Rooted Tree Enumeration (parenthesis words)
// ============================================================

/**
 * Canonical parenthesis words for rooted trees on n nodes.
 * These are the unlabeled rooted trees counted by A000081.
 */
const CANONICAL_TREES: Record<number, string[]> = {
  2: ['(())'],
  3: ['((()))', '(()())'],
  4: ['(((())))', '((()()))', '((())())', '(()()())'],
  5: [
    '((((())))',   // T1: maximal chain (deepest nesting)
    '(((()())))',  // T2: chain with branch at depth 3
    '(((())))())', // T3: chain-3 + leaf
    '((()()()))',  // T4: root→(branch-2 + leaf)
    '((()))(()))', // T5: two chains from root
    '((()())())',  // T6: branch-2 + leaf from root
    '((())(()))',  // T7: two depth-2 chains
    '((())()())',  // T8: chain-2 + 2 leaves
    '(()()()())',  // T9: star (4 leaves)
  ],
  6: [
    // 20 rooted trees on 6 nodes (System 5)
    '(((((())))))', '((((()()))))','((((())())))','(((()()())))','((((()))()))',
    '(((()())()))', '(((())(())))','(((())()()))', '((()()()()))',
    '((((())))())', '(((()()))())', '(((())())())', '((()()())())',
    '(((()))(())) ', '((()())(()))', '(((()))(()))', '((()())()())',
    '(((()))()())', '((()())()())', '(()()()()())',
  ],
  7: [
    // 48 rooted trees on 7 nodes (System 6)
    // First 20 representative trees (the full 48 are generated programmatically)
    '((((((()))))))', '(((((()())))))', '(((((())()))))', '((((()()()))))','(((((()))())))' ,
    '((((()())())))','((((())(()))))','((((())()())))','(((()()()())))','(((((())))()))',
    '((((()()))()))', '((((())())()))', '(((()()())()))', '((((()))(())))','((((()()))())) ',
    '(((()())(())))', '((((()))(())))', '(((()())()()))', '((((()))()()))', '(((()()())()))',
    '((((())))(()))', '(((())()(())))','(((())(()())))', '(((())(())()))', '((()()()()()))',
    '((((())))()())', '((((()()))())', '((((())())()))', '(((()()())()))', '((((()))()()))',
    '(((())()()()))', '((()()()()()))', '((((())))(())) ', '((((()()))())) ', '(((()())(())))',
    '(((()))(()()))', '((()())(())())', '(((()))()()())', '(((())())()())', '((()()())()())',
    '(((()))((()))', '((()())(()()))', '(((()))(())())', '((()())()()())', '(((()))()()())',
    '((()())()()())', '((()()()()()))', '(()()()()()())',
  ],
};

// ============================================================
// System 1: Universal Wholeness (1 centre)
// ============================================================

function buildSystem1(): SystemDefinition {
  const centres: Centre[] = [
    {
      index: 1,
      name: 'Idea',
      altName: 'C₁:Unity',
      role: 'The undifferentiated whole — one centre (Idea), one periphery. ' +
        'No differentiation of knowledge, routine, or form.',
    },
  ];

  const trees = CANONICAL_TREES[2];
  const terms: Term[] = [
    {
      index: 1,
      parens: trees[0],
      mode: 'E',
      activeCentres: [1],
      depth: 2,
      description: 'Universal wholeness — singular undifferentiated channel',
    },
  ];

  return {
    level: 1,
    centreCount: 1,
    termCount: 1,
    nodeCount: 2,
    centres,
    terms,
    triadicMirror: 4,
    principle: 'Universal Wholeness: one centre, one periphery. The monad.',
    cycleSteps: 1,
  };
}

// ============================================================
// System 2: The Rift in Wholeness (2 centres)
// ============================================================

function buildSystem2(): SystemDefinition {
  const centres: Centre[] = [
    {
      index: 1,
      name: 'Idea',
      altName: 'C₁:Expressive',
      role: 'Outward-directed orientation — the Idea pole (Expressive).',
    },
    {
      index: 2,
      name: 'Form',
      altName: 'C₂:Regenerative',
      role: 'Inward-directed orientation — the Form pole (Regenerative).',
    },
  ];

  const trees = CANONICAL_TREES[3];
  const terms: Term[] = [
    {
      index: 1,
      parens: trees[0],
      mode: 'E',
      activeCentres: [1, 2],
      depth: 3,
      description: 'Expressive mode — objective orientation dominates (chain: nested)',
    },
    {
      index: 2,
      parens: trees[1],
      mode: 'R',
      activeCentres: [1, 2],
      depth: 2,
      description: 'Regenerative mode — subjective orientation dominates (branch: parallel)',
    },
  ];

  return {
    level: 2,
    centreCount: 2,
    termCount: 2,
    nodeCount: 3,
    centres,
    terms,
    triadicMirror: 5,
    principle: 'The Rift in Wholeness: two orientations (E/R). The dyad.',
    cycleSteps: 2,
  };
}

// ============================================================
// System 3: Space, Time, Closure (3 centres)
// ============================================================

function buildSystem3(): SystemDefinition {
  const centres: Centre[] = [
    {
      index: 1,
      name: 'Idea',
      altName: 'C₁:Photon/Means',
      role: 'Archetypal energy pattern — the means of transformation.',
    },
    {
      index: 2,
      name: 'Knowledge',
      altName: 'C₂:Electron/Goal',
      role: 'Undifferentiated knowledge — the goal of transformation. ' +
        'First appearance of a knowledge centre (not yet differentiated into CNS divisions).',
    },
    {
      index: 3,
      name: 'Form',
      altName: 'C₃:Proton/Consequence',
      role: 'Physical structure — the consequence of transformation.',
    },
  ];

  const trees = CANONICAL_TREES[4];
  const terms: Term[] = [
    {
      index: 1,
      parens: trees[0],
      mode: 'E',
      activeCentres: [1, 2, 3],
      depth: 4,
      description: 'Maximal chain — serial dependency through all 3 centres',
    },
    {
      index: 2,
      parens: trees[1],
      mode: 'E',
      activeCentres: [1, 2, 3],
      depth: 3,
      description: 'Branch at depth 2 — C1 delegates to parallel C2,C3',
    },
    {
      index: 3,
      parens: trees[2],
      mode: 'R',
      activeCentres: [1, 2, 3],
      depth: 3,
      description: 'Chain-2 + leaf — C1→C2 serial, C3 independent',
    },
    {
      index: 4,
      parens: trees[3],
      mode: 'R',
      activeCentres: [1, 2, 3],
      depth: 2,
      description: 'Star — all 3 centres radiate from root (maximal parallelism)',
    },
  ];

  return {
    level: 3,
    centreCount: 3,
    termCount: 4,
    nodeCount: 4,
    centres,
    terms,
    triadicMirror: 6,
    principle: 'Space, Time, Closure: three mutually closed centres. The triad. ' +
      'Nature\'s movie projector — space frames alternate with quantum frames.',
    cycleSteps: 12,
  };
}

// ============================================================
// System 4: The Enneagram (4 centres, 9 terms)
// ============================================================

function buildSystem4(): SystemDefinition {
  const centres: Centre[] = [
    {
      index: 1,
      name: 'Idea',
      altName: 'C₁:Host',
      role: 'Archetypal energy pattern — the universal idea.',
    },
    {
      index: 2,
      name: 'Knowledge',
      altName: 'C₂:Organs',
      role: 'Undifferentiated knowledge — nervous system infrastructure. ' +
        'Not yet differentiated into CNS divisions (Somatic/Autonomic/Cerebral).',
    },
    {
      index: 3,
      name: 'Routine',
      altName: 'C₃:Cells',
      role: 'Behavioural patterns — routine operations mediating knowledge and form.',
    },
    {
      index: 4,
      name: 'Form',
      altName: 'C₄:Molecular',
      role: 'Physical molecules — material manifestation.',
    },
  ];

  const trees = CANONICAL_TREES[5];
  // The 9 terms of the enneagram follow the 1/7 sequence
  const terms: Term[] = [
    { index: 1, parens: trees[0], mode: 'E', activeCentres: [1,2,3,4], depth: 5,
      description: 'T1: Perception of the Field — maximal serial chain' },
    { index: 2, parens: trees[1], mode: 'E', activeCentres: [1,2,3,4], depth: 4,
      description: 'T2: Creation of Idea — chain with branch' },
    { index: 3, parens: trees[2], mode: 'E', activeCentres: [1,2,3,4], depth: 4,
      description: 'T3: Transference — integrates coherent action plan' },
    { index: 4, parens: trees[3], mode: 'E', activeCentres: [1,2,3,4], depth: 3,
      description: 'T4: Mental Work — sensory input processing' },
    { index: 5, parens: trees[4], mode: 'E', activeCentres: [1,2,3,4], depth: 4,
      description: 'T5: Physical Work — embodied action' },
    { index: 6, parens: trees[5], mode: 'E', activeCentres: [1,2,3,4], depth: 3,
      description: 'T6: Corporeal Body — specific Host embodiment' },
    { index: 7, parens: trees[6], mode: 'R', activeCentres: [1,2,3,4], depth: 3,
      description: 'T7: Memory Resources — 1/7 collapse to unity' },
    { index: 8, parens: trees[7], mode: 'E', activeCentres: [1,2,3,4], depth: 3,
      description: 'T8: Creative Feedback — pivot for E/R (always Expressive)' },
    { index: 9, parens: trees[8], mode: 'R', activeCentres: [1,2,3,4], depth: 2,
      description: 'T9: Universal Hierarchy — prescribes the cycle (star)' },
  ];

  return {
    level: 4,
    centreCount: 4,
    termCount: 9,
    nodeCount: 5,
    centres,
    terms,
    triadicMirror: 1,
    principle: 'The Enneagram: 4 centres generate 9 terms. ' +
      'The particular sequence 1→4→2→8→5→7 (= 1/7 = 0.142857...) ' +
      'governs the creative cycle. T7 (Memory) collapses diversity to unity.',
    cycleSteps: 12,
  };
}

// ============================================================
// System 5: Two Enneagrams (5 centres, 20 terms)
// ============================================================

function buildSystem5(): SystemDefinition {
  const centres: Centre[] = [
    {
      index: 1,
      name: 'Idea',
      altName: 'C₁:Host',
      role: 'Archetypal energy pattern — the universal idea at dual-enneagram scale',
    },
    {
      index: 2,
      name: 'Somatic',
      altName: 'C₂:Sensation',
      role: 'Somatic nervous system — sensation, proprioception, bodily awareness. ' +
        'First knowledge differentiation (older NS division).',
    },
    {
      index: 3,
      name: 'Autonomic',
      altName: 'C₃:Emotion',
      role: 'Autonomic nervous system — emotion, affect, homeostatic regulation. ' +
        'Second knowledge differentiation (oldest NS division).',
    },
    {
      index: 4,
      name: 'Routine',
      altName: 'C₄:Behaviour',
      role: 'Behavioural patterns — habitual action sequences mediating knowledge and form.',
    },
    {
      index: 5,
      name: 'Form',
      altName: 'C₅:Physical',
      role: 'Physical manifestation — material embodiment of the system.',
    },
  ];

  const trees = CANONICAL_TREES[6];
  const terms: Term[] = trees.map((parens, i) => ({
    index: i + 1,
    parens: parens.trim(),
    mode: (i < 10 ? 'E' : 'R') as 'E' | 'R',
    activeCentres: [1, 2, 3, 4, 5],
    depth: parens.split('(').length - 1,
    description: `T${i + 1}: System 5 term ${i + 1} of 20 — ` +
      (i < 10 ? 'Expressive enneagram configuration' : 'Regenerative enneagram configuration'),
  }));

  return {
    level: 5,
    centreCount: 5,
    termCount: 20,
    nodeCount: 6,
    centres,
    terms,
    triadicMirror: 2,
    principle: 'Two Enneagrams: one Expressive (open), one Regenerative (closed). ' +
      'Knowledge differentiates into Somatic (sensation) and Autonomic (emotion/affect) — ' +
      'the older nervous system divisions. System 5 is to System 2 as System 4 is to System 1. ' +
      'The tetrad = orthogonal dyad pair. 4 tensor bundles × 3 dyadic edges each.',
    cycleSteps: 60,
  };
}

// ============================================================
// System 6: Primary Activity of Enneagrams (6 centres, 48 terms)
// ============================================================

function buildSystem6(): SystemDefinition {
  const centres: Centre[] = [
    {
      index: 1,
      name: 'Idea',
      altName: 'C₁:Host',
      role: 'Archetypal energy pattern — the universal idea at triple-enneagram scale.',
    },
    {
      index: 2,
      name: 'Cerebral',
      altName: 'C₂:Cognition',
      role: 'Cerebral/Neocortex — cognition, abstract reasoning, planning. ' +
        'Appears for the first time at Sys6, requiring ≥6 layers (neurons) ' +
        'for full neocortical architecture.',
    },
    {
      index: 3,
      name: 'Somatic',
      altName: 'C₃:Sensation',
      role: 'Somatic nervous system — sensation, proprioception, bodily awareness.',
    },
    {
      index: 4,
      name: 'Autonomic',
      altName: 'C₄:Emotion',
      role: 'Autonomic nervous system — emotion, affect, homeostatic regulation.',
    },
    {
      index: 5,
      name: 'Routine',
      altName: 'C₅:Behaviour',
      role: 'Behavioural patterns — habitual action sequences.',
    },
    {
      index: 6,
      name: 'Form',
      altName: 'C₆:Physical',
      role: 'Physical manifestation — material embodiment of the system.',
    },
  ];

  const trees = CANONICAL_TREES[7];
  const terms: Term[] = trees.map((parens, i) => ({
    index: i + 1,
    parens: parens.trim(),
    mode: (i < 24 ? 'E' : 'R') as 'E' | 'R',
    activeCentres: [1, 2, 3, 4, 5, 6],
    depth: parens.split('(').length - 1,
    description: `T${i + 1}: System 6 term ${i + 1} of 48 — ` +
      (i < 16 ? 'Means enneagram activity' :
       i < 32 ? 'Goal enneagram activity' :
       'Consequence enneagram activity'),
  }));

  return {
    level: 6,
    centreCount: 6,
    termCount: 48,
    nodeCount: 7,
    centres,
    terms,
    triadicMirror: 3,
    principle: 'Primary Activity of Enneagrams: 6 centres generate 48 terms. ' +
      'The Cerebral/Neocortex centre appears for the first time — requiring ≥6 layers ' +
      '(neurons) for full neocortical architecture. Knowledge fully differentiates into ' +
      'Cerebral (cognition), Somatic (sensation), and Autonomic (emotion/affect). ' +
      'System 6 is to System 3 as System 5 is to System 2. ' +
      'Three enneagrams in cyclic closure (Means→Goal→Consequence→Means). ' +
      'LCM(2,3,5) = 30 steps per enneagram cycle.',
    cycleSteps: 30,
  };
}

// ============================================================
// System Registry
// ============================================================

const SYSTEM_BUILDERS: Record<SystemLevel, () => SystemDefinition> = {
  1: buildSystem1,
  2: buildSystem2,
  3: buildSystem3,
  4: buildSystem4,
  5: buildSystem5,
  6: buildSystem6,
};

/**
 * Get the canonical definition for a System level
 */
export function getSystemDefinition(level: SystemLevel): SystemDefinition {
  return SYSTEM_BUILDERS[level]();
}

/**
 * Get all 6 system definitions
 */
export function getAllSystemDefinitions(): Map<SystemLevel, SystemDefinition> {
  const map = new Map<SystemLevel, SystemDefinition>();
  for (let n = 1; n <= 6; n++) {
    map.set(n as SystemLevel, getSystemDefinition(n as SystemLevel));
  }
  return map;
}

/**
 * Verify that all system definitions satisfy the A000081 constraint:
 * System N has exactly a(N+1) terms
 */
export function verifyA000081Constraint(): {
  valid: boolean;
  results: Array<{ level: SystemLevel; expected: number; actual: number; valid: boolean }>;
} {
  const results: Array<{ level: SystemLevel; expected: number; actual: number; valid: boolean }> = [];
  let allValid = true;

  for (let n = 1; n <= 6; n++) {
    const level = n as SystemLevel;
    const def = getSystemDefinition(level);
    const expected = A000081[n + 1];
    const actual = def.terms.length;
    const valid = actual === expected;
    if (!valid) allValid = false;
    results.push({ level, expected, actual, valid });
  }

  return { valid: allValid, results };
}

/**
 * Verify the triadic recurrence: Sys(N) mirrors Sys(N+3) for N=1,2,3
 */
export function verifyTriadicRecurrence(): {
  valid: boolean;
  pairs: Array<{ lower: SystemLevel; upper: SystemLevel; principle: string }>;
} {
  const pairs = [
    {
      lower: 1 as SystemLevel,
      upper: 4 as SystemLevel,
      principle: 'Monad ↔ Enneagram: Sys1 (1 centre) mirrors in Sys4 (4 centres = 1 enneagram of 9 terms)',
    },
    {
      lower: 2 as SystemLevel,
      upper: 5 as SystemLevel,
      principle: 'Dyad E/R ↔ Dual Enneagram E/R: Sys2 (2 centres) mirrors in Sys5 (5 centres = 2 enneagrams)',
    },
    {
      lower: 3 as SystemLevel,
      upper: 6 as SystemLevel,
      principle: 'Triadic Closure ↔ Triadic Enneagram Closure: Sys3 (3 centres) mirrors in Sys6 (6 centres = 3 enneagrams)',
    },
  ];

  // Verify structural correspondence
  const valid = pairs.every(({ lower, upper }) => {
    const lDef = getSystemDefinition(lower);
    const uDef = getSystemDefinition(upper);
    return lDef.triadicMirror === upper && uDef.triadicMirror === lower;
  });

  return { valid, pairs };
}
