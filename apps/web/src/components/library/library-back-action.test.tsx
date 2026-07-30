// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LibraryBackAction } from "./library-back-action.tsx";

describe("LibraryBackAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("links to the Library when the detail was loaded as a full page", () => {
    render(<LibraryBackAction returnDestination="/library?q=dragon" />);

    expect(screen.getByRole("link").getAttribute("href")).toBe("/library?q=dragon");
  });

  it("closes an intercepted detail through browser history", () => {
    const back = vi.spyOn(history, "back").mockImplementation(() => undefined);
    render(<LibraryBackAction returnDestination="/library?q=dragon" mode="history" />);

    fireEvent.click(screen.getByRole("button", { name: "Voltar para a Library" }));

    expect(back).toHaveBeenCalledOnce();
  });
});
