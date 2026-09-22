import { expect, it, vi } from "vitest";
import {
  type DemoState,
  DEMO_PRODUCT_ID,
  executeRun,
  makeRun,
  summarizeRun,
} from "./flash-sale";
import { type OrderRequest, OrderError } from "./orders";
const baseline: DemoState = {
  productId: DEMO_PRODUCT_ID,
  stock: 5,
  orderCount: 12,
  orderedQuantity: 17,
};
it("dispatches all 20 requests concurrently with ten paired keys and quantity 1", async () => {
  const run = makeRun(baseline);
  const releases: Array<() => void> = [];
  const send = vi.fn(
    (request: OrderRequest) =>
      new Promise<never>((_, reject) =>
        releases.push(() => {
          expect(request.items[0].quantity).toBe(1);
          reject(new OrderError("OUT_OF_STOCK", 409));
        }),
      ),
  );
  const pending = executeRun(run, send);
  expect(send).toHaveBeenCalledTimes(20);
  expect(new Set(run.keys).size).toBe(10);
  expect(
    send.mock.calls.every(
      ([request]) =>
        request.items[0].productId === DEMO_PRODUCT_ID &&
        request.items[0].quantity === 1,
    ),
  ).toBe(true);
  releases.forEach((release) => release());
  expect(summarizeRun(await pending).conflict).toBe(20);
});
it("counts created, replay, stock conflict, other 409 and unknown separately", async () => {
  let index = 0;
  const completed = await executeRun(makeRun(baseline), async () => {
    const i = index++;
    if (i < 5)
      return { orderId: `o${i}`, status: "completed", totalAmount: 3000 };
    if (i < 10)
      return {
        orderId: `o${i - 5}`,
        status: "completed",
        totalAmount: 3000,
        replayed: true,
      };
    if (i === 18) throw new OrderError("NOT_ON_SALE", 409);
    if (i === 19) throw new Error("network");
    throw new OrderError("OUT_OF_STOCK", 409);
  });
  expect(
    summarizeRun(completed, {
      ...baseline,
      stock: 0,
      orderCount: 17,
      orderedQuantity: 22,
    }),
  ).toMatchObject({
    created: 5,
    replayed: 5,
    conflict: 8,
    errors: 1,
    unknown: 1,
    uniqueOrders: 5,
    consistent: null,
  });
  const send = vi.fn(async () => ({
    orderId: "o0",
    status: "completed" as const,
    totalAmount: 3000,
    replayed: true,
  }));
  const confirmed = await executeRun(completed, send);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith({
    idempotencyKey: completed.keys[19],
    items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
  });
  const final = { ...baseline, stock: 0, orderCount: 17, orderedQuantity: 22 };
  expect(summarizeRun(confirmed, final).consistent).toBe(true);
  expect(summarizeRun(confirmed, { ...final, stock: 1 }).consistent).toBe(
    false,
  );
  expect(summarizeRun(confirmed, { ...final, orderCount: 18 }).consistent).toBe(
    false,
  );
  expect(summarizeRun(confirmed).consistent).toBeNull();
});
