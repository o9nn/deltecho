/**
 * CodecPipeline - Transformation Layer for Membrane Crossings
 *
 * The CodecPipeline implements the transformation functions that convert
 * data between objective (hypergraph/branching) and subjective (tensor/nested)
 * representations. This is the "adjoint-style bridge" between the two
 * computational ontologies.
 *
 * Key transformations:
 * - Graphize: Convert arena events → objective hypergraph
 * - Tensorize: Convert selected features → subjective embeddings
 * - Summarize: Compress information while preserving meaning
 * - Redact: Remove sensitive information before crossing outward
 *
 * This is analogous to the transport proteins in the mitochondrial membrane
 * that selectively transform and transport molecules across the barrier.
 */

import {
  EvidencePacket,
  IntentPacket,
  Fact,
  addProvenanceStep,
  RedactionPolicy,
} from './packets.js';

/**
 * Hypergraph node representation (objective)
 */
export interface HypergraphNode {
  id: string;
  type: 'entity' | 'event' | 'relation' | 'action' | 'state';
  label: string;
  properties: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Hypergraph edge (can connect multiple nodes)
 */
export interface HypergraphEdge {
  id: string;
  type: 'causal' | 'temporal' | 'spatial' | 'semantic' | 'functional';
  sourceIds: string[];
  targetIds: string[];
  weight: number;
  properties: Record<string, unknown>;
}

/**
 * Hypergraph representation (objective world model)
 */
export interface Hypergraph {
  nodes: HypergraphNode[];
  edges: HypergraphEdge[];
  metadata: {
    createdAt: string;
    source: string;
    version: number;
  };
}

/**
 * Tensor representation (subjective embedding)
 */
export interface TensorRepresentation {
  /** Embedding vector */
  embedding: number[];
  /** Dimension */
  dim: number;
  /** Nested structure (for hierarchical representations) */
  nested?: TensorRepresentation[];
  /** Metadata */
  metadata: {
    source: string;
    timestamp: string;
    confidence: number;
  };
}

/**
 * Summary representation
 */
export interface Summary {
  /** Compressed text */
  text: string;
  /** Key points extracted */
  keyPoints: string[];
  /** Salience scores for each key point */
  salience: number[];
  /** Compression ratio */
  compressionRatio: number;
  /** Information loss estimate (0-1) */
  informationLoss: number;
}

/**
 * Codec configuration
 */
export interface CodecConfig {
  /** Default embedding dimension */
  embeddingDim?: number;
  /** Maximum summary length */
  maxSummaryLength?: number;
  /** Minimum salience threshold */
  minSalienceThreshold?: number;
  /** Default redaction patterns */
  defaultRedactionPatterns?: string[];
}

const DEFAULT_CONFIG: Required<CodecConfig> = {
  embeddingDim: 768,
  maxSummaryLength: 500,
  minSalienceThreshold: 0.3,
  defaultRedactionPatterns: [
    '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', // Email
    '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b', // Phone
    '\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b', // Credit card
    '\\b\\d{3}[-]?\\d{2}[-]?\\d{4}\\b', // SSN
  ],
};

/**
 * CodecPipeline - The transformation layer
 */
export class CodecPipeline {
  private config: Required<CodecConfig>;

  constructor(config: CodecConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================
  // GRAPHIZE: Arena Events → Objective Hypergraph
  // ============================================================

  /**
   * Convert arena events to hypergraph representation
   * This is the "extensional" transformation (coproduct-driven)
   */
  public graphize(events: ArenaEvent[]): Hypergraph {
    const nodes: HypergraphNode[] = [];
    const edges: HypergraphEdge[] = [];
    const nodeMap = new Map<string, HypergraphNode>();

    for (const event of events) {
      // Create event node
      const eventNode: HypergraphNode = {
        id: `event-${event.id}`,
        type: 'event',
        label: event.type,
        properties: {
          content: event.content,
          source: event.source,
        },
        timestamp: event.timestamp,
      };
      nodes.push(eventNode);
      nodeMap.set(eventNode.id, eventNode);

      // Extract entities and create nodes
      const entities = this.extractEntities(event.content);
      for (const entity of entities) {
        const entityId = `entity-${entity.name.toLowerCase().replace(/\s+/g, '-')}`;
        if (!nodeMap.has(entityId)) {
          const entityNode: HypergraphNode = {
            id: entityId,
            type: 'entity',
            label: entity.name,
            properties: { entityType: entity.type },
          };
          nodes.push(entityNode);
          nodeMap.set(entityId, entityNode);
        }

        // Create edge from event to entity
        edges.push({
          id: `edge-${eventNode.id}-${entityId}`,
          type: 'semantic',
          sourceIds: [eventNode.id],
          targetIds: [entityId],
          weight: entity.confidence,
          properties: { relation: 'mentions' },
        });
      }

      // Extract relations and create hyperedges
      const relations = this.extractRelations(event.content);
      for (const relation of relations) {
        const sourceId = `entity-${relation.source.toLowerCase().replace(/\s+/g, '-')}`;
        const targetId = `entity-${relation.target.toLowerCase().replace(/\s+/g, '-')}`;

        if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
          edges.push({
            id: `edge-${sourceId}-${relation.type}-${targetId}`,
            type: this.mapRelationType(relation.type),
            sourceIds: [sourceId],
            targetIds: [targetId],
            weight: relation.confidence,
            properties: { relationType: relation.type },
          });
        }
      }
    }

    // Add temporal edges between consecutive events
    for (let i = 1; i < events.length; i++) {
      edges.push({
        id: `temporal-${events[i - 1].id}-${events[i].id}`,
        type: 'temporal',
        sourceIds: [`event-${events[i - 1].id}`],
        targetIds: [`event-${events[i].id}`],
        weight: 1.0,
        properties: { relation: 'precedes' },
      });
    }

    return {
      nodes,
      edges,
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'CodecPipeline.graphize',
        version: 1,
      },
    };
  }

  /**
   * Convert evidence packet to hypergraph
   */
  public graphizeEvidence(packet: EvidencePacket): Hypergraph {
    const events: ArenaEvent[] = packet.facts.map((fact) => ({
      id: fact.id,
      type: fact.category,
      content: fact.content,
      source: packet.provenance.source.name,
      timestamp: packet.provenance.timestamp,
    }));

    return this.graphize(events);
  }

  // ============================================================
  // TENSORIZE: Selected Features → Subjective Embeddings
  // ============================================================

  /**
   * Convert hypergraph to tensor representation
   * This is the "intensional" transformation (product-driven)
   */
  public tensorize(graph: Hypergraph): TensorRepresentation {
    // Create base embedding from graph structure
    const nodeEmbeddings = graph.nodes.map((node) => this.embedNode(node));
    const edgeEmbeddings = graph.edges.map((edge) => this.embedEdge(edge, graph.nodes));

    // Aggregate embeddings using mean pooling
    const aggregated = this.aggregateEmbeddings([...nodeEmbeddings, ...edgeEmbeddings]);

    // Create nested structure for hierarchical representation
    const nested = this.createNestedStructure(graph);

    return {
      embedding: aggregated,
      dim: this.config.embeddingDim,
      nested,
      metadata: {
        source: 'CodecPipeline.tensorize',
        timestamp: new Date().toISOString(),
        confidence: this.computeConfidence(graph),
      },
    };
  }

  /**
   * Convert facts to tensor representation
   */
  public tensorizeFacts(facts: Fact[]): TensorRepresentation {
    // Use pre-computed embeddings if available
    const embeddings = facts.map((fact) => {
      if (fact.embedding && fact.embedding.length === this.config.embeddingDim) {
        return fact.embedding;
      }
      return this.embedText(fact.content);
    });

    // Weighted aggregation by confidence
    const weights = facts.map((f) => f.confidence);
    const aggregated = this.weightedAggregation(embeddings, weights);

    return {
      embedding: aggregated,
      dim: this.config.embeddingDim,
      metadata: {
        source: 'CodecPipeline.tensorizeFacts',
        timestamp: new Date().toISOString(),
        confidence: weights.reduce((a, b) => a + b, 0) / weights.length,
      },
    };
  }

  // ============================================================
  // SUMMARIZE: Compress Information
  // ============================================================

  /**
   * Summarize text content
   */
  public summarize(text: string): Summary {
    // Extract sentences
    const sentences = this.extractSentences(text);

    // Score sentences by salience
    const scored = sentences.map((sentence) => ({
      sentence,
      salience: this.computeSentenceSalience(sentence, text),
    }));

    // Sort by salience and select top sentences
    scored.sort((a, b) => b.salience - a.salience);
    const selected = scored.filter((s) => s.salience >= this.config.minSalienceThreshold);

    // Build summary
    let summaryText = '';
    const keyPoints: string[] = [];
    const salience: number[] = [];

    for (const item of selected) {
      if (summaryText.length + item.sentence.length <= this.config.maxSummaryLength) {
        summaryText += (summaryText ? ' ' : '') + item.sentence;
        keyPoints.push(item.sentence);
        salience.push(item.salience);
      }
    }

    return {
      text: summaryText,
      keyPoints,
      salience,
      compressionRatio: text.length > 0 ? summaryText.length / text.length : 1,
      informationLoss: this.estimateInformationLoss(text, summaryText),
    };
  }

  /**
   * Summarize evidence packet
   */
  public summarizeEvidence(packet: EvidencePacket): Summary {
    const fullText = packet.facts.map((f) => f.content).join(' ');
    return this.summarize(fullText);
  }

  /**
   * Summarize hypergraph to key facts
   */
  public summarizeGraph(graph: Hypergraph): Summary {
    // Extract key nodes (high connectivity)
    const nodeConnectivity = new Map<string, number>();
    for (const edge of graph.edges) {
      for (const id of [...edge.sourceIds, ...edge.targetIds]) {
        nodeConnectivity.set(id, (nodeConnectivity.get(id) || 0) + edge.weight);
      }
    }

    // Get top nodes
    const sortedNodes = graph.nodes
      .map((node) => ({
        node,
        connectivity: nodeConnectivity.get(node.id) || 0,
      }))
      .sort((a, b) => b.connectivity - a.connectivity);

    // Build summary from top nodes
    const keyPoints = sortedNodes.slice(0, 5).map((n) => `${n.node.type}: ${n.node.label}`);

    const salience = sortedNodes.slice(0, 5).map((n) => {
      const maxConnectivity = Math.max(...Array.from(nodeConnectivity.values()));
      return maxConnectivity > 0 ? n.connectivity / maxConnectivity : 0;
    });

    return {
      text: keyPoints.join('; '),
      keyPoints,
      salience,
      compressionRatio: keyPoints.length / graph.nodes.length,
      informationLoss: 1 - keyPoints.length / graph.nodes.length,
    };
  }

  // ============================================================
  // REDACT: Remove Sensitive Information
  // ============================================================

  /**
   * Redact sensitive information from text
   */
  public redact(text: string, policy: RedactionPolicy): string {
    let result = text;

    // Apply pattern-based redaction
    const patterns = [...this.config.defaultRedactionPatterns, ...policy.redactPatterns];
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'gi');
      if (policy.hashInsteadOfRemove) {
        result = result.replace(regex, (match: string) => this.hashMatch(match));
      } else {
        result = result.replace(regex, '[REDACTED]');
      }
    }

    // Apply field length limits
    if (policy.maxFieldLength && result.length > policy.maxFieldLength) {
      result = result.substring(0, policy.maxFieldLength) + '...';
    }

    return result;
  }

  /**
   * Redact evidence packet
   */
  public redactEvidence(packet: EvidencePacket, policy: RedactionPolicy): EvidencePacket {
    const redactedFacts = packet.facts.map((fact) => ({
      ...fact,
      content: this.redact(fact.content, policy),
      structuredData: this.redactStructuredData(fact.structuredData, policy),
    }));

    return {
      ...packet,
      facts: redactedFacts,
      provenance: addProvenanceStep(packet.provenance, 'redaction', 'CodecPipeline'),
    };
  }

  /**
   * Redact intent packet for outward crossing
   */
  public redactIntent(packet: IntentPacket): IntentPacket {
    // Intent packets should already be sanitized, but apply additional redaction
    return {
      ...packet,
      goal: {
        ...packet.goal,
        description: this.redact(packet.goal.description, packet.redactionPolicy),
      },
    };
  }

  /**
   * Redact structured data
   */
  private redactStructuredData(
    data: Record<string, unknown> | undefined,
    policy: RedactionPolicy
  ): Record<string, unknown> | undefined {
    if (!data) return undefined;

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (policy.redactFields.includes(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        result[key] = this.redact(value, policy);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redactStructuredData(value as Record<string, unknown>, policy);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private extractEntities(text: string): Array<{ name: string; type: string; confidence: number }> {
    // Simple entity extraction (would use NER in production)
    const entities: Array<{ name: string; type: string; confidence: number }> = [];

    // Extract capitalized phrases as potential entities
    const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const matches = text.match(capitalizedPattern) || [];

    for (const match of matches) {
      entities.push({
        name: match,
        type: 'entity',
        confidence: 0.7,
      });
    }

    return entities;
  }

  private extractRelations(
    text: string
  ): Array<{ source: string; target: string; type: string; confidence: number }> {
    // Simple relation extraction (would use dependency parsing in production)
    const relations: Array<{ source: string; target: string; type: string; confidence: number }> =
      [];

    // Look for "X is Y" patterns
    const isPattern = /(\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+is\s+(\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    let match;
    while ((match = isPattern.exec(text)) !== null) {
      relations.push({
        source: match[1],
        target: match[2],
        type: 'is_a',
        confidence: 0.6,
      });
    }

    return relations;
  }

  private mapRelationType(
    type: string
  ): 'causal' | 'temporal' | 'spatial' | 'semantic' | 'functional' {
    const mapping: Record<string, 'causal' | 'temporal' | 'spatial' | 'semantic' | 'functional'> = {
      is_a: 'semantic',
      causes: 'causal',
      before: 'temporal',
      after: 'temporal',
      near: 'spatial',
      uses: 'functional',
    };
    return mapping[type] || 'semantic';
  }

  private embedNode(node: HypergraphNode): number[] {
    // Simple embedding based on node properties
    const embedding = new Array(this.config.embeddingDim).fill(0);

    // Hash-based initialization
    const hash = this.simpleHash(node.id + node.label);
    for (let i = 0; i < this.config.embeddingDim; i++) {
      embedding[i] = Math.sin(hash * (i + 1)) * 0.1;
    }

    // Type-based offset
    const typeOffset =
      { entity: 0.1, event: 0.2, relation: 0.3, action: 0.4, state: 0.5 }[node.type] || 0;
    embedding[0] += typeOffset;

    return embedding;
  }

  private embedEdge(edge: HypergraphEdge, nodes: HypergraphNode[]): number[] {
    // Combine source and target embeddings
    const sourceEmbeddings = edge.sourceIds
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n): n is HypergraphNode => n !== undefined)
      .map((n) => this.embedNode(n));

    const targetEmbeddings = edge.targetIds
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n): n is HypergraphNode => n !== undefined)
      .map((n) => this.embedNode(n));

    const allEmbeddings = [...sourceEmbeddings, ...targetEmbeddings];
    if (allEmbeddings.length === 0) {
      return new Array(this.config.embeddingDim).fill(0);
    }

    return this.aggregateEmbeddings(allEmbeddings);
  }

  private embedText(text: string): number[] {
    // Simple text embedding (would use transformer in production)
    const embedding = new Array(this.config.embeddingDim).fill(0);
    const words = text.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const wordHash = this.simpleHash(words[i]);
      for (let j = 0; j < this.config.embeddingDim; j++) {
        embedding[j] += Math.sin(wordHash * (j + 1)) / words.length;
      }
    }

    return embedding;
  }

  private aggregateEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      return new Array(this.config.embeddingDim).fill(0);
    }

    const result = new Array(this.config.embeddingDim).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < this.config.embeddingDim; i++) {
        result[i] += emb[i] / embeddings.length;
      }
    }
    return result;
  }

  private weightedAggregation(embeddings: number[][], weights: number[]): number[] {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight === 0) {
      return this.aggregateEmbeddings(embeddings);
    }

    const result = new Array(this.config.embeddingDim).fill(0);
    for (let i = 0; i < embeddings.length; i++) {
      const weight = weights[i] / totalWeight;
      for (let j = 0; j < this.config.embeddingDim; j++) {
        result[j] += embeddings[i][j] * weight;
      }
    }
    return result;
  }

  private createNestedStructure(graph: Hypergraph): TensorRepresentation[] {
    // Group nodes by type for nested representation
    const byType = new Map<string, HypergraphNode[]>();
    for (const node of graph.nodes) {
      const existing = byType.get(node.type) || [];
      existing.push(node);
      byType.set(node.type, existing);
    }

    return Array.from(byType.entries()).map(([type, nodes]) => ({
      embedding: this.aggregateEmbeddings(nodes.map((n) => this.embedNode(n))),
      dim: this.config.embeddingDim,
      metadata: {
        source: `nested-${type}`,
        timestamp: new Date().toISOString(),
        confidence: 0.8,
      },
    }));
  }

  private computeConfidence(graph: Hypergraph): number {
    // Confidence based on graph connectivity
    if (graph.nodes.length === 0) return 0;
    const avgEdgesPerNode = graph.edges.length / graph.nodes.length;
    return Math.min(1, avgEdgesPerNode / 3);
  }

  private extractSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  }

  private computeSentenceSalience(sentence: string, fullText: string): number {
    // Simple TF-based salience
    const words = sentence.toLowerCase().split(/\s+/);
    const fullWords = fullText.toLowerCase().split(/\s+/);

    let score = 0;
    for (const word of words) {
      if (word.length > 3) {
        const tf = fullWords.filter((w) => w === word).length / fullWords.length;
        score += tf;
      }
    }

    return Math.min(1, score / words.length);
  }

  private estimateInformationLoss(original: string, summary: string): number {
    // Simple estimation based on word coverage
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const summaryWords = new Set(summary.toLowerCase().split(/\s+/));

    let covered = 0;
    for (const word of originalWords) {
      if (summaryWords.has(word)) covered++;
    }

    return 1 - covered / originalWords.size;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private hashMatch(match: string): string {
    let hash = 0;
    for (let i = 0; i < match.length; i++) {
      hash = (hash << 5) - hash + match.charCodeAt(i);
    }
    return `[HASH:${Math.abs(hash).toString(16).substring(0, 8)}]`;
  }
}

/**
 * Arena event type for graphize input
 */
export interface ArenaEvent {
  id: string;
  type: string;
  content: string;
  source: string;
  timestamp: string;
}

export default CodecPipeline;
