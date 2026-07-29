import type { CardNumber, Collection, DeckDraft } from "@yugioh/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { copyLimit } from "../collection/ownership.ts";
import { addCardToDraft, removeCardFromDraft, totalCardsInDraft } from "./draft.ts";

const CARD_NUMBERS: readonly CardNumber[] = ["001", "002", "003"];

const ownedCollectionArbitrary = fc
  .tuple(...CARD_NUMBERS.map(() => fc.integer({ min: 0, max: 5 })))
  .map((quantities): Collection => new Map(CARD_NUMBERS.map((cardNumber, index) => [cardNumber, quantities[index] ?? 0])));

const operationArbitrary = fc.record({
  cardNumber: fc.constantFrom(...CARD_NUMBERS),
  kind: fc.constantFrom<"add" | "remove">("add", "remove"),
});

function applyOperation(
  draft: DeckDraft,
  owned: Collection,
  operation: { cardNumber: CardNumber; kind: "add" | "remove" },
): DeckDraft {
  const result =
    operation.kind === "add"
      ? addCardToDraft(draft, owned, operation.cardNumber)
      : removeCardFromDraft(draft, operation.cardNumber);
  return result.ok ? result.value : draft;
}

describe("addCardToDraft/removeCardFromDraft sequence property", () => {
  it("never leaves a card's quantity negative nor above its copy limit, for any random sequence of valid adds and removes", () => {
    fc.assert(
      fc.property(
        ownedCollectionArbitrary,
        fc.array(operationArbitrary, { maxLength: 30 }),
        (owned, operations) => {
          let draft: DeckDraft = new Map();
          for (const operation of operations) {
            draft = applyOperation(draft, owned, operation);
          }

          for (const cardNumber of CARD_NUMBERS) {
            const quantityInDraft = draft.get(cardNumber) ?? 0;
            const limit = copyLimit(owned.get(cardNumber) ?? 0);
            expect(quantityInDraft).toBeGreaterThanOrEqual(0);
            expect(quantityInDraft).toBeLessThanOrEqual(limit);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("totalCardsInDraft round-trip property", () => {
  it("after a random sequence of adds and removes always equals the manual sum of the resulting map's values", () => {
    fc.assert(
      fc.property(
        ownedCollectionArbitrary,
        fc.array(operationArbitrary, { maxLength: 30 }),
        (owned, operations) => {
          let draft: DeckDraft = new Map();
          for (const operation of operations) {
            draft = applyOperation(draft, owned, operation);
          }

          const manualTotal = [...draft.values()].reduce((sum, quantity) => sum + quantity, 0);
          expect(totalCardsInDraft(draft)).toBe(manualTotal);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
