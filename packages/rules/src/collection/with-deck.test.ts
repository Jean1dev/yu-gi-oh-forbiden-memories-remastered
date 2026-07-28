import type { ActiveDeckLookup, Card, CollectionItem } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { withDeckQuantity } from "./with-deck.ts";

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

function item(overrides: Partial<Card> = {}, quantity = 3, copyLimit = 3): CollectionItem {
  return { card: card(overrides), quantity, copyLimit };
}

function lookupFrom(entries: Readonly<Record<string, number>>): ActiveDeckLookup {
  return (cardNumber) => entries[cardNumber] ?? 0;
}

describe("withDeckQuantity", () => {
  it("attaches the deck quantity returned by the injected lookup", () => {
    const dragon = item({ numero: "001" });
    const result = withDeckQuantity([dragon], lookupFrom({ "001": 2 }));
    expect(result[0]?.deckQuantity).toBe(2);
  });

  it("uses zero when the deck lookup does not know the card number", () => {
    const elf = item({ numero: "002" });
    const result = withDeckQuantity([elf], lookupFrom({}));
    expect(result[0]?.deckQuantity).toBe(0);
  });

  it("marks limitReached when the deck quantity reaches the copy limit", () => {
    const dragon = item({ numero: "001" }, 3, 3);
    const result = withDeckQuantity([dragon], lookupFrom({ "001": 3 }));
    expect(result[0]?.limitReached).toBe(true);
  });

  it("does not mark limitReached when the deck quantity is below the copy limit", () => {
    const dragon = item({ numero: "001" }, 3, 3);
    const result = withDeckQuantity([dragon], lookupFrom({ "001": 2 }));
    expect(result[0]?.limitReached).toBe(false);
  });

  it("preserves the order and quantity of the received items", () => {
    const items = [item({ numero: "003" }), item({ numero: "001" }), item({ numero: "002" })];
    const result = withDeckQuantity(items, lookupFrom({}));
    expect(result.map((entry) => entry.card.numero)).toEqual(["003", "001", "002"]);
    expect(result).toHaveLength(3);
  });
});
