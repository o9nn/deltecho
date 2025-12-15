/**
 * Simple logger for Deep Tree Echo Core
 * Provides basic logging functionality independent of runtime
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
}

class SimpleLogger implements Logger {
  constructor(private context: string) {}

  private log(level: LogLevel, ...args: any[]) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`
    console[level === 'debug' ? 'log' : level](prefix, ...args)
  }

  debug(...args: any[]) {
    this.log('debug', ...args)
  }

  info(...args: any[]) {
    this.log('info', ...args)
  }

  warn(...args: any[]) {
    this.log('warn', ...args)
  }

  error(...args: any[]) {
    this.log('error', ...args)
  }
}

/**
 * Get a logger instance for a specific context
 */
export function getLogger(context: string): Logger {
  return new SimpleLogger(context)
}
