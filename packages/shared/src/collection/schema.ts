import { z } from "zod";

import { CardNumberSchema } from "../card/schema.ts";

/** Validates the transport/cache shape: every key a well-formed card number, every value an integer `>= 0`. */
export const SerializedCollectionSchema = z.record(CardNumberSchema, z.number().int().min(0));

/**
 * Shape of one row read from Postgres `collections`. Exists to give an
 * explicit error at the boundary (guidelines §18.3) and never leaks past the
 * repository adapter in `apps/web`.
 *
 * `numero` keeps the column name from the database schema (`docs/arquitetura.md`
 * §5.1) instead of translating it — it is data identity, not an identifier this
 * feature is free to rename, the same rule `Card.numero` already follows.
 */
export const CollectionRowSchema = z.strictObject({
  player_id: z.string().min(1),
  numero: CardNumberSchema,
  quantity: z.number().int().min(0),
  /** ISO 8601. */
  updated_at: z.string().min(1),
});

export type CollectionRow = z.infer<typeof CollectionRowSchema>;

/**
 * Shape of the record read back from IndexedDB. Local storage is an
 * untrusted boundary too (spec build-deck/F01 §4): a corrupted or
 * old-format snapshot is treated as cache absence, never crashes the loader.
 */
export const CollectionSnapshotSchema = z.strictObject({
  playerId: z.string().min(1),
  entries: SerializedCollectionSchema,
  /** ISO 8601. */
  syncedAt: z.string().min(1),
});
