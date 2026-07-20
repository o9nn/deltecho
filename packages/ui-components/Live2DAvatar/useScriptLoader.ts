/**
 * useScriptLoader — CDN script loader for Live2D runtime
 *
 * Loads three scripts in strict order:
 *   1. live2dcubismcore.min.js  (Cubism 4 WASM core)
 *   2. pixi.js-legacy@6.5.2    (PixiJS with Canvas2D fallback)
 *   3. pixi-live2d-display      (Live2D model renderer)
 *
 * Scripts are loaded once globally and cached across re-renders/remounts.
 */

import { useState, useEffect, useRef } from 'react';
import type { ScriptLoadState } from './types.js';

const DEFAULT_URLS = {
  cubismCore: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
  pixi: 'https://cdn.jsdelivr.net/npm/pixi.js-legacy@6.5.2/dist/browser/pixi-legacy.min.js',
  pixiLive2D: 'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js',
} as const;

// Subresource-integrity hashes for the pinned default URLs so a compromised
// or silently-updated CDN file fails closed. Caller-supplied override URLs
// have no pinned hash and load without one (the consumer owns that risk).
const DEFAULT_INTEGRITY: Record<string, string> = {
  [DEFAULT_URLS.cubismCore]:
    'sha384-MeKqhuhBpq1ZqqshjOzqDOQJ/00BuDVdnNeYgPKul9hmgROzmT17WkmUeFJ9Jlrb',
  [DEFAULT_URLS.pixi]: 'sha384-+jjSMTS6TK1RBBCISfElV8nTiV6pq1q+1rDMG7LO8WPVRud5U1CJlRJjpTGCIX8d',
  [DEFAULT_URLS.pixiLive2D]:
    'sha384-Ukg4e48mEdLvXx4ipNmtVmWcMoKjgs89aotHN/5CB3Bj77JPioyjXXYORMiunxFz',
};

// Global de-duplication across component instances
const loadedScripts = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  if (loadedScripts.has(src)) return Promise.resolve();
  if (loadingPromises.has(src)) return loadingPromises.get(src)!;

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    const integrity = DEFAULT_INTEGRITY[src];
    if (integrity) {
      el.integrity = integrity;
      el.crossOrigin = 'anonymous';
    }
    el.async = false; // preserve evaluation order
    el.onload = () => {
      loadedScripts.add(src);
      loadingPromises.delete(src);
      resolve();
    };
    el.onerror = () => {
      loadingPromises.delete(src);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(el);
  });

  loadingPromises.set(src, promise);
  return promise;
}

/**
 * Hook that loads the Live2D CDN scripts in the correct order.
 * Returns `{ loaded, loading, error }`.
 */
export function useScriptLoader(overrides?: {
  cubismCore?: string;
  pixi?: string;
  pixiLive2D?: string;
}): ScriptLoadState {
  const [state, setState] = useState<ScriptLoadState>({
    loaded: false,
    error: null,
    loading: true,
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const urls = {
      cubismCore: overrides?.cubismCore ?? DEFAULT_URLS.cubismCore,
      pixi: overrides?.pixi ?? DEFAULT_URLS.pixi,
      pixiLive2D: overrides?.pixiLive2D ?? DEFAULT_URLS.pixiLive2D,
    };

    (async () => {
      try {
        // Order matters: cubismcore → pixi → pixi-live2d-display
        await loadScript(urls.cubismCore);
        await loadScript(urls.pixi);
        await loadScript(urls.pixiLive2D);
        if (mounted.current) {
          setState({ loaded: true, error: null, loading: false });
        }
      } catch (err) {
        if (mounted.current) {
          setState({
            loaded: false,
            error: err instanceof Error ? err : new Error(String(err)),
            loading: false,
          });
        }
      }
    })();

    return () => {
      mounted.current = false;
    };
  }, [overrides?.cubismCore, overrides?.pixi, overrides?.pixiLive2D]);

  return state;
}
