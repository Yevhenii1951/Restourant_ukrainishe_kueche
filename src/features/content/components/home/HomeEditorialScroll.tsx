"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useRef } from "react";
import type { PublicMenuItem, SupportedLocale } from "@/features/menu/domain";
import { formatEuroCents } from "@/lib/format";

interface HomeEditorialScrollProps {
  items: PublicMenuItem[];
  locale: SupportedLocale;
}

function motionDisabled(): boolean {
  return document.documentElement.dataset.enableThemeAnimations === "false" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function HomeEditorialScroll({ items, locale }: HomeEditorialScrollProps): React.ReactElement | null {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const title = titleRef.current;
    if (!section || !track) return;
    const revealObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      section.classList.add("is-visible");
      revealObserver.disconnect();
    }, { rootMargin: "0px 0px -18% 0px", threshold: 0.12 });
    revealObserver.observe(section);
    if (motionDisabled()) return () => revealObserver.disconnect();
    let current = 0;
    let target = 0;
    let velocity = 0;
    let frame = 0;
    const stiffness = 120;
    const damping = 28;
    const measure = (): void => {
      const rect = section.getBoundingClientRect();
      const maxX = Math.max(0, track.scrollWidth - window.innerWidth + 96);
      const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
      target = -maxX * progress;
      if (title) title.style.opacity = String(Math.max(0.08, 0.42 - progress * 0.34));
    };
    const tick = (): void => {
      measure();
      const delta = 1 / 60;
      const force = (target - current) * stiffness;
      velocity += force * delta;
      velocity *= Math.exp(-damping * delta);
      current += velocity * delta;
      track.style.transform = "translate3d(" + current + "px, 0, 0)";
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      revealObserver.disconnect();
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <>
      <section ref={sectionRef} className="editorial-scroll bleed relative hidden min-h-[260vh] bg-cream lg:block">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <h2 ref={titleRef} className="pointer-events-none absolute left-10 top-20 z-0 font-display text-[18vw] font-semibold leading-none text-brand-dark/35 mix-blend-multiply">Signature</h2>
          <div ref={trackRef} className="relative z-10 flex w-max gap-8 pl-[14vw] pr-[18vw] will-change-transform">
            {items.map((item, index) => (
              <Link key={item.id} href={`/speisekarte#${item.slug}`} className="editorial-card group block w-[28rem] overflow-hidden rounded-lg border border-brand-deep/10 bg-paper shadow-xl shadow-brand-deep/10" style={{ transitionDelay: `${Math.min(index * 90, 420)}ms` }}>
                <div className="relative aspect-[4/5] overflow-hidden bg-blue-smoke">
                  <Image src={item.image.storagePath ?? "/2borsch.jpg"} alt={item.image.alt ?? item.name} fill sizes="448px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="editorial-caption flex items-start justify-between gap-4 p-5">
                  <div>
                    <h3 className="font-display text-3xl font-semibold leading-tight text-ink">{item.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/65">{item.description}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-brand">{formatEuroCents(item.basePriceCents, locale)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="editorial-ticker bleed flex overflow-hidden border-y border-brand-deep/10 bg-brand-deep py-4 text-cream lg:hidden">
        <div className="ticker-track flex min-w-max gap-8 px-4 font-display text-3xl font-semibold">
          {[...items, ...items].map((item, index) => <span key={`${item.id}-${index}`}>{item.name}</span>)}
        </div>
      </section>
    </>
  );
}
