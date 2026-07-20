# E2E Test Series logs

This folder is written by the **[E2E Test Series](../.github/workflows/e2e.yml)**
workflow, which runs every Playwright E2E suite across both desktop apps in
parallel (fail-fast disabled) and records the results here so progress can be
tracked over time.

## Layout

| Path | What it is |
| ---- | ---------- |
| `latest/summary.md` | Human-readable table of the most recent run (per-suite pass/fail/skip counts). |
| `latest/results.json` | Machine-readable results of the most recent run. |
| `latest/<app>__<suite>.log` | Full verbose Playwright log for each suite of the most recent run. |
| `history.jsonl` | One compact JSON line per suite per run — the long-term progress ledger. |

## How it runs

- **Nightly** (06:00 UTC), on **push to `main`** that touches E2E code, and via
  **manual dispatch** (Actions → *E2E Test Series* → *Run workflow*).
- Every suite runs independently and captures its own log; a failing suite does
  not stop the others.
- The `latest/` snapshot is overwritten each run; `history.jsonl` is appended,
  so `git log e2e-logs/history.jsonl` shows how coverage evolves.

> This is a **tracking** workflow, not a merge gate. The merge gate for the
> cognitive suite is the `cognitive-e2e` job in [`ci.yml`](../.github/workflows/ci.yml).
> Suites that need the full Delta Chat backend will show their true state
> (failure or honest skip) here until they are given real harnesses too.
