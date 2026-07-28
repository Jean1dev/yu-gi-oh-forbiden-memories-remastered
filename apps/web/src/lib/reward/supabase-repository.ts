import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ApplyCardRewardResponseSchema,
  DomainError,
  err,
  ok,
  type CardNumber,
  type Result,
} from "@yugioh/shared";

import { log } from "../logging.ts";

const RPC_TIMEOUT_MS = 8000;

/** Outcome of a successful call to the `apply_card_reward` RPC. */
export type ApplyCardRewardResult = Readonly<{
  /** `true` when this call is the one that credited the card; `false` when `duelId` had already been processed. */
  applied: boolean;
  currentQuantity: number;
}>;

/** The reward's server-write port (spec build-deck/F03 §4). */
export type RewardRepository = Readonly<{
  apply(
    playerId: string,
    duelId: string,
    cardNumber: CardNumber,
  ): Promise<Result<ApplyCardRewardResult, DomainError>>;
}>;

/**
 * Calls the `apply_card_reward` RPC through the player's own authenticated
 * client (spec build-deck/F03, Decision 5-6): unlike `persist_initial_deck`,
 * this RPC's `EXECUTE` grant includes `authenticated`, because crediting a
 * card is a credit, never a debit (Decision 10) — no service-role hop is
 * needed. Bounded by an explicit timeout (spec §3, step 4) so a hung request
 * falls back to the offline path instead of hanging the caller indefinitely.
 * Never throws: every failure — RPC error, timeout/abort, or a response that
 * fails validation — comes back as a `Result` error.
 */
export function createSupabaseRewardRepository(client: SupabaseClient): RewardRepository {
  return {
    async apply(playerId, duelId, cardNumber) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

      try {
        const { data, error } = await client
          .rpc("apply_card_reward", {
            p_player_id: playerId,
            p_duel_id: duelId,
            p_card_numero: cardNumber,
          })
          .abortSignal(controller.signal);

        if (error) {
          return err(
            new DomainError(`Failed to apply the card reward: ${error.message}`, "reward_apply_unavailable", {
              playerId,
              duelId,
              cause: error.message,
            }),
          );
        }

        const row: unknown = Array.isArray(data) ? data[0] : data;
        const parsed = ApplyCardRewardResponseSchema.safeParse(row);
        if (!parsed.success) {
          log("warn", "apply_card_reward_response_invalid", {
            playerId,
            duelId,
            issues: parsed.error.issues,
          });
          return err(
            new DomainError("apply_card_reward response failed validation.", "reward_apply_unavailable", {
              playerId,
              duelId,
              issues: parsed.error.issues,
            }),
          );
        }

        return ok({ applied: parsed.data.applied, currentQuantity: parsed.data.current_quantity });
      } catch (thrown) {
        return err(
          new DomainError(
            `Failed to apply the card reward: ${thrown instanceof Error ? thrown.message : "unknown error"}`,
            "reward_apply_unavailable",
            { playerId, duelId },
          ),
        );
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}
