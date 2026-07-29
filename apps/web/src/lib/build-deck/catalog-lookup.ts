import type { Card, CardCatalogLookup } from "@yugioh/shared";

/**
 * Builds a `CardCatalogLookup` from the flat card list `page.tsx` loads
 * server-side (spec build-deck/F04 §3, Fluxo step 5). Shared by F04's
 * collection panel and F05's deck editor so both read the same catalog shape
 * without either duplicating this map or importing from one another.
 */
export function buildCatalogLookup(cards: readonly Card[]): CardCatalogLookup {
  const byNumber = new Map(cards.map((card) => [card.numero, card] as const));
  return (cardNumber) => byNumber.get(cardNumber);
}
