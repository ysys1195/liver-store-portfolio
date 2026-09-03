import "server-only";

import {
  getProductStatus,
  type ProductCategory,
  type StorefrontProduct,
} from "@/lib/product";

import { getPrisma } from "./prisma";

const storefrontProductSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  price: true,
  stock: true,
  category: true,
  salesStartAt: true,
  salesEndAt: true,
  productLivers: {
    select: { liver: { select: { name: true } } },
  },
} as const;

type StorefrontRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: ProductCategory;
  salesStartAt: Date;
  salesEndAt: Date | null;
  productLivers: { liver: { name: string } }[];
};

function toStorefrontProduct(
  product: StorefrontRow,
  now: Date,
): StorefrontProduct {
  const { productLivers, ...values } = product;

  return {
    ...values,
    salesStartAt: product.salesStartAt.toISOString(),
    salesEndAt: product.salesEndAt?.toISOString() ?? null,
    status: getProductStatus(product, now),
    liverNames: productLivers.map(({ liver }) => liver.name),
  };
}

export async function getProducts(now = new Date()) {
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    orderBy: [{ salesStartAt: "desc" }, { name: "asc" }],
    select: storefrontProductSelect,
  });

  return products.map((product) => toStorefrontProduct(product, now));
}

export async function getProductBySlug(slug: string, now = new Date()) {
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { slug },
    select: storefrontProductSelect,
  });

  return product ? toStorefrontProduct(product, now) : null;
}

export async function getFeaturedLiver() {
  return getPrisma().liver.findUnique({
    where: { slug: "yokaze-yui" },
    select: { name: true, description: true },
  });
}
