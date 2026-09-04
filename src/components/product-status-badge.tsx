import { statusLabels, type ProductStatus } from "@/lib/product";

const styles: Record<ProductStatus, string> = {
  on_sale: "bg-emerald-100 text-emerald-800",
  low_stock: "bg-amber-100 text-amber-900",
  sold_out: "bg-slate-900 text-white",
  upcoming: "bg-violet-100 text-violet-800",
  ended: "bg-slate-200 text-slate-700",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black tracking-[0.08em] ${styles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
