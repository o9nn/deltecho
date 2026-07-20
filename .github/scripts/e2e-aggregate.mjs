/**
 * Aggregate per-suite E2E artifacts into the tracked `e2e-logs/` folder.
 *
 * Usage:
 *   node e2e-aggregate.mjs <artifactsRoot>
 *
 * <artifactsRoot> contains one subdirectory per suite (from
 * actions/download-artifact), each with `output.log` and `result.json`.
 *
 * Produces, under `e2e-logs/`:
 *   - latest/<app>__<suite>.log   full verbose log of the most recent run
 *   - latest/summary.md           human-readable table of the latest run
 *   - latest/results.json         machine-readable results of the latest run
 *   - history.jsonl               one compact line per suite per run (append)
 */
import {
  readdirSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  appendFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'

const artifactsRoot = process.argv[2]
if (!artifactsRoot || !existsSync(artifactsRoot)) {
  console.error(`Artifacts root not found: ${artifactsRoot}`)
  process.exit(1)
}

const logsDir = 'e2e-logs'
const latestDir = join(logsDir, 'latest')
mkdirSync(latestDir, { recursive: true })

// Clear previous latest/ logs so it reflects only this run.
for (const f of existsSync(latestDir) ? readdirSync(latestDir) : []) {
  rmSync(join(latestDir, f), { recursive: true, force: true })
}

const results = []
for (const entry of readdirSync(artifactsRoot)) {
  const dir = join(artifactsRoot, entry)
  if (!statSync(dir).isDirectory()) continue
  const resultPath = join(dir, 'result.json')
  const logPath = join(dir, 'output.log')
  if (!existsSync(resultPath)) continue
  const result = JSON.parse(readFileSync(resultPath, 'utf8'))
  results.push(result)
  if (existsSync(logPath)) {
    copyFileSync(logPath, join(latestDir, `${result.app}__${result.suite}.log`))
  }
}

results.sort((a, b) =>
  `${a.app}/${a.suite}`.localeCompare(`${b.app}/${b.suite}`)
)

const timestamp = process.env.E2E_RUN_TIMESTAMP ?? new Date().toISOString()
const runId = process.env.GITHUB_RUN_ID ?? 'local'
const sha = (process.env.GITHUB_SHA ?? '').slice(0, 8)

// latest/results.json
writeFileSync(
  join(latestDir, 'results.json'),
  JSON.stringify({ timestamp, runId, sha, results }, null, 2)
)

// latest/summary.md
const totals = results.reduce(
  (acc, r) => {
    acc.suites++
    if (r.outcome === 'passed') acc.passedSuites++
    else acc.failedSuites++
    acc.passed += r.passed
    acc.failed += r.failed
    acc.skipped += r.skipped
    acc.flaky += r.flaky
    return acc
  },
  { suites: 0, passedSuites: 0, failedSuites: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 }
)

const icon = o => (o === 'passed' ? '✅' : '❌')
const rows = results
  .map(
    r =>
      `| ${icon(r.outcome)} | \`${r.app}\` | \`${r.suite}\` | ${r.passed} | ${r.failed} | ${r.skipped} | ${r.flaky} | ${r.didNotRun} |`
  )
  .join('\n')

const summary = `# E2E Test Series — latest run

- **Run:** ${runId}${sha ? ` (\`${sha}\`)` : ''}
- **When:** ${timestamp}
- **Suites:** ${totals.passedSuites}/${totals.suites} passed
- **Tests:** ${totals.passed} passed, ${totals.failed} failed, ${totals.skipped} skipped, ${totals.flaky} flaky

| Result | App | Suite | Passed | Failed | Skipped | Flaky | Did not run |
| ------ | --- | ----- | ------ | ------ | ------- | ----- | ----------- |
${rows}

> Full per-suite logs are in [\`e2e-logs/latest/\`](.). Progress over time is
> tracked in [\`e2e-logs/history.jsonl\`](../history.jsonl).
`
writeFileSync(join(latestDir, 'summary.md'), summary)

// history.jsonl (append one compact line per suite for this run)
const historyPath = join(logsDir, 'history.jsonl')
for (const r of results) {
  appendFileSync(
    historyPath,
    JSON.stringify({
      timestamp,
      runId,
      sha,
      app: r.app,
      suite: r.suite,
      outcome: r.outcome,
      passed: r.passed,
      failed: r.failed,
      skipped: r.skipped,
      flaky: r.flaky,
      didNotRun: r.didNotRun,
    }) + '\n'
  )
}

console.log(summary)
console.log(
  `Aggregated ${results.length} suites (${totals.passedSuites} passed / ${totals.failedSuites} failed).`
)
