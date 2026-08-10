// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { Card } from "@yugioh/shared";
import { describe, expect, it, vi } from "vitest";
import { PlayerHand } from "./player-hand.tsx";

const card: Card = {
  id: 1,
  numero: "001",
  nome: "Blue Dragon",
  img: null,
  classe: "Dragon",
  atk: 1200,
  def: 900,
  guardiao1: "Sun",
  guardiao2: "Moon",
  password: null,
  estrelas: null,
  tipo: "monstro",
};

describe("PlayerHand", () => {
  it("exposes every card name as the accessible button label", () => {
    render(<PlayerHand cards={[card]} disabled={false} />);
    expect(screen.getByRole("button", { name: "Blue Dragon" })).toBeTruthy();
  });

  it("marks the selected card and calls onSelect", () => {
    const onSelect = vi.fn();
    render(<PlayerHand cards={[card]} disabled={false} selectedIndex={0} onSelect={onSelect} />);
    const button = screen.getByRole("button", { name: "Blue Dragon" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("does not accept clicks while disabled", () => {
    const onSelect = vi.fn();
    render(<PlayerHand cards={[card]} disabled selectedIndex={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Blue Dragon" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  // 64px is too small for the full `CardFrame`; a hand card is the crop art
  // plus its name, and selecting it fills the inspector column instead.
  it.each([
    ["a migrated card", { ...card, descricao: "A powerful dragon." } as Card],
    ["a card without descricao", card],
  ])("renders the crop art and the name for %s", (_label, subject) => {
    render(<PlayerHand cards={[subject]} disabled={false} />);

    expect(screen.queryByText("ATK 1200 / DEF 900")).toBeNull();
    expect(screen.getByRole("img", { name: "Blue Dragon" }).getAttribute("src")).toBe(
      "/cards-data/art/001.jpg",
    );
    expect(screen.getByText("Blue Dragon")).toBeTruthy();
  });
});
