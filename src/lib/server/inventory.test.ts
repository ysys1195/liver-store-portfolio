// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./prisma", () => ({ getPrisma: vi.fn() }));

import { getPrisma } from "./prisma";
import {
  getProductInventory,
  InventoryProductNotFoundError,
} from "./inventory";

const findUnique = vi.fn();

describe("getProductInventory", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReturnValue({
      product: { findUnique },
    } as never);
    findUnique.mockReset();
  });

  it("DB上の在庫と販売期間から最新状態を返す", async () => {
    findUnique.mockResolvedValue({
      id: "product-1",
      stock: 3,
      salesStartAt: new Date("2026-09-01T00:00:00.000Z"),
      salesEndAt: null,
      updatedAt: new Date("2026-09-04T00:00:00.000Z"),
    });

    await expect(
      getProductInventory("product-1", new Date("2026-09-02T00:00:00.000Z")),
    ).resolves.toEqual({
      productId: "product-1",
      stock: 3,
      status: "low_stock",
      updatedAt: "2026-09-04T00:00:00.000Z",
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "product-1" },
      select: {
        id: true,
        stock: true,
        salesStartAt: true,
        salesEndAt: true,
        updatedAt: true,
      },
    });
  });

  it("商品が存在しない場合は専用エラーを送出する", async () => {
    findUnique.mockResolvedValue(null);

    await expect(getProductInventory("missing")).rejects.toBeInstanceOf(
      InventoryProductNotFoundError,
    );
  });
});
