// @vitest-environment jsdom
import { searchByName } from "@yugioh/rules";
import type { Card, CardNumber, CollectionItemWithDeck } from "@yugioh/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { CollectionPanel } from "./collection-panel.tsx";

function card(numero: CardNumber, nome: string): Card {
  return {
    id: 1,
    numero,
    nome,
    img: null,
    classe: "Dragon",
    atk: 100,
    def: 100,
    guardiao1: null,
    guardiao2: null,
    password: null,
    estrelas: null,
    tipo: "monstro",
  };
}

function item(numero: CardNumber, nome: string): CollectionItemWithDeck {
  return { card: card(numero, nome), quantity: 1, copyLimit: 1, deckQuantity: 0, limitReached: false };
}

const ALL_ITEMS: readonly CollectionItemWithDeck[] = [
  item("003", "Baby Dragon"),
  item("001", "Blue-eyes White Dragon"),
  item("002", "Mystical Elf"),
];

/** Mirrors what `useCollectionPanel` would do: filters `allItems` by the local search term. */
function SearchableCollectionPanel({ allItems }: { allItems: readonly CollectionItemWithDeck[] }) {
  const [term, setTerm] = useState("");
  const [selectedCardNumber, setSelectedCardNumber] = useState<CardNumber | undefined>(undefined);
  return (
    <CollectionPanel
      items={searchByName(allItems, term)}
      term={term}
      onTermChange={setTerm}
      isEmpty={allItems.length === 0}
      selectedCardNumber={selectedCardNumber}
      onSelectCard={setSelectedCardNumber}
    />
  );
}

describe("CollectionPanel", () => {
  it("renders one item per card of the received collection", () => {
    render(
      <CollectionPanel
        items={ALL_ITEMS}
        term=""
        onTermChange={vi.fn()}
        isEmpty={false}
        selectedCardNumber={undefined}
        onSelectCard={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("filters the list when typing into the search field", () => {
    render(<SearchableCollectionPanel allItems={ALL_ITEMS} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "elf" } });

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("Mystical Elf")).toBeTruthy();
  });

  it("shows no-results when the term matches no card", () => {
    render(<SearchableCollectionPanel allItems={ALL_ITEMS} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "phoenix" } });

    expect(screen.getByText('Nenhuma carta encontrada para "phoenix".')).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("shows every item again once the term is cleared", () => {
    render(<SearchableCollectionPanel allItems={ALL_ITEMS} />);
    const field = screen.getByRole("searchbox");

    fireEvent.change(field, { target: { value: "elf" } });
    fireEvent.change(field, { target: { value: "" } });

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("preserves the loaded card-number order", () => {
    render(
      <CollectionPanel
        items={ALL_ITEMS}
        term=""
        onTermChange={vi.fn()}
        isEmpty={false}
        selectedCardNumber={undefined}
        onSelectCard={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button").map((el) => el.getAttribute("aria-label"))).toEqual([
      "Baby Dragon",
      "Blue-eyes White Dragon",
      "Mystical Elf",
    ]);
  });

  it("does not show the search field when the collection is empty", () => {
    render(
      <CollectionPanel
        items={[]}
        term=""
        onTermChange={vi.fn()}
        isEmpty={true}
        selectedCardNumber={undefined}
        onSelectCard={vi.fn()}
      />,
    );

    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
