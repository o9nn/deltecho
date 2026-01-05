/**
 * IPCBridge - Real IPC Implementation for Electron Integration
 *
 * Provides bidirectional communication between the main process and renderer
 * processes in Electron, as well as communication with external services.
 */

import { EventEmitter } from 'events';

// Declare window for browser environment detection
declare const window: { electron?: { ipcRenderer: any } } | undefined;

/**
 * IPC message types
 */
export type IPCMessageType =
  | 'request'
  | 'response'
  | 'event'
  | 'stream_start'
  | 'stream_data'
  | 'stream_end'
  | 'error';

/**
 * IPC channel names
 */
export type IPCChannel =
  | 'cognitive:process'
  | 'cognitive:status'
  | 'memory:store'
  | 'memory:retrieve'
  | 'memory:query'
  | 'llm:request'
  | 'llm:stream'
  | 'system:status'
  | 'system:config'
  | 'identity:state'
  | 'identity:update';

/**
 * IPC message structure
 */
export interface IPCMessage {
  id: string;
  type: IPCMessageType;
  channel: IPCChannel;
  payload: any;
  timestamp: number;
  source: string;
  target?: string;
}

/**
 * IPC handler function
 */
export type IPCHandler = (message: IPCMessage) => Promise<any>;

/**
 * IPC bridge configuration
 */
export interface IPCBridgeConfig {
  processId: string;
  maxPendingRequests: number;
  requestTimeout: number;
  enableLogging: boolean;
}

/**
 * Pending request tracker
 */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  timestamp: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: IPCBridgeConfig = {
  processId: 'main',
  maxPendingRequests: 1000,
  requestTimeout: 30000,
  enableLogging: false,
};

/**
 * IPCBridge - Real IPC implementation
 */
export class IPCBridge extends EventEmitter {
  private config: IPCBridgeConfig;
  private handlers: Map<IPCChannel, IPCHandler[]>;
  private pendingRequests: Map<string, PendingRequest>;
  private messageCounter: number = 0;
  private running: boolean = false;

  // Electron IPC references (set when running in Electron)
  private ipcMain?: any;
  private ipcRenderer?: any;
  private webContents?: any;

  constructor(config?: Partial<IPCBridgeConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handlers = new Map();
    this.pendingRequests = new Map();

    // Initialize channel handlers
    const channels: IPCChannel[] = [
      'cognitive:process',
      'cognitive:status',
      'memory:store',
      'memory:retrieve',
      'memory:query',
      'llm:request',
      'llm:stream',
      'system:status',
      'system:config',
      'identity:state',
      'identity:update',
    ];

    for (const channel of channels) {
      this.handlers.set(channel, []);
    }
  }

  /**
   * Initialize the IPC bridge
   */
  public async initialize(): Promise<void> {
    if (this.running) return;

    // Try to detect Electron environment
    try {
      if (typeof window !== 'undefined' && (window as any).electron) {
        // Renderer process
        this.ipcRenderer = (window as any).electron.ipcRenderer;
        this.setupRendererListeners();
      } else if (typeof process !== 'undefined' && (process as any).type === 'browser') {
        // Main process
        const electron = require('electron');
        this.ipcMain = electron.ipcMain;
        this.setupMainListeners();
      }
    } catch {
      // Not in Electron environment - use EventEmitter fallback
      this.log('Not in Electron environment, using EventEmitter fallback');
    }

    this.running = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the IPC bridge
   */
  public async shutdown(): Promise<void> {
    if (!this.running) return;

    // Cancel all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('IPC bridge shutting down'));
      this.pendingRequests.delete(id);
    }

    this.running = false;
    this.emit('shutdown');
  }

  /**
   * Setup listeners for main process
   */
  private setupMainListeners(): void {
    if (!this.ipcMain) return;

    for (const channel of this.handlers.keys()) {
      this.ipcMain.handle(channel, async (_event: any, message: IPCMessage) => {
        return this.handleMessage(message);
      });
    }
  }

  /**
   * Setup listeners for renderer process
   */
  private setupRendererListeners(): void {
    if (!this.ipcRenderer) return;

    for (const channel of this.handlers.keys()) {
      this.ipcRenderer.on(channel, (_event: any, message: IPCMessage) => {
        this.handleMessage(message);
      });
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    this.messageCounter++;
    return `${this.config.processId}-${Date.now()}-${this.messageCounter}`;
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[IPCBridge:${this.config.processId}] ${message}`, data || '');
    }
  }

  /**
   * Register a handler for a channel
   */
  public on(channel: IPCChannel, handler: IPCHandler): this {
    const handlers = this.handlers.get(channel);
    if (handlers) {
      handlers.push(handler);
    }
    return this;
  }

  /**
   * Remove a handler from a channel
   */
  public off(channel: IPCChannel, handler: IPCHandler): this {
    const handlers = this.handlers.get(channel);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Send a request and wait for response
   */
  public async request(channel: IPCChannel, payload: any, target?: string): Promise<any> {
    if (!this.running) {
      throw new Error('IPC bridge not running');
    }

    if (this.pendingRequests.size >= this.config.maxPendingRequests) {
      throw new Error('Too many pending requests');
    }

    const message: IPCMessage = {
      id: this.generateMessageId(),
      type: 'request',
      channel,
      payload,
      timestamp: Date.now(),
      source: this.config.processId,
      target,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Request timeout for ${channel}`));
      }, this.config.requestTimeout);

      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout,
        timestamp: Date.now(),
      });

      this.sendMessage(message);
    });
  }

  /**
   * Send a one-way event
   */
  public send(channel: IPCChannel, payload: any, target?: string): void {
    if (!this.running) {
      throw new Error('IPC bridge not running');
    }

    const message: IPCMessage = {
      id: this.generateMessageId(),
      type: 'event',
      channel,
      payload,
      timestamp: Date.now(),
      source: this.config.processId,
      target,
    };

    this.sendMessage(message);
  }

  /**
   * Start a streaming response
   */
  public async *stream(channel: IPCChannel, payload: any): AsyncGenerator<any> {
    if (!this.running) {
      throw new Error('IPC bridge not running');
    }

    const streamId = this.generateMessageId();
    const streamQueue: any[] = [];
    let streamEnded = false;
    let streamError: Error | null = null;
    let resolveNext: (() => void) | null = null;

    // Setup stream handlers
    const dataHandler = (message: IPCMessage) => {
      if (message.payload.streamId === streamId) {
        if (message.type === 'stream_data') {
          streamQueue.push(message.payload.data);
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
        } else if (message.type === 'stream_end') {
          streamEnded = true;
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
        } else if (message.type === 'error') {
          streamError = new Error(message.payload.error);
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
        }
      }
    };

    this.on(channel, dataHandler as any);

    // Start the stream
    const startMessage: IPCMessage = {
      id: streamId,
      type: 'stream_start',
      channel,
      payload: { ...payload, streamId },
      timestamp: Date.now(),
      source: this.config.processId,
    };

    this.sendMessage(startMessage);

    try {
      while (!streamEnded && !streamError) {
        if (streamQueue.length > 0) {
          yield streamQueue.shift();
        } else {
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
        }
      }

      // Yield remaining items
      while (streamQueue.length > 0) {
        yield streamQueue.shift();
      }

      if (streamError) {
        throw streamError;
      }
    } finally {
      this.off(channel, dataHandler as any);
    }
  }

  /**
   * Send a message through the appropriate transport
   */
  private sendMessage(message: IPCMessage): void {
    this.log(`Sending message on ${message.channel}`, message);

    if (this.ipcRenderer) {
      // Renderer -> Main
      this.ipcRenderer.invoke(message.channel, message);
    } else if (this.ipcMain && this.webContents) {
      // Main -> Renderer
      this.webContents.send(message.channel, message);
    } else {
      // Fallback: use EventEmitter for local communication
      this.handleMessage(message);
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: IPCMessage): Promise<any> {
    this.log(`Received message on ${message.channel}`, message);

    // Check if this is a response to a pending request
    if (message.type === 'response') {
      const pending = this.pendingRequests.get(message.payload.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.payload.requestId);
        if (message.payload.error) {
          pending.reject(new Error(message.payload.error));
        } else {
          pending.resolve(message.payload.result);
        }
        return;
      }
    }

    // Handle with registered handlers
    const handlers = this.handlers.get(message.channel);
    if (!handlers || handlers.length === 0) {
      this.log(`No handlers for channel ${message.channel}`);
      return;
    }

    try {
      // Execute all handlers
      const results = await Promise.all(handlers.map((handler) => handler(message)));
      const result = results.length === 1 ? results[0] : results;

      // Send response if this was a request
      if (message.type === 'request') {
        const response: IPCMessage = {
          id: this.generateMessageId(),
          type: 'response',
          channel: message.channel,
          payload: { requestId: message.id, result },
          timestamp: Date.now(),
          source: this.config.processId,
          target: message.source,
        };
        this.sendMessage(response);
        return result;
      }

      return result;
    } catch (error) {
      this.log(`Error handling message on ${message.channel}`, error);

      // Send error response if this was a request
      if (message.type === 'request') {
        const response: IPCMessage = {
          id: this.generateMessageId(),
          type: 'response',
          channel: message.channel,
          payload: { requestId: message.id, error: String(error) },
          timestamp: Date.now(),
          source: this.config.processId,
          target: message.source,
        };
        this.sendMessage(response);
      }

      throw error;
    }
  }

  /**
   * Set web contents for main -> renderer communication
   */
  public setWebContents(webContents: any): void {
    this.webContents = webContents;
  }

  /**
   * Get pending request count
   */
  public getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Check if running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get registered channels
   */
  public getChannels(): IPCChannel[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Create preload script for Electron
 */
export function createPreloadScript(): string {
  return `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, func) => {
      const subscription = (_event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  },
});
`;
}

export default IPCBridge;
