/**
 * IPC Module
 *
 * Real IPC implementation for Electron integration and mail-based transport.
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

export {
  DovecotIPCTransport,
  DEFAULT_MAILBOX_MAPPINGS,
  type DovecotConfig,
  type MailIPCMessage,
  type MailboxChannelMapping,
  type TransportStats,
  type TransportEvent,
} from './DovecotIPCTransport.js';

export {
  MembraneMailBridge,
  type MembraneMailBridgeConfig,
  type MailProcessingRequest,
  type MailProcessingResult,
  type BridgeStats,
  type BridgeEvent,
} from './MembraneMailBridge.js';
