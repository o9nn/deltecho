/**
 * Jest configuration for the root-level E2E test suite.
 *
 * Runs the package-level integration suites under `tests/e2e/` against the
 * real workspace sources (membrane-transport, gesture-glyph, cognitive,
 * reasoning, sys6-triality, deep-tree-echo-core, dove9) via ts-jest in ESM
 * mode, matching the repo's `"type": "module"` layout.
 */

/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.e2e.test.ts'],
  // Load shared test utilities, custom matchers, and cognitive fixtures after
  // the test framework is installed so `expect.extend` and the global hooks in
  // the setup file bind to the real Jest globals.
  setupFilesAfterEnv: ['<rootDir>/test/utils/jest.setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/delta-echo-desk/',
    '/deltecho2/',
    '/dovecot-core/',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@deltecho/membrane-transport$': '<rootDir>/packages/membrane-transport/src',
    '^@deltecho/gesture-glyph$': '<rootDir>/packages/gesture-glyph/src',
    '^@deltecho/cognitive$': '<rootDir>/packages/cognitive/index.ts',
    '^@deltecho/reasoning$': '<rootDir>/packages/reasoning/index.ts',
    '^@deltecho/shared$': '<rootDir>/packages/shared/index.ts',
    '^@deltecho/sys6-triality$': '<rootDir>/packages/sys6-triality/src/index.ts',
    '^deep-tree-echo-core$': '<rootDir>/deep-tree-echo-core/src/index.ts',
    '^dove9$': '<rootDir>/dove9/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.e2e.json',
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'packages/*/*.ts',
    'deep-tree-echo-core/src/**/*.ts',
    'dove9/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!**/__tests__/**',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: 'coverage-e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
};
