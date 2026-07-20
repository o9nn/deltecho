/**
 * MyceliumBackground — Animated bioluminescent background with
 * mycelium network lines and floating particles.
 * Design: Bioluminescent Mycorrhizal Interface
 */

import { useEffect, useRef } from "react";

const HERO_BG_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663148104337/ZmFDznVhWPmpRKLUs2tXxC/dtecho-hero-bg-RqR4odiex72JSVqswN6q9P.webp";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Node {
  x: number;
  y: number;
  pulsePhase: number;
  pulseSpeed: number;
}

export default function MyceliumBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let nodes: Node[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNodes();
    };

    const initNodes = () => {
      nodes = [];
      const count = Math.floor((canvas.width * canvas.height) / 80000);
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.005 + Math.random() * 0.01,
        });
      }
    };

    const spawnParticle = () => {
      if (particles.length > 30) return;
      const colors = ["#00ffd5", "#ff9f43", "#9b59b6"];
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.3 - Math.random() * 0.5,
        size: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.6 + Math.random() * 0.4,
        life: 0,
        maxLife: 200 + Math.random() * 300,
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw mycelium connections
      const connectionDist = 200;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.pulsePhase += a.pulseSpeed;
        const pulseAlpha = 0.03 + Math.sin(a.pulsePhase) * 0.02;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            const alpha = pulseAlpha * (1 - dist / connectionDist);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            // Curved connection
            const cx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 20;
            const cy = (a.y + b.y) / 2 + (Math.random() - 0.5) * 20;
            ctx.quadraticCurveTo(cx, cy, b.x, b.y);
            ctx.strokeStyle = `rgba(0, 255, 213, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // Draw node glow
        const nodeAlpha = 0.1 + Math.sin(a.pulsePhase) * 0.05;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 213, ${nodeAlpha})`;
        ctx.fill();
      }

      // Update and draw particles
      if (Math.random() < 0.05) spawnParticle();

      particles = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const lifeRatio = p.life / p.maxLife;
        const alpha = p.alpha * (1 - lifeRatio);

        if (alpha <= 0) return false;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(")", `, ${alpha})`).replace("rgb", "rgba").replace("#", "");

        // Convert hex to rgba for alpha support
        const hex = p.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.15})`;
        ctx.fill();

        return p.life < p.maxLife;
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      {/* Base background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${HERO_BG_URL})` }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0a0e17]/80" />
      {/* Animated canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10" />
    </div>
  );
}
