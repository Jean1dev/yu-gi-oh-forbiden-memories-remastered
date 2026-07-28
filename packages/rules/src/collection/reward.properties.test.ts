import type { CardNumber, Collection } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { incrementQuantity } from "./reward.ts";

const cardNumberArb = fc.integer({ min: 0, max: 999 }).map((n) => String(n).padStart(3, "0"));

const collectionArb: fc.Arbitrary<Collection> = fc
  .uniqueArray(fc.tuple(cardNumberArb, fc.integer({ min: 0, max: 10 })), {
    selector: ([cardNumber]) => cardNumber,
  })
  .map((entries) => new Map(entries));

describe("incrementQuantity domain property", () => {
  it("changes exactly the given card number's entry and leaves every other entry bit-for-bit equal, for any collection and card number", () => {
    fc.assert(
      fc.property(collectionArb, cardNumberArb, (collection, cardNumber) => {
        const before = collection.get(cardNumber) ?? 0;
        const result = incrementQuantity(collection, cardNumber);

        expect(result.get(cardNumber)).toBe(before + 1);
        for (const [otherCardNumber, quantity] of collection as ReadonlyMap<CardNumber, number>) {
          if (otherCardNumber === cardNumber) continue;
          expect(result.get(otherCardNumber)).toBe(quantity);
        }
        expect(result.size).toBe(collection.has(cardNumber) ? collection.size : collection.size + 1);
      }),
      { numRuns: 1000 },
    );
  });
});
