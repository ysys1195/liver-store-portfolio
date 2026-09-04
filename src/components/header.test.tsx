import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Header } from "./header";

describe("Header", () => {
  it("ロゴ、Products、Cartの各画面へ移動できる", () => {
    render(<Header />);

    expect(
      screen.getByRole("link", { name: "Liver Store トップへ" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
      "href",
      "/products",
    );
    expect(screen.getByRole("link", { name: "カート" })).toHaveAttribute(
      "href",
      "/cart",
    );
  });
});
