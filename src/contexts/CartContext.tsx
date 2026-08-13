import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { CartItem } from "../types/storefront";
import { CartContext, FURNITURE_IDENTITY_READY_EVENT } from "./cartStore";
const CART_STORAGE_PREFIX = "furniture_cart:";
const PENDING_IDENTITY_KEY = "pending";

const storageKeyFor = (identityToken: string | null) =>
  `${CART_STORAGE_PREFIX}${identityToken || PENDING_IDENTITY_KEY}`;

const readCart = (identityToken: string | null): CartItem[] => {
  try {
    const stored = localStorage.getItem(storageKeyFor(identityToken));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
};

const cartItemKey = (item: CartItem) =>
  item.selectedVariant
    ? `${item.product.id}::${item.selectedVariant.id}`
    : item.product.id;

const mergeCarts = (savedCart: CartItem[], pendingCart: CartItem[]) => {
  const merged = new Map(savedCart.map((item) => [cartItemKey(item), item]));

  pendingCart.forEach((item) => {
    const key = cartItemKey(item);
    const existing = merged.get(key);
    merged.set(
      key,
      existing ? { ...existing, quantity: existing.quantity + item.quantity } : item,
    );
  });

  return Array.from(merged.values());
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [identityToken, setIdentityToken] = useState<string | null>(() =>
    localStorage.getItem("furniture_identity_token"),
  );
  const [cart, setCart] = useState<CartItem[]>(() => readCart(identityToken));

  useEffect(() => {
    const handleIdentityReady = (event: Event) => {
      const nextIdentityToken = (event as CustomEvent<string>).detail;
      if (!nextIdentityToken || nextIdentityToken === identityToken) return;

      setCart((currentCart) => {
        const nextCart = mergeCarts(readCart(nextIdentityToken), currentCart);
        try {
          localStorage.setItem(
            storageKeyFor(nextIdentityToken),
            JSON.stringify(nextCart),
          );
          localStorage.removeItem(storageKeyFor(identityToken));
        } catch {
          // Keeping the in-memory cart is still better than losing the order.
        }
        return nextCart;
      });
      setIdentityToken(nextIdentityToken);
    };

    window.addEventListener(FURNITURE_IDENTITY_READY_EVENT, handleIdentityReady);
    return () =>
      window.removeEventListener(
        FURNITURE_IDENTITY_READY_EVENT,
        handleIdentityReady,
      );
  }, [identityToken]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyFor(identityToken), JSON.stringify(cart));
    } catch {
      // The checkout can still proceed when browser storage is unavailable.
    }
  }, [cart, identityToken]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKeyFor(identityToken)) return;
      setCart(readCart(identityToken));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [identityToken]);

  const clearCart = useCallback(() => setCart([]), []);
  const value = useMemo(
    () => ({ cart, setCart, clearCart }),
    [cart, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
