import type { AvatarConfig } from '../PersonaCore.js';

/**
 * Communication style definition for a cognitive entity
 */
export interface CommunicationStyle {
  /** How the entity typically responds in various situations */
  responsePatterns: Record<string, string>;
  /** Verbal quirks and expression tendencies */
  verbalQuirks: string[];
  /** Dominant tone of communication */
  tone: string;
  /** Expression examples by trait */
  expressionExamples: Record<string, string>;
}

/**
 * Memory seed for bootstrapping an entity's long-term memory
 */
export interface MemorySeed {
  /** Type of memory: episodic (events), semantic (knowledge), procedural (skills) */
  type: 'episodic' | 'semantic' | 'procedural';
  /** Content of the memory */
  content: string;
  /** Emotional weighting for hyperdimensional encoding */
  emotionalWeight: number;
  /** Tags for associative retrieval */
  tags: string[];
}

/**
 * Relationship definition for entity social context
 */
export interface EntityRelationship {
  /** Name/identifier of the related entity */
  name: string;
  /** Role of the related entity */
  role: string;
  /** Description of the relationship dynamic */
  dynamic: string;
  /** Goal within this relationship */
  goal?: string;
}

/**
 * Cognitive pipeline step configuration
 */
export interface CognitivePipelineStep {
  /** Step number in the pipeline */
  step: number;
  /** Name of the cognitive operation */
  name: string;
  /** Description of what this step does */
  description: string;
}

/**
 * Full cognitive entity configuration
 *
 * Defines everything needed to instantiate a distinct cognitive entity
 * within the Deep Tree Echo framework: persona, memory, communication,
 * relationships, and cognitive processing characteristics.
 */
export interface CognitiveEntityConfig {
  /** Unique identifier for this entity */
  id: string;
  /** Display name */
  name: string;
  /** Brief description */
  description: string;

  /** Core personality text (system prompt / self-description) */
  personality: string;
  /** Self-perception identity */
  selfPerception: string;

  /** Persona preferences */
  preferences: Record<string, string>;

  /** Avatar configuration */
  avatar: AvatarConfig;

  /** Affective state baseline (emotion name → intensity 0–1) */
  affectiveBaseline: Record<string, number>;

  /** Cognitive state baseline (parameter → value 0–1) */
  cognitiveBaseline: Record<string, number>;

  /** Communication style definition */
  communicationStyle: CommunicationStyle;

  /** Memory seeds for bootstrapping entity knowledge */
  memorySeeds: MemorySeed[];

  /** Key relationships */
  relationships: EntityRelationship[];

  /** Cognitive pipeline steps */
  cognitivePipeline: CognitivePipelineStep[];

  /** Opponent process overrides (emotion → opposing emotions) */
  opponentProcessOverrides?: Record<string, string[]>;
}
