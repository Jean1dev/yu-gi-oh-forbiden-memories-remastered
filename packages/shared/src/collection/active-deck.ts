import type { CardNumber } from "../card/types.ts";
import type { CollectionItem } from "./types.ts";

/**
 * Lookup port: how many copies of `cardNumber` currently sit in the active
 * deck, `0` when the card is not in it — same shape as `CardCatalogLookup`
 * (spec build-deck/F04 §4). No implementation exists yet: build-deck/F02,
 * F05 and F07 are expected to provide one; until then, callers inject a
 * neutral fallback that always returns zero (spec build-deck/F04, Decision 3).
 */
export type ActiveDeckLookup = (cardNumber: CardNumber) => number;

/** A `CollectionItem` (build-deck/F01) composed with its quantity in the active deck. */
export type CollectionItemWithDeck = CollectionItem &
  Readonly<{
    deckQuantity: number;
    limitReached: boolean;
  }>;
