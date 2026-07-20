/**
 * HormoneWaveform — Scrolling waveform display of hormone history.
 * Renders as a mini oscilloscope-style visualization.
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { useEffect, useRef, useCallback } from "react";

interface HormoneWaveformProps {
  history: Array<{ time: number; hormones: number[] }>;
}

const CHANNEL_COLORS = [
  "#ff6b6b", "#ff8787", "#ffa8a8", "#00ffd5", "#38ffdb",
  "#ffd43b", "#ff9f43", "#f783ac", "#748ffc", "#9b59b6",
  "#69db7c", "#a9e34b", "#ff6b6b", "#20c997",
];

const CHANNEL_LABELS = ["CRH", "ACTH", "Cort", "DA-t", "DA-p", "5-HT", "NE", "OXY", "T3", "Mel", "Ins", "Glc", "IL6", "AEA"];
const DISPLAY_CHANNELS = [2, 3, 5, 6, 7, 13];

export default function HormoneWaveform({ history }: HormoneWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 64 * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = "64px";
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 64;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(0, 255, 213, 0.04)";
    ctx.lineWidth = 0.5;
    for (let y = 0; y <= h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x <= w; x += w / 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (history.length < 2) {
      ctx.fillStyle = "rgba(0, 255, 213, 0.15)";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Awaiting data...", w / 2, h / 2 + 4);
      return;
    }

    const points = history.slice(-80);
    const stepX = w / Math.max(points.length - 1, 1);

    for (const channelIdx of DISPLAY_CHANNELS) {
      const color = CHANNEL_COLORS[channelIdx] || "#00ffd5";

      // Main line
      ctx.beginPath();
      ctx.strokeStyle = color + "80";
      ctx.lineWidth = 1.2;
      ctx.lineJoin = "round";

      for (let i = 0; i < points.length; i++) {
        const val = points[i].hormones[channelIdx] ?? 0;
        const x = i * stepX;
        const y = h - val * h * 0.85 - h * 0.07;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glow
      ctx.strokeStyle = color + "18";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }, [history]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  return (
    <div className="glass-panel p-3" ref={containerRef}>
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-dte-teal/50 mb-2">
        Endocrine Waveform
      </h3>
      <canvas ref={canvasRef} className="w-full rounded" />
      <div className="flex gap-3 mt-2 flex-wrap">
        {DISPLAY_CHANNELS.map((idx) => (
          <div key={idx} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[idx] }} />
            <span className="text-[8px] font-mono opacity-40">{CHANNEL_LABELS[idx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
