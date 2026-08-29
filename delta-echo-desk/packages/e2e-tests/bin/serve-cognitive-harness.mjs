/**
 * Tiny static file server for the cognitive E2E harness.
 *
 * Serves `cognitive-harness/` so Playwright can navigate to `/` and load the
 * harness that installs the `window.__*` cognitive hooks. Intentionally
 * dependency-free (Node's built-in http) so no extra install is needed in CI.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, normalize, extname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', 'cognitive-harness')
const port = Number(process.env.PORT ?? 3000)

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/' || pathname === '') pathname = '/index.html'

    // Prevent path traversal: resolve within root only.
    const filePath = normalize(join(root, pathname))
    if (!filePath.startsWith(root)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    const body = await readFile(filePath)
    res.writeHead(200, {
      'Content-Type':
        CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
    })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(port, () => {
  console.log(`Cognitive harness server listening on http://localhost:${port}/`)
})
