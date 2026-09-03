import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Header } from "./header";

describe("Header", () => {
  it("ロゴからTOPへ、Productsから商品一覧へ移動できる", () => {
    render(<Header />);

    expect(
      screen.getByRole("link", { name: "Liver Store トップへ" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
      "href",
      "/products",
    );
  });
});
