import type {
  CardCatalogLookup,
  CardNumber,
  Collection,
  CollectionItem,
  EnrichedCollection,
} from "@yugioh/shared";

import { copyLimit, ownedEntries } from "./ownership.ts";

/**
 * Cross-references the owned entries with the catalog. A `cardNumber` with no
 * matching card is not an error: it is omitted from `items` and reported in
 * `unknown` instead, so one bad reference never blocks the whole collection
 * from loading (spec build-deck/F01 §6).
 *
 * `items` inherits the ascending order of {@link ownedEntries}, so the result
 * does not depend on the iteration order of `collection`.
 */
export function enrichCollection(
  collection: Collection,
  catalog: CardCatalogLookup,
): EnrichedCollection {
  const items: CollectionItem[] = [];
  const unknown: CardNumber[] = [];

  for (const entry of ownedEntries(collection)) {
    const card = catalog(entry.cardNumber);
    if (card === undefined) {
      unknown.push(entry.cardNumber);
      continue;
    }
    items.push(
      Object.freeze({ card, quantity: entry.quantity, copyLimit: copyLimit(entry.quantity) }),
    );
  }

  return Object.freeze({ items: Object.freeze(items), unknown: Object.freeze(unknown) });
}
