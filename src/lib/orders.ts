import { z } from "zod";

export const orderRequestSchema = z.object({
  idempotencyKey: z.uuid().transform((key) => key.toLowerCase()),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(200),
        quantity: z.number().int().min(1).max(2147483647),
      }),
    )
    .min(1)
    .max(50)
    .refine(
      (items) =>
        new Set(items.map((item) => item.productId)).size === items.length,
    ),
});
export type OrderRequest = z.infer<typeof orderRequestSchema>;
export const orderResultSchema = z.object({
  orderId: z.string(),
  status: z.literal("completed"),
  totalAmount: z.number().int().nonnegative(),
  replayed: z.boolean().optional(),
});
export type OrderResult = z.infer<typeof orderResultSchema>;
export const orderMessages = {
  INVALID_REQUEST: "入力内容を確認してください。",
  PRODUCT_NOT_FOUND: "商品が見つかりません。",
  OUT_OF_STOCK: "在庫が不足しています。最新在庫を確認してください。",
  NOT_ON_SALE: "現在この商品は購入できません。",
  PURCHASE_LIMIT_EXCEEDED:
    "商品の購入上限を超えています。数量を変更してください。",
  IDEMPOTENCY_KEY_CONFLICT: "同じ注文キーで異なる内容は送信できません。",
  INTERNAL_ERROR:
    "注文結果を確認できませんでした。同じ内容・キーで再確認してください。",
} as const;
export type OrderErrorCode = keyof typeof orderMessages;
export class OrderError extends Error {
  constructor(
    public readonly code: OrderErrorCode,
    public readonly status: number,
  ) {
    super(orderMessages[code]);
  }
}
export const ORDER_TIMEOUT_MS = 15_000;
export class OrderTimeoutError extends Error {
  constructor() {
    super(
      "通信がタイムアウトしました。注文が完了している可能性があります。オンラインに戻して、同じ注文キーで結果を再確認してください。",
    );
  }
}

export async function postOrder(request: OrderRequest): Promise<OrderResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new OrderTimeoutError());
      controller.abort();
    }, ORDER_TIMEOUT_MS);
  });
  try {
    // Bound both response headers and body; a late response cannot update the UI.
    return await Promise.race([sendOrder(request, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function sendOrder(
  request: OrderRequest,
  signal: AbortSignal,
): Promise<OrderResult> {
  const response = await fetch("/api/orders", {
    signal,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code: OrderErrorCode = Object.hasOwn(orderMessages, body.code)
      ? body.code
      : "INTERNAL_ERROR";
    throw new OrderError(code, response.status);
  }
  return orderResultSchema.parse(await response.json());
}
