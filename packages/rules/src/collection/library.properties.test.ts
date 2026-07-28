import type { Collection } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { deriveOwnedCardNumbers } from "./library.ts";
import { ownedEntries } from "./ownership.ts";

const cardNumberArb = fc.integer({ min: 0, max: 999 }).map((n) => String(n).padStart(3, "0"));
const collectionArb = fc
  .dictionary(cardNumberArb, fc.integer({ min: 0, max: 5 }))
  .map((record) => new Map(Object.entries(record)) as Collection);

describe("deriveOwnedCardNumbers idempotence", () => {
  it("returns exactly the set of ownedEntries keys, for any collection", () => {
    fc.assert(
      fc.property(collectionArb, (collection) => {
        const derived = deriveOwnedCardNumbers(collection);
        const expected = new Set(ownedEntries(collection).map((entry) => entry.cardNumber));
        expect(derived).toEqual(expected);
      }),
      { numRuns: 1000 },
    );
  });
});
