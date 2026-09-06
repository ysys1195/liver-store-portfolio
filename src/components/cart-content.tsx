"use client";

import Link from "next/link";

import { ProductArtwork } from "@/components/product-artwork";
import { formatPrice } from "@/lib/product";
import { getCartSubtotal, useCartStore } from "@/stores/cart-store";
import { useCartHydration } from "@/stores/use-cart-hydration";

export function CartContent() {
  const hasHydrated = useCartHydration();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  if (!hasHydrated) {
    return (
      <p className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">
        カートを読み込んでいます…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center sm:p-16">
        <h2 className="text-2xl font-black text-slate-950">カートは空です</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          商品詳細からデモ商品を追加できます。
        </p>
        <Link
          href="/products"
          className="mt-7 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700"
        >
          商品を見る
        </Link>
      </section>
    );
  }

  const subtotal = getCartSubtotal(items);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <ul className="space-y-4" aria-label="カートの商品">
        {items.map((item) => (
          <li
            key={item.id}
            className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[9rem_1fr] sm:p-6"
          >
            <Link
              href={`/products/${item.slug}`}
              className="group block overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
            >
              <ProductArtwork
                category={item.category}
                name={item.name}
                imageUrl={item.imageUrl}
                sizes="(min-width: 640px) 144px, calc(100vw - 5rem)"
              />
            </Link>
            <div className="flex min-w-0 flex-col">
              <div>
                <Link
                  href={`/products/${item.slug}`}
                  className="rounded-sm text-lg font-black text-slate-950 hover:text-violet-800 focus-visible:outline-2 focus-visible:outline-violet-700"
                >
                  {item.name}
                </Link>
                <p className="mt-2 font-bold text-slate-700">
                  {formatPrice(item.price)}
                  <span className="ml-1 text-xs font-medium text-slate-500">
                    税込
                  </span>
                </p>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div
                    className="inline-flex items-center rounded-full border border-slate-300 p-1"
                    role="group"
                    aria-label={`${item.name}の数量`}
                  >
                    <button
                      type="button"
                      aria-label={`${item.name}の数量を1減らす`}
                      disabled={item.quantity <= 1}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="grid size-9 place-items-center rounded-full font-bold transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      −
                    </button>
                    <output
                      className="min-w-9 text-center font-bold"
                      aria-live="polite"
                    >
                      {item.quantity}
                    </output>
                    <button
                      type="button"
                      aria-label={`${item.name}の数量を1増やす`}
                      disabled={item.quantity >= item.maxStock}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="grid size-9 place-items-center rounded-full font-bold transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    在庫上限 {item.maxStock}点
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-md px-2 py-1 text-sm font-bold text-slate-500 underline underline-offset-4 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-700"
                >
                  削除
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="rounded-3xl bg-slate-950 p-6 text-white lg:sticky lg:top-28">
        <h2 className="text-xl font-black">ご注文内容</h2>
        <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-5">
          <span className="font-bold">小計</span>
          <strong className="text-2xl">{formatPrice(subtotal)}</strong>
        </div>
        <Link
          href="/checkout"
          className="mt-6 flex w-full justify-center rounded-xl bg-white px-5 py-3 font-bold text-slate-950 transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300"
        >
          Demo Checkoutへ
        </Link>
        <p className="mt-4 text-xs leading-5 text-slate-300">
          これは非公式ポートフォリオのデモです。実際の注文・決済は行われません。表示中の価格と在庫は注文時の確定値ではありません。
        </p>
      </aside>
    </div>
  );
}
