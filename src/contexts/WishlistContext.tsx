import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { WishlistContext } from "./wishlistStore";
import type { WishlistContextValue } from "./wishlistStore";

type WishlistProviderProps = WishlistContextValue & {
  children: ReactNode;
};

export function WishlistProvider({
  children,
  favorites,
  favoritesLoading,
  favoriteProducts,
  favoriteProductDetails,
  toggleFavorite,
  refreshFavorites,
}: WishlistProviderProps) {
  useEffect(() => {
    void refreshFavorites();
  }, [refreshFavorites]);

  const value = useMemo(
    () => ({
      favorites,
      favoritesLoading,
      favoriteProducts,
      favoriteProductDetails,
      toggleFavorite,
      refreshFavorites,
    }),
    [
      favoriteProductDetails,
      favoriteProducts,
      favorites,
      favoritesLoading,
      refreshFavorites,
      toggleFavorite,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}
