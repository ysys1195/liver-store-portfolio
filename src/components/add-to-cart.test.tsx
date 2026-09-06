import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type { CartProduct } from "@/stores/cart-store";
import { CART_STORAGE_KEY, useCartStore } from "@/stores/cart-store";

import { AddToCart } from "./add-to-cart";

const product: CartProduct = {
  id: "voice-1",
  slug: "demo-voice",
  name: "Demo Voice",
  price: 1_000,
  maxStock: 2,
  category: "VOICE",
  imageUrl: null,
};

describe("AddToCart", () => {
  beforeEach(async () => {
    localStorage.clear();
    useCartStore.setState({ items: [], hasHydrated: false });
    await useCartStore.persist.rehydrate();
  });

  it("在庫上限まで数量を選び、カートへ追加できる", () => {
    render(<AddToCart product={product} />);

    const increaseButton = screen.getByRole("button", {
      name: "数量を1増やす",
    });
    fireEvent.click(increaseButton);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(increaseButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "カートに追加" }));

    expect(useCartStore.getState().items).toEqual([
      { ...product, quantity: 2 },
    ]);
    expect(screen.getByText("カートに追加しました。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "カートを見る" })).toHaveAttribute(
      "href",
      "/cart",
    );
  });

  it("カート内の数量を差し引いた残数だけ追加できる", () => {
    useCartStore.getState().addItem(product, 1);
    render(<AddToCart product={product} />);

    expect(
      screen.getByText("カート内: 1点 / 追加可能: 1点"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "数量を1増やす" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "カートに追加" }));

    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(screen.getByText("カートに追加しました。")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "在庫上限に達しています" }),
    ).toBeDisabled();
  });

  it("既に上限なら追加を無効にし、成功案内を表示しない", () => {
    useCartStore.getState().addItem(product, 2);
    render(<AddToCart product={product} />);

    const addButton = screen.getByRole("button", {
      name: "在庫上限に達しています",
    });
    expect(addButton).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "数量を1増やす" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "数量を1減らす" }),
    ).toBeDisabled();
    fireEvent.click(addButton);

    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(
      screen.queryByText("カートに追加しました。"),
    ).not.toBeInTheDocument();
  });

  it("表示中のカート変更に追従して選択数量と追加可否を更新する", () => {
    render(<AddToCart product={product} />);
    fireEvent.click(screen.getByRole("button", { name: "数量を1増やす" }));

    act(() => useCartStore.getState().addItem(product, 1));
    expect(screen.getByRole("status")).toHaveTextContent("1");
    expect(
      screen.getByRole("button", { name: "数量を1増やす" }),
    ).toBeDisabled();

    act(() => useCartStore.getState().addItem(product, 1));
    expect(
      screen.getByRole("button", { name: "在庫上限に達しています" }),
    ).toBeDisabled();

    act(() => useCartStore.getState().removeItem(product.id));
    expect(screen.getByRole("button", { name: "カートに追加" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "カートに追加" }));
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("復元前は操作できず、保存済みのカート数量も上限に含める", async () => {
    useCartStore.setState({ hasHydrated: false });
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: { items: [{ ...product, quantity: 2 }] },
        version: 0,
      }),
    );
    render(<AddToCart product={product} />);

    expect(screen.getByRole("button", { name: "カートに追加" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "数量を1増やす" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "数量を1減らす" }),
    ).toBeDisabled();

    await act(async () => {
      await useCartStore.persist.rehydrate();
    });

    expect(
      screen.getByText("カート内: 2点 / 追加可能: 0点"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "在庫上限に達しています" }),
    ).toBeDisabled();
    expect(
      screen.queryByText("カートに追加しました。"),
    ).not.toBeInTheDocument();
  });
});
