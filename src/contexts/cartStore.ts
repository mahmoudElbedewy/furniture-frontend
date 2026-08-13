import { createContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CartItem } from "../types/storefront";

export const FURNITURE_IDENTITY_READY_EVENT = "furniture-identity-ready";

export type CartContextValue = {
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  clearCart: () => void;
};

export const CartContext = createContext<CartContextValue | null>(null);
