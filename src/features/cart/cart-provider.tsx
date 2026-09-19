"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  CART_VERSION,
  addLineToCart,
  removeLineAt,
  setLineQuantity,
  type Cart,
  type CartLine,
} from "./domain";
import { readStoredCart, writeStoredCart } from "./cart-storage";

const EMPTY_CART: Cart = { version: CART_VERSION, lines: [] };

let cart = EMPTY_CART;
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function hydrateOnce(): void {
  if (hydrated || typeof window === "undefined") return;
  cart = readStoredCart() ?? EMPTY_CART;
  hydrated = true;
  emit();
}

function updateCart(updater: (current: Cart) => Cart): void {
  const next = updater(cart);
  if (next !== cart) {
    cart = next;
    writeStoredCart(cart);
    emit();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  hydrateOnce();
  return () => listeners.delete(listener);
}

const snapshotCart = (): Cart => cart;
const snapshotHydrated = (): boolean => hydrated;

interface CartContextValue {
  cart: Cart;
  hydrated: boolean;
  addLine: (cartLine: CartLine) => void;
  setQuantity: (lineIndex: number, quantity: number) => void;
  removeLine: (lineIndex: number) => void;
  updateSelections: (lineIndex: number, modifierSelections: CartLine["modifierSelections"]) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: Readonly<{ children: ReactNode }>) {
  const currentCart = useSyncExternalStore(subscribe, snapshotCart, () => EMPTY_CART);
  const isHydrated = useSyncExternalStore(subscribe, snapshotHydrated, () => false);

  const value = useMemo<CartContextValue>(
    () => ({
      cart: currentCart,
      hydrated: isHydrated,
      addLine: (cartLine) => updateCart((current) => addLineToCart(current, cartLine)),
      setQuantity: (lineIndex, quantity) =>
        updateCart((current) => setLineQuantity(current, lineIndex, quantity)),
      removeLine: (lineIndex) => updateCart((current) => removeLineAt(current, lineIndex)),
      updateSelections: (lineIndex, modifierSelections) =>
        updateCart((current) => ({
          ...current,
          lines: current.lines.map((entry, index) =>
            index === lineIndex ? { ...entry, modifierSelections } : entry,
          ),
        })),
      clearCart: () => updateCart(() => EMPTY_CART),
    }),
    [currentCart, isHydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}