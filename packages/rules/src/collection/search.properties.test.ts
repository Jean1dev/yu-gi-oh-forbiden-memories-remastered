import type { Card, CardNumber, CollectionItem } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { searchByName } from "./search.ts";

function card(numero: CardNumber, nome: string): Card {
  return {
    id: 1,
    numero,
    nome,
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

const nameArb = fc
  .array(fc.constantFrom("dragon", "elf", "warrior", "magician", "beast", " "), {
    minLength: 1,
    maxLength: 4,
  })
  .map((parts) => parts.join(" ").trim() || "card");

const itemArb: fc.Arbitrary<CollectionItem> = fc
  .tuple(fc.integer({ min: 0, max: 999 }), nameArb)
  .map(([n, nome]) => ({ card: card(String(n).padStart(3, "0"), nome), quantity: 1, copyLimit: 1 }));

const itemsArb = fc.array(itemArb, { maxLength: 30 });
const termArb = fc.oneof(nameArb, fc.constant(""), fc.constant("   "));

describe("searchByName correctness property", () => {
  it("every item returned has a normalized name containing the normalized term, and none excluded would have matched", () => {
    fc.assert(
      fc.property(itemsArb, termArb, (items, term) => {
        const normalizedTerm = term.trim().toLowerCase();
        const result = searchByName(items, term);

        for (const returned of result) {
          expect(returned.card.nome.toLowerCase()).toContain(normalizedTerm);
        }

        const expectedNumbers = items
          .filter((entry) => entry.card.nome.toLowerCase().includes(normalizedTerm))
          .map((entry) => entry.card.numero);
        expect(result.map((entry) => entry.card.numero)).toEqual(expectedNumbers);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("searchByName empty-term neutrality property", () => {
  it("returns every item unchanged when the term is empty, for any item list", () => {
    fc.assert(
      fc.property(itemsArb, (items) => {
        expect(searchByName(items, "")).toEqual(items);
      }),
      { numRuns: 1000 },
    );
  });
});
