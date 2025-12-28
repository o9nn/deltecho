/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^deep-tree-echo-core$': '<rootDir>/../../deep-tree-echo-core/src/index.ts',
    '^dove9$': '<rootDir>/../../dove9/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'integration/**/*.ts',
    'types/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  verbose: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
