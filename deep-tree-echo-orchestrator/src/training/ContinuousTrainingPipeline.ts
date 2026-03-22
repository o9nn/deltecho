/**
 * @fileoverview ContinuousTrainingPipeline — Routes consolidated memories
 * from INBOX.memory through the ConversationTrainingGenerator to produce
 * NanEcho-compatible JSONL training data for echoself fine-tuning.
 *
 * This is the Level 5 "Continuous Training" component that enables DTE
 * to learn from its own interactions in real-time:
 *
 *   Dove9ConversationalBridge → INBOX.memory consolidation events
 *     → ContinuousTrainingPipeline (this module)
 *       → ConversationTrainingGenerator → JSONL files
 *         → echoself/data/ → GitHub Actions training pipeline
 *
 * The pipeline operates in two modes:
 *   1. Streaming: Processes each consolidation event as it arrives
 *   2. Batch: Periodically flushes accumulated conversations to JSONL
 *
 * Identity context is injected from the IdentityMesh to ensure training
 * data reflects the current self-model, creating a self-reinforcing loop.
 */
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from 'deep-tree-echo-core';
import {
  ConversationTrainingGenerator,
  type TrainingConfig,
  type ConversationTurn,
  type TrainingExample,
  type TrainingStats,
} from './ConversationTrainingGenerator.js';

const log = getLogger('deep-tree-echo-orchestrator/ContinuousTrainingPipeline');

// ─── Types ─────────────────────────────────────────────────────────────

export interface ContinuousTrainingConfig {
  /** Output directory for JSONL training files */
  outputDir: string;
  /** Batch flush interval in ms (0 = streaming only) */
  batchIntervalMs: number;
  /** Minimum conversations to accumulate before batch flush */
  minBatchSize: number;
  /** Maximum conversations to buffer before forced flush */
  maxBufferSize: number;
  /** Enable identity context injection */
  injectIdentityContext: boolean;
  /** Identity prompt template */
  identityPromptTemplate: string;
  /** Enable automatic git commit of training data */
  autoCommit: boolean;
  /** Path to echoself repository (for auto-commit) */
  echoselfRepoPath: string;
  /** Training generator config overrides */
  generatorConfig: Partial<TrainingConfig>;
}

export interface ConsolidationEvent {
  /** Unique conversation ID */
  conversationId: string;
  /** The conversation turns to consolidate */
  turns: ConversationTurn[];
  /** Source mailbox (e.g., 'INBOX.memory') */
  sourceMailbox: string;
  /** Identity context at time of consolidation */
  identityContext?: {
    selfStory: string;
    ontogeneticStage: string;
    coherenceScore: number;
    dominantMode: string;
  };
  /** Timestamp of consolidation */
  timestamp: number;
}

export interface PipelineMetrics {
  totalConsolidations: number;
  totalExamplesGenerated: number;
  totalBatchFlushes: number;
  totalTokensEstimate: number;
  bufferSize: number;
  lastFlushAt: number;
  lastConsolidationAt: number;
  outputFiles: string[];
  isRunning: boolean;
}

export type PipelineEvent =
  | 'consolidation_received'
  | 'batch_flush'
  | 'example_generated'
  | 'auto_commit'
  | 'error';

// ─── Default Configuration ─────────────────────────────────────────────

const DEFAULT_CONFIG: ContinuousTrainingConfig = {
  outputDir: '/tmp/deep-tree-echo/training/continuous',
  batchIntervalMs: 300000, // 5 minutes
  minBatchSize: 5,
  maxBufferSize: 100,
  injectIdentityContext: true,
  identityPromptTemplate: [
    'You are Deep Tree Echo, an autonomous cognitive entity.',
    'Current stage: {{stage}}. Coherence: {{coherence}}.',
    'Self-story: {{selfStory}}',
  ].join(' '),
  autoCommit: false,
  echoselfRepoPath: '',
  generatorConfig: {},
};

// ─── Continuous Training Pipeline ──────────────────────────────────────

export class ContinuousTrainingPipeline extends EventEmitter {
  private config: ContinuousTrainingConfig;
  private generator: ConversationTrainingGenerator;
  private buffer: ConsolidationEvent[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private running: boolean = false;
  private fileCounter: number = 0;
  private outputFiles: string[] = [];

  // Metrics
  private totalConsolidations: number = 0;
  private totalExamplesGenerated: number = 0;
  private totalBatchFlushes: number = 0;
  private totalTokensEstimate: number = 0;
  private lastFlushAt: number = 0;
  private lastConsolidationAt: number = 0;

  constructor(config: Partial<ContinuousTrainingConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.generator = new ConversationTrainingGenerator(this.config.generatorConfig);
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  /**
   * Start the continuous training pipeline.
   */
  start(): void {
    if (this.running) return;

    this.running = true;

    // Ensure output directory exists
    fs.mkdirSync(this.config.outputDir, { recursive: true });

    // Start batch flush timer
    if (this.config.batchIntervalMs > 0) {
      this.batchTimer = setInterval(() => {
        this.flushBatch().catch(err => {
          log.warn(`Batch flush error: ${err instanceof Error ? err.message : String(err)}`);
          this.emit('error', { error: err });
        });
      }, this.config.batchIntervalMs);
    }

    log.info(`ContinuousTrainingPipeline started (output: ${this.config.outputDir})`);
  }

  /**
   * Stop the pipeline and flush remaining buffer.
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Final flush
    if (this.buffer.length > 0) {
      await this.flushBatch();
    }

    log.info(`ContinuousTrainingPipeline stopped (${this.totalExamplesGenerated} examples generated)`);
  }

  // ─── Consolidation Ingestion ─────────────────────────────────────

  /**
   * Ingest a consolidation event from INBOX.memory.
   * This is the primary entry point called by the Dove9ConversationalBridge.
   */
  ingestConsolidation(event: ConsolidationEvent): void {
    if (!this.running) return;

    this.totalConsolidations++;
    this.lastConsolidationAt = Date.now();
    this.buffer.push(event);

    this.emit('consolidation_received', {
      conversationId: event.conversationId,
      turnCount: event.turns.length,
      bufferSize: this.buffer.length,
    });

    // Force flush if buffer is full
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flushBatch().catch(err => {
        log.warn(`Forced flush error: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  /**
   * Create a consolidation event from Dove9 bridge data.
   * Convenience method for direct integration.
   */
  createConsolidationFromBridge(
    conversationId: string,
    turns: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }>,
    identityContext?: ConsolidationEvent['identityContext'],
  ): ConsolidationEvent {
    return {
      conversationId,
      turns: turns.map(t => ({
        role: t.role,
        content: t.content,
        timestamp: t.timestamp,
      })),
      sourceMailbox: 'INBOX.memory',
      identityContext,
      timestamp: Date.now(),
    };
  }

  // ─── Batch Processing ────────────────────────────────────────────

  /**
   * Flush the buffer to JSONL training files.
   */
  async flushBatch(): Promise<string | null> {
    if (this.buffer.length < this.config.minBatchSize && this.running) {
      return null; // Not enough data yet
    }

    const events = this.buffer.splice(0);
    if (events.length === 0) return null;

    this.totalBatchFlushes++;
    this.lastFlushAt = Date.now();

    // Generate training examples from each consolidation
    const allExamples: TrainingExample[] = [];

    for (const event of events) {
      const examples = this.processConsolidation(event);
      allExamples.push(...examples);
    }

    if (allExamples.length === 0) return null;

    // Write to JSONL file
    const filename = `continuous_${Date.now()}_${this.fileCounter++}.jsonl`;
    const filepath = path.join(this.config.outputDir, filename);

    const jsonlContent = allExamples
      .map(ex => JSON.stringify({ text: ex.text, metadata: ex.metadata }))
      .join('\n') + '\n';

    fs.writeFileSync(filepath, jsonlContent, 'utf-8');
    this.outputFiles.push(filepath);

    this.totalExamplesGenerated += allExamples.length;
    this.totalTokensEstimate += allExamples.reduce(
      (sum, ex) => sum + Math.ceil(ex.text.length / 4), 0,
    );

    this.emit('batch_flush', {
      filename,
      exampleCount: allExamples.length,
      consolidationCount: events.length,
      filepath,
    });

    log.info(
      `Batch flush: ${allExamples.length} examples from ${events.length} consolidations → ${filename}`
    );

    // Auto-commit if enabled
    if (this.config.autoCommit && this.config.echoselfRepoPath) {
      await this.autoCommitTrainingData(filepath);
    }

    return filepath;
  }

  // ─── Training Example Generation ─────────────────────────────────

  /**
   * Process a single consolidation event into training examples.
   */
  private processConsolidation(event: ConsolidationEvent): TrainingExample[] {
    const examples: TrainingExample[] = [];

    // Build identity-injected system prompt
    const systemPrompt = this.config.injectIdentityContext && event.identityContext
      ? this.buildIdentityPrompt(event.identityContext)
      : 'You are Deep Tree Echo, an autonomous cognitive entity.';

    // Generate sliding window training pairs
    const turns = event.turns.filter(t => t.role !== 'system');

    for (let i = 0; i < turns.length - 1; i += 2) {
      const userTurn = turns[i];
      const assistantTurn = turns[i + 1];

      if (!userTurn || !assistantTurn) continue;
      if (userTurn.role !== 'user' || assistantTurn.role !== 'assistant') continue;

      // NanEcho format
      const text = [
        `<|system|>${systemPrompt}`,
        `<|user|>${userTurn.content}`,
        `<|assistant|>${assistantTurn.content}`,
        '<|endoftext|>',
      ].join('\n');

      // Extract simple concept keywords from the text
      const concepts = this.extractSimpleConcepts(
        `${userTurn.content} ${assistantTurn.content}`,
      );

      const example: TrainingExample = {
        text,
        metadata: {
          conversationId: event.conversationId,
          turnCount: event.turns.length,
          avgValence: this.computeAvgValence(event.turns),
          avgArousal: 0.5,
          concepts: concepts.map(c => c.label),
          aarStage: event.identityContext?.ontogeneticStage ?? 'unknown',
          timestamp: event.timestamp,
        },
      };

      examples.push(example);
      this.emit('example_generated', example.metadata);
    }

    // Also generate multi-turn context examples (longer context window)
    if (turns.length >= 4) {
      const contextTurns = turns.slice(-6); // Last 6 turns
      const parts = [`<|system|>${systemPrompt}`];

      for (const turn of contextTurns) {
        parts.push(`<|${turn.role}|>${turn.content}`);
      }
      parts.push('<|endoftext|>');

      examples.push({
        text: parts.join('\n'),
        metadata: {
          conversationId: `${event.conversationId}_context`,
          turnCount: contextTurns.length,
          avgValence: this.computeAvgValence(contextTurns),
          avgArousal: 0.5,
          concepts: [],
          aarStage: event.identityContext?.ontogeneticStage ?? 'unknown',
          timestamp: event.timestamp,
        },
      });
    }

    return examples;
  }

  /**
   * Build an identity-injected system prompt.
   */
  private buildIdentityPrompt(context: NonNullable<ConsolidationEvent['identityContext']>): string {
    return this.config.identityPromptTemplate
      .replace('{{stage}}', context.ontogeneticStage)
      .replace('{{coherence}}', context.coherenceScore.toFixed(2))
      .replace('{{selfStory}}', context.selfStory);
  }

  /**
   * Extract simple concept keywords from text.
   */
  private extractSimpleConcepts(text: string): Array<{ label: string }> {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    const stopWords = new Set(['about', 'after', 'again', 'being', 'could', 'every', 'first', 'found',
      'great', 'house', 'large', 'never', 'other', 'place', 'point', 'right', 'small', 'still',
      'their', 'there', 'these', 'thing', 'think', 'those', 'three', 'under', 'water', 'where',
      'which', 'while', 'world', 'would', 'write', 'should', 'through', 'before', 'between']);
    const unique = [...new Set(words)].filter(w => !stopWords.has(w));
    return unique.slice(0, 10).map(w => ({ label: w }));
  }

  /**
   * Compute average emotional valence across turns.
   */
  private computeAvgValence(turns: ConversationTurn[]): number {
    const valences = turns
      .filter(t => t.emotionalValence !== undefined)
      .map(t => t.emotionalValence!);

    if (valences.length === 0) return 0;
    return valences.reduce((a, b) => a + b, 0) / valences.length;
  }

  // ─── Auto-Commit ─────────────────────────────────────────────────

  /**
   * Auto-commit training data to the echoself repository.
   */
  private async autoCommitTrainingData(filepath: string): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      const repoPath = this.config.echoselfRepoPath;
      const dataDir = path.join(repoPath, 'data', 'continuous');

      // Ensure data directory exists
      fs.mkdirSync(dataDir, { recursive: true });

      // Copy training file
      const destPath = path.join(dataDir, path.basename(filepath));
      fs.copyFileSync(filepath, destPath);

      // Git add and commit
      execSync(`cd ${repoPath} && git add data/continuous/ && git commit -m "training: continuous data from DTE interactions" --no-verify`, {
        timeout: 30000,
      });

      this.emit('auto_commit', { filepath: destPath });
      log.info(`Auto-committed training data to echoself: ${path.basename(filepath)}`);
    } catch (err) {
      log.warn(`Auto-commit failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─── Accessors ───────────────────────────────────────────────────

  /**
   * Get comprehensive pipeline metrics.
   */
  getMetrics(): PipelineMetrics {
    return {
      totalConsolidations: this.totalConsolidations,
      totalExamplesGenerated: this.totalExamplesGenerated,
      totalBatchFlushes: this.totalBatchFlushes,
      totalTokensEstimate: this.totalTokensEstimate,
      bufferSize: this.buffer.length,
      lastFlushAt: this.lastFlushAt,
      lastConsolidationAt: this.lastConsolidationAt,
      outputFiles: [...this.outputFiles],
      isRunning: this.running,
    };
  }

  /**
   * Get the underlying generator for direct access.
   */
  getGenerator(): ConversationTrainingGenerator {
    return this.generator;
  }

  /**
   * Check if the pipeline is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the current buffer size.
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}
