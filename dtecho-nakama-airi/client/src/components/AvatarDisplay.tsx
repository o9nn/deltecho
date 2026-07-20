/**
 * AvatarDisplay — Renders the DTE avatar within the bioluminescent frame.
 * Integrates Live2D Cubism model via Live2DCanvas with SVG fallback.
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { CognitiveSnapshot } from "@/lib/cognitive";
import { CognitiveMode, VirtualEndocrineSystem } from "@/lib/endocrine";
import Live2DCanvas, { MODELS, type ModelKey } from "./Live2DCanvas";

interface AvatarDisplayProps {
  snapshot: CognitiveSnapshot;
  endocrine?: VirtualEndocrineSystem | null;
}

const MODE_GLOW: Record<CognitiveMode, string> = {
  [CognitiveMode.RESTING]: "0, 201, 151",
  [CognitiveMode.EXPLORATORY]: "0, 255, 213",
  [CognitiveMode.FOCUSED]: "116, 143, 252",
  [CognitiveMode.STRESSED]: "255, 107, 107",
  [CognitiveMode.SOCIAL]: "247, 131, 172",
  [CognitiveMode.REFLECTIVE]: "155, 89, 182",
  [CognitiveMode.VIGILANT]: "255, 159, 67",
  [CognitiveMode.MAINTENANCE]: "105, 219, 124",
  [CognitiveMode.REWARD]: "255, 212, 59",
  [CognitiveMode.THREAT]: "255, 68, 68",
};

const AVATAR_FRAME_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663148104337/ZmFDznVhWPmpRKLUs2tXxC/dtecho-avatar-frame-anUdjAjfEBXvuCNyC2B2uZ.png";
const COGNITIVE_ORB_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663148104337/ZmFDznVhWPmpRKLUs2tXxC/dtecho-cognitive-orb-Wb2rh9cGNomXmLyM8CA7vJ.webp";

export default function AvatarDisplay({ snapshot, endocrine }: AvatarDisplayProps) {
  const glowRGB = MODE_GLOW[snapshot.mode] || MODE_GLOW[CognitiveMode.RESTING];
  const isSpeaking = snapshot.state === "Speaking";
  const [live2dReady, setLive2dReady] = useState(false);
  const [live2dError, setLive2dError] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelKey>("miara");

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[400px] mx-auto gap-2">
      {/* Main avatar area */}
      <div className="relative w-full aspect-square">
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-[-30px] rounded-full pointer-events-none"
          animate={{
            boxShadow: `0 0 80px rgba(${glowRGB}, 0.1), 0 0 160px rgba(${glowRGB}, 0.05)`,
          }}
          transition={{ duration: 1.5 }}
        />

        {/* Cognitive orb backdrop */}
        <motion.div
          className="absolute w-[70%] aspect-square rounded-full overflow-hidden opacity-8 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        >
          <img src={COGNITIVE_ORB_URL} alt="" className="w-full h-full object-cover" loading="eager" />
        </motion.div>

        {/* Dark fill behind the frame center */}
        <div className="absolute inset-[6%] rounded-full bg-[#080c14]" style={{ zIndex: 5 }} />

        {/* Inner avatar area — Live2D layered on top of SVG fallback */}
        <div className="absolute inset-[14%] rounded-full overflow-hidden z-10">
          <div className="w-full h-full relative bg-gradient-to-b from-[#080c14] via-[#0b1018] to-[#080c14]">
            {/* SVG Fallback — always present, fades when Live2D loads */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-1000"
              style={{ opacity: live2dReady ? 0 : 1, zIndex: 1 }}
            >
              <SVGFallback glowRGB={glowRGB} isSpeaking={isSpeaking} />
            </div>

            {/* Live2D Canvas — always rendered, shown on top when ready */}
            <div
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: live2dReady ? 1 : 0, zIndex: 2 }}
            >
              <Live2DCanvas
                endocrine={endocrine ?? null}
                isSpeaking={isSpeaking}
                selectedModel={selectedModel}
                onModelLoaded={() => {
                  console.log("[AvatarDisplay] Live2D model loaded!");
                  setLive2dReady(true);
                  setLive2dError(false);
                }}
                onError={(err) => {
                  console.warn("[AvatarDisplay] Live2D error:", err);
                  setLive2dError(true);
                }}
              />
            </div>

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-0.5 rounded-full pointer-events-none"
                style={{
                  zIndex: 3,
                  backgroundColor: i % 3 === 0 ? "#00ffd5" : i % 3 === 1 ? "#ff9f43" : "#9b59b6",
                  left: `${20 + Math.random() * 60}%`,
                  bottom: `${15 + Math.random() * 15}%`,
                }}
                animate={{
                  y: [0, -50 - Math.random() * 60],
                  opacity: [0.6, 0],
                  scale: [1, 0.3],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
        </div>

        {/* Frame overlay */}
        <motion.img
          src={AVATAR_FRAME_URL}
          alt=""
          className="absolute inset-0 w-full h-full z-20 pointer-events-none select-none"
          animate={{ rotate: [0, 0.3, -0.3, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          loading="eager"
          draggable={false}
        />
      </div>

      {/* Model selector + status */}
      <div className="flex items-center gap-2 z-30">
        {(Object.keys(MODELS) as ModelKey[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              setLive2dReady(false);
              setLive2dError(false);
              setSelectedModel(key);
            }}
            className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all border ${
              selectedModel === key
                ? "border-dte-teal/50 bg-dte-teal/15 text-dte-teal"
                : "border-border/30 bg-transparent text-muted-foreground/40 hover:text-muted-foreground/60"
            }`}
          >
            {MODELS[key].name}
          </button>
        ))}
        {live2dReady && (
          <span className="text-[8px] font-mono text-dte-teal/40 ml-1">Live2D Active</span>
        )}
        {live2dError && !live2dReady && (
          <span className="text-[8px] font-mono text-dte-amber/40 ml-1">SVG Mode</span>
        )}
      </div>
    </div>
  );
}

/* SVG Fallback — the original DTE silhouette */
function SVGFallback({ glowRGB, isSpeaking }: { glowRGB: string; isSpeaking: boolean }) {
  return (
    <motion.div
      className="relative"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width="160" height="210" viewBox="0 0 200 260" className="opacity-90">
        <defs>
          <radialGradient id="headGlow">
            <stop offset="0%" stopColor={`rgb(${glowRGB})`} stopOpacity="0.12" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff9f43" />
            <stop offset="100%" stopColor="#ff6b3b" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="70" r="55" fill="url(#headGlow)" />
        <motion.ellipse
          cx="100" cy="68" rx="36" ry="40"
          fill="none" stroke="#00ffd5" strokeWidth="1.2"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.path
          d="M64 52 Q52 85 55 130 Q58 155 62 175"
          fill="none" stroke="url(#hairGrad)" strokeWidth="2" strokeLinecap="round" opacity="0.65"
          animate={{ d: ["M64 52 Q52 85 55 130 Q58 155 62 175", "M64 52 Q48 87 51 132 Q54 157 58 177"] }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M136 52 Q148 85 145 130 Q142 155 138 175"
          fill="none" stroke="url(#hairGrad)" strokeWidth="2" strokeLinecap="round" opacity="0.65"
          animate={{ d: ["M136 52 Q148 85 145 130 Q142 155 138 175", "M136 52 Q152 87 149 132 Q146 157 142 177"] }}
          transition={{ duration: 4.2, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.path
          d="M57 58 Q57 28 100 22 Q143 28 143 58"
          fill="none" stroke="#ff9f43" strokeWidth="3" strokeLinecap="round" opacity="0.55"
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <ellipse cx="54" cy="62" rx="8" ry="10" fill="none" stroke="#ff9f43" strokeWidth="1.5" opacity="0.4" />
        <ellipse cx="146" cy="62" rx="8" ry="10" fill="none" stroke="#ff9f43" strokeWidth="1.5" opacity="0.4" />
        <motion.ellipse
          cx="87" cy="63" rx="3.5" ry="3" fill="#00ffd5"
          animate={{ opacity: [0.65, 1, 0.65], ry: [3, 3.5, 3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <motion.ellipse
          cx="113" cy="63" rx="3.5" ry="3" fill="#00ffd5"
          animate={{ opacity: [0.65, 1, 0.65], ry: [3, 3.5, 3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }}
        />
        <motion.path
          d="M93 80 Q100 83 107 80"
          fill="none" stroke="#00ffd5" strokeWidth="0.8" strokeLinecap="round" opacity="0.3"
          animate={{ d: isSpeaking
            ? ["M93 80 Q100 84 107 80", "M93 80 Q100 88 107 80", "M93 80 Q100 84 107 80"]
            : ["M93 80 Q100 83 107 80", "M93 80 Q100 84 107 80"]
          }}
          transition={{ duration: isSpeaking ? 0.3 : 3, repeat: Infinity }}
        />
        <path d="M74 102 Q100 108 126 102" fill="none" stroke="#9b59b6" strokeWidth="1.2" opacity="0.35" />
        <motion.circle cx="100" cy="105" r="2" fill="#9b59b6"
          animate={{ opacity: [0.4, 1, 0.4], r: [2, 2.8, 2] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.path
          d="M74 108 Q70 140 66 190 Q62 218 70 245 L130 245 Q138 218 134 190 Q130 140 126 108"
          fill="none" stroke="#00ffd5" strokeWidth="0.8" opacity="0.2"
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  );
}
