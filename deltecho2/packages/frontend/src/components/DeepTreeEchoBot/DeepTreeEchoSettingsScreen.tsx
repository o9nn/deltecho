import React, { useEffect, useState } from 'react'
import { getLogger } from '@deltachat-desktop/shared/logger'
import BotSettings from './BotSettings'
import ProactiveMessagingSettings from './ProactiveMessagingSettings'
import TriggerManager from './TriggerManager'
import { saveBotSettings, getBotInstance } from './DeepTreeEchoIntegration'
import {
  InfernoKernelService,
  InfernoKernelStatus,
} from './InfernoKernelService'
import { runtime as _runtime } from '@deltachat-desktop/runtime-interface'
import { selectedAccountId } from '../../ScreenController'

const log = getLogger(
  'render/components/DeepTreeEchoBot/DeepTreeEchoSettingsScreen'
)

type SettingsTab = 'general' | 'proactive' | 'triggers' | 'inferno'

/**
 * DeepTreeEchoSettingsScreen - Main settings screen component for the Deep Tree Echo bot
 * This can be mounted inside DeltaChat's settings component
 */
const DeepTreeEchoSettingsScreen: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [kernelStatus, setKernelStatus] = useState<InfernoKernelStatus | null>(
    null
  )

  // Load (and lazily boot) the Inferno kernel when its tab is opened
  useEffect(() => {
    if (activeTab !== 'inferno') {
      return
    }
    let cancelled = false
    const service = InfernoKernelService.getInstance()
    service
      .init()
      .catch(error => {
        log.error('Failed to initialize Inferno kernel:', error)
      })
      .then(() => {
        if (!cancelled) {
          setKernelStatus(service.getStatus())
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeTab])

  // Resolve the account id, falling back to the first account
  // when no account is selected yet (e.g. during onboarding).
  const getAccountId = (): number => {
    try {
      return selectedAccountId()
    } catch (_error) {
      return 1
    }
  }

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
      <style>{`
        .deep-tree-echo-settings-screen .tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
          padding-bottom: 0;
        }

        .deep-tree-echo-settings-screen .tab {
          padding: 12px 20px;
          background: none;
          border: none;
          color: var(--text-color-secondary, #888);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          position: relative;
          transition: color 0.2s;
        }

        .deep-tree-echo-settings-screen .tab:hover {
          color: var(--text-color, #e0e0e0);
        }

        .deep-tree-echo-settings-screen .tab.active {
          color: var(--accent-color, #e94560);
        }

        .deep-tree-echo-settings-screen .tab.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent-color, #e94560);
        }

        .deep-tree-echo-settings-screen .tab-icon {
          margin-right: 8px;
        }

        .deep-tree-echo-settings-screen .tab-content {
          min-height: 400px;
        }

        .deep-tree-echo-settings-screen .triggers-container {
          height: 600px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border-color, #2a2a4a);
        }
      `}</style>

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

      {/* Tab Navigation */}
      <div className='tabs'>
        <button
          type='button'
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <span className='tab-icon'>⚙️</span>
          General
        </button>
        <button
          type='button'
          className={`tab ${activeTab === 'proactive' ? 'active' : ''}`}
          onClick={() => setActiveTab('proactive')}
        >
          <span className='tab-icon'>🤖</span>
          Proactive Messaging
        </button>
        <button
          type='button'
          className={`tab ${activeTab === 'triggers' ? 'active' : ''}`}
          onClick={() => setActiveTab('triggers')}
        >
          <span className='tab-icon'>🎯</span>
          Triggers
        </button>
        <button
          type='button'
          className={`tab ${activeTab === 'inferno' ? 'active' : ''}`}
          onClick={() => setActiveTab('inferno')}
        >
          <span className='tab-icon'>🔥</span>
          Inferno Kernel
        </button>
      </div>

      {/* Tab Content */}
      <div className='tab-content'>
        {activeTab === 'general' && (
          <>
            <BotSettings saveSettings={handleSaveSettings} />

            {isEnabled && (
              <div className='bot-status'>
                <p>
                  Deep Tree Echo is currently active and listening for messages.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'proactive' && (
          <ProactiveMessagingSettings
            botEnabled={isEnabled}
            onNavigateToTriggers={() => setActiveTab('triggers')}
          />
        )}

        {activeTab === 'triggers' && (
          <div className='triggers-container'>
            <TriggerManager
              accountId={getAccountId()}
              onClose={() => setActiveTab('proactive')}
            />
          </div>
        )}

        {activeTab === 'inferno' && (
          <div className='inferno-kernel-status'>
            <h3>Inferno Kernel</h3>
            <p className='settings-description'>
              The Inferno kernel provides AGI reasoning services (AtomSpace
              hypergraph knowledge, PLN inference and attention allocation) for
              Deep Tree Echo. It is active when the bot is enabled and parallel
              processing is turned on.
            </p>
            {kernelStatus === null ? (
              <p>Loading kernel status...</p>
            ) : (
              <ul className='kernel-status-list'>
                <li>
                  Enabled:{' '}
                  <strong>{kernelStatus.enabled ? 'Yes' : 'No'}</strong>
                </li>
                <li>
                  State: <strong>{kernelStatus.state}</strong>
                </li>
                <li>
                  Atoms in AtomSpace: <strong>{kernelStatus.atomCount}</strong>
                </li>
                {kernelStatus.kernelStats && (
                  <>
                    <li>
                      Active cognitive processes:{' '}
                      <strong>
                        {kernelStatus.kernelStats.activeProcesses}
                      </strong>
                    </li>
                    <li>
                      Reasoning cycles:{' '}
                      <strong>
                        {kernelStatus.kernelStats.reasoningCycles}
                      </strong>
                    </li>
                  </>
                )}
                {kernelStatus.attentionStats && (
                  <li>
                    Attentional focus size:{' '}
                    <strong>{kernelStatus.attentionStats.focusSize}</strong>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

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
