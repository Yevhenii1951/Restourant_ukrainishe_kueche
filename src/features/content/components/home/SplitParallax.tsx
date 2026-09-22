"use client";

import { useEffect, useRef } from "react";

interface SplitParallaxProps {
  children: React.ReactNode;
  className?: string;
}

function motionDisabled(): boolean {
  return document.documentElement.dataset.enableThemeAnimations === "false" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function SplitParallax({ children, className = "" }: SplitParallaxProps): React.ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || motionDisabled()) return;
    let frame = 0;
    const update = (): void => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = (viewport - rect.top) / (viewport + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      node.style.setProperty("--split-media-y", String((0.5 - clamped) * 34) + "px");
      node.style.setProperty("--split-copy-y", String((clamped - 0.5) * 22) + "px");
    };
    const requestUpdate = (): void => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
