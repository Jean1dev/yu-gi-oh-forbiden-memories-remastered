import type { Card, CardArtLookup, CardNumber, LibraryCatalogListing } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { buildLibraryIndex } from "./build-index.ts";
import { onlyObtained } from "./visibility.ts";

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

function fakeCatalog(cards: readonly Card[]): LibraryCatalogListing {
  return { listAll: () => cards, totalCount: () => cards.length };
}

const artLookup: CardArtLookup = () => ({ kind: "placeholder" });

describe("onlyObtained", () => {
  it("keeps only entries with obtained true", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001"), card("002"), card("003")]),
      obtainedCardNumbers: new Set(["001", "003"]),
      artLookup,
    });

    expect(onlyObtained(index.entries).map((entry) => entry.cardNumber)).toEqual(["001", "003"]);
  });

  it("discards blocked entries", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001"), card("002")]),
      obtainedCardNumbers: new Set(["001"]),
      artLookup,
    });

    expect(onlyObtained(index.entries).every((entry) => entry.obtained)).toBe(true);
  });

  it("preserves the relative order of the received entries", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001"), card("002"), card("003"), card("004")]),
      obtainedCardNumbers: new Set(["004", "002"]),
      artLookup,
    });

    expect(onlyObtained(index.entries).map((entry) => entry.cardNumber)).toEqual(["002", "004"]);
  });

  it("returns an empty list for an empty list", () => {
    expect(onlyObtained([])).toEqual([]);
  });

  it("returns an empty list when no card was obtained", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001"), card("002")]),
      obtainedCardNumbers: new Set(),
      artLookup,
    });

    expect(onlyObtained(index.entries)).toEqual([]);
  });
});
