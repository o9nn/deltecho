/**
 * Root Jest Configuration for Deltecho Monorepo
 * 
 * This configuration provides:
 * - Unified test execution across all packages
 * - Coverage reporting with thresholds
 * - TypeScript support
 * - Custom test utilities
 */

/** @type {import('jest').Config} */
const config = {
  // Use projects for monorepo structure
  projects: [
    '<rootDir>/deep-tree-echo-core',
    '<rootDir>/dove9',
    '<rootDir>/deep-tree-echo-orchestrator',
    '<rootDir>/packages/shared',
    '<rootDir>/packages/cognitive',
    '<rootDir>/packages/reasoning',
    '<rootDir>/packages/sys6-triality',
    '<rootDir>/packages/ui-components',
  ],

  // Global coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '**/src/**/*.{ts,tsx}',
    '!**/src/**/*.d.ts',
    '!**/src/**/__tests__/**',
    '!**/node_modules/**',
    '!**/dist/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    // Package-specific thresholds
    './deep-tree-echo-core/src/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './dove9/src/': {
      branches: 65,
      functions: 65,
      lines: 65,
      statements: 65,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',

  // Test environment
  testEnvironment: 'node',

  // Test patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/delta-echo-desk/',
    '/deltecho2/',
    '/dovecot-core/',
  ],

  // Module path aliases
  moduleNameMapper: {
    '^@deltecho/(.*)$': '<rootDir>/packages/$1/src',
    '^deep-tree-echo-core$': '<rootDir>/deep-tree-echo-core/src',
    '^dove9$': '<rootDir>/dove9/src',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/utils/jest.setup.ts'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Verbose output
  verbose: true,

  // Fail on console errors
  errorOnDeprecated: true,

  // Test timeout
  testTimeout: 30000,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,
}

module.exports = config
