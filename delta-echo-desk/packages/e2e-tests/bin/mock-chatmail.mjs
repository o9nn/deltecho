/**
 * Mock chatmail server for fully-configured local E2E runs.
 *
 * Implements the minimum surface the Delta Chat browser app needs to onboard
 * accounts without talking to an external chatmail service:
 *
 * - `GET /new` — issues a fresh `dcaccount:` login token (what the
 *   `dcaccount:<server>/new` QR-code flow fetches after the app resolves the
 *   URL). Responds with `application/x-dcaccount` JSON containing
 *   deterministic credentials.
 * - `GET /.well-known/autoconfig/mail/config-v1.1.xml` — autoconfig XML so
 *   login probing succeeds offline.
 * - `POST /rpc` — a tiny JSON-RPC echo used by health checks.
 *
 * IMAP/SMTP are NOT implemented; suites that require actual message transport
 * (basic-tests messaging, group invite flows, qr secure-join) still need the
 * live chatmail service and are kept as opt-in via E2E_LIVE_CHATMAIL=1.
 *
 * Intentionally dependency-free (Node's built-in http) so no extra install is
 * needed in CI.
 */
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'

const port = Number(process.env.MOCK_CHATMAIL_PORT ?? process.env.PORT ?? 4650)
const host = process.env.MOCK_CHATMAIL_HOST ?? 'localhost'
const origin = `http://${host}:${port}`

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function autoconfigXml(email) {
  const safeEmail = escapeXml(email)
  return `<?xml version="1.0" encoding="UTF-8"?>
<clientConfig version="1.1">
  <emailProvider id="mock-chatmail">
    <domain>${host}</domain>
    <displayName>Mock Chatmail</displayName>
    <incomingServer type="imap">
      <hostname>${host}</hostname>
      <port>143</port>
      <socketType>STARTTLS</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>${host}</hostname>
      <port>587</port>
      <socketType>STARTTLS</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </outgoingServer>
  </emailProvider>
  <emailAccount>
    <emailAddress>${safeEmail}</emailAddress>
  </emailAccount>
</clientConfig>`
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', origin)

    if (url.pathname === '/new' || url.pathname === '/new/') {
      const localPart = `e2e-${randomBytes(6).toString('hex')}`
      const email = `${localPart}@${host}`
      const password = randomBytes(9).toString('base64url')
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(
        JSON.stringify({
          email,
          password,
          addr: email,
          mail_pw: password,
          imap: `${host}:143`,
          smtp: `${host}:587`,
        })
      )
      return
    }

    if (url.pathname === '/.well-known/autoconfig/mail/config-v1.1.xml') {
      const email = url.searchParams.get('emailaddress') ?? `user@${host}`
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' })
      res.end(autoconfigXml(email))
      return
    }

    if (url.pathname === '/rpc' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, result: 'ok' }))
      return
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: 'mock-chatmail' }))
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
  } catch (err) {
    console.error('Mock chatmail request handling failed:', err?.stack ?? err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'internal server error' }))
  }
})

server.listen(port, () => {
  console.log(`Mock chatmail server listening on ${origin}/`)
  console.log(`  dcaccount onboarding: dcaccount:${origin}/new`)
})
