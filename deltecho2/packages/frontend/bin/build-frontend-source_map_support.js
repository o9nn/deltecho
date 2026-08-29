import { copyFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const browserSourceMapSupportPath = join(
  __dirname,
  '..',
  'node_modules',
  'source-map-support',
  'browser-source-map-support.js'
)
const destinationPath = join(
  __dirname,
  '..',
  'html-dist',
  'browser-source-map-support.js'
)

// Multiple build targets (browser/tauri/electron) may invoke this script
// concurrently on the same frontend package, which can fail on Windows with
// EBUSY when both processes copy to the same destination file.
function copyWithRetry(src, dest, retries = 5, delayMs = 250) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      copyFileSync(src, dest)
      return
    } catch (error) {
      if (
        (error.code === 'EBUSY' || error.code === 'EPERM') &&
        attempt < retries
      ) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs)
        continue
      }
      if (error.code === 'EBUSY' || error.code === 'EPERM') {
        // Another concurrent build may have already copied the same file.
        if (
          existsSync(dest) &&
          readFileSync(src).equals(readFileSync(dest))
        ) {
          return
        }
      }
      throw error
    }
  }
}

copyWithRetry(browserSourceMapSupportPath, destinationPath)
