// @vitest-environment jsdom
import type { Card, CollectionItemWithDeck } from "@yugioh/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CollectionCardGridItem } from "./collection-card-grid-item.tsx";

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

describe("CollectionCardGridItem", () => {
  it("renders CardFrame for a migrated card", () => {
    render(
      <CollectionCardGridItem
        item={item({
          card: card({
            atributo: "LIGHT",
            nivel: 8,
            descricao: "A powerful dragon.",
          }),
        })}
        selected={false}
        onSelectCard={vi.fn()}
      />,
    );

    expect(screen.getByText("ATK 3000 / DEF 2500")).toBeTruthy();
  });

  it("keeps rendering the legacy image for a card without descricao (regression fallback)", () => {
    render(<CollectionCardGridItem item={item()} selected={false} onSelectCard={vi.fn()} />);

    expect(screen.queryByText("ATK 3000 / DEF 2500")).toBeNull();
    expect(screen.getByAltText("").getAttribute("src")).toBe("/cards-data/001.jpg");
    expect(screen.getByText("Blue-eyes White Dragon")).toBeTruthy();
  });

  it("shows the deck copy count regardless of the art variant", () => {
    render(
      <CollectionCardGridItem
        item={item({ deckQuantity: 2 })}
        selected={false}
        onSelectCard={vi.fn()}
      />,
    );

    expect(screen.getByText("×2")).toBeTruthy();
  });
});
