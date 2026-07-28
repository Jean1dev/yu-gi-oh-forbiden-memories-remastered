import type { Card, CardCatalogLookup, CardNumber, Collection } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { incrementQuantity, validateRewardCardNumber } from "./reward.ts";

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

describe("incrementQuantity", () => {
  it("adds one to a card already owned", () => {
    const collection: Collection = new Map([["001", 2]]);
    const result = incrementQuantity(collection, "001");
    expect(result.get("001")).toBe(3);
  });

  it("creates the entry with quantity one for a card not yet owned", () => {
    const result = incrementQuantity(new Map(), "045");
    expect(result.get("045")).toBe(1);
  });

  it("does not mutate the collection it received", () => {
    const collection: Collection = new Map([["001", 2]]);
    incrementQuantity(collection, "001");
    expect(collection.get("001")).toBe(2);
  });

  it("preserves the collection's other entries", () => {
    const collection: Collection = new Map([
      ["001", 2],
      ["333", 1],
    ]);
    const result = incrementQuantity(collection, "001");
    expect(result.get("333")).toBe(1);
  });
});

describe("validateRewardCardNumber", () => {
  it("accepts a card number present in the catalog", () => {
    const result = validateRewardCardNumber("001", fakeCatalog([card()]));
    expect(result).toEqual({ ok: true, value: "001" });
  });

  it("rejects a card number absent from the catalog with invalid_reward_card", () => {
    const result = validateRewardCardNumber("998", fakeCatalog([]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_reward_card");
  });
});
