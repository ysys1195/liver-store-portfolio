// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
vi.mock("server-only", () => ({}));
import { resetDemo, getDemoState } from "./flash-sale";
import { createOrder } from "./orders";
import {
  DEMO_PRODUCT_ID,
  executeRun,
  makeRun,
  summarizeRun,
} from "@/lib/flash-sale";
const url = process.env.FLASH_SALE_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (
    !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
    parsed.pathname !== "/issue9_test" ||
    [...parsed.searchParams.keys()].some((key) => key !== "schema")
  )
    throw new Error("Flash sale tests require isolated local issue9_test");
}
const db = url
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: url, max: 25 }),
    })
  : null;
const otherId = `issue9-${randomUUID()}`;
let created = false;
beforeAll(async () => {
  if (!db) return;
  vi.stubEnv("DATABASE_URL", url!);
  vi.stubEnv("ENABLE_FLASH_SALE_DEMO", "true");
  vi.stubEnv("VERCEL", "");
  // Refuse to replace existing data, even in this test-only database.
  await db.product.create({
    data: {
      id: DEMO_PRODUCT_ID,
      slug: DEMO_PRODUCT_ID,
      name: "Demo",
      stock: 2,
      price: 3000,
      category: "GOODS",
      salesStartAt: new Date(0),
    },
  });
  created = true;
  await db.product.create({
    data: {
      id: otherId,
      slug: otherId,
      name: "Unrelated",
      stock: 7,
      price: 1000,
      category: "GOODS",
      salesStartAt: new Date(0),
    },
  });
});
afterAll(async () => {
  if (!db) return;
  if (created) {
    const orders = await db.order.findMany({
      where: {
        items: { some: { productId: { in: [DEMO_PRODUCT_ID, otherId] } } },
      },
      select: { id: true },
    });
    const where = { orderId: { in: orders.map((o) => o.id) } };
    await db.idempotencyKey.deleteMany({ where });
    await db.orderItem.deleteMany({ where });
    await db.order.deleteMany({ where: { id: where.orderId } });
    await db.product.deleteMany({
      where: { id: { in: [DEMO_PRODUCT_ID, otherId] } },
    });
  }
  await db.$disconnect();
  vi.unstubAllEnvs();
});
describe.skipIf(!url)("flash sale on isolated PostgreSQL", () => {
  it("resets only demo product, retains all orders/keys, and uses DB price", async () => {
    const key = randomUUID();
    const request = {
      idempotencyKey: key,
      items: [
        { productId: DEMO_PRODUCT_ID, quantity: 1 },
        { productId: otherId, quantity: 1 },
      ],
    };
    const order = await createOrder(request, db!);
    const other = await db!.product.findUniqueOrThrow({
      where: { id: otherId },
    });
    await db!.product.update({
      where: { id: DEMO_PRODUCT_ID },
      data: { salesEndAt: new Date(0) },
    });
    expect(await resetDemo(db!)).toMatchObject({
      stock: 5,
      orderCount: 1,
      orderedQuantity: 1,
    });
    expect(
      await db!.product.findUniqueOrThrow({ where: { id: otherId } }),
    ).toEqual(other);
    expect(await createOrder(request, db!)).toMatchObject({
      orderId: order.orderId,
      replayed: true,
      totalAmount: 4000,
    });
    expect((await getDemoState(db!)).stock).toBe(5);
  });
  it("20 requests with paired keys create exactly 5 orders and pass DB consistency", async () => {
    const baseline = await resetDemo(db!);
    const run = await executeRun(makeRun(baseline), (request) =>
      createOrder(request, db!),
    );
    const final = await getDemoState(db!);
    expect(final.stock).toBe(0);
    expect(summarizeRun(run, final)).toMatchObject({
      created: 5,
      replayed: 5,
      conflict: 10,
      errors: 0,
      unknown: 0,
      uniqueOrders: 5,
      actualOrders: 5,
      quantity: 5,
      consistent: true,
    });
    const reset = await resetDemo(db!);
    expect(reset).toMatchObject({
      stock: 5,
      orderCount: final.orderCount,
      orderedQuantity: final.orderedQuantity,
    });
    expect(summarizeRun(run, reset).consistent).toBe(false);
  });
});
