# Sys6 Operadic Implementation

## Overview

This module implements the sys6 triality architecture as an **operad** (composition of typed "gadgets") with explicit wiring diagrams for neural, hardware, and scheduling systems.

## Operadic Structure

### Objects (Wire Bundles)

- **D**: Dyadic channel (2-phase clock / polarity)
- **T**: Triadic channel (3-phase clock)
- **P**: Pentadic stage selector (5 stages, each 6 steps)
- **C₈**: Cubic concurrency state bundle (8 parallel states from 2³)
- **K₉**: Triadic convolution phase bundle (9 orthogonal phases from 3²)

### Generators (Operadic Operations)

#### 1. Δ (Prime-Power Delegation)

Moves powers into parallel state, keeps bases in time:

- **Δ₂**: D → (D, C₈) where 2³ becomes parallel concurrency (8-way)
- **Δ₃**: T → (T, K₉) where 3² becomes orthogonal convolution phases (9-way)

#### 2. μ (LCM Synchronizer / Global Clocking)

Aligns D, T, P into a single clock domain of length 30:

```
μ: (D, T, P) → Clock₃₀
```

Based on LCM(2,3,5) = 30

#### 3. φ (2×3 → 4 Fold via Double-Step Delay)

Local "delay-line" operator that compresses the naive 6-step dyad×triad multiplex into 4 real steps by holding the dyad for two consecutive steps while the triad advances.

| Step | State | Dyad | Triad |
|------|-------|------|-------|
| 1    | 1     | A    | 1     |
| 2    | 4     | A    | 2     |
| 3    | 6     | B    | 2     |
| 4    | 1     | B    | 3     |

#### 4. σ (Stage Scheduler)

Maps the 30-step clock into **5 stages × 6 steps** and runs φ once per stage with 2 transition/sync steps.

### The Operadic Composite (The "Sys6 Morphism")

```
Sys6 := σ ∘ (φ ∘ μ ∘ (Δ₂ ⊗ Δ₃ ⊗ id_P))
```

Reading left-to-right: "build concurrency + convolution, sync clocks, fold 2×3 into 4, then stage into 5×6 across 30"

## Wiring Diagram

```
          D (mod 2) ─────┐
                         │         ┌───────────────┐
          T (mod 3) ─────┼────────▶│ φ: 2×3→4 fold  │───┐
                         │         │ (double delay) │   │
          P (stage 1..5) ┘         └───────────────┘   │
                                                         ▼
                ┌─────────────────────────────────────────────────┐
Clock30 (μ) ───▶│ σ: 5 stages × 6 steps; per stage: φ + 2 sync    │──▶ outputs
                └─────────────────────────────────────────────────┘
                          ▲                    ▲
                          │                    │
                 C₈ bundle│            K₉ bundle│
            (cubic conc.) │        (triadic conv) 
               Δ₂ from D  │          Δ₃ from T
```

## Neural Architecture Translation

### What "a step" means

A sys6 step is like a **single transformer block time-slice**, except it runs a *bundle* of parallel sub-computations each step:

- **8-way parallel "cubic concurrency"** (C₈) - think: 8 experts / 8 subspaces / 8 simultaneous pairwise-thread states
- **9-phase "triadic convolution"** (K₉) - think: 9 convolutional kernels / 9 relational filters, multiplexed across the 30-step run
- Gated by dyadic/triadic clocks and a stage selector

### Architectural Analogies

- **C₈** ≈ *Mixture-of-Experts width* (parallel branches)
- **K₉** ≈ *phase-conditioned kernel bank* (like convolution kernels chosen by phase)
- **P (5 stages)** ≈ *macro-block scheduling* (like 5 "chapters" of a computation, each 6 steps)
- **φ (double-step delay)** ≈ *clocked gating / dilated recurrence* that "holds" one pathway while another advances

**Density claim**: You get **more operations per real-time step** by shifting complexity into parallel state.

## Hardware Architecture Translation

### Clock Domains and Micro-ops

- **Clock30** is the global hardware frame: LCM(2,3,5) = 30
- **C₈** is "SIMD lanes" / "8 cores" doing the concurrency cube in parallel
- **K₉** is a bank of 9 phase-selectable "kernels"; hardware can map it to 3 cores rotating phases each step
- **P stages** map naturally to a 5-stage pipeline (each stage prepares while previous executes)

### The "sys6 chip" architecture

- 8-lane parallel unit (C₈)
- 3-lane rotating unit for K₉
- 5-stage pipeline controller
- **Total: ~16 cores for optimal parallelization**

### Cost Trade

Sys6 explicitly trades:

- **More memory/state** (bigger working set)
  for
- **More ops per unit time** (higher utilization / density)

## Scheduling Implementation

At step `t`:

```typescript
dyadicPhase = t % 2
triadicPhase = t % 3
pentadicStage = Math.ceil(t / 6)
fourStepPhase = ((t - 1) % 4) + 1
```

### Scheduling Rules

1. Always run **C₈** and **K₉** every step (they're synchronous "always-on" subgraphs)
2. Apply the **double-step delay** on the 4-step phases where the dyad is held
3. Every 6 steps, do a **stage transition**; at step 30 complete cycle
4. Expect frequent synchronization events across mod-2/mod-3/mod-5 boundaries (42 sync events / 30 steps)

## Implementation Files

- `operadic/types.ts` - Core operadic type definitions
- `operadic/generators.ts` - Δ₂, Δ₃, μ, φ, σ generators
- `operadic/composite.ts` - The full Sys6 morphism composition
- `operadic/scheduler.ts` - Step-by-step scheduling logic
- `operadic/wiring.ts` - Wiring diagram utilities
