import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutContent } from "@/components/checkout-content";

export const metadata: Metadata = {
  title: "Demo Checkout | Liver Store Portfolio",
  description: "注文や決済を行わないポートフォリオデモの終点です。",
};

export default function CheckoutPage() {
  return (
    <main className="grid min-h-[65vh] place-items-center px-5 py-16 sm:px-8">
      <section className="w-full max-w-2xl rounded-[2rem] border border-violet-200 bg-white p-8 text-center shadow-xl shadow-violet-100/60 sm:p-14">
        <p className="text-xs font-bold tracking-[0.22em] text-violet-700 uppercase">
          Portfolio demo
        </p>
        <h1 className="mt-4 text-3xl font-black text-slate-950 sm:text-5xl">
          Demo Checkout
        </h1>
        <CheckoutContent />
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-slate-950 px-7 py-3 font-bold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700"
        >
          TOPへ戻る
        </Link>
      </section>
    </main>
  );
}
