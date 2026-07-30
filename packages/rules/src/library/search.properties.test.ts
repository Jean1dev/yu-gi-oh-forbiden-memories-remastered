import type { Card, CardNumber, LibraryEntry } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { filterLibrarySearch, normalizeLibrarySearchTerm, prepareLibrarySearch } from "./search.ts";

const cardNumberArbitrary = fc
  .integer({ min: 1, max: 999 })
  .map((value) => String(value).padStart(3, "0") as CardNumber);

function obtained(cardNumber: CardNumber, name: string): LibraryEntry {
  const card: Card = {
    id: Number(cardNumber),
    numero: cardNumber,
    nome: name,
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
  return { obtained: true, cardNumber, card, art: { kind: "placeholder" } };
}

const entryArbitrary: fc.Arbitrary<LibraryEntry> = fc
  .tuple(cardNumberArbitrary, fc.string(), fc.boolean())
  .map(([cardNumber, name, isObtained]) =>
    isObtained
      ? obtained(cardNumber, name)
      : { obtained: false, cardNumber, art: { kind: "silhouette" } },
  );

describe("library search properties", () => {
  it("normalization is idempotent over its apparent text", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const once = normalizeLibrarySearchTerm(value);
        const twice = normalizeLibrarySearchTerm(once.originalText);
        expect(twice).toEqual(once);
      }),
    );
  });

  it("an empty term is identity and preserves references", () => {
    fc.assert(
      fc.property(fc.array(entryArbitrary), (entries) => {
        const result = filterLibrarySearch(
          prepareLibrarySearch(entries),
          normalizeLibrarySearchTerm(""),
        );
        expect(result).toHaveLength(entries.length);
        result.forEach((entry, index) => expect(entry).toBe(entries[index]));
      }),
    );
  });

  it("every result is a subsequence in the same relative order", () => {
    fc.assert(
      fc.property(fc.array(entryArbitrary), fc.string(), (entries, value) => {
        const result = filterLibrarySearch(
          prepareLibrarySearch(entries),
          normalizeLibrarySearchTerm(value),
        );
        let cursor = 0;
        for (const resultEntry of result) {
          while (entries[cursor] !== resultEntry) cursor += 1;
          expect(cursor).toBeLessThan(entries.length);
          cursor += 1;
        }
      }),
    );
  });

  it("never includes a blocked entry for a nonnumeric term", () => {
    fc.assert(
      fc.property(cardNumberArbitrary, fc.stringMatching(/^[A-Za-z]+$/u), (cardNumber, term) => {
        const entry: LibraryEntry = {
          obtained: false,
          cardNumber,
          art: { kind: "silhouette" },
        };
        expect(
          filterLibrarySearch(prepareLibrarySearch([entry]), normalizeLibrarySearchTerm(term)),
        ).toEqual([]);
      }),
    );
  });

  it("canonicalizes every card number in the accepted range", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 722 }), (value) => {
        expect(normalizeLibrarySearchTerm(String(value)).cardNumber).toBe(
          String(value).padStart(3, "0"),
        );
      }),
    );
  });

  it("is deterministic for the same index and term", () => {
    fc.assert(
      fc.property(fc.array(entryArbitrary), fc.string(), (entries, value) => {
        const index = prepareLibrarySearch(entries);
        const term = normalizeLibrarySearchTerm(value);
        expect(filterLibrarySearch(index, term)).toEqual(filterLibrarySearch(index, term));
      }),
      { numRuns: 1000 },
    );
  });
});
