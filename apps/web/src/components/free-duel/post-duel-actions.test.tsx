// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostDuelActions } from "./post-duel-actions.tsx";

describe("PostDuelActions", () => {
  it("renders a Revanche link pointing to the duelist prepare route", () => {
    render(<PostDuelActions duelistId="seto" />);
    expect(screen.getByRole("link", { name: "Revanche" }).getAttribute("href")).toBe(
      "/free-duel/seto/prepare",
    );
  });

  it("renders a Trocar oponente link pointing to /free-duel", () => {
    render(<PostDuelActions duelistId="seto" />);
    expect(screen.getByRole("link", { name: "Trocar oponente" }).getAttribute("href")).toBe(
      "/free-duel",
    );
  });

  it("renders a Voltar ao menu link pointing to /", () => {
    render(<PostDuelActions duelistId="seto" />);
    expect(screen.getByRole("link", { name: "Voltar ao menu" }).getAttribute("href")).toBe("/");
  });

  it("renders all three actions together, in every render", () => {
    const { rerender } = render(<PostDuelActions duelistId="seto" />);
    expect(screen.getAllByRole("link")).toHaveLength(3);

    rerender(<PostDuelActions duelistId="isis" />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Revanche" }).getAttribute("href")).toBe(
      "/free-duel/isis/prepare",
    );
  });
});
