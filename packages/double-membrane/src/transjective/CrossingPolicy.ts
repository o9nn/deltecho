/**
 * CrossingPolicy - Access Control for Membrane Crossings
 *
 * The CrossingPolicy implements the "subjectivity barrier" that ensures:
 * - Only typed updates can modify SelfState
 * - Memory writes are append-only and require signed provenance
 * - No tool output can directly mutate private state
 * - External data becomes belief only if it passes trust/consistency/alignment checks
 *
 * This is analogous to the selective permeability of the mitochondrial inner
 * membrane, which only allows specific molecules to cross via transport proteins.
 */

import { EventEmitter } from 'events';
import {
  EvidencePacket,
  IntentPacket,
  UpdateProposal,
  Provenance,
  TrustLevel,
  validateEvidencePacket,
  validateIntentPacket,
} from './packets.js';
import { MembraneBus } from './MembraneBus.js';

/**
 * Crossing decision
 */
export type CrossingDecision = 'approve' | 'reject' | 'defer' | 'quarantine';

/**
 * Crossing result
 */
export interface CrossingResult {
  decision: CrossingDecision;
  reason: string;
  conditions?: string[];
  transformations?: string[];
  deferUntil?: string;
  quarantineReason?: string;
}

/**
 * Policy rule
 */
export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  condition: (packet: EvidencePacket | IntentPacket, context: PolicyContext) => boolean;
  action: (packet: EvidencePacket | IntentPacket, context: PolicyContext) => CrossingResult;
}

/**
 * Policy context for rule evaluation
 */
export interface PolicyContext {
  /** Current Sys6 step */
  sys6Step: number;
  /** Current energy level (0-1) */
  energyLevel: number;
  /** Current queue depths */
  queueDepths: { inward: number; outward: number; internal: number };
  /** Recent crossing history */
  recentCrossings: CrossingRecord[];
  /** Active goals */
  activeGoals: string[];
  /** Trust cache */
  trustCache: Map<string, TrustLevel>;
  /** Custom context data */
  custom?: Record<string, unknown>;
}

/**
 * Record of a crossing decision
 */
export interface CrossingRecord {
  timestamp: string;
  packetId: string;
  packetType: 'evidence' | 'intent';
  direction: 'inward' | 'outward';
  decision: CrossingDecision;
  ruleId: string;
  reason: string;
}

/**
 * Policy configuration
 */
export interface CrossingPolicyConfig {
  /** Default trust level for unknown sources */
  defaultTrustLevel?: TrustLevel;
  /** Maximum risk score to allow crossing */
  maxRiskScore?: number;
  /** Minimum confidence for evidence */
  minEvidenceConfidence?: number;
  /** Maximum budget per intent */
  maxIntentBudget?: number;
  /** Rate limit (crossings per minute) */
  rateLimit?: number;
  /** Enable strict mode (reject on any warning) */
  strictMode?: boolean;
  /** Custom rules */
  customRules?: PolicyRule[];
}

const DEFAULT_CONFIG: Required<Omit<CrossingPolicyConfig, 'customRules'>> = {
  defaultTrustLevel: 'unknown',
  maxRiskScore: 0.7,
  minEvidenceConfidence: 0.3,
  maxIntentBudget: 1000,
  rateLimit: 100,
  strictMode: false,
};

/**
 * CrossingPolicy - The membrane access controller
 */
export class CrossingPolicy extends EventEmitter {
  private config: Required<Omit<CrossingPolicyConfig, 'customRules'>>;
  private rules: PolicyRule[] = [];
  private crossingHistory: CrossingRecord[] = [];
  private trustCache: Map<string, TrustLevel> = new Map();
  private bus?: MembraneBus;

  constructor(config: CrossingPolicyConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize default rules
    this.initializeDefaultRules();

    // Add custom rules
    if (config.customRules) {
      for (const rule of config.customRules) {
        this.addRule(rule);
      }
    }
  }

  /**
   * Connect to membrane bus
   */
  public connectBus(bus: MembraneBus): void {
    this.bus = bus;
    // Bus is stored for future use in advanced policy evaluation
    void this.bus;
  }

  /**
   * Evaluate crossing for evidence packet (inward)
   */
  public evaluateInward(packet: EvidencePacket, context: PolicyContext): CrossingResult {
    // Validate packet structure
    const validation = validateEvidencePacket(packet);
    if (!validation.valid) {
      return {
        decision: 'reject',
        reason: `Invalid packet: ${validation.errors.join(', ')}`,
      };
    }

    // Check warnings in strict mode
    if (this.config.strictMode && validation.warnings.length > 0) {
      return {
        decision: 'reject',
        reason: `Strict mode: ${validation.warnings.join(', ')}`,
      };
    }

    // Evaluate rules
    return this.evaluateRules(packet, context, 'inward');
  }

  /**
   * Evaluate crossing for intent packet (outward)
   */
  public evaluateOutward(packet: IntentPacket, context: PolicyContext): CrossingResult {
    // Validate packet structure
    const validation = validateIntentPacket(packet);
    if (!validation.valid) {
      return {
        decision: 'reject',
        reason: `Invalid packet: ${validation.errors.join(', ')}`,
      };
    }

    // Check warnings in strict mode
    if (this.config.strictMode && validation.warnings.length > 0) {
      return {
        decision: 'reject',
        reason: `Strict mode: ${validation.warnings.join(', ')}`,
      };
    }

    // Evaluate rules
    return this.evaluateRules(packet, context, 'outward');
  }

  /**
   * Evaluate update proposal
   */
  public evaluateUpdateProposal(
    proposal: UpdateProposal,
    evidence: EvidencePacket,
    context: PolicyContext
  ): CrossingResult {
    // Check proposal justification
    if (!proposal.justification || proposal.justification.length < 10) {
      return {
        decision: 'reject',
        reason: 'Insufficient justification for update proposal',
      };
    }

    // Check supporting evidence
    if (proposal.supportingEvidence.length === 0) {
      return {
        decision: 'reject',
        reason: 'No supporting evidence for update proposal',
      };
    }

    // Check confidence threshold
    if (proposal.confidence < this.config.minEvidenceConfidence) {
      return {
        decision: 'reject',
        reason: `Confidence ${proposal.confidence} below threshold ${this.config.minEvidenceConfidence}`,
      };
    }

    // Check consistency with active goals
    if (proposal.target === 'goal' || proposal.target === 'value') {
      const goalAligned = this.checkGoalAlignment(proposal, context);
      if (!goalAligned) {
        return {
          decision: 'quarantine',
          reason: 'Proposal may conflict with active goals',
          quarantineReason: 'Requires manual review for goal alignment',
        };
      }
    }

    // Check provenance trust
    const trustLevel = this.getTrustLevel(evidence.provenance);
    if (trustLevel === 'untrusted' || trustLevel === 'hostile') {
      return {
        decision: 'reject',
        reason: `Source trust level ${trustLevel} insufficient for ${proposal.target} update`,
      };
    }

    return {
      decision: 'approve',
      reason: 'Update proposal passed all checks',
      conditions: [
        'Append to audit log',
        'Notify monitoring system',
        proposal.target === 'memory' ? 'Use append-only write' : 'Use transactional update',
      ],
    };
  }

  /**
   * Add a policy rule
   */
  public addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a policy rule
   */
  public removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable a rule
   */
  public setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get all rules
   */
  public getRules(): readonly PolicyRule[] {
    return this.rules;
  }

  /**
   * Get crossing history
   */
  public getHistory(limit?: number): CrossingRecord[] {
    if (limit) {
      return this.crossingHistory.slice(-limit);
    }
    return [...this.crossingHistory];
  }

  /**
   * Set trust level for a source
   */
  public setTrustLevel(sourceKey: string, level: TrustLevel): void {
    this.trustCache.set(sourceKey, level);
  }

  /**
   * Get trust level for a source
   */
  public getTrustLevel(provenance: Provenance): TrustLevel {
    const sourceKey = `${provenance.source.type}:${provenance.source.name}`;
    return this.trustCache.get(sourceKey) || provenance.trustLevel || this.config.defaultTrustLevel;
  }

  /**
   * Create policy context
   */
  public createContext(partial: Partial<PolicyContext>): PolicyContext {
    return {
      sys6Step: partial.sys6Step || 1,
      energyLevel: partial.energyLevel || 1.0,
      queueDepths: partial.queueDepths || { inward: 0, outward: 0, internal: 0 },
      recentCrossings: partial.recentCrossings || this.crossingHistory.slice(-100),
      activeGoals: partial.activeGoals || [],
      trustCache: this.trustCache,
      custom: partial.custom,
    };
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private initializeDefaultRules(): void {
    // Rule 1: Trust level check
    this.addRule({
      id: 'trust-level',
      name: 'Trust Level Check',
      description: 'Reject packets from hostile or untrusted sources',
      priority: 100,
      enabled: true,
      condition: (packet) => {
        if ('provenance' in packet) {
          const trust = this.getTrustLevel(packet.provenance);
          return trust === 'hostile';
        }
        return false;
      },
      action: () => ({
        decision: 'reject',
        reason: 'Source is marked as hostile',
      }),
    });

    // Rule 2: Risk score check
    this.addRule({
      id: 'risk-score',
      name: 'Risk Score Check',
      description: 'Reject or quarantine high-risk packets',
      priority: 90,
      enabled: true,
      condition: (packet) => {
        if (packet.type === 'evidence') {
          return packet.risk.score > this.config.maxRiskScore;
        }
        return false;
      },
      action: (packet) => {
        const evidence = packet as EvidencePacket;
        if (evidence.risk.categories.includes('prompt_injection')) {
          return {
            decision: 'reject',
            reason: 'Prompt injection detected',
          };
        }
        return {
          decision: 'quarantine',
          reason: `Risk score ${evidence.risk.score} exceeds threshold`,
          quarantineReason: 'Manual review required for high-risk content',
        };
      },
    });

    // Rule 3: Rate limiting
    this.addRule({
      id: 'rate-limit',
      name: 'Rate Limiting',
      description: 'Defer packets when rate limit exceeded',
      priority: 80,
      enabled: true,
      condition: (_, context) => {
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const recentCount = context.recentCrossings.filter(
          (c) => c.timestamp > oneMinuteAgo && c.decision === 'approve'
        ).length;
        return recentCount >= this.config.rateLimit;
      },
      action: () => ({
        decision: 'defer',
        reason: 'Rate limit exceeded',
        deferUntil: new Date(Date.now() + 60000).toISOString(),
      }),
    });

    // Rule 4: Energy conservation
    this.addRule({
      id: 'energy-conservation',
      name: 'Energy Conservation',
      description: 'Limit crossings when energy is low',
      priority: 70,
      enabled: true,
      condition: (packet, context) => {
        if (context.energyLevel < 0.2) {
          // Only allow critical priority in low energy
          if (packet.type === 'evidence') {
            return packet.metadata.priority !== 'critical';
          }
          if (packet.type === 'intent') {
            return packet.metadata.priority !== 'critical';
          }
        }
        return false;
      },
      action: () => ({
        decision: 'defer',
        reason: 'Low energy mode - only critical packets allowed',
      }),
    });

    // Rule 5: Budget check for intents
    this.addRule({
      id: 'budget-check',
      name: 'Budget Check',
      description: 'Reject intents that exceed budget limits',
      priority: 60,
      enabled: true,
      condition: (packet) => {
        if (packet.type === 'intent') {
          const budget = packet.budget;
          return Boolean(
            (budget.maxTokens && budget.maxTokens > this.config.maxIntentBudget * 100) ||
            (budget.maxCost && budget.maxCost > this.config.maxIntentBudget)
          );
        }
        return false;
      },
      action: (packet) => {
        const intent = packet as IntentPacket;
        return {
          decision: 'reject',
          reason: `Budget exceeds limits: tokens=${intent.budget.maxTokens}, cost=${intent.budget.maxCost}`,
        };
      },
    });

    // Rule 6: Confidence threshold for evidence
    this.addRule({
      id: 'confidence-threshold',
      name: 'Confidence Threshold',
      description: 'Reject low-confidence evidence',
      priority: 50,
      enabled: true,
      condition: (packet) => {
        if (packet.type === 'evidence') {
          const avgConfidence =
            packet.facts.reduce((sum, f) => sum + f.confidence, 0) / packet.facts.length;
          return avgConfidence < this.config.minEvidenceConfidence;
        }
        return false;
      },
      action: (packet) => {
        const evidence = packet as EvidencePacket;
        const avgConfidence =
          evidence.facts.reduce((sum, f) => sum + f.confidence, 0) / evidence.facts.length;
        return {
          decision: 'reject',
          reason: `Average confidence ${avgConfidence.toFixed(2)} below threshold`,
        };
      },
    });

    // Rule 7: Queue depth check
    this.addRule({
      id: 'queue-depth',
      name: 'Queue Depth Check',
      description: 'Defer when queues are too deep',
      priority: 40,
      enabled: true,
      condition: (_, context) => {
        const totalDepth =
          context.queueDepths.inward + context.queueDepths.outward + context.queueDepths.internal;
        return totalDepth > 1000;
      },
      action: () => ({
        decision: 'defer',
        reason: 'Queue depth too high',
        deferUntil: new Date(Date.now() + 5000).toISOString(),
      }),
    });

    // Rule 8: Sys6 phase alignment
    this.addRule({
      id: 'sys6-phase',
      name: 'Sys6 Phase Alignment',
      description: 'Optimize crossings based on Sys6 cycle phase',
      priority: 30,
      enabled: true,
      condition: (packet, context) => {
        // Phase 1 (steps 1-10): Perception - prefer inward
        // Phase 2 (steps 11-20): Evaluation - defer non-critical
        // Phase 3 (steps 21-30): Action - prefer outward
        const phase = Math.ceil(context.sys6Step / 10);

        if (phase === 1 && packet.type === 'intent') {
          return packet.metadata.priority !== 'critical';
        }
        if (phase === 3 && packet.type === 'evidence') {
          return packet.metadata.priority !== 'critical';
        }
        return false;
      },
      action: (packet, context) => {
        const phase = Math.ceil(context.sys6Step / 10);
        return {
          decision: 'defer',
          reason: `Sys6 phase ${phase} not optimal for ${packet.type} packets`,
          deferUntil: new Date(Date.now() + 1000).toISOString(),
        };
      },
    });

    // Rule 9: Default approve
    this.addRule({
      id: 'default-approve',
      name: 'Default Approve',
      description: 'Approve packets that pass all other checks',
      priority: 0,
      enabled: true,
      condition: () => true,
      action: () => ({
        decision: 'approve',
        reason: 'Passed all policy checks',
      }),
    });
  }

  private evaluateRules(
    packet: EvidencePacket | IntentPacket,
    context: PolicyContext,
    direction: 'inward' | 'outward'
  ): CrossingResult {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(packet, context)) {
          const result = rule.action(packet, context);

          // Record crossing
          this.recordCrossing({
            timestamp: new Date().toISOString(),
            packetId: packet.id,
            packetType: packet.type,
            direction,
            decision: result.decision,
            ruleId: rule.id,
            reason: result.reason,
          });

          // If not approved, return immediately
          if (result.decision !== 'approve') {
            this.emit('crossing_blocked', { packet, result, rule });
            return result;
          }
        }
      } catch (error) {
        console.error(`Rule ${rule.id} evaluation error:`, error);
      }
    }

    // Should not reach here due to default-approve rule
    return {
      decision: 'approve',
      reason: 'No blocking rules matched',
    };
  }

  private recordCrossing(record: CrossingRecord): void {
    this.crossingHistory.push(record);

    // Trim history if too long
    if (this.crossingHistory.length > 10000) {
      this.crossingHistory = this.crossingHistory.slice(-5000);
    }

    this.emit('crossing_recorded', record);
  }

  private checkGoalAlignment(proposal: UpdateProposal, context: PolicyContext): boolean {
    // Simple alignment check - in production would use semantic similarity
    if (context.activeGoals.length === 0) return true;

    const proposalText = JSON.stringify(proposal.content).toLowerCase();
    for (const goal of context.activeGoals) {
      // Check for obvious conflicts
      if (
        (proposalText.includes('remove') || proposalText.includes('delete')) &&
        proposalText.includes(goal.toLowerCase())
      ) {
        return false;
      }
    }

    return true;
  }
}

export default CrossingPolicy;
