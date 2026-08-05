import type { CardNumber } from "@yugioh/shared";

/**
 * URL of a card's art, as served by `app/cards-data/[file]/route.ts`.
 *
 * The single place this URL is spelled out. The art manifest stores the same
 * file as a repository-relative path (`cards-data/001.jpg`) because that is the
 * coordinate system the ingestion pipeline works in; translating it into a URL
 * is the web layer's job, and doing it here keeps the Library (which resolves
 * art through the manifest) and Build Deck (which addresses it by card number)
 * from drifting apart.
 */
export function cardArtUrl(cardNumber: CardNumber): string {
  return `/cards-data/${cardNumber}.jpg`;
}

/**
 * URL of a card's crop art (`renderizacao-cartas/F03`: the illustration
 * alone, no frame), as served by `app/cards-data/art/[file]/route.ts`.
 */
export function cropArtUrl(cardNumber: CardNumber): string {
  return `/cards-data/art/${cardNumber}.jpg`;
}
