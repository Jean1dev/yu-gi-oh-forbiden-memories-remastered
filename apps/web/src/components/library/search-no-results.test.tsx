// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LibrarySearchNoResults } from "./search-no-results.tsx";

describe("LibrarySearchNoResults", () => {
  it("shows the exact PRD message and announces it politely", () => {
    const { container } = render(<LibrarySearchNoResults term="dragon" />);
    const message = screen.getByText("Nenhuma carta encontrada para 'dragon'.");

    expect(message.getAttribute("aria-live")).toBe("polite");
    expect(container.textContent).toBe("Nenhuma carta encontrada para 'dragon'.");
  });

  it("renders an unsafe-looking term as text rather than HTML", () => {
    const { container } = render(<LibrarySearchNoResults term="<script>alert(1)</script>" />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });
});
