import {
  DEFAULT_LIBRARY_FILTERS,
  type Card,
  type CardNumber,
  type LibraryEntry,
  type LibraryFilterType,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { queryLibraryEntries } from "./query.ts";

const filterTypeArbitrary = fc.constantFrom<LibraryFilterType>(
  "monstro",
  "magica",
  "armadilha",
  "equipamento",
);
const entryArbitrary: fc.Arbitrary<LibraryEntry> = fc
  .tuple(fc.integer({ min: 1, max: 999 }), filterTypeArbitrary, fc.boolean())
  .map(([number, type, obtained]) => {
    const cardNumber = String(number).padStart(3, "0") as CardNumber;
    if (!obtained) {
      return { obtained: false, cardNumber, art: { kind: "silhouette" } };
    }
    const card: Card = {
      id: number,
      numero: cardNumber,
      nome: `${type} ${number}`,
      img: null,
      classe: "Dragon",
      atk: number,
      def: null,
      guardiao1: null,
      guardiao2: null,
      password: null,
      estrelas: number,
      tipo: type,
    };
    return { obtained: true, cardNumber, card, art: { kind: "placeholder" } };
  });

describe("library query properties", () => {
  it("returns only original objects and preserves blocked redaction", () => {
    fc.assert(
      fc.property(fc.array(entryArbitrary), (entries) => {
        const result = queryLibraryEntries({
          entries,
          filters: { ...DEFAULT_LIBRARY_FILTERS, status: "todas" },
        });
        result.entries.forEach((entry) => {
          expect(entries).toContain(entry);
          if (!entry.obtained) {
            expect(entry).not.toHaveProperty("card");
            expect(entry.art).toEqual({ kind: "silhouette" });
          }
        });
      }),
    );
  });

  it("never leaks blocked entries through a specific type filter", () => {
    fc.assert(
      fc.property(fc.array(entryArbitrary), filterTypeArbitrary, (entries, type) => {
        const result = queryLibraryEntries({
          entries,
          filters: { ...DEFAULT_LIBRARY_FILTERS, status: "todas", types: [type] },
        });
        expect(result.entries.every((entry) => entry.obtained && entry.card.tipo === type)).toBe(
          true,
        );
      }),
    );
  });

  it("is stable and deterministic for the same input", () => {
    fc.assert(
      fc.property(fc.array(entryArbitrary), (entries) => {
        const input = {
          entries,
          filters: {
            ...DEFAULT_LIBRARY_FILTERS,
            status: "todas" as const,
            sort: { field: "atk" as const, direction: "desc" as const },
          },
        };
        const first = queryLibraryEntries(input).entries.map((entry) => entry.cardNumber);
        const second = queryLibraryEntries(input).entries.map((entry) => entry.cardNumber);
        expect(second).toEqual(first);
      }),
    );
  });
});
