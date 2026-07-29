import type { ActiveDeckLookup, CollectionItem, CollectionItemWithDeck } from "@yugioh/shared";

/**
 * Attaches each item's current quantity in the active deck and whether the
 * copy limit is reached, reusing `copyLimit` already computed by F01 instead
 * of recomputing the 3-copy cap (spec build-deck/F04 §3, Decision 9).
 * Preserves the order and count of `items`; never mutates it.
 */
export function withDeckQuantity(
  items: readonly CollectionItem[],
  activeDeckLookup: ActiveDeckLookup,
): readonly CollectionItemWithDeck[] {
  return items.map((item) => {
    const deckQuantity = activeDeckLookup(item.card.numero);
    return Object.freeze({
      ...item,
      deckQuantity,
      limitReached: deckQuantity >= item.copyLimit,
    });
  });
}
