"use client";

import { useEffect, useRef } from "react";

interface LazyHeroVideoProps {
  src: string;
  poster: string;
}

function motionDisabled(): boolean {
  return document.documentElement.dataset.enableThemeAnimations === "false" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function LazyHeroVideo({ src, poster }: LazyHeroVideoProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || motionDisabled()) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      video.play().catch(() => undefined);
      observer.disconnect();
    }, { rootMargin: "220px 0px", threshold: 0.01 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return (
    <video ref={videoRef} className="absolute inset-0 hidden size-full object-cover motion-safe:block" src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden="true" />
  );
}
