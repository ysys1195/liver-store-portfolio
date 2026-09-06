"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import { productCategories, type ProductCategory } from "@/lib/product";

export const CART_STORAGE_KEY = "liver-store-demo-cart";

const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Keep the in-memory cart usable when browser storage is unavailable.
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // There is no persisted cart to remove when storage is unavailable.
    }
  },
};

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  maxStock: number;
  category: ProductCategory;
  imageUrl: string | null;
};

export type CartItem = CartProduct & {
  quantity: number;
};

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  soldOutRemovalNames: string[];
  addItem: (product: CartProduct, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  removeSoldOutItems: (products: Array<{ id: string; name: string }>) => void;
  clearCart: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProductCategory(value: unknown): value is ProductCategory {
  return productCategories.some((category) => category === value);
}

function sanitizeItem(value: unknown): CartItem | null {
  if (!isRecord(value)) return null;

  const { id, slug, name, price, maxStock, category, imageUrl, quantity } =
    value;
  if (
    typeof id !== "string" ||
    typeof slug !== "string" ||
    typeof name !== "string" ||
    !Number.isInteger(price) ||
    (price as number) < 0 ||
    !Number.isInteger(maxStock) ||
    (maxStock as number) < 1 ||
    !isProductCategory(category) ||
    (imageUrl !== null && typeof imageUrl !== "string") ||
    !Number.isInteger(quantity)
  ) {
    return null;
  }

  return {
    id,
    slug,
    name,
    price: price as number,
    maxStock: maxStock as number,
    category,
    imageUrl,
    quantity: Math.min(Math.max(quantity as number, 1), maxStock as number),
  };
}

function sanitizePersistedItems(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.items)) return [];

  const items = value.items
    .map(sanitizeItem)
    .filter((item): item is CartItem => item !== null);
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function clampQuantity(quantity: number, maxStock: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(Math.max(Math.trunc(quantity), 1), maxStock);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      soldOutRemovalNames: [],
      addItem: (product, quantity = 1) => {
        if (!Number.isInteger(product.maxStock) || product.maxStock < 1) return;

        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          const nextQuantity = clampQuantity(
            (existing?.quantity ?? 0) + quantity,
            product.maxStock,
          );
          const nextItem = { ...product, quantity: nextQuantity };

          return {
            items: existing
              ? state.items.map((item) =>
                  item.id === product.id ? nextItem : item,
                )
              : [...state.items, nextItem],
          };
        });
      },
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  quantity: clampQuantity(quantity, item.maxStock),
                }
              : item,
          ),
        })),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        })),
      removeSoldOutItems: (products) =>
        set((state) => {
          const productIds = new Set(products.map((product) => product.id));
          const removedItems = state.items.filter((item) =>
            productIds.has(item.id),
          );

          if (removedItems.length === 0) return state;

          return {
            items: state.items.filter((item) => !productIds.has(item.id)),
            soldOutRemovalNames: [
              ...new Set([
                ...state.soldOutRemovalNames,
                ...removedItems.map((item) => item.name),
              ]),
            ],
          };
        }),
      clearCart: () => set({ items: [], soldOutRemovalNames: [] }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => safeLocalStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        items: sanitizePersistedItems(persistedState),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          return;
        }

        useCartStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((subtotal, item) => {
    return subtotal + item.price * item.quantity;
  }, 0);
}

export function getCartItemCount(items: CartItem[]) {
  return items.reduce((count, item) => count + item.quantity, 0);
}
