import type { SupabaseClient } from "@supabase/supabase-js";
import { deserializeCollection, serializeCollection } from "@yugioh/rules";
import {
  ActiveDeckRowSchema,
  DomainError,
  err,
  ok,
  PersistInitialDeckResponseSchema,
  type Collection,
  type Result,
} from "@yugioh/shared";

import { log } from "../logging.ts";

/** What `ensureInitialDeck` reads and writes through — the deck's server-read/write port. */
export type InitialDeckResult = Readonly<{
  deck: Collection;
  /** `true` if this call generated and persisted the deck; `false` if it already existed. */
  createdNow: boolean;
}>;

export type InitialDeckRepository = Readonly<{
  /** `undefined` when the player has no active deck yet — not an error. */
  readExisting(playerId: string): Promise<Result<Collection | undefined, DomainError>>;
  persist(playerId: string, deck: Collection): Promise<Result<InitialDeckResult, DomainError>>;
}>;

/**
 * The concrete Supabase adapter (spec build-deck/F02 §4). Both operations
 * must run through a service-role client (`createSupabaseServiceRoleClient`):
 * `readExisting` needs no such restriction on its own, but `persist` calls
 * `persist_initial_deck`, whose `GRANT EXECUTE` excludes `authenticated`/`anon`
 * entirely (Decision 11, confirmed live against the test project) — an
 * ordinary user's client gets "permission denied for function" calling it.
 */
export function createSupabaseInitialDeckRepository(client: SupabaseClient): InitialDeckRepository {
  return {
    async readExisting(playerId) {
      const { data, error } = await client
        .from("active_decks")
        .select("player_id,cards,updated_at")
        .eq("player_id", playerId)
        .maybeSingle();

      if (error) {
        return err(
          new DomainError(
            `Failed to read the active deck: ${error.message}`,
            "initial_deck_unavailable",
            { playerId, cause: error.message },
          ),
        );
      }

      if (data === null) {
        return ok(undefined);
      }

      const parsed = ActiveDeckRowSchema.safeParse(data);
      if (!parsed.success) {
        log("warn", "active_deck_row_invalid", { playerId, issues: parsed.error.issues });
        return err(
          new DomainError("Active deck row failed validation.", "initial_deck_invalid", {
            playerId,
            issues: parsed.error.issues,
          }),
        );
      }

      return deserializeCollection(parsed.data.cards);
    },

    async persist(playerId, deck) {
      const { data, error } = await client.rpc("persist_initial_deck", {
        p_player_id: playerId,
        p_cards: serializeCollection(deck),
      });

      if (error) {
        return err(
          new DomainError(
            `Failed to persist the initial deck: ${error.message}`,
            "initial_deck_unavailable",
            { playerId, cause: error.message },
          ),
        );
      }

      const row: unknown = Array.isArray(data) ? data[0] : data;
      const parsed = PersistInitialDeckResponseSchema.safeParse(row);
      if (!parsed.success) {
        log("warn", "persist_initial_deck_response_invalid", {
          playerId,
          issues: parsed.error.issues,
        });
        return err(
          new DomainError(
            "persist_initial_deck response failed validation.",
            "initial_deck_invalid",
            { playerId, issues: parsed.error.issues },
          ),
        );
      }

      const deckResult = deserializeCollection(parsed.data.cards);
      if (!deckResult.ok) {
        return deckResult;
      }

      return ok({ deck: deckResult.value, createdNow: parsed.data.created_now });
    },
  };
}
