import type { Card, CardCatalogLookup, CardNumber, Collection } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { enrichCollection } from "./enrich.ts";

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

/** A collection of unique card numbers, each with a positive quantity, plus which of them the catalog knows. */
const scenarioArb = fc
  .uniqueArray(cardNumberArb, { minLength: 0, maxLength: 30 })
  .chain((cardNumbers) =>
    fc.record({
      cardNumbers: fc.constant(cardNumbers),
      quantities: fc.array(fc.integer({ min: 1, max: 5 }), {
        minLength: cardNumbers.length,
        maxLength: cardNumbers.length,
      }),
      knownFlags: fc.array(fc.boolean(), {
        minLength: cardNumbers.length,
        maxLength: cardNumbers.length,
      }),
    }),
  );

function buildCatalog(cardNumbers: readonly CardNumber[], knownFlags: readonly boolean[]): CardCatalogLookup {
  const known = new Map<CardNumber, Card>();
  cardNumbers.forEach((cardNumber, i) => {
    if (knownFlags[i]) {
      known.set(cardNumber, card(cardNumber));
    }
  });
  return (cardNumber: CardNumber) => known.get(cardNumber);
}

describe("enrichCollection conservation", () => {
  it("|items| + |unknown| always equals the number of owned entries, for any collection and any partial catalog", () => {
    fc.assert(
      fc.property(scenarioArb, ({ cardNumbers, quantities, knownFlags }) => {
        const collection: Collection = new Map(
          cardNumbers.map((cardNumber, i) => [cardNumber, quantities[i] as number]),
        );
        const catalog = buildCatalog(cardNumbers, knownFlags);

        const result = enrichCollection(collection, catalog);

        expect(result.items.length + result.unknown.length).toBe(cardNumbers.length);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("enrichCollection ordering independent of insertion", () => {
  it("returns items in the same order regardless of the insertion order of the entries", () => {
    fc.assert(
      fc.property(scenarioArb, fc.integer(), ({ cardNumbers, quantities, knownFlags }, seed) => {
        const entries = cardNumbers.map(
          (cardNumber, i) => [cardNumber, quantities[i] as number] as const,
        );
        const shuffled = [...entries];
        let rngState = seed >>> 0;
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
          rngState = (rngState * 1_664_525 + 1_013_904_223) >>> 0;
          const j = rngState % (i + 1);
          const tmp = shuffled[i] as (typeof shuffled)[number];
          shuffled[i] = shuffled[j] as (typeof shuffled)[number];
          shuffled[j] = tmp;
        }

        const catalog = buildCatalog(cardNumbers, knownFlags);
        const originalOrder = enrichCollection(new Map(entries), catalog).items.map(
          (item) => item.card.numero,
        );
        const shuffledOrder = enrichCollection(new Map(shuffled), catalog).items.map(
          (item) => item.card.numero,
        );

        expect(shuffledOrder).toEqual(originalOrder);
      }),
      { numRuns: 1000 },
    );
  });
});
