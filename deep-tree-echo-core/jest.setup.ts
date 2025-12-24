/**
 * Jest setup file for deep-tree-echo-core tests
 * This file ensures Jest globals are properly initialized for ESM mode
 */

// For ESM mode with ts-jest, we need to explicitly set up jest globals
// because injectGlobals doesn't work reliably with ESM

// Make jest available globally by reusing the existing jest object
(global as any).jest = (global as any).jest || {};

// Ensure jest.fn is available
if (!(global as any).jest.fn) {
  (global as any).jest.fn = function(implementation?: any) {
    const mock = function(...args: any[]) {
      mock.mock.calls.push(args);
      mock.mock.results.push({ type: 'return', value: implementation?.(...args) });
      return implementation?.(...args);
    };
    mock.mock = {
      calls: [] as any[],
      results: [] as any[],
      instances: [] as any[],
    };
    return mock;
  };
}


