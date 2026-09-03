import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "@/components/footer";

import { metadata } from "./layout";
import robots from "./robots";

describe("search-engine access control", () => {
  it("disables indexing and following for every page", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("disallows every crawler path", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
  });
});

describe("Footer", () => {
  it("identifies the site as an unofficial, non-commercial demo", () => {
    render(<Footer />);

    expect(screen.getByText(/非公式・非商用/)).toBeInTheDocument();
    expect(
      screen.getByText(/実際の販売・注文・決済は行いません/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/各公式サービスとは関係ありません/),
    ).toBeInTheDocument();
  });
});
