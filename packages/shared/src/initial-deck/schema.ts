import { z } from "zod";

import { CardNumberSchema } from "../card/schema.ts";
import { SerializedCollectionSchema } from "../collection/schema.ts";
import type { InitialPoolConfig } from "./types.ts";

/** Validates `InitialPoolConfig` at the boundary (no concrete instance ships yet — Decision 7). */
export const InitialPoolConfigSchema = z.strictObject({
  version: z.string().min(1),
  numbers: z.array(CardNumberSchema).optional(),
});

/**
 * Locks the schema and the declared type together: if one changes without the
 * other, the typecheck breaks here instead of silently drifting.
 */
const _schemaMatchesDeclaredType: InitialPoolConfig = {} as z.infer<typeof InitialPoolConfigSchema>;
void _schemaMatchesDeclaredType;

/** Shape of one row read from Postgres `active_decks` (`docs/arquitetura.md` §5.1). */
export const ActiveDeckRowSchema = z.strictObject({
  player_id: z.string().min(1),
  cards: SerializedCollectionSchema,
  /** ISO 8601. */
  updated_at: z.string().min(1),
});

export type ActiveDeckRow = z.infer<typeof ActiveDeckRowSchema>;

/** Shape returned by the `persist_initial_deck` RPC (spec build-deck/F02 §4). */
export const PersistInitialDeckResponseSchema = z.strictObject({
  created_now: z.boolean(),
  cards: SerializedCollectionSchema,
});

export type PersistInitialDeckResponse = z.infer<typeof PersistInitialDeckResponseSchema>;
