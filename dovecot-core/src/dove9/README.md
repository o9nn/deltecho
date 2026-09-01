# Dove9 Cognitive Layer — C Implementation

The `dove9/` directory contains the C11 implementation of the Dove9 cognitive
architecture for Deltecho's bundled `dovecot-core`. It is a self-contained
subsystem that integrates with the Dovecot mail server to implement the
"Everything is a Chatbot" paradigm. The native `dove9-cognitive` notify plugin
under `../plugins/` feeds committed mail deliveries into this processing layer.

## Architecture

```
dove9/
├── types/         dove9-types.h           — Enums, structs, constants
├── utils/         dove9-logger.{h,c}      — Structured colored logging
├── cognitive/     dove9-triadic-engine     — 12-step cycle, T-points, couplings
│                  dove9-dte-processor      — LLM/memory/persona vtable dispatch
├── core/          dove9-kernel             — Process table, priority queue, scheduling
├── integration/   dove9-mail-protocol-bridge    — Mail↔process conversion
│                  dove9-orchestrator-bridge      — Orchestrator integration
│                  dove9-sys6-mail-scheduler      — Sys6 30/12/60-step operadic scheduler
│                  dove9-sys6-orchestrator-bridge — Sys6+orchestrator combined bridge
├── dove9-system.{h,c}                    — Top-level system facade
└── test/          27 test executables + framework + mocks + Valgrind suppression
```

## Building

### CMake (recommended)

```bash
# Configure (default Release build)
cmake --preset default -S dovecot-core/src/dove9

# Configure (development with debug checks)
cmake --preset dev -S dovecot-core/src/dove9

# Build
cmake --build dovecot-core/src/dove9/build-dev -j4

# Test (27 tests via CTest)
ctest --test-dir dovecot-core/src/dove9/build-dev --output-on-failure
```

Available presets: `default` (Release), `dev` (Debug + devel-checks), `coverage` (gcov/lcov), `ci` (Release + `-Werror`).

### Autotools (legacy)

The dove9 layer also builds as `libdove9.la` within the bundled `dovecot-core` Autotools system:

```bash
cd dovecot-core
./autogen.sh
./configure --enable-devel-checks
make -j$(nproc)
```

## Testing

```bash
# Run all dove9 tests
make -C src/dove9 check-local

# Run with Valgrind
valgrind --suppressions=src/dove9/test/dove9.supp ./src/dove9/test-dove9-types
```

### Test Binaries

| Binary                           | Module                                     | Tests |
| -------------------------------- | ------------------------------------------ | ----- |
| `test-dove9-types`               | types/dove9-types.h                        | 5     |
| `test-dove9-logger`              | utils/dove9-logger                         | 4     |
| `test-dove9-triadic-engine`      | cognitive/dove9-triadic-engine             | 9     |
| `test-dove9-dte-processor`       | cognitive/dove9-dte-processor              | 6     |
| `test-dove9-kernel`              | core/dove9-kernel                          | 8     |
| `test-dove9-mail-bridge`         | integration/dove9-mail-protocol-bridge     | 7     |
| `test-dove9-sys6-scheduler`      | integration/dove9-sys6-mail-scheduler      | 7     |
| `test-dove9-orchestrator-bridge` | integration/dove9-orchestrator-bridge      | 5     |
| `test-dove9-sys6-bridge`         | integration/dove9-sys6-orchestrator-bridge | 7     |
| `test-dove9-system`              | dove9-system                               | 6     |
| `test-dove9-security`            | Cross-module security tests                | 6     |

**Total: 27 independently runnable CTest executables.**

## Test Framework

The dove9 tests use a self-contained framework (`dove9-test-common.h`) with no
external dependencies. Key features:

- `dove9_test_begin(name)` / `dove9_test_end()` — test lifecycle
- `DOVE9_TEST_ASSERT(expr)` — boolean assertion
- `DOVE9_TEST_ASSERT_STR_EQ` / `INT_EQ` / `UINT_EQ` / `DOUBLE_EQ` — typed assertions
- `DOVE9_TEST_ASSERT_NOT_NULL` / `DOVE9_TEST_ASSERT_NULL` — pointer assertions
- `dove9_test_run(suite, tests, count)` — suite runner with colored pass/fail output
- Mock vtables for LLM, memory, and persona services with call counters

## Coverage

### CMake

```bash
cmake --preset coverage -S dovecot-core/src/dove9
cmake --build dovecot-core/src/dove9/build-coverage
ctest --test-dir dovecot-core/src/dove9/build-coverage
cmake --build dovecot-core/src/dove9/build-coverage --target coverage
```

### Autotools

```bash
./configure --enable-coverage
make
make -C src/dove9 check-local
gcov src/dove9/**/*.gcda
```

## Design Principles

- **Self-contained**: No dependency on Dovecot lib/ for core logic
- **C11 strict**: `-std=c11 -Wall -Wextra`; CI additionally treats warnings as errors
- **Header guards**: All headers use `#ifndef DOVE9_*` guards
- **Opaque types**: All struct internals hidden behind create/destroy APIs
- **Degraded contexts**: Cognitive failures produce valid (degraded) results
- **Event-driven**: All components emit events through callback registration
