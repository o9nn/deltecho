/**
 * @fileoverview IPC Type Definitions
 *
 * Extended types for cognitive IPC handlers and WebSocket server.
 * These types define the message shapes for cognitive operations.
 */

// Re-export base types from server
export { IPCMessageType, type IPCMessage } from './server.js';

// Extended message types for cognitive operations (string-based, compatible with IPCMessageType)
export const CognitiveMessageType = {
  COGNITIVE_PROCESS: 'cognitive_process',
  COGNITIVE_QUICK_PROCESS: 'cognitive_quick_process',
  COGNITIVE_GET_STATE: 'cognitive_get_state',
  COGNITIVE_GET_EMOTIONAL_STATE: 'cognitive_get_emotional_state',
  COGNITIVE_UPDATE_EMOTIONAL_STATE: 'cognitive_update_emotional_state',
  COGNITIVE_GET_HISTORY: 'cognitive_get_history',
  COGNITIVE_EXPORT: 'cognitive_export',
  COGNITIVE_IMPORT: 'cognitive_import',
  COGNITIVE_GET_STATISTICS: 'cognitive_get_statistics',
  MEMORY_SEARCH: 'memory_search',
  MEMORY_STORE: 'memory_store',
  MEMORY_GET_CONTEXT: 'memory_get_context',
  MEMORY_CLEAR: 'memory_clear',
  PERSONA_GET: 'persona_get',
  PERSONA_UPDATE: 'persona_update',
  PERSONA_GET_EMOTIONAL_STATE: 'persona_get_emotional_state',
  PERSONA_GET_COGNITIVE_STATE: 'persona_get_cognitive_state',
  EVENT: 'event',
} as const;

export interface CognitiveProcessRequest {
  input: string;
  context?: Record<string, unknown>;
  options?: Record<string, unknown>;
  chatId?: string;
}

export interface CognitiveProcessResponse {
  output: string;
  confidence: number;
  processingTime: number;
  metadata?: Record<string, unknown>;
}

export interface CognitiveQuickProcessRequest {
  input: string;
  maxTokens?: number;
  chatId?: string;
}

export interface CognitiveStateSnapshot {
  cognitiveLoad: number;
  emotionalValence: number;
  memoryUtilization: number;
  activeProcesses: number;
  timestamp: number;
}

export interface EmotionalStateSnapshot {
  valence: number;
  arousal: number;
  dominance: number;
  primaryEmotion: string;
  timestamp: number;
  joy?: number;
  sadness?: number;
  anger?: number;
  fear?: number;
  surprise?: number;
  disgust?: number;
  trust?: number;
  anticipation?: number;
  [key: string]: unknown;
}

export interface EmotionalStateUpdateRequest {
  valence?: number;
  arousal?: number;
  dominance?: number;
  trigger?: string;
}

export interface GetHistoryRequest {
  limit?: number;
  offset?: number;
  chatId?: string;
}

export interface GetHistoryResponse {
  messages: Array<{ role: string; content: string; timestamp: number }>;
  total: number;
}

export interface ExportConversationRequest {
  chatId: string;
  format?: 'json' | 'markdown' | 'text';
}

export interface ExportConversationResponse {
  data: string;
  format: string;
  messageCount: number;
  messages?: Array<{ role: string; content: string; timestamp: number }>;
  [key: string]: unknown;
}

export interface ImportConversationRequest {
  data: string;
  format: 'json' | 'markdown';
  chatId?: string;
  messages?: Array<{ role: string; content: string }>;
}

export interface CognitiveStatistics {
  totalProcessed: number;
  averageLatency: number;
  errorRate: number;
  uptime: number;
  messagesProcessed?: number;
  [key: string]: unknown;
}

export interface MemorySearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  chatId?: string;
}

export interface MemorySearchResponse {
  results: Array<{ content: string; score: number; metadata?: Record<string, unknown> }>;
  total: number;
  totalFound?: number;
}

export interface MemoryStoreRequest {
  content: string;
  metadata?: Record<string, unknown>;
  type?: string;
  chatId?: string;
}

export interface MemoryStoreResponse {
  id: string;
  stored: boolean;
}

export interface MemoryContextRequest {
  query: string;
  maxTokens?: number;
  chatId?: string;
  limit?: number;
}

export interface MemoryContextResponse {
  context: string;
  sources: string | string[];
}

export interface PersonaInfo {
  name: string;
  description: string;
  traits: string[];
  energy: number;
  coherence: number;
  personality?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PersonaUpdateRequest {
  name?: string;
  traits?: string[];
  energy?: number;
  personality?: Record<string, unknown>;
}

export interface IPCResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}
