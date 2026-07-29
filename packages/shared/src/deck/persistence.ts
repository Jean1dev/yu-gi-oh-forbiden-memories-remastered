import type { DeckDraft } from "./draft.ts";
import type { SerializedCollection } from "../collection/types.ts";

/**
 * Outcome of `saveActiveDeck` (spec build-deck/F07 §3), discriminated by
 * `status`: `refused` means neither F06's revalidation nor the RPC wrote
 * anything; `saved_offline`/`session_expired` both mean the cache+pending
 * write happened atomically, differing only in what the UI tells the player
 * (spec Decision 10).
 */
export type SaveActiveDeckResult =
  | Readonly<{ status: "saved"; updatedAt: string }>
  | Readonly<{ status: "saved_offline" }>
  | Readonly<{ status: "refused"; reason: "invalid_deck" }>
  | Readonly<{ status: "session_expired" }>;

/**
 * Outcome of `loadActiveDeck` (spec build-deck/F07 §3). `conflictDetected` is
 * only ever `true` on `origin: "server"`, and only when there was no pending
 * local save at load time (spec Decision 8) — comparing `updatedAt` while a
 * save is still in flight would flag the expected lag as a false conflict.
 */
export type LoadedActiveDeck = Readonly<{
  composition: DeckDraft;
  /** ISO 8601 — from the server on `origin: "server"`, from the cache record otherwise. */
  updatedAt: string;
  origin: "server" | "cache";
  conflictDetected: boolean;
}>;

/**
 * The record kept in the IndexedDB `activeDeckCache` store, one per player
 * (spec build-deck/F07 §5). `synced: false` marks a cache write that came
 * from the offline path (§3, steps 5/7) — not yet confirmed by the server.
 */
export type CachedActiveDeckRecord = Readonly<{
  playerId: string;
  cards: SerializedCollection;
  updatedAt: string;
  synced: boolean;
}>;

/**
 * The record kept in the IndexedDB `activeDeckPendingSave` store — a single
 * slot per player (spec build-deck/F07 Decision 7): queuing a new save while
 * offline replaces this record instead of appending to a list, since there is
 * only ever one active deck to save.
 */
export type PendingActiveDeckSave = Readonly<{
  playerId: string;
  cards: SerializedCollection;
  /** ISO 8601 — when this save was queued, not when the underlying edit happened. */
  queuedAt: string;
}>;

/**
 * Outcome of one `syncPendingActiveDeckSave` run (spec build-deck/F07 §3,
 * steps 6-10). `network_failure` and `session_expired` both keep the
 * pending save queued (spec Decision 10, PRD §6 F07 Error Handling) — split
 * into two statuses only so the UI can show the right message, not because
 * the orchestration treats them differently.
 */
export type SyncActiveDeckSummary =
  | Readonly<{ status: "no_pending" }>
  | Readonly<{ status: "synced"; updatedAt: string }>
  | Readonly<{ status: "refused" }>
  | Readonly<{ status: "network_failure" }>
  | Readonly<{ status: "session_expired" }>;
