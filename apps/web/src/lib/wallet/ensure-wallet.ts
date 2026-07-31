import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError, EnsureWalletResponseSchema, err, ok, type Result } from "@yugioh/shared";

import { log } from "../logging.ts";

export type EnsuredWallet = Readonly<{ stars: number; createdNow: boolean }>;

export type EnsureWalletRepository = Readonly<{
  /** Idempotent: creates the wallet with `initialStars` only if it does not exist yet. */
  ensure(playerId: string, initialStars: number): Promise<Result<EnsuredWallet, DomainError>>;
}>;

/**
 * Calls the `ensure_wallet` RPC (spec password/F01 §4), whose `EXECUTE` grant
 * excludes `authenticated`/`anon` entirely (migration 0009) — same
 * restriction `persist_initial_deck` has, for the same reason: the caller
 * chooses `initialStars`, so only the trusted service-role client may invoke
 * it.
 */
export function createSupabaseEnsureWalletRepository(client: SupabaseClient): EnsureWalletRepository {
  return {
    async ensure(playerId, initialStars) {
      const { data, error } = await client.rpc("ensure_wallet", {
        p_player_id: playerId,
        p_initial_stars: initialStars,
      });

      if (error) {
        return err(
          new DomainError(`Failed to ensure the wallet: ${error.message}`, "wallet_bootstrap_failed", {
            playerId,
            cause: error.message,
          }),
        );
      }

      const row: unknown = Array.isArray(data) ? data[0] : data;
      const parsed = EnsureWalletResponseSchema.safeParse(row);
      if (!parsed.success) {
        log("warn", "ensure_wallet_response_invalid", { playerId, issues: parsed.error.issues });
        return err(
          new DomainError("ensure_wallet response failed validation.", "wallet_bootstrap_failed", {
            playerId,
            issues: parsed.error.issues,
          }),
        );
      }

      return ok({ stars: parsed.data.stars, createdNow: parsed.data.created_now });
    },
  };
}
