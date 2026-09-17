import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { OrderError, type OrderRequest, type OrderResult } from "@/lib/orders";
import { getPrisma } from "./prisma";

function canonical(items: Array<{ productId: string; quantity: number }>) {
  return JSON.stringify(
    items
      .map(({ productId, quantity }) => ({ productId, quantity }))
      .sort((a, b) =>
        a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
      ),
  );
}

export async function createOrder(
  request: OrderRequest,
  db: PrismaClient = getPrisma(),
): Promise<OrderResult> {
  return db.$transaction(
    async (tx) => {
      // Transaction-scoped lock works across processes and pooled connections.
      // Hash collisions only serialize unrelated keys; the unique PK is retained.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${request.idempotencyKey}, 0))::text`;
      const existing = await tx.idempotencyKey.findUnique({
        where: { key: request.idempotencyKey },
        include: { order: { include: { items: true } } },
      });
      if (existing) {
        if (canonical(existing.order.items) !== canonical(request.items))
          throw new OrderError("IDEMPOTENCY_KEY_CONFLICT", 409);
        return {
          orderId: existing.orderId,
          status: "completed",
          totalAmount: existing.order.totalAmount,
          replayed: true,
        };
      }
      const items = [];
      let totalAmount = 0;
      for (const item of [...request.items].sort((a, b) =>
        a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
      )) {
        // Lock in stable ID order, then read authoritative price/limits/period.
        const products = await tx.$queryRaw<
          Array<{
            id: string;
            name: string;
            price: number;
            purchaseLimit: number | null;
            salesStartAt: Date;
            salesEndAt: Date | null;
          }>
        >(Prisma.sql`
        SELECT id, name, price, purchase_limit AS "purchaseLimit", sales_start_at AS "salesStartAt", sales_end_at AS "salesEndAt"
        FROM products WHERE id = ${item.productId} FOR UPDATE`);
        const product = products[0];
        if (!product) throw new OrderError("PRODUCT_NOT_FOUND", 404);
        const now = new Date();
        if (
          now < product.salesStartAt ||
          (product.salesEndAt && now > product.salesEndAt)
        )
          throw new OrderError("NOT_ON_SALE", 409);
        if (
          product.purchaseLimit !== null &&
          item.quantity > product.purchaseLimit
        )
          throw new OrderError("PURCHASE_LIMIT_EXCEEDED", 409);
        const changed = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (changed.count !== 1) throw new OrderError("OUT_OF_STOCK", 409);
        const subtotal = product.price * item.quantity;
        totalAmount += subtotal;
        if (!Number.isSafeInteger(totalAmount) || totalAmount > 2147483647)
          throw new OrderError("INVALID_REQUEST", 400);
        items.push({
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: item.quantity,
          subtotal,
        });
      }
      const order = await tx.order.create({
        data: {
          status: "COMPLETED",
          totalAmount,
          items: { create: items },
          idempotencyKey: { create: { key: request.idempotencyKey } },
        },
      });
      return { orderId: order.id, status: "completed", totalAmount };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10000,
      timeout: 15000,
    },
  );
}
