/**
 * Discover every Playwright E2E spec across both desktop apps and emit a
 * GitHub Actions matrix (one entry per suite) to $GITHUB_OUTPUT.
 *
 * Auto-adapts as specs are added/removed so the E2E series never silently
 * drops a suite.
 *
 * Test suites are categorized into:
 * 1. **Cognitive harness suites** - Tests that probe `window.__*` cognitive
 *    hooks (triadic loop, memory, LLM, IPC, UI components). These run against
 *    the lightweight cognitive harness server via `playwright.cognitive.config.ts`.
 *
 * 2. **Delta Chat backend suites** - Tests that need the full Delta Chat
 *    application (profiles, messaging, QR codes, groups). These run against
 *    the default `playwright.config.ts` which boots the full app.
 */
import { readdirSync, existsSync, appendFileSync } from 'node:fs'
import { basename } from 'node:path'

const APPS = [
  { app: 'deltecho2', dir: 'deltecho2/packages/e2e-tests' },
  { app: 'delta-echo-desk', dir: 'delta-echo-desk/packages/e2e-tests' },
]

// Suites that run against the cognitive harness (window.__* hooks).
// These do NOT require the full Delta Chat backend.
// NOTE: Only applies to deltecho2 - delta-echo-desk's test files have different
// content that depends on UI elements not present in the harness.
// NOTE: cognitive-memory uses profiles from playwright-helper.ts which need the full app
// NOTE: ui-components tests React components that need the full app UI
const COGNITIVE_HARNESS_SUITES = new Set([
  'cognitive-integration',
  'triadic-cognitive-loop',
  'sys6-triality',
  'llm-service',
  'memory-persistence',
  'ipc-electron',
])

// Only deltecho2 has harness-compatible test files
const HARNESS_ENABLED_APPS = new Set(['deltecho2'])

const include = []

for (const { app, dir } of APPS) {
  const testsDir = `${dir}/tests`
  if (!existsSync(testsDir)) continue
  const specs = readdirSync(testsDir)
    .filter(f => f.endsWith('.spec.ts'))
    .sort()

  // Check if cognitive harness infrastructure exists for this app AND app is enabled
  const hasCognitiveHarness =
    HARNESS_ENABLED_APPS.has(app) && existsSync(`${dir}/playwright.cognitive.config.ts`)

  for (const spec of specs) {
    const suite = basename(spec, '.spec.ts')
    const usesCognitiveHarness =
      COGNITIVE_HARNESS_SUITES.has(suite) && hasCognitiveHarness

    let cmd
    if (usesCognitiveHarness) {
      // Run against the cognitive harness with the dedicated config
      cmd = `pnpm run build:cognitive-harness && pnpm exec playwright test ${spec} --config playwright.cognitive.config.ts --reporter=list`
    } else {
      // Run against the full Delta Chat app (default config)
      cmd = `pnpm exec playwright test ${spec} --reporter=list`
    }

    include.push({
      app,
      dir,
      suite,
      spec,
      cmd,
    })
  }
}

const matrix = { include }
const line = `matrix=${JSON.stringify(matrix)}`

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`)
}
// Always echo for local debugging / log visibility.
console.log(`Discovered ${include.length} E2E suites:`)
for (const e of include) console.log(`  - ${e.app} / ${e.suite}`)
console.log(line)
