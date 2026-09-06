import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCartStore } from "@/stores/cart-store";

import { InventoryPanel, InventoryStatusBadge } from "./inventory-panel";

afterEach(() => vi.restoreAllMocks());

const product = {
  id: "product-1",
  slug: "demo-product",
  name: "Demo Product",
  price: 1_000,
  category: "VOICE" as const,
  imageUrl: null,
  salesStartAt: "2026-09-01T00:00:00.000Z",
};

function renderPanel() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <InventoryStatusBadge productId={product.id} initialStatus="on_sale" />
      <InventoryPanel product={product} />
    </QueryClientProvider>,
  );
}

describe("InventoryPanel", () => {
  beforeEach(async () => {
    localStorage.clear();
    useCartStore.setState({ items: [], hasHydrated: false });
    await useCartStore.persist.rehydrate();
  });

  it("取得中のLoadingと取得後の在庫を表示する", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );

    renderPanel();

    expect(screen.getByText("在庫情報を読み込み中です。")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "在庫を確認中..." }),
    ).toBeDisabled();
    resolveResponse?.(
      new Response(
        JSON.stringify({
          productId: "product-1",
          stock: 3,
          status: "low_stock",
          updatedAt: "2026-09-04T00:00:00.000Z",
        }),
        { status: 200 },
      ),
    );

    expect(await screen.findByText("在庫 3点・残りわずか")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "カートに追加" })).toBeEnabled();
  });

  it("404は自動Retryせず商品なし用UIと手動Retryを表示する", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ code: "PRODUCT_NOT_FOUND", message: "not found" }),
          { status: 404 },
        ),
      );

    renderPanel();

    expect(
      await screen.findByText("この商品の在庫情報は現在ご利用いただけません。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("サーバーエラーを上限までRetryし、手動Retryで回復する", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            productId: "product-1",
            stock: 10,
            status: "on_sale",
            updatedAt: "2026-09-04T00:00:00.000Z",
          }),
          { status: 200 },
        ),
      );

    renderPanel();

    expect(
      await screen.findByText(
        "在庫情報を取得できませんでした。",
        {},
        { timeout: 2000 },
      ),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", { name: "もう一度試す" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(await screen.findByText("在庫 10点・販売中")).toBeInTheDocument();
  });

  it("再取得した在庫と販売状態をバッジ・数量上限・CTAへ反映する", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            productId: "product-1",
            stock: 50,
            status: "on_sale",
            updatedAt: "2026-09-04T00:00:00.000Z",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            productId: "product-1",
            stock: 0,
            status: "sold_out",
            updatedAt: "2026-09-04T00:01:00.000Z",
          }),
          { status: 200 },
        ),
      );

    renderPanel();

    expect(await screen.findByText("在庫 50点・販売中")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "カートに追加" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "在庫を更新" }));

    expect(
      await screen.findByRole("button", { name: "SOLD OUT" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "カートに追加" })).toBeNull();
    expect(screen.queryByText("販売中")).toBeNull();
    expect(screen.getAllByText("SOLD OUT").length).toBeGreaterThanOrEqual(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useCartStore.getState().items).toEqual([]);
  });
});
