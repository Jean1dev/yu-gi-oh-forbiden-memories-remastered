import type { Collection } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { deserializeCollection, serializeCollection } from "./serialization.ts";

const cardNumberArb = fc.integer({ min: 0, max: 999 }).map((n) => String(n).padStart(3, "0"));
const collectionArb = fc
  .dictionary(cardNumberArb, fc.integer({ min: 0, max: 999 }))
  .map((record) => new Map(Object.entries(record)) as Collection);

function sortedEntries(collection: Collection): (readonly [string, number])[] {
  return [...collection.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

describe("cache format round-trip", () => {
  it("deserializeCollection(serializeCollection(c)) equals c for any generated collection", () => {
    fc.assert(
      fc.property(collectionArb, (collection) => {
        const result = deserializeCollection(serializeCollection(collection));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(sortedEntries(result.value)).toEqual(sortedEntries(collection));
      }),
      { numRuns: 1000 },
    );
  });
});
