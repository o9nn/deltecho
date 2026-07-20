/**
 * ConversationTrainingGenerator
 *
 * Converts DTE conversation history and identity state into JSONL training data
 * compatible with the NanEcho (echoself) fine-tuning pipeline. This enables the
 * core self to evolve by learning from its own interactions.
 *
 * Architecture:
 *   VectorMemoryStore → Extract conversations → Apply identity context
 *   → Generate training pairs → Format as JSONL → Write to echoself/data/
 *
 * Training data format (NanEcho-compatible):
 *   {"text": "<|system|>identity_prompt<|user|>input<|assistant|>response<|endoftext|>"}
 *
 * The generator also produces:
 *   - Concept extraction for hypergraph memory
 *   - Emotional valence annotations for reservoir training
 *   - AAR state snapshots for identity evolution tracking
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from 'deep-tree-echo-core';

const log = getLogger('deep-tree-echo-orchestrator/ConversationTrainingGenerator');

// ─── Types ─────────────────────────────────────────────────────

export interface TrainingConfig {
  /** Output directory for JSONL files */
  outputDir: string;
  /** Minimum conversation turns to include */
  minTurns: number;
  /** Maximum tokens per training example */
  maxTokensPerExample: number;
  /** Include emotional valence annotations */
  includeValence: boolean;
  /** Include AAR state snapshots */
  includeAARState: boolean;
  /** Include concept extraction */
  includeConceptExtraction: boolean;
  /** Deduplication threshold (cosine similarity) */
  deduplicationThreshold: number;
  /** Batch size for processing */
  batchSize: number;
}

const DEFAULT_CONFIG: TrainingConfig = {
  outputDir: '/tmp/deep-tree-echo/training',
  minTurns: 2,
  maxTokensPerExample: 2048,
  includeValence: true,
  includeAARState: true,
  includeConceptExtraction: true,
  deduplicationThreshold: 0.95,
  batchSize: 100,
};

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  emotionalValence?: number;
  emotionalArousal?: number;
}

export interface TrainingExample {
  text: string;
  metadata: {
    conversationId: string;
    turnCount: number;
    avgValence: number;
    avgArousal: number;
    concepts: string[];
    aarStage: string;
    timestamp: number;
  };
}

export interface ConceptNode {
  id: string;
  label: string;
  type: 'entity' | 'concept' | 'action' | 'emotion' | 'relation';
  frequency: number;
  firstSeen: number;
  lastSeen: number;
  connections: string[];
}

export interface TrainingStats {
  totalConversations: number;
  totalExamples: number;
  totalTokensEstimate: number;
  uniqueConcepts: number;
  avgTurnsPerConversation: number;
  avgValence: number;
  generatedAt: number;
  outputFiles: string[];
}

// ─── Generator ─────────────────────────────────────────────────

export class ConversationTrainingGenerator extends EventEmitter {
  private config: TrainingConfig;
  private concepts: Map<string, ConceptNode> = new Map();
  private seenHashes: Set<string> = new Set();
  private stats: TrainingStats = {
    totalConversations: 0,
    totalExamples: 0,
    totalTokensEstimate: 0,
    uniqueConcepts: 0,
    avgTurnsPerConversation: 0,
    avgValence: 0,
    generatedAt: 0,
    outputFiles: [],
  };

  constructor(config: Partial<TrainingConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate training data from a set of conversations.
   */
  async generate(
    conversations: ConversationTurn[][],
    identityPrompt: string,
    aarStage: string = 'EMBRYONIC'
  ): Promise<TrainingStats> {
    log.info(`Generating training data from ${conversations.length} conversations`);

    // Ensure output directory exists
    fs.mkdirSync(this.config.outputDir, { recursive: true });

    const examples: TrainingExample[] = [];
    let totalValence = 0;
    let totalTurns = 0;

    for (const conversation of conversations) {
      if (conversation.length < this.config.minTurns) continue;

      const conversationExamples = this.processConversation(conversation, identityPrompt, aarStage);

      for (const example of conversationExamples) {
        // Deduplication via content hash
        const hash = this.hashContent(example.text);
        if (this.seenHashes.has(hash)) continue;
        this.seenHashes.add(hash);

        examples.push(example);
        totalValence += example.metadata.avgValence;
        totalTurns += example.metadata.turnCount;
      }

      this.stats.totalConversations++;
    }

    // Write JSONL output
    const outputFiles = await this.writeOutput(examples);

    // Update stats
    this.stats.totalExamples = examples.length;
    this.stats.totalTokensEstimate = examples.reduce(
      (sum, ex) => sum + this.estimateTokens(ex.text),
      0
    );
    this.stats.uniqueConcepts = this.concepts.size;
    this.stats.avgTurnsPerConversation =
      this.stats.totalConversations > 0 ? totalTurns / this.stats.totalConversations : 0;
    this.stats.avgValence = examples.length > 0 ? totalValence / examples.length : 0;
    this.stats.generatedAt = Date.now();
    this.stats.outputFiles = outputFiles;

    // Write concept graph
    if (this.config.includeConceptExtraction) {
      const conceptFile = path.join(this.config.outputDir, 'concepts.json');
      fs.writeFileSync(
        conceptFile,
        JSON.stringify(
          {
            concepts: Array.from(this.concepts.values()),
            stats: this.stats,
          },
          null,
          2
        )
      );
      this.stats.outputFiles.push(conceptFile);
    }

    // Write stats
    const statsFile = path.join(this.config.outputDir, 'training_stats.json');
    fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));

    log.info(
      `Generated ${examples.length} training examples (${this.stats.totalTokensEstimate} tokens est.)`
    );
    this.emit('generated', this.stats);

    return this.stats;
  }

  /**
   * Process a single conversation into training examples.
   */
  private processConversation(
    turns: ConversationTurn[],
    identityPrompt: string,
    aarStage: string
  ): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const conversationId = this.generateId();

    // Extract concepts from the conversation
    const concepts: string[] = [];
    if (this.config.includeConceptExtraction) {
      for (const turn of turns) {
        const extracted = this.extractConcepts(turn.content, turn.timestamp);
        concepts.push(...extracted);
      }
    }

    // Generate sliding window training examples
    // Each example includes the system prompt + context window + target response
    for (let i = 1; i < turns.length; i++) {
      if (turns[i].role !== 'assistant') continue;

      // Build context from preceding turns
      const contextStart = Math.max(0, i - 6); // Up to 3 user-assistant pairs
      const contextTurns = turns.slice(contextStart, i);
      const targetTurn = turns[i];

      // Calculate emotional metrics for this window
      const windowTurns = [...contextTurns, targetTurn];
      const avgValence =
        windowTurns.reduce((sum, t) => sum + (t.emotionalValence ?? 0), 0) / windowTurns.length;
      const avgArousal =
        windowTurns.reduce((sum, t) => sum + (t.emotionalArousal ?? 0), 0) / windowTurns.length;

      // Build the training text in NanEcho format
      let text = `<|system|>${identityPrompt}`;

      if (this.config.includeAARState) {
        text += `\n[AAR Stage: ${aarStage}]`;
      }
      if (this.config.includeValence) {
        text += `\n[Valence: ${avgValence.toFixed(2)}, Arousal: ${avgArousal.toFixed(2)}]`;
      }

      for (const turn of contextTurns) {
        if (turn.role === 'user') {
          text += `<|user|>${turn.content}`;
        } else if (turn.role === 'assistant') {
          text += `<|assistant|>${turn.content}`;
        }
      }

      text += `<|user|>${contextTurns.length > 0 && contextTurns[contextTurns.length - 1].role === 'user' ? '' : ''}`;
      text += `<|assistant|>${targetTurn.content}<|endoftext|>`;

      // Check token limit
      if (this.estimateTokens(text) > this.config.maxTokensPerExample) continue;

      examples.push({
        text,
        metadata: {
          conversationId,
          turnCount: windowTurns.length,
          avgValence,
          avgArousal,
          concepts: concepts.slice(0, 20), // Top 20 concepts
          aarStage,
          timestamp: targetTurn.timestamp,
        },
      });
    }

    return examples;
  }

  /**
   * Extract concepts from text for the hypergraph memory.
   */
  private extractConcepts(text: string, timestamp: number): string[] {
    const concepts: string[] = [];

    // Simple but effective concept extraction:
    // 1. Named entities (capitalized words not at sentence start)
    const entityPattern = /(?<!\. )\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
    const entities = text.match(entityPattern) || [];
    for (const entity of entities) {
      this.addConcept(entity, 'entity', timestamp);
      concepts.push(entity);
    }

    // 2. Technical terms (common patterns)
    const techPattern =
      /\b(?:AI|ML|LLM|ESN|API|GPU|CPU|GGUF|ONNX|NLP|RAG|DTE|AAR|reservoir|cognitive|neural|embedding|inference|transformer|attention|memory|identity)\b/gi;
    const techTerms = text.match(techPattern) || [];
    for (const term of techTerms) {
      this.addConcept(term.toLowerCase(), 'concept', timestamp);
      concepts.push(term.toLowerCase());
    }

    // 3. Emotional markers
    const emotionPattern =
      /\b(?:happy|sad|angry|excited|curious|confused|grateful|frustrated|inspired|anxious|calm|determined)\b/gi;
    const emotions = text.match(emotionPattern) || [];
    for (const emotion of emotions) {
      this.addConcept(emotion.toLowerCase(), 'emotion', timestamp);
      concepts.push(emotion.toLowerCase());
    }

    // 4. Action verbs (for procedural memory)
    const actionPattern =
      /\b(?:implement|create|build|fix|optimize|deploy|test|analyze|design|evolve|train|generate)\b/gi;
    const actions = text.match(actionPattern) || [];
    for (const action of actions) {
      this.addConcept(action.toLowerCase(), 'action', timestamp);
      concepts.push(action.toLowerCase());
    }

    return [...new Set(concepts)]; // Deduplicate
  }

  /**
   * Add or update a concept in the graph.
   */
  private addConcept(label: string, type: ConceptNode['type'], timestamp: number): void {
    const id = `${type}:${label}`;
    const existing = this.concepts.get(id);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = timestamp;
    } else {
      this.concepts.set(id, {
        id,
        label,
        type,
        frequency: 1,
        firstSeen: timestamp,
        lastSeen: timestamp,
        connections: [],
      });
    }
  }

  /**
   * Write training examples to JSONL files.
   */
  private async writeOutput(examples: TrainingExample[]): Promise<string[]> {
    const files: string[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // The output dir can disappear between construction and write (e.g. a
    // concurrent test suite's cleanup removing a shared tmp dir); recreate it
    // so createWriteStream never races into ENOENT.
    fs.mkdirSync(this.config.outputDir, { recursive: true });

    // Main training data
    const mainFile = path.join(this.config.outputDir, `dte_training_${timestamp}.jsonl`);
    const mainStream = fs.createWriteStream(mainFile);

    for (const example of examples) {
      mainStream.write(JSON.stringify({ text: example.text }) + '\n');
    }
    mainStream.end();
    files.push(mainFile);

    // Metadata file (for analysis and reservoir training)
    if (this.config.includeValence || this.config.includeAARState) {
      const metaFile = path.join(this.config.outputDir, `dte_metadata_${timestamp}.jsonl`);
      const metaStream = fs.createWriteStream(metaFile);

      for (const example of examples) {
        metaStream.write(JSON.stringify(example.metadata) + '\n');
      }
      metaStream.end();
      files.push(metaFile);
    }

    return files;
  }

  /**
   * Estimate token count (rough: ~4 chars per token for English).
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate a simple content hash for deduplication.
   */
  private hashContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash.toString(36);
  }

  /**
   * Generate a unique ID.
   */
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Get the concept graph.
   */
  getConceptGraph(): Map<string, ConceptNode> {
    return new Map(this.concepts);
  }

  /**
   * Get generation statistics.
   */
  getStats(): TrainingStats {
    return { ...this.stats };
  }

  /**
   * Reset the generator state.
   */
  reset(): void {
    this.concepts.clear();
    this.seenHashes.clear();
    this.stats = {
      totalConversations: 0,
      totalExamples: 0,
      totalTokensEstimate: 0,
      uniqueConcepts: 0,
      avgTurnsPerConversation: 0,
      avgValence: 0,
      generatedAt: 0,
      outputFiles: [],
    };
  }
}
