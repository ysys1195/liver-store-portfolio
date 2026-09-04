import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700"
          aria-label="Liver Store トップへ"
        >
          <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white transition group-hover:bg-violet-700 sm:size-10">
            LS
          </span>
          <span>
            <span className="block text-sm font-black tracking-[0.16em] text-slate-950 sm:text-base">
              LIVER STORE
            </span>
            <span className="hidden text-[10px] font-semibold tracking-[0.18em] text-violet-700 uppercase sm:block">
              Unofficial demo
            </span>
          </span>
        </Link>
        <nav aria-label="メインナビゲーション">
          <Link
            href="/products"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-violet-700 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 sm:px-6"
          >
            Products
          </Link>
        </nav>
      </div>
    </header>
  );
}
