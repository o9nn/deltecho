import '@testing-library/jest-dom'

// Set up global type definitions for testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveTextContent(text: string): R
      toHaveValue(value: string | number): R
      toBeDisabled(): R
    }
  }
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window functions
window.confirm = jest.fn()
window.alert = jest.fn()

// Initialize logger for tests
jest.mock('@deltachat-desktop/shared/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  setLogHandler: jest.fn(),
}))

// Mock runtime interface
jest.mock('@deltachat-desktop/runtime-interface', () => ({
  runtime: {
    createDeltaChatConnection: jest.fn(() => ({
      rpc: {
        // Add any other RPC methods as needed
      },
    })),
    getDesktopSettings: jest.fn().mockResolvedValue({
      deepTreeEchoBotEnabled: true,
      deepTreeEchoBotApiKey: 'test-api-key',
      deepTreeEchoBotApiEndpoint: 'https://test-api-endpoint.com',
      deepTreeEchoBotMemoryEnabled: true,
      deepTreeEchoBotPersonality: 'Test personality',
      deepTreeEchoBotVisionEnabled: false,
      deepTreeEchoBotWebAutomationEnabled: false,
      deepTreeEchoBotEmbodimentEnabled: false,
      // Add other required properties with defaults
      bounds: {},
      HTMLEmailWindowBounds: undefined,
      enableAVCalls: true,
      enableBroadcastLists: true,
      enableChatAuditLog: true,
      enableOnDemandLocationStreaming: true,
      enterKeySends: true,
      locale: 'en',
      notifications: true,
      showNotificationContent: true,
      isMentionsEnabled: true,
      lastChats: {},
      zoomFactor: 1,
      activeTheme: 'default',
      minimizeToTray: false,
      syncAllAccounts: false,
      lastSaveDialogLocation: undefined,
      experimentalEnableMarkdownInMessages: false,
      enableWebxdcDevTools: false,
      HTMLEmailAskForRemoteLoadingConfirmation: true,
      HTMLEmailAlwaysLoadRemoteContent: false,
      enableRelatedChats: true,
      galleryImageKeepAspectRatio: true,
      useSystemUIFont: false,
    }),
  },
}))

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})
