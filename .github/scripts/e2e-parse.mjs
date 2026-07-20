/**
 * Parse a Playwright run log into a compact result record.
 *
 * Usage:
 *   node e2e-parse.mjs <logFile> <app> <suite> <spec> <exitCode> <outFile>
 *
 * Reads the Playwright `list` reporter summary from the log (passed / failed /
 * skipped / flaky / "did not run") and writes a JSON result record consumed by
 * the aggregation step.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [, , logFile, app, suite, spec, exitCodeRaw, outFile] = process.argv
const exitCode = Number(exitCodeRaw)

let log = ''
try {
  log = readFileSync(logFile, 'utf8')
} catch {
  log = ''
}

function count(re) {
  const m = log.match(re)
  return m ? Number(m[1]) : 0
}

const passed = count(/(\d+) passed/)
const failed = count(/(\d+) failed/)
const skipped = count(/(\d+) skipped/)
const flaky = count(/(\d+) flaky/)
const didNotRun = count(/(\d+) did not run/)

// Exit code is the source of truth for pass/fail; the counts are for tracking.
const outcome = exitCode === 0 ? 'passed' : 'failed'

const record = {
  app,
  suite,
  spec,
  outcome,
  exitCode,
  passed,
  failed,
  skipped,
  flaky,
  didNotRun,
  runId: process.env.GITHUB_RUN_ID ?? null,
  runNumber: process.env.GITHUB_RUN_NUMBER ?? null,
  sha: process.env.GITHUB_SHA ?? null,
  ref: process.env.GITHUB_REF_NAME ?? null,
  timestamp: process.env.E2E_RUN_TIMESTAMP ?? null,
}

writeFileSync(outFile, JSON.stringify(record, null, 2))
console.log(
  `${app}/${suite}: ${outcome} (exit ${exitCode}) — ` +
    `${passed} passed, ${failed} failed, ${skipped} skipped, ${flaky} flaky` +
    (didNotRun ? `, ${didNotRun} did not run` : '')
)
