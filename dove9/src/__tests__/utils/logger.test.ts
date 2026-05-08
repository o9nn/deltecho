/**
 * Tests for dovecho-core logger utility
 * Targets uncovered branches: colors disabled path, setLogLevel, child logger,
 * warn/error log paths, and level filtering.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getLogger, setLogLevel } from '../../utils/logger.js';

describe('logger', () => {
  afterEach(() => {
    // Reset to default level after each test
    setLogLevel('info');
    jest.restoreAllMocks();
  });

  describe('getLogger', () => {
    it('should create a logger instance', () => {
      const logger = getLogger('test');
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.child).toBe('function');
    });

    it('should create independent loggers with different contexts', () => {
      const logger1 = getLogger('ctx1');
      const logger2 = getLogger('ctx2');
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('setLogLevel', () => {
    it('should allow debug messages when level is debug', () => {
      setLogLevel('debug');
      const logger = getLogger('setLevel');
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      logger.debug('debug message');
      expect(spy).toHaveBeenCalled();
    });

    it('should suppress debug messages when level is info', () => {
      setLogLevel('info');
      const logger = getLogger('infoLevel');
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      logger.debug('should be suppressed');
      expect(spy).not.toHaveBeenCalled();
    });

    it('should suppress info messages when level is warn', () => {
      setLogLevel('warn');
      const logger = getLogger('warnLevel');
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      logger.info('should be suppressed');
      expect(spy).not.toHaveBeenCalled();
    });

    it('should suppress warn messages when level is error', () => {
      setLogLevel('error');
      const logger = getLogger('errorLevel');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      logger.warn('should be suppressed');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should allow error messages at all levels', () => {
      for (const level of ['debug', 'info', 'warn', 'error'] as const) {
        setLogLevel(level);
        const logger = getLogger('errorAlways');
        const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        logger.error('error always visible');
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      }
    });
  });

  describe('log level routing', () => {
    beforeEach(() => {
      setLogLevel('debug');
    });

    it('should write warn to console.warn', () => {
      const logger = getLogger('warnTest');
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      logger.warn('warning message');
      expect(spy).toHaveBeenCalled();
    });

    it('should write error to console.error', () => {
      const logger = getLogger('errorTest');
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      logger.error('error message');
      expect(spy).toHaveBeenCalled();
    });

    it('should write debug and info to console.log', () => {
      const logger = getLogger('logTest');
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      logger.debug('debug msg');
      logger.info('info msg');
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('child logger', () => {
    it('should create child logger with sub-context', () => {
      const parent = getLogger('parent');
      const child = parent.child('child');
      expect(child).toBeDefined();
      expect(typeof child.info).toBe('function');
    });

    it('child logger should emit log entries', () => {
      setLogLevel('debug');
      const parent = getLogger('parentCtx');
      const child = parent.child('childCtx');
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      child.info('child message');
      expect(spy).toHaveBeenCalled();
    });

    it('should support nested child loggers', () => {
      setLogLevel('debug');
      const root = getLogger('root');
      const l1 = root.child('l1');
      const l2 = l1.child('l2');
      expect(l2).toBeDefined();
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      l2.debug('nested');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('log message content', () => {
    it('should include context in log output', () => {
      setLogLevel('debug');
      const logger = getLogger('myContext');
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      logger.info('test message');
      expect(spy).toHaveBeenCalled();
      const output = (spy.mock.calls[0] as string[]).join(' ');
      expect(output).toContain('myContext');
    });

    it('should pass additional arguments through', () => {
      setLogLevel('debug');
      const logger = getLogger('argsTest');
      const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      logger.info('msg', { key: 'value' }, 42);
      expect(spy).toHaveBeenCalled();
      // Verify extra args were forwarded
      const call = spy.mock.calls[0] as unknown[];
      expect(call.length).toBeGreaterThan(1);
    });
  });
});
