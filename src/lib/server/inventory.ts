import "server-only";

import { getProductStatus, type ProductStatus } from "@/lib/product";

import { getPrisma } from "./prisma";

export type ProductInventory = {
  productId: string;
  stock: number;
  status: ProductStatus;
  updatedAt: string;
};

export class InventoryProductNotFoundError extends Error {
  constructor() {
    super("Product not found");
    this.name = "InventoryProductNotFoundError";
  }
}

export async function getProductInventory(
  productId: string,
  now = new Date(),
): Promise<ProductInventory> {
  const product = await getPrisma().product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      stock: true,
      salesStartAt: true,
      salesEndAt: true,
      updatedAt: true,
    },
  });

  if (!product) throw new InventoryProductNotFoundError();

  return {
    productId: product.id,
    stock: product.stock,
    status: getProductStatus(product, now),
    updatedAt: product.updatedAt.toISOString(),
  };
}
