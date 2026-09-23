"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";

interface MobileMenuLink {
  href: string;
  label: string;
}

interface MobileMenuProps {
  links: MobileMenuLink[];
  menuAria: string;
  closeAria: string;
  reserveLabel: string;
  callLabel: string;
}

export default function MobileMenu({
  links,
  menuAria,
  closeAria,
  reserveLabel,
  callLabel,
}: MobileMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="main-menu-drawer"
        aria-label={menuAria}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink transition-colors duration-300 hover:bg-paper hover:text-brand lg:hidden"
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <div
        id="main-menu-drawer"
        aria-hidden={!open}
        className={`fixed inset-0 z-50 transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`absolute inset-0 bg-brand-deep/45 transition-opacity duration-300 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-paper shadow-dining transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3 sm:px-6">
            <span className="font-display text-xl font-semibold text-brand">Kalyna</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeAria}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink/70 transition-colors duration-300 hover:bg-paper hover:text-brand"
            >
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav aria-label={menuAria} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-3 font-display text-2xl font-medium text-ink transition-colors duration-300 hover:bg-cream hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-4 border-t border-ink/10 px-4 py-5 sm:px-6">
            <Link
              href="/reservierung"
              onClick={() => setOpen(false)}
              className="btn-primary w-full"
            >
              {reserveLabel}
            </Link>
            <div className="flex items-center justify-between gap-3">
              <LocaleSwitcher />
              <a
                href="tel:+495610000000"
                className="min-h-11 rounded-md px-3 py-2 text-sm font-semibold text-ink/70 transition-colors duration-300 hover:text-brand"
              >
                {callLabel}
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}