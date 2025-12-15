# CLAUDE.md - Project Guide for Claude Code

## Project Overview

Delta Chat Desktop is a cross-platform desktop messaging application that uses email/SMTP as its transport layer. It's built as a monorepo with multiple target platforms.

## Quick Reference

### Essential Commands

```bash
# Install dependencies
pnpm install

# Development (Electron)
pnpm dev                    # Start Electron dev mode
pnpm watch:electron         # Watch mode (terminal 1)
pnpm start:electron         # Start app (terminal 2)

# Development (Browser)
pnpm build:browser:robust   # Build browser version
pnpm start:browser          # Start browser version

# Code Quality
pnpm check                  # Run all checks (types, lint, format)
pnpm check:types            # TypeScript check only
pnpm check:lint             # ESLint only
pnpm check:format           # Prettier only
pnpm fix                    # Auto-fix lint and format issues
pnpm fix:lint               # Fix ESLint issues
pnpm fix:format             # Fix Prettier issues

# Testing
pnpm test                   # Run unit tests
pnpm e2e                    # Run E2E tests (builds browser first)

# Build for production
pnpm build:electron         # Build Electron app
pnpm build:browser          # Build browser app
```

### Tech Stack

- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 9.6.0+
- **Language**: TypeScript
- **Frontend**: React with SCSS
- **Platforms**: Electron (primary), Tauri (WIP), Browser (experimental)
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier (StandardJS-inspired)
- **Testing**: Jest (unit), Playwright (E2E)

## Project Structure

```
deltachat-desktop/
├── packages/
│   ├── frontend/           # React UI components and logic
│   │   ├── src/            # Source code
│   │   ├── scss/           # Global stylesheets
│   │   └── themes/         # Theme files
│   ├── runtime/            # Platform abstraction layer
│   ├── shared/             # Shared types and utilities
│   ├── target-electron/    # Electron-specific code
│   │   ├── src/            # Main process code
│   │   └── runtime-electron/
│   ├── target-browser/     # Browser-specific code
│   │   └── runtime-browser/
│   ├── target-tauri/       # Tauri-specific code (WIP)
│   └── e2e-tests/          # Playwright E2E tests
├── _locales/               # Translation files
├── bin/                    # Build and utility scripts
├── docs/                   # Documentation
├── static/                 # Static assets (fonts, help, xdcs)
└── images/                 # Icons and images
```

## Code Style Guidelines

### TypeScript/JavaScript

- ESLint with `@typescript-eslint` rules
- Prettier for formatting
- Unused variables prefixed with `_` are allowed
- Avoid `console.log()` - use project logging conventions
- React hooks rules enforced via `eslint-plugin-react-hooks`

### SCSS

- Follow guidelines in `docs/STYLES.md`
- Global styles in `packages/frontend/scss/`

### Translations

- Strings in `_locales/` directory
- New/experimental strings go in `_locales/_untranslated_en.json`
- Use `window.static_translate` for static usage
- Use `useTranslationFunction()` hook in functional components
- Use `<i18nContext.Consumer>` in class components

## Key Development Patterns

### Runtime Abstraction

The `packages/runtime/` provides a platform-agnostic interface. Each target (Electron, Tauri, Browser) implements this interface in their `runtime-*` folder.

### Frontend Hot Reload

In watch mode, press `F5` or `Cmd+R` in the dev console to reload frontend changes. Main process changes require rebuild and restart.

### Logging

- Access logs via `View > Developer` menu
- Debug JSONRPC with `exp.printCallCounterResult()` in dev console
- See `docs/LOGGING.md` for details

## Common Tasks

### Adding a new feature

1. Make changes in relevant package(s)
2. Run `pnpm check` to verify code quality
3. Add entry to `CHANGELOG.md`
4. Create PR with meaningful description

### Running specific package scripts

```bash
pnpm --filter=@deltachat-desktop/frontend <script>
pnpm --filter=@deltachat-desktop/target-electron <script>
```

### Packaging

```bash
# In packages/target-electron/
pnpm pack:generate_config
pnpm pack:patch-node-modules
pnpm pack:linux    # or pack:win, pack:mac
```

## Important Notes

- PRs usually merged via squash-merge
- Always rebase on main, never merge main into feature branches
- Skip changelog with `#skip-changelog` in PR description (with reason)
- Before/after screenshots helpful for UI changes

## Documentation Links

- [Development Guide](docs/DEVELOPMENT.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Styling Guide](docs/STYLES.md)
- [E2E Testing](docs/E2E-TESTING.md)
- [Browser Version](docs/BROWSER_VERSION.md)
- [CLI Flags](docs/CLI_FLAGS.md)
