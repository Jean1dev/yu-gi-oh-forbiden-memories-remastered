import type { Card, CardNumber, CardType, GuardianStar } from "@yugioh/shared";

import type { ArtManifest } from "../ingestion/art-manifest.ts";

/**
 * Contract of the card catalog — the runtime access layer every consumer
 * programs against.
 *
 * Method names that key on a card field keep that field's name from the source
 * dataset (`numero`, `tipo`, `classe`, `guardiao`), the same rule the canonical
 * `Card` follows: they are data, not identifiers. They are also the names the
 * PRD hands to the cross-PRD consumers (Library, Build Deck, Motor de Duelo
 * 1x1, Password), so they are part of the published contract.
 *
 * Every method answers from an index built once at construction: none of them
 * scans, sorts or counts anything (spec F03, Decision 8).
 */
export type CardCatalog = Readonly<{
  /** `undefined` — never an empty record — when no card carries that number. */
  getByNumero(numero: CardNumber): Card | undefined;
  /** Ascending by `numero`; `[]` when no card has that type. */
  listByTipo(tipo: CardType): readonly Card[];
  /** Ascending by `numero`; `[]` when no card has that class. */
  listByClasse(classe: string): readonly Card[];
  /** Ascending by `numero`; a card with two distinct stars appears under both. */
  listByGuardiao(guardiao: GuardianStar): readonly Card[];
  findByPassword(password: string): PasswordLookupResult;
  /** The canonical count (722), single source for the cross-PRD consumers. */
  totalCount(): number;
  countByTipo(): Readonly<Record<CardType, number>>;
  countByClasse(): Readonly<Record<string, number>>;
  /** The manifest as F01 emitted it: existing art only, no placeholder logic. */
  getArtManifest(): ArtManifest;
  /**
   * The crop-art manifest (`renderizacao-cartas/F03`): art alone, no frame,
   * for the cards the pilot has migrated. `{}` until a card is enriched.
   */
  getCropArtManifest(): ArtManifest;
}>;

/**
 * Outcome of a password lookup.
 *
 * A bare `undefined` would collapse two cases the PRD keeps apart: a string
 * that is not a password at all, and a well-formed password no card carries.
 * Password (cross-PRD) shows a different message for each, so the distinction
 * travels in the return type instead of being re-derived by the caller
 * (spec F03, Decision 4).
 */
export type PasswordLookupResult =
  | Readonly<{ found: true; card: Card }>
  | Readonly<{ found: false; reason: "invalid_format" }>
  | Readonly<{ found: false; reason: "not_found" }>;

export function passwordFound(card: Card): PasswordLookupResult {
  return Object.freeze({ found: true as const, card });
}

/** The password is well formed; no card in this catalog carries it. */
export const PASSWORD_NOT_FOUND: PasswordLookupResult = Object.freeze({
  found: false as const,
  reason: "not_found" as const,
});

/**
 * The string does not have the shape of a password, so the index was never
 * consulted (PRD F03: "sem varredura desnecessária").
 */
export const PASSWORD_INVALID_FORMAT: PasswordLookupResult = Object.freeze({
  found: false as const,
  reason: "invalid_format" as const,
});

/**
 * The five in-memory indexes the catalog answers from. Internal to this
 * subsystem: consumers get the `CardCatalog` methods, never the maps.
 *
 * Every list is ordered by ascending `numero` — the order F01 emits the dataset
 * in — so the same question always gets the same answer in the same order,
 * whatever order the cards arrived in (spec F03, Decision 7).
 */
export type CatalogIndexes = Readonly<{
  /** Primary index: card identity, O(1). */
  byNumero: ReadonlyMap<CardNumber, Card>;
  byTipo: ReadonlyMap<CardType, readonly Card[]>;
  /** Keys are whatever classes the dataset holds: `classe` is not a closed enum. */
  byClasse: ReadonlyMap<string, readonly Card[]>;
  byGuardiao: ReadonlyMap<GuardianStar, readonly Card[]>;
  /** Cards with a non-null `password` only. */
  byPassword: ReadonlyMap<string, Card>;
}>;
