/**
 * Crossing Policy
 *
 * Enforces rules for packets crossing membrane boundaries
 * Implements the "subjectivity barrier" - outer can suggest, never commit
 */

import { Packet, EvidencePacket, IntentPacket, Cost, Risk } from '../packets/types';

/**
 * Policy decision result
 */
export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  modifications?: Partial<Packet>;
  warnings: string[];
}

/**
 * Budget limits
 */
export interface BudgetLimits {
  maxCompute: number;
  maxTime: number;
  maxEnergy: number;
  maxMoney: number;
  maxMemory: number;
}

/**
 * Risk thresholds
 */
export interface RiskThresholds {
  maxPrivacy: number;
  maxInjection: number;
  maxExfiltration: number;
  allowedLevels: Array<'low' | 'medium' | 'high' | 'critical'>;
}

/**
 * Crossing Policy Configuration
 */
export interface CrossingPolicyConfig {
  /** Budget limits for resource consumption */
  budgetLimits: BudgetLimits;

  /** Risk thresholds for security */
  riskThresholds: RiskThresholds;

  /** Allowed tools for intent packets */
  allowedTools: string[];

  /** Allowed data types for evidence packets */
  allowedDataTypes: string[];

  /** Enforce provenance requirement */
  requireProvenance: boolean;

  /** Enforce signature verification */
  requireSignature: boolean;

  /** Maximum packet age in milliseconds */
  maxPacketAge: number;
}

/**
 * Default policy configuration
 */
const DEFAULT_CONFIG: CrossingPolicyConfig = {
  budgetLimits: {
    maxCompute: 1000000,
    maxTime: 60000, // 60 seconds
    maxEnergy: 1000,
    maxMoney: 1.0,
    maxMemory: 1024 * 1024 * 100, // 100MB
  },
  riskThresholds: {
    maxPrivacy: 0.7,
    maxInjection: 0.5,
    maxExfiltration: 0.5,
    allowedLevels: ['low', 'medium'],
  },
  allowedTools: ['*'], // Allow all by default
  allowedDataTypes: ['*'], // Allow all by default
  requireProvenance: true,
  requireSignature: false,
  maxPacketAge: 300000, // 5 minutes
};

/**
 * Crossing Policy
 *
 * Enforces membrane boundary rules
 */
export class CrossingPolicy {
  private config: CrossingPolicyConfig;

  constructor(config: Partial<CrossingPolicyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Evaluate if an evidence packet can cross inward
   */
  evaluateInward(packet: EvidencePacket): PolicyDecision {
    const warnings: string[] = [];

    // Check provenance
    if (this.config.requireProvenance && !packet.provenance) {
      return {
        allowed: false,
        reason: 'Evidence packet missing required provenance',
        warnings,
      };
    }

    // Check signature
    if (this.config.requireSignature && !packet.provenance?.signature) {
      return {
        allowed: false,
        reason: 'Evidence packet missing required signature',
        warnings,
      };
    }

    // Check packet age
    const age = Date.now() - packet.provenance.timestamp;
    if (age > this.config.maxPacketAge) {
      return {
        allowed: false,
        reason: `Packet too old: ${age}ms > ${this.config.maxPacketAge}ms`,
        warnings,
      };
    }

    // Check cost limits
    const costCheck = this.checkCostLimits(packet.cost);
    if (!costCheck.allowed) {
      return costCheck;
    }
    warnings.push(...costCheck.warnings);

    // Check risk thresholds
    const riskCheck = this.checkRiskThresholds(packet.risk);
    if (!riskCheck.allowed) {
      return riskCheck;
    }
    warnings.push(...riskCheck.warnings);

    // Check for auto-apply attempts (forbidden)
    if (packet.proposedUpdates && packet.proposedUpdates.length > 0) {
      warnings.push('Proposed updates will not be auto-applied (subjectivity barrier)');
    }

    return {
      allowed: true,
      warnings,
    };
  }

  /**
   * Evaluate if an intent packet can cross outward
   */
  evaluateOutward(packet: IntentPacket): PolicyDecision {
    const warnings: string[] = [];

    // Check budget limits
    const budgetCheck = this.checkCostLimits(packet.budget);
    if (!budgetCheck.allowed) {
      return budgetCheck;
    }
    warnings.push(...budgetCheck.warnings);

    // Check allowed tools
    const toolCheck = this.checkAllowedTools(packet.allowedTools);
    if (!toolCheck.allowed) {
      return toolCheck;
    }
    warnings.push(...toolCheck.warnings);

    // Check redaction policy
    if (!packet.redactionPolicy.redact_embeddings) {
      warnings.push('Embeddings are not redacted - privacy risk');
    }
    if (!packet.redactionPolicy.redact_private_memory) {
      warnings.push('Private memory is not redacted - privacy risk');
    }

    // Check data types
    const dataTypeCheck = this.checkAllowedDataTypes(packet.redactionPolicy.allowed_data_types);
    if (!dataTypeCheck.allowed) {
      return dataTypeCheck;
    }
    warnings.push(...dataTypeCheck.warnings);

    return {
      allowed: true,
      warnings,
    };
  }

  /**
   * Check if cost is within budget limits
   */
  private checkCostLimits(cost: Cost): PolicyDecision {
    const warnings: string[] = [];

    if (cost.compute > this.config.budgetLimits.maxCompute) {
      return {
        allowed: false,
        reason: `Compute cost ${cost.compute} exceeds limit ${this.config.budgetLimits.maxCompute}`,
        warnings,
      };
    }

    if (cost.time > this.config.budgetLimits.maxTime) {
      return {
        allowed: false,
        reason: `Time cost ${cost.time}ms exceeds limit ${this.config.budgetLimits.maxTime}ms`,
        warnings,
      };
    }

    if (cost.energy > this.config.budgetLimits.maxEnergy) {
      return {
        allowed: false,
        reason: `Energy cost ${cost.energy} exceeds limit ${this.config.budgetLimits.maxEnergy}`,
        warnings,
      };
    }

    if (cost.money && cost.money > this.config.budgetLimits.maxMoney) {
      return {
        allowed: false,
        reason: `Money cost ${cost.money} exceeds limit ${this.config.budgetLimits.maxMoney}`,
        warnings,
      };
    }

    if (cost.memory > this.config.budgetLimits.maxMemory) {
      return {
        allowed: false,
        reason: `Memory cost ${cost.memory} exceeds limit ${this.config.budgetLimits.maxMemory}`,
        warnings,
      };
    }

    // Warnings for high usage
    if (cost.compute > this.config.budgetLimits.maxCompute * 0.8) {
      warnings.push('Compute cost approaching limit');
    }
    if (cost.time > this.config.budgetLimits.maxTime * 0.8) {
      warnings.push('Time cost approaching limit');
    }

    return {
      allowed: true,
      warnings,
    };
  }

  /**
   * Check if risk is within thresholds
   */
  private checkRiskThresholds(risk: Risk): PolicyDecision {
    const warnings: string[] = [];

    if (risk.privacy > this.config.riskThresholds.maxPrivacy) {
      return {
        allowed: false,
        reason: `Privacy risk ${risk.privacy} exceeds threshold ${this.config.riskThresholds.maxPrivacy}`,
        warnings,
      };
    }

    if (risk.injection > this.config.riskThresholds.maxInjection) {
      return {
        allowed: false,
        reason: `Injection risk ${risk.injection} exceeds threshold ${this.config.riskThresholds.maxInjection}`,
        warnings,
      };
    }

    if (risk.exfiltration > this.config.riskThresholds.maxExfiltration) {
      return {
        allowed: false,
        reason: `Exfiltration risk ${risk.exfiltration} exceeds threshold ${this.config.riskThresholds.maxExfiltration}`,
        warnings,
      };
    }

    if (!this.config.riskThresholds.allowedLevels.includes(risk.level)) {
      return {
        allowed: false,
        reason: `Risk level ${risk.level} not in allowed levels: ${this.config.riskThresholds.allowedLevels.join(', ')}`,
        warnings,
      };
    }

    // Warnings for elevated risk
    if (risk.privacy > this.config.riskThresholds.maxPrivacy * 0.8) {
      warnings.push('Privacy risk elevated');
    }
    if (risk.injection > this.config.riskThresholds.maxInjection * 0.8) {
      warnings.push('Injection risk elevated');
    }

    return {
      allowed: true,
      warnings,
    };
  }

  /**
   * Check if tools are allowed
   */
  private checkAllowedTools(tools: string[]): PolicyDecision {
    const warnings: string[] = [];

    // If wildcard, allow all
    if (this.config.allowedTools.includes('*')) {
      return { allowed: true, warnings };
    }

    // Check each tool
    for (const tool of tools) {
      if (!this.config.allowedTools.includes(tool)) {
        return {
          allowed: false,
          reason: `Tool ${tool} not in allowed tools: ${this.config.allowedTools.join(', ')}`,
          warnings,
        };
      }
    }

    return { allowed: true, warnings };
  }

  /**
   * Check if data types are allowed
   */
  private checkAllowedDataTypes(dataTypes: string[]): PolicyDecision {
    const warnings: string[] = [];

    // If wildcard, allow all
    if (this.config.allowedDataTypes.includes('*')) {
      return { allowed: true, warnings };
    }

    // Check each data type
    for (const dataType of dataTypes) {
      if (!this.config.allowedDataTypes.includes(dataType)) {
        return {
          allowed: false,
          reason: `Data type ${dataType} not in allowed types: ${this.config.allowedDataTypes.join(', ')}`,
          warnings,
        };
      }
    }

    return { allowed: true, warnings };
  }

  /**
   * Update policy configuration
   */
  updateConfig(config: Partial<CrossingPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CrossingPolicyConfig {
    return { ...this.config };
  }
}
