# CLAUDE.md - Deltecho Monorepo

This file provides guidance for Claude Code when working with the Deltecho monorepo.

## Project Overview

Deltecho is a multi-project monorepo combining Delta Chat messaging applications with email infrastructure components. The repository contains four main subprojects that work together to provide a complete encrypted messaging ecosystem.

## Repository Structure

```
deltecho/
├── delta-echo-desk/     # Delta Chat Desktop with AI integrations
├── deltecho2/           # Delta Chat Desktop variant
├── deltachat-core/      # Legacy C core library (deprecated)
└── dovecot-core/        # Dovecot mail server core
```

## Subproject Summaries

### delta-echo-desk/
Delta Chat Desktop fork with AI/bot integrations. Cross-platform messaging app built with TypeScript, React, and multiple target platforms (Electron, Tauri, Browser).

**Tech Stack**: TypeScript, React, SCSS, Electron, Tauri (Rust), pnpm
**Key Commands**:
```bash
cd delta-echo-desk
pnpm install
pnpm dev              # Start Electron dev mode
pnpm check            # Run all checks (types, lint, format)
pnpm test             # Run unit tests
```

### deltecho2/
Another Delta Chat Desktop variant with similar architecture to delta-echo-desk.

**Tech Stack**: TypeScript, React, SCSS, Electron, Tauri (Rust), pnpm
**Key Commands**:
```bash
cd deltecho2
pnpm install
pnpm dev              # Start Electron dev mode
pnpm check            # Run all checks
pnpm test             # Run unit tests
```

### deltachat-core/
**DEPRECATED** - Legacy C library for Delta Chat core functionality. The current maintained version is at https://github.com/deltachat/deltachat-core-rust

**Tech Stack**: C, Python (bindings), meson (build system)
**Build**:
```bash
cd deltachat-core
mkdir builddir && cd builddir
meson
ninja
```

### dovecot-core/
Dovecot mail server core providing IMAP, POP3, and LMTP services. Used as the email transport layer.

**Tech Stack**: C
**Documentation**: See `doc/documentation.txt` or https://doc.dovecot.org
**Installation**: See `INSTALL.md`

## Common Development Patterns

### Working with Desktop Apps (delta-echo-desk, deltecho2)

Both desktop applications follow similar patterns:

1. **Package Manager**: pnpm with workspaces
2. **Node Version**: 20.x (check `.nvmrc`)
3. **Monorepo Structure**: `packages/` directory contains:
   - `frontend/` - Shared React UI
   - `runtime/` - Platform abstraction layer
   - `shared/` - Shared types and utilities
   - `target-electron/` - Electron-specific code
   - `target-tauri/` - Tauri-specific code (Rust)
   - `target-browser/` - Browser-specific code
   - `e2e-tests/` - Playwright E2E tests

### Code Quality Commands

For both desktop apps:
```bash
pnpm check           # Run all checks (types, lint, format)
pnpm check:types     # TypeScript only
pnpm check:lint      # ESLint only
pnpm check:format    # Prettier only
pnpm fix             # Auto-fix lint and format issues
```

### Development Workflow

1. Make changes in relevant package(s)
2. Run `pnpm check` to verify code quality
3. Run tests with `pnpm test`
4. Add CHANGELOG.md entry for user-visible changes

## Code Conventions

- Avoid `console.log()` - use proper logging systems
- Use TypeScript strict mode patterns
- Follow existing code style in each subproject
- Functional React components with hooks preferred
- For translations: use `useTranslationFunction()` hook in components

## Git Workflow

- Branch naming: `<username>/<feature>` or fork the repo
- Rebase on main, don't merge main into feature branches
- Squash merge is default for PRs
- Include before/after screenshots for UI changes

## Subproject-Specific Documentation

Each subproject has its own CLAUDE.md with detailed information:
- [delta-echo-desk/CLAUDE.md](delta-echo-desk/CLAUDE.md)
- [deltecho2/CLAUDE.md](deltecho2/CLAUDE.md)

Additional documentation:
- Desktop development: `*/docs/DEVELOPMENT.md`
- Styling guide: `*/docs/STYLES.md`
- E2E testing: `*/docs/E2E-TESTING.md`

## Dependencies Between Subprojects

- **Desktop apps** use deltachat-core (via deltachat-core-rust, not the deprecated C version in this repo)
- **Dovecot** provides mail server infrastructure for email transport
- The desktop apps communicate with mail servers via IMAP/SMTP protocols

## Quick Start

For most development work on the messaging apps:
```bash
cd delta-echo-desk  # or deltecho2
pnpm install
pnpm dev
```

For mail server work:
```bash
cd dovecot-core
# See INSTALL.md for build instructions
```
