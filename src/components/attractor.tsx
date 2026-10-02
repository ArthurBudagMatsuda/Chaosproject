"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; z: number };

// A deterministic Lorenz orbit, projected into a butterfly-shaped field.
function createOrbit(): Point[] {
  let x = 0.1, y = 0, z = 0;
  const points: Point[] = [];
  for (let i = 0; i < 6600; i++) {
    const dx = 10 * (y - x), dy = x * (28 - z) - y, dz = x * y - (8 / 3) * z;
    x += dx * 0.006; y += dy * 0.006; z += dz * 0.006;
    if (i > 600) points.push({ x, y, z });
  }
  return points;
}

export function Attractor({ index, paused }: { index: number; paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indexRef = useRef(index);
  useEffect(() => { indexRef.current = index; }, [index]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const orbit = createOrbit();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, time = 0, width = 1, height = 1, visible = true, last = 0, drawnIndex = -1;
    const normalizedIndex = () => Math.max(0, Math.min(100, indexRef.current)) / 100;
    let displayedChaos = normalizedIndex();
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const draw = () => {
      context.clearRect(0, 0, width, height);
      const chaos = displayedChaos;
      // Double the starting size and increase the maximum within the canvas.
      // Interpolate across the full index range rather than hitting a size cap early.
      const baseScale = Math.min(width / 70, height / 55) * 0.9;
      const maximumScale = Math.min(width / 62, height / 44);
      const scale = baseScale + (maximumScale - baseScale) * chaos;
      const angle = -0.14 + Math.sin(time * 0.12) * 0.075;
      const project = (p: Point, i: number) => {
        const distortion = Math.sin(i * 0.043 + time * 1.5) * chaos * 0.7;
        const px = p.x * 1.26 + p.y * 0.22 + distortion;
        const py = (p.z - 25) * 0.95 + Math.sin(i * 0.03 - time) * chaos * 0.5;
        return { x: width / 2 + (px * Math.cos(angle) - py * Math.sin(angle)) * scale, y: height / 2 - (px * Math.sin(angle) + py * Math.cos(angle)) * scale };
      };
      context.lineWidth = 0.65;
      // Short connected trajectories keep the form crisp without a full-screen blur.
      for (let start = 0; start < orbit.length - 28; start += 28) {
        context.beginPath();
        context.strokeStyle = `rgba(242,68,54,${0.06 + (0.5 + Math.sin(start * 0.007 + time)) * 0.12})`;
        for (let j = start; j <= start + 28; j++) {
          const p = project(orbit[j], j);
          if (j === start) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
        }
        context.stroke();
      }
      const count = Math.floor(70 + chaos * 190);
      for (let i = 0; i < count; i++) {
        const offset = (Math.floor(i * 23.87 + time * (12 + chaos * 40))) % orbit.length;
        const p = project(orbit[offset], offset);
        context.fillStyle = i % 9 === 0 ? "#ffd5b9" : "#fc6550";
        context.globalAlpha = 0.35 + (i % 6) * 0.1;
        context.beginPath(); context.arc(p.x, p.y, i % 9 === 0 ? 1.5 : 0.8, 0, Math.PI * 2); context.fill();
      }
      context.globalAlpha = 1;
      drawnIndex = indexRef.current;
    };
    const tick = (now: number) => {
      if (visible && !document.hidden && now - last >= 33) {
        if (!paused && !media.matches) {
          const delta = Math.min((now - last) / 1000, 0.05);
          time += delta;
          displayedChaos += (normalizedIndex() - displayedChaos) * (1 - Math.exp(-delta * 8));
          draw();
        } else if (drawnIndex !== indexRef.current) {
          displayedChaos = normalizedIndex();
          draw();
        }
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    intersection.observe(canvas);
    resize(); frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); };
  }, [paused]);

  return <canvas ref={canvasRef} className="attractor-canvas" aria-hidden="true" />;
}
