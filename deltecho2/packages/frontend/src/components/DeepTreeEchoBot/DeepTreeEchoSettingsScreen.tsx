import React, { useState } from 'react'
import { getLogger } from '@deltachat-desktop/shared/logger'
import BotSettings from './BotSettings'
import { saveBotSettings, getBotInstance } from './DeepTreeEchoIntegration'
import { runtime as _runtime } from '@deltachat-desktop/runtime-interface'
import { selectedAccountId } from '../../ScreenController'

const log = getLogger(
  'render/components/DeepTreeEchoBot/DeepTreeEchoSettingsScreen'
)

/**
 * DeepTreeEchoSettingsScreen - Main settings screen component for the Deep Tree Echo bot
 * This can be mounted inside DeltaChat's settings component
 */
const DeepTreeEchoSettingsScreen: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Handle saving settings
  const handleSaveSettings = async (settings: any) => {
    try {
      setIsSaving(true)
      setSaveMessage('Saving settings...')

      await saveBotSettings(selectedAccountId(), settings)

      setSaveMessage('Settings saved successfully!')

      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage('')
      }, 3000)
    } catch (error) {
      log.error('Error saving settings:', error)
      setSaveMessage('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  // Check if Deep Tree Echo is enabled
  const botInstance = getBotInstance()
  const isEnabled = botInstance?.isEnabled() || false

  return (
    <div className='deep-tree-echo-settings-screen'>
      <div className='settings-header'>
        <h2>Deep Tree Echo AI Assistant</h2>
        <p className='settings-description'>
          Deep Tree Echo is an advanced AI assistant that can enhance your
          DeltaChat experience with intelligent responses, memory capabilities,
          and a distinct personality.
        </p>
      </div>

      {saveMessage && (
        <div className={`save-message ${isSaving ? 'saving' : ''}`}>
          {saveMessage}
        </div>
      )}

      <BotSettings saveSettings={handleSaveSettings} />

      {isEnabled && (
        <div className='bot-status'>
          <p>Deep Tree Echo is currently active and listening for messages.</p>
        </div>
      )}

      <div className='settings-footer'>
        <p className='privacy-note'>
          Note: All AI processing is done through external API calls. Your API
          keys and message content will be sent to the configured API endpoints.
          Please review the privacy policy of your chosen AI provider for more
          information.
        </p>
      </div>
    </div>
  )
}

export default DeepTreeEchoSettingsScreen
