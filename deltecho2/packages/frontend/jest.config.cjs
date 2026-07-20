module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.module\\.(css|scss)$': 'identity-obj-proxy',
    // Handle CSS imports (without CSS modules)
    '\\.(css|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock wasm module
    '@deltachat/message_parser_wasm': '<rootDir>/__mocks__/wasmMock.js',
    // Mock shared modules
    '@deltachat-desktop/shared/util.js':
      '<rootDir>/__mocks__/sharedUtilMock.js',
    // Mock logger with relative path
    '../../../../shared/logger': '<rootDir>/__mocks__/loggerMock.js',
  },
  transform: {
    // These .tsx files share their basenames with .ts siblings, so the
    // program-based ts-jest compiler cannot emit them (output path collision).
    // Compile them with a transpile-only transformer instead.
    '/DeepTreeEchoBot/(?:__tests__/DeepTreeEchoBot\\.test|DeepTreeEchoBot)\\.tsx$':
      '<rootDir>/jest.transpile-tsx.cjs',
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/**/types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}
