"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

interface StickyHeaderProps {
  children: React.ReactNode;
}

export default function StickyHeader({ children }: StickyHeaderProps): React.ReactElement {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = (): void => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      className="site-header sticky top-0 z-40"
      data-over-hero={overHero ? "true" : "false"}
      data-scrolled={scrolled ? "true" : "false"}
    >
      {children}
    </div>
  );
}