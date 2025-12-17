/**
 * SecureIntegration Module
 *
 * Provides security hardening for cognitive services including:
 * - Input validation and sanitization
 * - Rate limiting
 * - Content filtering
 * - API key management
 * - Audit logging
 */
/**
 * Security configuration
 */
export interface SecurityConfig {
    maxInputLength?: number;
    allowedContentTypes?: string[];
    blockedPatterns?: RegExp[];
    rateLimit?: {
        maxRequests: number;
        windowMs: number;
    };
    contentFilter?: {
        enabled: boolean;
        strictMode?: boolean;
        customFilters?: ContentFilter[];
    };
    auditLog?: {
        enabled: boolean;
        logLevel?: 'minimal' | 'standard' | 'verbose';
    };
    encryption?: {
        enabled: boolean;
        algorithm?: string;
    };
}
/**
 * Content filter definition
 */
export interface ContentFilter {
    name: string;
    pattern: RegExp;
    action: 'block' | 'warn' | 'sanitize';
    replacement?: string;
}
/**
 * Audit log entry
 */
export interface AuditLogEntry {
    id: string;
    timestamp: number;
    action: string;
    userId?: string;
    resource?: string;
    details?: Record<string, any>;
    result: 'success' | 'failure' | 'blocked';
    reason?: string;
}
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    sanitized?: string;
    errors: string[];
    warnings: string[];
}
/**
 * SecureIntegration class for security hardening
 */
export declare class SecureIntegration {
    private config;
    private rateLimitStates;
    private auditLog;
    private encryptionKey;
    private filters;
    constructor(config?: Partial<SecurityConfig>);
    initializeEncryption(key: string | Buffer): void;
    validateInput(input: string, userId?: string): ValidationResult;
    checkRateLimit(clientId: string): {
        allowed: boolean;
        remaining: number;
        resetIn: number;
    };
    encrypt(data: string): {
        encrypted: string;
        iv: string;
        tag: string;
    } | null;
    decrypt(encrypted: string, iv: string, tag: string): string | null;
    hash(data: string, salt?: string): string;
    verifyHash(data: string, hashedData: string): boolean;
    generateApiKey(prefix?: string): string;
    validateApiKey(apiKey: string, prefix?: string): boolean;
    sanitizeOutput(output: string): string;
    encryptData(data: string): string;
    decryptData(encrypted: string): string;
    getAuditLog(options?: {
        startTime?: number;
        endTime?: number;
        action?: string;
        limit?: number;
    }): AuditLogEntry[];
    addContentFilter(filter: ContentFilter): void;
    updateConfig(config: Partial<SecurityConfig>): void;
    resetRateLimits(clientId?: string): void;
    getStats(): {
        auditLogSize: number;
        rateLimitedClients: number;
        activeFilters: number;
        encryptionEnabled: boolean;
    };
}
export declare function createSecureIntegration(options?: Partial<SecurityConfig>): SecureIntegration;
//# sourceMappingURL=SecureIntegration.d.ts.map