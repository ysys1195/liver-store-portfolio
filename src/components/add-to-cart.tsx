"use client";

import Link from "next/link";
import { useState } from "react";

import type { CartProduct } from "@/stores/cart-store";
import { useCartStore } from "@/stores/cart-store";
import { useCartHydration } from "@/stores/use-cart-hydration";

export function AddToCart({ product }: { product: CartProduct }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const hasHydrated = useCartHydration();
  const cartQuantity = useCartStore(
    (state) =>
      state.items.find((item) => item.id === product.id)?.quantity ?? 0,
  );
  const addItem = useCartStore((state) => state.addItem);
  const remainingQuantity = Math.max(0, product.maxStock - cartQuantity);
  const selectedQuantity = Math.min(quantity, remainingQuantity);

  const changeQuantity = (nextQuantity: number) => {
    setAdded(false);
    setQuantity(Math.min(Math.max(nextQuantity, 1), remainingQuantity));
  };

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-slate-950">数量</span>
        <div
          className="inline-flex items-center rounded-full border border-slate-300 bg-white p-1"
          role="group"
          aria-label={`${product.name}の数量`}
        >
          <button
            type="button"
            aria-label="数量を1減らす"
            disabled={!hasHydrated || selectedQuantity <= 1}
            onClick={() => changeQuantity(selectedQuantity - 1)}
            className="grid size-10 place-items-center rounded-full text-lg font-bold text-slate-800 transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            −
          </button>
          <output
            className="min-w-10 text-center font-bold text-slate-950"
            aria-live="polite"
          >
            {selectedQuantity}
          </output>
          <button
            type="button"
            aria-label="数量を1増やす"
            disabled={!hasHydrated || selectedQuantity >= remainingQuantity}
            onClick={() => changeQuantity(selectedQuantity + 1)}
            className="grid size-10 place-items-center rounded-full text-lg font-bold text-slate-800 transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            +
          </button>
        </div>
      </div>
      <p className="mt-2 text-right text-xs text-slate-500">
        {hasHydrated
          ? `カート内: ${cartQuantity}点 / 追加可能: ${remainingQuantity}点`
          : "カートを読み込んでいます…"}
      </p>
      <button
        type="button"
        disabled={!hasHydrated || selectedQuantity < 1}
        onClick={() => {
          const before =
            useCartStore.getState().items.find((item) => item.id === product.id)
              ?.quantity ?? 0;
          const available = Math.max(0, product.maxStock - before);
          if (!hasHydrated || available === 0 || selectedQuantity < 1) {
            setAdded(false);
            return;
          }
          addItem(product, Math.min(selectedQuantity, available));
          const after =
            useCartStore.getState().items.find((item) => item.id === product.id)
              ?.quantity ?? 0;
          setAdded(after > before);
        }}
        className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        {hasHydrated && remainingQuantity === 0
          ? "在庫上限に達しています"
          : "カートに追加"}
      </button>
      <div className="mt-3 min-h-6 text-sm" aria-live="polite">
        {added ? (
          <p className="font-bold text-emerald-700">
            カートに追加しました。{" "}
            <Link
              href="/cart"
              className="rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-violet-700"
            >
              カートを見る
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
