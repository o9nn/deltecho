/**
 * CognitiveStatePanel — Displays the current DTE cognitive state,
 * cognitive mode, expression, and thought stream.
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { motion, AnimatePresence } from "framer-motion";
import { CognitiveSnapshot } from "@/lib/cognitive";
import { CognitiveMode } from "@/lib/endocrine";

interface CognitiveStatePanelProps {
  snapshot: CognitiveSnapshot;
  stateHistory: CognitiveSnapshot[];
}

const MODE_COLORS: Record<CognitiveMode, string> = {
  [CognitiveMode.RESTING]: "#20c997",
  [CognitiveMode.EXPLORATORY]: "#00ffd5",
  [CognitiveMode.FOCUSED]: "#748ffc",
  [CognitiveMode.STRESSED]: "#ff6b6b",
  [CognitiveMode.SOCIAL]: "#f783ac",
  [CognitiveMode.REFLECTIVE]: "#9b59b6",
  [CognitiveMode.VIGILANT]: "#ff9f43",
  [CognitiveMode.MAINTENANCE]: "#69db7c",
  [CognitiveMode.REWARD]: "#ffd43b",
  [CognitiveMode.THREAT]: "#ff4444",
};

const MODE_DESCRIPTIONS: Record<CognitiveMode, string> = {
  [CognitiveMode.RESTING]: "Baseline homeostasis, low arousal",
  [CognitiveMode.EXPLORATORY]: "Seeking novelty, high curiosity",
  [CognitiveMode.FOCUSED]: "Deep concentration, task-oriented",
  [CognitiveMode.STRESSED]: "Elevated cortisol, fight-or-flight",
  [CognitiveMode.SOCIAL]: "Bonding mode, oxytocin-driven",
  [CognitiveMode.REFLECTIVE]: "Meta-cognitive introspection",
  [CognitiveMode.VIGILANT]: "Heightened awareness, scanning",
  [CognitiveMode.MAINTENANCE]: "Metabolic regulation active",
  [CognitiveMode.REWARD]: "Dopaminergic reward processing",
  [CognitiveMode.THREAT]: "Threat response activated",
};

export default function CognitiveStatePanel({ snapshot, stateHistory }: CognitiveStatePanelProps) {
  const modeColor = MODE_COLORS[snapshot.mode] || "#00ffd5";
  const recentThoughts = stateHistory.slice(-6).reverse();

  return (
    <div className="glass-panel p-4 space-y-4">
      {/* Current State */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-dte-teal/70 mb-2">
          Cognitive State
        </h3>
        <AnimatePresence mode="wait">
          <motion.div
            key={snapshot.state}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-lg font-display font-semibold"
            style={{ color: modeColor }}
          >
            {snapshot.state}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cognitive Mode */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-dte-amber/70 mb-2">
          Cognitive Mode
        </h3>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: modeColor, boxShadow: `0 0 12px ${modeColor}80` }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-sm font-display font-medium" style={{ color: modeColor }}>
            {snapshot.mode}
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground mt-1 opacity-60">
          {MODE_DESCRIPTIONS[snapshot.mode]}
        </p>
      </div>

      {/* Expression */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-dte-purple/70 mb-2">
          Expression
        </h3>
        <AnimatePresence mode="wait">
          <motion.span
            key={snapshot.expression}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm font-mono"
            style={{ color: "#9b59b6" }}
          >
            {snapshot.expression}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Thought Stream */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-dte-teal/70 mb-2">
          Thought Stream
        </h3>
        <div className="space-y-1 max-h-32 overflow-hidden">
          {recentThoughts.map((snap, i) => (
            <motion.div
              key={`${snap.timestamp}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1 - i * 0.15, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="text-xs font-mono leading-relaxed"
              style={{ color: i === 0 ? modeColor : `${modeColor}60` }}
            >
              {i === 0 ? "▸ " : "  "}{snap.thought}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
