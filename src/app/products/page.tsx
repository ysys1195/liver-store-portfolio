import type { Metadata } from "next";

import { ProductGrid } from "@/components/product-grid";
import { getProducts } from "@/lib/server/storefront";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Products | Liver Store Portfolio",
  description: "架空ライバーのデモ商品一覧です。",
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="px-5 py-12 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold tracking-[0.22em] text-violet-700 uppercase">
          Demo collection
        </p>
        <h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-6xl">
          Products
        </h1>
        <p className="mt-5 max-w-2xl leading-7 text-slate-600">
          架空ライバーのデモ商品です。販売状態ごとの表示とカテゴリ絞り込みを確認できます。実際の販売・注文・決済は行いません。
        </p>
        <div className="mt-10 sm:mt-14">
          <ProductGrid products={products} />
        </div>
      </div>
    </main>
  );
}
