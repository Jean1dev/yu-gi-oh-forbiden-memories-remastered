import type { Card, CardArtLookup, CardNumber, LibraryCatalogListing } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { buildLibraryIndex } from "./build-index.ts";

function card(numero: CardNumber, overrides: Partial<Card> = {}): Card {
  return {
    id: Number(numero),
    numero,
    nome: `Card ${numero}`,
    img: null,
    classe: "Dragon",
    atk: 100,
    def: 100,
    guardiao1: "Sun",
    guardiao2: "Mars",
    password: "89 63 11 39",
    estrelas: 50,
    tipo: "monstro",
    ...overrides,
  };
}

function fakeCatalog(cards: readonly Card[]): LibraryCatalogListing {
  return {
    listAll: () => cards,
    totalCount: () => cards.length,
  };
}

const silhouetteArtLookup: CardArtLookup = () => {
  throw new Error("art lookup must not be called for a not-obtained card");
};

function placeholderArtLookup(): CardArtLookup {
  return () => ({ kind: "placeholder" });
}

describe("buildLibraryIndex", () => {
  it("emits one entry for each card of the catalog", () => {
    const cards = [card("001"), card("002"), card("003")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(),
      artLookup: silhouetteArtLookup,
    });

    expect(result.entries).toHaveLength(3);
  });

  it("marks as obtained the card present in the obtained set", () => {
    const cards = [card("001")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(["001"]),
      artLookup: placeholderArtLookup(),
    });

    expect(result.entries[0]?.obtained).toBe(true);
  });

  it("marks as not obtained the card absent from the obtained set", () => {
    const cards = [card("001")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(),
      artLookup: silhouetteArtLookup,
    });

    expect(result.entries[0]?.obtained).toBe(false);
  });

  it("omits the card field on the not-obtained entry", () => {
    const cards = [card("001")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(),
      artLookup: silhouetteArtLookup,
    });

    expect(result.entries[0]).not.toHaveProperty("card");
  });

  it("attaches the twelve canonical fields on the obtained entry", () => {
    const dragon = card("001", { nome: "Blue-eyes White Dragon", atk: 3000, def: 2500 });

    const result = buildLibraryIndex({
      catalog: fakeCatalog([dragon]),
      obtainedCardNumbers: new Set(["001"]),
      artLookup: placeholderArtLookup(),
    });

    const entry = result.entries[0];
    expect(entry?.obtained).toBe(true);
    if (!entry?.obtained) return;
    expect(entry.card).toEqual(dragon);
  });

  it("does not add a field outside the card's canonical schema", () => {
    const dragon = card("001");

    const result = buildLibraryIndex({
      catalog: fakeCatalog([dragon]),
      obtainedCardNumbers: new Set(["001"]),
      artLookup: placeholderArtLookup(),
    });

    const entry = result.entries[0];
    expect(entry?.obtained).toBe(true);
    if (!entry?.obtained) return;
    expect(Object.keys(entry.card).sort()).toEqual(Object.keys(dragon).sort());
  });

  it("sorts entries by ascending cardNumber regardless of catalog listing order", () => {
    const cards = [card("003"), card("001"), card("002")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(),
      artLookup: silhouetteArtLookup,
    });

    expect(result.entries.map((entry) => entry.cardNumber)).toEqual(["001", "002", "003"]);
  });

  it("indexes byCardNumber with the same keys as entries", () => {
    const cards = [card("001"), card("002")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(),
      artLookup: silhouetteArtLookup,
    });

    expect([...result.byCardNumber.keys()].sort()).toEqual(
      result.entries.map((entry) => entry.cardNumber).sort(),
    );
  });

  it("uses the catalog's canonical total, not a literal", () => {
    const cards = [card("001"), card("002")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(),
      artLookup: silhouetteArtLookup,
    });

    expect(result.total).toBe(2);
  });

  it("ignores an obtained cardNumber absent from the catalog in the obtained count", () => {
    const cards = [card("001")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(["998"]),
      artLookup: silhouetteArtLookup,
    });

    expect(result.obtained).toBe(0);
  });

  it("lists an obtained cardNumber absent from the catalog in obtainedOutsideCatalog", () => {
    const cards = [card("001")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(["998"]),
      artLookup: silhouetteArtLookup,
    });

    expect(result.obtainedOutsideCatalog).toEqual(["998"]);
  });

  it("returns obtained zero for an empty collection", () => {
    const cards = [card("001"), card("002")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(),
      artLookup: silhouetteArtLookup,
    });

    expect(result.obtained).toBe(0);
  });

  it("returns obtained equal to total when every card was obtained", () => {
    const cards = [card("001"), card("002")];

    const result = buildLibraryIndex({
      catalog: fakeCatalog(cards),
      obtainedCardNumbers: new Set(["001", "002"]),
      artLookup: placeholderArtLookup(),
    });

    expect(result.obtained).toBe(result.total);
  });
});
