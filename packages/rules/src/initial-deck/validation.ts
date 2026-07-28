import { DomainError, err, ok, type Collection, type Result } from "@yugioh/shared";

import { INITIAL_DECK_SIZE, MAX_COPIES_PER_CARD } from "./constants.ts";

/**
 * Safety net over an already-drawn deck (spec build-deck/F02 §3, step 9).
 * `drawInitialDeck` already guarantees the same invariants structurally, so
 * this should never reject a deck it produced — it exists as a testable
 * assertion that keeps holding even if the draw algorithm changes later
 * without anyone noticing it broke the guarantee.
 */
export function verifyGeneratedDeckInvariants(deck: Collection): Result<Collection, DomainError> {
  let total = 0;

  for (const [cardNumber, quantity] of deck) {
    total += quantity;
    if (quantity > MAX_COPIES_PER_CARD) {
      return err(
        new DomainError(
          `Generated initial deck is invalid: card ${cardNumber} has ${String(quantity)} copies, more than the maximum of ${String(MAX_COPIES_PER_CARD)}.`,
          "initial_deck_invalid",
          { cardNumber, quantity, maxCopies: MAX_COPIES_PER_CARD },
        ),
      );
    }
  }

  if (total !== INITIAL_DECK_SIZE) {
    return err(
      new DomainError(
        `Generated initial deck is invalid: total is ${String(total)}, expected ${String(INITIAL_DECK_SIZE)}.`,
        "initial_deck_invalid",
        { total, expected: INITIAL_DECK_SIZE },
      ),
    );
  }

  return ok(deck);
}
