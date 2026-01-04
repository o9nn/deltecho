/**
 * Enhanced logger for Deep Tree Echo Core
 * Provides logging with level filtering, structured output, and runtime configuration
 */
// Log level priorities (higher = more severe)
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
// Default configuration
let globalConfig = {
    minLevel: process.env.LOG_LEVEL || 'info',
    enableStructured: process.env.LOG_STRUCTURED === 'true',
    enableTimestamp: true,
    enableColors: process.env.NO_COLOR !== 'true',
};
// ANSI color codes for terminal output
const COLORS = {
    reset: '\x1b[0m',
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
    context: '\x1b[90m', // gray
};
/**
 * Configure the global logger settings
 */
export function configureLogger(config) {
    globalConfig = { ...globalConfig, ...config };
}
/**
 * Get the current logger configuration
 */
export function getLoggerConfig() {
    return { ...globalConfig };
}
class SimpleLogger {
    context;
    constructor(context) {
        this.context = context;
    }
    shouldLog(level) {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[globalConfig.minLevel];
    }
    formatStructured(level, args) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            context: this.context,
            message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
        };
        return JSON.stringify(entry);
    }
    formatPretty(level, args) {
        const parts = [];
        if (globalConfig.enableTimestamp) {
            const timestamp = new Date().toISOString();
            parts.push(globalConfig.enableColors ? `${COLORS.context}${timestamp}${COLORS.reset}` : timestamp);
        }
        const levelStr = level.toUpperCase().padEnd(5);
        if (globalConfig.enableColors) {
            parts.push(`${COLORS[level]}${levelStr}${COLORS.reset}`);
        }
        else {
            parts.push(levelStr);
        }
        const contextStr = `[${this.context}]`;
        parts.push(globalConfig.enableColors ? `${COLORS.context}${contextStr}${COLORS.reset}` : contextStr);
        return parts.join(' ');
    }
    log(level, ...args) {
        if (!this.shouldLog(level))
            return;
        if (globalConfig.enableStructured) {
            const output = this.formatStructured(level, args);
            // Use appropriate console method for structured output
            if (level === 'error') {
                console.error(output);
            }
            else if (level === 'warn') {
                console.warn(output);
            }
            else {
                console.log(output);
            }
        }
        else {
            const prefix = this.formatPretty(level, args);
            if (level === 'error') {
                console.error(prefix, ...args);
            }
            else if (level === 'warn') {
                console.warn(prefix, ...args);
            }
            else {
                console.log(prefix, ...args);
            }
        }
    }
    debug(...args) {
        this.log('debug', ...args);
    }
    info(...args) {
        this.log('info', ...args);
    }
    warn(...args) {
        this.log('warn', ...args);
    }
    error(...args) {
        this.log('error', ...args);
    }
    /**
     * Create a child logger with a sub-context
     */
    child(subContext) {
        return new SimpleLogger(`${this.context}:${subContext}`);
    }
}
/**
 * Get a logger instance for a specific context
 */
export function getLogger(context) {
    return new SimpleLogger(context);
}
//# sourceMappingURL=logger.js.map