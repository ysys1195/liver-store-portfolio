import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ORDER_TIMEOUT_MS } from "@/lib/orders";
import { useCartStore } from "@/stores/cart-store";
import { CheckoutContent } from "./checkout-content";
const item = {
  id: "p",
  slug: "p",
  name: "デモ商品",
  price: 1,
  maxStock: 5,
  quantity: 2,
  category: "GOODS" as const,
  imageUrl: null,
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
let stock = 5;
let posts: Array<Record<string, unknown>>;
let orderFetch: () => Promise<Response>;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  stock = 5;
  posts = [];
  useCartStore.setState({ items: [item], hasHydrated: true });
  orderFetch = async () =>
    response(
      { orderId: "order-1", status: "completed", totalAmount: 2468 },
      201,
    );
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
    if (url === "/api/orders") {
      posts.push(JSON.parse(options!.body as string));
      return orderFetch();
    }
    return response({
      productId: "p",
      stock,
      status: stock ? "on_sale" : "sold_out",
      updatedAt: "2026-09-08",
    });
  });
});
afterEach(() => {
  vi.useRealTimers();
  onlineManager.setOnline(true);
  vi.restoreAllMocks();
});
function mount() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CheckoutContent />
    </QueryClientProvider>,
  );
}
it("disables pending submission, sends only IDs/quantity and renders DB total", async () => {
  let resolve!: (res: Response) => void;
  orderFetch = () =>
    new Promise((r) => {
      resolve = r;
    });
  mount();
  const button = await screen.findByRole("button", {
    name: "デモ注文を確定する",
  });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(posts).toHaveLength(1));
  expect(screen.getByRole("button", { name: "注文を確認中…" })).toBeDisabled();
  expect(posts[0].items).toEqual([{ productId: "p", quantity: 2 }]);
  resolve(
    response(
      { orderId: "order-1", status: "completed", totalAmount: 2468 },
      201,
    ),
  );
  expect(await screen.findByText("確定金額：￥2,468")).toBeInTheDocument();
  expect(useCartStore.getState().items).toEqual([]);
});
it("409 invalidates active inventory and displays refetched stock", async () => {
  orderFetch = async () => {
    stock = 1;
    return response({ code: "OUT_OF_STOCK" }, 409);
  };
  mount();
  expect(await screen.findByText(/最新在庫 5点/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "デモ注文を確定する" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("在庫が不足");
  expect(await screen.findByText(/最新在庫 1点/)).toBeInTheDocument();
  expect(posts).toHaveLength(1);
});
it("network uncertainty keeps the same request across remount and manual retry", async () => {
  orderFetch = async () => {
    throw new TypeError("network");
  };
  const view = mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "デモ注文を確定する" }),
  );
  await screen.findByRole("alert");
  expect(posts).toHaveLength(1);
  view.unmount();
  useCartStore.setState({ items: [{ ...item, quantity: 3 }] });
  orderFetch = async () =>
    response({
      orderId: "order-1",
      status: "completed",
      totalAmount: 2468,
      replayed: true,
    });
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "同じ注文キーで結果を再確認" }),
  );
  await screen.findByText("デモ注文が完了しました");
  expect(posts[1]).toEqual(posts[0]);
  expect(useCartStore.getState().items[0].quantity).toBe(3);
});
it("does not send if saving the key fails", async () => {
  mount();
  const button = await screen.findByRole("button", {
    name: "デモ注文を確定する",
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("disabled");
  });
  fireEvent.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "送信していません",
  );
  expect(posts).toHaveLength(0);
});
it("does not generate a fresh key when persisted data is corrupt", async () => {
  sessionStorage.setItem("liver-store-order-attempt", "{");
  mount();
  expect(
    await screen.findByRole("button", { name: "デモ注文を確定する" }),
  ).toBeDisabled();
  expect(posts).toHaveLength(0);
});

it("key conflict preserves the attempt instead of starting another order", async () => {
  orderFetch = async () => response({ code: "IDEMPOTENCY_KEY_CONFLICT" }, 409);
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "デモ注文を確定する" }),
  );
  await screen.findByRole("alert");
  const retry = await screen.findByRole("button", {
    name: "同じ注文キーで結果を再確認",
  });
  await waitFor(() => expect(retry).toBeEnabled());
  fireEvent.click(retry);
  await waitFor(() => expect(posts).toHaveLength(2));
  expect(posts[1]).toEqual(posts[0]);
});

it("5xx does not automatically retry or replace the saved key", async () => {
  orderFetch = async () => response({ code: "INTERNAL_ERROR" }, 500);
  const view = mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "デモ注文を確定する" }),
  );
  await screen.findByRole("alert");
  expect(posts).toHaveLength(1);
  view.unmount();
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "同じ注文キーで結果を再確認" }),
  );
  await waitFor(() => expect(posts).toHaveLength(2));
  expect(posts[1]).toEqual(posts[0]);
});

it("offline submission fails instead of waiting to auto-submit on reconnect", async () => {
  orderFetch = async () => {
    throw new TypeError("offline");
  };
  mount();
  const submit = await screen.findByRole("button", {
    name: "デモ注文を確定する",
  });
  act(() => onlineManager.setOnline(false));
  fireEvent.click(submit);
  await screen.findByRole("alert");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "同じ注文キーで結果を再確認" }),
    ).toBeDisabled(),
  );
  const retry = screen.getByRole("button", {
    name: "同じ注文キーで結果を再確認",
  });
  expect(retry.parentElement).toHaveClass("cursor-not-allowed");
  fireEvent.click(retry);
  expect(posts).toHaveLength(1);
  act(() => onlineManager.setOnline(true));
  expect(retry).toBeEnabled();
  expect(posts).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("button", { name: "同じ注文キーで結果を再確認" }),
  );
  await waitFor(() => expect(posts).toHaveLength(2));
  expect(posts[1]).toEqual(posts[0]);
});

it("409 refetch failure displays retry instead of cached latest stock", async () => {
  mount();
  await screen.findByText(/最新在庫 5点/);
  vi.mocked(fetch).mockImplementation(async (url) =>
    url === "/api/orders"
      ? response({ code: "OUT_OF_STOCK" }, 409)
      : response({}, 500),
  );
  fireEvent.click(screen.getByRole("button", { name: "デモ注文を確定する" }));
  await screen.findByRole("button", { name: "在庫取得失敗・再取得" });
  expect(screen.queryByText(/最新在庫 5点/)).toBeNull();
  expect(
    screen.getByRole("button", { name: "デモ注文を確定する" }),
  ).toBeEnabled();
});

it("a timeout releases pending UI and retries with the original key", async () => {
  orderFetch = () => new Promise(() => {});
  mount();
  const submit = await screen.findByRole("button", {
    name: "デモ注文を確定する",
  });
  vi.useFakeTimers();
  fireEvent.click(submit);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ORDER_TIMEOUT_MS + 10);
  });
  vi.useRealTimers();
  expect(await screen.findByRole("alert")).toHaveTextContent("タイムアウト");
  const retry = screen.getByRole("button", {
    name: "同じ注文キーで結果を再確認",
  });
  expect(retry).toBeEnabled();
  orderFetch = async () =>
    response({
      orderId: "o",
      status: "completed",
      totalAmount: 100,
      replayed: true,
    });
  fireEvent.click(retry);
  await screen.findByText("デモ注文が完了しました");
  expect(posts[1]).toEqual(posts[0]);
});
