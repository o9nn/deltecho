export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^deep-tree-echo-core$': '<rootDir>/deep-tree-echo-core/src/index.ts',
    '^deep-tree-echo-core/(.*)$': '<rootDir>/deep-tree-echo-core/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!deep-tree-echo-core)',
  ],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/delta-echo-desk/',
    '/deltecho2/',
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'deep-tree-echo-core/src/**/*.ts',
    'deep-tree-echo-orchestrator/src/**/*.ts',
    'dove9/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
