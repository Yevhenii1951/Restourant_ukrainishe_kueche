"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { countCartItems } from "../domain";
import { useCart } from "../cart-provider";

export default function CartBadge() {
  const { cart, hydrated } = useCart();
  const cartTranslations = useTranslations("cart");
  const navTranslations = useTranslations("nav");

  const count = countCartItems(cart);
  if (!hydrated || count === 0) return null;

  return (
    <Link
      href="/warenkorb"
      aria-label={cartTranslations("openCart", { count })}
      className="relative rounded-lg bg-kalyna px-4 py-2 font-medium text-white hover:opacity-90"
    >
      <span className="mr-1.5" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      </span>
      {navTranslations("cart")}
      <span
        aria-hidden="true"
        className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-kalyna shadow"
      >
        {count}
      </span>
    </Link>
  );
}