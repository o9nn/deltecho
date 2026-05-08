/**
 * @fileoverview Telemetry Module
 *
 * Exports the Telemetry Monitor and related types for
 * real-time system monitoring.
 */

export {
  TelemetryMonitor,
  TelemetryConfig,
  TelemetrySnapshot,
  Metric,
  MetricDataPoint,
  HealthStatus,
  Alert,
} from './TelemetryMonitor.js';

export {
  GlobalWorkspaceBroadcaster,
  type GlobalWorkspaceSnapshot,
  type Dove9CognitiveState,
  type GrandCycleInfo,
  type SnapshotSubscriber,
} from './GlobalWorkspaceBroadcaster.js';

export { default } from './TelemetryMonitor.js';
