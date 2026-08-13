import { createContext } from "react";
import type { Product } from "../types/storefront";

export type FavoriteProduct = {
  id: string;
  product: string;
  product_title: string;
  product_slug: string;
  product_final_price: string;
  customer_identifier: string;
  created_at: string;
};

export type WishlistContextValue = {
  favorites: Set<string>;
  favoritesLoading: boolean;
  favoriteProducts: FavoriteProduct[];
  favoriteProductDetails: Record<string, Product>;
  toggleFavorite: (productId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
};

export const WishlistContext = createContext<WishlistContextValue | null>(null);
