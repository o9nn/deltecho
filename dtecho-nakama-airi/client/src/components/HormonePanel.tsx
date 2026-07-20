/**
 * HormonePanel — Bioluminescent hormone visualization
 * Renders each hormone channel as a glowing bar with organic animations.
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { motion } from "framer-motion";

interface HormonePanelProps {
  hormones: Record<string, number>;
}

const HORMONE_META: Array<{ name: string; color: string; icon: string }> = [
  { name: "Cortisol", color: "#ffa8a8", icon: "🔥" },
  { name: "Dopamine (tonic)", color: "#00ffd5", icon: "✨" },
  { name: "Dopamine (phasic)", color: "#38ffdb", icon: "💫" },
  { name: "Serotonin", color: "#ffd43b", icon: "☀" },
  { name: "Norepinephrine", color: "#ff9f43", icon: "⚡" },
  { name: "Oxytocin", color: "#f783ac", icon: "♥" },
  { name: "T3/T4", color: "#748ffc", icon: "⚙" },
  { name: "Anandamide", color: "#20c997", icon: "✿" },
];

export default function HormonePanel({ hormones }: HormonePanelProps) {
  return (
    <div className="glass-panel p-4 space-y-2.5">
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-dte-teal/60 mb-3">
        Endocrine Bus
      </h3>
      {HORMONE_META.map(({ name, color, icon }) => {
        const value = hormones[name] ?? 0;
        const pct = Math.max(3, value * 100);
        return (
          <div key={name} className="flex items-center gap-2 group">
            <span className="text-[10px] w-4 text-center opacity-50 select-none">{icon}</span>
            <span
              className="text-[10px] font-mono w-20 truncate opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ color }}
            >
              {name.replace(" (tonic)", "-T").replace(" (phasic)", "-P")}
            </span>
            <div
              className="flex-1 h-[7px] rounded-full overflow-hidden relative"
              style={{ background: `${color}10` }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${color}50, ${color})`,
                  boxShadow: `0 0 6px ${color}50, inset 0 1px 0 ${color}30`,
                }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
              {/* Pulse overlay */}
              {value > 0.3 && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${color}20, transparent)` }}
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>
            <span
              className="text-[10px] font-mono w-7 text-right tabular-nums"
              style={{ color: `${color}aa` }}
            >
              {(value * 100).toFixed(0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
