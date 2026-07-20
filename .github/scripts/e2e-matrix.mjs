/**
 * Discover every Playwright E2E spec across both desktop apps and emit a
 * GitHub Actions matrix (one entry per suite) to $GITHUB_OUTPUT.
 *
 * Auto-adapts as specs are added/removed so the E2E series never silently
 * drops a suite. The deltecho2 `cognitive-integration` suite runs via the
 * dedicated harness script (`e2e:cognitive:real`); everything else runs the
 * spec directly against the default config.
 */
import { readdirSync, existsSync, appendFileSync } from 'node:fs'
import { basename } from 'node:path'

const APPS = [
  { app: 'deltecho2', dir: 'deltecho2/packages/e2e-tests' },
  { app: 'delta-echo-desk', dir: 'delta-echo-desk/packages/e2e-tests' },
]

const include = []

for (const { app, dir } of APPS) {
  const testsDir = `${dir}/tests`
  if (!existsSync(testsDir)) continue
  const specs = readdirSync(testsDir)
    .filter(f => f.endsWith('.spec.ts'))
    .sort()
  for (const spec of specs) {
    const suite = basename(spec, '.spec.ts')
    const cognitiveHarness = app === 'deltecho2' && suite === 'cognitive-integration'
    include.push({
      app,
      dir,
      suite,
      spec,
      // The cognitive suite has a real harness + gated runner; others run the
      // spec directly (they surface their true state, incl. honest skips).
      cmd: cognitiveHarness
        ? 'pnpm run e2e:cognitive:real'
        : `pnpm exec playwright test ${spec} --reporter=list`,
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
