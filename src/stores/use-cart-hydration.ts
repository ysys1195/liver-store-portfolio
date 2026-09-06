"use client";

import { useEffect } from "react";

import { useCartStore } from "./cart-store";

export function useCartHydration() {
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!useCartStore.persist.hasHydrated()) {
      void useCartStore.persist.rehydrate();
    }
  }, []);

  return hasHydrated;
}
