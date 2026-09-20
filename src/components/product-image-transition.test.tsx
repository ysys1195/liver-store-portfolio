import {
  Children,
  isValidElement,
  ViewTransition,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";
import type { StorefrontProduct } from "@/lib/product";
import { getProductBySlug } from "@/lib/server/storefront";
import ProductDetailPage from "@/app/products/[slug]/page";
import { ProductCard } from "./product-card";
import { ProductArtwork } from "./product-artwork";

vi.mock("@/lib/server/storefront", () => ({ getProductBySlug: vi.fn() }));

const product: StorefrontProduct = {
  id: "demo-voice",
  slug: "demo-voice",
  name: "Demo Voice",
  description: null,
  price: 1000,
  stock: 3,
  category: "VOICE",
  imageUrl: null,
  salesStartAt: "2026-09-01T00:00:00.000Z",
  salesEndAt: null,
  status: "on_sale",
  liverNames: ["夜風ユイ"],
};

function boundaries(node: ReactNode): Array<Record<string, unknown>> {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (child.type === ViewTransition) return [child.props];
    return boundaries(child.props.children);
  });
}

describe("商品画像の共有遷移", () => {
  it.each([null, "/images/demo.png"])(
    "画像URLが%sでも一覧と詳細で同じ商品だけを対応付ける",
    async (imageUrl) => {
      const current = { ...product, imageUrl };
      vi.mocked(getProductBySlug).mockResolvedValue(current);
      const [card] = boundaries(
        ProductCard({ product: current, animateImage: true }),
      );
      const [detail] = boundaries(
        await ProductDetailPage({
          params: Promise.resolve({ slug: current.slug }),
        }),
      );
      expect(card.name).toBe(`product-image-${current.id}`);
      expect(detail.name).toBe(card.name);
      for (const boundary of [card, detail]) {
        expect(boundary.default).toBe("none");
        expect(boundary.share).toBe("product-image");
        expect(boundary.enter).toBeUndefined();
        expect(boundary.update).toBeUndefined();
        expect(
          isValidElement(boundary.children) && boundary.children.type,
        ).toBe(ProductArtwork);
      }
      const [other] = boundaries(
        ProductCard({
          product: { ...current, id: "other" },
          animateImage: true,
        }),
      );
      expect(other.name).not.toBe(card.name);
    },
  );

  it("TOPのカードは共有遷移へ参加しない", () => {
    const [card] = boundaries(ProductCard({ product }));
    expect(card.name).toBeUndefined();
    expect(card.share).toBe("none");
  });
});
