/**
 * Simple logger for Deep Tree Echo Core
 * Provides basic logging functionality independent of runtime
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface Logger {
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
}
/**
 * Get a logger instance for a specific context
 */
export declare function getLogger(context: string): Logger;
//# sourceMappingURL=logger.d.ts.map