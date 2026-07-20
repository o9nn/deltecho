/**
 * Live2DCanvas — Renders a Live2D Cubism model using pixi-live2d-display via CDN.
 * Primary model: Miara (custom DeltEcho avatar, Cubism 4, 4096px texture)
 * Fallback models: Haru (Cubism 4), Shizuku (Cubism 2)
 * Supports expression changes driven by the endocrine system and cognitive state.
 * 
 * Canvas renders at 2x device pixel ratio for crisp display.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { HormoneId, VirtualEndocrineSystem } from "@/lib/endocrine";

// Miara model hosted on S3/CDN — 4096px texture for maximum resolution
const MIARA_MODEL_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663148104337/ZmFDznVhWPmpRKLUs2tXxC/miara_pro_t03_cdn.model3_366c085b.json";

const MODELS = {
  miara: {
    url: MIARA_MODEL_URL,
    name: "Miara (DeltEcho)",
    scale: 0.12,
    // Miara is a full-body fairy character — zoom into face+upper body
    // yOffsetFactor: fraction of displayH to shift up (higher = more of the face visible)
    yOffsetFactor: -0.05,
    scaleMultiplier: 2.4,
  },
  haru: {
    url: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json",
    name: "Haru (Cubism 4)",
    scale: 1.0,
    yOffsetFactor: 0.05,
    scaleMultiplier: 1.2,
  },
  shizuku: {
    url: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json",
    name: "Shizuku (Cubism 2)",
    scale: 1.0,
    yOffsetFactor: 0.05,
    scaleMultiplier: 1.2,
  },
};

type ModelKey = keyof typeof MODELS;

/**
 * Endocrine → Cubism parameter bridge
 * Enhanced for Miara's rich parameter set (face, body, hair, breath, brows)
 */
function endocrineToCubismParams(endocrine: VirtualEndocrineSystem): Record<string, number> {
  const params: Record<string, number> = {};

  const dopamineTonic = endocrine.concentration(HormoneId.DOPAMINE_TONIC);
  const dopaminePhasic = endocrine.concentration(HormoneId.DOPAMINE_PHASIC);
  const serotonin = endocrine.concentration(HormoneId.SEROTONIN);
  const norepinephrine = endocrine.concentration(HormoneId.NOREPINEPHRINE);
  const cortisol = endocrine.concentration(HormoneId.CORTISOL);
  const oxytocin = endocrine.concentration(HormoneId.OXYTOCIN);
  const anandamide = endocrine.concentration(HormoneId.ANANDAMIDE);
  const t3t4 = endocrine.concentration(HormoneId.T3_T4);

  // --- Mouth ---
  let mouthForm = 0;
  if (dopamineTonic > 0.5) mouthForm += 0.6 + (dopamineTonic - 0.5) * 0.8;
  if (oxytocin > 0.4) mouthForm += 0.3;
  if (cortisol > 0.5) mouthForm -= 0.4;
  params["ParamMouthForm"] = Math.max(-1, Math.min(1, mouthForm));

  // --- Eyes ---
  let eyeOpen = 0.8;
  if (norepinephrine > 0.6) eyeOpen = 1.0;
  if (serotonin > 0.4 && norepinephrine < 0.3) eyeOpen = 0.7;
  if (anandamide > 0.3) eyeOpen = 0.4;
  if (cortisol > 0.6 && norepinephrine > 0.5) eyeOpen = 0.9;
  params["ParamEyeLOpen"] = eyeOpen;
  params["ParamEyeROpen"] = eyeOpen;

  // --- Eyeball gaze ---
  let gazeY = 0;
  if (t3t4 > 0.6) gazeY += 0.3;
  if (dopaminePhasic > 0.3) gazeY += 0.2;
  if (cortisol > 0.5) gazeY -= 0.2;
  params["ParamEyeBallY"] = Math.max(-1, Math.min(1, gazeY));

  if (norepinephrine > 0.5) {
    params["ParamEyeBallX"] = Math.sin(Date.now() / 2000) * 0.3;
  }

  // --- Brows ---
  let browY = 0;
  let browAngle = 0;
  if (norepinephrine > 0.6) { browY = 0.5; browAngle = 0.3; }
  if (cortisol > 0.5) { browY = -0.5; browAngle = -0.3; }
  if (dopamineTonic > 0.6) { browY = 0.3; browAngle = 0.2; }
  params["ParamBrowLY"] = browY;
  params["ParamBrowRY"] = browY;
  params["ParamBrowLAngle"] = browAngle;
  params["ParamBrowRAngle"] = browAngle;

  if (cortisol > 0.4) {
    params["ParamBrowLForm"] = -0.3;
    params["ParamBrowRForm"] = -0.3;
  } else if (serotonin > 0.5) {
    params["ParamBrowLForm"] = 0.2;
    params["ParamBrowRForm"] = 0.2;
  }

  // --- Head angle ---
  let headZ = 0;
  if (oxytocin > 0.4) headZ = 5;
  if (cortisol > 0.5) headZ = -3;
  params["ParamAngleZ"] = headZ;

  if (dopamineTonic > 0.5) {
    params["ParamAngleY"] = Math.sin(Date.now() / 3000) * 3;
  }

  // --- Body ---
  if (serotonin > 0.4) {
    params["ParamBodyAngleX"] = Math.sin(Date.now() / 4000) * 2;
    params["ParamBodyAngleZ"] = Math.sin(Date.now() / 5000) * 1.5;
  } else if (norepinephrine > 0.5) {
    params["ParamBodyAngleX"] = 0;
  }

  // --- Breath ---
  const breathRate = norepinephrine > 0.5 ? 1500 : cortisol > 0.4 ? 2000 : 3000;
  params["ParamBreath"] = (Math.sin(Date.now() / breathRate) + 1) * 0.5;

  return params;
}

interface Live2DCanvasProps {
  endocrine: VirtualEndocrineSystem | null;
  isSpeaking?: boolean;
  selectedModel?: ModelKey;
  onModelLoaded?: () => void;
  onError?: (error: string) => void;
}

export default function Live2DCanvas({
  endocrine,
  isSpeaking = false,
  selectedModel = "miara",
  onModelLoaded,
  onError,
}: Live2DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const animFrameRef = useRef<number>(0);

  // Apply endocrine-driven parameters
  const applyEndocrineParams = useCallback(() => {
    const model = modelRef.current;
    if (!model || !endocrine) return;

    const params = endocrineToCubismParams(endocrine);
    if (isSpeaking) {
      params["ParamMouthOpenY"] = 0.3 + Math.sin(Date.now() / 100) * 0.3;
    }

    const coreModel = model.internalModel?.coreModel;
    if (coreModel) {
      for (const [paramName, value] of Object.entries(params)) {
        try {
          const paramIndex = coreModel.getParameterIndex?.(paramName);
          if (paramIndex !== undefined && paramIndex >= 0) {
            coreModel.setParameterValueByIndex?.(paramIndex, value);
          }
        } catch {}
      }
    }

    animFrameRef.current = requestAnimationFrame(applyEndocrineParams);
  }, [endocrine, isSpeaking]);

  useEffect(() => {
    if (status === "ready" && endocrine) {
      animFrameRef.current = requestAnimationFrame(applyEndocrineParams);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [status, endocrine, applyEndocrineParams]);

  // Initialize Live2D
  useEffect(() => {
    let cancelled = false;
    let resizeHandler: (() => void) | null = null;

    async function init() {
      const container = containerRef.current;
      if (!container) return;

      // Wait for container to have dimensions
      await new Promise((r) => setTimeout(r, 100));
      if (cancelled) return;

      setStatus("loading");
      setErrorMsg("");

      try {
        // Cleanup previous
        if (appRef.current) {
          try { appRef.current.destroy(true, { children: true }); } catch {}
          appRef.current = null;
          modelRef.current = null;
        }

        // Wait for Cubism Core (with timeout)
        const start = Date.now();
        while (!(window as any).Live2DCubismCore) {
          if (Date.now() - start > 15000) throw new Error("Cubism Core SDK timeout");
          await new Promise((r) => setTimeout(r, 200));
          if (cancelled) return;
        }

        const PIXI = (window as any).PIXI;
        if (!PIXI) throw new Error("PixiJS not loaded");
        if (!PIXI.live2d) throw new Error("pixi-live2d-display not loaded");

        const cssW = container.clientWidth || 300;
        const cssH = container.clientHeight || 300;
        // Use high DPR for crisp rendering — always at least 2x
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const renderW = Math.round(cssW * dpr);
        const renderH = Math.round(cssH * dpr);

        // Create canvas with dark background at high resolution
        const canvas = document.createElement("canvas");
        canvas.width = renderW;
        canvas.height = renderH;
        canvas.style.cssText = `width:${cssW}px;height:${cssH}px;display:block;touch-action:none;position:absolute;top:0;left:0;background-color:#080c14;border-radius:50%;`;
        container.querySelectorAll("canvas").forEach(c => c.remove());
        container.appendChild(canvas);

        const app = new PIXI.Application({
          view: canvas,
          autoStart: true,
          backgroundColor: 0x080c14,
          backgroundAlpha: 1,
          width: renderW,
          height: renderH,
          antialias: true,
          preserveDrawingBuffer: true,
          // WebGL required for Cubism Core SDK rendering
          resolution: 1, // We handle DPR manually via canvas dimensions
        });
        (window as any).__DTECHO_APP__ = app;

        if (cancelled) {
          try { app.destroy(true); } catch {}
          return;
        }
        appRef.current = app;

        // Load model
        const modelConfig = MODELS[selectedModel];
        console.log("[Live2D] Loading model:", modelConfig.name, modelConfig.url);

        const model = await PIXI.live2d.Live2DModel.from(modelConfig.url, {
          autoInteract: true,
          autoUpdate: true,
        });

        if (cancelled) {
          try { app.destroy(true); } catch {}
          return;
        }

        app.stage.addChild(model);
        modelRef.current = model;
        (window as any).__DTECHO_MODEL__ = model;
        console.log('[Live2D] Model dimensions:', model.width, 'x', model.height);

        const origW = model.width;
        const origH = model.height;
        console.log('[Live2D] Original model size:', origW, 'x', origH);
        
        const doResize = () => {
          const newCssW = container.clientWidth || 300;
          const newCssH = container.clientHeight || 300;
          const newDpr = Math.max(window.devicePixelRatio || 1, 2);
          const newRenderW = Math.round(newCssW * newDpr);
          const newRenderH = Math.round(newCssH * newDpr);
          
          // Update canvas CSS and physical size
          canvas.width = newRenderW;
          canvas.height = newRenderH;
          canvas.style.width = `${newCssW}px`;
          canvas.style.height = `${newCssH}px`;
          try { app.renderer.resize(newRenderW, newRenderH); } catch {}
          
          // Scale model using per-model configuration
          // Use render dimensions (not CSS) so the model fills the high-res canvas
          const scale = (newRenderW / origW) * modelConfig.scaleMultiplier;
          model.scale.set(scale);
          
          // Center horizontally  
          const displayW = origW * scale;
          const displayH = origH * scale;
          model.x = (newRenderW - displayW) / 2;
          
          // Position vertically — shift up to show face
          model.y = -(displayH * modelConfig.yOffsetFactor);
          
          console.log('[Live2D] Resize:', { 
            model: selectedModel,
            cssW: newCssW, cssH: newCssH,
            renderW: newRenderW, renderH: newRenderH,
            dpr: newDpr,
            scale: scale.toFixed(3), 
            displayW: displayW.toFixed(0), 
            displayH: displayH.toFixed(0), 
            x: model.x.toFixed(0), 
            y: model.y.toFixed(0) 
          });
        };
        doResize();
        resizeHandler = doResize;
        window.addEventListener("resize", doResize);

        // Hit area interactions
        model.on("hit", (hitAreaNames: string[]) => {
          console.log("[Live2D] Hit areas:", hitAreaNames);
          if (hitAreaNames.includes("head") || hitAreaNames.includes("Head")) {
            model.motion("Tap", 0, 3);
          }
          if (hitAreaNames.includes("body") || hitAreaNames.includes("Body")) {
            model.motion("Flic", 0, 3);
          }
        });

        // Start idle motion
        try {
          model.motion("Idle", 0, 1);
        } catch {}

        console.log("[Live2D] Model loaded successfully:", modelConfig.name);
        setStatus("ready");
        onModelLoaded?.();
      } catch (err: any) {
        console.error("[Live2D] Load error:", err);
        if (!cancelled) {
          const msg = err?.message || "Failed to load Live2D model";
          setStatus("error");
          setErrorMsg(msg);
          onError?.(msg);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (appRef.current) {
        try { appRef.current.destroy(true, { children: true }); } catch {}
        appRef.current = null;
        modelRef.current = null;
      }
    };
  }, [selectedModel]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="w-full h-full relative"
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-xs font-mono text-dte-teal/50 animate-pulse">
            Loading {MODELS[selectedModel]?.name || "model"}...
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-xs font-mono text-dte-amber/50 text-center px-4">
            <div className="mb-1 text-[9px]">{errorMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export { MODELS, type ModelKey };
