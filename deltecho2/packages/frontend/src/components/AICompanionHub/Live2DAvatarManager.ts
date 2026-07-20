/**
 * Live2D Avatar Manager (browser-safe shim)
 *
 * Minimal replacement for the `@deltecho/avatar` package used by
 * deltecho-chat's Live2DAvatar component. That package bundles pixi.js and
 * pixi-live2d-display, which are not available in this workspace, so this
 * shim lazily loads the Live2D Cubism core, PixiJS, and the
 * pixi-live2d-display UMD bundles from CDN at runtime and drives the model
 * through the global `PIXI.live2d` namespace.
 *
 * If the SDK or the model cannot be loaded (offline, CSP, missing assets),
 * `initialize()` rejects and the Live2DAvatar component gracefully falls
 * back to the ResponsiveSpriteAvatar.
 */

import { getLogger } from '@deltachat-desktop/shared/logger'

import type {
  AvatarMotion,
  CognitiveVisualState,
  EmotionalVector,
  Expression,
  Live2DAvatarController,
} from './Live2DAvatar'

const log = getLogger('render/components/AICompanionHub/Live2DAvatarManager')

export interface Live2DAvatarManagerProps {
  /** Path to the model3.json file */
  modelPath: string
  /** Width of the canvas */
  width?: number
  /** Height of the canvas */
  height?: number
  /** Scale factor for the model */
  scale?: number
  /** Pixel ratio override for high-resolution or performance-tuned rendering */
  pixelRatio?: number
  /** Callback when model is loaded */
  onLoad?: () => void
  /** Callback when model fails to load */
  onError?: (error: Error) => void
  /** Additional CSS class name for the canvas */
  className?: string
  /** Debug mode */
  debug?: boolean
}

// Runtime scripts, loaded lazily and only once per page. Each is pinned and
// carries a subresource-integrity hash so a compromised or updated CDN file
// fails closed (the avatar falls back to the sprite renderer).
const CUBISM_CORE_URL =
  'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js'
const PIXI_URL = 'https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.js'
const PIXI_LIVE2D_URL =
  'https://cdn.jsdelivr.net/npm/pixi-live2d-display-lipsyncpatch@0.5.0-ls-8/dist/cubism4.min.js'

const SCRIPT_INTEGRITY: Record<string, string> = {
  [CUBISM_CORE_URL]:
    'sha384-MeKqhuhBpq1ZqqshjOzqDOQJ/00BuDVdnNeYgPKul9hmgROzmT17WkmUeFJ9Jlrb',
  [PIXI_URL]:
    'sha384-9oZ4NtPN/IdabMfsgMnEAm+FTH+xpnGN/C33Kz3OdcRyh9aaO2N6PuIONCebF1jh',
  [PIXI_LIVE2D_URL]:
    'sha384-GkO2hT7gHhS+ECYnxRuXTrUiHyy2GMS4QuBXKaB7V6f63sbvGUng7+lBv+9x0fkU',
}

const SCRIPT_LOAD_TIMEOUT_MS = 20000

const scriptPromises = new Map<string, Promise<void>>()

function loadScript(src: string): Promise<void> {
  const cached = scriptPromises.get(src)
  if (cached) return cached

  const promise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Live2D runtime requires a browser environment'))
      return
    }
    const script = document.createElement('script')
    script.src = src
    const integrity = SCRIPT_INTEGRITY[src]
    if (integrity) {
      script.integrity = integrity
      script.crossOrigin = 'anonymous'
    }
    script.async = true
    const timeout = setTimeout(() => {
      script.remove()
      reject(new Error(`Timed out loading script: ${src}`))
    }, SCRIPT_LOAD_TIMEOUT_MS)
    script.onload = () => {
      clearTimeout(timeout)
      resolve()
    }
    script.onerror = () => {
      clearTimeout(timeout)
      script.remove()
      reject(new Error(`Failed to load script: ${src}`))
    }
    document.head.appendChild(script)
  })

  // Evict rejected loads so a later retry can attempt the script again.
  promise.catch(() => scriptPromises.delete(src))
  scriptPromises.set(src, promise)
  return promise
}

/**
 * Load the Cubism core, PixiJS, and pixi-live2d-display bundles and return
 * the global PIXI namespace with the `live2d` extension attached.
 */
async function loadLive2DRuntime(): Promise<any> {
  const win = window as any
  if (!win.Live2DCubismCore) {
    await loadScript(CUBISM_CORE_URL)
  }
  if (!win.PIXI?.Application) {
    await loadScript(PIXI_URL)
  }
  if (!win.PIXI?.live2d?.Live2DModel) {
    await loadScript(PIXI_LIVE2D_URL)
  }
  if (!win.PIXI?.live2d?.Live2DModel) {
    throw new Error('Live2D runtime is unavailable after loading the SDK')
  }
  return win.PIXI
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Parameter presets for each expression using the standard Cubism parameter
 * ids. Values are scaled by the requested intensity; the Cubism core clamps
 * out-of-range values to each parameter's limits.
 */
const EXPRESSION_PRESETS: Record<Expression, Record<string, number>> = {
  neutral: {},
  happy: { ParamMouthForm: 1, ParamEyeLSmile: 1, ParamEyeRSmile: 1 },
  thinking: {
    ParamEyeBallX: -0.6,
    ParamEyeBallY: 0.4,
    ParamBrowLY: -0.3,
    ParamBrowRY: -0.3,
  },
  curious: { ParamBrowLY: 0.5, ParamBrowRY: 0.5, ParamEyeBallX: 0.4 },
  surprised: {
    ParamBrowLY: 0.8,
    ParamBrowRY: 0.8,
    ParamMouthOpenY: 0.4,
    ParamAngleY: 6,
  },
  concerned: { ParamBrowLY: -0.6, ParamBrowRY: -0.6, ParamMouthForm: -0.7 },
  focused: {
    ParamEyeLOpen: 0.7,
    ParamEyeROpen: 0.7,
    ParamBrowLY: -0.2,
    ParamBrowRY: -0.2,
  },
  playful: {
    ParamMouthForm: 1,
    ParamEyeLSmile: 1,
    ParamEyeRSmile: 1,
    ParamAngleZ: 8,
  },
  contemplative: {
    ParamEyeBallY: 0.5,
    ParamEyeLOpen: 0.8,
    ParamEyeROpen: 0.8,
  },
  empathetic: { ParamMouthForm: 0.5, ParamBrowLY: 0.2, ParamBrowRY: 0.2 },
}

/** All parameter ids that expression presets may touch. */
const EXPRESSION_PARAM_IDS = Array.from(
  new Set(
    Object.values(EXPRESSION_PRESETS).flatMap(preset => Object.keys(preset))
  )
)

/**
 * Candidate motion group names for each abstract motion. The first group
 * that exists in the loaded model's motion definitions wins; otherwise the
 * model's first defined group is used.
 */
const MOTION_GROUP_CANDIDATES: Record<AvatarMotion, string[]> = {
  idle: ['Idle', 'idle'],
  talking: ['Talk', 'Talking', 'Speak'],
  nodding: ['Nod', 'TapBody'],
  shaking_head: ['Shake', 'FlickHead'],
  tilting_head: ['Tilt'],
  tilt_head_left: ['TiltLeft', 'Tilt'],
  tilt_head_right: ['TiltRight', 'Tilt'],
  breathing: ['Idle', 'idle'],
  wave: ['Wave', 'TapBody'],
  nod: ['Nod', 'TapBody'],
  shake: ['Shake', 'FlickHead'],
  thinking: ['Think', 'Idle', 'idle'],
}

function readEmotion(state: EmotionalVector, key: string): number {
  const value = state[key]
  if (typeof value === 'number') return value
  const parsed = Number(value ?? 0)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Map a free-form emotional vector to an expression and intensity, roughly
 * matching the heuristics of `@deltecho/avatar`'s expression mapper.
 */
function mapEmotionToExpression(state: EmotionalVector): {
  expression: Expression
  intensity: number
} {
  const happiness = Math.max(
    readEmotion(state, 'happiness'),
    readEmotion(state, 'joy')
  )
  const surprise = readEmotion(state, 'surprise')
  const anger = readEmotion(state, 'anger')
  const fear = readEmotion(state, 'fear')
  const sadness = readEmotion(state, 'sadness')
  const curiosity = Math.max(
    readEmotion(state, 'curiosity'),
    readEmotion(state, 'interest')
  )
  const excitement = readEmotion(state, 'excitement')

  if (surprise > 0.6) return { expression: 'surprised', intensity: surprise }
  if (anger > 0.5 || fear > 0.5 || sadness > 0.5) {
    return {
      expression: 'concerned',
      intensity: Math.max(anger, fear, sadness),
    }
  }
  if (happiness > 0.7 && excitement > 0.5) {
    return { expression: 'playful', intensity: happiness }
  }
  if (happiness > 0.5) return { expression: 'happy', intensity: happiness }
  if (curiosity > 0.6) return { expression: 'curious', intensity: curiosity }
  return { expression: 'neutral', intensity: 0.5 }
}

/**
 * Create and drive a Live2D avatar inside a container element.
 *
 * The public surface mirrors `@deltecho/avatar`'s Live2DAvatarManager:
 * `initialize()`, `updateEmotionalState()`, `updateCognitiveState()`, and
 * `dispose()`, with `initialize()` resolving to a Live2DAvatarController.
 */
export class Live2DAvatarManager {
  private app: any = null
  private model: any = null
  private canvas: HTMLCanvasElement | null = null
  private isLoaded = false
  private isDisposed = false
  private paramOverrides = new Map<string, number>()
  private tickerCallback: (() => void) | null = null
  private blinkTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Initialize the avatar on a container element. Rejects when the Live2D
   * runtime or the model cannot be loaded.
   */
  async initialize(
    container: HTMLElement,
    props: Live2DAvatarManagerProps
  ): Promise<Live2DAvatarController> {
    // Make repeated initialization idempotent for React remount/retry paths.
    this.dispose()
    this.isDisposed = false

    const width = props.width ?? 400
    const height = props.height ?? 400

    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    if (props.className) {
      this.canvas.className = props.className
    }
    container.appendChild(this.canvas)

    try {
      const pixi = await loadLive2DRuntime()
      if (this.isDisposed) {
        this.removeCanvas()
        return this.createController()
      }

      const dpr =
        typeof window !== 'undefined' && window.devicePixelRatio
          ? window.devicePixelRatio
          : 1
      // Cap pixelRatio at 2 by default to avoid GPU thrashing on 4K/Retina
      // displays; an explicit pixelRatio overrides the cap.
      const resolution = props.pixelRatio ?? Math.min(dpr, 2)

      this.app = new pixi.Application({
        view: this.canvas,
        backgroundAlpha: 0,
        antialias: true,
        resolution,
        autoDensity: true,
        width,
        height,
      })

      const model = await pixi.live2d.Live2DModel.from(props.modelPath, {
        autoInteract: true,
        autoUpdate: true,
      })
      if (this.isDisposed) {
        model.destroy()
        this.removeCanvas()
        return this.createController()
      }
      this.model = model

      const scale = props.scale ?? 0.25
      model.scale.set(scale, scale)
      if (typeof model.anchor?.set === 'function') {
        model.anchor.set(0.5, 0.5)
      }
      model.x = width / 2
      model.y = height / 2
      this.app.stage.addChild(model)

      // Re-apply parameter overrides after the model's own update so
      // expression and lip-sync writes are not clobbered by idle motions.
      this.tickerCallback = () => this.applyOverrides()
      this.app.ticker.add(this.tickerCallback)

      this.isLoaded = true
      props.onLoad?.()
      if (props.debug) {
        log.debug('Live2D model loaded successfully:', props.modelPath)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error('Failed to initialize Live2D avatar:', err)
      this.removeCanvas()
      props.onError?.(err)
      throw err
    }

    return this.createController()
  }

  /**
   * Update the avatar's expression from a free-form emotional vector.
   */
  updateEmotionalState(state: EmotionalVector): void {
    if (!this.model || !this.isLoaded) return
    const { expression, intensity } = mapEmotionToExpression(state)
    this.applyExpression(expression, Math.max(0.3, clamp01(intensity)))
  }

  /**
   * Project a richer DTE cognitive state into expression, motion, and
   * lip-sync. A simplified version of `@deltecho/avatar`'s DTEcho projection.
   */
  updateCognitiveState(state: CognitiveVisualState): void {
    if (!this.model || !this.isLoaded) return

    const valence = state.valence ?? 0
    const arousal = state.arousal ?? 0.5

    let expression: Expression = 'neutral'
    if (state.isProcessing) {
      expression = 'thinking'
    } else if (arousal > 0.75 && valence >= 0) {
      expression = 'surprised'
    } else if (valence > 0.35) {
      expression = 'happy'
    } else if (valence < -0.35) {
      expression = 'concerned'
    } else if ((state.flow ?? 0) > 0.6) {
      expression = 'focused'
    } else if ((state.selfAwareness ?? 0) > 0.7) {
      expression = 'contemplative'
    }

    const intensity = Math.max(
      0.3,
      clamp01(Math.abs(valence) * 0.5 + arousal * 0.5)
    )
    this.applyExpression(expression, intensity)

    if (state.isProcessing) {
      this.playMotion('thinking')
    }

    if (state.isSpeaking !== undefined || state.audioLevel !== undefined) {
      this.updateLipSync(state.isSpeaking ? state.audioLevel ?? 0 : 0)
    }
  }

  /**
   * Play a motion by mapping the abstract motion name onto the model's
   * available motion groups.
   */
  playMotion(motion: AvatarMotion): void {
    if (!this.model) return
    const definitions =
      this.model.internalModel?.motionManager?.definitions ?? {}
    const available = Object.keys(definitions)
    if (available.length === 0) return

    const candidates = MOTION_GROUP_CANDIDATES[motion] ?? []
    const group = candidates.find(g => available.includes(g)) ?? available[0]
    try {
      this.model.motion(group)
    } catch (error) {
      log.warn(`Failed to play motion "${motion}" (group "${group}"):`, error)
    }
  }

  /**
   * Update the lip-sync mouth openness from an audio level (0-1).
   */
  updateLipSync(audioLevel: number): void {
    this.paramOverrides.set('ParamMouthOpenY', clamp01(audioLevel))
    this.applyOverrides()
  }

  /**
   * Trigger a manual blink.
   */
  triggerBlink(durationMs = 150): void {
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer)
    }
    this.paramOverrides.set('ParamEyeLOpen', 0)
    this.paramOverrides.set('ParamEyeROpen', 0)
    this.applyOverrides()
    this.blinkTimer = setTimeout(() => {
      this.blinkTimer = null
      this.paramOverrides.delete('ParamEyeLOpen')
      this.paramOverrides.delete('ParamEyeROpen')
    }, durationMs)
  }

  /**
   * Set a Cubism model parameter directly. The value is re-applied on every
   * frame until overwritten or cleared by an expression change.
   */
  setParameter(paramId: string, value: number): void {
    this.paramOverrides.set(paramId, value)
    this.applyOverrides()
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.isDisposed = true
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer)
      this.blinkTimer = null
    }
    if (this.app && this.tickerCallback) {
      try {
        this.app.ticker?.remove(this.tickerCallback)
      } catch (error) {
        log.warn('Failed to remove ticker callback:', error)
      }
    }
    this.tickerCallback = null
    if (this.model) {
      try {
        this.model.destroy()
      } catch (error) {
        log.warn('Failed to destroy Live2D model:', error)
      }
      this.model = null
    }
    if (this.app) {
      try {
        this.app.destroy(false)
      } catch (error) {
        log.warn('Failed to destroy PIXI application:', error)
      }
      this.app = null
    }
    this.removeCanvas()
    this.paramOverrides.clear()
    this.isLoaded = false
  }

  private createController(): Live2DAvatarController {
    return {
      setExpression: (expression, intensity = 0.7) => {
        this.applyExpression(expression, intensity)
      },
      playMotion: motion => {
        this.playMotion(motion)
      },
      updateLipSync: audioLevel => {
        this.updateLipSync(audioLevel)
      },
      updateCognitiveState: state => {
        this.updateCognitiveState(state)
      },
      triggerBlink: () => {
        this.triggerBlink()
      },
      setParameter: (paramId, value) => {
        this.setParameter(paramId, value)
      },
    }
  }

  private applyExpression(expression: Expression, intensity: number): void {
    if (!this.model || !this.isLoaded) return

    // Clear parameters of any previous expression while keeping unrelated
    // overrides (lip-sync, direct setParameter calls on other ids).
    for (const paramId of EXPRESSION_PARAM_IDS) {
      this.paramOverrides.delete(paramId)
    }

    const preset = EXPRESSION_PRESETS[expression] ?? {}
    const scale = clamp01(intensity)
    for (const [paramId, value] of Object.entries(preset)) {
      this.paramOverrides.set(paramId, value * scale)
    }
    this.applyOverrides()
  }

  private applyOverrides(): void {
    if (!this.model || this.paramOverrides.size === 0) return
    const coreModel = this.model.internalModel?.coreModel
    if (!coreModel || typeof coreModel.setParameterValueById !== 'function') {
      return
    }
    for (const [paramId, value] of this.paramOverrides) {
      try {
        coreModel.setParameterValueById(paramId, value)
      } catch (_error) {
        // Unknown parameter ids for this model are ignored.
      }
    }
  }

  private removeCanvas(): void {
    if (this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
    this.canvas = null
  }
}

/**
 * Create a Live2D avatar manager instance.
 */
export function createLive2DAvatarManager(): Live2DAvatarManager {
  return new Live2DAvatarManager()
}
