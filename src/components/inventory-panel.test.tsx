import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InventoryPanel } from "./inventory-panel";

afterEach(() => vi.restoreAllMocks());

function renderPanel() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <InventoryPanel productId="product-1" />
    </QueryClientProvider>,
  );
}

describe("InventoryPanel", () => {
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
});
