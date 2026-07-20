/**
 * EchobeatCycle — Visualizes the 9-step Echobeat cognitive cycle
 * from the Deep Tree Echo / unreal-echo skill.
 * Rendered as a circular diagram with the current step highlighted.
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { motion } from "framer-motion";
import { DTEState } from "@/lib/cognitive";

interface EchobeatCycleProps {
  currentState: DTEState;
}

const ECHOBEAT_STEPS = [
  { label: "Sense", short: "SEN", color: "#00ffd5" },
  { label: "Attend", short: "ATT", color: "#38ffdb" },
  { label: "Predict", short: "PRD", color: "#748ffc" },
  { label: "Compare", short: "CMP", color: "#ffd43b" },
  { label: "Update", short: "UPD", color: "#ff9f43" },
  { label: "Decide", short: "DEC", color: "#f783ac" },
  { label: "Act", short: "ACT", color: "#ff6b6b" },
  { label: "Learn", short: "LRN", color: "#9b59b6" },
  { label: "Reflect", short: "RFL", color: "#20c997" },
];

// Map DTE states to echobeat step indices
const STATE_TO_STEP: Record<string, number> = {
  [DTEState.IDLE]: 0,
  [DTEState.RECURSIVE_EXPANSION]: 1,
  [DTEState.PATTERN_RECOGNITION]: 2,
  [DTEState.NOVEL_INSIGHTS]: 3,
  [DTEState.ENTROPY_THRESHOLD]: 4,
  [DTEState.SYNTHESIS_PHASE]: 5,
  [DTEState.EXTERNAL_VALIDATION]: 6,
  [DTEState.KNOWLEDGE_INTEGRATION]: 7,
  [DTEState.SELF_REFERENCE_POINT]: 8,
  [DTEState.SPEAKING]: 6,
  [DTEState.SELF_SEALING_LOOP]: 4,
  [DTEState.EVOLUTIONARY_PRUNING]: 5,
  [DTEState.DEEP_RECURSION]: 8,
};

export default function EchobeatCycle({ currentState }: EchobeatCycleProps) {
  const activeStep = STATE_TO_STEP[currentState] ?? 0;
  const radius = 52;
  const centerX = 68;
  const centerY = 68;

  return (
    <div className="glass-panel p-4">
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-dte-teal/60 mb-3">
        Echobeat Cycle
      </h3>
      <div className="flex items-center justify-center">
        <svg width="136" height="136" viewBox="0 0 136 136">
          {/* Background circle */}
          <circle cx={centerX} cy={centerY} r={radius + 8} fill="none" stroke="rgba(0,255,213,0.05)" strokeWidth="1" />
          <circle cx={centerX} cy={centerY} r={radius - 12} fill="none" stroke="rgba(0,255,213,0.03)" strokeWidth="0.5" />

          {/* Connection lines between steps */}
          {ECHOBEAT_STEPS.map((_, i) => {
            const angle1 = (i / 9) * Math.PI * 2 - Math.PI / 2;
            const angle2 = ((i + 1) % 9 / 9) * Math.PI * 2 - Math.PI / 2;
            const x1 = centerX + Math.cos(angle1) * radius;
            const y1 = centerY + Math.sin(angle1) * radius;
            const x2 = centerX + Math.cos(angle2) * radius;
            const y2 = centerY + Math.sin(angle2) * radius;
            const isActive = i === activeStep || (i + 1) % 9 === activeStep;
            return (
              <line
                key={`line-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isActive ? ECHOBEAT_STEPS[i].color : "rgba(0,255,213,0.08)"}
                strokeWidth={isActive ? 1.5 : 0.5}
                opacity={isActive ? 0.6 : 0.3}
              />
            );
          })}

          {/* Step nodes */}
          {ECHOBEAT_STEPS.map((step, i) => {
            const angle = (i / 9) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const isActive = i === activeStep;

            return (
              <g key={`step-${i}`}>
                {/* Glow for active */}
                {isActive && (
                  <motion.circle
                    cx={x} cy={y} r={10}
                    fill={step.color}
                    opacity={0.15}
                    animate={{ r: [10, 14, 10], opacity: [0.15, 0.25, 0.15] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                {/* Node */}
                <circle
                  cx={x} cy={y}
                  r={isActive ? 5 : 3}
                  fill={isActive ? step.color : `${step.color}40`}
                  stroke={isActive ? step.color : "transparent"}
                  strokeWidth={isActive ? 1 : 0}
                />
                {/* Label */}
                <text
                  x={x}
                  y={y + (y < centerY ? -10 : 14)}
                  textAnchor="middle"
                  fill={isActive ? step.color : `${step.color}60`}
                  fontSize="7"
                  fontFamily="'IBM Plex Mono', monospace"
                >
                  {step.short}
                </text>
              </g>
            );
          })}

          {/* Center label */}
          <text
            x={centerX} y={centerY - 4}
            textAnchor="middle"
            fill="#00ffd5"
            fontSize="7"
            fontFamily="'IBM Plex Mono', monospace"
            opacity="0.5"
          >
            ECHO
          </text>
          <text
            x={centerX} y={centerY + 6}
            textAnchor="middle"
            fill="#ff9f43"
            fontSize="6"
            fontFamily="'IBM Plex Mono', monospace"
            opacity="0.4"
          >
            BEAT
          </text>
        </svg>
      </div>
    </div>
  );
}
