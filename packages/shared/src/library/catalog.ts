import type { Card, CardNumber } from "../card/types.ts";
import type { ObtainedArtReference } from "./types.ts";

/**
 * Full-dataset listing capability the Library needs on top of
 * `CardCatalogLookup`'s single-number lookup: enumerate every card of the
 * game and report the canonical count (spec library/F01, Decision 8). `total`
 * is `listAll().length` in every real implementation — kept as its own method
 * because it is the one `banco-de-cartas`/F03 already publishes
 * (`CardCatalog.totalCount()`), so an adapter never has to recompute it.
 *
 * Declared here, consumed by `packages/rules/src/library` through injection;
 * implemented by `banco-de-cartas`/F03 (`packages/data`), which has no single
 * "list every card" method of its own — `apps/web` composes one from the
 * five type indexes `CardCatalog` already publishes, the same pattern
 * build-deck/F02 used to compose `CardPoolLookup`.
 */
export type LibraryCatalogListing = Readonly<{
  /** Every card of the game. Order is not contractual — the rule sorts. */
  listAll(): readonly Card[];
  /** The canonical card count (722), single source for the "X of 722" indicator. */
  totalCount(): number;
}>;

/**
 * Art resolution port for an **obtained** card only (spec library/F01,
 * Decision 3): the not-obtained case never calls this, because there is no
 * path to resolve for a card that must not reveal its art. Declared here,
 * implemented by `banco-de-cartas`/F04 (`packages/data`'s `ArtResolver`,
 * adapted in `apps/web`).
 */
export type CardArtLookup = (cardNumber: CardNumber) => ObtainedArtReference;
