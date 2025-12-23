/**
 * Backend Communication Abstraction
 * 
 * This module provides an abstraction layer for backend communication
 * that allows the ui-components to work across different environments
 * (Delta Chat Desktop, standalone web, etc.) without tight coupling.
 */

/**
 * Message type for chat messages
 */
export interface ChatMessage {
  id: number
  chatId: number
  fromId: number
  text: string
  timestamp: number
  isOutgoing: boolean
  state: 'pending' | 'delivered' | 'read' | 'failed'
  quotedMessageId?: number
  file?: string
  fileName?: string
  fileSize?: number
  fileMime?: string
}

/**
 * Chat type for chat information
 */
export interface Chat {
  id: number
  name: string
  isGroup: boolean
  isProtected: boolean
  isContactRequest: boolean
  isSelfTalk: boolean
  isDeviceChat: boolean
  isMuted: boolean
  isArchived: boolean
  isPinned: boolean
  profileImage?: string
  color: string
  lastMessage?: ChatMessage
  unreadCount: number
}

/**
 * Contact type for contact information
 */
export interface Contact {
  id: number
  name: string
  displayName: string
  address: string
  profileImage?: string
  color: string
  isVerified: boolean
  isBlocked: boolean
}

/**
 * Account type for account information
 */
export interface Account {
  id: number
  displayName: string
  address: string
  profileImage?: string
  isConfigured: boolean
}

/**
 * Backend interface for Delta Chat communication
 */
export interface BackendInterface {
  /**
   * Get the currently selected account ID
   */
  getSelectedAccountId(): Promise<number | null>
  
  /**
   * Get account information
   */
  getAccount(accountId: number): Promise<Account | null>
  
  /**
   * Get all accounts
   */
  getAllAccounts(): Promise<Account[]>
  
  /**
   * Get chat information
   */
  getChat(accountId: number, chatId: number): Promise<Chat | null>
  
  /**
   * Get all chats for an account
   */
  getChats(accountId: number): Promise<Chat[]>
  
  /**
   * Get messages for a chat
   */
  getMessages(accountId: number, chatId: number, options?: {
    startIndex?: number
    count?: number
  }): Promise<ChatMessage[]>
  
  /**
   * Send a text message
   */
  sendMessage(accountId: number, chatId: number, text: string): Promise<number>
  
  /**
   * Send a message with a file
   */
  sendFileMessage(accountId: number, chatId: number, file: string, text?: string): Promise<number>
  
  /**
   * Get contact information
   */
  getContact(accountId: number, contactId: number): Promise<Contact | null>
  
  /**
   * Get all contacts for an account
   */
  getContacts(accountId: number): Promise<Contact[]>
  
  /**
   * Create a new chat with a contact
   */
  createChat(accountId: number, contactId: number): Promise<number>
  
  /**
   * Delete a chat
   */
  deleteChat(accountId: number, chatId: number): Promise<void>
  
  /**
   * Mark messages as read
   */
  markMessagesRead(accountId: number, chatId: number, messageIds: number[]): Promise<void>
  
  /**
   * Get self contact for an account
   */
  getSelfContact(accountId: number): Promise<Contact | null>
  
  /**
   * Subscribe to events
   */
  onEvent(eventName: string, handler: (event: any) => void): () => void
  
  /**
   * Get a single message by ID
   */
  getMessage?(accountId: number, messageId: number): Promise<ChatMessage | null>
  
  /**
   * Send a text message (misc variant for compatibility)
   */
  miscSendTextMessage?(accountId: number, chatId: number, text: string): Promise<number>
  
  /**
   * Create a group chat
   */
  createGroupChat?(accountId: number, name: string, contactIds: number[]): Promise<number>
  
  /**
   * Add a contact to a chat
   */
  addContactToChat?(accountId: number, chatId: number, contactId: number): Promise<void>
  
  /**
   * Get all account IDs
   */
  getAllAccountIds?(): Promise<number[]>
  
  /**
   * Get account info (alternative to getAccount)
   */
  getAccountInfo?(accountId: number): Promise<Account | null>
  
  /**
   * Create a contact
   */
  createContact?(accountId: number, address: string, name?: string): Promise<number>
}

/**
 * Default no-op backend for environments without backend support
 */
export const defaultBackend: BackendInterface = {
  async getSelectedAccountId(): Promise<number | null> {
    console.warn('Backend not configured: getSelectedAccountId called')
    return null
  },
  
  async getAccount(_accountId: number): Promise<Account | null> {
    console.warn('Backend not configured: getAccount called')
    return null
  },
  
  async getAllAccounts(): Promise<Account[]> {
    console.warn('Backend not configured: getAllAccounts called')
    return []
  },
  
  async getChat(_accountId: number, _chatId: number): Promise<Chat | null> {
    console.warn('Backend not configured: getChat called')
    return null
  },
  
  async getChats(_accountId: number): Promise<Chat[]> {
    console.warn('Backend not configured: getChats called')
    return []
  },
  
  async getMessages(_accountId: number, _chatId: number, _options?: {
    startIndex?: number
    count?: number
  }): Promise<ChatMessage[]> {
    console.warn('Backend not configured: getMessages called')
    return []
  },
  
  async sendMessage(_accountId: number, _chatId: number, _text: string): Promise<number> {
    console.warn('Backend not configured: sendMessage called')
    return 0
  },
  
  async sendFileMessage(_accountId: number, _chatId: number, _file: string, _text?: string): Promise<number> {
    console.warn('Backend not configured: sendFileMessage called')
    return 0
  },
  
  async getContact(_accountId: number, _contactId: number): Promise<Contact | null> {
    console.warn('Backend not configured: getContact called')
    return null
  },
  
  async getContacts(_accountId: number): Promise<Contact[]> {
    console.warn('Backend not configured: getContacts called')
    return []
  },
  
  async createChat(_accountId: number, _contactId: number): Promise<number> {
    console.warn('Backend not configured: createChat called')
    return 0
  },
  
  async deleteChat(_accountId: number, _chatId: number): Promise<void> {
    console.warn('Backend not configured: deleteChat called')
  },
  
  async markMessagesRead(_accountId: number, _chatId: number, _messageIds: number[]): Promise<void> {
    console.warn('Backend not configured: markMessagesRead called')
  },
  
  async getSelfContact(_accountId: number): Promise<Contact | null> {
    console.warn('Backend not configured: getSelfContact called')
    return null
  },
  
  onEvent(_eventName: string, _handler: (event: any) => void): () => void {
    console.warn('Backend not configured: onEvent called')
    return () => {}
  }
}

/**
 * Global backend instance
 */
let backendInstance: BackendInterface = defaultBackend

/**
 * Set the backend implementation
 */
export function setBackend(backend: BackendInterface): void {
  backendInstance = backend
}

/**
 * Get the current backend implementation
 */
export function getBackend(): BackendInterface {
  return backendInstance
}

/**
 * Backend singleton export for convenience
 * This provides a BackendRemote-like interface
 */
export const BackendRemote = {
  rpc: {
    getSelectedAccountId: () => backendInstance.getSelectedAccountId(),
    getAccount: (accountId: number) => backendInstance.getAccount(accountId),
    getAllAccounts: () => backendInstance.getAllAccounts(),
    getChat: (accountId: number, chatId: number) => backendInstance.getChat(accountId, chatId),
    getChats: (accountId: number) => backendInstance.getChats(accountId),
    getMessages: (accountId: number, chatId: number, options?: { startIndex?: number; count?: number }) => 
      backendInstance.getMessages(accountId, chatId, options),
    sendMessage: (accountId: number, chatId: number, text: string) => 
      backendInstance.sendMessage(accountId, chatId, text),
    sendFileMessage: (accountId: number, chatId: number, file: string, text?: string) => 
      backendInstance.sendFileMessage(accountId, chatId, file, text),
    getContact: (accountId: number, contactId: number) => backendInstance.getContact(accountId, contactId),
    getContacts: (accountId: number) => backendInstance.getContacts(accountId),
    createChat: (accountId: number, contactId: number) => backendInstance.createChat(accountId, contactId),
    deleteChat: (accountId: number, chatId: number) => backendInstance.deleteChat(accountId, chatId),
    markMessagesRead: (accountId: number, chatId: number, messageIds: number[]) => 
      backendInstance.markMessagesRead(accountId, chatId, messageIds),
    getSelfContact: (accountId: number) => backendInstance.getSelfContact(accountId),
    getMessage: (accountId: number, messageId: number) => 
      backendInstance.getMessage?.(accountId, messageId) || Promise.resolve(null),
    miscSendTextMessage: (accountId: number, chatId: number, text: string) => 
      backendInstance.miscSendTextMessage?.(accountId, chatId, text) || 
      backendInstance.sendMessage(accountId, chatId, text),
    createGroupChat: (accountId: number, name: string, contactIds: number[]) => 
      backendInstance.createGroupChat?.(accountId, name, contactIds) || Promise.resolve(0),
    addContactToChat: (accountId: number, chatId: number, contactId: number) => 
      backendInstance.addContactToChat?.(accountId, chatId, contactId) || Promise.resolve(),
    getAllAccountIds: () => 
      backendInstance.getAllAccountIds?.() || 
      backendInstance.getAllAccounts().then(accounts => accounts.map(a => a.id)),
    getAccountInfo: (accountId: number) => 
      backendInstance.getAccountInfo?.(accountId) || backendInstance.getAccount(accountId),
    createContact: (accountId: number, address: string, name?: string) => 
      backendInstance.createContact?.(accountId, address, name) || Promise.resolve(0)
  },
  onEvent: (eventName: string, handler: (event: any) => void) => 
    backendInstance.onEvent(eventName, handler)
}

/**
 * Event handler type for DC events
 */
export type DCEventHandler = (event: any) => void

/**
 * Helper function to register DC event handlers
 * This provides an onDCEvent-like interface
 */
export function onDCEvent(eventName: string, handler: DCEventHandler): () => void {
  return backendInstance.onEvent(eventName, handler)
}

/**
 * Selected account ID getter for convenience
 */
export async function selectedAccountId(): Promise<number | null> {
  return backendInstance.getSelectedAccountId()
}
