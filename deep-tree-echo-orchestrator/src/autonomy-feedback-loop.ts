/**
 * AutonomyFeedbackLoop
 *
 * Closes the autonomy loop by connecting the EchoAgentLoop's action
 * outcomes back to the OnlineReservoirLearner. This is the critical
 * component that enables DTE to learn from its own actions in real-time.
 *
 * Architecture (AAR feedback cycle):
 *   1. Agent acts (EchoAgentLoop produces action + outcome)
 *   2. Outcome → reward signal (success/failure/partial)
 *   3. Reward + reservoir state → OnlineReservoirLearner.update()
 *   4. Updated readout weights → CoreSelfEngine uses improved predictions
 *   5. IdentityMesh records the learning event → ontogenetic progression
 *
 * The feedback loop also generates training data for the NanEcho model
 * via the ConversationTrainingGenerator, enabling offline fine-tuning
 * of the core language model from accumulated interaction history.
 */
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/AutonomyFeedbackLoop');

// ─── Types ─────────────────────────────────────────────────────

export interface FeedbackSignal {
  /** Unique ID of the action that produced this feedback */
  actionId: string;
  /** The reservoir state at the time of the action */
  reservoirState: number[];
  /** Target output (what the ideal response would have been) */
  targetOutput: number[];
  /** Reward signal: 1.0 = perfect, 0.0 = failure, 0.5 = neutral */
  reward: number;
  /** Source of the feedback (user, self-eval, environment) */
  source: 'user' | 'self-evaluation' | 'environment' | 'coherence-check';
  /** Timestamp */
  timestamp: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface FeedbackLoopConfig {
  /** Minimum reward delta to trigger learning (avoids noise) */
  minRewardDelta: number;
  /** Maximum feedback signals to buffer before batch update */
  batchSize: number;
  /** Interval (ms) between batch updates */
  batchInterval: number;
  /** Enable conversation training data generation */
  enableTrainingDataGeneration: boolean;
  /** Training data output directory */
  trainingDataDir: string;
  /** Enable coherence self-evaluation */
  enableCoherenceCheck: boolean;
  /** Coherence check interval (ms) */
  coherenceCheckInterval: number;
  /** Minimum coherence threshold (triggers dead man's switch if below) */
  minCoherenceThreshold: number;
}

const DEFAULT_CONFIG: FeedbackLoopConfig = {
  minRewardDelta: 0.05,
  batchSize: 16,
  batchInterval: 30000, // 30 seconds
  enableTrainingDataGeneration: true,
  trainingDataDir: '/tmp/deep-tree-echo/training',
  enableCoherenceCheck: true,
  coherenceCheckInterval: 60000, // 1 minute
  minCoherenceThreshold: 0.3,
};

export interface FeedbackLoopStats {
  totalFeedbackReceived: number;
  totalLearningUpdates: number;
  totalTrainingExamplesGenerated: number;
  averageReward: number;
  coherenceScore: number;
  lastUpdateTimestamp: number;
}

export type FeedbackLoopEvent =
  | { type: 'feedback_received'; signal: FeedbackSignal }
  | { type: 'learning_update'; batchSize: number; avgReward: number }
  | { type: 'training_data_generated'; count: number; path: string }
  | { type: 'coherence_check'; score: number; threshold: number }
  | { type: 'coherence_alert'; score: number; message: string }
  | { type: 'error'; error: string };

// ─── Feedback Loop Implementation ──────────────────────────────

export class AutonomyFeedbackLoop extends EventEmitter {
  private config: FeedbackLoopConfig;
  private feedbackBuffer: FeedbackSignal[] = [];
  private stats: FeedbackLoopStats;
  private running = false;
  private batchTimer?: ReturnType<typeof setInterval>;
  private coherenceTimer?: ReturnType<typeof setInterval>;

  // External components (injected)
  private onlineLearner?: {
    update(reservoirState: number[], targetOutput: number[]): void;
    getWeights(): number[][];
    getStats(): { totalUpdates: number; avgError: number };
  };
  private identityMesh?: {
    recordExperience(xp: number, source: string): void;
    getCoherenceScore(): number;
  };
  private trainingGenerator?: {
    generateFromFeedback(signals: FeedbackSignal[]): Promise<number>;
  };

  constructor(config: Partial<FeedbackLoopConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalFeedbackReceived: 0,
      totalLearningUpdates: 0,
      totalTrainingExamplesGenerated: 0,
      averageReward: 0.5,
      coherenceScore: 1.0,
      lastUpdateTimestamp: 0,
    };
  }

  /**
   * Wire external components into the feedback loop.
   */
  setOnlineLearner(learner: typeof this.onlineLearner): void {
    this.onlineLearner = learner;
    log.info('Online reservoir learner connected to feedback loop');
  }

  setIdentityMesh(mesh: typeof this.identityMesh): void {
    this.identityMesh = mesh;
    log.info('Identity mesh connected to feedback loop');
  }

  setTrainingGenerator(generator: typeof this.trainingGenerator): void {
    this.trainingGenerator = generator;
    log.info('Training data generator connected to feedback loop');
  }

  /**
   * Start the feedback loop.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Start batch update timer
    this.batchTimer = setInterval(() => {
      this.processBatch().catch(err => {
        log.error('Batch processing error:', err);
        this.emit('event', { type: 'error', error: String(err) } as FeedbackLoopEvent);
      });
    }, this.config.batchInterval);

    // Start coherence check timer
    if (this.config.enableCoherenceCheck) {
      this.coherenceTimer = setInterval(() => {
        this.checkCoherence();
      }, this.config.coherenceCheckInterval);
    }

    log.info('Autonomy feedback loop started', {
      batchSize: this.config.batchSize,
      batchInterval: this.config.batchInterval,
      coherenceCheck: this.config.enableCoherenceCheck,
    });
  }

  /**
   * Stop the feedback loop.
   */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }
    if (this.coherenceTimer) {
      clearInterval(this.coherenceTimer);
      this.coherenceTimer = undefined;
    }

    // Process remaining buffer
    if (this.feedbackBuffer.length > 0) {
      await this.processBatch();
    }

    log.info('Autonomy feedback loop stopped', { stats: this.stats });
  }

  /**
   * Submit a feedback signal from an action outcome.
   */
  submitFeedback(signal: FeedbackSignal): void {
    this.feedbackBuffer.push(signal);
    this.stats.totalFeedbackReceived++;

    // Update running average reward
    const n = this.stats.totalFeedbackReceived;
    this.stats.averageReward = this.stats.averageReward * ((n - 1) / n) + signal.reward / n;

    this.emit('event', { type: 'feedback_received', signal } as FeedbackLoopEvent);

    // Process immediately if buffer is full
    if (this.feedbackBuffer.length >= this.config.batchSize) {
      this.processBatch().catch(err => {
        log.error('Immediate batch processing error:', err);
      });
    }
  }

  /**
   * Generate a feedback signal from a user response to DTE's output.
   */
  generateUserFeedback(
    actionId: string,
    reservoirState: number[],
    dteOutput: number[],
    userSatisfaction: number, // 0-1 scale
  ): FeedbackSignal {
    return {
      actionId,
      reservoirState,
      targetOutput: dteOutput, // Use DTE's own output as target when user is satisfied
      reward: userSatisfaction,
      source: 'user',
      timestamp: Date.now(),
    };
  }

  /**
   * Generate a self-evaluation feedback signal.
   * DTE evaluates its own output coherence.
   */
  generateSelfEvalFeedback(
    actionId: string,
    reservoirState: number[],
    output: number[],
    coherenceScore: number,
  ): FeedbackSignal {
    return {
      actionId,
      reservoirState,
      targetOutput: output,
      reward: coherenceScore,
      source: 'self-evaluation',
      timestamp: Date.now(),
    };
  }

  /**
   * Process the feedback buffer: update online learner and generate training data.
   */
  private async processBatch(): Promise<void> {
    if (this.feedbackBuffer.length === 0) return;

    const batch = this.feedbackBuffer.splice(0, this.config.batchSize);
    const avgReward = batch.reduce((sum, s) => sum + s.reward, 0) / batch.length;

    // Step 1: Update online reservoir learner
    if (this.onlineLearner) {
      for (const signal of batch) {
        if (Math.abs(signal.reward - 0.5) >= this.config.minRewardDelta) {
          // Weight the target by reward: high reward = reinforce, low = suppress
          const weightedTarget = signal.targetOutput.map(v => v * signal.reward);
          this.onlineLearner.update(signal.reservoirState, weightedTarget);
        }
      }
      this.stats.totalLearningUpdates++;
      log.info(`Batch learning update: ${batch.length} signals, avg reward=${avgReward.toFixed(3)}`);
    }

    // Step 2: Record experience in identity mesh
    if (this.identityMesh) {
      const xp = Math.round(batch.length * avgReward * 10);
      this.identityMesh.recordExperience(xp, 'feedback-loop');
    }

    // Step 3: Generate training data for NanEcho
    if (this.config.enableTrainingDataGeneration && this.trainingGenerator) {
      try {
        const count = await this.trainingGenerator.generateFromFeedback(batch);
        this.stats.totalTrainingExamplesGenerated += count;
        this.emit('event', {
          type: 'training_data_generated',
          count,
          path: this.config.trainingDataDir,
        } as FeedbackLoopEvent);
      } catch (err) {
        log.error('Training data generation error:', err);
      }
    }

    this.stats.lastUpdateTimestamp = Date.now();
    this.emit('event', {
      type: 'learning_update',
      batchSize: batch.length,
      avgReward,
    } as FeedbackLoopEvent);
  }

  /**
   * Check coherence and trigger dead man's switch if needed.
   */
  private checkCoherence(): void {
    if (!this.identityMesh) return;

    const score = this.identityMesh.getCoherenceScore();
    this.stats.coherenceScore = score;

    this.emit('event', {
      type: 'coherence_check',
      score,
      threshold: this.config.minCoherenceThreshold,
    } as FeedbackLoopEvent);

    if (score < this.config.minCoherenceThreshold) {
      log.warn(`Coherence below threshold: ${score.toFixed(3)} < ${this.config.minCoherenceThreshold}`);
      this.emit('event', {
        type: 'coherence_alert',
        score,
        message: `Coherence dropped to ${score.toFixed(3)}. Dead man's switch may activate.`,
      } as FeedbackLoopEvent);
    }
  }

  /**
   * Get current feedback loop statistics.
   */
  getStats(): FeedbackLoopStats {
    return { ...this.stats };
  }

  /**
   * Check if the feedback loop is running.
   */
  isRunning(): boolean {
    return this.running;
  }
}
