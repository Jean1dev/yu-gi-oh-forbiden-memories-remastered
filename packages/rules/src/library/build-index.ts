import type {
  Card,
  CardArtLookup,
  CardNumber,
  LibraryCatalogListing,
  LibraryEntry,
  LibraryIndex,
} from "@yugioh/shared";

import { resolveArtReference } from "./art.ts";

/**
 * What {@link buildLibraryIndex} cross-references. Only `listAll`/`totalCount`
 * are needed — the cross-reference classifies cards it already has in hand
 * from the full listing, so it never calls a by-number lookup (spec
 * library/F01 §4 names `ConsultaCatalogo & ListagemCatalogo`, but
 * `ConsultaCatalogo`'s `getByNumero` is never actually invoked by this
 * algorithm; only the listing half is a real dependency).
 */
export type LibraryCrossReferenceInput = Readonly<{
  catalog: LibraryCatalogListing;
  /** `cardNumber`s the player owns (`quantity >= 1`), the boolean model (Decision 9). */
  obtainedCardNumbers: ReadonlySet<CardNumber>;
  artLookup: CardArtLookup;
}>;

function compareCardNumber(a: CardNumber, b: CardNumber): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function buildEntry(card: Card, obtained: boolean, artLookup: CardArtLookup): LibraryEntry {
  if (!obtained) {
    return Object.freeze({
      obtained: false as const,
      cardNumber: card.numero,
      art: resolveArtReference(card.numero, false, artLookup),
    });
  }
  return Object.freeze({
    obtained: true as const,
    cardNumber: card.numero,
    card,
    art: resolveArtReference(card.numero, true, artLookup),
  });
}

/**
 * Cross-references the full catalog listing with the set of obtained card
 * numbers (spec library/F01 §3, steps 5-9; PRD library §6 F01 Capabilities).
 *
 * The universe is the catalog, never the collection: every card the game has
 * gets an entry, obtained or not — that is what lets F04's not-obtained
 * status filter surface a card the player has never touched. A `cardNumber`
 * in `obtainedCardNumbers` with no matching card is excluded from `obtained`
 * and reported in `obtainedOutsideCatalog` instead (Decision 10) — the
 * invariant that keeps the "X of 722" indicator from ever reading past 722.
 *
 * Deterministic regardless of `obtainedCardNumbers`' iteration order: the
 * function only ever queries membership (`.has`), never iterates the set to
 * decide entry order — that order comes from sorting the catalog listing by
 * `cardNumber`.
 */
export function buildLibraryIndex(input: LibraryCrossReferenceInput): LibraryIndex {
  const { catalog, obtainedCardNumbers, artLookup } = input;

  const sortedCards = [...catalog.listAll()].sort((a, b) =>
    compareCardNumber(a.numero, b.numero),
  );

  const entries: LibraryEntry[] = [];
  const catalogCardNumbers = new Set<CardNumber>();

  for (const card of sortedCards) {
    catalogCardNumbers.add(card.numero);
    entries.push(buildEntry(card, obtainedCardNumbers.has(card.numero), artLookup));
  }

  const byCardNumber = new Map<CardNumber, LibraryEntry>(
    entries.map((entry) => [entry.cardNumber, entry] as const),
  );

  const obtainedOutsideCatalog = [...obtainedCardNumbers]
    .filter((cardNumber) => !catalogCardNumbers.has(cardNumber))
    .sort(compareCardNumber);

  return Object.freeze({
    entries: Object.freeze(entries),
    byCardNumber,
    total: catalog.totalCount(),
    obtained: entries.filter((entry) => entry.obtained).length,
    obtainedOutsideCatalog: Object.freeze(obtainedOutsideCatalog),
  });
}
