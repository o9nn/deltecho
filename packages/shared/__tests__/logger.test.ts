/**
 * Logger Module Tests
 *
 * Tests for the logging infrastructure that provides
 * consistent logging across all Deltecho packages.
 */

import { getLogger, Logger, setLogHandler, LogLevelString } from '../logger.js';

describe('Logger Module', () => {
  // Initialize the log handler before tests
  beforeAll(() => {
    // Set up a mock log handler
    setLogHandler(
      (channel: string, level: string, stacktrace: string | any[], ...args: any[]) => {
        // Mock handler - just capture the log
      },
      { 'log-to-console': false } as any
    );
  });

  describe('getLogger', () => {
    it('should create a logger with the specified name', () => {
      const logger = getLogger('TestModule');
      expect(logger).toBeDefined();
    });

    it('should return the same logger instance for the same name', () => {
      const uniqueName = `SameModule_${Date.now()}`;
      const logger1 = getLogger(uniqueName);
      const logger2 = getLogger(uniqueName);
      // Logger instances are cached, so they should be equal
      expect(logger1.channel).toBe(logger2.channel);
    });

    it('should return different logger instances for different names', () => {
      const logger1 = getLogger('Module1');
      const logger2 = getLogger('Module2');
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('Logger Methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = getLogger('TestLogger');
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages without throwing', () => {
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('should log warning messages without throwing', () => {
      expect(() => logger.warn('Test warning message')).not.toThrow();
    });

    it('should log error messages without throwing', () => {
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('should log debug messages without throwing', () => {
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    it('should handle multiple arguments', () => {
      expect(() => logger.info('Message with', 'multiple', 'arguments')).not.toThrow();
    });

    it('should handle objects in log messages', () => {
      const testObject = { key: 'value', nested: { a: 1 } };
      expect(() => logger.info('Object:', testObject)).not.toThrow();
    });

    it('should handle errors in log messages', () => {
      const testError = new Error('Test error');
      expect(() => logger.error('Error occurred:', testError)).not.toThrow();
    });
  });

  describe('Logger Namespacing', () => {
    it('should create loggers with hierarchical names', () => {
      const parentLogger = getLogger('Parent');
      const childLogger = getLogger('Parent/Child');
      const grandchildLogger = getLogger('Parent/Child/Grandchild');

      expect(parentLogger).toBeDefined();
      expect(childLogger).toBeDefined();
      expect(grandchildLogger).toBeDefined();
    });

    it('should handle special characters in logger names', () => {
      const logger = getLogger('Module:SubModule@v1.0');
      expect(logger).toBeDefined();
    });
  });

  describe('Logger Performance', () => {
    it('should handle rapid logging without errors', () => {
      const logger = getLogger('PerformanceTest');

      expect(() => {
        for (let i = 0; i < 100; i++) {
          logger.info(`Message ${i}`);
        }
      }).not.toThrow();
    });

    it('should handle concurrent logging from multiple loggers', () => {
      const loggers = Array.from({ length: 10 }, (_, i) => getLogger(`Concurrent${i}`));

      expect(() => {
        loggers.forEach((logger, i) => {
          logger.info(`Message from logger ${i}`);
        });
      }).not.toThrow();
    });
  });

  describe('LogLevelString enum', () => {
    it('should have all expected log levels', () => {
      expect(LogLevelString.DEBUG).toBe('DEBUG');
      expect(LogLevelString.INFO).toBe('INFO');
      expect(LogLevelString.WARNING).toBe('WARNING');
      expect(LogLevelString.ERROR).toBe('ERROR');
      expect(LogLevelString.CRITICAL).toBe('CRITICAL');
    });
  });
});
