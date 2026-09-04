import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type { CartProduct } from "@/stores/cart-store";
import { useCartStore } from "@/stores/cart-store";

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
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ items: [], hasHydrated: false });
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
});
