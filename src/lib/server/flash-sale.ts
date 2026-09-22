import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { DEMO_PRODUCT_ID, DEMO_STOCK, type DemoState } from "@/lib/flash-sale";
import { getPrisma } from "./prisma";

export function isDemoEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.ENABLE_FLASH_SALE_DEMO !== "true" ||
    env.NODE_ENV === "production" ||
    env.VERCEL
  )
    return false;
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      ["/liver_store_demo", "/issue9_test"].includes(url.pathname) &&
      // libpq query parameters must not override the allowlisted connection.
      [...url.searchParams.keys()].every((key) => key === "schema")
    );
  } catch {
    return false;
  }
}
export class DemoServerError extends Error {
  constructor(public readonly status: number) {
    super("Demo unavailable");
  }
}
export function requireDemoEnabled() {
  if (!isDemoEnabled()) throw new DemoServerError(403);
}
async function readState(tx: Prisma.TransactionClient): Promise<DemoState> {
  const product = await tx.product.findUnique({
    where: { id: DEMO_PRODUCT_ID },
    select: { stock: true },
  });
  if (!product) throw new DemoServerError(404);
  const orderCount = await tx.order.count({
    where: { items: { some: { productId: DEMO_PRODUCT_ID } } },
  });
  const quantity = await tx.orderItem.aggregate({
    where: { productId: DEMO_PRODUCT_ID },
    _sum: { quantity: true },
  });
  return {
    productId: DEMO_PRODUCT_ID,
    stock: product.stock,
    orderCount,
    orderedQuantity: quantity._sum.quantity ?? 0,
  };
}
export async function getDemoState(db?: PrismaClient) {
  requireDemoEnabled();
  return (db ?? getPrisma()).$transaction(readState, {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
  });
}
export async function resetDemo(db?: PrismaClient) {
  requireDemoEnabled();
  return (db ?? getPrisma()).$transaction(async (tx) => {
    // Same product row lock as createOrder: baseline includes all orders that
    // committed before reset, and no order can decrement during this snapshot.
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM products WHERE id = ${DEMO_PRODUCT_ID} FOR UPDATE`;
    if (!rows.length) throw new DemoServerError(404);
    await tx.product.update({
      where: { id: DEMO_PRODUCT_ID },
      data: {
        stock: DEMO_STOCK,
        salesStartAt: new Date(0),
        salesEndAt: null,
      },
    });
    return readState(tx);
  });
}
export function demoErrorResponse(error: unknown) {
  const status = error instanceof DemoServerError ? error.status : 500;
  return Response.json(
    {
      code:
        status === 403
          ? "DEMO_DISABLED"
          : status === 404
            ? "PRODUCT_NOT_FOUND"
            : "INTERNAL_ERROR",
      message:
        "デモを利用できませんでした。環境設定を確認して再試行してください。",
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
