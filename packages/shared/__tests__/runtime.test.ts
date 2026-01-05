/**
 * Runtime Module Tests
 *
 * Tests for the platform-independent runtime abstraction layer
 * that provides desktop settings and event handling capabilities.
 */

import { runtime, RuntimeInterface, setRuntime, resetRuntime, defaultRuntime } from '../runtime.js';

describe('Runtime Module', () => {
  beforeEach(() => {
    // Reset to default runtime before each test
    resetRuntime();
  });

  describe('Default Runtime', () => {
    it('should provide a default runtime implementation', () => {
      expect(runtime).toBeDefined();
      expect(typeof runtime.getDesktopSettings).toBe('function');
      expect(typeof runtime.setDesktopSetting).toBe('function');
      expect(typeof runtime.getConfig).toBe('function');
      expect(typeof runtime.setConfig).toBe('function');
      expect(typeof runtime.openLink).toBe('function');
      expect(typeof runtime.getPlatform).toBe('function');
    });

    it('should return default settings from getDesktopSettings', async () => {
      const settings = await runtime.getDesktopSettings();
      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });

    it('should return platform from getPlatform', () => {
      const platform = runtime.getPlatform();
      expect(['darwin', 'linux', 'win32', 'web']).toContain(platform);
    });

    it('should handle setDesktopSetting without error', async () => {
      await expect(runtime.setDesktopSetting('zoomFactor', 1.5)).resolves.not.toThrow();
    });

    it('should persist settings in memory', async () => {
      await runtime.setDesktopSetting('zoomFactor', 2.0);
      const settings = await runtime.getDesktopSettings();
      expect(settings.zoomFactor).toBe(2.0);
    });

    it('should return null from getConfig by default', async () => {
      const value = await runtime.getConfig('nonexistent');
      expect(value).toBeNull();
    });
  });

  describe('Custom Runtime', () => {
    it('should allow setting a custom runtime implementation', async () => {
      const customSettings = { zoomFactor: 3.0 };
      const customRuntime: RuntimeInterface = {
        ...defaultRuntime,
        getDesktopSettings: jest.fn().mockResolvedValue(customSettings),
      };

      setRuntime(customRuntime);
      const settings = await runtime.getDesktopSettings();

      expect(customRuntime.getDesktopSettings).toHaveBeenCalled();
      expect(settings).toEqual(customSettings);
    });

    it('should use custom runtime for getConfig', async () => {
      const customRuntime: RuntimeInterface = {
        ...defaultRuntime,
        getConfig: jest.fn().mockResolvedValue('custom-value'),
      };

      setRuntime(customRuntime);
      const value = await runtime.getConfig('test-key');

      expect(customRuntime.getConfig).toHaveBeenCalledWith('test-key');
      expect(value).toBe('custom-value');
    });

    it('should use custom runtime for setConfig', async () => {
      const customRuntime: RuntimeInterface = {
        ...defaultRuntime,
        setConfig: jest.fn().mockResolvedValue(undefined),
      };

      setRuntime(customRuntime);
      await runtime.setConfig('test-key', 'test-value');

      expect(customRuntime.setConfig).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should use custom runtime for openLink', async () => {
      const customRuntime: RuntimeInterface = {
        ...defaultRuntime,
        openLink: jest.fn().mockResolvedValue(undefined),
      };

      setRuntime(customRuntime);
      await runtime.openLink('https://example.com');

      expect(customRuntime.openLink).toHaveBeenCalledWith('https://example.com');
    });

    it('should use custom runtime for getPlatform', () => {
      const customRuntime: RuntimeInterface = {
        ...defaultRuntime,
        getPlatform: jest.fn().mockReturnValue('darwin'),
      };

      setRuntime(customRuntime);
      const platform = runtime.getPlatform();

      expect(customRuntime.getPlatform).toHaveBeenCalled();
      expect(platform).toBe('darwin');
    });
  });

  describe('Reset Runtime', () => {
    it('should reset to default runtime', async () => {
      // Set custom runtime
      const customRuntime: RuntimeInterface = {
        ...defaultRuntime,
        getDesktopSettings: jest.fn().mockResolvedValue({ custom: true }),
      };
      setRuntime(customRuntime);

      // Reset
      resetRuntime();

      // Should use default implementation
      const settings = await runtime.getDesktopSettings();
      expect(customRuntime.getDesktopSettings).not.toHaveBeenCalled();
      expect(settings).not.toHaveProperty('custom');
    });

    it('should reset in-memory settings', async () => {
      // Modify settings
      await runtime.setDesktopSetting('zoomFactor', 5.0);

      // Reset
      resetRuntime();

      // Should have default value
      const settings = await runtime.getDesktopSettings();
      expect(settings.zoomFactor).toBe(1);
    });
  });

  describe('Desktop Settings', () => {
    it('should have default Deep Tree Echo Bot settings', async () => {
      const settings = await runtime.getDesktopSettings();

      expect(settings.deepTreeEchoBotEnabled).toBe(false);
      expect(settings.deepTreeEchoBotEnableAsMainUser).toBe(false);
      expect(settings.deepTreeEchoBotMemoryEnabled).toBe(false);
    });

    it('should handle complex settings objects', async () => {
      const customRuntime: RuntimeInterface = {
        ...defaultRuntime,
        getDesktopSettings: jest.fn().mockResolvedValue({
          zoomFactor: 1.5,
          activeTheme: 'dark',
          notifications: true,
          deepTreeEchoBotEnabled: true,
          deepTreeEchoBotCognitiveKeys: {
            openai: 'test-key',
          },
        }),
      };

      setRuntime(customRuntime);
      const settings = await runtime.getDesktopSettings();

      expect(settings.zoomFactor).toBe(1.5);
      expect(settings.activeTheme).toBe('dark');
      expect(settings.deepTreeEchoBotEnabled).toBe(true);
      expect(settings.deepTreeEchoBotCognitiveKeys).toEqual({ openai: 'test-key' });
    });
  });

  describe('File Operations', () => {
    it('should have optional writeFile method', () => {
      expect(typeof runtime.writeFile).toBe('function');
    });

    it('should have optional readFile method', () => {
      expect(typeof runtime.readFile).toBe('function');
    });
  });
});
