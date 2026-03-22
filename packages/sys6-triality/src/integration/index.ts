/**
 * @fileoverview Integration layer for Sys6 Triality
 */

export * from './LLMIntegration.js';
export {
  Sys6Dove9Synchronizer,
  SYS6_CYCLE_LENGTH,
  DOVE9_CYCLE_LENGTH,
  GRAND_CYCLE_LENGTH,
  type Dove9KernelInterface,
  type Dove9Metrics,
  type Sys6Dove9SynchronizerConfig,
  type SyncPoint,
  type GrandCycleState,
  type OperadicScheduleResult,
  type SynchronizerEvent,
} from './Sys6Dove9Synchronizer.js';
