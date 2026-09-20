// @vitest-environment node
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

describe("cart and checkout motion", () => {
  it.each(["cart-subtotal", "checkout-page", "product-image"])(
    "%sのアニメーション設定とreduced motion対応を維持する",
    (transitionClass) => {
      const css = postcss.parse(
        readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"),
      );
      const selectors = [
        `::view-transition-group(.${transitionClass})`,
        `::view-transition-old(.${transitionClass})`,
        `::view-transition-new(.${transitionClass})`,
      ];
      const customAnimations: string[] = [];
      const staticRootSelectors: string[] = [];
      const reducedSelectors: string[] = [];
      css.walkRules((rule) => {
        if (rule.parent?.type === "root") {
          rule.walkDecls("animation", (declaration) => {
            if (declaration.value === "none")
              staticRootSelectors.push(...rule.selectors);
          });
        }
        if (!rule.selectors.some((selector) => selectors.includes(selector)))
          return;
        if (rule.parent?.type === "root") {
          rule.walkDecls(/^animation/, (declaration) => {
            customAnimations.push(`${declaration.prop}: ${declaration.value}`);
          });
        }
      });
      css.walkAtRules("media", (media) => {
        if (media.params !== "(prefers-reduced-motion: reduce)") return;
        media.walkRules((rule) => {
          rule.walkDecls("animation", (declaration) => {
            if (declaration.value === "none")
              reducedSelectors.push(...rule.selectors);
          });
        });
      });
      expect(customAnimations).toEqual(
        transitionClass === "product-image"
          ? ["animation-timing-function: ease-in"]
          : [],
      );
      expect(staticRootSelectors).toEqual(
        expect.arrayContaining([
          "::view-transition-old(root)",
          "::view-transition-new(root)",
        ]),
      );
      expect(reducedSelectors).toEqual(expect.arrayContaining(selectors));
    },
  );
});
