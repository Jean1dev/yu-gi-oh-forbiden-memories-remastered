import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError, err, ok, type Result } from "@yugioh/shared";
import { z } from "zod";

const AppliedRewardRowsSchema = z.array(z.strictObject({ duel_id: z.string().min(1) }));

export type AppliedRewardsRepository = Readonly<{
  listApplied(playerId: string, duelIds: readonly string[]): Promise<Result<ReadonlySet<string>, DomainError>>;
}>;

export function createSupabaseAppliedRewardsRepository(client: SupabaseClient): AppliedRewardsRepository {
  return {
    async listApplied(playerId, duelIds) {
      const uniqueDuelIds = [...new Set(duelIds)];
      if (uniqueDuelIds.length === 0) return ok(new Set<string>());

      const { data, error } = await client
        .from("reward_ledger")
        .select("duel_id")
        .eq("player_id", playerId)
        .in("duel_id", uniqueDuelIds);
      if (error) {
        return err(new DomainError(error.message, "wallet_unavailable", { playerId }));
      }

      const parsed = AppliedRewardRowsSchema.safeParse(data ?? []);
      if (!parsed.success) {
        return err(new DomainError("Reward ledger response failed validation.", "wallet_unavailable", { playerId }));
      }
      return ok(new Set(parsed.data.map((row) => row.duel_id)));
    },
  };
}
