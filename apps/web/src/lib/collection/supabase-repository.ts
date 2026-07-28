import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CollectionRowSchema,
  DomainError,
  err,
  ok,
  type Result,
  type SerializedCollection,
} from "@yugioh/shared";

import { log } from "../logging.ts";

/** The collection's server-read port (spec build-deck/F01 §4, `lerColecaoDoServidor`). */
export type CollectionRepository = (
  playerId: string,
) => Promise<Result<SerializedCollection, DomainError>>;

/**
 * Reads every row of `collections` for one player from Postgres via
 * PostgREST. RLS already restricts the result to the caller's own rows; the
 * explicit `eq` filter is defense in depth (spec build-deck/F01 §3, step 2).
 * A row that fails `CollectionRowSchema` (negative quantity, malformed
 * `numero`) is discarded and logged — it never aborts the rest of the read
 * (spec §6, "Linha com quantity negativa ou numero malformado").
 */
export function createSupabaseCollectionRepository(client: SupabaseClient): CollectionRepository {
  return async (playerId) => {
    const { data, error } = await client
      .from("collections")
      .select("player_id,numero,quantity,updated_at")
      .eq("player_id", playerId);

    if (error) {
      return err(
        new DomainError(
          `Failed to read the collection from the server: ${error.message}`,
          "collection_unavailable",
          { playerId, cause: error.message },
        ),
      );
    }

    const entries: Record<string, number> = {};
    for (const row of data ?? []) {
      const parsed = CollectionRowSchema.safeParse(row);
      if (!parsed.success) {
        log("warn", "collection_row_invalid", { playerId, row, issues: parsed.error.issues });
        continue;
      }
      entries[parsed.data.numero] = parsed.data.quantity;
    }

    return ok(Object.freeze(entries));
  };
}
