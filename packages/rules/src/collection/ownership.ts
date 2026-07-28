import type { CardNumber, Collection, CollectionEntry } from "@yugioh/shared";

/**
 * Deck-structure invariant (`product.md`, Fase 0.3): at most 3 copies of any
 * one card in a deck. This module is the single place this number is
 * expressed — F05/F06 consume {@link copyLimit} instead of hard-coding it.
 */
const MAX_COPIES_PER_CARD = 3;

/** Owned pairs only (`quantity >= 1`), ordered by ascending card number. */
export function ownedEntries(collection: Collection): readonly CollectionEntry[] {
  return Object.freeze(
    [...collection.entries()]
      .filter(([, quantity]) => quantity >= 1)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([cardNumber, quantity]) => Object.freeze({ cardNumber, quantity })),
  );
}

/** `0` when the card is absent from the collection — never `undefined`. */
export function ownedQuantity(collection: Collection, cardNumber: CardNumber): number {
  return collection.get(cardNumber) ?? 0;
}

export function owns(collection: Collection, cardNumber: CardNumber): boolean {
  return ownedQuantity(collection, cardNumber) >= 1;
}

/**
 * The cap on copies of a card in the deck: the smaller of what the player
 * owns and the game's own 3-copy limit. Never larger than `quantity`, never
 * larger than 3.
 */
export function copyLimit(quantity: number): number {
  return Math.min(quantity, MAX_COPIES_PER_CARD);
}
