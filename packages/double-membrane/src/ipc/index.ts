/**
 * IPC Module
 *
 * Real IPC implementation for Electron integration.
 */

export {
  IPCBridge,
  createPreloadScript,
  type IPCMessageType,
  type IPCChannel,
  type IPCMessage,
  type IPCHandler,
  type IPCBridgeConfig,
} from './IPCBridge.js';
