import type { SupabaseClient } from "@supabase/supabase-js";
import { deserializeCollection } from "@yugioh/rules";
import {
  ActiveDeckRowSchema,
  DomainError,
  SaveActiveDeckResponseSchema,
  err,
  ok,
  type Collection,
  type Result,
  type SerializedCollection,
} from "@yugioh/shared";

import { log } from "../logging.ts";

const RPC_TIMEOUT_MS = 8000;

export type ActiveDeckServerRecord = Readonly<{ composition: Collection; updatedAt: string }>;
export type SavedActiveDeck = Readonly<{ updatedAt: string }>;

/** The active deck's server read/write port (spec build-deck/F07 §4). */
export type ActiveDeckRepository = Readonly<{
  /** `undefined` when the player has no active deck row yet — not an error. */
  readActiveDeck(playerId: string): Promise<Result<ActiveDeckServerRecord | undefined, DomainError>>;
  saveActiveDeck(playerId: string, cards: SerializedCollection): Promise<Result<SavedActiveDeck, DomainError>>;
}>;

/**
 * Classifies a `save_active_deck` RPC failure into the three buckets
 * `saveActiveDeck` (the orchestration layer) needs to tell apart (spec
 * build-deck/F07 §3, Decision 10): a structural/ownership/IDOR refusal from
 * the function body itself (never retryable — the migration's exceptions all
 * read "invalid deck" or "permission denied", the latter only reachable by a
 * forged `p_player_id`, which the honest client never sends, spec §4), an
 * expired/invalid session (retryable once re-authenticated), or a generic
 * network/timeout failure (retryable as-is). This is a best-effort match on
 * the error text rather than a structured error code: PostgREST/Postgres
 * don't hand this app a stable enum for "why did the RPC fail", only a
 * message.
 */
function categorizeSaveFailure(message: string): "invalid_deck" | "session_expired" | "active_deck_save_unavailable" {
  if (/invalid deck|permission denied/i.test(message)) {
    return "invalid_deck";
  }
  if (/jwt|expired|unauthorized|not authenticated/i.test(message)) {
    return "session_expired";
  }
  return "active_deck_save_unavailable";
}

/**
 * The concrete Supabase adapter (spec build-deck/F07 §4-5). `readActiveDeck`
 * runs through the player's own authenticated client — `active_decks`'
 * `select`-own RLS policy (build-deck/F02) already allows it, no service-role
 * hop needed. `saveActiveDeck` calls `save_active_deck`, whose `EXECUTE`
 * grant includes `authenticated` directly (spec Decision 4, unlike
 * `persist_initial_deck`), bounded by an explicit timeout so a hung request
 * falls back to the offline path instead of hanging the caller indefinitely.
 */
export function createSupabaseActiveDeckRepository(client: SupabaseClient): ActiveDeckRepository {
  return {
    async readActiveDeck(playerId) {
      const { data, error } = await client
        .from("active_decks")
        .select("player_id,cards,updated_at")
        .eq("player_id", playerId)
        .maybeSingle();

      if (error) {
        return err(
          new DomainError(`Failed to read the active deck: ${error.message}`, "active_deck_unavailable", {
            playerId,
            cause: error.message,
          }),
        );
      }

      if (data === null) {
        return ok(undefined);
      }

      const parsed = ActiveDeckRowSchema.safeParse(data);
      if (!parsed.success) {
        log("warn", "active_deck_row_invalid", { playerId, issues: parsed.error.issues });
        return err(
          new DomainError("Active deck row failed validation.", "active_deck_invalid", {
            playerId,
            issues: parsed.error.issues,
          }),
        );
      }

      const composition = deserializeCollection(parsed.data.cards);
      if (!composition.ok) {
        return composition;
      }

      return ok({ composition: composition.value, updatedAt: parsed.data.updated_at });
    },

    async saveActiveDeck(playerId, cards) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

      try {
        const { data, error } = await client
          .rpc("save_active_deck", { p_player_id: playerId, p_cards: cards })
          .abortSignal(controller.signal);

        if (error) {
          const code = categorizeSaveFailure(error.message);
          return err(
            new DomainError(`Failed to save the active deck: ${error.message}`, code, {
              playerId,
              cause: error.message,
            }),
          );
        }

        const row: unknown = Array.isArray(data) ? data[0] : data;
        const parsed = SaveActiveDeckResponseSchema.safeParse(row);
        if (!parsed.success) {
          log("warn", "save_active_deck_response_invalid", { playerId, issues: parsed.error.issues });
          return err(
            new DomainError("save_active_deck response failed validation.", "active_deck_save_unavailable", {
              playerId,
              issues: parsed.error.issues,
            }),
          );
        }

        return ok({ updatedAt: parsed.data.updated_at });
      } catch (thrown) {
        return err(
          new DomainError(
            `Failed to save the active deck: ${thrown instanceof Error ? thrown.message : "unknown error"}`,
            "active_deck_save_unavailable",
            { playerId },
          ),
        );
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}
