import Image from "next/image";

import type { ProductCategory } from "@/lib/product";

const styles: Record<ProductCategory, string> = {
  VOICE: "from-fuchsia-200 via-violet-200 to-indigo-300",
  GOODS: "from-amber-100 via-orange-200 to-rose-300",
  SET: "from-cyan-100 via-sky-200 to-violet-300",
};

export function ProductArtwork({
  category,
  name,
  imageUrl,
  priority = false,
}: {
  category: ProductCategory;
  name: string;
  imageUrl?: string | null;
  priority?: boolean;
}) {
  if (imageUrl) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-violet-50 to-slate-100">
        <Image
          src={imageUrl}
          alt={`${name}の商品画像`}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
          className="object-contain p-4 sm:p-6"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name}のデモ用プレースホルダー画像`}
      data-priority={priority || undefined}
      className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${styles[category]}`}
    >
      <div className="absolute -top-[18%] -right-[10%] size-[65%] rounded-full border-[18px] border-white/35" />
      <div className="absolute -bottom-[28%] -left-[10%] size-[70%] rounded-full bg-slate-950/10" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid size-24 place-items-center rounded-full border border-white/70 bg-white/55 shadow-xl shadow-slate-800/10 backdrop-blur-sm sm:size-32">
          <span className="text-center text-xs font-black tracking-[0.22em] text-slate-900 uppercase sm:text-sm">
            Demo
            <br />
            {category}
          </span>
        </div>
      </div>
    </div>
  );
}
