"use client";

import { useEffect, useRef } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  variant?: "text" | "card" | "media";
}

function revealDisabled(): boolean {
  return document.documentElement.dataset.enableThemeAnimations === "false" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function ScrollReveal({ children, className = "", delayMs = 0, variant = "text" }: ScrollRevealProps): React.ReactElement {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const show = (): void => { node.classList.add("is-visible"); };
    if (revealDisabled()) { show(); return; }
    node.classList.add("reveal", "reveal-" + variant);
    const rect = node.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) { show(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        show();
        observer.disconnect();
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [variant]);
  return (
    <div
      ref={nodeRef}
      className={className}
      style={delayMs > 0 ? { transitionDelay: String(Math.min(delayMs, 420)) + "ms" } : undefined}
    >
      {children}
    </div>
  );
}
