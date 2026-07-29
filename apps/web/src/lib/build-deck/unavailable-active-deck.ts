import type { ActiveDeckLookup } from "@yugioh/shared";

/**
 * Neutral fallback: reports zero copies in the deck for any card. Used until
 * build-deck/F02, F05 and F07 provide a real `ActiveDeckLookup` (spec
 * build-deck/F04, Decision 3) — the panel never breaks and never shows an
 * invented deck quantity, only "in deck 0" until the real contract exists.
 */
export function unavailableActiveDeck(): ActiveDeckLookup {
  return () => 0;
}
