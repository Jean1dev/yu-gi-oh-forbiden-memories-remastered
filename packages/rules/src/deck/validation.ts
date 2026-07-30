import type {
  Collection,
  DeckDraft,
  DeckDraftValidationResult,
  DeckDraftViolation,
} from "@yugioh/shared";
import { MAX_COPIES_PER_CARD, REQUIRED_DECK_SIZE } from "@yugioh/shared";

import { ownedQuantity } from "../collection/ownership.ts";
import { totalCardsInDraft } from "./draft.ts";

/** Deck-structure invariant (`product.md`, Fase 0.3): a valid deck has exactly this many cards. */

/**
 * Pure, read-only check of the deck draft against the three build-deck rules
 * (spec build-deck/F06 §3): exactly `TARGET_DECK_SIZE` cards, at most
 * `MAX_COPIES_PER_CARD` copies of any one card, and never more copies in the
 * draft than owned. A single `cardNumber` can accumulate both per-card
 * violations at once (Decision 5) — neither check short-circuits the other.
 * Never mutates `draft`/`ownedCollection`, never throws: always returns a
 * result, even for an empty draft.
 */
export function validateDeckDraft(
  draft: DeckDraft,
  ownedCollection: Collection,
): DeckDraftValidationResult {
  const total = totalCardsInDraft(draft);
  const violations: DeckDraftViolation[] = [];

  if (total < REQUIRED_DECK_SIZE) {
    violations.push(
      Object.freeze({ type: "insufficient_total", missing: REQUIRED_DECK_SIZE - total }),
    );
  } else if (total > REQUIRED_DECK_SIZE) {
    violations.push(Object.freeze({ type: "excessive_total", excess: total - REQUIRED_DECK_SIZE }));
  }

  const cardNumbers = [...draft.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const cardNumber of cardNumbers) {
    const quantityInDraft = draft.get(cardNumber) ?? 0;

    if (quantityInDraft > MAX_COPIES_PER_CARD) {
      violations.push(Object.freeze({ type: "copy_limit_exceeded", cardNumber, quantityInDraft }));
    }

    const quantityOwned = ownedQuantity(ownedCollection, cardNumber);
    if (quantityInDraft > quantityOwned) {
      violations.push(
        Object.freeze({
          type: "exceeds_owned_quantity",
          cardNumber,
          quantityInDraft,
          quantityOwned,
        }),
      );
    }
  }

  return Object.freeze({
    valid: violations.length === 0,
    total,
    violations: Object.freeze(violations),
  });
}
