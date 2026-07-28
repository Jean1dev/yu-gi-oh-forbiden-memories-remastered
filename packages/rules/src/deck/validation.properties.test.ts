import type { DeckDraft } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { validateDeckDraft } from "./validation.ts";

const cardNumberArb = fc.stringMatching(/^[0-9]{3}$/);
const quantityArb = fc.integer({ min: 0, max: 6 });
const mapArb = (valueArb: fc.Arbitrary<number>) =>
  fc.dictionary(cardNumberArb, valueArb).map((record) => new Map(Object.entries(record)) as DeckDraft);

describe("validateDeckDraft logical properties", () => {
  it("is valid if and only if none of the four violation conditions applies to any entry", () => {
    fc.assert(
      fc.property(mapArb(quantityArb), mapArb(quantityArb), (draft, ownedCollection) => {
        const result = validateDeckDraft(draft, ownedCollection);

        let total = 0;
        for (const quantity of draft.values()) {
          total += quantity;
        }
        const anyCondition =
          total !== 40 ||
          [...draft.entries()].some(
            ([cardNumber, quantityInDraft]) =>
              quantityInDraft > 3 || quantityInDraft > (ownedCollection.get(cardNumber) ?? 0),
          );

        expect(result.valid).toBe(!anyCondition);
        expect(result.violations.length === 0).toBe(result.valid);
      }),
      { numRuns: 1000 },
    );
  });

  it("never mutates the draft or the owned collection it receives", () => {
    fc.assert(
      fc.property(mapArb(quantityArb), mapArb(quantityArb), (draft, ownedCollection) => {
        const draftSnapshot = new Map(draft);
        const ownedSnapshot = new Map(ownedCollection);

        validateDeckDraft(draft, ownedCollection);

        expect(draft).toEqual(draftSnapshot);
        expect(ownedCollection).toEqual(ownedSnapshot);
      }),
      { numRuns: 1000 },
    );
  });
});
