/**
 * Unified cognitive system types
 */

import type { MessageProcess, CognitiveContext } from 'dove9';

/**
 * Deep Tree Echo bot configuration
 */
export interface DeepTreeEchoBotConfig {
  enabled: boolean;
  enableAsMainUser: boolean;
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  cognitiveKeys?: CognitiveKeys;
  useParallelProcessing?: boolean;
  memoryPersistence?: 'local' | 'remote' | 'hybrid';
  provider?: 'openai' | 'anthropic' | 'ollama' | 'custom';
}

/**
 * Multi-provider API keys for cognitive services
 */
export interface CognitiveKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  mistral?: string;
  local?: string;
}

/**
 * Unified message format across all cognitive subsystems
 */
export interface UnifiedMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  metadata?: MessageMetadata;
  dove9Message?: MessageProcess;
}

/**
 * Message metadata for cognitive processing
 */
export interface MessageMetadata {
  chatId?: number;
  accountId?: number;
  contactId?: number;
  isBot?: boolean;
  replyTo?: string;
  cognitivePhase?: 'sense' | 'process' | 'act';
  sentiment?: {
    valence: number;
    arousal: number;
  };
  sys6Telemetry?: {
    cycleNumber: number;
    processingTimeMs: number;
    steps: number;
    mode: string;
  };
}

/**
 * Unified cognitive state across all subsystems
 */
export interface UnifiedCognitiveState {
  // Cognitive context from dove9
  cognitiveContext?: CognitiveContext;
  // Subsystem states
  persona: PersonaState;
  memories: MemoryState;
  reasoning: ReasoningState;
}

/**
 * Persona state for personality management
 */
export interface PersonaState {
  name: string;
  traits: string[];
  currentMood: string;
  interactionStyle: 'formal' | 'casual' | 'technical' | 'creative';
  lastUpdated: number;
}

/**
 * Memory state for RAG and hyperdimensional storage
 */
export interface MemoryState {
  shortTerm: Array<{
    content: string;
    embedding?: number[];
    timestamp: number;
    type?: 'message' | 'context' | 'reflection';
  }>;
  longTerm: {
    episodic: number;
    semantic: number;
    procedural: number;
  };
  reflections: string[];
}

/**
 * Reasoning state from AGI kernel
 */
export interface ReasoningState {
  atomspaceSize: number;
  activeGoals: string[];
  attentionFocus: string[];
  confidenceLevel: number;
}

/**
 * Event types emitted by the cognitive system
 */
export type CognitiveEvent =
  | { type: 'message_received'; payload: UnifiedMessage }
  | { type: 'response_generated'; payload: UnifiedMessage }
  | { type: 'memory_updated'; payload: MemoryState }
  | { type: 'persona_changed'; payload: PersonaState }
  | { type: 'reasoning_complete'; payload: ReasoningState }
  | { type: 'error'; payload: { message: string; code: string } };
