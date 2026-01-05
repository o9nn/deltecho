/**
 * @fileoverview Sys6 30-Step Cognitive Cycle Engine
 *
 * Implements the complete Sys6 Triality cognitive cycle:
 * - 30 irreducible steps derived from LCM(2,3,5) = 30
 * - 3 phases × 5 stages × 2 steps
 * - Double step delay pattern with alternating dyad/triad
 * - 3 concurrent consciousness streams (120° phase separation)
 * - Tetradic thread multiplexing
 * - Global telemetry shell (persistent gestalt)
 */
import {
  ShapedTensor,
  TetradicBundle,
  StreamState,
  StepAddress,
  DoubleStepDelayState,
  PhaseId,
  StageId,
} from '../tensors/index.js';
import { Module } from '../modules/Module.js';
/**
 * Configuration for the Sys6 Cycle Engine
 */
export interface Sys6CycleConfig {
  /** Dimension of the state vectors */
  dim: number;
  /** Hidden dimension for internal processing */
  hiddenDim?: number;
  /** Number of LSTM layers for telemetry */
  telemetryLayers?: number;
  /** Dropout probability */
  dropout?: number;
}
/**
 * Phase names for the 3 phases
 */
export declare const PHASE_NAMES: Record<PhaseId, string>;
/**
 * Stage names within each phase
 */
export declare const STAGE_NAMES: Record<PhaseId, Record<StageId, string>>;
/**
 * Stream phase mapping (each stream is 120° apart)
 */
export declare const STREAM_PHASES: Record<1 | 2 | 3, 'perception' | 'evaluation' | 'action'>;
/**
 * Result of a single cycle step
 */
export interface CycleStepResult {
  /** Step address */
  step: StepAddress;
  /** Double step delay state */
  delayState: DoubleStepDelayState;
  /** Updated state tensor */
  state: ShapedTensor;
  /** Stream states after this step */
  streams: [StreamState, StreamState, StreamState];
  /** Updated tetradic bundle */
  tetradic: TetradicBundle;
  /** Telemetry output */
  telemetry: ShapedTensor;
}
/**
 * Result of a complete 30-step cycle
 */
export interface CycleResult {
  /** Final state */
  finalState: ShapedTensor;
  /** All step results */
  steps: CycleStepResult[];
  /** Final tetradic bundle */
  tetradic: TetradicBundle;
  /** Final telemetry */
  telemetry: ShapedTensor;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}
/**
 * Sys6 30-Step Cognitive Cycle Engine
 *
 * This is the core engine that implements the complete Sys6 Triality
 * cognitive architecture with:
 * - 30 irreducible steps (LCM(2,3,5) = 30)
 * - 3 phases × 5 stages × 2 steps
 * - Double step delay pattern
 * - 3 concurrent consciousness streams
 * - Tetradic thread multiplexing
 * - Global telemetry shell
 */
export declare class Sys6CycleEngine extends Module {
  readonly config: Required<Sys6CycleConfig>;
  private phaseProcessors;
  private stageProcessors;
  private stepProcessors;
  private tetradicConv;
  private dyadTransition;
  private triadTransition;
  private telemetry;
  private telemetryProjection;
  private streamProcessors;
  private integrationLayer;
  constructor(config: Sys6CycleConfig);
  private _makePhaseProcessor;
  private _makeStageProcessor;
  private _makeStreamProcessor;
  /**
   * Initialize the three consciousness streams
   * Each stream has full dimension with 120° phase-shifted weighting
   */
  private _initializeStreams;
  /**
   * Initialize the tetradic bundle from input state
   * Each thread has full dimension with 90° phase-shifted weighting (tetrahedral symmetry)
   */
  private _initializeTetradic;
  /**
   * Execute a single step of the 30-step cycle
   */
  private _executeStep;
  /**
   * Convert state tensor to triadic face
   * Each edge shares poles with adjacent edges, forming a triangular structure
   * Poles are projected to full dimension for convolution compatibility
   */
  private _stateToTriadicFace;
  /**
   * Process the three consciousness streams
   */
  private _processStreams;
  /**
   * Reshape tensor for LSTM input
   */
  private _reshapeForLSTM;
  /**
   * Reshape tensor from LSTM output
   */
  private _reshapeFromLSTM;
  /**
   * Run the complete 30-step cognitive cycle
   */
  forward(inputState: ShapedTensor, numCycles?: number): CycleResult;
  /**
   * Run a single step (for incremental processing)
   */
  step(
    absoluteStep: number,
    currentState: ShapedTensor,
    streams: [StreamState, StreamState, StreamState],
    tetradic: TetradicBundle,
    telemetryHidden?: [ShapedTensor, ShapedTensor],
    dyadState?: ShapedTensor,
    triadState?: ShapedTensor
  ): {
    result: CycleStepResult;
    telemetryHidden: [ShapedTensor, ShapedTensor];
    dyadState: ShapedTensor;
    triadState: ShapedTensor;
  };
  /**
   * Get information about a specific step
   */
  getStepInfo(absoluteStep: number): {
    address: StepAddress;
    delayState: DoubleStepDelayState;
    phaseName: string;
    stageName: string;
    primaryStream: 1 | 2 | 3 | 'integration';
    dyadicPair: [number, number];
    triadicPermutations: {
      mp1: [number, number, number];
      mp2: [number, number, number];
    };
  };
}
//# sourceMappingURL=Sys6CycleEngine.d.ts.map
