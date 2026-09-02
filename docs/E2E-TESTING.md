# E2E Testing

Deltecho has three layers of end-to-end testing, each with a different
backend requirement. This document is the single reference for how they fit
together, how to run them locally, and how to add a new suite.

## Test layers

| Layer | Config / entry point | Backend needed | Suites |
| ----- | -------------------- | -------------- | ------ |
| **Jest package E2E** | `jest.e2e.config.js` → `tests/e2e/*.e2e.test.ts` | none (pure Node) | membrane-transport, gesture-glyph, trajectory distribution |
| **Playwright cognitive harness** | `playwright.cognitive.config.ts` in each app's `packages/e2e-tests` | self-contained harness server (`cognitive-harness/`) | cognitive-integration, triadic-cognitive-loop, sys6-triality, llm-service, memory-persistence, ipc-electron, orchestrator-integration, ui-components, deep-tree-echo, cognitive-memory |
| **Playwright full app** | `playwright.config.ts` in each app's `packages/e2e-tests` | `target-browser` server + chatmail backend | basic-tests, group-tests, qrcode-tests |

### Cognitive harness

The harness (`cognitive-harness/harness.ts`) is bundled by esbuild
(`bin/build-cognitive-harness.mjs`) and served by a tiny static server
(`bin/serve-cognitive-harness.mjs`). It boots the real browser-safe
`CognitiveOrchestrator` from the app's frontend `CognitiveBridge`, a
deterministic Dove9 triadic runtime (12 steps, 3 streams, 120° phase
offset), a Sys6 triality bridge, a localStorage-backed memory store, an
in-process mock orchestrator (IPC / scheduler / webhooks / DeltaChat
facade), and deterministic app-chrome DOM fixtures (account sidebar, chat
list, composer, Deep Tree Echo bot panel, settings, AI Companion Hub).

All of this is exposed through `window.__*` hooks
(`__deepTreeEchoState`, `__deepTreeEchoMemory`, `__dove9`, `__sys6Bridge`,
`__llmService`, `__orchestrator`, `__dove9Engine`, `__ipc`,
`__memorySystem`, …), which the harness suites probe with `page.evaluate`.
Suites degrade to honest `test.skip()` when the hooks are absent, so the
same spec files can also run against the full app.

### Full-app backend

Full-app suites boot `../target-browser/dist/server.js` and, by default, the
in-repo **mock chatmail server** (`bin/mock-chatmail.mjs`) on port 4650. The
mock implements the `dcaccount:` onboarding endpoint (`GET /new`), mail
autoconfig XML, and a health endpoint, so account creation works offline and
deterministically. It does **not** implement IMAP/SMTP message transport —
suites that need real message relay still require the live chatmail service.

Set `E2E_LIVE_CHATMAIL=1` to opt into the real `ci-chatmail.testrun.org`
backend (requires network access and `WEB_PASSWORD`); the mock server is then
not started and `playwright-helper.ts` points at the live service.

## Running locally

```bash
# Root Jest E2E (packages)
pnpm test:e2e

# Cognitive harness suites (either app)
cd deltecho2/packages/e2e-tests        # or delta-echo-desk/packages/e2e-tests
pnpm run e2e:cognitive:real            # builds harness + runs all 10 suites
pnpm exec playwright test ui-components.spec.ts --config playwright.cognitive.config.ts

# Per-suite shortcuts (identical in both apps)
pnpm run e2e:sys6                      # sys6-triality.spec.ts
pnpm run e2e:ipc                       # ipc-electron.spec.ts
pnpm run e2e:orchestrator              # orchestrator-integration.spec.ts
pnpm run test:ci                       # full run, GitHub reporter

# Full-app suites (mock chatmail starts automatically)
pnpm run build                         # workspace packages must be built first
cd deltecho2/packages/e2e-tests
pnpm exec playwright test basic-tests.spec.ts

# Full-app suites against the live chatmail backend
E2E_LIVE_CHATMAIL=1 WEB_PASSWORD=… pnpm exec playwright test basic-tests.spec.ts
```

If your sandbox ships a mismatched Chromium build, point Playwright at it:

```bash
PW_CHROMIUM_PATH=/path/to/chromium pnpm exec playwright test --config playwright.cognitive.config.ts
```

## CI wiring

- **`ci.yml` → `jest-e2e`** (PR + push): hard gate for the root Jest E2E
  suite.
- **`ci.yml` → `cognitive-e2e`** (PR + push): hard gate; runs
  `e2e:cognitive:real` in **both** desktop apps (all 10 harness suites each).
- **`ci.yml` → `e2e-tests`** (PR + main pushes): re-runs the harness suites
  and runs full-app suites against the mock chatmail backend. Suites that
  still need live message transport emit a `::warning` instead of failing.
- **`e2e.yml`** (nightly / dispatch / pushes touching E2E code): the tracking
  series. `.github/scripts/e2e-matrix.mjs` discovers every `*.spec.ts` across
  both apps and classifies each as harness-backed (presence of
  `playwright.cognitive.config.ts` + suite in `COGNITIVE_HARNESS_SUITES`) or
  full-app, emitting one matrix entry per suite. Results are aggregated into
  `e2e-logs/latest/` and appended to `e2e-logs/history.jsonl` (see
  [`e2e-logs/README.md`](../e2e-logs/README.md)).

## Adding a new suite

1. Create `tests/<name>.spec.ts` in both
   `deltecho2/packages/e2e-tests` and `delta-echo-desk/packages/e2e-tests`
   (keep them in sync — suites are expected to be identical across apps).
2. If the suite only needs cognitive hooks, make it harness-compatible:
   probe `window.__*` hooks via `page.evaluate` and `test.skip()` honestly
   when they are absent. Add the suite name to `testMatch` in both
   `playwright.cognitive.config.ts` files and to `COGNITIVE_HARNESS_SUITES`
   in `.github/scripts/e2e-matrix.mjs`.
3. If it needs the full app, no registration is needed — the matrix script
   picks it up automatically and runs it with the default
   `playwright.config.ts` (mock chatmail backend).
4. If it needs new harness capabilities, extend
   `cognitive-harness/harness.ts` in **both** apps identically.

## Ledger

`e2e-logs/latest/summary.md` shows the most recent tracking run;
`git log e2e-logs/history.jsonl` shows how per-suite coverage evolves over
time. The ledger is written by the `aggregate` job in `e2e.yml` (main only).
