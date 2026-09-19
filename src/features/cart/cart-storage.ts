import { CART_STORAGE_KEY, parseCartPayload, type Cart } from "./domain";

export function readStoredCart(): Cart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw === null ? null : parseCartPayload(raw);
  } catch {
    return null;
  }
}

export function writeStoredCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage may be unavailable (private mode / quota). Cart stays in memory.
  }
}

export function clearStoredCart(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Ignore: nothing to clear in that case.
  }
}