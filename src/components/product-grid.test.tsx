import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { StorefrontProduct } from "@/lib/product";

import { ProductGrid } from "./product-grid";

const baseProduct: StorefrontProduct = {
  id: "voice",
  slug: "demo-voice",
  name: "Demo Voice",
  description: "demo",
  price: 1000,
  stock: 10,
  category: "VOICE",
  imageUrl: null,
  salesStartAt: "2026-09-01T00:00:00.000Z",
  salesEndAt: null,
  status: "on_sale",
  liverNames: ["夜風ユイ"],
};

const products: StorefrontProduct[] = [
  baseProduct,
  {
    ...baseProduct,
    id: "goods",
    slug: "demo-goods",
    name: "Demo Goods",
    category: "GOODS",
    imageUrl: "/images/demo-goods.png",
    status: "sold_out",
  },
  {
    ...baseProduct,
    id: "set",
    slug: "demo-set",
    name: "Demo Set",
    category: "SET",
    status: "upcoming",
  },
];

describe("ProductGrid", () => {
  it("商品名、詳細リンク、販売状態を表示する", () => {
    render(<ProductGrid products={products} />);

    expect(
      screen.getByRole("link", {
        name: "Demo Voice、販売中の商品詳細を見る",
      }),
    ).toHaveAttribute("href", "/products/demo-voice");
    expect(screen.getByText("販売中")).toBeInTheDocument();
    expect(screen.getByText("SOLD OUT")).toBeInTheDocument();
    expect(screen.getByText("COMING SOON")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Demo Goodsの商品画像" }),
    ).toBeInTheDocument();
  });

  it("選択したカテゴリだけに絞り込む", () => {
    render(<ProductGrid products={products} />);

    fireEvent.click(screen.getByRole("button", { name: "Goods" }));

    expect(screen.getByText("Demo Goods")).toBeInTheDocument();
    expect(screen.queryByText("Demo Voice")).not.toBeInTheDocument();
    expect(screen.getByText("1 件の商品")).toBeInTheDocument();
  });
});
