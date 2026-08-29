import { defineConfig, devices } from '@playwright/test'

/**
 * Dedicated Playwright config for Cognitive E2E suites.
 *
 * Unlike the generic config (which boots the full Delta Chat browser app and
 * cannot reliably run headless in CI), this config serves a self-contained
 * cognitive harness that installs the real `window.__*` cognitive hooks. The
 * suites therefore run deterministically and can be a hard CI gate.
 *
 * Suites that use this config:
 * - cognitive-integration.spec.ts
 * - triadic-cognitive-loop.spec.ts
 * - sys6-triality.spec.ts
 * - llm-service.spec.ts
 * - memory-persistence.spec.ts
 * - ipc-electron.spec.ts
 * - orchestrator-integration.spec.ts (window.__orchestrator mock)
 * - ui-components.spec.ts (harness-mounted DOM fixtures)
 * - deep-tree-echo.spec.ts (harness profiles + cognitive state hooks)
 * - cognitive-memory.spec.ts (harness-seeded memory storage)
 *
 * Suites that still need the full Delta Chat backend (live chatmail server,
 * real account onboarding) run against the default playwright.config.ts:
 * basic-tests.spec.ts, group-tests.spec.ts, qrcode-tests.spec.ts.
 */
const port = Number(process.env.PORT ?? 3100)
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './tests',
  // Match cognitive harness suites (not Delta Chat backend tests)
  testMatch: [
    'cognitive-integration.spec.ts',
    'triadic-cognitive-loop.spec.ts',
    'sys6-triality.spec.ts',
    'llm-service.spec.ts',
    'memory-persistence.spec.ts',
    'ipc-electron.spec.ts',
    'orchestrator-integration.spec.ts',
    'ui-components.spec.ts',
    'deep-tree-echo.spec.ts',
    'cognitive-memory.spec.ts',
  ],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Optional override for sandboxes whose pre-installed Chromium build
        // differs from the one @playwright/test expects. Unset in normal CI,
        // where `playwright install chromium` provides the matching browser.
        ...(process.env.PW_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
  webServer: {
    command: 'node bin/serve-cognitive-harness.mjs',
    env: { PORT: String(port) },
    url: baseURL,
    timeout: 60 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
