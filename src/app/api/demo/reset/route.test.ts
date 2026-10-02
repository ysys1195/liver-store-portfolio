// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/flash-sale", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/flash-sale")>()),
  resetDemo: vi.fn(),
}));
import { resetDemo } from "@/lib/server/flash-sale";
import { DEMO_PRODUCT_ID } from "@/lib/flash-sale";
import { POST } from "./route";
const body = { productId: DEMO_PRODUCT_ID } as const;
function send(
  value: unknown = body,
  origin: string | null = "http://localhost",
  type = "application/json",
) {
  return POST(
    new Request("http://localhost/api/demo/reset", {
      method: "POST",
      headers: {
        Host: "localhost",
        ...(origin ? { Origin: origin } : {}),
        "Content-Type": type,
      },
      body: JSON.stringify(value),
    }),
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("ENABLE_FLASH_SALE_DEMO", "true");
  vi.stubEnv("DATABASE_URL", "postgresql://local:local@localhost/issue9_test");
});
it.each([
  {},
  { productId: "unrelated" },
  { ...body, stock: 999 },
  { ...body, price: 0 },
])("rejects invalid or expanded reset scope", async (value) => {
  expect((await send(value)).status).toBe(400);
  expect(resetDemo).not.toHaveBeenCalled();
});
it.each(["https://attacker.example", null])(
  "rejects foreign or missing origin",
  async (origin) => {
    expect((await send(body, origin)).status).toBe(403);
    expect(resetDemo).not.toHaveBeenCalled();
  },
);
it("requires JSON and rejects malformed JSON", async () => {
  expect((await send(body, "http://localhost", "text/plain")).status).toBe(403);
  expect(
    (
      await POST(
        new Request("http://localhost/api/demo/reset", {
          method: "POST",
          headers: {
            Host: "localhost",
            Origin: "http://localhost",
            "Content-Type": "application/json",
          },
          body: "{",
        }),
      )
    ).status,
  ).toBe(400);
});
it("blocks production before DB access even with opt-in", async () => {
  vi.stubEnv("NODE_ENV", "production");
  expect((await send()).status).toBe(403);
  expect(resetDemo).not.toHaveBeenCalled();
});
it("returns baseline with no-store and hides internal failures", async () => {
  vi.mocked(resetDemo).mockResolvedValue({
    ...body,
    stock: 5,
    orderCount: 10,
    orderedQuantity: 10,
  });
  const response = await send();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(await response.json()).toMatchObject({ stock: 5, orderCount: 10 });
  vi.mocked(resetDemo).mockRejectedValue(new Error("postgresql://secret"));
  const error = await send();
  expect(error.status).toBe(500);
  expect(await error.text()).not.toContain("secret");
});

it("accepts a loopback Host/Origin when Next normalizes its internal URL", async () => {
  vi.mocked(resetDemo).mockResolvedValue({
    productId: DEMO_PRODUCT_ID,
    stock: 5,
    orderCount: 0,
    orderedQuantity: 0,
  });
  const request = new Request("http://localhost:3099/api/demo/reset", {
    method: "POST",
    headers: {
      Host: "127.0.0.1:3099",
      Origin: "http://127.0.0.1:3099",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  expect((await POST(request)).status).toBe(200);
});
it.each([
  ["attacker.example", "http://attacker.example"],
  ["localhost:3099", "http://localhost:4000"],
  ["localhost", "https://localhost"],
])("rejects nonlocal host, wrong port or protocol", async (host, origin) => {
  const request = new Request("http://localhost/api/demo/reset", {
    method: "POST",
    headers: { Host: host, Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  expect((await POST(request)).status).toBe(403);
  expect(resetDemo).not.toHaveBeenCalled();
});
