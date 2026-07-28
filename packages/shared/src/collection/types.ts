import type { Card, CardNumber } from "../card/types.ts";

/**
 * Where a loaded collection came from. A closed union instead of a boolean
 * flag so a consumer cannot ignore provenance without reading the field
 * (spec build-deck/F01, Decision 3) — the UI decides when to show the
 * "loaded from cache" warning from this discriminant.
 */
export type CollectionOrigin = "server" | "cache";

/**
 * In-memory shape of the player's collection: `cardNumber -> quantity owned`.
 * A `ReadonlyMap` for O(1) lookup (guidelines §17.2), the dominant access
 * pattern once F05/F06 check whether a card can enter the deck.
 */
export type Collection = ReadonlyMap<CardNumber, number>;

/**
 * Transport/cache shape of the collection: a plain object, losslessly
 * serializable to JSON. What travels through IndexedDB and what a Postgres
 * read is assembled into.
 */
export type SerializedCollection = Readonly<Record<CardNumber, number>>;

/** An owned pair, already filtered to `quantity >= 1`. */
export type CollectionEntry = Readonly<{
  cardNumber: CardNumber;
  quantity: number;
}>;

/** An owned entry enriched with its catalog card — what the deck editor and the Library consume. */
export type CollectionItem = Readonly<{
  /** The 12 canonical fields, as they come from the catalog. No new field is added. */
  card: Card;
  quantity: number;
  /** `min(quantity, 3)` — the cap on copies of this card in the deck. */
  copyLimit: number;
}>;

/** The collection cross-referenced with the catalog: known cards, and numbers the catalog does not recognize. */
export type EnrichedCollection = Readonly<{
  /** Ordered by ascending `cardNumber`. */
  items: readonly CollectionItem[];
  /** `cardNumber`s owned with no matching card in the catalog — hidden from the editor, reported here. */
  unknown: readonly CardNumber[];
}>;

/**
 * A collection load result, tagged with provenance (Decision 3). `syncedAt`
 * is ISO 8601 and marks when the data left the server — on the `"cache"`
 * branch, it is the timestamp recorded at the last successful read, not the
 * moment of the local read itself.
 */
export type LoadedCollection =
  | Readonly<{ origin: "server"; collection: Collection; syncedAt: string }>
  | Readonly<{ origin: "cache"; collection: Collection; syncedAt: string }>;

/** The record kept in IndexedDB: one snapshot per player (spec build-deck/F01, Decision 6). */
export type CollectionSnapshot = Readonly<{
  playerId: string;
  entries: SerializedCollection;
  syncedAt: string;
}>;
