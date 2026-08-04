// @vitest-environment jsdom
import type { Card, CollectionItemWithDeck } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CollectionCardItem } from "./collection-card-item.tsx";

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    numero: "001",
    nome: "Blue-eyes White Dragon",
    img: null,
    classe: "Dragon",
    atk: 3000,
    def: 2500,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: "89 63 11 39",
    estrelas: 999_999,
    tipo: "monstro",
    ...overrides,
  };
}

function item(overrides: Partial<CollectionItemWithDeck> = {}): CollectionItemWithDeck {
  return {
    card: card(),
    quantity: 3,
    copyLimit: 3,
    deckQuantity: 1,
    limitReached: false,
    ...overrides,
  };
}

describe("CollectionCardItem", () => {
  it("shows art, name, class, type, atk, def, owned quantity and deck quantity", () => {
    render(<CollectionCardItem item={item()} selected={false} onSelectCard={vi.fn()} />);

    expect(screen.getByAltText("").getAttribute("src")).toBe("/cards-data/001.jpg");
    expect(screen.getByText("Blue-eyes White Dragon")).toBeTruthy();
    expect(screen.getByText("Dragon")).toBeTruthy();
    expect(screen.getByText("monstro")).toBeTruthy();
    expect(screen.getByText("3000 / 2500")).toBeTruthy();
    expect(screen.getByText("possui 3 · no deck 1")).toBeTruthy();
  });

  it("shows the limit-reached mark when deckQuantity reaches copyLimit", () => {
    render(
      <CollectionCardItem
        item={item({ deckQuantity: 3, copyLimit: 3, limitReached: true })}
        selected={false}
        onSelectCard={vi.fn()}
      />,
    );

    expect(screen.getByText("Limite atingido")).toBeTruthy();
  });

  it("does not show the limit-reached mark when deckQuantity is below copyLimit", () => {
    render(
      <CollectionCardItem
        item={item({ deckQuantity: 1, copyLimit: 3, limitReached: false })}
        selected={false}
        onSelectCard={vi.fn()}
      />,
    );

    expect(screen.queryByText("Limite atingido")).toBeNull();
  });

  it("highlights the item when selected", () => {
    render(<CollectionCardItem item={item()} selected={true} onSelectCard={vi.fn()} />);

    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onSelectCard with the card number when activated", () => {
    const onSelectCard = vi.fn();
    render(<CollectionCardItem item={item()} selected={false} onSelectCard={onSelectCard} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onSelectCard).toHaveBeenCalledWith("001");
  });

  it("uses the crop art URL for a migrated card, keeping the row layout unchanged", () => {
    render(
      <CollectionCardItem
        item={item({ card: card({ descricao: "A powerful dragon." }) })}
        selected={false}
        onSelectCard={vi.fn()}
      />,
    );

    expect(screen.getByAltText("").getAttribute("src")).toBe("/cards-data/art/001.jpg");
    expect(screen.getByText("Blue-eyes White Dragon")).toBeTruthy();
  });

  it("keeps the legacy art URL for a card without descricao (regression fallback)", () => {
    render(<CollectionCardItem item={item()} selected={false} onSelectCard={vi.fn()} />);

    expect(screen.getByAltText("").getAttribute("src")).toBe("/cards-data/001.jpg");
  });
});
