/**
 * Bundle the cognitive E2E harness into a single browser module.
 *
 * The harness imports the real browser-safe `CognitiveBridge`; its only
 * non-browser import (`@deltachat-desktop/shared/logger`) is aliased to a
 * console-backed stub so the bundle is fully self-contained.
 */
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')

await build({
  entryPoints: [resolve(pkgRoot, 'cognitive-harness/harness.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  outfile: resolve(pkgRoot, 'cognitive-harness/dist/harness.js'),
  alias: {
    '@deltachat-desktop/shared/logger': resolve(
      pkgRoot,
      'cognitive-harness/harness-logger.ts'
    ),
  },
  logLevel: 'info',
})

console.log('Cognitive harness bundled -> cognitive-harness/dist/harness.js')
