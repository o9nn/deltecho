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

export { DovecotIPCTransport } from './DovecotIPCTransport.js';
export { MembraneMailBridge } from './MembraneMailBridge.js';
