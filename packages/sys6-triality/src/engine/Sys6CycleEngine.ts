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
  createTensor,
  zeros,
  randn,
  TetradicBundle,
  createTetradicBundle,
  createDyadicEdge,
  createTriadicFace,
  Sys6State,
  StreamState,
  StepAddress,
  DoubleStepDelayState,
  toStepAddress,
  getDoubleStepDelayState,
  getPrimaryStreamForStep,
  getStreamPerceptions,
  getDyadicPairForStep,
  getTriadicPermutationsForStep,
  DyadState,
  TriadState,
  PhaseId,
  StageId,
  StepId,
} from '../tensors/index.js';

import {
  add,
  scale,
  cat,
  gelu,
  layerNorm,
  clone,
} from '../tensors/operations.js';

import {
  Module,
  Sequential,
  ModuleList,
} from '../modules/Module.js';

import {
  Linear,
  LayerNorm,
  GELU,
  GRUCell,
  LSTM,
} from '../modules/layers.js';

import {
  TriadicConvolution,
  TetradicConvolution,
} from '../modules/convolutions.js';

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
export const PHASE_NAMES: Record<PhaseId, string> = {
  1: 'Perception-Orientation',
  2: 'Evaluation-Generation',
  3: 'Action-Integration',
};

/**
 * Stage names within each phase
 */
export const STAGE_NAMES: Record<PhaseId, Record<StageId, string>> = {
  1: {
    1: 'Sensory Intake',
    2: 'Pattern Recognition',
    3: 'Salience Detection',
    4: 'Context Binding',
    5: 'Orientation Commitment',
  },
  2: {
    1: 'Value Assessment',
    2: 'Option Generation',
    3: 'Simulation Projection',
    4: 'Consequence Modeling',
    5: 'Selection Crystallization',
  },
  3: {
    1: 'Response Formulation',
    2: 'Execution Monitoring',
    3: 'Feedback Comparison',
    4: 'Model Updating',
    5: 'Integration Consolidation',
  },
};

/**
 * Stream phase mapping (each stream is 120° apart)
 */
export const STREAM_PHASES: Record<1 | 2 | 3, 'perception' | 'evaluation' | 'action'> = {
  1: 'perception',
  2: 'evaluation',
  3: 'action',
};

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
export class Sys6CycleEngine extends Module {
  readonly config: Required<Sys6CycleConfig>;
  
  // Phase processors (3 phases)
  private phaseProcessors: ModuleList;
  
  // Stage processors (5 stages per phase)
  private stageProcessors: ModuleList[];
  
  // Step processors (2 steps per stage) - triadic convolutions
  private stepProcessors: ModuleList[][];
  
  // Tetradic convolution for thread multiplexing
  private tetradicConv: TetradicConvolution;
  
  // Dyad state transition (A ↔ B)
  private dyadTransition: GRUCell;
  
  // Triad state transition (1 → 2 → 3 → 1)
  private triadTransition: GRUCell;
  
  // Global telemetry shell (persistent gestalt)
  private telemetry: LSTM;
  private telemetryProjection: Linear;
  
  // Stream processors (3 streams)
  private streamProcessors: ModuleList;
  
  // Integration layer
  private integrationLayer: Sequential;
  
  constructor(config: Sys6CycleConfig) {
    super('Sys6CycleEngine');
    
    this.config = {
      dim: config.dim,
      hiddenDim: config.hiddenDim || config.dim * 2,
      telemetryLayers: config.telemetryLayers || 2,
      dropout: config.dropout || 0.1,
    };
    
    const { dim, hiddenDim, telemetryLayers } = this.config;
    
    // Initialize phase processors
    this.phaseProcessors = new ModuleList([
      this._makePhaseProcessor(),
      this._makePhaseProcessor(),
      this._makePhaseProcessor(),
    ]);
    this.registerModule('phase_processors', this.phaseProcessors);
    
    // Initialize stage processors (5 per phase)
    this.stageProcessors = [];
    for (let p = 0; p < 3; p++) {
      const stages = new ModuleList([
        this._makeStageProcessor(),
        this._makeStageProcessor(),
        this._makeStageProcessor(),
        this._makeStageProcessor(),
        this._makeStageProcessor(),
      ]);
      this.stageProcessors.push(stages);
      this.registerModule(`stage_processors_${p}`, stages);
    }
    
    // Initialize step processors (2 per stage, triadic convolutions)
    this.stepProcessors = [];
    for (let p = 0; p < 3; p++) {
      const phaseSteps: ModuleList[] = [];
      for (let s = 0; s < 5; s++) {
        const steps = new ModuleList([
          new TriadicConvolution(dim),
          new TriadicConvolution(dim),
        ]);
        phaseSteps.push(steps);
        this.registerModule(`step_processors_${p}_${s}`, steps);
      }
      this.stepProcessors.push(phaseSteps);
    }
    
    // Tetradic convolution
    this.tetradicConv = new TetradicConvolution(dim);
    this.registerModule('tetradic_conv', this.tetradicConv);
    
    // Dyad transition (A ↔ B)
    this.dyadTransition = new GRUCell(dim, 2);
    this.registerModule('dyad_transition', this.dyadTransition);
    
    // Triad transition (1 → 2 → 3)
    this.triadTransition = new GRUCell(dim, 3);
    this.registerModule('triad_transition', this.triadTransition);
    
    // Global telemetry
    this.telemetry = new LSTM(dim, hiddenDim, telemetryLayers, true);
    this.telemetryProjection = new Linear(hiddenDim, dim);
    this.registerModule('telemetry', this.telemetry);
    this.registerModule('telemetry_proj', this.telemetryProjection);
    
    // Stream processors
    this.streamProcessors = new ModuleList([
      this._makeStreamProcessor(),
      this._makeStreamProcessor(),
      this._makeStreamProcessor(),
    ]);
    this.registerModule('stream_processors', this.streamProcessors);
    
    // Integration layer - input is concatenated streams (3 * dim)
    // Projects back to original dimension
    this.integrationLayer = new Sequential(
      new Linear(dim * 3, hiddenDim),
      new GELU(),
      new LayerNorm(hiddenDim),
      new Linear(hiddenDim, dim),
      new LayerNorm(dim)
    );
    this.registerModule('integration', this.integrationLayer);
  }
  
  private _makePhaseProcessor(): Module {
    return new Sequential(
      new Linear(this.config.dim, this.config.hiddenDim),
      new LayerNorm(this.config.hiddenDim),
      new GELU(),
      new Linear(this.config.hiddenDim, this.config.dim)
    );
  }
  
  private _makeStageProcessor(): Module {
    return new Sequential(
      new Linear(this.config.dim, this.config.dim),
      new LayerNorm(this.config.dim),
      new GELU()
    );
  }
  
  private _makeStreamProcessor(): Module {
    return new Sequential(
      new Linear(this.config.dim, this.config.dim),
      new LayerNorm(this.config.dim),
      new GELU()
    );
  }
  
  /**
   * Initialize the three consciousness streams
   * Each stream has full dimension with 120° phase-shifted weighting
   */
  private _initializeStreams(inputState: ShapedTensor): [StreamState, StreamState, StreamState] {
    const { dim } = this.config;
    const batchSize = inputState.shape[0];
    
    // Each stream gets full dimension with phase-shifted weighting
    // This implements 120° phase separation while maintaining dimensional consistency
    const stream1Data: number[] = [];
    const stream2Data: number[] = [];
    const stream3Data: number[] = [];
    
    for (let b = 0; b < batchSize; b++) {
      for (let i = 0; i < dim; i++) {
        const val = inputState.data[b * dim + i] as number;
        const phase = (i / dim) * 2 * Math.PI;
        
        // Stream 1: 0° phase (perception)
        stream1Data.push(val * (0.5 + 0.5 * Math.cos(phase)));
        
        // Stream 2: 120° phase (evaluation)
        stream2Data.push(val * (0.5 + 0.5 * Math.cos(phase + 2 * Math.PI / 3)));
        
        // Stream 3: 240° phase (action)
        stream3Data.push(val * (0.5 + 0.5 * Math.cos(phase + 4 * Math.PI / 3)));
      }
    }
    
    const stream1State = createTensor(stream1Data, [batchSize, dim], 'float32');
    const stream2State = createTensor(stream2Data, [batchSize, dim], 'float32');
    const stream3State = createTensor(stream3Data, [batchSize, dim], 'float32');
    
    return [
      {
        streamId: 1,
        phase: 'perception',
        stage: 1,
        state: stream1State,
        perceives: {},
        salience: zeros([batchSize, dim]),
        affordances: [],
      },
      {
        streamId: 2,
        phase: 'evaluation',
        stage: 1,
        state: stream2State,
        perceives: {},
        salience: zeros([batchSize, dim]),
        affordances: [],
      },
      {
        streamId: 3,
        phase: 'action',
        stage: 1,
        state: stream3State,
        perceives: {},
        salience: zeros([batchSize, dim]),
        affordances: [],
      },
    ];
  }
  
  /**
   * Initialize the tetradic bundle from input state
   * Each thread has full dimension with 90° phase-shifted weighting (tetrahedral symmetry)
   */
  private _initializeTetradic(inputState: ShapedTensor): TetradicBundle {
    const { dim } = this.config;
    const batchSize = inputState.shape[0];
    
    // Create 4 threads with full dimension and 90° phase separation
    const threads: ShapedTensor[] = [];
    for (let t = 0; t < 4; t++) {
      const threadData: number[] = [];
      const phaseOffset = (t * Math.PI) / 2; // 0°, 90°, 180°, 270°
      
      for (let b = 0; b < batchSize; b++) {
        for (let i = 0; i < dim; i++) {
          const val = inputState.data[b * dim + i] as number;
          const phase = (i / dim) * 2 * Math.PI;
          // Weight by cosine with phase offset
          const weight = 0.5 + 0.5 * Math.cos(phase + phaseOffset);
          threadData.push(val * weight);
        }
      }
      threads.push(createTensor(threadData, [batchSize, dim], 'float32'));
    }
    
    return createTetradicBundle(threads[0], threads[1], threads[2], threads[3]);
  }
  
  /**
   * Execute a single step of the 30-step cycle
   */
  private _executeStep(
    absoluteStep: number,
    currentState: ShapedTensor,
    streams: [StreamState, StreamState, StreamState],
    tetradic: TetradicBundle,
    telemetryHidden: [ShapedTensor, ShapedTensor] | undefined,
    dyadState: ShapedTensor,
    triadState: ShapedTensor
  ): {
    result: CycleStepResult;
    telemetryHidden: [ShapedTensor, ShapedTensor];
    dyadState: ShapedTensor;
    triadState: ShapedTensor;
  } {
    const { dim } = this.config;
    const batchSize = currentState.shape[0];
    
    // Get step address and delay state
    const stepAddress = toStepAddress(absoluteStep);
    const delayState = getDoubleStepDelayState(absoluteStep);
    
    // Get primary stream for this step
    const primaryStream = getPrimaryStreamForStep(absoluteStep);
    
    // Get phase and stage processors
    const phaseIdx = stepAddress.phase - 1;
    const stageIdx = stepAddress.stage - 1;
    const stepIdx = stepAddress.step - 1;
    
    // Apply phase processor
    const phaseProcessor = this.phaseProcessors.get(phaseIdx);
    let state = phaseProcessor.forward(currentState) as ShapedTensor;
    
    // Apply stage processor
    const stageProcessor = this.stageProcessors[phaseIdx].get(stageIdx);
    state = stageProcessor.forward(state) as ShapedTensor;
    
    // Apply step processor (triadic convolution)
    // Create triadic face from current state
    const face = this._stateToTriadicFace(state);
    const stepProcessor = this.stepProcessors[phaseIdx][stageIdx].get(stepIdx) as TriadicConvolution;
    const { face: newFace, integrated } = stepProcessor.forward(face);
    state = integrated;
    
    // Update dyad state (A ↔ B alternation)
    const newDyadState = this.dyadTransition.forward(state, dyadState);
    
    // Update triad state (1 → 2 → 3 cycling)
    const newTriadState = this.triadTransition.forward(state, triadState);
    
    // Process streams
    const newStreams = this._processStreams(streams, state, absoluteStep);
    
    // Update telemetry (global gestalt)
    const telemetryInput = this._reshapeForLSTM(state);
    const [telemetryOut, newTelemetryHidden] = this.telemetry.forward(
      telemetryInput,
      telemetryHidden
    );
    const telemetryRaw = this._reshapeFromLSTM(telemetryOut, batchSize);
    
    // Project telemetry output back to state dimension
    const telemetryOutput = this.telemetryProjection.forward(telemetryRaw);
    
    // Combine local and global
    state = add(state, telemetryOutput);
    
    // Create step result
    const result: CycleStepResult = {
      step: stepAddress,
      delayState,
      state,
      streams: newStreams,
      tetradic,
      telemetry: telemetryOutput,
    };
    
    return {
      result,
      telemetryHidden: newTelemetryHidden,
      dyadState: newDyadState,
      triadState: newTriadState,
    };
  }
  
  /**
   * Convert state tensor to triadic face
   * Each edge shares poles with adjacent edges, forming a triangular structure
   * Poles are projected to full dimension for convolution compatibility
   */
  private _stateToTriadicFace(state: ShapedTensor): import('../tensors/types.js').TriadicFace {
    const { dim } = this.config;
    const batchSize = state.shape[0];
    
    // Each pole needs to be full dimension for the convolutions
    // We split the state into 3 overlapping regions to create the 3 vertices
    // This ensures each vertex has full dimension while maintaining triadic structure
    
    const third = Math.floor(dim / 3);
    
    // Vertex i: first 2/3 of state, padded
    // Vertex j: middle 2/3 of state, padded  
    // Vertex k: last 2/3 of state, padded
    const v_i_data: number[] = [];
    const v_j_data: number[] = [];
    const v_k_data: number[] = [];
    
    for (let b = 0; b < batchSize; b++) {
      // Vertex i: indices 0 to dim (full state, weighted)
      for (let i = 0; i < dim; i++) {
        const val = state.data[b * dim + i] as number;
        // Weight by position: stronger at start
        const weight = 1.0 - (i / dim) * 0.5;
        v_i_data.push(val * weight);
      }
      
      // Vertex j: indices 0 to dim (full state, rotated weighting)
      for (let i = 0; i < dim; i++) {
        const val = state.data[b * dim + i] as number;
        // Weight by position: stronger in middle
        const weight = 1.0 - Math.abs(i - dim/2) / dim;
        v_j_data.push(val * weight);
      }
      
      // Vertex k: indices 0 to dim (full state, inverse weighting)
      for (let i = 0; i < dim; i++) {
        const val = state.data[b * dim + i] as number;
        // Weight by position: stronger at end
        const weight = 0.5 + (i / dim) * 0.5;
        v_k_data.push(val * weight);
      }
    }
    
    // Create full-dimension tensors for each vertex
    const v_i = createTensor(v_i_data, [batchSize, dim], 'float32');
    const v_j = createTensor(v_j_data, [batchSize, dim], 'float32');
    const v_k = createTensor(v_k_data, [batchSize, dim], 'float32');
    
    // Create edges connecting vertices (each edge has 2 poles of full dimension)
    return createTriadicFace(
      createDyadicEdge(v_i, v_j, 'edge_12'),  // edge_ij: vertex i to vertex j
      createDyadicEdge(v_j, v_k, 'edge_23'),  // edge_jk: vertex j to vertex k
      createDyadicEdge(v_k, v_i, 'edge_13'),  // edge_ki: vertex k to vertex i
      'face_123'
    );
  }
  
  /**
   * Process the three consciousness streams
   */
  private _processStreams(
    streams: [StreamState, StreamState, StreamState],
    state: ShapedTensor,
    absoluteStep: number
  ): [StreamState, StreamState, StreamState] {
    const perceptions = getStreamPerceptions(absoluteStep);
    
    // Process each stream
    const newStreams: StreamState[] = [];
    for (let i = 0; i < 3; i++) {
      const stream = streams[i];
      const processor = this.streamProcessors.get(i);
      const newState = processor.forward(stream.state) as ShapedTensor;
      
      // Update stream phase based on step
      const phaseRotation = (absoluteStep + i * 10) % 30;
      let phase: 'perception' | 'evaluation' | 'action';
      if (phaseRotation < 10) phase = 'perception';
      else if (phaseRotation < 20) phase = 'evaluation';
      else phase = 'action';
      
      newStreams.push({
        ...stream,
        state: newState,
        phase,
        stage: ((Math.floor(phaseRotation / 2) % 5) + 1) as StageId,
        perceives: {
          stream1: i !== 0 ? streams[0].state : undefined,
          stream2: i !== 1 ? streams[1].state : undefined,
          stream3: i !== 2 ? streams[2].state : undefined,
        },
      });
    }
    
    return newStreams as [StreamState, StreamState, StreamState];
  }
  
  /**
   * Reshape tensor for LSTM input
   */
  private _reshapeForLSTM(state: ShapedTensor): ShapedTensor {
    const batchSize = state.shape[0];
    const dim = state.shape[1];
    // Add sequence dimension: [batch, dim] -> [batch, 1, dim]
    return createTensor(
      Array.from(state.data),
      [batchSize, 1, dim],
      state.dtype
    );
  }
  
  /**
   * Reshape tensor from LSTM output
   */
  private _reshapeFromLSTM(output: ShapedTensor, batchSize: number): ShapedTensor {
    // Remove sequence dimension: [batch, 1, hidden] -> [batch, hidden]
    const hiddenDim = output.shape[2];
    return createTensor(
      Array.from(output.data),
      [batchSize, hiddenDim],
      output.dtype
    );
  }
  
  /**
   * Run the complete 30-step cognitive cycle
   */
  forward(inputState: ShapedTensor, numCycles: number = 1): CycleResult {
    const startTime = Date.now();
    const { dim } = this.config;
    const batchSize = inputState.shape[0];
    
    // Initialize
    let currentState = inputState;
    let streams = this._initializeStreams(inputState);
    let tetradic = this._initializeTetradic(inputState);
    let telemetryHidden: [ShapedTensor, ShapedTensor] | undefined;
    let dyadState = zeros([batchSize, 2]);
    let triadState = zeros([batchSize, 3]);
    
    // Set initial dyad to A (index 0)
    for (let b = 0; b < batchSize; b++) {
      (dyadState.data as number[])[b * 2] = 1;
      (triadState.data as number[])[b * 3] = 1;
    }
    
    const allSteps: CycleStepResult[] = [];
    
    // Run cycles
    for (let cycle = 0; cycle < numCycles; cycle++) {
      // Run 30 steps
      for (let step = 1; step <= 30; step++) {
        const stepResult = this._executeStep(
          step,
          currentState,
          streams,
          tetradic,
          telemetryHidden,
          dyadState,
          triadState
        );
        
        currentState = stepResult.result.state;
        streams = stepResult.result.streams;
        telemetryHidden = stepResult.telemetryHidden;
        dyadState = stepResult.dyadState;
        triadState = stepResult.triadState;
        
        allSteps.push(stepResult.result);
      }
      
      // Apply tetradic convolution at end of cycle
      const tetraResult = this.tetradicConv.forward(tetradic);
      tetradic = tetraResult.bundle;
      currentState = add(currentState, tetraResult.integrated);
    }
    
    // Final integration of streams
    const streamStates = cat([
      streams[0].state,
      streams[1].state,
      streams[2].state,
    ], -1);
    const finalState = this.integrationLayer.forward(streamStates);
    
    const processingTimeMs = Date.now() - startTime;
    
    return {
      finalState,
      steps: allSteps,
      tetradic,
      telemetry: allSteps[allSteps.length - 1].telemetry,
      processingTimeMs,
    };
  }
  
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
  } {
    const batchSize = currentState.shape[0];
    
    // Initialize states if not provided
    if (!dyadState) {
      dyadState = zeros([batchSize, 2]);
      for (let b = 0; b < batchSize; b++) {
        (dyadState.data as number[])[b * 2] = 1;
      }
    }
    if (!triadState) {
      triadState = zeros([batchSize, 3]);
      for (let b = 0; b < batchSize; b++) {
        (triadState.data as number[])[b * 3] = 1;
      }
    }
    
    return this._executeStep(
      absoluteStep,
      currentState,
      streams,
      tetradic,
      telemetryHidden,
      dyadState,
      triadState
    );
  }
  
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
    triadicPermutations: { mp1: [number, number, number]; mp2: [number, number, number] };
  } {
    const address = toStepAddress(absoluteStep);
    const delayState = getDoubleStepDelayState(absoluteStep);
    const primaryStream = getPrimaryStreamForStep(absoluteStep);
    const dyadicPair = getDyadicPairForStep(absoluteStep);
    const triadicPermutations = getTriadicPermutationsForStep(absoluteStep);
    
    return {
      address,
      delayState,
      phaseName: PHASE_NAMES[address.phase],
      stageName: STAGE_NAMES[address.phase][address.stage],
      primaryStream,
      dyadicPair,
      triadicPermutations,
    };
  }
}
