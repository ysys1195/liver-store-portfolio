import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DISCLAIMER_STORAGE_KEY, DisclaimerModal } from "./disclaimer-modal";

describe("DisclaimerModal", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("requires acceptance on the first visit", () => {
    render(<DisclaimerModal />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /閉じる/ }),
    ).not.toBeInTheDocument();

    const confirmationButton = screen.getByRole("button", {
      name: "内容を確認しました",
    });
    fireEvent.keyDown(confirmationButton, { key: "Tab" });
    expect(confirmationButton).toHaveFocus();

    fireEvent.click(confirmationButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(DISCLAIMER_STORAGE_KEY)).toBe("true");
  });

  it("does not reopen after acceptance in the same browser session", async () => {
    sessionStorage.setItem(DISCLAIMER_STORAGE_KEY, "true");

    render(<DisclaimerModal />);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
