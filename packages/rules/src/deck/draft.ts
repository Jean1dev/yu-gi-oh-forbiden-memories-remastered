import {
  DomainError,
  err,
  ok,
  type ActiveDeckLookup,
  type CardNumber,
  type Collection,
  type DeckDraft,
  type Result,
} from "@yugioh/shared";

import { copyLimit, ownedQuantity } from "../collection/ownership.ts";

/**
 * Adds one copy of `cardNumber` from `ownedCollection` to `draft`. Reuses
 * `ownedQuantity`/`copyLimit` (build-deck/F01) instead of reimplementing the
 * `min(quantityOwned, 3)` cap (spec build-deck/F05 §3, Decision 7). Pure: does
 * not mutate `draft`, returns a new map on success.
 */
export function addCardToDraft(
  draft: DeckDraft,
  ownedCollection: Collection,
  cardNumber: CardNumber,
): Result<DeckDraft, DomainError> {
  const quantityOwned = ownedQuantity(ownedCollection, cardNumber);
  if (quantityOwned === 0) {
    return err(
      new DomainError("Card is not in the player's collection.", "card_not_owned", {
        cardNumber,
      }),
    );
  }

  const quantityInDraft = draft.get(cardNumber) ?? 0;
  const limit = copyLimit(quantityOwned);
  if (quantityInDraft >= limit) {
    if (quantityOwned >= 3) {
      return err(
        new DomainError("Maximum of 3 copies per card reached.", "max_copies_limit", {
          cardNumber,
          quantityInDraft,
        }),
      );
    }
    return err(
      new DomainError("Cannot add more copies than owned.", "owned_quantity_limit", {
        cardNumber,
        quantityOwned,
      }),
    );
  }

  const next = new Map(draft);
  next.set(cardNumber, quantityInDraft + 1);
  return ok(next);
}

/**
 * Removes one copy of `cardNumber` from `draft`, deleting the entry once it
 * reaches zero. The `card_not_in_draft` block is defensive only: normal UI
 * never offers a "remove" action for a card absent from the draft, so this
 * path exists to keep the function total instead of producing a negative
 * quantity under misuse (spec build-deck/F05 §3).
 */
export function removeCardFromDraft(
  draft: DeckDraft,
  cardNumber: CardNumber,
): Result<DeckDraft, DomainError> {
  const quantityInDraft = draft.get(cardNumber) ?? 0;
  if (quantityInDraft <= 0) {
    return err(
      new DomainError("Card is not in the draft.", "card_not_in_draft", { cardNumber }),
    );
  }

  const next = new Map(draft);
  if (quantityInDraft === 1) {
    next.delete(cardNumber);
  } else {
    next.set(cardNumber, quantityInDraft - 1);
  }
  return ok(next);
}

/** Sum of every quantity in `draft`; `0` for an empty draft. Can legitimately differ from 40 mid-edit (spec build-deck/F05 §3) — only F06 blocks on the total. */
export function totalCardsInDraft(draft: DeckDraft): number {
  let total = 0;
  for (const quantity of draft.values()) {
    total += quantity;
  }
  return total;
}

/** `true` iff `draft` and `originalActiveDeck` differ in any key or quantity — a full structural comparison, not just the total. */
export function draftDivergesFromActiveDeck(draft: DeckDraft, originalActiveDeck: DeckDraft): boolean {
  if (draft.size !== originalActiveDeck.size) {
    return true;
  }
  for (const [cardNumber, quantity] of draft) {
    if (originalActiveDeck.get(cardNumber) !== quantity) {
      return true;
    }
  }
  return false;
}

/**
 * Builds an `ActiveDeckLookup` (build-deck/F04 contract) backed by the live
 * draft instead of the neutral always-zero fallback F04 uses until this
 * feature exists (spec build-deck/F05 §3, Fluxo step 2). Never throws.
 */
export function createActiveDeckLookupFromDraft(draft: DeckDraft): ActiveDeckLookup {
  return (cardNumber) => draft.get(cardNumber) ?? 0;
}
