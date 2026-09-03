"use client";

import { useState } from "react";

import {
  categoryLabels,
  productCategories,
  type ProductCategory,
  type StorefrontProduct,
} from "@/lib/product";

import { ProductCard } from "./product-card";

type Filter = "ALL" | ProductCategory;

export function ProductGrid({ products }: { products: StorefrontProduct[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const visibleProducts =
    filter === "ALL"
      ? products
      : products.filter((product) => product.category === filter);

  return (
    <>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="商品カテゴリで絞り込む"
      >
        {(["ALL", ...productCategories] as const).map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={filter === category}
            onClick={() => setFilter(category)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold tracking-[0.08em] text-slate-700 uppercase transition hover:border-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 aria-pressed:border-slate-950 aria-pressed:bg-slate-950 aria-pressed:text-white sm:px-5"
          >
            {category === "ALL" ? "All" : categoryLabels[category]}
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-500" aria-live="polite">
        {visibleProducts.length} 件の商品
      </p>
      {visibleProducts.length > 0 ? (
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          このカテゴリの商品はありません。
        </p>
      )}
    </>
  );
}
