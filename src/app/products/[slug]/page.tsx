import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductArtwork } from "@/components/product-artwork";
import { ProductStatusBadge } from "@/components/product-status-badge";
import {
  categoryLabels,
  formatPrice,
  formatSaleDate,
  statusLabels,
} from "@/lib/product";
import { getProductBySlug } from "@/lib/server/storefront";

export const dynamic = "force-dynamic";
type ProductDetailPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product
      ? `${product.name} | Liver Store Portfolio`
      : "商品が見つかりません | Liver Store Portfolio",
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const isAvailable =
    product.status === "on_sale" || product.status === "low_stock";
  const availabilityText =
    product.status === "upcoming"
      ? `${formatSaleDate(product.salesStartAt)} 販売開始`
      : statusLabels[product.status];

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/products"
          className="inline-flex rounded-md text-sm font-bold text-slate-600 hover:text-violet-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700"
        >
          ← 商品一覧へ
        </Link>
        <article className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductArtwork
            category={product.category}
            name={product.name}
            imageUrl={product.imageUrl}
            priority
          />
          <div className="lg:py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold tracking-[0.16em] text-violet-700 uppercase">
                {categoryLabels[product.category]}
              </span>
              <ProductStatusBadge status={product.status} />
            </div>
            <h1 className="mt-5 text-3xl leading-tight font-black text-slate-950 sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-sm text-slate-500">
              {product.liverNames.join(" / ")}
            </p>
            <p className="mt-6 text-3xl font-black text-slate-950">
              {formatPrice(product.price)}
              <span className="ml-2 text-sm font-medium text-slate-500">
                税込
              </span>
            </p>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-slate-950">販売状況</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {availabilityText}
              </p>
              <button
                type="button"
                disabled
                className="mt-5 w-full cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-500"
              >
                {isAvailable ? "カートに追加（準備中）" : availabilityText}
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                現在は商品閲覧のみご利用いただけます。カート機能は準備中です。
              </p>
            </div>
          </div>
          <section
            className="border-t border-slate-200 pt-8 lg:col-span-2"
            aria-labelledby="description-title"
          >
            <h2
              id="description-title"
              className="text-2xl font-black text-slate-950"
            >
              商品説明
            </h2>
            <p className="mt-4 max-w-3xl leading-8 text-slate-600">
              {product.description ?? "デモ用商品の説明は準備中です。"}
            </p>
          </section>
          <section
            className="border-t border-slate-200 pt-8 lg:col-span-2"
            aria-labelledby="period-title"
          >
            <h2
              id="period-title"
              className="text-2xl font-black text-slate-950"
            >
              販売期間
            </h2>
            <dl className="mt-4 grid max-w-3xl gap-3 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="font-bold text-slate-800">販売開始</dt>
              <dd className="text-slate-600">
                {formatSaleDate(product.salesStartAt)}
              </dd>
              <dt className="font-bold text-slate-800">販売終了</dt>
              <dd className="text-slate-600">
                {product.salesEndAt
                  ? formatSaleDate(product.salesEndAt)
                  : "終了日時未定"}
              </dd>
            </dl>
          </section>
        </article>
      </div>
    </main>
  );
}
