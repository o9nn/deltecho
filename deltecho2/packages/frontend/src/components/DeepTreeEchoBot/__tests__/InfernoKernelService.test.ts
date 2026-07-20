import { InfernoKernelService } from '../InfernoKernelService'
import { runtime } from '@deltachat-desktop/runtime-interface'

// Mock logger
jest.mock('@deltachat-desktop/shared/logger', () => ({
  getLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

// Mock runtime settings access
jest.mock('@deltachat-desktop/runtime-interface', () => ({
  runtime: {
    getDesktopSettings: jest.fn(),
  },
}))

// Mock the inferno-kernel package (its source uses ESM-style .js imports
// which jest does not resolve, and the kernel logs via console)
const mockBoot = jest.fn().mockResolvedValue(undefined)
const mockShutdown = jest.fn().mockResolvedValue(undefined)
const mockGetStats = jest.fn().mockReturnValue({
  uptime: 42,
  totalAtoms: 0,
  activeProcesses: 0,
  reasoningCycles: 0,
  memoryUsage: 0,
})
const mockAddNode = jest.fn((type: string, name: string) => ({
  id: 'atom_1',
  type,
  name,
  truthValue: { strength: 1, confidence: 1 },
  attentionValue: { sti: 0, lti: 0, vlti: 0 },
  timestamp: Date.now(),
}))
const mockForwardChain = jest.fn().mockReturnValue([])
const mockAttentionStats = jest.fn().mockReturnValue({
  focusSize: 0,
  avgSTI: 0,
  maxSTI: 0,
  minSTI: 0,
})

jest.mock('@deltachat-desktop/inferno-kernel', () => ({
  InfernoKernel: jest.fn().mockImplementation(() => ({
    boot: mockBoot,
    shutdown: mockShutdown,
    getStats: mockGetStats,
  })),
  AtomSpace: jest.fn().mockImplementation(() => ({
    addNode: mockAddNode,
    addLink: jest.fn(),
    getAtomsByName: jest.fn().mockReturnValue([]),
    getSize: jest.fn().mockReturnValue(0),
  })),
  PLNEngine: jest.fn().mockImplementation(() => ({
    forwardChain: mockForwardChain,
  })),
  AttentionAllocation: jest.fn().mockImplementation(() => ({
    stimulate: jest.fn(),
    getStats: mockAttentionStats,
  })),
}))

const mockGetDesktopSettings = runtime.getDesktopSettings as jest.Mock

describe('InfernoKernelService', () => {
  let service: InfernoKernelService

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset singleton
    ;(InfernoKernelService as any).instance = null
    service = InfernoKernelService.getInstance()
  })

  it('should be a singleton', () => {
    expect(InfernoKernelService.getInstance()).toBe(service)
  })

  it('should not boot when the bot is disabled', async () => {
    mockGetDesktopSettings.mockResolvedValue({
      deepTreeEchoBotEnabled: false,
    })

    const running = await service.init()

    expect(running).toBe(false)
    expect(mockBoot).not.toHaveBeenCalled()
    expect(service.isRunning()).toBe(false)
    expect(service.getStatus()).toEqual({
      enabled: false,
      state: 'stopped',
      kernelStats: null,
      atomCount: 0,
      attentionStats: null,
    })
  })

  it('should not boot when parallel processing is turned off', async () => {
    mockGetDesktopSettings.mockResolvedValue({
      deepTreeEchoBotEnabled: true,
      deepTreeEchoBotUseParallelProcessing: false,
    })

    const running = await service.init()

    expect(running).toBe(false)
    expect(mockBoot).not.toHaveBeenCalled()
    expect(service.getStatus().enabled).toBe(false)
  })

  it('should boot the kernel when enabled', async () => {
    mockGetDesktopSettings.mockResolvedValue({
      deepTreeEchoBotEnabled: true,
    })

    const running = await service.init()

    expect(running).toBe(true)
    expect(mockBoot).toHaveBeenCalledTimes(1)
    expect(service.isRunning()).toBe(true)

    const status = service.getStatus()
    expect(status.enabled).toBe(true)
    expect(status.state).toBe('running')
    expect(status.kernelStats).toEqual(expect.objectContaining({ uptime: 42 }))
    expect(status.attentionStats).toEqual(
      expect.objectContaining({ focusSize: 0 })
    )
  })

  it('should be idempotent when already running', async () => {
    mockGetDesktopSettings.mockResolvedValue({
      deepTreeEchoBotEnabled: true,
    })

    await service.init()
    await service.init()

    expect(mockBoot).toHaveBeenCalledTimes(1)
  })

  it('should report an error state when boot fails', async () => {
    mockGetDesktopSettings.mockResolvedValue({
      deepTreeEchoBotEnabled: true,
    })
    mockBoot.mockRejectedValueOnce(new Error('boot failure'))

    const running = await service.init()

    expect(running).toBe(false)
    expect(service.isRunning()).toBe(false)
    expect(service.getStatus().state).toBe('error')
  })

  it('should expose AtomSpace operations when running', async () => {
    mockGetDesktopSettings.mockResolvedValue({
      deepTreeEchoBotEnabled: true,
    })
    await service.init()

    const atom = service.addConcept('cat')

    expect(atom).not.toBeNull()
    expect(mockAddNode).toHaveBeenCalledWith('ConceptNode', 'cat', undefined)
  })

  it('should return safe defaults when not running', () => {
    expect(service.addConcept('cat')).toBeNull()
    expect(service.addLink('InheritanceLink', ['a', 'b'])).toBeNull()
    expect(service.getAtomsByName('cat')).toEqual([])
    expect(service.runInference()).toEqual([])
    expect(service.getAttentionStats()).toBeNull()
  })

  it('should run PLN inference when running', async () => {
    mockGetDesktopSettings.mockResolvedValue({
      deepTreeEchoBotEnabled: true,
    })
    await service.init()

    service.runInference(5)

    expect(mockForwardChain).toHaveBeenCalledWith(5)
  })

  it('should shut down the kernel and reset state', async () => {
    mockGetDesktopSettings.mockResolvedValue({
      deepTreeEchoBotEnabled: true,
    })
    await service.init()

    await service.shutdown()

    expect(mockShutdown).toHaveBeenCalledTimes(1)
    expect(service.isRunning()).toBe(false)
    expect(service.getStatus()).toEqual(
      expect.objectContaining({
        state: 'stopped',
        kernelStats: null,
        atomCount: 0,
        attentionStats: null,
      })
    )
  })
})
