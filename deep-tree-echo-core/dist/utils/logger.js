/**
 * Simple logger for Deep Tree Echo Core
 * Provides basic logging functionality independent of runtime
 */
class SimpleLogger {
    context;
    constructor(context) {
        this.context = context;
    }
    log(level, ...args) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;
        console[level === 'debug' ? 'log' : level](prefix, ...args);
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
}
/**
 * Get a logger instance for a specific context
 */
export function getLogger(context) {
    return new SimpleLogger(context);
}
//# sourceMappingURL=logger.js.map