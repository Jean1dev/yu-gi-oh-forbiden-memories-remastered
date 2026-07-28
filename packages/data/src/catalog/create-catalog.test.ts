import { DomainError, type Card } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  BLUE_EYES_PASSWORD,
  INVALID_SEAL,
  UNKNOWN_PASSWORD,
  VALID_SEAL,
  catalogCards,
  catalogManifest,
  rawCardsWithBrokenRecord,
  rawCatalogCards,
} from "../../tests/fixtures/catalog-datasets.ts";
import { createCatalog, type CatalogInput } from "./create-catalog.ts";
import type { CardCatalog } from "./types.ts";

function build(overrides: Partial<CatalogInput> = {}) {
  return createCatalog({
    rawCards: rawCatalogCards(),
    manifest: catalogManifest(),
    seal: VALID_SEAL,
    ...overrides,
  });
}

/** Unwraps a catalog the test expects to exist, so each case reads about one thing. */
function buildOrFail(overrides: Partial<CatalogInput> = {}): CardCatalog {
  const result = build(overrides);
  if (!result.ok) {
    throw new Error(`catalog was expected to build: ${result.error.message}`);
  }
  return result.value;
}

describe("createCatalog", () => {
  it("refuses a dataset F02 did not seal as valid", () => {
    const result = build({ seal: INVALID_SEAL });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toBeInstanceOf(DomainError);
    expect(result.error.code).toBe("catalog_unavailable");
  });

  it("refuses a sealed dataset whose records no longer match the schema", () => {
    const result = build({ rawCards: rawCardsWithBrokenRecord() });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("dataset_inconsistent_with_seal");
    expect(result.error.details["numeros"]).toEqual(["001"]);
  });

  it("refuses everything when one record breaks, never a partial catalog", () => {
    const result = build({ rawCards: rawCardsWithBrokenRecord() });

    // The other five records parse cleanly; serving them would hide the sixth.
    expect(result.ok).toBe(false);
  });

  it("refuses a payload that is not a dataset at all", () => {
    const result = build({ rawCards: { cards: [] } });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("dataset_inconsistent_with_seal");
  });

  it("builds a working catalog from a valid seal and a clean dataset", () => {
    const catalog = buildOrFail();

    expect(catalog.totalCount()).toBe(catalogCards().length);
    expect(catalog.getByNumero("001")?.nome).toBe("Blue-eyes White Dragon");
  });

  it("counts every card type, zero included", () => {
    const catalog = buildOrFail();

    expect(catalog.countByTipo()).toEqual({
      monstro: 3,
      magica: 1,
      armadilha: 1,
      ritual: 1,
      equipamento: 0,
    });
  });

  it("counts only the classes the dataset holds", () => {
    const catalog = buildOrFail();

    expect(catalog.countByClasse()).toEqual({
      "Beast-Warrior": 1,
      Dragon: 1,
      Magic: 1,
      Ritual: 1,
      Trap: 1,
      Warrior: 1,
    });
  });

  it("exposes the art manifest it was handed, unchanged", () => {
    const catalog = buildOrFail();

    expect(catalog.getArtManifest()).toEqual(catalogManifest());
  });

  it("freezes each card, each list and the catalog itself", () => {
    const catalog = buildOrFail();

    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.getArtManifest())).toBe(true);
    expect(Object.isFrozen(catalog.listByTipo("monstro"))).toBe(true);
    for (const card of catalog.listByTipo("monstro")) {
      expect(Object.isFrozen(card)).toBe(true);
    }
  });

  it("does not let a caller mutate the source dataset through the catalog", () => {
    const manifest = { ...catalogManifest() };
    const catalog = buildOrFail({ manifest });

    manifest["001"] = "cards-data/tampered.jpg";

    expect(catalog.getArtManifest()["001"]).toBe("cards-data/001.jpg");
  });
});

describe("CardCatalog", () => {
  it("returns the card that carries the numero", () => {
    const catalog = buildOrFail();

    expect(catalog.getByNumero("003")?.nome).toBe("Celtic Guardian");
  });

  it("returns undefined for a numero no card carries", () => {
    const catalog = buildOrFail();

    expect(catalog.getByNumero("999")).toBeUndefined();
  });

  it("lists by tipo, classe and guardiao ascending by numero", () => {
    const catalog = buildOrFail();

    expect(catalog.listByTipo("monstro").map((card) => card.numero)).toEqual(["001", "002", "003"]);
    expect(catalog.listByClasse("Dragon").map((card) => card.numero)).toEqual(["001"]);
    expect(catalog.listByGuardiao("Mars").map((card) => card.numero)).toEqual(["001", "002"]);
  });

  it("returns an empty list, never undefined, for a key with no cards", () => {
    const catalog = buildOrFail();

    expect(catalog.listByTipo("equipamento")).toEqual([]);
    expect(catalog.listByClasse("Dinosaur")).toEqual([]);
    expect(catalog.listByGuardiao("Neptune")).toEqual([]);
  });

  it("rejects a malformed password without consulting the index", () => {
    const catalog = buildOrFail();

    for (const typed of ["", "senha-invalida", "8963 1139", "89 63 11 3", "89 63 11 39 "]) {
      expect(catalog.findByPassword(typed)).toEqual({
        found: false,
        reason: "invalid_format",
      });
    }
  });

  it("reports a well-formed password no card carries as not found", () => {
    const catalog = buildOrFail();

    expect(catalog.findByPassword(UNKNOWN_PASSWORD)).toEqual({
      found: false,
      reason: "not_found",
    });
  });

  it("returns the card for a password it does carry", () => {
    const catalog = buildOrFail();

    const result = catalog.findByPassword(BLUE_EYES_PASSWORD);

    expect(result.found).toBe(true);
    if (!result.found) {
      return;
    }
    expect(result.card.numero).toBe("001");
  });

  it("throws a TypeError when a consumer writes to a card it was handed", () => {
    const catalog = buildOrFail();
    const card = catalog.getByNumero("001");

    expect(card).toBeDefined();
    expect(() => {
      (card as unknown as { atk: number }).atk = 1;
    }).toThrow(TypeError);
  });

  it("throws a TypeError when a consumer writes to a list it was handed", () => {
    const catalog = buildOrFail();
    const monsters = catalog.listByTipo("monstro");

    expect(() => {
      (monsters as Card[]).push(catalogCards()[0] as Card);
    }).toThrow(TypeError);
  });

  it("answers getByNumero for every card in the dataset", () => {
    const catalog = buildOrFail();
    const cards = catalogCards();

    fc.assert(
      fc.property(fc.constantFrom(...cards), (card) => {
        expect(catalog.getByNumero(card.numero)).toEqual(card);
      }),
    );
  });

  it("places every card in the lists its own fields ask for", () => {
    const catalog = buildOrFail();

    fc.assert(
      fc.property(fc.constantFrom(...catalogCards()), (card) => {
        expect(catalog.listByTipo(card.tipo).map((found) => found.numero)).toContain(card.numero);
        expect(catalog.listByClasse(card.classe).map((found) => found.numero)).toContain(
          card.numero,
        );
        if (card.guardiao1 !== null) {
          expect(catalog.listByGuardiao(card.guardiao1).map((found) => found.numero)).toContain(
            card.numero,
          );
        }
        if (card.guardiao2 !== null) {
          expect(catalog.listByGuardiao(card.guardiao2).map((found) => found.numero)).toContain(
            card.numero,
          );
        }
      }),
    );
  });
});
