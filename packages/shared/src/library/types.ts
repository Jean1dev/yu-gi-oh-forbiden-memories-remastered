import type { Card, CardNumber } from "../card/types.ts";
import type { CollectionOrigin } from "../collection/types.ts";

/**
 * Art reference of a Library entry, three cases (spec library/F01, Decisions
 * 2-3). `"art"` is the only variant with a concrete `path` — `"placeholder"`
 * (obtained card, art file missing) and `"silhouette"` (not-obtained card)
 * both leave the asset choice to the presentation layer, so `packages/rules`
 * never has to know a concrete asset path for either.
 */
export type ArtReference =
  | Readonly<{ kind: "art"; path: string }>
  | Readonly<{ kind: "placeholder" }>
  | Readonly<{ kind: "silhouette" }>;

/** The subset of {@link ArtReference} an obtained card can carry — never `"silhouette"`. */
export type ObtainedArtReference = Exclude<ArtReference, Readonly<{ kind: "silhouette" }>>;

/**
 * One row of the Library index, discriminated by `obtained` (spec library/F01,
 * Decision 2). The `false` variant carries no `card` field at all: a
 * component that reads `entry.card.atk` without first narrowing on `obtained`
 * is a compile error, which is what makes "never reveal attributes of a
 * not-obtained card" (PRD library §6 F04/F05) a property the compiler
 * enforces instead of a rule UI code has to remember.
 */
export type LibraryEntry =
  | Readonly<{
      obtained: true;
      cardNumber: CardNumber;
      card: Card;
      art: ObtainedArtReference;
      /** Crop art (`renderizacao-cartas/F03`), when the card has been migrated. */
      cropArt?: ObtainedArtReference;
    }>
  | Readonly<{ obtained: false; cardNumber: CardNumber; art: Readonly<{ kind: "silhouette" }> }>;

/**
 * The cross-referenced catalog x collection the whole module (F02-F05)
 * consumes. `entries` and `byCardNumber` point at the very same entry
 * objects — two views, one set of instances (guidelines §17.3).
 */
export type LibraryIndex = Readonly<{
  /** Every card of the game, ascending by `cardNumber` — the PRD's default ordering. */
  entries: readonly LibraryEntry[];
  /** O(1) access by identity, the pattern F05 consumes (guidelines §17.2). */
  byCardNumber: ReadonlyMap<CardNumber, LibraryEntry>;
  /** The canonical count, from the catalog — never a local literal (Decision 8). */
  total: number;
  /** Count of entries with `obtained: true`. */
  obtained: number;
  /** `cardNumber`s owned in the collection with no matching card in the catalog — excluded from `obtained` (Decision 10). */
  obtainedOutsideCatalog: readonly CardNumber[];
}>;

/** What F02 interpolates into "X of 722 obtained". Invariant: `0 <= obtained <= total`. */
export type CollectionProgress = Readonly<{ obtained: number; total: number }>;

/**
 * Result of `loadLibrary` in `apps/web`: the index plus where the collection
 * half of it came from. `collectionOrigin: "cache"` is success, not failure
 * (Decision 4) — it is what lets the UI show the possibly-stale-data notice.
 */
export type LoadedLibrary = Readonly<{
  index: LibraryIndex;
  collectionOrigin: CollectionOrigin;
  /** ISO 8601 — when the collection half of this result left the server. */
  syncedAt: string;
}>;
