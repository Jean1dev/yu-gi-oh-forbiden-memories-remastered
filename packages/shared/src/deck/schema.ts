import { z } from "zod";

import { SerializedCollectionSchema } from "../collection/schema.ts";

/**
 * Shape returned by the `save_active_deck` RPC (spec build-deck/F07 §4).
 * Column name stays as Postgres returns it (snake_case), same rule
 * `PersistInitialDeckResponseSchema` already follows for `created_now`.
 */
export const SaveActiveDeckResponseSchema = z.strictObject({
  updated_at: z.string().min(1),
});

export type SaveActiveDeckResponse = z.infer<typeof SaveActiveDeckResponseSchema>;

/**
 * Validates what is read back from the `activeDeckCache` IndexedDB store —
 * local storage is an untrusted boundary, same rule `CollectionSnapshotSchema`
 * already follows (spec build-deck/F07 §5).
 */
export const CachedActiveDeckRecordSchema = z.strictObject({
  playerId: z.string().min(1),
  cards: SerializedCollectionSchema,
  /** ISO 8601. */
  updatedAt: z.string().min(1),
  synced: z.boolean(),
});

/**
 * Validates what is read back from the `activeDeckPendingSave` IndexedDB
 * store (spec build-deck/F07 §5, single slot per player).
 */
export const PendingActiveDeckSaveSchema = z.strictObject({
  playerId: z.string().min(1),
  cards: SerializedCollectionSchema,
  /** ISO 8601. */
  queuedAt: z.string().min(1),
});
