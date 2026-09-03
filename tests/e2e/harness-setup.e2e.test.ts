/**
 * E2E harness setup validation suite.
 *
 * Verifies that `jest.e2e.config.js` wires `test/utils/jest.setup.ts` via
 * `setupFilesAfterEnv` so the shared test utilities, custom matchers, and
 * cognitive fixtures are available to every E2E spec. If the setup file is
 * not loaded, the custom matchers and the `testUtils` global are undefined
 * and these tests fail.
 */

import { describe, it, expect } from '@jest/globals';
import {
  sampleConversations,
  samplePersonalities,
  sampleMemories,
} from '../../test/fixtures/cognitive';

describe('E2E harness setup', () => {
  it('exposes the shared testUtils global', () => {
    const utils = (globalThis as { testUtils?: unknown }).testUtils;
    expect(utils).toBeDefined();
    expect(typeof (utils as { createMockMemory?: unknown }).createMockMemory).toBe('function');
  });

  it('registers the custom toBeWithinRange matcher', () => {
    expect(5).toBeWithinRange(1, 10);
  });

  it('registers the custom toBeValidCognitivePhase matcher', () => {
    expect(0).toBeValidCognitivePhase();
    expect(11).toBeValidCognitivePhase();
  });

  it('registers the custom toHaveValidTimestamp matcher', () => {
    expect({ timestamp: Date.now() }).toHaveValidTimestamp();
  });

  it('builds mock cognitive state via testUtils', () => {
    const utils = (
      globalThis as unknown as {
        testUtils: {
          createMockCognitiveState: (o?: object) => { activeStreams: number };
        };
      }
    ).testUtils;
    const state = utils.createMockCognitiveState();
    expect(state.activeStreams).toBe(3);
  });

  it('loads cognitive fixtures', () => {
    expect(sampleConversations.length).toBeGreaterThan(0);
    expect(samplePersonalities.length).toBeGreaterThan(0);
    expect(sampleMemories.length).toBeGreaterThan(0);
  });
});
