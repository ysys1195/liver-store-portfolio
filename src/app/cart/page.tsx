import type { Metadata } from "next";

import { CartContent } from "@/components/cart-content";

export const metadata: Metadata = {
  title: "Cart | Liver Store Portfolio",
  description: "非公式ポートフォリオデモのカートです。",
};

export default function CartPage() {
  return (
    <main className="px-5 py-12 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold tracking-[0.22em] text-violet-700 uppercase">
          Demo cart
        </p>
        <h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-6xl">
          Cart
        </h1>
        <p className="mt-5 max-w-2xl leading-7 text-slate-600">
          商品と数量はこのブラウザに保存されます。実際の注文・決済は発生しません。
        </p>
        <div className="mt-10 sm:mt-14">
          <CartContent />
        </div>
      </div>
    </main>
  );
}
