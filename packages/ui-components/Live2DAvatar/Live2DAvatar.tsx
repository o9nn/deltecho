/**
 * Live2DAvatar — React component for Live2D Cubism 4 models
 *
 * Renders a Live2D model with:
 *   • CDN-loaded runtime (cubismcore + pixi.js-legacy + pixi-live2d-display)
 *   • Endocrine-driven facial expression via EndocrineExpressionBridge
 *   • Cognitive-mode-driven motion playback
 *   • Mouse-follow auto-interaction
 *   • Smooth parameter interpolation at 60 fps
 *
 * CRITICAL: PIXI is never accessed at module scope (CDN race condition).
 * All PIXI usage is inside useEffect or callbacks.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useScriptLoader } from './useScriptLoader.js';
import { EndocrineExpressionBridge } from './EndocrineExpressionBridge.js';
import type { Live2DAvatarProps, EndocrineState } from './types.js';

export const Live2DAvatar: React.FC<Live2DAvatarProps> = ({
  modelUrl,
  width = 800,
  height = 600,
  scale = 0.12,
  endocrineState,
  cognitiveMode,
  onModelLoaded,
  onError,
  autoInteract = true,
  className,
  manifest,
  cdnOverrides,
}) => {
  // ── Refs ─────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const bridgeRef = useRef<EndocrineExpressionBridge | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentModeRef = useRef<string>('idle');
  const endocrineRef = useRef<EndocrineState | undefined>(endocrineState);

  // ── State ────────────────────────────────────────────
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  // ── Scripts ──────────────────────────────────────────
  const scripts = useScriptLoader(cdnOverrides);

  // ── Keep endocrine ref in sync (avoids effect dependency) ──
  useEffect(() => {
    endocrineRef.current = endocrineState;
  }, [endocrineState]);

  // ── Initialise bridge ────────────────────────────────
  useEffect(() => {
    bridgeRef.current = new EndocrineExpressionBridge(
      manifest
        ? {
            baselines: manifest.endocrineBaselines,
            sensitivity: manifest.endocrineSensitivity,
          }
        : undefined,
    );
    return () => {
      bridgeRef.current?.reset();
    };
  }, [manifest]);

  // ── Create PIXI app + load model ────────────────────
  useEffect(() => {
    if (!scripts.loaded || !containerRef.current) return;

    let cancelled = false;

    // PIXI is on window — loaded by CDN scripts
    const PIXI = (window as any).PIXI;
    if (!PIXI?.live2d) {
      const err = new Error(
        'PIXI or pixi-live2d-display not available on window',
      );
      setStatus('error');
      onError?.(err);
      return;
    }

    // Create the PixiJS application
    const app = new PIXI.Application({
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      autoStart: true,
    });

    if (cancelled) {
      app.destroy(true);
      return;
    }

    // Append the canvas element
    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    // Load model
    (async () => {
      try {
        const model = await PIXI.live2d.Live2DModel.from(modelUrl, {
          autoInteract,
        });

        if (cancelled) return;

        // Scale & position
        model.scale.set(scale);
        const posX = manifest?.position?.x ?? 0.5;
        const posY = manifest?.position?.y ?? 0.85;
        model.x = width * posX;
        model.y = height * posY;
        model.anchor.set(0.5, 1.0);

        app.stage.addChild(model);
        modelRef.current = model;

        // Start idle motion
        try {
          model.motion('Idle', 0);
        } catch {
          /* model may not have idle motion */
        }

        setStatus('ready');
        onModelLoaded?.(model);

        // ── Animation loop (endocrine bridge) ──
        const animate = (timestamp: number) => {
          if (cancelled) return;
          const dt =
            lastTimeRef.current > 0
              ? (timestamp - lastTimeRef.current) / 1000
              : 0.033;
          lastTimeRef.current = timestamp;

          if (bridgeRef.current && endocrineRef.current && modelRef.current) {
            bridgeRef.current.apply(modelRef.current, endocrineRef.current, dt);
          }

          animFrameRef.current = requestAnimationFrame(animate);
        };
        animFrameRef.current = requestAnimationFrame(animate);
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setStatus('error');
        onError?.(error);
      }
    })();

    // ── Cleanup ──
    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (modelRef.current) {
        modelRef.current.destroy();
        modelRef.current = null;
      }
      if (appRef.current) {
        // Remove canvas from DOM before destroying
        const canvas = appRef.current.view as HTMLCanvasElement;
        canvas?.parentNode?.removeChild(canvas);
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts.loaded, modelUrl, width, height, scale, autoInteract]);

  // ── Cognitive mode → motion ──────────────────────────
  useEffect(() => {
    if (!modelRef.current || !cognitiveMode) return;
    if (cognitiveMode === currentModeRef.current) return;
    currentModeRef.current = cognitiveMode;

    const mapping = manifest?.motionMappings?.find(
      (m) => m.cognitiveMode === cognitiveMode,
    );
    if (mapping) {
      try {
        modelRef.current.motion(mapping.motionGroup, mapping.motionIndex);
      } catch {
        /* motion group not available in model */
      }
    }
  }, [cognitiveMode, manifest]);

  // ── Resize handling ──────────────────────────────────
  useEffect(() => {
    if (!appRef.current) return;
    appRef.current.renderer.resize(width, height);
    if (modelRef.current) {
      const posX = manifest?.position?.x ?? 0.5;
      const posY = manifest?.position?.y ?? 0.85;
      modelRef.current.x = width * posX;
      modelRef.current.y = height * posY;
    }
  }, [width, height, manifest]);

  // ── Render ───────────────────────────────────────────
  if (scripts.error) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff4444',
          fontFamily: 'monospace',
          fontSize: 14,
        }}
      >
        Live2D script error: {scripts.error.message}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {(scripts.loading || status === 'loading') && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            fontSize: 14,
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          Loading avatar…
        </div>
      )}
    </div>
  );
};
