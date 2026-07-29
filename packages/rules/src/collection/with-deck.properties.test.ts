import type { ActiveDeckLookup, Card, CardNumber, CollectionItem } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { withDeckQuantity } from "./with-deck.ts";

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

const itemArb: fc.Arbitrary<CollectionItem> = fc
  .tuple(
    fc.integer({ min: 0, max: 999 }),
    fc.integer({ min: 1, max: 3 }),
  )
  .map(([n, copyLimit]) => ({ card: card(String(n).padStart(3, "0")), quantity: copyLimit, copyLimit }));

const itemsArb = fc.array(itemArb, { maxLength: 30 });
const deckQuantitiesArb = fc.array(fc.integer({ min: 0, max: 5 }), { maxLength: 30 });

/** Builds a lookup from a positional list of deck quantities aligned with `items`. */
function lookupFromPositions(
  items: readonly CollectionItem[],
  quantities: readonly number[],
): ActiveDeckLookup {
  const byNumber = new Map(items.map((item, i) => [item.card.numero, quantities[i] ?? 0] as const));
  return (cardNumber) => byNumber.get(cardNumber) ?? 0;
}

describe("withDeckQuantity conservation property", () => {
  it("returns exactly |items| entries, in the same order, with limitReached always equal to deckQuantity >= copyLimit", () => {
    fc.assert(
      fc.property(itemsArb, deckQuantitiesArb, (items, quantities) => {
        const lookup = lookupFromPositions(items, quantities);
        const result = withDeckQuantity(items, lookup);

        expect(result).toHaveLength(items.length);
        expect(result.map((entry) => entry.card.numero)).toEqual(
          items.map((entry) => entry.card.numero),
        );
        for (const entry of result) {
          expect(entry.limitReached).toBe(entry.deckQuantity >= entry.copyLimit);
        }
      }),
      { numRuns: 1000 },
    );
  });
});
