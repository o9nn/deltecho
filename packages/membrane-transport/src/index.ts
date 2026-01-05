/**
 * @deltecho/membrane-transport
 *
 * Membrane transport protocol for Deep Tree Echo double-membrane architecture
 */

// Packet types
export * from './packets/types';

// Bus
export {
  MembraneBus,
  MembraneDirection,
  type BusStatistics,
  type MembraneBusConfig,
} from './bus/MembraneBus';

// Policy
export {
  CrossingPolicy,
  type PolicyDecision,
  type BudgetLimits,
  type RiskThresholds,
  type CrossingPolicyConfig,
} from './policy/CrossingPolicy';

// Sys6 integration
export { Sys6MembraneTransport, Sys6Stage } from './sys6/Sys6MembraneTransport';
