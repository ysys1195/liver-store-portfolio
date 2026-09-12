// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/server/orders", () => ({ createOrder: vi.fn() }));
import { createOrder } from "@/lib/server/orders";
import { OrderError } from "@/lib/orders";
import { POST } from "./route";
const body = {
  idempotencyKey: "f34728ee-0235-4a66-9ce4-e91755bddf70",
  items: [{ productId: "p", quantity: 1 }],
};
const send = (value: unknown) =>
  POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify(value),
    }),
  );
beforeEach(() => {
  vi.mocked(createOrder).mockReset();
});
it.each([
  {},
  { ...body, idempotencyKey: "bad" },
  { ...body, items: [] },
  { ...body, items: [{ productId: "p", quantity: 0 }] },
  { ...body, items: [{ productId: "p", quantity: 1.5 }] },
  { ...body, items: [...body.items, ...body.items] },
])("rejects invalid input before DB access", async (value) => {
  expect((await send(value)).status).toBe(400);
  expect(createOrder).not.toHaveBeenCalled();
});
it("rejects malformed JSON", async () => {
  expect(
    (await POST(new Request("http://localhost", { method: "POST", body: "{" })))
      .status,
  ).toBe(400);
});
it("strips forged prices and returns 201 / 200 with no-store", async () => {
  const result = {
    orderId: "o",
    status: "completed" as const,
    totalAmount: 1234,
  };
  vi.mocked(createOrder).mockResolvedValue(result);
  const response = await send({
    ...body,
    totalAmount: 1,
    items: [{ ...body.items[0], price: 1 }],
  });
  expect(createOrder).toHaveBeenCalledWith(body);
  expect(response.status).toBe(201);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  vi.mocked(createOrder).mockResolvedValue({ ...result, replayed: true });
  expect((await send(body)).status).toBe(200);
});
it.each([
  "OUT_OF_STOCK",
  "NOT_ON_SALE",
  "PURCHASE_LIMIT_EXCEEDED",
  "IDEMPOTENCY_KEY_CONFLICT",
] as const)("maps %s to 409", async (code) => {
  vi.mocked(createOrder).mockRejectedValue(new OrderError(code, 409));
  const res = await send(body);
  expect(res.status).toBe(409);
  expect(await res.json()).toMatchObject({ code });
});
it("does not expose internal errors", async () => {
  vi.mocked(createOrder).mockRejectedValue(
    new Error("postgresql://secret stack trace"),
  );
  const res = await send(body);
  expect(res.status).toBe(500);
  expect(await res.text()).not.toMatch(/secret|stack|postgresql/);
});
