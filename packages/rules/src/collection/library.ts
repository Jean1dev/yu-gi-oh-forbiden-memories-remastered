import type { CardNumber, Collection } from "@yugioh/shared";

import { ownedEntries } from "./ownership.ts";

/**
 * The boolean owned/not-owned reading the Library (cross-PRD) expects: every
 * `cardNumber` with `quantity >= 1`. Same source as {@link ownedEntries}, one
 * derived view (spec build-deck/F01 §3, step 12) — the Library cross-references
 * this set with the full 722-card catalog to tell obtained from not obtained.
 */
export function deriveOwnedCardNumbers(collection: Collection): ReadonlySet<CardNumber> {
  return new Set(ownedEntries(collection).map((entry) => entry.cardNumber));
}
