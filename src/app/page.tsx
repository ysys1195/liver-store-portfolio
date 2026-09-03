import Link from "next/link";

import { DisclaimerModal } from "@/components/disclaimer-modal";
import { ProductArtwork } from "@/components/product-artwork";
import { ProductCard } from "@/components/product-card";
import { ProductStatusBadge } from "@/components/product-status-badge";
import { formatPrice } from "@/lib/product";
import { getFeaturedLiver, getProducts } from "@/lib/server/storefront";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, liver] = await Promise.all([
    getProducts(),
    getFeaturedLiver(),
  ]);
  const heroProduct =
    products.find((product) => product.slug === "yui-midnight-voice") ??
    products[0];
  const newItems = products.slice(0, 3);

  return (
    <>
      <DisclaimerModal />
      <main>
        {heroProduct ? (
          <section className="overflow-hidden bg-slate-950 text-white">
            <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
              <div className="order-2 lg:order-1">
                <p className="text-xs font-bold tracking-[0.24em] text-violet-300 uppercase">
                  New release · {heroProduct.liverNames.join(" / ")}
                </p>
                <h1 className="mt-5 max-w-2xl text-4xl leading-tight font-black tracking-tight sm:text-6xl lg:text-7xl">
                  Midnight,
                  <br />
                  made memorable.
                </h1>
                <p className="mt-6 text-xl font-bold text-white sm:text-2xl">
                  {heroProduct.name}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <ProductStatusBadge status={heroProduct.status} />
                  <span className="text-xl font-black">
                    {formatPrice(heroProduct.price)}
                  </span>
                </div>
                <p className="mt-6 max-w-xl leading-7 text-slate-300">
                  夜更けのひとときを彩る、架空ライバーのデモ商品です。このストアでは実際の購入・決済は行われません。
                </p>
                <Link
                  href={`/products/${heroProduct.slug}`}
                  className="mt-8 inline-flex rounded-full bg-white px-7 py-3 font-bold text-slate-950 transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300"
                >
                  商品を見る
                  <span aria-hidden="true" className="ml-2">
                    →
                  </span>
                </Link>
              </div>
              <div className="order-1 overflow-hidden rounded-[2rem] border border-white/20 shadow-2xl shadow-violet-950/50 lg:order-2">
                <ProductArtwork
                  category={heroProduct.category}
                  name={heroProduct.name}
                  priority
                />
              </div>
            </div>
          </section>
        ) : null}

        <section
          className="px-5 py-16 sm:px-8 sm:py-24"
          aria-labelledby="new-items-title"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-bold tracking-[0.22em] text-violet-700 uppercase">
                  Discover
                </p>
                <h2
                  id="new-items-title"
                  className="mt-3 text-3xl font-black text-slate-950 sm:text-5xl"
                >
                  New Items
                </h2>
              </div>
              <Link
                href="/products"
                className="hidden rounded-md font-bold text-violet-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 sm:block"
              >
                商品をすべて見る →
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {newItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Link
              href="/products"
              className="mt-8 inline-flex rounded-full border border-slate-400 px-6 py-3 font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 sm:hidden"
            >
              商品をすべて見る →
            </Link>
          </div>
        </section>

        {liver ? (
          <section
            className="bg-violet-100 px-5 py-16 sm:px-8 sm:py-24"
            aria-labelledby="liver-title"
          >
            <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
              <div
                role="img"
                aria-label={`${liver.name}のデモ用プロフィール画像`}
                className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-full bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-600"
              >
                <div className="absolute top-[18%] left-[20%] size-[60%] rounded-full border border-white/30" />
                <div className="absolute inset-0 grid place-items-center text-7xl font-black text-white/90 sm:text-8xl">
                  Y
                </div>
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.22em] text-violet-800 uppercase">
                  About Liver
                </p>
                <h2
                  id="liver-title"
                  className="mt-4 text-4xl font-black text-slate-950 sm:text-6xl"
                >
                  {liver.name}
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
                  {liver.description}
                </p>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
                  本ページの人物・設定・商品はポートフォリオのために制作した架空のデモです。
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
