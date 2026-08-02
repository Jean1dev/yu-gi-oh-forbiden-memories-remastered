import {
  DEFAULT_BUILD_DECK_COLLECTION_FILTERS,
  type BuildDeckCollectionFilters,
  type BuildDeckCollectionSort,
  type Card,
  type CardNumber,
  type CardType,
  type CollectionItem,
  type GuardianStar,
} from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { queryCollectionItems } from "./query.ts";

const cardTypeArb = fc.constantFrom<CardType>(
  "monstro",
  "armadilha",
  "equipamento",
  "magica",
  "ritual",
);
const guardianArb = fc.constantFrom<GuardianStar>(
  "Sun",
  "Moon",
  "Mars",
  "Jupiter",
  "Mercury",
  "Neptune",
  "Pluto",
  "Saturn",
  "Uranus",
  "Venus",
);
const sortArb = fc.record<BuildDeckCollectionSort>({
  field: fc.constantFrom("numero", "nome", "atk", "def", "estrelas", "quantity"),
  direction: fc.constantFrom("asc", "desc"),
});

function maybe<T>(arb: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> {
  return fc.option(arb, { nil: undefined });
}

const filtersArb = fc.record<BuildDeckCollectionFilters>({
  cardType: maybe(cardTypeArb),
  cardClass: maybe(fc.constantFrom("Dragon", "Warrior", "Spellcaster", "Magic")),
  guardian: maybe(guardianArb),
});

function card(numero: CardNumber, type: CardType, cardClass: string, name: string): Card {
  return {
    id: Number(numero),
    numero,
    nome: name,
    img: null,
    classe: cardClass,
    atk: type === "monstro" ? Number(numero) : null,
    def: type === "monstro" ? 1000 - Number(numero) : null,
    guardiao1: type === "monstro" ? "Sun" : null,
    guardiao2: type === "monstro" ? "Moon" : null,
    password: null,
    estrelas: Number(numero),
    tipo: type,
  };
}

const itemArb: fc.Arbitrary<CollectionItem> = fc
  .tuple(
    fc.integer({ min: 1, max: 999 }),
    cardTypeArb,
    fc.constantFrom("Dragon", "Warrior", "Spellcaster", "Magic"),
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.integer({ min: 1, max: 20 }),
  )
  .map(([number, type, cardClass, name, quantity]) => {
    const cardNumber = String(number).padStart(3, "0") as CardNumber;
    return {
      card: card(cardNumber, type, cardClass, name),
      quantity,
      copyLimit: Math.min(quantity, 3),
    };
  });

function matchesFilters(item: CollectionItem, filters: BuildDeckCollectionFilters): boolean {
  return (
    (filters.cardType === undefined || item.card.tipo === filters.cardType) &&
    (filters.cardClass === undefined || item.card.classe === filters.cardClass) &&
    (filters.guardian === undefined ||
      item.card.guardiao1 === filters.guardian ||
      item.card.guardiao2 === filters.guardian)
  );
}

describe("collection query properties", () => {
  it("returns only original owned items that satisfy every active filter", () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { maxLength: 40 }),
        filtersArb,
        sortArb,
        (items, filters, sort) => {
          const result = queryCollectionItems(items, { term: "", filters, sort });

          for (const entry of result) {
            expect(items).toContain(entry);
            expect(matchesFilters(entry, filters)).toBe(true);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("keeps the default query as number-ascending over every item", () => {
    fc.assert(
      fc.property(fc.array(itemArb, { maxLength: 40 }), (items) => {
        const result = queryCollectionItems(items, {
          term: "",
          filters: DEFAULT_BUILD_DECK_COLLECTION_FILTERS,
          sort: { field: "numero", direction: "asc" },
        });

        expect(result.map((entry) => entry.card.numero)).toEqual(
          [...items]
            .sort((a, b) => a.card.numero.localeCompare(b.card.numero))
            .map((entry) => entry.card.numero),
        );
      }),
      { numRuns: 1000 },
    );
  });

  it("is deterministic for the same input", () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { maxLength: 40 }),
        filtersArb,
        sortArb,
        (items, filters, sort) => {
          const first = queryCollectionItems(items, { term: "", filters, sort });
          const second = queryCollectionItems(items, { term: "", filters, sort });
          expect(second).toEqual(first);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
