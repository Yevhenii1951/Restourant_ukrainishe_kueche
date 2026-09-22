"use client";

import { useEffect } from "react";

function animationsEnabled(): boolean {
  return document.documentElement.dataset.enableThemeAnimations !== "false" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

export default function MotionRuntime(): null {
  useEffect(() => {
    document.documentElement.dataset.enableThemeAnimations ??= "true";
    const onClick = (event: MouseEvent): void => {
      if (!animationsEnabled()) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.hash.slice(1);
      if (!id) return;
      const target = document.getElementById(decodeURIComponent(id));
      if (!target) return;
      event.preventDefault();
      const start = window.scrollY;
      const end = target.getBoundingClientRect().top + window.scrollY;
      const duration = 620;
      const startedAt = performance.now();
      const step = (now: number): void => {
        const progress = Math.min(1, (now - startedAt) / duration);
        window.scrollTo(0, start + (end - start) * easeOutCubic(progress));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
