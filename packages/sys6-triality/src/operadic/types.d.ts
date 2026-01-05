/**
 * @fileoverview Operadic Type System for Sys6 Triality
 *
 * Defines the core objects (wire bundles) and morphisms for the operadic
 * composition of the sys6 cognitive architecture.
 */
import { ShapedTensor } from '../tensors/types.js';
/**
 * Wire Bundle Types (Objects in the Operad)
 */
/**
 * D: Dyadic channel (2-phase clock / polarity)
 * Represents binary opponent processing
 */
export interface DyadicChannel {
  type: 'dyadic';
  phase: 0 | 1;
  poleA: ShapedTensor;
  poleB: ShapedTensor;
}
/**
 * T: Triadic channel (3-phase clock)
 * Represents three-way concurrent streams
 */
export interface TriadicChannel {
  type: 'triadic';
  phase: 0 | 1 | 2;
  stream1: ShapedTensor;
  stream2: ShapedTensor;
  stream3: ShapedTensor;
}
/**
 * P: Pentadic stage selector (5 stages, each 6 steps)
 * Represents macro-level transformation stages
 */
export interface PentadicStage {
  type: 'pentadic';
  stage: 1 | 2 | 3 | 4 | 5;
  stepInStage: 1 | 2 | 3 | 4 | 5 | 6;
  stageState: ShapedTensor;
}
/**
 * C₈: Cubic concurrency state bundle (8 parallel states from 2³)
 * Prime power delegation: 2³ → 8-way parallel processing
 */
export interface CubicConcurrency {
  type: 'cubic';
  states: [
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
  ];
}
/**
 * K₉: Triadic convolution phase bundle (9 orthogonal phases from 3²)
 * Prime power delegation: 3² → 9-way phase-conditioned kernels
 */
export interface TriadicConvolutionBundle {
  type: 'triadic_convolution';
  phases: [
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
    ShapedTensor,
  ];
  currentPhase: [number, number];
}
/**
 * Clock₃₀: Global 30-step clock domain
 * LCM(2,3,5) = 30
 */
export interface Clock30 {
  type: 'clock30';
  absoluteStep: number;
  dyadicPhase: 0 | 1;
  triadicPhase: 0 | 1 | 2;
  pentadicStage: 1 | 2 | 3 | 4 | 5;
}
/**
 * Operadic Generators (Morphisms)
 */
/**
 * Δ₂: Prime-power delegation for dyadic channel
 * D → (D, C₈)
 * Delegates 2³ to cubic concurrency
 */
export type Delta2 = (d: DyadicChannel) => [DyadicChannel, CubicConcurrency];
/**
 * Δ₃: Prime-power delegation for triadic channel
 * T → (T, K₉)
 * Delegates 3² to triadic convolution phases
 */
export type Delta3 = (t: TriadicChannel) => [TriadicChannel, TriadicConvolutionBundle];
/**
 * μ: LCM synchronizer / global clocking
 * (D, T, P) → Clock₃₀
 */
export type Mu = (d: DyadicChannel, t: TriadicChannel, p: PentadicStage) => Clock30;
/**
 * φ: 2×3 → 4 fold via double-step delay
 * Compresses 6-step dyad×triad multiplex into 4 real steps
 */
export interface PhiFoldState {
  step: 1 | 2 | 3 | 4;
  dyad: 'A' | 'B';
  triad: 1 | 2 | 3;
  state: ShapedTensor;
}
export type Phi = (clock: Clock30, dyad: DyadicChannel, triad: TriadicChannel) => PhiFoldState;
/**
 * σ: Stage scheduler
 * Maps 30-step clock into 5 stages × 6 steps
 * Runs φ once per stage with 2 transition/sync steps
 */
export interface SigmaScheduleStep {
  absoluteStep: number;
  stage: 1 | 2 | 3 | 4 | 5;
  stepInStage: 1 | 2 | 3 | 4 | 5 | 6;
  isTransition: boolean;
  phiFold: PhiFoldState | null;
}
export type Sigma = (clock: Clock30) => SigmaScheduleStep;
/**
 * The Complete Sys6 Morphism
 * Sys6 := σ ∘ (φ ∘ μ ∘ (Δ₂ ⊗ Δ₃ ⊗ id_P))
 */
export interface Sys6Morphism {
  delta2: Delta2;
  delta3: Delta3;
  mu: Mu;
  phi: Phi;
  sigma: Sigma;
}
/**
 * Complete Sys6 State at any given step
 */
export interface Sys6OperadicState {
  clock: Clock30;
  dyadic: DyadicChannel;
  triadic: TriadicChannel;
  pentadic: PentadicStage;
  cubic: CubicConcurrency;
  convolution: TriadicConvolutionBundle;
  phiFold: PhiFoldState;
  schedule: SigmaScheduleStep;
}
/**
 * Synchronization Event
 * Occurs at mod-2/mod-3/mod-5 boundaries
 */
export interface SyncEvent {
  step: number;
  type:
    | 'dyadic'
    | 'triadic'
    | 'pentadic'
    | 'dyadic-triadic'
    | 'dyadic-pentadic'
    | 'triadic-pentadic'
    | 'full';
  description: string;
}
/**
 * Wiring Diagram Node
 */
export interface WiringNode {
  id: string;
  type: 'input' | 'generator' | 'output';
  label: string;
  inputs: string[];
  outputs: string[];
}
/**
 * Wiring Diagram
 */
export interface WiringDiagram {
  nodes: Map<string, WiringNode>;
  edges: Array<{
    from: string;
    to: string;
    label: string;
  }>;
}
//# sourceMappingURL=types.d.ts.map
