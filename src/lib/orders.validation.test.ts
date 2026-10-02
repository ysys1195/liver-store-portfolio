import { describe, expect, it } from "vitest";
import { orderRequestSchema } from "./orders";

const key = "F34728EE-0235-4A66-9CE4-E91755BDDF70";

describe("orderRequestSchema", () => {
  it("UUIDを正規化し、クライアントの金額をサーバー入力へ渡さない", () => {
    expect(
      orderRequestSchema.parse({
        idempotencyKey: key,
        totalAmount: 1,
        items: [{ productId: "p", quantity: 2, price: 1 }],
      }),
    ).toEqual({
      idempotencyKey: key.toLowerCase(),
      items: [{ productId: "p", quantity: 2 }],
    });
  });

  it.each(
    [
      [
        { productId: "p", quantity: 1 },
        { productId: "p", quantity: 1 },
      ],
      [{ productId: "p", quantity: 0 }],
      [{ productId: "p", quantity: 2_147_483_648 }],
      [{ productId: "", quantity: 1 }],
    ].map((items) => ({ items })),
  )("不正な明細を拒否する: $items", ({ items }) => {
    expect(
      orderRequestSchema.safeParse({ idempotencyKey: key, items }).success,
    ).toBe(false);
  });
});
