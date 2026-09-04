import Link from "next/link";

import {
  categoryLabels,
  formatPrice,
  statusLabels,
  type StorefrontProduct,
} from "@/lib/product";

import { ProductArtwork } from "./product-artwork";
import { ProductStatusBadge } from "./product-status-badge";

export function ProductCard({ product }: { product: StorefrontProduct }) {
  return (
    <article className="group overflow-hidden border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-slate-200/60">
      <Link
        href={`/products/${product.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700"
        aria-label={`${product.name}、${statusLabels[product.status]}の商品詳細を見る`}
      >
        <ProductArtwork
          category={product.category}
          name={product.name}
          imageUrl={product.imageUrl}
          sizes="(min-width: 1280px) 411px, (min-width: 1024px) calc((100vw - 7rem) / 3), (min-width: 640px) calc((100vw - 5.5rem) / 2), calc(100vw - 2.5rem)"
        />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold tracking-[0.14em] text-violet-700 uppercase">
              {categoryLabels[product.category]}
            </span>
            <ProductStatusBadge status={product.status} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-950 group-hover:text-violet-800">
            {product.name}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {product.liverNames.join(" / ")}
          </p>
          <p className="mt-4 text-xl font-black text-slate-950">
            {formatPrice(product.price)}
            <span className="ml-1 text-xs font-medium text-slate-500">
              税込
            </span>
          </p>
        </div>
      </Link>
    </article>
  );
}
