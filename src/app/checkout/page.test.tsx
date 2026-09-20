import { ViewTransition } from "react";
import { describe, expect, it } from "vitest";
import CartPage from "../cart/page";
import CheckoutPage from "./page";

describe("cart to checkout transition boundaries", () => {
  it.each([CartPage, CheckoutPage])(
    "%sは指定したナビゲーションの入退場だけをアニメーションする",
    (Page) => {
      const boundary = Page();
      expect(boundary.type).toBe(ViewTransition);
      expect(boundary.props.default).toBe("none");
      expect(boundary.props.enter).toEqual({
        "cart-checkout": "checkout-page",
        default: "none",
      });
      expect(boundary.props.exit).toEqual({
        "cart-checkout": "checkout-page",
        default: "none",
      });
      expect(boundary.props.name).toBeUndefined();
      expect(boundary.props.update).toBeUndefined();
      expect(boundary.props.children.type).toBe("main");
    },
  );
});
