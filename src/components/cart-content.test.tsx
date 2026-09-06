import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useCartStore } from "@/stores/cart-store";

import { CartContent } from "./cart-content";

describe("CartContent", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ items: [], hasHydrated: true });
  });

  it("空状態から商品一覧へ移動できる", () => {
    render(<CartContent />);

    expect(screen.getByText("カートは空です")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "商品を見る" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("数量変更、小計、在庫上限、削除を表示・操作できる", () => {
    useCartStore.setState({
      hasHydrated: true,
      items: [
        {
          id: "voice-1",
          slug: "demo-voice",
          name: "Demo Voice",
          price: 1_000,
          maxStock: 2,
          category: "VOICE",
          imageUrl: null,
          quantity: 1,
        },
      ],
    });

    render(<CartContent />);

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
});
