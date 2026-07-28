import type { Card, CardCatalogLookup, CardNumber, Collection } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { enrichCollection } from "./enrich.ts";

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

function fakeCatalog(cards: readonly Card[]): CardCatalogLookup {
  const index = new Map(cards.map((c) => [c.numero, c] as const));
  return (cardNumber: CardNumber) => index.get(cardNumber);
}

describe("enrichCollection", () => {
  it("attaches the twelve canonical fields of the card to each item", () => {
    const dragon = card();
    const collection: Collection = new Map([["001", 2]]);

    const result = enrichCollection(collection, fakeCatalog([dragon]));

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.card).toEqual(dragon);
  });

  it("computes copyLimit three for a card owned five times", () => {
    const elf = card({ id: 45, numero: "045", nome: "Mystical Elf" });
    const collection: Collection = new Map([["045", 5]]);

    const result = enrichCollection(collection, fakeCatalog([elf]));

    expect(result.items[0]?.quantity).toBe(5);
    expect(result.items[0]?.copyLimit).toBe(3);
  });

  it("discards a card number absent from the catalog and lists it in unknown", () => {
    const collection: Collection = new Map([["998", 1]]);

    const result = enrichCollection(collection, fakeCatalog([]));

    expect(result.items).toEqual([]);
    expect(result.unknown).toEqual(["998"]);
  });

  it("does not stop enrichment when an unknown card number is present", () => {
    const dragon = card();
    const collection: Collection = new Map([
      ["001", 1],
      ["998", 1],
    ]);

    const result = enrichCollection(collection, fakeCatalog([dragon]));

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.card.numero).toBe("001");
    expect(result.unknown).toEqual(["998"]);
  });

  it("orders items by ascending card number", () => {
    const collection: Collection = new Map([
      ["333", 1],
      ["001", 1],
      ["045", 1],
    ]);
    const cards = [
      card({ numero: "001" }),
      card({ id: 45, numero: "045" }),
      card({ id: 333, numero: "333" }),
    ];

    const result = enrichCollection(collection, fakeCatalog(cards));

    expect(result.items.map((item) => item.card.numero)).toEqual(["001", "045", "333"]);
  });

  it("does not add a field outside the canonical card schema", () => {
    const dragon = card();
    const collection: Collection = new Map([["001", 1]]);

    const result = enrichCollection(collection, fakeCatalog([dragon]));

    expect(Object.keys(result.items[0]?.card ?? {}).sort()).toEqual(Object.keys(dragon).sort());
  });

  it("returns empty items and unknown for an empty collection", () => {
    const result = enrichCollection(new Map(), fakeCatalog([]));
    expect(result.items).toEqual([]);
    expect(result.unknown).toEqual([]);
  });
});
