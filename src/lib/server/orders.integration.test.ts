// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
vi.mock("server-only", () => ({}));
import { createOrder } from "./orders";
import { orderRequestSchema } from "@/lib/orders";

const url = process.env.ORDER_TEST_DATABASE_URL;
// Explicit opt-in and loopback-only test database. Never use DATABASE_URL.
if (url) {
  const parsed = new URL(url);
  if (
    !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
    parsed.pathname !== "/issue8_test"
  )
    throw new Error(
      "Order tests require the isolated local issue8_test database",
    );
}
const db = url
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: url, max: 25 }),
    })
  : null;
const prefix = `issue8-${randomUUID()}`;
let serial = 0;
async function product(overrides = {}) {
  const id = `${prefix}-${serial++}`;
  return db!.product.create({
    data: {
      id,
      slug: id,
      name: "Test",
      price: 1234,
      stock: 5,
      category: "GOODS",
      salesStartAt: new Date(0),
      ...overrides,
    },
  });
}
const request = (id: string, quantity = 1) => ({
  idempotencyKey: randomUUID(),
  items: [{ productId: id, quantity }],
});
afterAll(async () => {
  if (!db) return;
  const orders = await db.order.findMany({
    where: { items: { some: { productId: { startsWith: prefix } } } },
    select: { id: true },
  });
  const ids = orders.map((o) => o.id);
  await db.idempotencyKey.deleteMany({ where: { orderId: { in: ids } } });
  await db.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await db.order.deleteMany({ where: { id: { in: ids } } });
  await db.product.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.$disconnect();
});
describe.skipIf(!url)("orders on isolated PostgreSQL", () => {
  it("20 concurrent requests cannot oversell stock 5", async () => {
    const p = await product();
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => createOrder(request(p.id), db!)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    const failures = results.filter((r) => r.status === "rejected");
    expect(failures).toHaveLength(15);
    for (const failure of failures)
      expect(failure.reason).toMatchObject({
        code: "OUT_OF_STOCK",
        status: 409,
      });
    expect(
      (await db!.product.findUniqueOrThrow({ where: { id: p.id } })).stock,
    ).toBe(0);
    expect(await db!.orderItem.count({ where: { productId: p.id } })).toBe(5);
  });
  it("concurrent identical keys create only one order, replay after sold out", async () => {
    const p = await product({ stock: 1 });
    const r = request(p.id);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => createOrder(r, db!)),
    );
    expect(new Set(results.map((o) => o.orderId)).size).toBe(1);
    expect(results.filter((o) => o.replayed)).toHaveLength(9);
    expect(await db!.orderItem.count({ where: { productId: p.id } })).toBe(1);
    await expect(
      createOrder({ ...r, items: [{ productId: p.id, quantity: 2 }] }, db!),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
  });
  it("DB price is authoritative and item order does not change replay identity", async () => {
    const a = await product();
    const b = await product();
    const r = orderRequestSchema.parse({
      idempotencyKey: randomUUID(),
      totalAmount: 1,
      items: [
        { productId: a.id, quantity: 2, price: 1 },
        { productId: b.id, quantity: 1 },
      ],
    });
    const result = await createOrder(r, db!);
    expect(result.totalAmount).toBe(3702);
    await db!.product.update({ where: { id: a.id }, data: { price: 9 } });
    expect(
      await createOrder({ ...r, items: [...r.items].reverse() }, db!),
    ).toMatchObject({
      orderId: result.orderId,
      totalAmount: 3702,
      replayed: true,
    });
    expect(
      await db!.orderItem.findFirst({
        where: { orderId: result.orderId, productId: a.id },
      }),
    ).toMatchObject({ unitPrice: 1234, subtotal: 2468 });
  });
  it("rolls back earlier deductions when a later item conflicts", async () => {
    const a = await product();
    const b = await product({ stock: 0 });
    const r = {
      ...request(a.id),
      items: [
        { productId: a.id, quantity: 1 },
        { productId: b.id, quantity: 1 },
      ],
    };
    await expect(createOrder(r, db!)).rejects.toMatchObject({ status: 409 });
    expect(
      (await db!.product.findUniqueOrThrow({ where: { id: a.id } })).stock,
    ).toBe(5);
    expect(
      await db!.idempotencyKey.findUnique({ where: { key: r.idempotencyKey } }),
    ).toBeNull();
  });
  it("rejects missing products, sale periods and DB purchase limits", async () => {
    await expect(
      createOrder(request(`${prefix}-missing`), db!),
    ).rejects.toMatchObject({ status: 404 });
    for (const overrides of [
      { salesStartAt: new Date("2099-01-01") },
      { salesEndAt: new Date(0) },
    ]) {
      const p = await product(overrides);
      await expect(createOrder(request(p.id), db!)).rejects.toMatchObject({
        code: "NOT_ON_SALE",
      });
    }
    const p = await product({ purchaseLimit: 1 });
    await expect(createOrder(request(p.id, 2), db!)).rejects.toMatchObject({
      code: "PURCHASE_LIMIT_EXCEEDED",
    });
    expect(
      (await db!.product.findUniqueOrThrow({ where: { id: p.id } })).stock,
    ).toBe(5);
  });
  it("rolls back an overflow and DB CHECK rejects negative stock", async () => {
    const p = await product({ price: 2147483647 });
    await expect(createOrder(request(p.id, 2), db!)).rejects.toMatchObject({
      code: "INVALID_REQUEST",
    });
    expect(
      (await db!.product.findUniqueOrThrow({ where: { id: p.id } })).stock,
    ).toBe(5);
    await expect(
      db!.product.update({ where: { id: p.id }, data: { stock: -1 } }),
    ).rejects.toThrow();
  });
});
