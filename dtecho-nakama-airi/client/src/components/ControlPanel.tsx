/**
 * ControlPanel — Controls for the cognitive engine and endocrine events.
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { motion } from "framer-motion";
import { EndocrineEvent } from "@/lib/endocrine";
import { Play, Pause, RotateCcw, Zap, Heart, AlertTriangle, Sparkles, Brain } from "lucide-react";

interface ControlPanelProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onStep: () => void;
  onReset: () => void;
  onTriggerEvent: (event: EndocrineEvent, intensity?: number) => void;
}

const EVENT_BUTTONS = [
  { event: EndocrineEvent.REWARD_RECEIVED, label: "Reward", icon: Sparkles, color: "#ffd43b" },
  { event: EndocrineEvent.NOVELTY_ENCOUNTERED, label: "Novelty", icon: Zap, color: "#00ffd5" },
  { event: EndocrineEvent.SOCIAL_BOND_SIGNAL, label: "Social", icon: Heart, color: "#f783ac" },
  { event: EndocrineEvent.THREAT_DETECTED, label: "Threat", icon: AlertTriangle, color: "#ff6b6b" },
  { event: EndocrineEvent.GOAL_ACHIEVED, label: "Goal", icon: Brain, color: "#748ffc" },
];

export default function ControlPanel({
  isRunning,
  onStart,
  onStop,
  onStep,
  onReset,
  onTriggerEvent,
}: ControlPanelProps) {
  return (
    <div className="glass-panel p-4 space-y-4">
      <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-dte-teal/70">
        Cognitive Controls
      </h3>

      {/* Engine Controls */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isRunning ? onStop : onStart}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
            isRunning
              ? "bg-dte-amber/15 text-dte-amber border-dte-amber/30 hover:bg-dte-amber/25"
              : "bg-dte-teal/15 text-dte-teal border-dte-teal/30 hover:bg-dte-teal/25"
          }`}
        >
          {isRunning ? <Pause size={12} /> : <Play size={12} />}
          {isRunning ? "Pause" : "Run"}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStep}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-border/40 text-foreground/70 hover:bg-secondary/50 transition-colors"
        >
          <Zap size={12} />
          Step
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-destructive/30 text-destructive/70 hover:bg-destructive/10 transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </motion.button>
      </div>

      {/* Endocrine Event Triggers */}
      <div>
        <h4 className="text-[10px] font-mono uppercase tracking-wider text-dte-amber/50 mb-2">
          Signal Events
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_BUTTONS.map(({ event, label, icon: Icon, color }) => (
            <motion.button
              key={label}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onTriggerEvent(event, 0.6 + Math.random() * 0.3)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border transition-all"
              style={{
                borderColor: `${color}30`,
                color: `${color}cc`,
                backgroundColor: `${color}08`,
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = `${color}20`;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = `${color}08`;
              }}
            >
              <Icon size={10} />
              {label}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
