# The Entelechy Layer

> _"Entelechy" (from Aristotle's ἐντελέχεια) — the condition of something whose
> essence is fully realized; the actuality that drives potentiality toward its
> complete form._

The entelechy layer monitors the emergence of higher-order cognitive patterns
across the Deep Tree Echo subsystems and wires them into a unified background
cognitive loop inside the orchestrator.

## Architecture

The layer is composed of two parts:

| Component | Location | Role |
| --- | --- | --- |
| `EntelechyEmergenceEngine` | `deep-tree-echo-core/src/scientific-genius/EntelechyEmergenceEngine.ts` | Emergence monitor — pattern detection, phi scoring, emergence levels, narrative, serialize/restore |
| `EntelechyIntegration` | `deep-tree-echo-orchestrator/src/entelechy-integration.ts` | Wires ESN reservoir + EchoBeats + consciousness + scientific genius into a 1 Hz background loop and per-message processing |

### Wiring diagram

```
                    ┌────────────────────────────┐
 inbound message ──▶│        Orchestrator        │
                    │  (enableEntelechy: true)   │
                    └──────────────┬─────────────┘
                                   │ processMessage() (fire-and-forget)
                                   ▼
                    ┌────────────────────────────┐
                    │    EntelechyIntegration    │◀── background tick (1 Hz)
                    └──────────────┬─────────────┘
              ┌───────────┬────────┴─────┬──────────────┐
              ▼           ▼              ▼              ▼
        ESN Reservoir  EchoBeats   Consciousness  Scientific Genius
        (substrate)    (12-step)   (awareness)    (live insight signal)
              └───────────┴────────┬─────┴──────────────┘
                                   ▼
                    ┌────────────────────────────┐
                    │  EntelechyEmergenceEngine  │
                    │  patterns / score / level  │
                    └──────────────┬─────────────┘
                                   │ entelechy-realized / pattern-detected
                                   ▼
                     Global Workspace Broadcaster
                     (telemetry snapshot + IPC)
```

## Emergence Levels

The engine tracks a 0–1 entelechy score, mapped to five levels:

| Level | Score threshold | Meaning |
| --- | --- | --- |
| `latent` | < 0.2 | Potential present but dormant |
| `stirring` | ≥ 0.2 | Weak patterns beginning |
| `crystallizing` | ≥ 0.45 | Patterns forming coherently |
| `emergent` | ≥ 0.65 | Novel properties arising |
| `entelechial` | ≥ 0.85 | Full self-realization — emits `entelechy-realized` |

## Orchestrator Configuration

```ts
const orchestrator = new Orchestrator({
  enableEntelechy: true, // default
  entelechy: {
    enableReservoir: true,
    enableEchoBeats: true,
    enableConsciousness: true,
    enableEntelechy: true,
    enableScientificGenius: true, // live insight signal from ScientificGeniusEngine
    backgroundTickInterval: 1000, // 1 Hz background loop
    inputDim: 64,
  },
});
```

When `enableScientificGenius` is enabled, the `scientificInsight` signal fed to
the emergence engine is derived from the live `ScientificGeniusEngine` state
(hypotheses, insights, global-workspace integration, strange-loop depth); the
historical constants (0.3 background / 0.6 per-message) remain as floors and as
the fallback when the engine is disabled.

## Persistence

- `EntelechyIntegration.serialize()` captures the tick count plus reservoir and
  entelechy engine state; `restore()` is its symmetric counterpart.
- The orchestrator persists this state to its storage under the
  `entelechy-state` key on `stop()` and restores it on `start()`, so emergence
  level and pattern history survive restarts.

## Observability

- **Telemetry** — every Global Workspace broadcast includes an
  `entelechy` summary (`level`, `score`, `narrative`, `patternCount`,
  `reservoirCoupling`, `temporalSynchrony`).
- **IPC** — the `entelechy_get_state` handler (registered automatically by the
  orchestrator via `registerEntelechyHandlers` when both the IPC server and
  entelechy integration are enabled, and also included in
  `registerCognitiveHandlers` when an `entelechyIntegration` dependency is
  provided) returns the latest cognitive snapshot so desktop apps can display
  emergence level and narrative.
- **Events** — `entelechy-realized` and `pattern-detected` events are forwarded
  from the engine through the integration to the orchestrator's Global
  Workspace broadcaster.

## Tests

- `deep-tree-echo-core/src/__tests__/entelechy-emergence-engine.test.ts` —
  level thresholds, pattern registration/decay/eviction, strange-loop
  detection, event emission, score bounds, narrative, serialize/restore.
- `deep-tree-echo-orchestrator/src/__tests__/entelechy-integration.test.ts` —
  start/stop lifecycle, background-tick resilience, `processMessage` result
  shape, disabled-subsystem fallbacks, event forwarding, persistence symmetry.
