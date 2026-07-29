import type { Card, CardNumber } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { fromCatalogPayload, toCatalogPayload } from "./catalog-payload.ts";
import type { LibraryCatalog } from "./types.ts";

function card(numero: CardNumber): Card {
  return {
    id: Number(numero),
    numero,
    nome: `Card ${numero}`,
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

function catalogOf(cards: readonly Card[]): LibraryCatalog {
  return {
    listing: { listAll: () => cards, totalCount: () => cards.length },
    artLookup: (cardNumber) => ({ kind: "art", path: `/cards-data/${cardNumber}.jpg` }),
  };
}

describe("catalog payload round trip", () => {
  it("preserves every card and its art across the server/client boundary", () => {
    const original = catalogOf([card("001"), card("002")]);

    const rebuilt = fromCatalogPayload(toCatalogPayload(original));

    expect(rebuilt).toBeDefined();
    expect(rebuilt?.listing.listAll()).toEqual(original.listing.listAll());
    expect(rebuilt?.listing.totalCount()).toBe(2);
    expect(rebuilt?.artLookup("001")).toEqual({ kind: "art", path: "/cards-data/001.jpg" });
  });

  it("survives JSON serialization, the form the payload actually travels in", () => {
    const payload = toCatalogPayload(catalogOf([card("001")]));

    const rebuilt = fromCatalogPayload(
      JSON.parse(JSON.stringify(payload)) as ReturnType<typeof toCatalogPayload>,
    );

    expect(rebuilt?.artLookup("001")).toEqual({ kind: "art", path: "/cards-data/001.jpg" });
  });

  it("reports no catalog at all when the server could not load one", () => {
    expect(fromCatalogPayload({ status: "error" })).toBeUndefined();
  });

  it("falls back to the placeholder for a card whose art did not travel", () => {
    const rebuilt = fromCatalogPayload({ status: "ok", cards: [card("001")], arts: {} });

    expect(rebuilt?.artLookup("001")).toEqual({ kind: "placeholder" });
  });

  it("never mistakes an inherited object key for a resolved art", () => {
    const rebuilt = fromCatalogPayload({ status: "ok", cards: [], arts: {} });

    // "toString" is not a card number, but it *is* on Object.prototype: without
    // the `hasOwn` guard this would hand `CardArt` a function.
    expect(rebuilt?.artLookup("toString" as CardNumber)).toEqual({ kind: "placeholder" });
  });
});
