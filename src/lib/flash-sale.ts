import { z } from "zod";
import { OrderError, postOrder, type OrderRequest } from "./orders";

export const DEMO_PRODUCT_ID = "yui-birthday-2026";
export const DEMO_STOCK = 5;
export const DEMO_REQUESTS = 20;
export const demoStateSchema = z.object({
  productId: z.literal(DEMO_PRODUCT_ID),
  stock: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  orderedQuantity: z.number().int().nonnegative(),
});
export type DemoState = z.infer<typeof demoStateSchema>;
const outcomeSchema = z.object({
  kind: z.enum(["created", "replayed", "conflict", "error", "unknown"]),
  orderId: z.string().optional(),
});
export type Outcome = z.infer<typeof outcomeSchema>;
export const runSchema = z.object({
  baseline: demoStateSchema,
  keys: z.array(z.uuid()).length(DEMO_REQUESTS),
  outcomes: z.array(outcomeSchema).length(DEMO_REQUESTS),
});
export type DemoRun = z.infer<typeof runSchema>;
export const DEMO_STORAGE_KEY = "flash-sale-run-v1";

export function makeRun(baseline: DemoState): DemoRun {
  const keys = Array.from({ length: 10 }, () => crypto.randomUUID());
  // Each of ten logical orders is sent twice. At stock 5 this guarantees
  // five replays when every response arrives, regardless of arrival order.
  return {
    baseline,
    keys: keys.flatMap((key) => [key, key]),
    outcomes: Array.from({ length: DEMO_REQUESTS }, () => ({
      kind: "unknown",
    })),
  };
}

export async function executeRun(
  run: DemoRun,
  send: (request: OrderRequest) => ReturnType<typeof postOrder> = postOrder,
): Promise<DemoRun> {
  const pending = run.outcomes.flatMap((outcome, index) =>
    outcome.kind === "unknown" ? [index] : [],
  );
  const settled = await Promise.allSettled(
    pending.map((index) =>
      send({
        idempotencyKey: run.keys[index],
        items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
      }),
    ),
  );
  const outcomes = [...run.outcomes];
  settled.forEach((result, index) => {
    let outcome: Outcome;
    if (result.status === "fulfilled") {
      outcome = {
        kind: result.value.replayed ? "replayed" : "created",
        orderId: result.value.orderId,
      };
    } else if (
      result.reason instanceof OrderError &&
      result.reason.status < 500
    ) {
      outcome = {
        kind: result.reason.code === "OUT_OF_STOCK" ? "conflict" : "error",
      };
    } else outcome = { kind: "unknown" };
    outcomes[pending[index]] = outcome;
  });
  return { ...run, outcomes };
}

export function summarizeRun(run: DemoRun, final?: DemoState) {
  const count = (kind: Outcome["kind"]) =>
    run.outcomes.filter((r) => r.kind === kind).length;
  const uniqueOrders = new Set(
    run.outcomes.flatMap((r) => (r.orderId ? [r.orderId] : [])),
  ).size;
  const actualOrders = final
    ? final.orderCount - run.baseline.orderCount
    : undefined;
  const quantity = final
    ? final.orderedQuantity - run.baseline.orderedQuantity
    : undefined;
  const consistent =
    final && count("unknown") === 0
      ? final.stock >= 0 &&
        actualOrders === uniqueOrders &&
        quantity === uniqueOrders &&
        final.stock + quantity === DEMO_STOCK
      : null;
  return {
    created: count("created"),
    replayed: count("replayed"),
    conflict: count("conflict"),
    errors: count("error"),
    unknown: count("unknown"),
    uniqueOrders,
    actualOrders,
    quantity,
    consistent,
  };
}

export class DemoApiError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 403
        ? "この環境ではデモを実行できません。ローカル専用DBと環境設定を確認してください。"
        : status === 404
          ? "デモ商品がありません。専用DBへseedを投入してください。"
          : "デモ情報を取得できませんでした。時間をおいて再試行してください。",
    );
  }
}
export async function fetchDemoState(reset = false): Promise<DemoState> {
  const response = await fetch(reset ? "/api/demo/reset" : "/api/demo/state", {
    method: reset ? "POST" : "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    ...(reset
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: DEMO_PRODUCT_ID }),
        }
      : {}),
  });
  if (!response.ok) throw new DemoApiError(response.status);
  return demoStateSchema.parse(await response.json());
}
