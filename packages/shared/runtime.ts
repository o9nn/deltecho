/**
 * Runtime Interface Abstraction
 * 
 * This module provides an abstraction layer for runtime-specific functionality
 * that allows the ui-components to work across different environments
 * (Delta Chat Desktop, standalone web, etc.) without tight coupling.
 */

export interface RuntimeInterface {
  /**
   * Get a configuration value
   */
  getConfig(key: string): Promise<string | null>
  
  /**
   * Set a configuration value
   */
  setConfig(key: string, value: string): Promise<void>
  
  /**
   * Open a URL in the default browser
   */
  openLink(url: string): Promise<void>
  
  /**
   * Show a notification
   */
  showNotification(title: string, body: string): Promise<void>
  
  /**
   * Get the current platform
   */
  getPlatform(): 'darwin' | 'linux' | 'win32' | 'web'
  
  /**
   * Get all desktop settings
   */
  getDesktopSettings?(): Promise<Record<string, any>>
  
  /**
   * Set a desktop setting
   */
  setDesktopSetting?(key: string, value: string): Promise<void>
  
  /**
   * Write to a file (if supported)
   */
  writeFile?(path: string, data: string | Buffer): Promise<void>
  
  /**
   * Read from a file (if supported)
   */
  readFile?(path: string): Promise<Buffer>
}

/**
 * Default no-op runtime for environments without runtime support
 */
export const defaultRuntime: RuntimeInterface = {
  async getConfig(_key: string): Promise<string | null> {
    console.warn('Runtime not configured: getConfig called')
    return null
  },
  
  async setConfig(_key: string, _value: string): Promise<void> {
    console.warn('Runtime not configured: setConfig called')
  },
  
  async openLink(url: string): Promise<void> {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank')
    } else {
      console.warn('Runtime not configured: openLink called', url)
    }
  },
  
  async showNotification(title: string, body: string): Promise<void> {
    console.log(`Notification: ${title} - ${body}`)
  },
  
  getPlatform(): 'darwin' | 'linux' | 'win32' | 'web' {
    if (typeof process !== 'undefined' && process.platform) {
      return process.platform as 'darwin' | 'linux' | 'win32'
    }
    return 'web'
  },
  
  async getDesktopSettings(): Promise<Record<string, any>> {
    console.warn('Runtime not configured: getDesktopSettings called')
    return {}
  },
  
  async setDesktopSetting(_key: string, _value: string): Promise<void> {
    console.warn('Runtime not configured: setDesktopSetting called')
  }
}

/**
 * Global runtime instance
 */
let runtimeInstance: RuntimeInterface = defaultRuntime

/**
 * Set the runtime implementation
 */
export function setRuntime(runtime: RuntimeInterface): void {
  runtimeInstance = runtime
}

/**
 * Get the current runtime implementation
 */
export function getRuntime(): RuntimeInterface {
  return runtimeInstance
}

/**
 * Runtime singleton export for convenience
 */
export const runtime = {
  getConfig: (...args: Parameters<RuntimeInterface['getConfig']>) => 
    runtimeInstance.getConfig(...args),
  setConfig: (...args: Parameters<RuntimeInterface['setConfig']>) => 
    runtimeInstance.setConfig(...args),
  openLink: (...args: Parameters<RuntimeInterface['openLink']>) => 
    runtimeInstance.openLink(...args),
  showNotification: (...args: Parameters<RuntimeInterface['showNotification']>) => 
    runtimeInstance.showNotification(...args),
  getPlatform: () => runtimeInstance.getPlatform(),
  getDesktopSettings: () => runtimeInstance.getDesktopSettings?.() || Promise.resolve({}),
  setDesktopSetting: (...args: Parameters<NonNullable<RuntimeInterface['setDesktopSetting']>>) =>
    runtimeInstance.setDesktopSetting?.(...args) || Promise.resolve(),
  writeFile: (...args: Parameters<NonNullable<RuntimeInterface['writeFile']>>) => 
    runtimeInstance.writeFile?.(...args),
  readFile: (...args: Parameters<NonNullable<RuntimeInterface['readFile']>>) => 
    runtimeInstance.readFile?.(...args)
}
