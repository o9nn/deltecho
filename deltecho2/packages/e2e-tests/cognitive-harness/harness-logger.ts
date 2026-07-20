/**
 * Minimal logger stub used only when bundling the cognitive harness.
 *
 * The real `@deltachat-desktop/shared/logger` pulls in the platform runtime,
 * which is not present in a standalone browser bundle. The cognitive modules
 * only use `getLogger(...).info/debug/warn/error`, so a console-backed shim is
 * a faithful, dependency-free stand-in for the harness.
 */

type LogFn = (...args: unknown[]) => void

export interface Logger {
  debug: LogFn
  info: LogFn
  warn: LogFn
  error: LogFn
  critical: LogFn
}

export function getLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`
  return {
    debug: (...a) => console.debug(prefix, ...a),
    info: (...a) => console.info(prefix, ...a),
    warn: (...a) => console.warn(prefix, ...a),
    error: (...a) => console.error(prefix, ...a),
    critical: (...a) => console.error(prefix, ...a),
  }
}
