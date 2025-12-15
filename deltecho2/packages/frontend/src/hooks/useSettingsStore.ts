import { useState, useEffect } from 'react'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { DesktopSettingsType } from '@deltachat-desktop/shared/shared-types'

export interface SettingsStore {
  desktopSettings: DesktopSettingsType
}

export function useSettingsStore(): [SettingsStore] {
  const [desktopSettings, setDesktopSettings] = useState<DesktopSettingsType>({} as DesktopSettingsType)

  useEffect(() => {
    // Load settings from runtime
    const loadSettings = async () => {
      try {
        const settings = await runtime.getDesktopSettings()
        setDesktopSettings(settings)
      } catch (error) {
        console.error('Failed to load desktop settings:', error)
      }
    }
    
    loadSettings()
  }, [])

  return [{ desktopSettings }]
}