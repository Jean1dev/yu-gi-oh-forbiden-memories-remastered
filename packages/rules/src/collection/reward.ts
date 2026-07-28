import {
  DomainError,
  err,
  ok,
  type CardCatalogLookup,
  type CardNumber,
  type Collection,
  type Result,
} from "@yugioh/shared";

/**
 * Adds one copy of `cardNumber` to the collection, creating the entry with
 * quantity 1 if it was absent. Pure: no I/O, does not mutate `collection`,
 * and every other entry is preserved (spec build-deck/F03 §3). Repeated
 * application is only prevented from being *effectively* applied more than
 * once by the caller's idempotency layer (the reward queue and
 * `reward_ledger`), not by this function itself — calling it twice always
 * sums twice.
 */
export function incrementQuantity(collection: Collection, cardNumber: CardNumber): Collection {
  const next = new Map(collection);
  next.set(cardNumber, (next.get(cardNumber) ?? 0) + 1);
  return next;
}

/**
 * Rejects a reward whose card number has no match in the catalog, before any
 * write happens (spec build-deck/F03, Decision 7) — an unknown `cardNumber`
 * never reaches `reward_ledger` or `collections`.
 */
export function validateRewardCardNumber(
  cardNumber: CardNumber,
  catalog: CardCatalogLookup,
): Result<CardNumber, DomainError> {
  if (catalog(cardNumber) === undefined) {
    return err(
      new DomainError(`Unknown card number in reward: ${cardNumber}`, "invalid_reward_card", {
        cardNumber,
      }),
    );
  }
  return ok(cardNumber);
}
