import { afterEach, expect, it, vi } from "vitest";
import { ORDER_TIMEOUT_MS, OrderTimeoutError, postOrder } from "./orders";
const request = {
  idempotencyKey: "f34728ee-0235-4a66-9ce4-e91755bddf70",
  items: [{ productId: "p", quantity: 1 }],
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("times out a stalled request and aborts it", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal;
  vi.spyOn(globalThis, "fetch").mockImplementation((_url, options) => {
    signal = options!.signal as AbortSignal;
    return new Promise(() => {});
  });
  const pending = postOrder(request);
  const check = expect(pending).rejects.toBeInstanceOf(OrderTimeoutError);
  await vi.advanceTimersByTimeAsync(ORDER_TIMEOUT_MS);
  await check;
  expect(signal!.aborted).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("also bounds a stalled response body", async () => {
  vi.useFakeTimers();
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: () => new Promise(() => {}),
  } as Response);
  const check = expect(postOrder(request)).rejects.toBeInstanceOf(
    OrderTimeoutError,
  );
  await vi.advanceTimersByTimeAsync(ORDER_TIMEOUT_MS);
  await check;
});
it("clears the timeout after success", async () => {
  vi.useFakeTimers();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({ orderId: "o", status: "completed", totalAmount: 100 }),
    ),
  );
  await expect(postOrder(request)).resolves.toMatchObject({ orderId: "o" });
  expect(vi.getTimerCount()).toBe(0);
});
