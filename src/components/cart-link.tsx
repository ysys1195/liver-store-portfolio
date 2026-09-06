"use client";

import Link from "next/link";

import { getCartItemCount, useCartStore } from "@/stores/cart-store";
import { useCartHydration } from "@/stores/use-cart-hydration";

export function CartLink() {
  const hasHydrated = useCartHydration();
  const itemCount = useCartStore((state) => getCartItemCount(state.items));

  return (
    <Link
      href="/cart"
      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-violet-700 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 sm:px-5"
      aria-label={
        hasHydrated && itemCount > 0 ? `カート、${itemCount}点の商品` : "カート"
      }
    >
      Cart
      {hasHydrated && itemCount > 0 ? (
        <span className="ml-2 rounded-full bg-violet-700 px-2 py-0.5 text-xs text-white">
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
