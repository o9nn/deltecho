import { defineConfig, devices } from '@playwright/test'

/**
 * Dedicated Playwright config for the Cognitive Integration E2E suite.
 *
 * Unlike the generic config (which boots the full Delta Chat browser app and
 * cannot reliably run headless in CI), this config serves a self-contained
 * cognitive harness that installs the real `window.__*` cognitive hooks. The
 * suite therefore runs deterministically and can be a hard CI gate.
 */
const port = Number(process.env.PORT ?? 3100)
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './tests',
  testMatch: ['cognitive-integration.spec.ts'],
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
