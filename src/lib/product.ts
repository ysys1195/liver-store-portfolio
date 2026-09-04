export const productCategories = ["VOICE", "GOODS", "SET"] as const;

export type ProductCategory = (typeof productCategories)[number];
export type ProductStatus =
  "upcoming" | "on_sale" | "low_stock" | "sold_out" | "ended";

export type StorefrontProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: ProductCategory;
  imageUrl: string | null;
  salesStartAt: string;
  salesEndAt: string | null;
  status: ProductStatus;
  liverNames: string[];
};

export const categoryLabels: Record<ProductCategory, string> = {
  VOICE: "Voice",
  GOODS: "Goods",
  SET: "Set",
};

export const statusLabels: Record<ProductStatus, string> = {
  upcoming: "COMING SOON",
  on_sale: "販売中",
  low_stock: "残りわずか",
  sold_out: "SOLD OUT",
  ended: "販売終了",
};

const LOW_STOCK_THRESHOLD = 5;

export function getProductStatus(
  product: {
    stock: number;
    salesStartAt: Date;
    salesEndAt: Date | null;
  },
  now = new Date(),
): ProductStatus {
  if (now < product.salesStartAt) return "upcoming";
  if (product.salesEndAt && now > product.salesEndAt) return "ended";
  if (product.stock === 0) return "sold_out";
  if (product.stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "on_sale";
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatSaleDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
