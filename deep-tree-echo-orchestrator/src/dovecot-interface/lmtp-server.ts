import { getLogger } from 'deep-tree-echo-core'
import * as net from 'net'
import * as fs from 'fs'
import { EmailMessage, EmailAttachment } from './milter-server.js'

const log = getLogger('deep-tree-echo-orchestrator/LMTPServer')

/**
 * LMTP server configuration
 */
export interface LMTPConfig {
  socketPath: string
  allowedDomains: string[]
  timeout?: number
  maxMessageSize?: number
}

/**
 * LMTP session state
 */
interface LMTPSession {
  mailFrom: string
  rcptTo: string[]
  data: string[]
  inData: boolean
}

/**
 * LMTPServer - Implements the Local Mail Transfer Protocol for Dovecot integration
 *
 * LMTP (RFC 2033) is used for local mail delivery within a mail system.
 * This allows Deep Tree Echo to:
 * - Receive mail directly from Dovecot's LDA
 * - Process messages before final delivery
 * - Store messages in its own format
 */
export class LMTPServer {
  private config: LMTPConfig
  private server?: net.Server
  private connections: Map<net.Socket, LMTPSession> = new Map()
  private listeners: Map<string, Function[]> = new Map()

  constructor(config: LMTPConfig) {
    this.config = {
      timeout: 60000,
      maxMessageSize: 50 * 1024 * 1024, // 50MB
      ...config,
    }
  }

  /**
   * Start the LMTP server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clean up existing socket file if it exists
      if (
        this.config.socketPath.startsWith('/') &&
        fs.existsSync(this.config.socketPath)
      ) {
        fs.unlinkSync(this.config.socketPath)
      }

      this.server = net.createServer(socket => {
        this.handleConnection(socket)
      })

      this.server.on('error', error => {
        log.error('LMTP server error:', error)
        reject(error)
      })

      if (this.config.socketPath.startsWith('/')) {
        // Unix socket
        this.server.listen(this.config.socketPath, () => {
          log.info(`LMTP server listening on Unix socket: ${this.config.socketPath}`)
          fs.chmodSync(this.config.socketPath, 0o660)
          resolve()
        })
      } else {
        // TCP socket
        const [host, portStr] = this.config.socketPath.split(':')
        const port = parseInt(portStr, 10) || 24
        this.server.listen(port, host || '127.0.0.1', () => {
          log.info(`LMTP server listening on ${host || '127.0.0.1'}:${port}`)
          resolve()
        })
      }
    })
  }

  /**
   * Stop the LMTP server
   */
  public async stop(): Promise<void> {
    return new Promise(resolve => {
      this.connections.forEach((session, socket) => {
        socket.destroy()
      })
      this.connections.clear()

      if (this.server) {
        this.server.close(() => {
          log.info('LMTP server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * Handle new LMTP connection
   */
  private handleConnection(socket: net.Socket): void {
    const session: LMTPSession = {
      mailFrom: '',
      rcptTo: [],
      data: [],
      inData: false,
    }
    this.connections.set(socket, session)

    // Send greeting
    this.send(socket, '220 deep-tree-echo.local LMTP Deep Tree Echo ready')

    let buffer = ''

    socket.on('data', data => {
      buffer += data.toString('utf8')

      // Process complete lines
      let newlineIndex
      while ((newlineIndex = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.substring(0, newlineIndex)
        buffer = buffer.substring(newlineIndex + 2)

        this.handleLine(socket, session, line)
      }
    })

    socket.on('close', () => {
      this.connections.delete(socket)
      log.debug('LMTP connection closed')
    })

    socket.on('error', error => {
      log.error('LMTP connection error:', error)
      this.connections.delete(socket)
    })

    socket.setTimeout(this.config.timeout!, () => {
      this.send(socket, '421 Connection timeout')
      socket.end()
    })
  }

  /**
   * Handle a line of LMTP input
   */
  private handleLine(socket: net.Socket, session: LMTPSession, line: string): void {
    // If in DATA mode
    if (session.inData) {
      if (line === '.') {
        // End of DATA
        session.inData = false
        this.processMessage(socket, session)
      } else {
        // Remove dot-stuffing
        const dataLine = line.startsWith('.') ? line.substring(1) : line
        session.data.push(dataLine)
      }
      return
    }

    const command = line.substring(0, 4).toUpperCase()
    const args = line.substring(5).trim()

    switch (command) {
      case 'LHLO':
        this.handleLhlo(socket, args)
        break
      case 'MAIL':
        this.handleMailFrom(socket, session, args)
        break
      case 'RCPT':
        this.handleRcptTo(socket, session, args)
        break
      case 'DATA':
        this.handleData(socket, session)
        break
      case 'RSET':
        this.handleRset(socket, session)
        break
      case 'NOOP':
        this.send(socket, '250 OK')
        break
      case 'QUIT':
        this.send(socket, '221 Bye')
        socket.end()
        break
      default:
        this.send(socket, '500 Unknown command')
    }
  }

  /**
   * Handle LHLO command
   */
  private handleLhlo(socket: net.Socket, clientName: string): void {
    log.debug(`LHLO from: ${clientName}`)
    this.send(socket, '250-deep-tree-echo.local')
    this.send(socket, '250-PIPELINING')
    this.send(socket, '250-ENHANCEDSTATUSCODES')
    this.send(socket, `250 SIZE ${this.config.maxMessageSize}`)
  }

  /**
   * Handle MAIL FROM command
   */
  private handleMailFrom(socket: net.Socket, session: LMTPSession, args: string): void {
    const match = args.match(/FROM:\s*<?([^>]*)>?/i)
    if (match) {
      session.mailFrom = match[1]
      session.rcptTo = []
      session.data = []
      this.send(socket, '250 2.1.0 OK')
    } else {
      this.send(socket, '501 Syntax error')
    }
  }

  /**
   * Handle RCPT TO command
   */
  private handleRcptTo(socket: net.Socket, session: LMTPSession, args: string): void {
    const match = args.match(/TO:\s*<?([^>]*)>?/i)
    if (match) {
      const recipient = match[1]

      // Check if domain is allowed
      const domain = recipient.split('@')[1]
      if (this.isDomainAllowed(domain)) {
        session.rcptTo.push(recipient)
        this.send(socket, '250 2.1.5 OK')
      } else {
        this.send(socket, '550 5.1.1 Recipient rejected')
      }
    } else {
      this.send(socket, '501 Syntax error')
    }
  }

  /**
   * Handle DATA command
   */
  private handleData(socket: net.Socket, session: LMTPSession): void {
    if (session.rcptTo.length === 0) {
      this.send(socket, '503 No recipients')
      return
    }
    session.inData = true
    session.data = []
    this.send(socket, '354 Start mail input')
  }

  /**
   * Handle RSET command
   */
  private handleRset(socket: net.Socket, session: LMTPSession): void {
    session.mailFrom = ''
    session.rcptTo = []
    session.data = []
    session.inData = false
    this.send(socket, '250 OK')
  }

  /**
   * Process a complete message
   */
  private processMessage(socket: net.Socket, session: LMTPSession): void {
    const rawMessage = session.data.join('\r\n')

    // Parse the message
    const message = this.parseEmail(rawMessage, session.mailFrom, session.rcptTo)

    log.info(`Received message: ${message.subject} from ${message.from}`)

    // Emit the message for processing
    this.emit('email', message)

    // Send response for each recipient (LMTP requirement)
    session.rcptTo.forEach(recipient => {
      this.send(socket, `250 2.0.0 <${message.messageId}> Delivered to ${recipient}`)
    })

    // Reset for next message
    session.mailFrom = ''
    session.rcptTo = []
    session.data = []
  }

  /**
   * Parse raw email into EmailMessage structure
   */
  private parseEmail(raw: string, from: string, to: string[]): EmailMessage {
    const headers = new Map<string, string>()
    const lines = raw.split('\r\n')
    let bodyStart = 0
    let currentHeader = ''

    // Parse headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line === '') {
        bodyStart = i + 1
        break
      }

      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Continuation of previous header
        if (currentHeader) {
          headers.set(currentHeader, headers.get(currentHeader) + ' ' + line.trim())
        }
      } else {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          currentHeader = line.substring(0, colonIndex).toLowerCase()
          headers.set(currentHeader, line.substring(colonIndex + 1).trim())
        }
      }
    }

    const body = lines.slice(bodyStart).join('\r\n')

    return {
      messageId: headers.get('message-id') || `<${Date.now()}@deep-tree-echo>`,
      from: headers.get('from') || from,
      to: to,
      cc: headers.get('cc')?.split(',').map(e => e.trim()) || [],
      bcc: [],
      subject: headers.get('subject') || '(no subject)',
      body: body,
      headers: headers,
      attachments: [], // TODO: Parse MIME attachments
      receivedAt: new Date(),
    }
  }

  /**
   * Check if domain is in allowed list
   */
  private isDomainAllowed(domain: string): boolean {
    if (this.config.allowedDomains.includes('*')) return true
    return this.config.allowedDomains.includes(domain?.toLowerCase())
  }

  /**
   * Send a response line
   */
  private send(socket: net.Socket, message: string): void {
    socket.write(message + '\r\n')
  }

  /**
   * Event emitter functionality
   */
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  public emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || []
    callbacks.forEach(cb => cb(data))
  }
}
