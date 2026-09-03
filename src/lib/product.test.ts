import { describe, expect, it } from "vitest";

import { formatPrice, getProductStatus } from "./product";

const now = new Date("2026-09-04T00:00:00.000Z");

describe("getProductStatus", () => {
  it.each([
    {
      name: "販売開始前",
      product: {
        stock: 10,
        salesStartAt: new Date("2026-09-05T00:00:00.000Z"),
        salesEndAt: null,
      },
      expected: "upcoming",
    },
    {
      name: "販売中",
      product: {
        stock: 10,
        salesStartAt: new Date("2026-09-01T00:00:00.000Z"),
        salesEndAt: null,
      },
      expected: "on_sale",
    },
    {
      name: "残りわずか",
      product: {
        stock: 5,
        salesStartAt: new Date("2026-09-01T00:00:00.000Z"),
        salesEndAt: null,
      },
      expected: "low_stock",
    },
    {
      name: "売り切れ",
      product: {
        stock: 0,
        salesStartAt: new Date("2026-09-01T00:00:00.000Z"),
        salesEndAt: null,
      },
      expected: "sold_out",
    },
    {
      name: "販売終了",
      product: {
        stock: 0,
        salesStartAt: new Date("2026-08-01T00:00:00.000Z"),
        salesEndAt: new Date("2026-09-01T00:00:00.000Z"),
      },
      expected: "ended",
    },
  ])("$nameを導出する", ({ product, expected }) => {
    expect(getProductStatus(product, now)).toBe(expected);
  });

  it("販売開始前は在庫切れより優先する", () => {
    expect(
      getProductStatus(
        {
          stock: 0,
          salesStartAt: new Date("2026-09-05T00:00:00.000Z"),
          salesEndAt: null,
        },
        now,
      ),
    ).toBe("upcoming");
  });
});

describe("formatPrice", () => {
  it("日本円として表示する", () => {
    expect(formatPrice(4500)).toBe("￥4,500");
  });
});
