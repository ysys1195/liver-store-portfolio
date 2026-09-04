// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/inventory", () => ({
  getProductInventory: vi.fn(),
  InventoryProductNotFoundError: class extends Error {},
}));

import {
  getProductInventory,
  InventoryProductNotFoundError,
} from "@/lib/server/inventory";

import { GET } from "./route";

describe("GET /api/products/:productId/inventory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("最新の在庫情報をno-storeで返す", async () => {
    vi.mocked(getProductInventory).mockResolvedValue({
      productId: "product-1",
      stock: 8,
      status: "on_sale",
      updatedAt: "2026-09-04T00:00:00.000Z",
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ productId: "product-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      productId: "product-1",
      stock: 8,
      status: "on_sale",
      updatedAt: "2026-09-04T00:00:00.000Z",
    });
  });

  it("商品がない場合は安全な404を返す", async () => {
    vi.mocked(getProductInventory).mockRejectedValue(
      new InventoryProductNotFoundError(),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ productId: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "PRODUCT_NOT_FOUND",
      message: "商品が見つかりません。",
    });
  });

  it("内部エラーの詳細を含めず500を返す", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(getProductInventory).mockRejectedValue(
      new Error("postgresql://secret@database/internal"),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ productId: "product-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      code: "INTERNAL_ERROR",
      message:
        "在庫情報を取得できませんでした。時間をおいて再度お試しください。",
    });
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
