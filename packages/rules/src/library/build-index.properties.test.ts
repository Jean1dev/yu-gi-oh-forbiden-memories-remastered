import type { Card, CardArtLookup, CardNumber, LibraryCatalogListing } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { buildLibraryIndex } from "./build-index.ts";

function card(numero: CardNumber): Card {
  return {
    id: 1,
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

const cardNumberArb = fc.integer({ min: 0, max: 999 }).map((n) => String(n).padStart(3, "0"));

const scenarioArb = fc
  .uniqueArray(cardNumberArb, { minLength: 0, maxLength: 30 })
  .chain((catalogNumbers) =>
    fc.record({
      catalogNumbers: fc.constant(catalogNumbers),
      obtainedNumbers: fc.uniqueArray(cardNumberArb, { minLength: 0, maxLength: 30 }),
    }),
  );

function fakeCatalog(numbers: readonly CardNumber[]): LibraryCatalogListing {
  const cards = numbers.map(card);
  return { listAll: () => cards, totalCount: () => cards.length };
}

const artLookup: CardArtLookup = () => ({ kind: "placeholder" });

describe("buildLibraryIndex conservation of the universe", () => {
  it("|entries| always equals catalog.totalCount(), for any catalog and any obtained set", () => {
    fc.assert(
      fc.property(scenarioArb, ({ catalogNumbers, obtainedNumbers }) => {
        const index = buildLibraryIndex({
          catalog: fakeCatalog(catalogNumbers),
          obtainedCardNumbers: new Set(obtainedNumbers),
          artLookup,
        });

        expect(index.entries.length).toBe(catalogNumbers.length);
        expect(index.total).toBe(catalogNumbers.length);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("buildLibraryIndex count invariant", () => {
  it("0 <= obtained <= total, and obtained is exactly the intersection with the catalog", () => {
    fc.assert(
      fc.property(scenarioArb, ({ catalogNumbers, obtainedNumbers }) => {
        const index = buildLibraryIndex({
          catalog: fakeCatalog(catalogNumbers),
          obtainedCardNumbers: new Set(obtainedNumbers),
          artLookup,
        });
        const catalogSet = new Set(catalogNumbers);
        const expectedObtained = obtainedNumbers.filter((n) => catalogSet.has(n)).length;

        expect(index.obtained).toBeGreaterThanOrEqual(0);
        expect(index.obtained).toBeLessThanOrEqual(index.total);
        expect(index.obtained).toBe(expectedObtained);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("buildLibraryIndex total redaction", () => {
  it("no not-obtained entry carries a card field or a path on its art reference", () => {
    fc.assert(
      fc.property(scenarioArb, ({ catalogNumbers, obtainedNumbers }) => {
        const index = buildLibraryIndex({
          catalog: fakeCatalog(catalogNumbers),
          obtainedCardNumbers: new Set(obtainedNumbers),
          artLookup,
        });

        for (const entry of index.entries) {
          if (!entry.obtained) {
            expect(entry).not.toHaveProperty("card");
            expect(entry.art).not.toHaveProperty("path");
          }
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe("buildLibraryIndex insertion-order independence", () => {
  it("returns identical entries in the same order regardless of the obtained set's insertion order", () => {
    fc.assert(
      fc.property(scenarioArb, fc.integer(), ({ catalogNumbers, obtainedNumbers }, seed) => {
        const shuffled = [...obtainedNumbers];
        let rngState = seed >>> 0;
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
          rngState = (rngState * 1_664_525 + 1_013_904_223) >>> 0;
          const j = rngState % (i + 1);
          const tmp = shuffled[i] as CardNumber;
          shuffled[i] = shuffled[j] as CardNumber;
          shuffled[j] = tmp;
        }

        const original = buildLibraryIndex({
          catalog: fakeCatalog(catalogNumbers),
          obtainedCardNumbers: new Set(obtainedNumbers),
          artLookup,
        });
        const reordered = buildLibraryIndex({
          catalog: fakeCatalog(catalogNumbers),
          obtainedCardNumbers: new Set(shuffled),
          artLookup,
        });

        expect(reordered.entries).toEqual(original.entries);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("buildLibraryIndex dual-view coherence", () => {
  it("byCardNumber has exactly the same keys as entries, pointing at the same objects", () => {
    fc.assert(
      fc.property(scenarioArb, ({ catalogNumbers, obtainedNumbers }) => {
        const index = buildLibraryIndex({
          catalog: fakeCatalog(catalogNumbers),
          obtainedCardNumbers: new Set(obtainedNumbers),
          artLookup,
        });

        expect([...index.byCardNumber.keys()].sort()).toEqual(
          index.entries.map((entry) => entry.cardNumber).sort(),
        );
        for (const entry of index.entries) {
          expect(index.byCardNumber.get(entry.cardNumber)).toBe(entry);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe("buildLibraryIndex idempotence", () => {
  it("applying buildLibraryIndex twice over the same inputs produces structurally equal indexes", () => {
    fc.assert(
      fc.property(scenarioArb, ({ catalogNumbers, obtainedNumbers }) => {
        const input = {
          catalog: fakeCatalog(catalogNumbers),
          obtainedCardNumbers: new Set(obtainedNumbers),
          artLookup,
        };

        const first = buildLibraryIndex(input);
        const second = buildLibraryIndex(input);

        expect(second.entries).toEqual(first.entries);
        expect(second.total).toBe(first.total);
        expect(second.obtained).toBe(first.obtained);
        expect(second.obtainedOutsideCatalog).toEqual(first.obtainedOutsideCatalog);
      }),
      { numRuns: 1000 },
    );
  });
});
