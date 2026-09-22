"use client";

import { useEffect, useRef } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

export default function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
}: ScrollRevealProps): React.ReactElement {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const show = (): void => {
      node.classList.add("is-visible");
      node.classList.remove("reveal");
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show();
      return;
    }

    const rect = node.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) {
      show();
      return;
    }

    node.classList.add("reveal");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={nodeRef}
      className={className}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}