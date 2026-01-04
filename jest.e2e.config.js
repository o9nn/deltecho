module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.e2e.test.ts'],
  moduleNameMapper: {
    '^@deltecho/membrane-transport$': '<rootDir>/packages/membrane-transport/src',
    '^@deltecho/gesture-glyph$': '<rootDir>/packages/gesture-glyph/src',
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage-e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
};
