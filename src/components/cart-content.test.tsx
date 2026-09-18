import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CART_SOLD_OUT_NOTICE_STORAGE_KEY,
  CART_STORAGE_KEY,
  useCartStore,
} from "@/stores/cart-store";

import { CartContent } from "./cart-content";

const cartItem = {
  id: "voice-1",
  slug: "demo-voice",
  name: "Demo Voice",
  price: 1_000,
  maxStock: 2,
  category: "VOICE" as const,
  imageUrl: null,
  quantity: 1,
};

function renderCart(onRender = () => {}) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Profiler id="cart" onRender={onRender}>
        <CartContent />
      </Profiler>
    </QueryClientProvider>,
  );
}

describe("CartContent", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useCartStore.setState({
      items: [],
      hasHydrated: true,
      soldOutRemovalNames: [],
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          productId: cartItem.id,
          stock: cartItem.maxStock,
          status: "on_sale",
          updatedAt: "2026-09-06T00:00:00.000Z",
        }),
        { status: 200 },
      ),
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it("空状態から商品一覧へ移動できる", () => {
    renderCart();

    expect(screen.getByText("カートは空です")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "商品を見る" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("数量変更、小計、在庫上限、削除を表示・操作できる", () => {
    useCartStore.setState({
      hasHydrated: true,
      items: [cartItem],
    });

    renderCart();

    expect(screen.getAllByText("￥1,000")).toHaveLength(2);
    const increaseButton = screen.getByRole("button", {
      name: "Demo Voiceの数量を1増やす",
    });
    fireEvent.click(increaseButton);

    expect(screen.getByText("￥2,000")).toBeInTheDocument();
    expect(increaseButton).toBeDisabled();
    expect(screen.getByText("在庫上限 2点")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByText("カートは空です")).toBeInTheDocument();
  });

  it("最新在庫が0点の商品を削除し、理由を赤文字で通知する", async () => {
    useCartStore.setState({
      hasHydrated: true,
      items: [{ ...cartItem, maxStock: 50, quantity: 10 }],
    });
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          productId: cartItem.id,
          stock: 0,
          status: "sold_out",
          updatedAt: "2026-09-06T00:01:00.000Z",
        }),
        { status: 200 },
      ),
    );

    renderCart();

    const removalMessage = await screen.findByText(
      "対象の商品が在庫切れとなったため、カートから自動で削除されました：Demo Voice",
    );
    const removalNotice = removalMessage.closest('[aria-live="polite"]');
    expect(removalNotice).toHaveClass(
      "inline-flex",
      "items-center",
      "border-red-200",
      "bg-red-50",
      "text-red-800",
    );
    expect(screen.getByText("カートは空です")).toBeInTheDocument();
    expect(useCartStore.getState().items).toEqual([]);
    expect(sessionStorage.getItem(CART_SOLD_OUT_NOTICE_STORAGE_KEY)).toContain(
      "Demo Voice",
    );

    const dismissButton = screen.getByRole("button", { name: "通知を閉じる" });
    expect(dismissButton.querySelector("svg")).toBeInTheDocument();
    fireEvent.click(dismissButton);

    expect(screen.queryByText(/対象の商品が在庫切れとなったため/)).toBeNull();
    expect(sessionStorage.getItem(CART_SOLD_OUT_NOTICE_STORAGE_KEY)).toBeNull();
  });

  it("API非対応でもstoreと保存値は同期更新し、小計だけ背景renderで追従する", () => {
    expect(document.startViewTransition).toBeUndefined();
    useCartStore.setState({
      items: [cartItem, { ...cartItem, id: "voice-2", name: "Second Voice" }],
    });
    const commits: Array<{ quantity: number; subtotal: string | null }> = [];
    const { container } = renderCart(() => {
      commits.push({
        quantity: useCartStore.getState().items[0]?.quantity ?? 0,
        subtotal: document.querySelector("aside strong")?.textContent ?? null,
      });
    });
    commits.length = 0;

    fireEvent.click(
      screen.getByRole("button", { name: "Demo Voiceの数量を1増やす" }),
    );
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(
      JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!).state.items[0]
        .quantity,
    ).toBe(2);
    expect(commits).toContainEqual({ quantity: 2, subtotal: "￥2,000" });
    expect(container.querySelector("aside strong")).toHaveTextContent(
      "￥3,000",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Demo Voiceの数量を1減らす" }),
    );
    expect(container.querySelector("aside strong")).toHaveTextContent(
      "￥2,000",
    );
    fireEvent.click(screen.getAllByRole("button", { name: "削除" })[0]);
    expect(useCartStore.getState().items.map((item) => item.id)).toEqual([
      "voice-2",
    ]);
    expect(container.querySelector("aside strong")).toHaveTextContent(
      "￥1,000",
    );
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByText("カートは空です")).toBeInTheDocument();
  });
});
