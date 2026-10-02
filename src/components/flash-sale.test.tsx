import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEMO_PRODUCT_ID, DEMO_STORAGE_KEY } from "@/lib/flash-sale";
import { FlashSale } from "./flash-sale";
const baseline = {
  productId: DEMO_PRODUCT_ID,
  stock: 5,
  orderCount: 7,
  orderedQuantity: 9,
};
const final = { ...baseline, stock: 0, orderCount: 12, orderedQuantity: 14 };
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
let requests: Array<{ idempotencyKey: string }>;
let seen: Map<string, string>;
let failOrders: boolean;
let failState: boolean;
beforeEach(() => {
  sessionStorage.clear();
  requests = [];
  seen = new Map();
  failOrders = false;
  failState = false;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
    if (url === "/api/demo/reset") return response(baseline);
    if (url === "/api/demo/state") {
      if (failState) return response({}, 500);
      return response(final);
    }
    const request = JSON.parse(options!.body as string);
    requests.push(request);
    expect(sessionStorage.getItem(DEMO_STORAGE_KEY)).toContain(
      request.idempotencyKey,
    );
    if (failOrders) throw new Error("network");
    const existing = seen.get(request.idempotencyKey);
    if (existing)
      return response({
        orderId: existing,
        status: "completed",
        totalAmount: 3000,
        replayed: true,
      });
    if (seen.size >= 5) return response({ code: "OUT_OF_STOCK" }, 409);
    const orderId = `order-${seen.size}`;
    seen.set(request.idempotencyKey, orderId);
    return response({ orderId, status: "completed", totalAmount: 3000 }, 201);
  });
});
afterEach(() => vi.restoreAllMocks());
function mount(
  client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } }),
) {
  return render(
    <QueryClientProvider client={client}>
      <FlashSale />
    </QueryClientProvider>,
  );
}
async function reset() {
  fireEvent.click(
    await screen.findByRole("button", { name: "在庫を5にリセット" }),
  );
  await screen.findByText("リセット完了。在庫5点から実行できます。");
}
it("requires reset, prevents double submission and verifies final DB state", async () => {
  mount();
  expect(screen.getByRole("button", { name: "20件を並行送信" })).toBeDisabled();
  await reset();
  const run = screen.getByRole("button", { name: "20件を並行送信" });
  fireEvent.click(run);
  fireEvent.click(run);
  await screen.findByText("整合性検証：一致");
  expect(requests).toHaveLength(20);
  expect(new Set(requests.map((r) => r.idempotencyKey)).size).toBe(10);
  expect(screen.getByText(/初期在庫5 = 残在庫0/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "20件を並行送信" })).toBeDisabled();
});
it("keeps keys across reload, blocks reset while unknown, retries only manually", async () => {
  failOrders = true;
  const view = mount();
  await reset();
  fireEvent.click(screen.getByRole("button", { name: "20件を並行送信" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "結果不明の注文を同じキーで再確認" }),
    ).toBeEnabled(),
  );
  const keys = requests.map((r) => r.idempotencyKey);
  expect(
    screen.getByRole("button", { name: "在庫を5にリセット" }),
  ).toBeDisabled();
  view.unmount();
  mount();
  await screen.findByRole("button", {
    name: "結果不明の注文を同じキーで再確認",
  });
  expect(requests).toHaveLength(20);
  failOrders = false;
  fireEvent.click(
    screen.getByRole("button", { name: "結果不明の注文を同じキーで再確認" }),
  );
  await screen.findByText("整合性検証：一致");
  expect(requests.slice(20).map((r) => r.idempotencyKey)).toEqual(keys);
});
it("does not show stale success after final-state failure and allows GET retry", async () => {
  mount();
  await reset();
  fireEvent.click(screen.getByRole("button", { name: "20件を並行送信" }));
  await screen.findByText("整合性検証：一致");
  failState = true;
  fireEvent.click(
    screen.getByRole("button", { name: "最終在庫・注文数を再取得" }),
  );
  await screen.findByText(
    "最終在庫・注文数を取得できませんでした。古い値で成功判定は行いません。",
  );
  expect(screen.getByText("整合性検証：未確認")).toBeInTheDocument();
  failState = false;
  fireEvent.click(
    screen.getByRole("button", { name: "最終在庫・注文数を再取得" }),
  );
  await screen.findByText("整合性検証：一致");
  expect(requests).toHaveLength(20);
});
it("blocks mutations if saved run is corrupt", async () => {
  sessionStorage.setItem(DEMO_STORAGE_KEY, "invalid");
  mount();
  await screen.findByRole("alert");
  expect(
    screen.getByRole("button", { name: "在庫を5にリセット" }),
  ).toBeDisabled();
  expect(fetch).not.toHaveBeenCalled();
});
it("disables both actions during a pending reset and permits retry after failure", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((_, r) => {
        reject = r;
      }),
  );
  mount();
  fireEvent.click(screen.getByRole("button", { name: "在庫を5にリセット" }));
  await screen.findByRole("button", { name: "リセット中…" });
  expect(screen.getByRole("button", { name: "リセット中…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "20件を並行送信" })).toBeDisabled();
  await act(async () => reject(new Error("offline")));
  await screen.findByRole("alert");
  await reset();
});

function orderResponse(index: number) {
  if (index >= 10) return response({ code: "OUT_OF_STOCK" }, 409);
  return response({
    orderId: `o${Math.floor(index / 2)}`,
    status: "completed",
    totalAmount: 3000,
    replayed: index % 2 === 1,
  });
}
it("late response from an unmounted run must not overwrite the new run's retry keys", async () => {
  const releases: Array<() => void> = [];
  let posts = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    if (url === "/api/demo/reset") return response(baseline);
    if (url === "/api/demo/state") return response(final);
    const i = posts++;
    if (i < 20)
      return new Promise<Response>((resolve) =>
        releases.push(() => resolve(orderResponse(i))),
      );
    if (i < 40) return orderResponse(i - 20);
    throw new Error("New run response lost");
  });
  const first = mount();
  await reset();
  fireEvent.click(screen.getByRole("button", { name: "20件を並行送信" }));
  await waitFor(() => expect(posts).toBe(20));
  first.unmount();
  const second = mount();
  fireEvent.click(
    await screen.findByRole("button", {
      name: "結果不明の注文を同じキーで再確認",
    }),
  );
  await screen.findByText("整合性検証：一致");
  await reset();
  fireEvent.click(screen.getByRole("button", { name: "20件を並行送信" }));
  await waitFor(() => expect(posts).toBe(60));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "結果不明の注文を同じキーで再確認" }),
    ).toBeEnabled(),
  );
  const newKeys = JSON.parse(sessionStorage.getItem(DEMO_STORAGE_KEY)!).keys;
  await act(async () => releases.forEach((release) => release()));
  expect(JSON.parse(sessionStorage.getItem(DEMO_STORAGE_KEY)!).keys).toEqual(
    newKeys,
  );
  second.unmount();
  mount();
  await screen.findByRole("button", {
    name: "結果不明の注文を同じキーで再確認",
  });
  expect(
    screen.getByRole("button", { name: "在庫を5にリセット" }),
  ).toBeDisabled();
});

it("a late reset response cannot remove a newer page's saved retry keys", async () => {
  let finishReset!: (response: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishReset = resolve;
      }),
  );
  const first = mount();
  fireEvent.click(screen.getByRole("button", { name: "在庫を5にリセット" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  first.unmount();
  mount();
  await reset();
  failOrders = true;
  fireEvent.click(screen.getByRole("button", { name: "20件を並行送信" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "結果不明の注文を同じキーで再確認" }),
    ).toBeEnabled(),
  );
  const saved = sessionStorage.getItem(DEMO_STORAGE_KEY);
  expect(saved).not.toBeNull();
  await act(async () => finishReset(response(baseline)));
  expect(sessionStorage.getItem(DEMO_STORAGE_KEY)).toBe(saved);
});
it("a lost reset response clears verification across remount and permits fresh GET verification", async () => {
  const client = new QueryClient();
  const first = mount(client);
  await reset();
  fireEvent.click(screen.getByRole("button", { name: "20件を並行送信" }));
  await screen.findByText("整合性検証：一致");
  // The DB has reset to 5, but the POST response never reaches the browser.
  vi.mocked(fetch).mockImplementationOnce(async () => {
    throw new Error("Reset committed, response lost");
  });
  fireEvent.click(screen.getByRole("button", { name: "在庫を5にリセット" }));
  await screen.findByRole("alert");
  expect(screen.getByText("整合性検証：未確認")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "20件を並行送信" })).toBeDisabled();
  first.unmount();
  mount(client); // Next.js navigation retains the root QueryClient.
  await screen.findByText("整合性検証：未確認");
  vi.mocked(fetch).mockResolvedValueOnce(response({ ...final, stock: 5 }));
  fireEvent.click(
    screen.getByRole("button", { name: "最終在庫・注文数を再取得" }),
  );
  await screen.findByText("整合性検証：不一致");
  expect(requests).toHaveLength(20);
  await reset();
  expect(screen.getByRole("button", { name: "20件を並行送信" })).toBeEnabled();
});
