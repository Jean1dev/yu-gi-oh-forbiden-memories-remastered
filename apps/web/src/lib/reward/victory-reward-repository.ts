import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ApplyVictoryRewardResponseSchema,
  DomainError,
  err,
  ok,
  type CardNumber,
  type Result,
} from "@yugioh/shared";

export type AppliedVictoryReward = Readonly<{
  applied: boolean;
  cardQuantity: number;
  walletStars: number;
}>;

export type VictoryRewardRepository = Readonly<{
  apply(
    playerId: string,
    duelId: string,
    cardNumber: CardNumber,
    stars: number,
  ): Promise<Result<AppliedVictoryReward, DomainError>>;
}>;

/**
 * Same budget as `apply_card_reward` (`supabase-repository.ts`). Without it a
 * hung RPC never rejects, so the caller never reaches its offline fallback and
 * the player is left staring at a spinner instead of getting the reward queued.
 */
const RPC_TIMEOUT_MS = 8000;

export function createSupabaseVictoryRewardRepository(client: SupabaseClient): VictoryRewardRepository {
  return {
    async apply(playerId, duelId, cardNumber, stars) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
      try {
        const { data, error } = await client
          .rpc("apply_victory_reward", {
            p_player_id: playerId,
            p_duel_id: duelId,
            p_card_numero: cardNumber,
            p_stars: stars,
          })
          .abortSignal(controller.signal);
        if (error) {
          return err(new DomainError(error.message, "victory_reward_apply_unavailable", { duelId }));
        }
        const parsed = ApplyVictoryRewardResponseSchema.safeParse(Array.isArray(data) ? data[0] : data);
        if (!parsed.success) {
          return err(
            new DomainError("Victory reward response failed validation.", "victory_reward_apply_unavailable", {
              duelId,
            }),
          );
        }
        return ok({
          applied: parsed.data.applied,
          cardQuantity: parsed.data.card_quantity,
          walletStars: parsed.data.wallet_stars,
        });
      } catch (error) {
        return err(
          new DomainError("Victory reward RPC failed.", "victory_reward_apply_unavailable", {
            duelId,
            cause: error instanceof Error ? error.message : "unknown",
          }),
        );
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}
