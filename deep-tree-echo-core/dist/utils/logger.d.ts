/**
 * Enhanced logger for Deep Tree Echo Core
 * Provides logging with level filtering, structured output, and runtime configuration
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface Logger {
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    child: (subContext: string) => Logger;
}
export interface LoggerConfig {
    minLevel: LogLevel;
    enableStructured: boolean;
    enableTimestamp: boolean;
    enableColors: boolean;
}
/**
 * Configure the global logger settings
 */
export declare function configureLogger(config: Partial<LoggerConfig>): void;
/**
 * Get the current logger configuration
 */
export declare function getLoggerConfig(): LoggerConfig;
/**
 * Get a logger instance for a specific context
 */
export declare function getLogger(context: string): Logger;
//# sourceMappingURL=logger.d.ts.map