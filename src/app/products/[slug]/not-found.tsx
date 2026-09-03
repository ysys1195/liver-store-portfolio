import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center px-5 py-16 text-center">
      <div>
        <p className="text-xs font-bold tracking-[0.2em] text-violet-700 uppercase">
          Product not found
        </p>
        <h1 className="mt-4 text-3xl font-black text-slate-950">
          商品が見つかりません
        </h1>
        <p className="mt-4 text-slate-600">
          URLをご確認いただくか、商品一覧からお探しください。
        </p>
        <Link
          href="/products"
          className="mt-8 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700"
        >
          商品一覧へ
        </Link>
      </div>
    </main>
  );
}
