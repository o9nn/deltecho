# Repo Repair Skill

Analyze and repair a monorepo for build/type errors. Use when encountering module resolution failures, TypeScript compilation errors, or dependency issues.

## Trigger Patterns

- "Cannot find module" errors
- TypeScript build failures
- pnpm/npm install errors
- "analyze repo" or "initiate repairs"
- Dependency resolution failures

## Diagnostic Workflow

### 1. Module Resolution Issues

**Symptoms**: `TS2307: Cannot find module 'package-name'`

**Diagnosis**:
```bash
# Check package.json dependency declarations
grep -r '"file:' */package.json packages/*/package.json
# Check for inconsistent workspace references
grep -r '"workspace:' */package.json packages/*/package.json
```

**Fix**: Convert `file:` paths to `workspace:*` protocol in pnpm monorepos:
```json
// Before
"dependencies": {
  "local-package": "file:../local-package"
}
// After
"dependencies": {
  "local-package": "workspace:*"
}
```

Then run `pnpm install` to regenerate lockfile.

### 2. Type Declaration Conflicts

**Symptoms**: `TS2687: All declarations of 'X' must have identical modifiers` or `TS2717: Subsequent property declarations must have the same type`

**Diagnosis**: Usually caused by conflicting type declarations from different packages (e.g., @types/node vs electron).

**Fix**: Add `skipLibCheck: true` to tsconfig.json:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

### 3. ArrayBuffer/Typed Array Compatibility

**Symptoms**: `TS2345: Argument of type 'Int8Array[]' is not assignable to parameter of type 'BlobPart[]'`

**Diagnosis**: `Int8Array` uses `ArrayBuffer` while `Blob` expects `ArrayBufferLike` (which includes `Uint8Array`).

**Fix**: Use `Uint8Array` with explicit buffer copying:
```typescript
// Buffer storage
private dataBuffer: Uint8Array[] = []

// Append with explicit copy
appendToBuffer(buffer: ArrayBuffer | Int8Array | Uint8Array): void {
  const copy = new Uint8Array(buffer.byteLength)
  copy.set(new Uint8Array(
    buffer instanceof ArrayBuffer ? buffer : buffer.buffer,
    buffer instanceof ArrayBuffer ? 0 : buffer.byteOffset,
    buffer.byteLength
  ))
  this.dataBuffer.push(copy)
}

// Blob creation with cast
new Blob(dataBuffer as BlobPart[], { type: 'audio/mp3' })
```

### 4. Dynamic Import Support

**Symptoms**: `TS1323: Dynamic imports are only supported when the '--module' flag is set to 'es2020', 'es2022', 'esnext', 'commonjs', 'amd', 'system', 'umd', 'node16', or 'nodenext'`

**Fix**: Update tsconfig.json module setting:
```json
{
  "compilerOptions": {
    "module": "es2020"  // or "esnext"
  }
}
```

### 5. Git Version Info Fallback

**Symptoms**: Build fails when no git tags exist in repo.

**Fix**: Add fallback to commit SHA:
```javascript
try {
  git_describe = gatherProcessStdout('git', ['describe', '--tags'])
} catch (err) {
  // Fallback to commit SHA if no tags are present
  try {
    git_describe = gatherProcessStdout('git', ['rev-parse', 'HEAD']).substring(0, 7)
    git_branch = git_branch || 'main'
  } catch (fallbackErr) {
    git_describe = 'unknown'
    git_branch = 'main'
  }
}
```

### 6. Duplicate Declaration Conflicts

**Symptoms**: `TS2440: Import declaration conflicts with local declaration`

**Diagnosis**: Same type defined locally and imported from another package.

**Fix**: Remove the local duplicate definition and use the imported one.

## Monorepo Build Order

For pnpm workspaces, build in dependency order:

1. **shared** (no dependencies)
2. **core** (depends on shared)
3. **dove9** (depends on core)
4. **cognitive** (depends on core, dove9)
5. **reasoning** (depends on cognitive)
6. **ui-components** (depends on cognitive, shared)
7. **apps** (depend on packages)

## Repair Checklist

- [ ] Run `pnpm install` after dependency changes
- [ ] Check all `package.json` files use `workspace:*` for local deps
- [ ] Verify tsconfig.json has `skipLibCheck: true` for Electron/Node apps
- [ ] Ensure `module` setting supports dynamic imports if needed
- [ ] Test build: `pnpm build` or `pnpm check:types`
- [ ] Run type check: `tsc --noEmit`

## Quick Commands

```bash
# Find all local package references
grep -rE '"(file:|workspace:)' */package.json packages/*/package.json

# Type check entire monorepo
pnpm check

# Build all packages in order
pnpm build

# Clean and rebuild
pnpm clean && pnpm install && pnpm build
```
