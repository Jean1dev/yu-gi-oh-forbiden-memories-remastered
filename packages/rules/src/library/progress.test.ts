import type { Card, CardArtLookup, CardNumber, LibraryCatalogListing } from "@yugioh/shared";
import { describe, expect, it } from "vitest";

import { buildLibraryIndex } from "./build-index.ts";
import { calculateProgress, findEntry, isObtained } from "./progress.ts";

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

describe("calculateProgress", () => {
  it("returns obtained and total from the index", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001"), card("002"), card("003")]),
      obtainedCardNumbers: new Set(["001"]),
      artLookup,
    });

    expect(calculateProgress(index)).toEqual({ obtained: 1, total: 3 });
  });

  it("returns obtained less than or equal to total", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001"), card("002")]),
      obtainedCardNumbers: new Set(["001", "002"]),
      artLookup,
    });

    const progress = calculateProgress(index);
    expect(progress.obtained).toBeLessThanOrEqual(progress.total);
  });
});

describe("findEntry", () => {
  it("returns the entry matching the cardNumber", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001")]),
      obtainedCardNumbers: new Set(),
      artLookup,
    });

    expect(findEntry(index, "001")?.cardNumber).toBe("001");
  });

  it("returns undefined for a cardNumber outside the catalog", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001")]),
      obtainedCardNumbers: new Set(),
      artLookup,
    });

    expect(findEntry(index, "999")).toBeUndefined();
  });
});

describe("isObtained", () => {
  it("returns false for a not-obtained card", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001")]),
      obtainedCardNumbers: new Set(),
      artLookup,
    });

    expect(isObtained(index, "001")).toBe(false);
  });

  it("returns false for a cardNumber not present in the catalog", () => {
    const index = buildLibraryIndex({
      catalog: fakeCatalog([card("001")]),
      obtainedCardNumbers: new Set(),
      artLookup,
    });

    expect(isObtained(index, "999")).toBe(false);
  });
});
