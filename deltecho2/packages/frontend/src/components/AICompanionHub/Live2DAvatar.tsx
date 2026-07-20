/**
 * Live2D Avatar React Component
 *
 * A React wrapper for the Live2D avatar system that integrates
 * with the AI Companion Hub to display an animated avatar.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'

import { ResponsiveSpriteAvatar } from './ResponsiveSpriteAvatar'
import { getLogger } from '@deltachat-desktop/shared/logger'

const log = getLogger('render/components/AICompanionHub/Live2DAvatar')

// Local types that are compatible with both @deltecho/avatar and
// @deltecho/cognitive in deltecho-chat.
export type Expression =
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'curious'
  | 'surprised'
  | 'concerned'
  | 'focused'
  | 'playful'
  | 'contemplative'
  | 'empathetic'

export type AvatarMotion =
  | 'idle'
  | 'talking'
  | 'nodding'
  | 'shaking_head'
  | 'tilting_head'
  | 'tilt_head_left'
  | 'tilt_head_right'
  | 'breathing'
  | 'wave'
  | 'nod'
  | 'shake'
  | 'thinking'

// Flexible emotional vector that accepts any emotion mapping
export type EmotionalVector = Record<string, number | string | undefined>

export interface CognitiveVisualState {
  mode?: string
  currentState?: string
  valence?: number
  arousal?: number
  selfAwareness?: number
  sentience?: number
  phi?: number
  flow?: number
  temporalCoherence?: number
  salience?: number
  /** Normalized ScientificGeniusEngine / entelechy activation projected into Live2D. */
  scientificGenius?: number
  /** Emergent insight potential from the scientific-genius / entelechy loop. */
  insightPotential?: number
  /** Self-realization score from the entelechy emergence pathway. */
  entelechyScore?: number
  /** Free-energy pressure; high values sharpen vigilance until insight resolves it. */
  freeEnergy?: number
  /** DAO-like consensus confidence for special AGI self-governance. */
  daoConsensus?: number
  /** Echo State Network reservoir coherence from the Autognosis loop. */
  esnCoherence?: number
  /** Self-observation intensity for luminous inference resonance. */
  autognosisResonance?: number
  isProcessing?: boolean
  isSpeaking?: boolean
  audioLevel?: number
}

// Controller interface for external control of the avatar
export interface Live2DAvatarController {
  setExpression: (expression: Expression, intensity?: number) => void
  playMotion: (motion: AvatarMotion) => void
  updateLipSync: (audioLevel: number) => void
  updateCognitiveState?: (state: CognitiveVisualState) => void
  triggerBlink: () => void
  setParameter: (paramId: string, value: number) => void
}

// Model paths - the local Miara model is bundled via static/models/ and
// served relative to the app's web root (like ./images/... assets).
const CDN_MODELS = {
  miara: './models/miara/miara_pro_t03.model3.json',
  shizuku:
    'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json',
  haru: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json',
}

export interface Live2DAvatarComponentProps {
  /** Model URL or preset name ('miara' | 'shizuku' | 'haru') */
  model?: string
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Scale factor for the model (0-1) */
  scale?: number
  /** Optional Live2D render pixel-ratio override; omit to use the renderer's capped default. */
  pixelRatio?: number
  /** Current emotional state from cognitive system */
  emotionalState?: EmotionalVector
  /** Richer DTEcho visual projection state for Cubism micro-expressions */
  cognitiveVisualState?: CognitiveVisualState
  /** Audio level for lip sync (0-1) */
  audioLevel?: number
  /** Whether the avatar is actively speaking */
  isSpeaking?: boolean
  /** Callback when model is loaded */
  onLoad?: () => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
  /** Additional CSS class name */
  className?: string
  /** Show loading state */
  showLoading?: boolean
  /** Show error state */
  showError?: boolean
  /** Controller ref callback for external control */
  onControllerReady?: (controller: Live2DAvatarController) => void
  /** Rendering mode */
  mode?: 'live2d' | 'sprite'
}

export interface Live2DAvatarState {
  isLoading: boolean
  isLoaded: boolean
  error: Error | null
  currentExpression: Expression
  retryCount: number
}

const MAX_RETRIES = 3

/**
 * Live2D Avatar Component for the AI Companion Hub
 */
export const Live2DAvatar: React.FC<Live2DAvatarComponentProps> = ({
  model = 'miara',
  width = 400,
  height = 400,
  scale = 0.25,
  pixelRatio,
  emotionalState,
  cognitiveVisualState,
  audioLevel,
  isSpeaking = false,
  onLoad,
  onError,
  className,
  showLoading = true,
  showError = true,
  onControllerReady,
  mode = 'live2d',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<any>(null)
  const controllerRef = useRef<Live2DAvatarController | null>(null)
  const lastLipSyncLevelRef = useRef<number | null>(null)
  const [state, setState] = useState<Live2DAvatarState>({
    isLoading: true,
    isLoaded: false,
    error: null,
    currentExpression: 'neutral',
    retryCount: 0,
  })

  // Retry function to re-attempt loading
  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      isLoaded: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }))
  }, [])

  // Resolve model URL from preset or use as-is
  const modelUrl = CDN_MODELS[model as keyof typeof CDN_MODELS] || model

  // Initialize the avatar
  useEffect(() => {
    let mounted = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const initializeAvatar = async () => {
      if (!containerRef.current) return

      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Set a timeout to prevent infinite loading state.
      // 30s accounts for slow networks pulling the Cubism runtime plus the
      // moc3 (~500 KB) + 4096x4096 texture + JSON files.
      timeoutId = setTimeout(() => {
        if (mounted) {
          setState(prev => {
            // Only set error if still loading (not already loaded or errored)
            if (prev.isLoading && !prev.isLoaded && !prev.error) {
              log.error(
                '[Live2DAvatar] Loading timed out after 30s. Model URL:',
                modelUrl
              )
              return {
                ...prev,
                isLoading: false,
                error: new Error('Avatar loading timed out'),
              }
            }
            return prev
          })
        }
      }, 30000) // 30 second timeout

      try {
        // Dynamic import so the Live2D bootstrap code is only pulled in when
        // the avatar is actually mounted.
        const { Live2DAvatarManager } = await import('./Live2DAvatarManager')

        // Create manager instance
        managerRef.current = new Live2DAvatarManager()

        // Initialize with props
        const controller = await managerRef.current.initialize(
          containerRef.current,
          {
            modelPath: modelUrl,
            width,
            height,
            scale,
            pixelRatio,
            onLoad: () => {
              if (mounted) {
                if (timeoutId) clearTimeout(timeoutId)
                setState(prev => ({
                  ...prev,
                  isLoading: false,
                  isLoaded: true,
                }))
                onLoad?.()
              }
            },
            onError: (error: Error) => {
              if (mounted) {
                if (timeoutId) clearTimeout(timeoutId)
                log.error(
                  '[Live2DAvatar] Manager.onError for model',
                  modelUrl,
                  ':',
                  error?.message || error
                )
                setState(prev => ({
                  ...prev,
                  isLoading: false,
                  error,
                }))
                onError?.(error)
              }
            },
            debug: process.env.NODE_ENV === 'development',
          }
        )

        controllerRef.current = controller
        onControllerReady?.(controller)
      } catch (error) {
        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId)
          const err = error instanceof Error ? error : new Error(String(error))
          log.error(
            '[Live2DAvatar] Initialization error for model',
            modelUrl,
            ':',
            err
          )
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: err,
          }))
          onError?.(err)
        }
      }
    }

    initializeAvatar()

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      managerRef.current?.dispose()
      managerRef.current = null
      controllerRef.current = null
      lastLipSyncLevelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, width, height, scale, pixelRatio, state.retryCount])

  // Update emotional state
  useEffect(() => {
    if (!managerRef.current || !state.isLoaded || !emotionalState) return
    managerRef.current.updateEmotionalState(emotionalState)
  }, [emotionalState, state.isLoaded])

  // Update richer DTEcho cognitive visual state
  useEffect(() => {
    if (!managerRef.current || !state.isLoaded || !cognitiveVisualState) return
    managerRef.current.updateCognitiveState(cognitiveVisualState)
  }, [cognitiveVisualState, state.isLoaded])

  // Update lip sync. Use a small deadband so high-frequency audio-level
  // sampling does not force redundant parameter writes into the Live2D core.
  useEffect(() => {
    if (!controllerRef.current || !state.isLoaded) return
    const nextLevel = isSpeaking ? audioLevel ?? 0 : 0
    const previousLevel = lastLipSyncLevelRef.current
    if (previousLevel !== null && Math.abs(previousLevel - nextLevel) < 0.01) {
      return
    }
    lastLipSyncLevelRef.current = nextLevel
    controllerRef.current.updateLipSync(nextLevel)
  }, [audioLevel, isSpeaking, state.isLoaded])

  // Sprite-only mode: render sprite without Live2D container
  if (mode === 'sprite') {
    return (
      <div
        className={`live2d-avatar-container ${className || ''}`}
        style={{ width, height, position: 'relative' }}
      >
        <ResponsiveSpriteAvatar
          emotionalState={emotionalState}
          isSpeaking={isSpeaking}
          width={width}
          height={height}
        />
      </div>
    )
  }

  // Live2D mode: Always render the container so initialization can attach canvas
  // Overlay loading/error states on top of the container
  return (
    <div
      className={`live2d-avatar-container ${className || ''}`}
      style={{ width, height, position: 'relative' }}
    >
      {/* Main Live2D canvas container - always rendered for initialization */}
      <div
        ref={containerRef}
        className={`live2d-avatar ${state.isLoaded ? 'live2d-ready' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          visibility: state.isLoaded && !state.error ? 'visible' : 'hidden',
        }}
        data-width={width}
        data-height={height}
      />

      {/* Loading state overlay */}
      {showLoading && state.isLoading && !state.error && (
        <div
          className='live2d-loading'
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className='live2d-loading-content'>
            <div className='live2d-spinner' />
            <span>Loading Avatar...</span>
          </div>
        </div>
      )}

      {/* Error state: show sprite fallback with error indicator and retry button */}
      {showError && state.error && (
        <>
          <ResponsiveSpriteAvatar
            emotionalState={emotionalState}
            isSpeaking={isSpeaking}
            width={width}
            height={height}
          />
          <div
            className='live2d-error-overlay'
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(0,0,0,0.7)',
              padding: '6px 12px',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
            }}
          >
            <span title={state.error.message}>⚠️ Live2D Failed</span>
            {state.retryCount < MAX_RETRIES && (
              <button
                type='button'
                onClick={handleRetry}
                style={{
                  background: '#4a90d9',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Retry ({MAX_RETRIES - state.retryCount} left)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Hook for controlling a Live2D avatar from outside the component
 */
export function useLive2DController() {
  const controllerRef = useRef<Live2DAvatarController | null>(null)

  const setController = useCallback((controller: Live2DAvatarController) => {
    controllerRef.current = controller
  }, [])

  const setExpression = useCallback(
    (expression: Expression, intensity?: number) => {
      controllerRef.current?.setExpression(expression, intensity)
    },
    []
  )

  const playMotion = useCallback((motion: AvatarMotion) => {
    controllerRef.current?.playMotion(motion)
  }, [])

  const updateLipSync = useCallback((level: number) => {
    controllerRef.current?.updateLipSync(level)
  }, [])

  const triggerBlink = useCallback(() => {
    controllerRef.current?.triggerBlink()
  }, [])

  const updateCognitiveState = useCallback((state: CognitiveVisualState) => {
    controllerRef.current?.updateCognitiveState?.(state)
  }, [])

  const setParameter = useCallback((paramId: string, value: number) => {
    controllerRef.current?.setParameter(paramId, value)
  }, [])

  return {
    setController,
    setExpression,
    playMotion,
    updateLipSync,
    updateCognitiveState,
    triggerBlink,
    setParameter,
    controller: controllerRef.current,
  }
}

// The frontend esbuild pipeline only supports `*.module.scss` imports, so
// the styles from Live2DAvatar.scss are injected at runtime, following the
// same pattern AICompanionHub.tsx uses for its layout styles.
// Keep Live2DAvatar.scss in sync when editing these rules.
const live2dStyles = `
.live2d-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  overflow: hidden;
  background: radial-gradient(circle at center, #1e1e3f 0%, #0f0f23 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), inset 0 0 60px rgba(99, 102, 241, 0.05);
  transition: box-shadow 0.3s ease;
}

.live2d-avatar:hover {
  box-shadow: 0 6px 30px rgba(99, 102, 241, 0.2), inset 0 0 80px rgba(99, 102, 241, 0.08);
}

.live2d-avatar canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.live2d-loading {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.live2d-loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #94a3b8;
  font-size: 0.9rem;
}

.live2d-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: live2d-spin 1s linear infinite;
}

@keyframes live2d-spin {
  to {
    transform: rotate(360deg);
  }
}

.live2d-error {
  background: linear-gradient(135deg, #1a1a2e 0%, #2a1a2e 100%);
}

.live2d-error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #f87171;
  text-align: center;
  padding: 1rem;
}

.live2d-error-content .live2d-error-icon {
  font-size: 2rem;
}

.live2d-error-content small {
  color: #94a3b8;
  font-size: 0.75rem;
  max-width: 200px;
  word-break: break-word;
}

.avatar-display-section {
  background: var(--bg-card, #1a1a2e);
  border-radius: 16px;
  border: 1px solid var(--border, #2d2d4a);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.avatar-display-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border, #2d2d4a);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1));
}

.avatar-display-header h3 {
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text, #e2e8f0);
}

.avatar-display-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.avatar-controls {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border, #2d2d4a);
  background: rgba(0, 0, 0, 0.2);
  flex-wrap: wrap;
  justify-content: center;
}

.avatar-control-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  background: var(--bg-hover, #252542);
  border: 1px solid var(--border, #2d2d4a);
  border-radius: 6px;
  color: var(--text, #e2e8f0);
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-control-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: #6366f1;
  color: #a5b4fc;
}

.avatar-control-btn:active {
  transform: scale(0.95);
}

.avatar-control-btn.active {
  background: rgba(99, 102, 241, 0.3);
  border-color: #6366f1;
  color: #c7d2fe;
}

.expression-buttons {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
}

.expression-btn {
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
  background: var(--bg-hover, #252542);
  border: 1px solid var(--border, #2d2d4a);
  border-radius: 4px;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.expression-btn:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: #6366f1;
  color: var(--text, #e2e8f0);
}

.expression-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
}

.avatar-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
}

.avatar-status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: live2d-status-pulse 2s infinite;
}

.avatar-status-indicator.loading {
  background: #f59e0b;
}

.avatar-status-indicator.error {
  background: #ef4444;
  animation: none;
}

@keyframes live2d-status-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.speaking-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  background: rgba(16, 185, 129, 0.2);
  border-radius: 4px;
  color: #10b981;
}

.speaking-indicator .speaking-bars {
  display: flex;
  align-items: flex-end;
  height: 12px;
  gap: 2px;
}

.speaking-indicator .speaking-bars span {
  width: 3px;
  background: #10b981;
  border-radius: 1px;
  animation: live2d-speaking-wave 0.5s ease-in-out infinite;
}

.speaking-indicator .speaking-bars span:nth-child(1) {
  animation-delay: 0s;
}

.speaking-indicator .speaking-bars span:nth-child(2) {
  animation-delay: 0.1s;
}

.speaking-indicator .speaking-bars span:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes live2d-speaking-wave {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 12px;
  }
}

.avatar-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.avatar-motion-section,
.avatar-lipsync-section {
  background: var(--bg-card, #1a1a2e);
  border-radius: 12px;
  border: 1px solid var(--border, #2d2d4a);
  padding: 1rem;
}

.avatar-motion-section h4,
.avatar-lipsync-section h4 {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text, #e2e8f0);
}

.motion-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lipsync-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lipsync-slider {
  flex: 1;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-hover, #252542);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
}

.lipsync-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.lipsync-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.lipsync-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.lipsync-value {
  min-width: 50px;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: #a5b4fc;
}

.live2d-ready {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: radial-gradient(circle at center, #1e1e3f 0%, #0f0f23 100%);
}
`

if (
  typeof document !== 'undefined' &&
  !document.getElementById('live2d-avatar-styles')
) {
  const styleEl = document.createElement('style')
  styleEl.id = 'live2d-avatar-styles'
  styleEl.textContent = live2dStyles
  document.head.appendChild(styleEl)
}

export default Live2DAvatar
