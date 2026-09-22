// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/flash-sale", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/flash-sale")>()),
  getDemoState: vi.fn(),
}));
import { getDemoState, DemoServerError } from "@/lib/server/flash-sale";
import { DEMO_PRODUCT_ID } from "@/lib/flash-sale";
import { GET } from "./route";
it("returns one uncached DB snapshot", async () => {
  const state = {
    productId: DEMO_PRODUCT_ID,
    stock: 0,
    orderCount: 5,
    orderedQuantity: 5,
  } as const;
  vi.mocked(getDemoState).mockResolvedValue(state);
  const response = await GET();
  expect(await response.json()).toEqual(state);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it.each([403, 404, 500])("returns safe error %s", async (status) => {
  vi.mocked(getDemoState).mockRejectedValue(
    status === 500 ? new Error("secret") : new DemoServerError(status),
  );
  const response = await GET();
  expect(response.status).toBe(status);
  expect(await response.text()).not.toContain("secret");
});
