/**
 * Navigation Interface Abstraction
 *
 * This module provides an abstraction layer for navigation/routing functionality
 * that allows the ui-components to work across different environments
 * (Delta Chat Desktop, standalone web, React Router, etc.) without tight coupling.
 */

/**
 * Navigation route parameters
 */
export interface NavigationParams {
  [key: string]: string | number | boolean | undefined
}

/**
 * Navigation interface for screen/route management
 */
export interface NavigationInterface {
  /**
   * Navigate to a screen/route
   */
  navigate(screen: string, params?: NavigationParams): void

  /**
   * Go back to the previous screen
   */
  goBack(): void

  /**
   * Replace the current screen (no back navigation)
   */
  replace(screen: string, params?: NavigationParams): void

  /**
   * Reset the navigation stack to a specific route
   */
  reset(screen: string, params?: NavigationParams): void

  /**
   * Get the current screen/route name
   */
  getCurrentScreen(): string

  /**
   * Get the current route parameters
   */
  getParams(): NavigationParams

  /**
   * Check if we can go back
   */
  canGoBack(): boolean

  /**
   * Subscribe to navigation events
   */
  onNavigate(handler: (screen: string, params?: NavigationParams) => void): () => void
}

/**
 * Navigation history entry
 */
interface HistoryEntry {
  screen: string
  params?: NavigationParams
}

/**
 * Default in-memory navigation for standalone operation
 */
class DefaultNavigation implements NavigationInterface {
  private history: HistoryEntry[] = [{ screen: 'main' }]
  private currentIndex: number = 0
  private listeners: Set<(screen: string, params?: NavigationParams) => void> = new Set()

  navigate(screen: string, params?: NavigationParams): void {
    // Remove any forward history
    this.history = this.history.slice(0, this.currentIndex + 1)
    this.history.push({ screen, params })
    this.currentIndex = this.history.length - 1
    this.notifyListeners(screen, params)
  }

  goBack(): void {
    if (this.canGoBack()) {
      this.currentIndex--
      const entry = this.history[this.currentIndex]
      this.notifyListeners(entry.screen, entry.params)
    }
  }

  replace(screen: string, params?: NavigationParams): void {
    this.history[this.currentIndex] = { screen, params }
    this.notifyListeners(screen, params)
  }

  reset(screen: string, params?: NavigationParams): void {
    this.history = [{ screen, params }]
    this.currentIndex = 0
    this.notifyListeners(screen, params)
  }

  getCurrentScreen(): string {
    return this.history[this.currentIndex].screen
  }

  getParams(): NavigationParams {
    return this.history[this.currentIndex].params || {}
  }

  canGoBack(): boolean {
    return this.currentIndex > 0
  }

  onNavigate(handler: (screen: string, params?: NavigationParams) => void): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }

  private notifyListeners(screen: string, params?: NavigationParams): void {
    this.listeners.forEach(listener => listener(screen, params))
  }
}

/**
 * Global navigation instance
 */
let navigationInstance: NavigationInterface = new DefaultNavigation()

/**
 * Set the navigation implementation
 */
export function setNavigation(navigation: NavigationInterface): void {
  navigationInstance = navigation
}

/**
 * Get the current navigation implementation
 */
export function getNavigation(): NavigationInterface {
  return navigationInstance
}

/**
 * Reset navigation to default implementation (for testing)
 */
export function resetNavigation(): void {
  navigationInstance = new DefaultNavigation()
}

/**
 * Navigation singleton export for convenience
 * This provides a ScreenController-like interface
 */
export const navigation = {
  navigate: (screen: string, params?: NavigationParams) =>
    navigationInstance.navigate(screen, params),
  goBack: () => navigationInstance.goBack(),
  replace: (screen: string, params?: NavigationParams) =>
    navigationInstance.replace(screen, params),
  reset: (screen: string, params?: NavigationParams) =>
    navigationInstance.reset(screen, params),
  getCurrentScreen: () => navigationInstance.getCurrentScreen(),
  getParams: () => navigationInstance.getParams(),
  canGoBack: () => navigationInstance.canGoBack(),
  onNavigate: (handler: (screen: string, params?: NavigationParams) => void) =>
    navigationInstance.onNavigate(handler)
}

/**
 * Screen controller compatibility layer
 * Provides Delta Chat Desktop ScreenController-like interface
 */
export const ScreenController = {
  navigate: (screen: string, params?: NavigationParams) =>
    navigationInstance.navigate(screen, params),
  goBack: () => navigationInstance.goBack(),
  replace: (screen: string, params?: NavigationParams) =>
    navigationInstance.replace(screen, params),
  getCurrentScreen: () => navigationInstance.getCurrentScreen()
}
