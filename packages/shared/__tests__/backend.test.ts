/**
 * Backend Module Tests
 * 
 * Tests for the Delta Chat backend abstraction layer
 * that provides messaging and account management capabilities.
 */

import {
  BackendRemote,
  BackendInterface,
  setBackend,
  getBackend,
  defaultBackend,
  Chat,
  ChatMessage,
  Contact,
  Account,
} from '../backend.js'

describe('Backend Module', () => {
  // Store original backend to restore after tests
  let originalBackend: BackendInterface

  beforeEach(() => {
    // Reset to default backend before each test
    setBackend(defaultBackend)
  })

  describe('Default Backend', () => {
    it('should provide a default backend implementation', () => {
      const backend = getBackend()
      expect(backend).toBeDefined()
      expect(typeof backend.getSelectedAccountId).toBe('function')
      expect(typeof backend.getAccount).toBe('function')
      expect(typeof backend.getAllAccounts).toBe('function')
      expect(typeof backend.getChat).toBe('function')
      expect(typeof backend.getChats).toBe('function')
      expect(typeof backend.getMessages).toBe('function')
      expect(typeof backend.sendMessage).toBe('function')
    })

    it('should return null for getSelectedAccountId by default', async () => {
      const accountId = await BackendRemote.rpc.getSelectedAccountId()
      expect(accountId).toBeNull()
    })

    it('should return empty array for getAllAccounts by default', async () => {
      const accounts = await BackendRemote.rpc.getAllAccounts()
      expect(accounts).toEqual([])
    })

    it('should return null for getAccount by default', async () => {
      const account = await BackendRemote.rpc.getAccount(1)
      expect(account).toBeNull()
    })

    it('should return empty array for getChats by default', async () => {
      const chats = await BackendRemote.rpc.getChats(1)
      expect(chats).toEqual([])
    })

    it('should return empty array for getMessages by default', async () => {
      const messages = await BackendRemote.rpc.getMessages(1, 1)
      expect(messages).toEqual([])
    })

    it('should return 0 for sendMessage by default', async () => {
      const messageId = await BackendRemote.rpc.sendMessage(1, 1, 'test')
      expect(messageId).toBe(0)
    })
  })

  describe('Custom Backend', () => {
    it('should allow setting a custom backend implementation', async () => {
      const mockAccounts: Account[] = [
        { id: 1, displayName: 'Test User', address: 'test@example.com', isConfigured: true },
      ]

      const customBackend: BackendInterface = {
        ...defaultBackend,
        getAllAccounts: jest.fn().mockResolvedValue(mockAccounts),
      }

      setBackend(customBackend)
      const accounts = await BackendRemote.rpc.getAllAccounts()

      expect(accounts).toEqual(mockAccounts)
      expect(customBackend.getAllAccounts).toHaveBeenCalled()
    })

    it('should use custom backend for getSelectedAccountId', async () => {
      const customBackend: BackendInterface = {
        ...defaultBackend,
        getSelectedAccountId: jest.fn().mockResolvedValue(42),
      }

      setBackend(customBackend)
      const accountId = await BackendRemote.rpc.getSelectedAccountId()

      expect(accountId).toBe(42)
      expect(customBackend.getSelectedAccountId).toHaveBeenCalled()
    })

    it('should use custom backend for sendMessage', async () => {
      const customBackend: BackendInterface = {
        ...defaultBackend,
        sendMessage: jest.fn().mockResolvedValue(123),
      }

      setBackend(customBackend)
      const messageId = await BackendRemote.rpc.sendMessage(1, 1, 'Hello!')

      expect(messageId).toBe(123)
      expect(customBackend.sendMessage).toHaveBeenCalledWith(1, 1, 'Hello!')
    })
  })

  describe('BackendRemote.rpc', () => {
    it('should expose all required RPC methods', () => {
      expect(typeof BackendRemote.rpc.getSelectedAccountId).toBe('function')
      expect(typeof BackendRemote.rpc.getAccount).toBe('function')
      expect(typeof BackendRemote.rpc.getAllAccounts).toBe('function')
      expect(typeof BackendRemote.rpc.getChat).toBe('function')
      expect(typeof BackendRemote.rpc.getChats).toBe('function')
      expect(typeof BackendRemote.rpc.getMessages).toBe('function')
      expect(typeof BackendRemote.rpc.sendMessage).toBe('function')
      expect(typeof BackendRemote.rpc.sendFileMessage).toBe('function')
      expect(typeof BackendRemote.rpc.getContact).toBe('function')
      expect(typeof BackendRemote.rpc.getContacts).toBe('function')
      expect(typeof BackendRemote.rpc.createChat).toBe('function')
      expect(typeof BackendRemote.rpc.deleteChat).toBe('function')
      expect(typeof BackendRemote.rpc.markMessagesRead).toBe('function')
      expect(typeof BackendRemote.rpc.getSelfContact).toBe('function')
    })

    it('should expose optional RPC methods', () => {
      expect(typeof BackendRemote.rpc.getMessage).toBe('function')
      expect(typeof BackendRemote.rpc.miscSendTextMessage).toBe('function')
      expect(typeof BackendRemote.rpc.createGroupChat).toBe('function')
      expect(typeof BackendRemote.rpc.addContactToChat).toBe('function')
      expect(typeof BackendRemote.rpc.getAllAccountIds).toBe('function')
      expect(typeof BackendRemote.rpc.getAccountInfo).toBe('function')
      expect(typeof BackendRemote.rpc.createContact).toBe('function')
    })
  })

  describe('BackendRemote.onEvent', () => {
    it('should return unsubscribe function', () => {
      const unsubscribe = BackendRemote.onEvent('TestEvent', () => {})
      expect(typeof unsubscribe).toBe('function')
    })

    it('should call backend onEvent with correct parameters', () => {
      const customBackend: BackendInterface = {
        ...defaultBackend,
        onEvent: jest.fn().mockReturnValue(() => {}),
      }

      setBackend(customBackend)
      const handler = jest.fn()
      BackendRemote.onEvent('IncomingMsg', handler)

      expect(customBackend.onEvent).toHaveBeenCalledWith('IncomingMsg', handler)
    })
  })

  describe('Optional Method Fallbacks', () => {
    it('should fallback getMessage to null when not implemented', async () => {
      const message = await BackendRemote.rpc.getMessage(1, 1)
      expect(message).toBeNull()
    })

    it('should fallback miscSendTextMessage to sendMessage', async () => {
      const customBackend: BackendInterface = {
        ...defaultBackend,
        sendMessage: jest.fn().mockResolvedValue(456),
      }

      setBackend(customBackend)
      const messageId = await BackendRemote.rpc.miscSendTextMessage(1, 1, 'Test')

      expect(messageId).toBe(456)
      expect(customBackend.sendMessage).toHaveBeenCalledWith(1, 1, 'Test')
    })

    it('should fallback createGroupChat to 0 when not implemented', async () => {
      const chatId = await BackendRemote.rpc.createGroupChat(1, 'Test Group', [])
      expect(chatId).toBe(0)
    })

    it('should fallback getAllAccountIds to getAllAccounts mapping', async () => {
      const mockAccounts: Account[] = [
        { id: 1, displayName: 'User 1', address: 'user1@example.com', isConfigured: true },
        { id: 2, displayName: 'User 2', address: 'user2@example.com', isConfigured: true },
      ]

      const customBackend: BackendInterface = {
        ...defaultBackend,
        getAllAccounts: jest.fn().mockResolvedValue(mockAccounts),
      }

      setBackend(customBackend)
      const accountIds = await BackendRemote.rpc.getAllAccountIds()

      expect(accountIds).toEqual([1, 2])
    })

    it('should fallback getAccountInfo to getAccount', async () => {
      const mockAccount: Account = {
        id: 1,
        displayName: 'Test User',
        address: 'test@example.com',
        isConfigured: true,
      }

      const customBackend: BackendInterface = {
        ...defaultBackend,
        getAccount: jest.fn().mockResolvedValue(mockAccount),
      }

      setBackend(customBackend)
      const account = await BackendRemote.rpc.getAccountInfo(1)

      expect(account).toEqual(mockAccount)
      expect(customBackend.getAccount).toHaveBeenCalledWith(1)
    })

    it('should fallback createContact to 0 when not implemented', async () => {
      const contactId = await BackendRemote.rpc.createContact(1, 'test@example.com', 'Test')
      expect(contactId).toBe(0)
    })
  })

  describe('Chat Operations', () => {
    it('should handle getChat correctly', async () => {
      const mockChat: Chat = {
        id: 1,
        name: 'Test Chat',
        profileImage: undefined,
        color: '#000000',
        isGroup: false,
        isProtected: false,
        isContactRequest: false,
        isSelfTalk: false,
        isDeviceChat: false,
        isMuted: false,
        isArchived: false,
        isPinned: false,
        unreadCount: 0,
      }

      const customBackend: BackendInterface = {
        ...defaultBackend,
        getChat: jest.fn().mockResolvedValue(mockChat),
      }

      setBackend(customBackend)
      const chat = await BackendRemote.rpc.getChat(1, 1)

      expect(chat).toEqual(mockChat)
      expect(customBackend.getChat).toHaveBeenCalledWith(1, 1)
    })

    it('should handle deleteChat correctly', async () => {
      const customBackend: BackendInterface = {
        ...defaultBackend,
        deleteChat: jest.fn().mockResolvedValue(undefined),
      }

      setBackend(customBackend)
      await BackendRemote.rpc.deleteChat(1, 1)

      expect(customBackend.deleteChat).toHaveBeenCalledWith(1, 1)
    })
  })

  describe('Message Operations', () => {
    it('should handle getMessages with options', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 1,
          chatId: 1,
          fromId: 2,
          text: 'Hello',
          timestamp: Date.now(),
          isOutgoing: false,
          state: 'delivered',
        },
      ]

      const customBackend: BackendInterface = {
        ...defaultBackend,
        getMessages: jest.fn().mockResolvedValue(mockMessages),
      }

      setBackend(customBackend)
      const messages = await BackendRemote.rpc.getMessages(1, 1, { startIndex: 0, count: 10 })

      expect(messages).toEqual(mockMessages)
      expect(customBackend.getMessages).toHaveBeenCalledWith(1, 1, { startIndex: 0, count: 10 })
    })

    it('should handle sendFileMessage correctly', async () => {
      const customBackend: BackendInterface = {
        ...defaultBackend,
        sendFileMessage: jest.fn().mockResolvedValue(789),
      }

      setBackend(customBackend)
      const messageId = await BackendRemote.rpc.sendFileMessage(1, 1, '/path/to/file.jpg', 'Check this out!')

      expect(messageId).toBe(789)
      expect(customBackend.sendFileMessage).toHaveBeenCalledWith(1, 1, '/path/to/file.jpg', 'Check this out!')
    })

    it('should handle markMessagesRead correctly', async () => {
      const customBackend: BackendInterface = {
        ...defaultBackend,
        markMessagesRead: jest.fn().mockResolvedValue(undefined),
      }

      setBackend(customBackend)
      await BackendRemote.rpc.markMessagesRead(1, 1, [1, 2, 3])

      expect(customBackend.markMessagesRead).toHaveBeenCalledWith(1, 1, [1, 2, 3])
    })
  })

  describe('Contact Operations', () => {
    it('should handle getContact correctly', async () => {
      const mockContact: Contact = {
        id: 1,
        name: 'Test Contact',
        displayName: 'Test Contact',
        address: 'test@example.com',
        color: '#FF0000',
        isVerified: true,
        isBlocked: false,
      }

      const customBackend: BackendInterface = {
        ...defaultBackend,
        getContact: jest.fn().mockResolvedValue(mockContact),
      }

      setBackend(customBackend)
      const contact = await BackendRemote.rpc.getContact(1, 1)

      expect(contact).toEqual(mockContact)
      expect(customBackend.getContact).toHaveBeenCalledWith(1, 1)
    })

    it('should handle getSelfContact correctly', async () => {
      const mockSelfContact: Contact = {
        id: 1,
        name: 'Me',
        displayName: 'Me',
        address: 'me@example.com',
        color: '#00FF00',
        isVerified: true,
        isBlocked: false,
      }

      const customBackend: BackendInterface = {
        ...defaultBackend,
        getSelfContact: jest.fn().mockResolvedValue(mockSelfContact),
      }

      setBackend(customBackend)
      const selfContact = await BackendRemote.rpc.getSelfContact(1)

      expect(selfContact).toEqual(mockSelfContact)
      expect(customBackend.getSelfContact).toHaveBeenCalledWith(1)
    })
  })
})
